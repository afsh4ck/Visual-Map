'use client';

import React, { useState, useMemo } from 'react';
import type { Host } from '@/types/nmap';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useTranslations } from 'next-intl';
import { ArrowUpDown } from 'lucide-react';

interface ServiceData {
    name: string;
    product: string;
    version: string;
    hostAddress: string;
    port: string;
}

type SortableKeys = 'hostIp' | 'port' | 'service' | 'product' | 'version';
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

export default function ServicesDetailView({ hosts, pdfMode = false }: { hosts: Host[], pdfMode?: boolean }) {
  const t = useTranslations('DetailsPage');
  const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: SortDirection } | null>(null);
  
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
            port: p.portid
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
        let aValue, bValue;

        switch(sortConfig.key) {
          case 'hostIp':
            aValue = ipToNumber(a.hostAddress);
            bValue = ipToNumber(b.hostAddress);
            break;
          case 'port':
            aValue = parseInt(a.port);
            bValue = parseInt(b.port);
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
  }, [allServices, sortConfig]);

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
                    <Pie data={serviceDistribution.slice(0, 10)} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                        {serviceDistribution.slice(0, 10).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedServices.map((service, index) => (
                <TableRow key={`${service.hostAddress}-${service.port}-${index}`}>
                  <TableCell className="font-mono">{service.hostAddress}</TableCell>
                  <TableCell>{service.port}</TableCell>
                  <TableCell>{service.name}</TableCell>
                  <TableCell>{service.product}</TableCell>
                  <TableCell>{service.version}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
