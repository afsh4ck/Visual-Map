

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
import type { Host, Script } from '@/types/nmap';
import { Slider } from '../ui/slider';
import { VmLogo } from '../icons';

// Extend jsPDF with autoTable
interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
  lastAutoTable: { finalY: number };
}

const getScripts = (item: Host): Script[] => {
    const scriptsSource = item.hostscript;
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

const getHostname = (host: Host | null): string => {
  if (!host) {
    return 'N/A';
  }

  // 1. Try to get from hostnames array
  if (host.hostnames && Array.isArray(host.hostnames)) {
    for (const hostnamesEntry of host.hostnames) {
      if (hostnamesEntry && hostnamesEntry.hostname) {
        const hostnameArray = Array.isArray(hostnamesEntry.hostname) ? hostnamesEntry.hostname : [hostnamesEntry.hostname];
        const primaryHostname = hostnameArray.find(h => h.type === 'user' || h.type === 'PTR');
        if (primaryHostname) {
          return primaryHostname.name;
        }
      }
    }
  } else if (host.hostnames && !Array.isArray(host.hostnames) && host.hostnames.hostname) {
      const hostnameArray = Array.isArray(host.hostnames.hostname) ? host.hostnames.hostname : [host.hostnames.hostname];
      const primaryHostname = hostnameArray.find(h => h.type === 'user' || h.type === 'PTR');
      if (primaryHostname) {
        return primaryHostname.name;
      }
  }


  // 2. If not found, try to get from smb-os-discovery script
  const hostScripts = getScripts(host);
  const smbScript = hostScripts.find(s => s.id === 'smb-os-discovery');
  if (smbScript) {
    const output = smbScript.output;
    const computerNameMatch = output.match(/Computer name: ([\w-]+)/);
    if (computerNameMatch && computerNameMatch[1]) {
      return computerNameMatch[1];
    }
  }

  return 'N/A';
};

const getOsName = (host: Host | null): string => {
    if (!host || !host.os || !host.os.osmatch) {
        return 'N/A';
    }
    const osMatches = Array.isArray(host.os.osmatch) ? host.os.osmatch : [host.os.osmatch];
    if (osMatches.length > 0) {
        const bestMatch = osMatches.reduce((prev, current) => (parseInt(prev.accuracy) > parseInt(current.accuracy)) ? prev : current);
        return bestMatch.name;
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
            const canvas = await html2canvas(element, { scale: 2, backgroundColor: 'transparent', useCORS: true });
            return canvas.toDataURL('image/png');
        };
        
        const riskChart = await getChartAsBase64('pdf-risk-distribution-chart');
        const portsChart = await getChartAsBase64('pdf-top-ports-chart');
        const servicesChart = await getChartAsBase64('pdf-service-distribution-chart');

        const topVulnerableHosts = [...hosts]
            .filter(h => (h.riskScore ?? 0) >= 60)
            .sort((a, b) => (b.riskScore ?? 0) - (a.riskScore ?? 0));
        
        const allHostsSorted = [...hosts].sort((a,b) => ipToNumber(a.address[0].addr) - ipToNumber(b.address[0].addr));
        
        const getRiskClass = (score: number) => {
            if (score >= 75) return 'badge-red';
            if (score >= 40) return 'badge-orange';
            if (score > 0) return 'badge-yellow';
            return 'badge-gray';
        };

        const visualizationsTitle = locale === 'es' ? 'Visualizaciones' : 'Visualizations';
        const osTitle = tDetails('os');
        const summaryTitle = tSummary('totalHosts').includes('Total') ? 'Summary' : 'Resumen';


        const htmlContent = `
            <!DOCTYPE html>
            <html lang="${locale}">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Visual Map Scan Report - ${fileName}</title>
                <style>
                    :root {
                        --background: 220 56% 8%; --foreground: 210 40% 96%;
                        --card: 220 56% 10%; --card-border: 220 56% 15%;
                        --primary: 259 66% 65%; --muted-foreground: 210 40% 65%;
                        --border: 220 56% 15%;
                        --badge-red: #EF4444; --badge-orange: #F97316; --badge-yellow: #FBBF24; --badge-gray: #6B7280;
                    }
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; line-height: 1.6; color: hsl(var(--foreground)); background-color: hsl(var(--background)); margin: 0; padding-top: 80px; }
                    .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
                    header { position: fixed; top: 0; left: 0; right: 0; display: flex; align-items: center; justify-content: space-between; padding: 10px 20px; background-color: hsla(var(--background), 0.8); backdrop-filter: blur(8px); border-bottom: 1px solid hsl(var(--border)); z-index: 1000; }
                    nav ul { list-style: none; padding: 0; margin: 0; display: flex; gap: 20px; }
                    nav a { text-decoration: none; color: hsl(var(--muted-foreground)); font-weight: 500; font-size: 14px; transition: color 0.2s; }
                    nav a:hover { color: hsl(var(--foreground)); }
                    h1, h2, h3 { color: hsl(var(--foreground)); font-weight: 600; }
                    h1 { font-size: 2em; text-align: left; } h2 { font-size: 1.5em; border-bottom: 1px solid hsl(var(--border)); padding-bottom: 10px; margin-top: 40px; } h3 { font-size: 1.2em; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { padding: 12px 15px; border: 1px solid hsl(var(--border)); text-align: left; font-size: 14px; }
                    th { background-color: hsla(var(--card), 0.5); font-weight: 600; }
                    tr { background-color: hsl(var(--card)); }
                    tr:hover { background-color: hsla(var(--card-border), 0.5); }
                    td a { color: hsl(var(--primary)); text-decoration: none; } td a:hover { text-decoration: underline; }
                    .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600; color: white; }
                    .badge-red { background-color: var(--badge-red); } .badge-orange { background-color: var(--badge-orange); } .badge-yellow { background-color: var(--badge-yellow); color: #000; } .badge-gray { background-color: var(--badge-gray); }
                    .grid-summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; margin-top: 20px; }
                    .card { position: relative; padding: 20px; border: 1px solid hsl(var(--border)); border-radius: 8px; background-color: hsl(var(--card)); }
                    .card-title { font-weight: 500; margin-bottom: 10px; color: hsl(var(--muted-foreground)); } .card-value { font-size: 2.5em; font-weight: bold; }
                    .chart-container { margin-top: 20px; padding: 20px; border: 1px solid hsl(var(--border)); border-radius: 8px; text-align: center; background-color: hsl(var(--card)); }
                    .chart-container img { max-width: 100%; height: auto; }
                    .table-responsive { overflow-x: auto; }
                    .logo { display: flex; align-items: center; gap: 10px; }
                    .logo svg { width: 24px; height: 24px; }
                    .logo-text { font-size: 1.2em; font-weight: bold; }
                    @media (max-width: 768px) { body { padding-top: 60px; } header { padding: 10px; } nav { display: none; } .container { padding: 10px; } h1 { font-size: 1.5em; } h2 { font-size: 1.2em; } }
                </style>
            </head>
            <body>
                <header>
                    <div class="logo">
                       <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" fill="hsl(var(--primary))" /></svg>
                       <span class="logo-text">Visual Map</span>
                    </div>
                    <nav>
                        <ul>
                            <li><a href="#summary">${summaryTitle}</a></li>
                            <li><a href="#vulnerable-hosts">${tRiskRanking('title')}</a></li>
                            <li><a href="#visualizations">${visualizationsTitle}</a></li>
                            <li><a href="#all-hosts">${tHostsTable('title')}</a></li>
                        </ul>
                    </nav>
                </header>

                <div class="container">
                    <h1>Visual Map Report</h1>
                    <p style="color: hsl(var(--muted-foreground));"><strong>File:</strong> ${fileName} | <strong>Date:</strong> ${new Date().toLocaleString(locale)}</p>

                    <section id="summary">
                        <h2>${summaryTitle}</h2>
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
                                <thead><tr><th>${tHostsTable('ipAddress')}</th><th>${tHostsTable('hostname')}</th><th>${osTitle}</th><th>${tHostsTable('riskScore')}</th></tr></thead>
                                <tbody>
                                    ${topVulnerableHosts.map(h => `
                                        <tr>
                                            <td><a href="#host-${h.address[0].addr.replace(/\./g, '-')}">${h.address[0].addr}</a></td>
                                            <td>${getHostname(h)}</td>
                                            <td>${getOsName(h)}</td>
                                            <td><span class="badge ${getRiskClass(h.riskScore ?? 0)}">${h.riskScore?.toFixed(0) ?? '0'}</span></td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </section>
                    ` : ''}
                    
                    <section id="visualizations">
                        <h2>${visualizationsTitle}</h2>
                        <div class="chart-container"><h3>${tDetails('hostRiskDistributionTitle')}</h3>${riskChart ? `<img src="${riskChart}">` : 'Chart not available'}</div>
                        <div class="chart-container"><h3>${tDetails('topPortsTitle')}</h3>${portsChart ? `<img src="${portsChart}">` : 'Chart not available'}</div>
                        <div class="chart-container"><h3>${tDetails('serviceDistributionTitle')}</h3>${servicesChart ? `<img src="${servicesChart}">` : 'Chart not available'}</div>
                    </section>

                    <section id="all-hosts">
                        <h2>${tHostsTable('title')} (${hosts.length})</h2>
                        <div class="table-responsive">
                            <table>
                            <thead><tr><th>${tHostsTable('ipAddress')}</th><th>${tHostsTable('hostname')}</th><th>${osTitle}</th><th>${tHostsTable('openPorts')}</th><th>${tHostsTable('riskScore')}</th></tr></thead>
                            <tbody>
                                ${allHostsSorted.map(h => `
                                    <tr>
                                        <td><a href="#host-${h.address[0].addr.replace(/\./g, '-')}">${h.address[0].addr}</a></td>
                                        <td>${getHostname(h)}</td>
                                        <td>${getOsName(h)}</td>
                                        <td>${getOpenPortsCount(h)}</td>
                                        <td><span class="badge ${getRiskClass(h.riskScore ?? 0)}">${h.riskScore?.toFixed(0) ?? '0'}</span></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                            </table>
                        </div>
                    </section>

                    <section id="host-details">
                      <h2>${tDetails('hosts')}</h2>
                      ${allHostsSorted.map(host => `
                        <div id="host-${host.address[0].addr.replace(/\./g, '-')}" class="card" style="margin-top: 30px;">
                          <div style="position: absolute; top: 20px; right: 20px;">
                              <span class="badge ${getRiskClass(host.riskScore ?? 0)}">${tHostsTable('riskScore')}: ${host.riskScore?.toFixed(0) ?? '0'}</span>
                          </div>
                          <h3>Host: ${host.address[0].addr} (${getHostname(host)})</h3>
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
                          ` : `<p style="color: hsl(var(--muted-foreground));">${tDetails('openPorts')}: 0</p>`}
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
  
      const primaryColor = '#8b5cf6';
      const headingColor = '#111827';
      const mutedTextColor = '#6b7280';
      const backgroundColor = '#ffffff';

      doc.setFont('Helvetica', 'normal');
      
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 30;
      let yPos = margin;

      const getRiskColor = (score: number): [number, number, number] => {
        if (score >= 90) return [239, 68, 68]; // Red
        if (score >= 75) return [249, 115, 22]; // Orange
        if (score >= 40) return [251, 191, 36]; // Yellow
        if (score > 0) return [34, 197, 94]; // Green
        return [107, 114, 128]; // Gray
      };
      
      const drawCell = (data: any) => {
        const scoreText = data.cell.text[0];
        if (scoreText) {
          const score = Number(scoreText);
          if (!isNaN(score)) {
              const riskColor = getRiskColor(score);
              doc.setFillColor(riskColor[0], riskColor[1], riskColor[2]);
              const badgeWidth = 25;
              const badgeHeight = 12;
              const cell = data.cell;
              const x = cell.x + (cell.width - badgeWidth) / 2;
              const y = cell.y + (cell.height - badgeHeight) / 2;
              doc.roundedRect(x, y, badgeWidth, badgeHeight, 6, 6, 'F');
              doc.setTextColor(score >= 40 ? '#ffffff' : '#000000');
              doc.setFontSize(9);
              doc.text(scoreText, cell.x + cell.width / 2, cell.y + cell.height / 2, {
                  align: 'center',
                  baseline: 'middle'
              });
          }
        }
      };
  
      // --- Cover Page ---
      yPos = pageHeight / 3;
      doc.setFontSize(32);
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(headingColor);
      doc.text("Visual Map Scan Report", pageWidth / 2, yPos, { align: 'center' });
      yPos += 40;
      doc.setFontSize(14);
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(mutedTextColor);
      doc.text(`File: ${scanResult.fileName}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 20;
      doc.text(`Date: ${new Date().toLocaleString(locale)}`, pageWidth / 2, yPos, { align: 'center' });
      
      doc.addPage();
      yPos = margin;
  
      // -- Summary --
      doc.setFontSize(22);
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(headingColor);
      doc.text('Scan Summary', margin, yPos);
      yPos += 25;
      doc.autoTable({
        startY: yPos,
        head: [['Metric', 'Value']],
        body: [
          [tSummary('totalHosts'), scanResult.summary.hostCount],
          [tSummary('openPorts'), scanResult.summary.openPorts],
          [tSummary('uniqueServices'), scanResult.summary.uniqueServices],
          [tSummary('highRiskHosts'), scanResult.hosts.filter(h => (h.riskScore ?? 0) >= 75).length],
        ],
        theme: 'striped',
        headStyles: { fillColor: primaryColor, textColor: '#ffffff' },
        styles: { font: 'Helvetica', cellPadding: 8 }
      });
      yPos = doc.lastAutoTable.finalY + 30;
  
      // -- Top Vulnerable Hosts --
      const topVulnerableHosts = [...scanResult.hosts]
        .filter(h => (h.riskScore ?? 0) > 0)
        .sort((a, b) => (b.riskScore ?? 0) - (a.riskScore ?? 0))
        .slice(0, 10);
      
      if (topVulnerableHosts.length > 0) {
        if (yPos > pageHeight - 120) { doc.addPage(); yPos = margin; }
        doc.setFontSize(22);
        doc.setFont('Helvetica', 'bold');
        doc.text(tRiskRanking('title'), margin, yPos);
        yPos += 25;
        doc.autoTable({
            startY: yPos,
            head: [[tHostsTable('ipAddress'), tHostsTable('hostname'), tDetails('os'), tHostsTable('riskScore')]],
            body: topVulnerableHosts.map(h => [
                h.address[0].addr,
                getHostname(h),
                getOsName(h),
                h.riskScore?.toFixed(0) ?? '0'
            ]),
            theme: 'striped',
            headStyles: { fillColor: primaryColor, textColor: '#ffffff' },
            styles: { font: 'Helvetica', cellPadding: 8, halign: 'center' },
            columnStyles: { 0: { halign: 'left' }, 1: { halign: 'left' }, 2: { halign: 'left' } },
            didDrawCell: (data) => {
              if (data.column.index === 3 && data.section === 'body') {
                drawCell(data);
              }
            }
        });
        yPos = doc.lastAutoTable.finalY + 30;
      }
  
      // -- Visualizations --
      const addChart = async (elementId: string, title: string) => {
        const element = document.getElementById(elementId);
        if (!element) return;
        if (yPos > pageHeight - 150) { doc.addPage(); yPos = margin; }
        doc.setFontSize(18);
        doc.setFont('Helvetica', 'bold');
        doc.setTextColor(headingColor);
        doc.text(title, margin, yPos);
        yPos += 15;
        try {
          const canvas = await html2canvas(element, { scale: 2, backgroundColor: backgroundColor, useCORS: true });
          const imgData = canvas.toDataURL('image/png');
          const imgWidth = pageWidth - (margin * 2);
          const imgHeight = canvas.height * imgWidth / canvas.width;
          if (yPos + imgHeight > pageHeight - margin) { doc.addPage(); yPos = margin; doc.setFontSize(18); doc.setFont('Helvetica', 'bold'); doc.text(title, margin, yPos); yPos += 15; }
          doc.addImage(imgData, 'PNG', margin, yPos, imgWidth, imgHeight);
          yPos += imgHeight + 25;
        } catch (chartError) { console.error("Chart export error:", chartError); }
      };
      
      if (yPos > pageHeight - 50) { doc.addPage(); yPos = margin; }
      doc.setFontSize(22);
      doc.setFont('Helvetica', 'bold');
      const vulnerabilitiesTitle = locale === 'es' ? 'Visualizaciones' : 'Visualizations';
      doc.text(vulnerabilitiesTitle, margin, yPos);
      yPos += 25;

      await addChart('pdf-risk-distribution-chart', tDetails('hostRiskDistributionTitle'));
      await addChart('pdf-top-ports-chart', tDetails('topPortsTitle'));
      await addChart('pdf-service-distribution-chart', tDetails('serviceDistributionTitle'));

      // -- All Hosts Table --
      const allHostsSortedByIp = [...scanResult.hosts].sort((a, b) => ipToNumber(a.address[0].addr) - ipToNumber(b.address[0].addr));
      doc.addPage();
      yPos = margin;
      doc.setFontSize(22);
      doc.setFont('Helvetica', 'bold');
      doc.text(tHostsTable('title'), margin, yPos);
      yPos += 25;
      doc.autoTable({
        startY: yPos,
        head: [[tHostsTable('ipAddress'), tHostsTable('hostname'), tDetails('os'), tHostsTable('openPorts'), tHostsTable('riskScore')]],
        body: allHostsSortedByIp.map(h => [
          h.address[0].addr,
          getHostname(h),
          getOsName(h),
          getOpenPortsCount(h),
          h.riskScore?.toFixed(0) ?? '0'
        ]),
        theme: 'striped',
        headStyles: { fillColor: primaryColor, textColor: '#ffffff' },
        styles: { font: 'Helvetica', cellPadding: 8, halign: 'center' },
        columnStyles: { 0: { halign: 'left' }, 1: { halign: 'left' }, 2: { halign: 'left' } },
        didDrawCell: (data) => {
          if (data.column.index === 4 && data.section === 'body') {
            drawCell(data);
          }
        },
        pageBreak: 'auto'
      });
      yPos = doc.lastAutoTable.finalY + 30;
  
      // -- Detailed Host Info --
      if(yPos > pageHeight - 80) { doc.addPage(); yPos = margin; }
      doc.setFontSize(22);
      doc.setFont('Helvetica', 'bold');
      doc.text('Detailed Host Information', margin, yPos);
      yPos += 15;

      for (const host of allHostsSortedByIp) {
        if (yPos > pageHeight - 100) { doc.addPage(); yPos = margin; }
        yPos += 20;
        doc.setFontSize(16);
        doc.setFont('Helvetica', 'bold');
        doc.text(`Host: ${host.address[0].addr} (${getHostname(host)})`, margin, yPos);
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
            headStyles: { fillColor: '#4a5568', textColor: '#ffffff'},
            styles: { font: 'Helvetica', fontSize: 9, cellPadding: 6 },
            pageBreak: 'auto'
          });
          yPos = doc.lastAutoTable.finalY;
        } else {
          doc.setFontSize(11);
          doc.setFont('Helvetica', 'normal');
          doc.text('No open ports detected for this host.', margin, yPos);
          yPos += 15;
        }
      }
      
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(9);
        doc.setTextColor(mutedTextColor);
        doc.text(`${tHostsTable('page', { currentPage: i, totalPages: pageCount })}`, pageWidth / 2, pageHeight - 15, { align: 'center' });
      }
  
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
                    {tSidebar('criticalPorts')}
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







    