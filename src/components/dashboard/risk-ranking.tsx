
'use client';

import { useScanStore } from '@/store/use-scan-store';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import React from 'react';
import type { Host, Script } from '@/types/nmap';
import { VulnerabilityExplanation } from './vulnerability-explanation';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { useRouter } from '@/navigation';

const getRiskColorClass = (score: number): string => {
  if (score >= 90) return 'bg-red-600 hover:bg-red-700 text-white';
  if (score >= 75) return 'bg-orange-500 hover:bg-orange-600 text-white';
  if (score >= 40) return 'bg-yellow-500 hover:bg-yellow-600 text-black';
  if (score > 0) return 'bg-green-500 hover:bg-green-600 text-white';
  return 'bg-gray-400 hover:bg-gray-500 text-white';
};

export default function RiskRanking() {
  const { scanResult } = useScanStore();
  const t = useTranslations('RiskRanking');
  const router = useRouter();

  const topVulnerableHosts = React.useMemo(() => {
    if (!scanResult || !scanResult.hosts) return [];
    return [...scanResult.hosts]
      .filter(h => (h.riskScore ?? 0) > 0)
      .sort((a, b) => (b.riskScore ?? 0) - (a.riskScore ?? 0))
      .slice(0, 10);
  }, [scanResult]);

  if (topVulnerableHosts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t('noVulnerableHosts')}</p>
        </CardContent>
      </Card>
    );
  }
  
  const handleTriggerClick = (e: React.MouseEvent<HTMLButtonElement>, host: Host) => {
    // Check if the click target is the trigger itself, not the link inside
    if (e.target === e.currentTarget) {
        e.preventDefault();
        router.push(`/details/host/${host.address[0].addr}`);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {topVulnerableHosts.map((host: Host) => (
            <AccordionItem value={host.address[0].addr} key={host.address[0].addr}>
              <AccordionTrigger onClick={(e) => handleTriggerClick(e, host)} className="hover:no-underline">
                <div className="flex items-center justify-between w-full pr-4">
                  <span className="truncate font-mono text-sm hover:underline">{host.address[0].addr}</span>
                  <Badge variant="default" className={cn('border-transparent', getRiskColorClass(host.riskScore ?? 0))}>
                    {host.riskScore?.toFixed(0)}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <VulnerabilityExplanation host={host} />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}

    