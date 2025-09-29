
'use client';

import { useRouter } from '@/navigation';
import AppFooter from '@/components/layout/footer';
import AppHeader from '@/components/layout/header';
import { useScanStore } from '@/store/use-scan-store';
import { useEffect } from 'react';
import HostsDetailView from '@/components/details/hosts-detail-view';
import PortsDetailView from '@/components/details/ports-detail-view';
import ServicesDetailView from '@/components/details/services-detail-view';
import VulnerabilitiesDetailView from '@/components/details/vulnerabilities-detail-view';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import HostDetailDrawer from '@/components/dashboard/host-detail-drawer';

export default function DetailsPage({ params }: { params: { slug: string[], locale: string } }) {
  const { slug, locale } = params;
  const page = slug[0] || 'hosts';
  const { scanResult, clearScanResult, setSelectedHost } = useScanStore();
  const router = useRouter();
  const t = useTranslations('DetailsPage');

  useEffect(() => {
    if (!scanResult) {
      router.push('/');
    }
  }, [scanResult, router]);
  
  useEffect(() => {
    // Close the host detail drawer when navigating between detail pages
    setSelectedHost(null);
  }, [page, setSelectedHost]);

  const handleUploadNew = () => {
    clearScanResult();
    router.push('/'); 
  };
  
  const getPageTitle = () => {
    if (page === 'vulnerabilities') {
      return locale === 'es' ? 'Vulnerabilidades' : 'Vulnerabilities';
    }
    const pageTitles: { [key: string]: string } = {
      hosts: t('hosts'),
      ports: t('openPorts'),
      services: t('services'),
    };
    return pageTitles[page] || t('pageNotFound');
  }

  const renderContent = () => {
    if (!scanResult) {
        return null;
    }
    switch(page) {
        case 'hosts':
            return <HostsDetailView hosts={scanResult.hosts} />;
        case 'ports':
            return <PortsDetailView hosts={scanResult.hosts} />;
        case 'services':
            return <ServicesDetailView hosts={scanResult.hosts} />;
        case 'vulnerabilities':
            return <VulnerabilitiesDetailView hosts={scanResult.hosts} />;
        default:
            return <p>{t('pageNotFound')}</p>;
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader onUploadNew={handleUploadNew} showUploadNew={true} />
      <main className="flex-1 w-full p-4 md:p-6 lg:p-8">
        <div className="container mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="outline" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Go back</span>
            </Button>
            <h1 className="text-3xl font-bold capitalize">{getPageTitle()}</h1>
          </div>
          {renderContent()}
        </div>
        <HostDetailDrawer />
      </main>
      <AppFooter />
    </div>
  );
}
