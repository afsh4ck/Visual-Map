
'use client';

import React, { useState, useMemo } from 'react';
import type { Host, Port } from '@/types/nmap';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowUpDown } from 'lucide-react';
import { useScanStore } from '@/store/use-scan-store';
import { calculatePortRiskScore } from '@/lib/risk-scorer';
import { cn } from '@/lib/utils';
import { useRouter } from '@/navigation';

interface PortData extends Port {
    hostAddress: string;
}

const getRiskColorClass = (score: number): string => {
    if (score >= 90) return 'bg-red-600 hover:bg-red-700 text-white';
    if (score >= 75) return 'bg-orange-500 hover:bg-orange-600 text-white';
    if (score >= 40) return 'bg-yellow-500 hover:bg-yellow-600 text-black';
    if (score > 0) return 'bg-green-500 hover:bg-green-600 text-white';
    return 'bg-gray-400 hover:bg-gray-500 text-white';
};

type SortableKeys = 'hostIp' | 'port' | 'protocol' | 'service' | 'product' | 'version' | 'riskScore';
type SortDirection = 'ascending' | 'descending';

const ipToNumber = (ip: string) => {
    return ip.split('.').reduce((acc, octet, index) => acc + parseInt(octet) * Math.pow(256, 3 - index), 0);
};

export default function PortsDetailView({ hosts, pdfMode = false }: { hosts: Host[], pdfMode?: boolean }) {
  const t = useTranslations('DetailsPage');
  const locale = useLocale();
  const { riskWeights } = useScanStore();
  const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: SortDirection } | null>({ key: 'riskScore', direction: 'descending' });
  const router = useRouter();

  const allPorts = React.useMemo(() => {
    const ports: PortData[] = [];
    hosts.forEach(host => {
      if (host.ports && host.ports.port) {
        const hostPorts = Array.isArray(host.ports.port) ? host.ports.port : [host.ports.port];
        hostPorts.filter(p => p.state.state === 'open').forEach(p => {
          ports.push({ ...p, hostAddress: host.address.addr });
        });
      }
    });
    return ports;
  }, [hosts]);

  const sortedPorts = useMemo(() => {
    let sortableItems = [...allPorts];
    if (sortConfig !== null) {
        sortableItems.sort((a, b) => {
            let aValue: string | number;
            let bValue: string | number;

            switch (sortConfig.key) {
                case 'hostIp':
                    aValue = ipToNumber(a.hostAddress);
                    bValue = ipToNumber(b.hostAddress);
                    break;
                case 'port':
                    aValue = parseInt(a.portid);
                    bValue = parseInt(b.portid);
                    break;
                case 'protocol':
                    aValue = a.protocol;
                    bValue = b.protocol;
                    break;
                case 'service':
                    aValue = a.service?.name || '';
                    bValue = b.service?.name || '';
                    break;
                case 'product':
                    aValue = a.service?.product || '';
                    bValue = b.service?.product || '';
                    break;
                case 'version':
                    aValue = a.service?.version || '';
                    bValue = b.service?.version || '';
                    break;
                case 'riskScore':
                    aValue = calculatePortRiskScore(a, riskWeights);
                    bValue = calculatePortRiskScore(b, riskWeights);
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
  }, [allPorts, sortConfig, riskWeights]);

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

  const portDistribution = React.useMemo(() => {
    const counts: { [key: string]: number } = {};
    allPorts.forEach(p => {
        const portId = p.portid;
        counts[portId] = (counts[portId] || 0) + 1;
    });
    return Object.entries(counts).map(([port, count]) => ({ port, count })).sort((a,b) => b.count - a.count).slice(0, 15);
  }, [allPorts]);

  const riskScoreTitle = locale === 'es' ? 'Puntaje de Riesgo' : 'Risk Score';

  const handleRowClick = (hostIp: string) => {
    router.push(`/details/host/${hostIp}`);
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>{t('topPortsTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
            <div id={pdfMode ? "pdf-top-ports-chart" : "top-ports-chart"}>
              <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={portDistribution}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="port" interval={0} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" fill="hsl(var(--primary))" name={t('hostCount')} />
                  </BarChart>
              </ResponsiveContainer>
            </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t('allPortsTitle', {count: allPorts.length})}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead onClick={() => requestSort('hostIp')} className="cursor-pointer">
                    <div className="flex items-center">{t('hostIp')} {getSortIcon('hostIp')}</div>
                </TableHead>
                <TableHead onClick={() => requestSort('port')} className="cursor-pointer">
                    <div className="flex items-center">{t('port')} {getSortIcon('port')}</div>
                </TableHead>
                <TableHead onClick={() => requestSort('protocol')} className="cursor-pointer">
                    <div className="flex items-center">{t('protocol')} {getSortIcon('protocol')}</div>
                </TableHead>
                <TableHead onClick={() => requestSort('service')} className="cursor-pointer">
                    <div className="flex items-center">{t('service')} {getSortIcon('service')}</div>
                </TableHead>
                <TableHead onClick={() => requestSort('product')} className="cursor-pointer">
                    <div className="flex items-center">{t('product')} {getSortIcon('product')}</div>
                </TableHead>
                <TableHead onClick={() => requestSort('version')} className="cursor-pointer">
                    <div className="flex items-center">{t('version')} {getSortIcon('version')}</div>
                </TableHead>
                 <TableHead onClick={() => requestSort('riskScore')} className="text-right cursor-pointer">
                  <div className="flex items-center justify-end">{riskScoreTitle} {getSortIcon('riskScore')}</div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedPorts.map((port, index) => {
                const portRisk = calculatePortRiskScore(port, riskWeights);
                return (
                  <TableRow key={`${port.hostAddress}-${port.portid}-${index}`} onClick={() => handleRowClick(port.hostAddress)} className="cursor-pointer">
                    <TableCell className="font-mono">{port.hostAddress}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{port.portid}</Badge>
                    </TableCell>
                    <TableCell>{port.protocol}</TableCell>
                    <TableCell>{port.service?.name}</TableCell>
                    <TableCell>{port.service?.product}</TableCell>
                    <TableCell>{port.service?.version}</TableCell>
                    <TableCell className="text-right">
                        <Badge variant="default" className={cn('border-transparent', getRiskColorClass(portRisk))}>
                            {portRisk.toFixed(0)}
                        </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
