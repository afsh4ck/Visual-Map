
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useScanStore } from '@/store/use-scan-store';
import AppHeader from '@/components/layout/header';
import AppFooter from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Server, ArrowUpDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { Host, Port, Script } from '@/types/nmap';
import { VulnerabilityExplanation } from '@/components/dashboard/vulnerability-explanation';

const getHostname = (host: Host | null): string => {
  if (!host || !host.hostnames || (Array.isArray(host.hostnames) && host.hostnames.length === 0)) {
    return 'N/A';
  }
  
  const hostnamesArray = Array.isArray(host.hostnames) ? host.hostnames : [host.hostnames];
  
  for (const hostnamesEntry of hostnamesArray) {
    if (hostnamesEntry && hostnamesEntry.hostname) {
      const hostnameArray = Array.isArray(hostnamesEntry.hostname) ? hostnamesEntry.hostname : [hostnamesEntry.hostname];
      const primaryHostname = hostnameArray.find(h => h.name);
      if (primaryHostname) {
        return primaryHostname.name;
      }
    }
  }

  return 'N/A';
};

const getPorts = (host: Host | null): Port[] => {
    if (!host || !host.ports || !host.ports.port) return [];
    const ports = Array.isArray(host.ports.port) ? host.ports.port : [host.ports.port];
    return ports.filter(p => p.state.state === 'open');
}

const getScripts = (item: Port | Host): Script[] => {
    const scriptsSource = 'hostscript' in item ? item.hostscript : item.script;
    if (!scriptsSource) return [];
    if (Array.isArray(scriptsSource)) {
        return 'script' in scriptsSource[0] ? scriptsSource[0].script : scriptsSource;
    }
    if(typeof scriptsSource === 'object' && 'id' in scriptsSource) return [scriptsSource];
    if(typeof scriptsSource === 'object' && 'script' in scriptsSource) {
      if(Array.isArray(scriptsSource.script)) return scriptsSource.script;
      return [scriptsSource.script];
    }
    return [];
};

type SortableKeys = 'port' | 'service' | 'version';
type SortDirection = 'ascending' | 'descending';

export default function HostDetailPage({ params }: { params: { ip: string } }) {
  const { ip } = params;
  const router = useRouter();
  const { scanResult, clearScanResult, setSelectedHost } = useScanStore();
  const t = useTranslations('HostDetail');
  const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: SortDirection } | null>(null);

  useEffect(() => {
    if (!scanResult) {
      router.push('/');
    }
    setSelectedHost(null);
  }, [scanResult, router, setSelectedHost]);
  
  const host = useMemo(() => scanResult?.hosts.find(h => h.address.addr === ip), [scanResult, ip]);

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
            <p className="text-center">Host not found.</p>
        </main>
        <AppFooter />
      </div>
    );
  }

  const hostScripts = getScripts(host);
  const riskScore = host.riskScore ?? 0;
  const hostname = getHostname(host);
  const hasHostname = hostname !== 'N/A';

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
                            <span className="text-2xl text-muted-foreground font-mono">({host.address.addr})</span>
                        </h1>
                    ) : (
                        <h1 className="text-3xl font-bold font-mono">{host.address.addr}</h1>
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
                                {sortedPorts.map((port) => (
                                <TableRow key={port.portid}>
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
                        <CardTitle>{t('hostScripts')} ({hostScripts.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                    {hostScripts.length > 0 ? (
                        <div className="space-y-4">
                            {hostScripts.map((script) => (
                                <div key={script.id}>
                                    <h4 className="font-semibold">{script.id}</h4>
                                    <pre className="mt-2 rounded-md bg-muted p-4 text-xs font-code overflow-x-auto">
                                        <code>{script.output}</code>
                                    </pre>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground text-center">{t('noHostScripts')}</p>
                    )}
                    </CardContent>
                </Card>
            </div>
            <div className="lg:col-span-1 space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Risk Analysis</CardTitle>
                        <CardDescription>Risk Score: {riskScore.toFixed(0)} / 100</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <VulnerabilityExplanation host={host} isOpen={true}/>
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

    
