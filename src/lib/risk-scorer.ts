import type { Host, Port, Script } from '@/types/nmap';

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
  if (Array.isArray(scriptsSource)) {
    return 'script' in scriptsSource[0] ? scriptsSource[0].script : scriptsSource;
  }
  if (typeof scriptsSource === 'object' && 'id' in scriptsSource) return [scriptsSource];
  if(typeof scriptsSource === 'object' && 'script' in scriptsSource) {
    if(Array.isArray(scriptsSource.script)) return scriptsSource.script;
    return [scriptsSource.script];
  }
  return [];
}


export function calculateRiskScore(host: Host): { score: number; factors: string[] } {
  let score = 0;
  const factors: string[] = [];

  if (!host.ports || !host.ports.port) {
    return { score: 0, factors: ['No open ports detected'] };
  }

  const ports = Array.isArray(host.ports.port) ? host.ports.port : [host.ports.port];

  const openPorts = ports.filter((p) => p.state.state === 'open');

  if (openPorts.length > 10) {
    score += 10;
    factors.push(`Large number of open ports (${openPorts.length})`);
  }

  openPorts.forEach((port) => {
    const portId = parseInt(port.portid, 10);
    
    // Score for critical ports
    if (CRITICAL_PORTS[portId]) {
      score += CRITICAL_PORTS[portId];
      factors.push(`Critical port ${portId} (${port.service?.name || 'unknown'}) is open`);
    }

    // Score for service version info
    if (port.service?.product) {
      score += 5;
      factors.push(`Detailed service version exposed on port ${portId} (${port.service.product})`);
    }

    // Score for NSE scripts
    const portScripts = getScripts(port);
    if(portScripts.length > 0) {
        portScripts.forEach(script => {
            const isVulnScript = NSE_VULN_SCRIPTS.some(vuln => 
                script.id.includes(vuln.replace('*', ''))
            );
            if (isVulnScript) {
                score += 25;
                factors.push(`Potential vulnerability found by NSE script '${script.id}' on port ${portId}`);
            }
        });
    }
  });

  // Check host-level scripts
  const hostScripts = getScripts(host);
  if(hostScripts.length > 0) {
      hostScripts.forEach(script => {
          const isVulnScript = NSE_VULN_SCRIPTS.some(vuln => 
              script.id.includes(vuln.replace('*', ''))
          );
          if (isVulnScript) {
              score += 25;
              factors.push(`Potential vulnerability found by host-level NSE script '${script.id}'`);
          }
      });
  }

  // Normalize score to be out of 100
  const normalizedScore = Math.min(100, score);
  
  return { score: normalizedScore, factors: [...new Set(factors)] }; // Return unique factors
}

export function calculateRiskScores(hosts: Host[]): Host[] {
  return hosts.map((host) => {
    const { score, factors } = calculateRiskScore(host);
    return {
      ...host,
      riskScore: score,
      riskFactors: factors,
    };
  });
}
