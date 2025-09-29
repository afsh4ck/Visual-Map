
import type { Host, Port, Script } from '@/types/nmap';
import type { RiskWeights } from '@/store/use-scan-store';

const CRITICAL_PORTS: { [key: number]: number } = {
  21: 10, // FTP
  22: 20, // SSH
  23: 15, // Telnet
  25: 10, // SMTP
  53: 10, // DNS
  80: 15, // HTTP
  110: 10, // POP3
  143: 10, // IMAP
  443: 15, // HTTPS
  445: 20, // SMB
  993: 10, // IMAPS
  995: 10, // POP3S
  1433: 15, // MSSQL
  1521: 15, // Oracle
  3306: 20, // MySQL
  3389: 25, // RDP
  5432: 15, // PostgreSQL
  5900: 20, // VNC
  8080: 10, // HTTP Alt
};

const NSE_VULN_SCRIPTS = [
  'http-vuln',
  'smb-vuln',
  'ftp-vuln',
  'ssh-vuln',
  'rdp-vuln',
  '*-vuln-*', // wildcard for any vulnerability script
];

function getScripts(item: Port | Host): Script[] {
    const scriptsSource = 'hostscript' in item ? item.hostscript : item.script;
    if (!scriptsSource) return [];

    const scripts: Script[] = [];
    
    // The source can be a single script object, an array of scripts,
    // or an object containing a script or array of scripts.
    const potentialScripts = Array.isArray(scriptsSource) ? scriptsSource : [scriptsSource];

    potentialScripts.forEach(potential => {
        if (potential) {
            if ('script' in potential) { // Case for { script: Script | Script[] }
                const nested = (potential as any).script;
                if (Array.isArray(nested)) {
                    scripts.push(...nested);
                } else if (nested) {
                    scripts.push(nested);
                }
            } else if ('id' in potential) { // Case for Script object
                scripts.push(potential as Script);
            }
        }
    });

    return scripts;
}


export function calculatePortRiskScore(port: Port, weights: RiskWeights): number {
    let score = 0;
    const portId = parseInt(port.portid, 10);

    // Score for critical ports
    if (CRITICAL_PORTS[portId]) {
      score += (CRITICAL_PORTS[portId] / 25) * weights.criticalPorts;
    }

    // Score for service version info
    if (port.service?.product) {
      score += (5 / 100) * weights.serviceVersions;
    }

    // Score for NSE scripts on ports
    const portScripts = getScripts(port);
    if(portScripts.length > 0) {
        portScripts.forEach(script => {
            const isVulnScript = NSE_VULN_SCRIPTS.some(vuln => 
                script.id.includes(vuln.replace('*', ''))
            );
            if (isVulnScript) {
                score += (25 / 100) * weights.vulnScripts;
            }
        });
    }
    
    return Math.min(100, score);
}

export function calculateRiskScore(host: Host, weights: RiskWeights): { score: number; factors: string[] } {
  let score = 0;
  const factors: string[] = [];

  if (!host.ports || !host.ports.port) {
    return { score: 0, factors: ['No open ports detected'] };
  }

  const ports = Array.isArray(host.ports.port) ? host.ports.port : [host.ports.port];
  const openPorts = ports.filter((p) => p.state.state === 'open');

  // Risk from number of open ports
  if (openPorts.length > 10) {
    score += (openPorts.length / 50) * weights.openPortsCount;
    factors.push(`Large number of open ports (${openPorts.length})`);
  }

  openPorts.forEach((port) => {
    const portId = parseInt(port.portid, 10);
    const portScore = calculatePortRiskScore(port, weights);
    score += portScore;

    // Add factors based on what contributed to the port's score
    if (CRITICAL_PORTS[portId]) {
      factors.push(`Critical port ${portId} (${port.service?.name || 'unknown'}) is open`);
    }
    if (port.service?.product) {
      factors.push(`Detailed service version exposed on port ${portId} (${port.service.product})`);
    }
    const portScripts = getScripts(port);
    portScripts.forEach(script => {
        const isVulnScript = NSE_VULN_SCRIPTS.some(vuln => 
            script.id.includes(vuln.replace('*', ''))
        );
        if (isVulnScript) {
            factors.push(`Potential vulnerability found by NSE script '${script.id}' on port ${portId}`);
        }
    });
  });

  // Check host-level scripts
  const hostScripts = getScripts(host);
  if(hostScripts.length > 0) {
      hostScripts.forEach(script => {
          const isVulnScript = NSE_VULN_SCRIPTS.some(vuln => 
              script.id.includes(vuln.replace('*', ''))
          );
          if (isVulnScript) {
              score += (25 / 100) * weights.vulnScripts;
              factors.push(`Potential vulnerability found by host-level NSE script '${script.id}'`);
          }
      });
  }

  const normalizedScore = Math.min(100, Math.round(score));
  
  return { score: normalizedScore, factors: [...new Set(factors)] }; // Return unique factors
}

export function calculateRiskScores(hosts: Host[], weights: RiskWeights): Host[] {
  return hosts.map((host) => {
    const { score, factors } = calculateRiskScore(host, weights);
    return {
      ...host,
      riskScore: score,
      riskFactors: factors,
    };
  });
}
