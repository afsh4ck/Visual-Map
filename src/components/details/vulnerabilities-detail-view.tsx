
'use client';

import React, { useMemo, useState } from 'react';
import type { Host, Script } from '@/types/nmap';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from '@/navigation';
import { cn } from '@/lib/utils';
import { ArrowUpDown } from 'lucide-react';

const getRiskColorClass = (score: number): string => {
    if (score >= 75) return 'bg-red-600 hover:bg-red-700 text-white';
    if (score >= 40) return 'bg-orange-500 hover:bg-orange-600 text-white';
    if (score > 0) return 'bg-yellow-500 hover:bg-yellow-600 text-black';
    return 'bg-gray-400 hover:bg-gray-500 text-white';
};

const getScripts = (item: Host): Script[] => {
    const scriptsSource = item.hostscript;
    if (!scriptsSource) return [];

    const scripts: Script[] = [];
    
    const potentialScripts = Array.isArray(scriptsSource) ? scriptsSource : [scriptsSource];

    potentialScripts.forEach(potential => {
        if (potential) {
            if ('script' in potential) { 
                const nested = (potential as any).script;
                if (Array.isArray(nested)) {
                    scripts.push(...nested);
                } else if (nested) {
                    scripts.push(nested);
                }
            } else if ('id' in potential) { 
                scripts.push(potential as Script);
            }
        }
    });

    return scripts;
};

const getHostname = (host: Host | null): string => {
  if (!host) {
    return 'N/A';
  }

  // 1. Try to get from hostnames array
  if (host.hostnames && Array.isArray(host.hostnames)) {
    for (const hostnamesEntry of host.hostnames) {
      if (hostnamesEntry && hostnamesEntry.hostname) {
        const hostnameArray = Array.isArray(hostnamesEntry.hostname) ? hostnamesEntry.hostname : [hostnamesEntry.hostname];
        const primaryHostname = hostnameArray.find(h => h.type === 'user' || h.type === 'PTR');
        if (primaryHostname) {
          return primaryHostname.name;
        }
      }
    }
  } else if (host.hostnames && !Array.isArray(host.hostnames) && host.hostnames.hostname) {
      const hostnameArray = Array.isArray(host.hostnames.hostname) ? host.hostnames.hostname : [host.hostnames.hostname];
      const primaryHostname = hostnameArray.find(h => h.type === 'user' || h.type === 'PTR');
      if (primaryHostname) {
        return primaryHostname.name;
      }
  }


  // 2. If not found, try to get from smb-os-discovery script
  const hostScripts = getScripts(host);
  const smbScript = hostScripts.find(s => s.id === 'smb-os-discovery');
  if (smbScript) {
    const output = smbScript.output;
    const computerNameMatch = output.match(/Computer name: ([\w-]+)/);
    if (computerNameMatch && computerNameMatch[1]) {
      return computerNameMatch[1];
    }
  }

  return 'N/A';
};

const getOsName = (host: Host | null): string => {
    if (!host || !host.os || !host.os.osmatch) {
        return 'N/A';
    }
    const osMatches = Array.isArray(host.os.osmatch) ? host.os.osmatch : [host.os.osmatch];
    if (osMatches.length > 0) {
        const bestMatch = osMatches.reduce((prev, current) => (parseInt(prev.accuracy) > parseInt(current.accuracy)) ? prev : current);
        return bestMatch.name;
    }
    return 'N/A';
};

const getOpenPortsCount = (host: Host) => {
    if (!host.ports || !host.ports.port) return 0;
    const ports = Array.isArray(host.ports.port) ? host.ports.port : [host.ports.port];
    return ports.filter(p => p.state.state === 'open').length;
};

type SortableKeys = 'ipAddress' | 'hostname' | 'os' | 'openPorts' | 'riskScore';
type SortDirection = 'ascending' | 'descending';

const ipToNumber = (ip: string) => {
    return ip.split('.').reduce((acc, octet, index) => acc + parseInt(octet) * Math.pow(256, 3 - index), 0);
};

export default function VulnerabilitiesDetailView({ hosts, pdfMode = false }: { hosts: Host[], pdfMode?: boolean }) {
    const t = useTranslations('DetailsPage');
    const tHostsTable = useTranslations('HostsTable');
    const router = useRouter();
    const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: SortDirection } | null>({ key: 'riskScore', direction: 'descending' });
    const locale = useLocale();

    const vulnerableHosts = useMemo(() => 
        hosts.filter(h => (h.riskScore ?? 0) >= 70)
    , [hosts]);

    const sortedVulnerableHosts = useMemo(() => {
        let sortableItems = [...vulnerableHosts];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                let aValue: string | number;
                let bValue: string | number;

                switch (sortConfig.key) {
                    case 'ipAddress':
                        aValue = ipToNumber(a.address[0].addr);
                        bValue = ipToNumber(b.address[0].addr);
                        break;
                    case 'hostname':
                        aValue = getHostname(a);
                        bValue = getHostname(b);
                        break;
                    case 'os':
                        aValue = getOsName(a);
                        bValue = getOsName(b);
                        break;
                    case 'openPorts':
                        aValue = getOpenPortsCount(a);
                        bValue = getOpenPortsCount(b);
                        break;
                    case 'riskScore':
                        aValue = a.riskScore ?? 0;
                        bValue = b.riskScore ?? 0;
                        break;
                    default:
                        return 0;
                }

                if (aValue < bValue) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [vulnerableHosts, sortConfig]);

    const requestSort = (key: SortableKeys) => {
        let direction: SortDirection = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key: SortableKeys) => {
        if (!sortConfig || sortConfig.key !== key) {
            return <ArrowUpDown className="ml-2 h-4 w-4" />;
        }
        return <ArrowUpDown className="ml-2 h-4 w-4" />;
    };

    const riskDistribution = useMemo(() => {
        const highRisk = hosts.filter(h => (h.riskScore ?? 0) >= 75).length;
        const mediumRisk = hosts.filter(h => (h.riskScore ?? 0) >= 40 && (h.riskScore ?? 0) < 75).length;
        const lowRisk = hosts.filter(h => (h.riskScore ?? 0) > 0 && (h.riskScore ?? 0) < 40).length;
        const veryLowRisk = hosts.filter(h => (h.riskScore ?? 0) === 0).length;
        
        return [
            { name: locale === 'es' ? 'Riesgo Muy Bajo' : 'Very Low Risk', count: veryLowRisk, fill: '#6B7280' },
            { name: locale === 'es' ? 'Riesgo Bajo' : 'Low Risk', count: lowRisk, fill: '#FBBF24' },
            { name: locale === 'es' ? 'Riesgo Medio' : 'Medium Risk', count: mediumRisk, fill: '#F97316' },
            { name: locale === 'es' ? 'Riesgo Alto' : 'High Risk', count: highRisk, fill: '#EF4444' },
        ].filter(item => item.count > 0);
    }, [hosts, locale]);

    const handleRowClick = (host: Host) => {
      router.push(`/details/host/${host.address[0].addr}`);
    };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>{t('hostRiskDistributionTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div id={pdfMode ? "pdf-risk-distribution-chart" : "risk-distribution-chart"}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart layout="vertical" data={riskDistribution} margin={{left: 20}}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={80} />
                <Tooltip cursor={{fill: 'hsl(var(--muted))'}} />
                <Bar dataKey="count" name={t('numberOfHosts')} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t('vulnerableHostsTitle', {count: vulnerableHosts.length})}</CardTitle>
        </CardHeader>
        <CardContent>
             <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead onClick={() => requestSort('ipAddress')} className="cursor-pointer">
                            <div className="flex items-center">{tHostsTable('ipAddress')} {getSortIcon('ipAddress')}</div>
                        </TableHead>
                        <TableHead onClick={() => requestSort('hostname')} className="cursor-pointer">
                            <div className="flex items-center">{tHostsTable('hostname')} {getSortIcon('hostname')}</div>
                        </TableHead>
                        <TableHead onClick={() => requestSort('os')} className="cursor-pointer">
                            <div className="flex items-center">{t('os')} {getSortIcon('os')}</div>
                        </TableHead>
                        <TableHead onClick={() => requestSort('openPorts')} className="text-center cursor-pointer">
                            <div className="flex items-center justify-center">{tHostsTable('openPorts')} {getSortIcon('openPorts')}</div>
                        </TableHead>
                        <TableHead onClick={() => requestSort('riskScore')} className="text-right cursor-pointer">
                            <div className="flex items-center justify-end">{tHostsTable('riskScore')} {getSortIcon('riskScore')}</div>
                        </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sortedVulnerableHosts.map((host, index) => (
                         <TableRow key={`${host.address[0].addr}-${index}`} onClick={() => handleRowClick(host)} className="cursor-pointer">
                            <TableCell className="font-mono">{host.address[0].addr}</TableCell>
                            <TableCell>{getHostname(host)}</TableCell>
                            <TableCell>{getOsName(host)}</TableCell>
                            <TableCell className="text-center">{getOpenPortsCount(host)}</TableCell>
                            <TableCell className="text-right">
                                <Badge variant="default" className={cn('border-transparent', getRiskColorClass(host.riskScore ?? 0))}>
                                    {host.riskScore?.toFixed(0)}
                                </Badge>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </CardContent>
      </Card>
    </div>
  );
}

    
