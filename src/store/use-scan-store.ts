import { create } from 'zustand';
import type { Host } from '@/types/nmap';
import type { ExplainVulnerabilityRiskOutput } from '@/ai/types';

export type ScanResult = {
  fileName: string;
  hosts: Host[];
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
  setScanResult: (fileName: string, hosts: Host[]) => void;
  clearScanResult: () => void;
  setSelectedHost: (host: Host | null) => void;
  setExplanation: (cacheKey: string, explanation: ExplainVulnerabilityRiskOutput) => void;
  clearExplanationCache: () => void;
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

export const useScanStore = create<ScanState>((set) => ({
  scanResult: null,
  selectedHost: null,
  explanationCache: new Map(),
  setScanResult: (fileName, hosts) => {
    const summary = calculateSummary(hosts);
    set({ scanResult: { fileName, hosts, summary }, explanationCache: new Map() });
  },
  clearScanResult: () => set({ scanResult: null, selectedHost: null, explanationCache: new Map() }),
  setSelectedHost: (host) => set({ selectedHost: host }),
  setExplanation: (cacheKey, explanation) => set((state) => ({
    explanationCache: new Map(state.explanationCache).set(cacheKey, explanation),
  })),
  clearExplanationCache: () => set({ explanationCache: new Map() }),
}));
