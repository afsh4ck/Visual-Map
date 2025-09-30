
import { create } from 'zustand';
import type { Host } from '@/types/nmap';
import type { ExplainVulnerabilityRiskOutput } from '@/ai/types';
import type { PentestingNextStepsOutput } from '@/actions/get-pentesting-steps';
import type { NseScriptsSummaryOutput } from '@/actions/summarize-nse-scripts';
import { calculateRiskScores } from '@/lib/risk-scorer';

export type RiskWeights = {
  criticalPorts: number;
  vulnScripts: number;
  serviceVersions: number;
  openPortsCount: number;
};

const defaultRiskWeights: RiskWeights = {
  criticalPorts: 80,
  vulnScripts: 90,
  serviceVersions: 60,
  openPortsCount: 70,
};

export type ScanResult = {
  fileName: string;
  hosts: Host[];
  originalHosts: Host[]; // Store the unmodified hosts
  summary: {
    hostCount: number;
    openPorts: number;
    uniqueServices: number;
  };
};

type ScanState = {
  scanResult: ScanResult | null;
  selectedHost: Host | null;
  explanationCache: Map<string, ExplainVulnerabilityRiskOutput>;
  pentestingStepsCache: Map<string, PentestingNextStepsOutput>;
  nseSummaryCache: Map<string, NseScriptsSummaryOutput>;
  riskWeights: RiskWeights;
  setScanResult: (fileName: string, hosts: Host[], weights?: RiskWeights, resetCache?: boolean) => void;
  clearScanResult: () => void;
  setSelectedHost: (host: Host | null) => void;
  setExplanation: (cacheKey: string, explanation: ExplainVulnerabilityRiskOutput) => void;
  clearExplanationCache: () => void;
  setPentestingSteps: (cacheKey: string, steps: PentestingNextStepsOutput) => void;
  clearPentestingStepsCache: () => void;
  setNseSummary: (cacheKey: string, summary: NseScriptsSummaryOutput) => void;
  clearNseSummaryCache: () => void;
  setRiskWeights: (weights: RiskWeights) => void;
};

const calculateSummary = (hosts: Host[]) => {
  const hostCount = hosts.length;
  let openPorts = 0;
  const services = new Set<string>();

  hosts.forEach(host => {
    if (host.ports && host.ports.port) {
      const ports = Array.isArray(host.ports.port) ? host.ports.port : [host.ports.port];
      ports.forEach(port => {
        if (port.state.state === 'open') {
          openPorts++;
          if (port.service?.name) {
            services.add(port.service.name);
          }
        }
      });
    }
  });

  return { hostCount, openPorts, uniqueServices: services.size };
};

export const useScanStore = create<ScanState>((set, get) => ({
  scanResult: null,
  selectedHost: null,
  explanationCache: new Map(),
  pentestingStepsCache: new Map(),
  nseSummaryCache: new Map(),
  riskWeights: defaultRiskWeights,
  setScanResult: (fileName, hosts, weights, resetCache = true) => {
    const finalWeights = weights || get().riskWeights;
    // When a new file is loaded (resetCache = true), we store the original hosts.
    // When weights are changed (resetCache = false), we use the stored original hosts.
    const hostsToScore = resetCache ? hosts : get().scanResult?.originalHosts || hosts;
    
    const scoredHosts = calculateRiskScores(hostsToScore, finalWeights);
    scoredHosts.sort((a, b) => (b.riskScore ?? 0) - (a.riskScore ?? 0));
    const summary = calculateSummary(scoredHosts);
    
    const newState: Partial<ScanState> = {
      scanResult: {
        fileName: get().scanResult?.fileName || fileName,
        hosts: scoredHosts,
        // Only update originalHosts when a new file is scanned
        originalHosts: resetCache ? hosts : get().scanResult!.originalHosts,
        summary
      },
    };
    if (resetCache) {
      newState.explanationCache = new Map();
      newState.pentestingStepsCache = new Map();
      newState.nseSummaryCache = new Map();
    }
    set(newState);
  },
  clearScanResult: () => set({ scanResult: null, selectedHost: null, explanationCache: new Map(), pentestingStepsCache: new Map(), nseSummaryCache: new Map(), riskWeights: defaultRiskWeights }),
  setSelectedHost: (host) => set({ selectedHost: host }),
  setExplanation: (cacheKey, explanation) => set((state) => ({
    explanationCache: new Map(state.explanationCache).set(cacheKey, explanation),
  })),
  clearExplanationCache: () => set({ explanationCache: new Map() }),
  setPentestingSteps: (cacheKey, steps) => set((state) => ({
    pentestingStepsCache: new Map(state.pentestingStepsCache).set(cacheKey, steps),
  })),
  clearPentestingStepsCache: () => set({ pentestingStepsCache: new Map() }),
  setNseSummary: (cacheKey, summary) => set((state) => ({
    nseSummaryCache: new Map(state.nseSummaryCache).set(cacheKey, summary),
  })),
  clearNseSummaryCache: () => set({ nseSummaryCache: new Map() }),
  setRiskWeights: (weights: RiskWeights) => set({ riskWeights: weights }),
}));
