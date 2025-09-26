'use client';

import { useScanStore } from '@/store/use-scan-store';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import React, { useState } from 'react';
import type { Host } from '@/types/nmap';
import { VulnerabilityExplanation } from './vulnerability-explanation';
import { useTranslations } from 'next-intl';

const getRiskColor = (score: number) => {
  if (score >= 90) return 'bg-red-500';
  if (score >= 75) return 'bg-orange-500';
  if (score >= 40) return 'bg-yellow-500';
  return 'bg-green-500';
};

export default function RiskRanking() {
  const { scanResult } = useScanStore();
  const t = useTranslations('RiskRanking');
  const [openAccordion, setOpenAccordion] = useState<string | undefined>();

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

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full" onValueChange={setOpenAccordion}>
          {topVulnerableHosts.map((host: Host, index) => (
            <AccordionItem value={`item-${index}`} key={host.address.addr}>
              <AccordionTrigger>
                <div className="flex items-center justify-between w-full pr-4">
                  <span className="truncate font-mono text-sm">{host.address.addr}</span>
                  <Badge variant="destructive" className={getRiskColor(host.riskScore ?? 0)}>
                    {host.riskScore?.toFixed(0)}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <VulnerabilityExplanation host={host} isOpen={openAccordion === `item-${index}`} />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
