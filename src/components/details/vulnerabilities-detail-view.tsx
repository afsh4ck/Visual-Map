'use client';

import React from 'react';
import type { Host } from '@/types/nmap';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { VulnerabilityExplanation } from '../dashboard/vulnerability-explanation';
import { useTranslations } from 'next-intl';

const getRiskColor = (score: number) => {
  if (score >= 90) return 'bg-red-500';
  if (score >= 75) return 'bg-orange-500';
  if (score >= 40) return 'bg-yellow-500';
  return 'bg-green-500';
};

export default function VulnerabilitiesDetailView({ hosts, pdfMode = false }: { hosts: Host[], pdfMode?: boolean }) {
    const t = useTranslations('DetailsPage');

    const vulnerableHosts = React.useMemo(() => 
        hosts.filter(h => (h.riskScore ?? 0) >= 40).sort((a,b) => (b.riskScore ?? 0) - (a.riskScore ?? 0))
    , [hosts]);

    const riskDistribution = React.useMemo(() => {
        const highRisk = hosts.filter(h => (h.riskScore ?? 0) >= 75).length;
        const mediumRisk = hosts.filter(h => (h.riskScore ?? 0) >= 40 && (h.riskScore ?? 0) < 75).length;
        const lowRisk = hosts.filter(h => (h.riskScore ?? 0) < 40).length;
        return [
            { name: t('lowRisk'), count: lowRisk, fill: '#FBBF24' }, // yellow-400
            { name: t('mediumRisk'), count: mediumRisk, fill: '#F97316' }, // orange-500
            { name: t('highRisk'), count: highRisk, fill: '#EF4444' }, // red-500
        ]
    }, [hosts, t]);

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
            <Accordion type="single" collapsible className="w-full">
            {vulnerableHosts.map((host: Host, index) => (
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
                    <VulnerabilityExplanation host={host} isOpen={true}/>
                </AccordionContent>
                </AccordionItem>
            ))}
            </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
