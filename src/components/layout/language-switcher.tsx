
'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Globe, Loader2 } from 'lucide-react';
import { usePathname, useRouter } from '@/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useScanStore } from '@/store/use-scan-store';
import { useTransition } from 'react';
import { cn } from '@/lib/utils';

export default function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations('Header');
  const { clearExplanationCache, clearPentestingStepsCache } = useScanStore();
  const [isPending, startTransition] = useTransition();

  const changeLocale = (newLocale: 'en' | 'es') => {
    clearExplanationCache();
    clearPentestingStepsCache();
    startTransition(() => {
      router.push(pathname, { locale: newLocale });
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Globe className={cn('h-[1.2rem] w-[1.2rem]', isPending && 'hidden')} />
          {isPending && <Loader2 className="h-[1.2rem] w-[1.2rem] animate-spin" />}
          <span className="sr-only">{t('language')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => changeLocale('en')}
          disabled={locale === 'en' || isPending}
        >
          English
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => changeLocale('es')}
          disabled={locale === 'es' || isPending}
        >
          Español
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
