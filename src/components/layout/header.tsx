'use client';

import { VmLogo } from '@/components/icons';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Upload } from 'lucide-react';
import { useTranslations } from 'next-intl';
import LanguageSwitcher from './language-switcher';

type AppHeaderProps = {
  onUploadNew: () => void;
  showUploadNew: boolean;
  children?: React.ReactNode;
};

export default function AppHeader({ onUploadNew, showUploadNew, children }: AppHeaderProps) {
  const t = useTranslations('Header');

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-2">
        {children}
        <VmLogo className="h-6 w-6" />
        <h1 className="text-xl font-bold tracking-tight">{t('title')}</h1>
      </div>

      <div className="flex flex-1 items-center justify-end space-x-2">
        {showUploadNew && (
          <>
            <Button variant="outline" size="sm" onClick={onUploadNew}>
              <Upload className="mr-2 h-4 w-4" />
              {t('newScan')}
            </Button>
            <Separator orientation="vertical" className="h-6" />
          </>
        )}
        <LanguageSwitcher />
        <ThemeToggle />
      </div>
    </header>
  );
}