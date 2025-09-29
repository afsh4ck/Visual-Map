'use client';

import { useScanStore } from '@/store/use-scan-store';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Server, ShieldCheck, DoorOpen, Clock } from 'lucide-react';
import React from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/navigation';

export default function SummaryCards() {
  const { scanResult } = useScanStore();
  const t = useTranslations('SummaryCards');

  const summary = React.useMemo(() => {
    if (!scanResult) return { hostCount: 0, totalOpenPorts: 0, uniqueServices: 0, topVulnerableCount: 0 };
    
    const hosts = scanResult.hosts;
    const hostCount = hosts.length;
    
    let totalOpenPorts = 0;
    const services = new Set<string>();
    
    hosts.forEach(host => {
      if (host.ports && host.ports.port) {
        const ports = Array.isArray(host.ports.port) ? host.ports.port : [host.ports.port];
        ports.forEach(port => {
          if (port.state.state === 'open') {
            totalOpenPorts++;
            if (port.service?.name) {
              services.add(port.service.name);
            }
          }
        });
      }
    });

    const topVulnerableCount = hosts.filter(h => (h.riskScore ?? 0) >= 75).length;

    return {
      hostCount,
      totalOpenPorts,
      uniqueServices: services.size,
      topVulnerableCount
    };
  }, [scanResult]);

  if (!scanResult) return null;

  const cardClassName = "transition-all duration-200 hover:bg-muted/50 hover:shadow-md";

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Link href="/details/hosts" className="block">
        <Card className={cardClassName}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('totalHosts')}</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.hostCount}</div>
            <p className="text-xs text-muted-foreground">{t('totalHostsDescription')}</p>
          </CardContent>
        </Card>
      </Link>
      <Link href="/details/ports" className="block">
        <Card className={cardClassName}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('openPorts')}</CardTitle>
            <DoorOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalOpenPorts}</div>
            <p className="text-xs text-muted-foreground">{t('openPortsDescription')}</p>
          </CardContent>
        </Card>
      </Link>
      <Link href="/details/services" className="block">
        <Card className={cardClassName}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('uniqueServices')}</CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.uniqueServices}</div>
            <p className="text-xs text-muted-foreground">{t('uniqueServicesDescription')}</p>
          </CardContent>
        </Card>
      </Link>
      <Link href="/details/vulnerabilities" className="block">
       <Card className={cardClassName}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t('highRiskHosts')}</CardTitle>
          <div className="h-4 w-4 text-destructive">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M12.963 2.286a.75.75 0 00-1.071 1.071L12.963 2.286zM12 18a.75.75 0 01.75.75v.008a.75.75 0 01-1.5 0V18.75A.75.75 0 0112 18zM11.25 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S16.635 2.25 11.25 2.25zM12.963 2.286A8.25 8.25 0 1021 12a8.224 8.224 0 00-2.037-5.555l-1.071 1.071A6.75 6.75 0 114.5 12a6.763 6.763 0 011.66-4.422l1.07 1.07A8.22 8.22 0 003.75 12c0 4.542 3.698 8.25 8.25 8.25s8.25-3.708 8.25-8.25a8.224 8.224 0 00-2.037-5.555zM12 6a.75.75 0 01.75.75v5.25a.75.75 0 01-1.5 0V6.75A.75.75 0 0112 6z" clipRule="evenodd" />
            </svg>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-destructive">{summary.topVulnerableCount}</div>
          <p className="text-xs text-muted-foreground">{t('highRiskHostsDescription')}</p>
        </CardContent>
      </Card>
      </Link>
    </div>
  );
}
