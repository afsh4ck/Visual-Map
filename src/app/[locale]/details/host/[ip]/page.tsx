
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from '@/navigation';
import { useScanStore } from '@/store/use-scan-store';
import AppHeader from '@/components/layout/header';
import AppFooter from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Server, ArrowUpDown } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { Host, Port, Script } from '@/types/nmap';
import { VulnerabilityExplanation } from '@/components/dashboard/vulnerability-explanation';
import { PentestingNextSteps } from '@/components/details/pentesting-next-steps';
import { cn } from '@/lib/utils';

const getScripts = (item: Port | Host): Script[] => {
    const scriptsSource = 'hostscript' in item ? item.hostscript : item.script;
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

const getPorts = (host: Host | null): Port[] => {
    if (!host || !host.ports || !host.ports.port) return [];
    const ports = Array.isArray(host.ports.port) ? host.ports.port : [host.ports.port];
    return ports.filter(p => p.state.state === 'open');
}

const getRiskColorClass = (score: number): string => {
    if (score >= 90) return 'bg-red-600 hover:bg-red-700 text-white';
    if (score >= 75) return 'bg-orange-500 hover:bg-orange-600 text-white';
    if (score >= 40) return 'bg-yellow-500 hover:bg-yellow-600 text-black';
    if (score > 0) return 'bg-green-500 hover:bg-green-600 text-white';
    return 'bg-gray-400 hover:bg-gray-500 text-white';
};

type SortableKeys = 'port' | 'service' | 'version';
type SortDirection = 'ascending' | 'descending';

export default function HostDetailPage({ params }: { params: { ip: string } }) {
  const { ip } = React.use(params);
  const router = useRouter();
  const { scanResult, clearScanResult, setSelectedHost } = useScanStore();
  const t = useTranslations('HostDetail');
  const tDetails = useTranslations('DetailsPage');
  const locale = useLocale();
  const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: SortDirection } | null>(null);

  useEffect(() => {
    if (!scanResult) {
      router.push('/');
    }
    setSelectedHost(null);
  }, [scanResult, router, setSelectedHost]);
  
  const host = useMemo(() => scanResult?.hosts.find(h => h.address[0].addr === ip), [scanResult, ip]);

  const openPorts = useMemo(() => getPorts(host), [host]);

  const sortedPorts = useMemo(() => {
    let sortableItems = [...openPorts];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aValue, bValue;

        switch (sortConfig.key) {
          case 'port':
            aValue = parseInt(a.portid, 10);
            bValue = parseInt(b.portid, 10);
            break;
          case 'service':
            aValue = a.service?.name || '';
            bValue = b.service?.name || '';
            break;
          case 'version':
            aValue = `${a.service?.product || ''} ${a.service?.version || ''}`.trim();
            bValue = `${b.service?.product || ''} ${b.service?.version || ''}`.trim();
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
  }, [openPorts, sortConfig]);
  
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

  const handleUploadNew = () => {
    clearScanResult();
    router.push('/');
  };

  if (!host) {
    return (
      <div className="flex flex-col min-h-screen">
        <AppHeader onUploadNew={handleUploadNew} showUploadNew={true} />
        <main className="flex-1 w-full p-4 md:p-6 lg:p-8">
            <p className="text-center">{tDetails('pageNotFound')}</p>
        </main>
        <AppFooter />
      </div>
    );
  }

  const hostScripts = getScripts(host);
  const riskScore = host.riskScore ?? 0;
  const hostname = getHostname(host);
  const hasHostname = hostname !== 'N/A';
  const osName = getOsName(host);

  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader onUploadNew={handleUploadNew} showUploadNew={true} />
      <main className="flex-1 w-full p-4 md:p-6 lg:p-8">
        <div className="container mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="outline" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Go back</span>
            </Button>
            <div className='flex items-center gap-4'>
                <Server className="h-8 w-8" />
                <div>
                    {hasHostname ? (
                        <h1 className="text-3xl font-bold flex items-baseline gap-2">
                            {hostname} 
                            <span className="text-2xl text-muted-foreground font-mono">({host.address[0].addr})</span>
                        </h1>
                    ) : (
                        <h1 className="text-3xl font-bold font-mono">{host.address[0].addr}</h1>
                    )}
                </div>
            </div>
          </div>
          
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>{t('openPorts')} ({openPorts.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                <TableHead onClick={() => requestSort('port')} className="cursor-pointer">
                                  <div className="flex items-center">{t('port')} {getSortIcon('port')}</div>
                                </TableHead>
                                <TableHead onClick={() => requestSort('service')} className="cursor-pointer">
                                  <div className="flex items-center">{t('service')} {getSortIcon('service')}</div>
                                </TableHead>
                                <TableHead onClick={() => requestSort('version')} className="cursor-pointer">
                                  <div className="flex items-center">{t('version')} {getSortIcon('version')}</div>
                                </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sortedPorts.map((port, index) => (
                                <TableRow key={`${port.portid}-${index}`}>
                                    <TableCell>
                                    <Badge variant="secondary">{port.portid}/{port.protocol}</Badge>
                                    </TableCell>
                                    <TableCell>{port.service?.name || 'unknown'}</TableCell>
                                    <TableCell className="truncate max-w-[200px]">{port.service?.product}{port.service?.version ? ` (${port.service.version})` : ''}</TableCell>
                                </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>{t('nseScripts')} ({hostScripts.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                    {hostScripts.length > 0 ? (
                        <div className="space-y-4">
                            {hostScripts.map((script, index) => (
                                <div key={`${script.id}-${index}`}>
                                    <h4 className="font-semibold">{script.id}</h4>
                                    <pre className="mt-2 rounded-md bg-muted p-4 text-xs font-code overflow-x-auto">
                                        <code>{script.output.replace(/&#xa;/g, '\n')}</code>
                                    </pre>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground text-center">{t('noNseScripts')}</p>
                    )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>{t('nextStepsTitle')}</CardTitle>
                         <CardDescription>
                            {locale === 'es' 
                                ? "Sugerencias generadas por IA para pruebas de penetración."
                                : "AI-generated suggestions for penetration testing."
                            }
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <PentestingNextSteps host={host} />
                    </CardContent>
                </Card>
            </div>
            <div className="lg:col-span-1 space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>{t('riskAnalysisTitle')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between items-baseline">
                            <span className="text-sm text-muted-foreground">{t('riskScore')}</span>
                             <Badge variant="default" className={cn('border-transparent text-lg', getRiskColorClass(riskScore))}>
                                {riskScore.toFixed(0)} / 100
                            </Badge>
                        </div>
                        <VulnerabilityExplanation host={host} />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>{tDetails('os')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm">{osName}</p>
                    </CardContent>
                </Card>
            </div>
          </div>
        </div>
      </main>
      <AppFooter />
    </div>
  );
}

    

    
