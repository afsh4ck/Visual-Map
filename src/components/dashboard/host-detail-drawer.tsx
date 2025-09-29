
'use client';

import { useScanStore } from '@/store/use-scan-store';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Host, Port, Script } from '@/types/nmap';
import { useTranslations } from 'next-intl';
import React, { useMemo, useState } from 'react';
import { ArrowUpDown } from 'lucide-react';


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


const getPorts = (host: Host | null): Port[] => {
    if (!host || !host.ports || !host.ports.port) return [];
    const ports = Array.isArray(host.ports.port) ? host.ports.port : [host.ports.port];
    return ports.filter(p => p.state.state === 'open');
}

type SortableKeys = 'port' | 'service' | 'version';
type SortDirection = 'ascending' | 'descending';

export default function HostDetailDrawer() {
  const { selectedHost, setSelectedHost } = useScanStore();
  const t = useTranslations('HostDetail');
  const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: SortDirection } | null>(null);

  const openPorts = useMemo(() => getPorts(selectedHost), [selectedHost]);

  const sortedPorts = useMemo(() => {
    if (!selectedHost) return [];
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
  }, [selectedHost, openPorts, sortConfig]);

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

  const hostScripts = selectedHost ? getScripts(selectedHost) : [];

  return (
    <Sheet open={!!selectedHost} onOpenChange={(open) => !open && setSelectedHost(null)}>
      <SheetContent className="sm:max-w-2xl w-full">
        {selectedHost && (
          <>
            <SheetHeader>
              <SheetTitle className="font-mono">{selectedHost.address[0].addr}</SheetTitle>
              <SheetDescription>{getHostname(selectedHost)}</SheetDescription>
            </SheetHeader>
            <div className="py-4">
              <Tabs defaultValue="ports" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="ports">{t('openPorts')} ({openPorts.length})</TabsTrigger>
                  <TabsTrigger value="host-scripts">{t('nseScripts')} ({hostScripts.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="ports">
                  <ScrollArea className="h-[calc(100vh-12rem)]">
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
                  </ScrollArea>
                </TabsContent>
                <TabsContent value="host-scripts">
                   <ScrollArea className="h-[calc(100vh-12rem)] p-1">
                    {hostScripts.length > 0 ? (
                        <div className="space-y-4">
                            {hostScripts.map((script) => (
                                <div key={script.id}>
                                    <h4 className="font-semibold">{script.id}</h4>
                                    <pre className="mt-2 rounded-md bg-muted p-4 text-xs font-code overflow-x-auto">
                                        <code>{script.output.replace(/&#xa;/g, '\n')}</code>
                                    </pre>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground p-4 text-center">{t('noNseScripts')}</p>
                    )}
                   </ScrollArea>
                </TabsContent>
              </Tabs>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

    

    