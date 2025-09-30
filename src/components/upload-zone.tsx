
'use client';

import type { DropzoneRootProps, DropzoneInputProps } from 'react-dropzone';
import { UploadCloud, Terminal, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocale, useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { useState } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

type UploadZoneProps = {
  getRootProps: <T extends DropzoneRootProps>(props?: T) => T;
  getInputProps: <T extends DropzoneInputProps>(props?: T) => T;
  isDragActive: boolean;
};

const NmapCommand = ({ title, command }: { title: string, command: string }) => {
    const [isCopied, setIsCopied] = useState(false);
    
    const handleCopy = () => {
        navigator.clipboard.writeText(command);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    return (
        <div>
            <h4 className="font-semibold">{title}</h4>
            <div className="relative mt-2">
                <pre className="rounded-md bg-muted p-3 pr-12 text-sm font-code overflow-x-auto">
                    <code>{command}</code>
                </pre>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute top-1/2 right-2 -translate-y-1/2 h-8 w-8"
                                onClick={handleCopy}
                            >
                                {isCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                <span className="sr-only">Copy command</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Copy to clipboard</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
        </div>
    );
}

export default function UploadZone({ getRootProps, getInputProps, isDragActive }: UploadZoneProps) {
  const t = useTranslations('UploadZone');
  const locale = useLocale();
  const ipListScanCommand = "sudo nmap -v -A -iL targets.txt -oX scan.xml";
  const infraScanCommand = "sudo nmap -v -A 10.0.0.0/24 -oX scan.xml";
  const hostScanCommand = "sudo nmap -v -A 10.0.0.1 -oX scan.xml";
  const ipListScanTitle = locale === 'es' ? "Escaneo mediante listado de IPs" : "Scan from IP list";

  return (
    <div className="flex flex-col md:flex-row items-center justify-center h-[calc(100vh-200px)] gap-8 p-4 md:p-8">
      <div
        {...getRootProps()}
        className={cn(
          'flex flex-col items-center justify-center w-full md:w-1/2 h-full p-12 border-2 border-dashed rounded-lg cursor-pointer transition-colors',
          isDragActive ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50 hover:bg-muted'
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center gap-4 text-center">
          <UploadCloud className={cn('w-16 h-16', isDragActive ? 'text-primary' : 'text-muted-foreground')} />
          <h3 className="text-2xl font-bold">{t('title')}</h3>
          <p className="text-muted-foreground">{t('subtitle')}</p>
          <p className="text-xs text-muted-foreground">{t('caption')}</p>
        </div>
      </div>
      <Card className="w-full md:w-1/2 h-full flex flex-col">
          <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Terminal className="w-5 h-5" />
                {t('examplesTitle')}
              </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 flex-1 overflow-y-auto">
              <NmapCommand title={t('infraScanTitle')} command={infraScanCommand} />
              <NmapCommand title={t('hostScanTitle')} command={hostScanCommand} />
              <NmapCommand title={ipListScanTitle} command={ipListScanCommand} />
          </CardContent>
      </Card>
    </div>
  );
}
