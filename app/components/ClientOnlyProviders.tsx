'use client';

import { useState, useEffect } from 'react';
import { Providers } from '../providers';
import { PhantomMobileProvider } from '@/lib/phantom-mobile';
import { ThemeProvider } from '@/lib/theme-context';

/** Рендерит провайдеры только на клиенте после монтирования — устраняет React error #418 (hydration mismatch) */
export function ClientOnlyProviders({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <div className="animate-pulse text-[var(--text-muted)]">Загрузка...</div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <Providers>
        <PhantomMobileProvider>
          {children}
        </PhantomMobileProvider>
      </Providers>
    </ThemeProvider>
  );
}
