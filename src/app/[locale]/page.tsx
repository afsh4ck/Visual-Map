
'use client';

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useScanStore } from '@/store/use-scan-store';
import { parseNmapXml } from '@/lib/nmap-parser';
import { calculateRiskScores } from '@/lib/risk-scorer';
import { SidebarProvider, Sidebar, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import AppHeader from '@/components/layout/header';
import AppSidebar from '@/components/layout/sidebar';
import AppFooter from '@/components/layout/footer';
import UploadZone from '@/components/upload-zone';
import SummaryCards from '@/components/dashboard/summary-cards';
import RiskRanking from '@/components/dashboard/risk-ranking';
import HostsTable from '@/components/dashboard/hosts-table';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import HostDetailDrawer from '@/components/dashboard/host-detail-drawer';
import PortsDetailView from '@/components/details/ports-detail-view';
import ServicesDetailView from '@/components/details/services-detail-view';
import VulnerabilitiesDetailView from '@/components/details/vulnerabilities-detail-view';

export default function Home() {
  const { scanResult, setScanResult, clearScanResult } = useScanStore();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const t = useTranslations('Loader');

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;
      setIsLoading(true);
      const file = acceptedFiles[0];
      const reader = new FileReader();

      reader.onabort = () => {
        setIsLoading(false);
        toast({
          variant: 'destructive',
          title: 'File reading aborted',
        });
      };
      reader.onerror = () => {
        setIsLoading(false);
        toast({
          variant: 'destructive',
          title: 'File reading failed',
        });
      };
      reader.onload = async () => {
        try {
          const xmlData = reader.result as string;
          let hosts = await parseNmapXml(xmlData);
          hosts = calculateRiskScores(hosts);
          hosts.sort((a, b) => (b.riskScore ?? 0) - (a.riskScore ?? 0));
          setScanResult(file.name, hosts);
        } catch (error) {
          console.error('Parsing error:', error);
          toast({
            variant: 'destructive',
            title: 'Failed to parse XML',
            description: error instanceof Error ? error.message : 'An unknown error occurred.',
          });
          clearScanResult();
        } finally {
          setIsLoading(false);
        }
      };

      reader.readAsText(file);
    },
    [setScanResult, clearScanResult, toast]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/xml': ['.xml'] },
    maxFiles: 1,
  });

  const handleUploadNew = () => {
    clearScanResult();
  };

  return (
    <SidebarProvider>
      {scanResult && (
        <Sidebar side="left" collapsible="offcanvas">
         <AppSidebar />
        </Sidebar>
      )}
      <SidebarInset>
        <div className="flex flex-col min-h-screen">
          <AppHeader onUploadNew={handleUploadNew} showUploadNew={!!scanResult}>
            {scanResult && <SidebarTrigger />}
          </AppHeader>
          <main className="flex-1 w-full p-4 md:p-6 lg:p-8">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <Loader2 className="w-16 h-16 animate-spin text-primary" />
                <p className="text-lg text-muted-foreground">{t('analyzing')}</p>
              </div>
            ) : !scanResult ? (
              <UploadZone
                getRootProps={getRootProps}
                getInputProps={getInputProps}
                isDragActive={isDragActive}
              />
            ) : (
              <>
                <div className="space-y-8">
                  <SummaryCards />
                  <div className="grid gap-8 md:grid-cols-3">
                    <div className="md:col-span-1">
                      <RiskRanking />
                    </div>
                    <div className="md:col-span-2">
                      <HostsTable />
                    </div>
                  </div>
                </div>
                <div className="absolute -left-[9999px] top-[-9999px] opacity-0">
                  {scanResult && (
                    <>
                      <div className="p-4 bg-background w-[800px]">
                        <PortsDetailView hosts={scanResult.hosts} pdfMode={true}/>
                      </div>
                      <div className="p-4 bg-background w-[800px]">
                        <ServicesDetailView hosts={scanResult.hosts} pdfMode={true}/>
                      </div>
                      <div className="p-4 bg-background w-[800px]">
                         <VulnerabilitiesDetailView hosts={scanResult.hosts} pdfMode={true}/>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </main>
          <AppFooter />
        </div>
      </SidebarInset>
      <HostDetailDrawer />
    </SidebarProvider>
  );
}
