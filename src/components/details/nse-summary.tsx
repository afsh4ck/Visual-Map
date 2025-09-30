
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import type { Host, Port, Script } from '@/types/nmap';
import { getNseScriptsSummary } from '@/actions/summarize-nse-scripts';
import { Loader2, AlertTriangle } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useScanStore } from '@/store/use-scan-store';

interface NseSummaryProps {
  host: Host;
}

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

const formatExplanation = (text: string = '') => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/<\/strong>\s*:/g, '</strong>:')
      .replace(/\n/g, '<br />')
      .replace(/<br \/>\s*-\s/g, '<br />&bull; ')
      .replace(/^- /g, '&bull; ');
};

export function NseSummary({ host }: NseSummaryProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations('HostDetail');
  const tCommon = useTranslations('VulnerabilityExplanation');
  const locale = useLocale();
  
  const { nseSummaryCache, setNseSummary } = useScanStore();
  
  const cacheKey = `${host.address[0].addr}-${locale}`;
  const result = nseSummaryCache.get(cacheKey);

  const rawScriptOutput = useMemo(() => {
    const hostScripts = getScripts(host);
    const portScripts: Script[] = [];
    if (host.ports && host.ports.port) {
        const ports = Array.isArray(host.ports.port) ? host.ports.port : [host.ports.port];
        ports.forEach(port => {
            portScripts.push(...getScripts(port));
        });
    }
    const allScripts = [...hostScripts, ...portScripts];
    return allScripts.map(s => `Script: ${s.id}\nOutput:\n${s.output}`).join('\n\n---\n\n');
  }, [host]);


  useEffect(() => {
    const fetchSummary = async () => {
      if (!result && rawScriptOutput) {
        setIsLoading(true);
        setError(null);
        try {
          const response = await getNseScriptsSummary(rawScriptOutput);
          setNseSummary(cacheKey, response);
        } catch (err) {
          setError(err instanceof Error ? err.message : tCommon('errorMessage'));
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchSummary();
  }, [host, rawScriptOutput, tCommon, result, setNseSummary, cacheKey, locale]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center space-y-2 p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">
          {locale === 'es' ? 'Generando resumen de scripts NSE...' : 'Generating NSE script summary...'}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>{tCommon('errorTitle')}</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!result || !result.summary) {
    return (
      <p className="text-sm text-muted-foreground text-center">
        {t('noNseScripts')}
      </p>
    );
  }

  return (
     <div className="text-sm prose prose-sm dark:prose-invert prose-p:leading-relaxed max-w-full"
          dangerouslySetInnerHTML={{ __html: formatExplanation(result.summary) }}
     />
  );
}
