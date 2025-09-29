
'use client';

import React, { useState, useMemo } from 'react';
import type { Host, Port } from '@/types/nmap';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowUpDown } from 'lucide-react';
import { calculatePortRiskScore } from '@/lib/risk-scorer';
import { useScanStore } from '@/store/use-scan-store';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';
import { useRouter } from '@/navigation';

interface ServiceData {
    name: string;
    product: string;
    version: string;
    hostAddress: string;
    port: Port;
}

type SortableKeys = 'hostIp' | 'port' | 'service' | 'product' | 'version' | 'riskScore';
type SortDirection = 'ascending' | 'descending';

const COLORS = [
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))',
    '#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#00C49F'
];

const ipToNumber = (ip: string) => {
    return ip.split('.').reduce((acc, octet, index) => acc + parseInt(octet) * Math.pow(256, 3 - index), 0);
};

const getRiskColorClass = (score: number): string => {
    if (score >= 90) return 'bg-red-600 hover:bg-red-700 text-white';
    if (score >= 75) return 'bg-orange-500 hover:bg-orange-600 text-white';
    if (score >= 40) return 'bg-yellow-500 hover:bg-yellow-600 text-black';
    if (score > 0) return 'bg-green-500 hover:bg-green-600 text-white';
    return 'bg-gray-400 hover:bg-gray-500 text-white';
};

export default function ServicesDetailView({ hosts, pdfMode = false }: { hosts: Host[], pdfMode?: boolean }) {
  const t = useTranslations('DetailsPage');
  const locale = useLocale();
  const { riskWeights } = useScanStore();
  const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: SortDirection } | null>({ key: 'riskScore', direction: 'descending' });
  const router = useRouter();
  
  const allServices = React.useMemo(() => {
    const services: ServiceData[] = [];
    hosts.forEach(host => {
      if (host.ports && host.ports.port) {
        const hostPorts = Array.isArray(host.ports.port) ? host.ports.port : [host.ports.port];
        hostPorts.filter(p => p.state.state === 'open' && p.service).forEach(p => {
          services.push({
            name: p.service!.name,
            product: p.service!.product || '',
            version: p.service!.version || '',
            hostAddress: host.address.addr,
            port: p
          });
        });
      }
    });
    return services;
  }, [hosts]);

  const sortedServices = useMemo(() => {
    let sortableItems = [...allServices];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aValue: string | number;
        let bValue: string | number;

        switch(sortConfig.key) {
          case 'hostIp':
            aValue = ipToNumber(a.hostAddress);
            bValue = ipToNumber(b.hostAddress);
            break;
          case 'port':
            aValue = parseInt(a.port.portid);
            bValue = parseInt(b.port.portid);
            break;
          case 'service':
            aValue = a.name;
            bValue = b.name;
            break;
          case 'product':
            aValue = a.product;
            bValue = b.product;
            break;
          case 'version':
            aValue = a.version;
            bValue = b.version;
            break;
          case 'riskScore':
            aValue = calculatePortRiskScore(a.port, riskWeights);
            bValue = calculatePortRiskScore(b.port, riskWeights);
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
  }, [allServices, sortConfig, riskWeights]);

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

  const serviceDistribution = React.useMemo(() => {
    const counts: { [key: string]: number } = {};
    allServices.forEach(s => {
        counts[s.name] = (counts[s.name] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
  }, [allServices]);
  
  const riskScoreTitle = t('riskScore');

  const handleRowClick = (hostIp: string) => {
    router.push(`/details/host/${hostIp}`);
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>{t('serviceDistributionTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div id={pdfMode ? "pdf-service-distribution-chart" : "service-distribution-chart"}>
            <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                    <Pie data={serviceDistribution.slice(0, 10)} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                        {serviceDistribution.slice(0, 10).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip />
                    <Legend layout="vertical" align="right" verticalAlign="middle" />
                </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t('allServicesTitle', {count: allServices.length})}</CardTitle>
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
              {sortedServices.map((service, index) => {
                const portRisk = calculatePortRiskScore(service.port, riskWeights);
                return (
                  <TableRow key={`${service.hostAddress}-${service.port.portid}-${index}`} onClick={() => handleRowClick(service.hostAddress)} className="cursor-pointer">
                    <TableCell className="font-mono">{service.hostAddress}</TableCell>
                    <TableCell>{service.port.portid}</TableCell>
                    <TableCell>{service.name}</TableCell>
                    <TableCell>{service.product}</TableCell>
                    <TableCell>{service.version}</TableCell>
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
