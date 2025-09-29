
'use client';

import { SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarHeader, SidebarSeparator } from '@/components/ui/sidebar';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '../ui/button';
import { Download, Loader2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useScanStore } from '@/store/use-scan-store';
import { useState } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import html2canvas from 'html2canvas';
import type { Host } from '@/types/nmap';
import { Slider } from '../ui/slider';

// Extend jsPDF with autoTable
interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
  lastAutoTable: { finalY: number };
}

const getHostname = (host: Host | null): string => {
  if (!host || !host.hostnames || (Array.isArray(host.hostnames) && host.hostnames.length === 0)) {
    return 'N/A';
  }
  
  const hostnamesArray = Array.isArray(host.hostnames) ? host.hostnames : [host.hostnames];
  
  for (const hostnamesEntry of hostnamesArray) {
    if (hostnamesEntry && hostnamesEntry.hostname) {
      const hostnameArray = Array.isArray(hostnamesEntry.hostname) ? hostnamesEntry.hostname : [hostnamesEntry.hostname];
      const primaryHostname = hostnameArray.find(h => h.name);
      if (primaryHostname) {
        return primaryHostname.name;
      }
    }
  }

  return 'N/A';
};


const getOpenPortsCount = (host: Host) => {
  if (!host.ports || !host.ports.port) return 0;
  const ports = Array.isArray(host.ports.port) ? host.ports.port : [host.ports.port];
  return ports.filter(p => p.state.state === 'open').length;
};

const ipToNumber = (ip: string) => {
    return ip.split('.').reduce((acc, octet, index) => acc + parseInt(octet) * Math.pow(256, 3 - index), 0);
};

export default function AppSidebar() {
  const tSidebar = useTranslations('Sidebar');
  const tDetails = useTranslations('DetailsPage');
  const tSummary = useTranslations('SummaryCards');
  const tHostsTable = useTranslations('HostsTable');
  const tRiskRanking = useTranslations('RiskRanking');
  
  const { scanResult, riskWeights, setRiskWeights, setScanResult } = useScanStore();
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingHtml, setIsExportingHtml] = useState(false);
  const locale = useLocale();

  const handleWeightChange = (factor: keyof typeof riskWeights, value: number[]) => {
    if (!scanResult) return;
    const newWeights = { ...riskWeights, [factor]: value[0] };
    setRiskWeights(newWeights);
    // Trigger recalculation
    setScanResult(scanResult.fileName, scanResult.originalHosts, newWeights, false);
  };

  const handleExportJson = () => {
    if (!scanResult) return;
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(scanResult, null, 2)
    )}`;
    const link = document.createElement("a");
    link.href = jsonString;
    link.download = `${scanResult.fileName.replace('.xml', '')}_scan.json`;
    link.click();
  };

  const handleExportHtml = async () => {
    if (!scanResult) return;
    setIsExportingHtml(true);
    try {
        const { fileName, hosts, summary } = scanResult;

        const getChartAsBase64 = async (elementId: string) => {
            const element = document.getElementById(elementId);
            if (!element) return null;
            const canvas = await html2canvas(element, { scale: 2, backgroundColor: null, useCORS: true });
            return canvas.toDataURL('image/png');
        };
        
        const riskChart = await getChartAsBase64('pdf-risk-distribution-chart');
        const portsChart = await getChartAsBase64('pdf-top-ports-chart');
        const servicesChart = await getChartAsBase64('pdf-service-distribution-chart');

        const topVulnerableHosts = [...hosts]
            .filter(h => (h.riskScore ?? 0) > 0)
            .sort((a, b) => (b.riskScore ?? 0) - (a.riskScore ?? 0))
            .slice(0, 10);
        
        const allHostsSorted = [...hosts].sort((a,b) => ipToNumber(a.address.addr) - ipToNumber(b.address.addr));
        
        const getRiskClass = (score: number) => {
            if (score >= 75) return 'badge-red';
            if (score >= 40) return 'badge-orange';
            return 'badge-yellow';
        };

        const htmlContent = `
            <!DOCTYPE html>
            <html lang="${locale}">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${tHostsTable('title')} - ${fileName}</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f8f9fa; margin: 0; padding: 0; }
                    .container { max-width: 1200px; margin: auto; background: #fff; padding: 20px; box-shadow: 0 0 15px rgba(0,0,0,0.05); border-radius: 8px; }
                    h1, h2, h3 { color: #2c3e50; }
                    h1 { text-align: center; border-bottom: 2px solid #eaecef; padding-bottom: 10px; }
                    h2 { border-bottom: 1px solid #eaecef; padding-bottom: 8px; margin-top: 40px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { padding: 12px; border: 1px solid #dee2e6; text-align: left; }
                    th { background-color: #f2f2f2; font-weight: 600; }
                    tr:nth-child(even) { background-color: #f8f9fa; }
                    tr:hover { background-color: #e9ecef; }
                    .badge-red { background-color: #dc3545; color: white; }
                    .badge-orange { background-color: #fd7e14; color: white; }
                    .badge-yellow { background-color: #ffc107; color: #000; }
                    .grid-summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; }
                    .card { padding: 20px; border: 1px solid #dee2e6; border-radius: 8px; }
                    .card-title { font-weight: bold; margin-bottom: 5px; }
                    .card-value { font-size: 2em; font-weight: bold; }
                    .chart-container { margin-top: 20px; padding: 20px; border: 1px solid #dee2e6; border-radius: 8px; text-align: center; }
                    .chart-container img { max-width: 100%; height: auto; }
                    nav { background: #f2f2f2; padding: 10px; border-radius: 5px; margin-bottom: 20px; }
                    nav ul { list-style: none; padding: 0; margin: 0; display: flex; flex-wrap: wrap; gap: 15px; }
                    nav a { text-decoration: none; color: #007bff; font-weight: 500; }
                    nav a:hover { text-decoration: underline; }
                    .table-responsive { overflow-x: auto; -webkit-overflow-scrolling: touch; }
                    @media (max-width: 768px) {
                        body { padding: 10px; }
                        .container { padding: 15px; }
                        h1 { font-size: 1.5em; }
                        h2 { font-size: 1.2em; }
                        th, td { padding: 8px; font-size: 0.9em; }
                        .grid-summary { grid-template-columns: 1fr; }
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>${tHostsTable('title')}</h1>
                    <p style="text-align: center;"><strong>File:</strong> ${fileName} | <strong>Date:</strong> ${new Date().toLocaleString(locale)}</p>

                    <nav>
                        <ul>
                            <li><a href="#summary">${tSummary('totalHosts')}</a></li>
                            <li><a href="#vulnerable-hosts">${tRiskRanking('title')}</a></li>
                            <li><a href="#visualizations">${tDetails('vulnerabilities')}</a></li>
                            <li><a href="#all-hosts">${tHostsTable('title')}</a></li>
                        </ul>
                    </nav>

                    <section id="summary">
                        <h2>${tSidebar('export')}</h2>
                        <div class="grid-summary">
                            <div class="card"><div class="card-title">${tSummary('totalHosts')}</div><div class="card-value">${summary.hostCount}</div></div>
                            <div class="card"><div class="card-title">${tSummary('openPorts')}</div><div class="card-value">${summary.openPorts}</div></div>
                            <div class="card"><div class="card-title">${tSummary('uniqueServices')}</div><div class="card-value">${summary.uniqueServices}</div></div>
                            <div class="card"><div class="card-title">${tSummary('highRiskHosts')}</div><div class="card-value">${hosts.filter(h => (h.riskScore ?? 0) >= 75).length}</div></div>
                        </div>
                    </section>

                    ${topVulnerableHosts.length > 0 ? `
                    <section id="vulnerable-hosts">
                        <h2>${tRiskRanking('title')}</h2>
                        <div class="table-responsive">
                            <table>
                                <thead><tr><th>${tHostsTable('ipAddress')}</th><th>${tHostsTable('hostname')}</th><th>${tHostsTable('riskScore')}</th></tr></thead>
                                <tbody>
                                    ${topVulnerableHosts.map(h => `
                                        <tr>
                                            <td><a href="#host-${h.address.addr.replace(/\./g, '-')}">${h.address.addr}</a></td>
                                            <td>${getHostname(h)}</td>
                                            <td class="${getRiskClass(h.riskScore ?? 0)}">${h.riskScore?.toFixed(0) ?? '0'}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </section>
                    ` : ''}
                    
                    <section id="visualizations">
                        <h2>${tDetails('vulnerabilities')}</h2>
                        <div class="chart-container"><h3>${tDetails('hostRiskDistributionTitle')}</h3>${riskChart ? `<img src="${riskChart}">` : 'Chart not available'}</div>
                        <div class="chart-container"><h3>${tDetails('topPortsTitle')}</h3>${portsChart ? `<img src="${portsChart}">` : 'Chart not available'}</div>
                        <div class="chart-container"><h3>${tDetails('serviceDistributionTitle')}</h3>${servicesChart ? `<img src="${servicesChart}">` : 'Chart not available'}</div>
                    </section>

                    <section id="all-hosts">
                        <h2>${tHostsTable('title')} (${hosts.length})</h2>
                        <div class="table-responsive">
                            <table>
                            <thead><tr><th>${tHostsTable('ipAddress')}</th><th>${tHostsTable('hostname')}</th><th>${tDetails('os')}</th><th>${tHostsTable('openPorts')}</th><th>${tHostsTable('riskScore')}</th></tr></thead>
                            <tbody>
                                ${allHostsSorted.map(h => `
                                    <tr>
                                        <td><a href="#host-${h.address.addr.replace(/\./g, '-')}">${h.address.addr}</a></td>
                                        <td>${getHostname(h)}</td>
                                        <td>N/A</td>
                                        <td>${getOpenPortsCount(h)}</td>
                                        <td>${h.riskScore?.toFixed(0) ?? '0'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                            </table>
                        </div>
                    </section>

                    <section id="host-details">
                      <h2>${tDetails('hosts')}</h2>
                      ${allHostsSorted.map(host => `
                        <div id="host-${host.address.addr.replace(/\./g, '-')}" style="margin-top: 30px;">
                          <h3>Host: ${host.address.addr} (${getHostname(host)})</h3>
                          ${(Array.isArray(host.ports.port) ? host.ports.port : (host.ports.port ? [host.ports.port] : [])).filter(p => p?.state.state === 'open').length > 0 ? `
                            <div class="table-responsive">
                                <table>
                                <thead><tr><th>${tDetails('port')}</th><th>${tDetails('protocol')}</th><th>${tDetails('service')}</th><th>${tDetails('product')}</th><th>${tDetails('version')}</th></tr></thead>
                                <tbody>
                                    ${(Array.isArray(host.ports.port) ? host.ports.port : [host.ports.port]).filter(p => p?.state.state === 'open').map(p => `
                                    <tr>
                                        <td>${p.portid}</td>
                                        <td>${p.protocol}</td>
                                        <td>${p.service?.name || ''}</td>
                                        <td>${p.service?.product || ''}</td>
                                        <td>${p.service?.version || ''}</td>
                                    </tr>
                                    `).join('')}
                                </tbody>
                                </table>
                            </div>
                          ` : `<p>${tDetails('openPorts')}</p>`}
                        </div>
                      `).join('')}
                    </section>
                </div>
            </body>
            </html>
        `;
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `${scanResult.fileName.replace('.xml', '')}_report.html`;
        link.click();
        URL.revokeObjectURL(link.href);

    } catch (error) {
      console.error("Error exporting HTML:", error);
    } finally {
      setIsExportingHtml(false);
    }
  };

  const handleExportPdf = async () => {
    if (!scanResult) return;
    setIsExportingPdf(true);
  
    try {
      const doc = new jsPDF({
        orientation: 'p',
        unit: 'px',
        format: 'a4',
      }) as jsPDFWithAutoTable;
  
      doc.setFont('Helvetica', 'normal');
      
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      let yPos = margin;
  
      const addPageNumbers = () => {
        const pageCount = doc.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          doc.setFontSize(9);
          doc.setTextColor(100);
          doc.text(`${tHostsTable('page', { currentPage: i, totalPages: pageCount })}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
        }
      };
      
      // --- Cover Page ---
      yPos = pageHeight / 2 - 50;
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(32);
      doc.text(tSidebar('export'), pageWidth / 2, yPos, { align: 'center' });
      yPos += 30;
      doc.setFontSize(16);
      doc.setFont('Helvetica', 'normal');
      doc.text(`${tDetails('hosts')}: ${scanResult.fileName}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 15;
      doc.text(`Date: ${new Date().toLocaleString(locale)}`, pageWidth / 2, yPos, { align: 'center' });
      
      doc.addPage();
      yPos = margin;
  
      // -- Summary --
      doc.setFontSize(20);
      doc.setFont('Helvetica', 'bold');
      doc.text(tSummary('totalHosts'), margin, yPos);
      yPos += 20;
      doc.autoTable({
        startY: yPos,
        head: [[tSummary('totalHosts'), tSummary('totalHostsDescription')]],
        body: [
          [tSummary('totalHosts'), scanResult.summary.hostCount],
          [tSummary('openPorts'), scanResult.summary.openPorts],
          [tSummary('uniqueServices'), scanResult.summary.uniqueServices],
          [tSummary('highRiskHosts'), scanResult.hosts.filter(h => (h.riskScore ?? 0) >= 75).length],
        ],
        theme: 'grid',
        headStyles: { fillColor: [63, 81, 181] },
        styles: { font: 'Helvetica' }
      });
      yPos = doc.lastAutoTable.finalY + 30;
  
      // -- Top Vulnerable Hosts --
      const topVulnerableHosts = [...scanResult.hosts]
        .filter(h => (h.riskScore ?? 0) > 0)
        .sort((a, b) => (b.riskScore ?? 0) - (a.riskScore ?? 0))
        .slice(0, 10);
      
      if (topVulnerableHosts.length > 0) {
        if (yPos > pageHeight - 120) {
            doc.addPage();
            yPos = margin;
        }
        doc.setFontSize(20);
        doc.setFont('Helvetica', 'bold');
        doc.text(tRiskRanking('title'), margin, yPos);
        yPos += 20;
        doc.autoTable({
            startY: yPos,
            head: [[tHostsTable('ipAddress'), tHostsTable('hostname'), tHostsTable('riskScore')]],
            body: topVulnerableHosts.map(h => [
                h.address.addr,
                getHostname(h),
                h.riskScore?.toFixed(0) ?? '0'
            ]),
            theme: 'striped',
            headStyles: { fillColor: [63, 81, 181] },
            styles: { font: 'Helvetica' }
        });
        yPos = doc.lastAutoTable.finalY + 30;
      }
  
      // -- Visualizations --
      const addChart = async (elementId: string, title: string) => {
        const element = document.getElementById(elementId);
        if (!element) {
          console.error(`Element with id ${elementId} not found for PDF export.`);
          if (yPos > pageHeight - 50) {
              doc.addPage();
              yPos = margin;
          }
          doc.setFontSize(10);
          doc.setFont('Helvetica', 'normal');
          doc.setTextColor(255, 0, 0);
          doc.text(`Could not render chart: ${title}`, margin, yPos);
          doc.setTextColor(0);
          yPos += 15;
          return;
        }

        if (yPos > pageHeight - 150) {
          doc.addPage();
          yPos = margin;
        }

        doc.setFontSize(14);
        doc.setFont('Helvetica', 'bold');
        doc.text(title, margin, yPos);
        yPos += 10;
        
        try {
          const canvas = await html2canvas(element, { 
            scale: 2, 
            backgroundColor: null,
            useCORS: true
          });
          const imgData = canvas.toDataURL('image/png');
          const imgWidth = pageWidth - (margin * 2);
          const imgHeight = canvas.height * imgWidth / canvas.width;

          if (yPos + imgHeight > pageHeight - margin) {
            doc.addPage();
            yPos = margin;
            doc.setFontSize(14);
            doc.setFont('Helvetica', 'bold');
            doc.text(title, margin, yPos);
            yPos += 10;
          }

          doc.addImage(imgData, 'PNG', margin, yPos, imgWidth, imgHeight);
          yPos += imgHeight + 20;
        } catch (chartError) {
          console.error(`Error capturing chart ${elementId}:`, chartError);
          if (yPos > pageHeight - 50) {
            doc.addPage();
            yPos = margin;
          }
          doc.setFontSize(10);
          doc.setFont('Helvetica', 'normal');
          doc.setTextColor(255, 0, 0);
          doc.text(`Could not render chart: ${title}`, margin, yPos);
          doc.setTextColor(0);
          yPos += 15;
        }
      };
      
      if (yPos > pageHeight - 50) {
        doc.addPage();
        yPos = margin;
      }
      doc.setFontSize(20);
      doc.setFont('Helvetica', 'bold');
      doc.text(tDetails('vulnerabilities'), margin, yPos);
      yPos += 20;

      await addChart('pdf-risk-distribution-chart', tDetails('hostRiskDistributionTitle'));
      await addChart('pdf-top-ports-chart', tDetails('topPortsTitle'));
      await addChart('pdf-service-distribution-chart', tDetails('serviceDistributionTitle'));

      // -- All Hosts Table --
      if (yPos > pageHeight - 80) {
        doc.addPage();
        yPos = margin;
      }
      const allHostsSortedByIp = [...scanResult.hosts].sort((a, b) => ipToNumber(a.address.addr) - ipToNumber(b.address.addr));

      doc.setFontSize(20);
      doc.setFont('Helvetica', 'bold');
      doc.text(tHostsTable('title'), margin, yPos);
      yPos += 20;
      doc.autoTable({
        startY: yPos,
        head: [[tHostsTable('ipAddress'), tHostsTable('hostname'), tDetails('os'), tHostsTable('openPorts'), tHostsTable('riskScore')]],
        body: allHostsSortedByIp.map(h => [
          h.address.addr,
          getHostname(h),
          'N/A',
          getOpenPortsCount(h),
          h.riskScore?.toFixed(0) ?? '0'
        ]),
        theme: 'striped',
        headStyles: { fillColor: [63, 81, 181] },
        styles: { font: 'Helvetica' }
      });
      yPos = doc.lastAutoTable.finalY;
  
      // -- Detailed Host Info --
      for (const host of allHostsSortedByIp) {
        if (yPos > pageHeight - 100) {
          doc.addPage();
          yPos = margin;
        } else {
            yPos += 30;
        }
        
        doc.setFontSize(16);
        doc.setFont('Helvetica', 'bold');
        doc.text(`Host: ${host.address.addr} (${getHostname(host)})`, margin, yPos);
        yPos += 15;
  
        const openPorts = (Array.isArray(host.ports.port) ? host.ports.port : (host.ports.port ? [host.ports.port] : []))
          .filter(p => p?.state.state === 'open');
  
        if (openPorts.length > 0) {
          doc.autoTable({
            startY: yPos,
            head: [[tDetails('port'), tDetails('protocol'), tDetails('service'), tDetails('product'), tDetails('version')]],
            body: openPorts.map(p => [
              p.portid,
              p.protocol,
              p.service?.name || '',
              p.service?.product || '',
              p.service?.version || ''
            ]),
            theme: 'grid',
            headStyles: { fillColor: [100, 100, 100]},
            styles: { font: 'Helvetica', fontSize: 9 }
          });
          yPos = doc.lastAutoTable.finalY;
        } else {
          doc.setFontSize(11);
          doc.setFont('Helvetica', 'normal');
          doc.text(tDetails('openPorts'), margin, yPos);
          yPos += 15;
        }
      }
      
      addPageNumbers();
  
      doc.save(`${scanResult.fileName.replace('.xml', '')}_report.pdf`);
    } catch (error) {
      console.error("Error exporting PDF:", error);
    } finally {
      setIsExportingPdf(false);
    }
  };


  return (
    <>
      <SidebarHeader>
        <h2 className="text-lg font-semibold">{tSidebar('controls')}</h2>
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{tSidebar('riskWeighting')}</SidebarGroupLabel>
          <Card className="bg-background/50">
            <CardContent className="p-4 space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="critical-ports-weight">
                    {locale === 'es' ? 'Puertos Críticos' : 'Critical Ports'}
                  </Label>
                  <span className="text-xs text-muted-foreground">{riskWeights.criticalPorts}/100</span>
                </div>
                <Slider defaultValue={[riskWeights.criticalPorts]} max={100} step={1} onValueCommit={(v) => handleWeightChange('criticalPorts', v)} id="critical-ports-weight"/>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="vuln-scripts-weight">{tSidebar('nseScripts')}</Label>
                   <span className="text-xs text-muted-foreground">{riskWeights.vulnScripts}/100</span>
                </div>
                <Slider defaultValue={[riskWeights.vulnScripts]} max={100} step={1} onValueCommit={(v) => handleWeightChange('vulnScripts', v)} id="vuln-scripts-weight"/>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="service-version-weight">{tSidebar('serviceVersions')}</Label>
                  <span className="text-xs text-muted-foreground">{riskWeights.serviceVersions}/100</span>
                </div>
                <Slider defaultValue={[riskWeights.serviceVersions]} max={100} step={1} onValueCommit={(v) => handleWeightChange('serviceVersions', v)} id="service-version-weight" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="open-ports-weight">{tSidebar('openPorts')}</Label>
                  <span className="text-xs text-muted-foreground">{riskWeights.openPortsCount}/100</span>
                </div>
                <Slider defaultValue={[riskWeights.openPortsCount]} max={100} step={1} onValueCommit={(v) => handleWeightChange('openPortsCount', v)} id="open-ports-weight"/>
              </div>
            </CardContent>
          </Card>
        </SidebarGroup>
        <SidebarGroup>
            <SidebarGroupLabel>{tSidebar('export')}</SidebarGroupLabel>
            <div className="flex flex-col gap-2">
                <Button variant="outline" size="sm" onClick={handleExportJson}>
                    <Download className="mr-2 h-4 w-4" />
                    {tSidebar('exportJson')}
                </Button>
                 <Button variant="outline" size="sm" onClick={handleExportHtml} disabled={isExportingHtml}>
                    {isExportingHtml ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Download className="mr-2 h-4 w-4" />}
                    {tSidebar('exportHtml')}
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportPdf} disabled={isExportingPdf}>
                    {isExportingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Download className="mr-2 h-4 w-4" />}
                    {tSidebar('exportPdf')}
                </Button>
            </div>
        </SidebarGroup>
      </SidebarContent>
    </>
  );
}

    
    
