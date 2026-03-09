'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useExclusiveAccess } from '@/app/lib/useExclusiveAccess';
import { isAdmin } from '@/lib/admin';
import ThemeToggle from '@/app/components/ThemeToggle';
import ContentBackground from '@/app/components/ContentBackground';
import { ExclusiveProvider } from './ExclusiveProvider';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

const navItems = [
  { href: '/exclusive', label: 'Главная' },
  { href: '/exclusive/projects', label: 'Проекты' },
  { href: '/exclusive/favorites', label: 'Избранное' },
  { href: '/exclusive/about', label: 'О нас' },
  { href: '/exclusive/contacts', label: 'Контакты' },
];

export default function ExclusiveLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const {
    connected,
    publicKey,
    publicKeyStr,
    hasAccess,
    loading,
    isBlocked,
    tokenBalance,
    usePhantomMobileConnection,
    phantomDisconnect,
  } = useExclusiveAccess();

  const shortenAddress = (addr: string) => `${addr.slice(0, 4)}...${addr.slice(-4)}`;

  useEffect(() => {
    if ((!connected || !hasAccess || isBlocked) && !loading) {
      router.replace('/');
    }
  }, [connected, hasAccess, isBlocked, loading, router]);

  if (!connected || !hasAccess || loading || isBlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <div className="animate-pulse text-[var(--text-muted)]">Загрузка...</div>
      </div>
    );
  }

  return (
    <ExclusiveProvider hasAccess={hasAccess} publicKeyStr={publicKeyStr}>
      <main className="min-h-screen flex">
        <aside className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 w-48 lg:w-56 xl:w-64 border-r border-[var(--border)] bg-[var(--background)] z-20">
          <div className="p-6 pb-4">
            <Link href="/" className="font-display text-sm font-semibold text-[var(--foreground)] tracking-tight">
              ARTIST
            </Link>
          </div>
          <nav className="flex-1 px-6 py-4 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`block w-full text-left text-sm py-2 px-3 rounded-lg transition-colors ${
                  pathname === item.href || (item.href !== '/exclusive' && pathname.startsWith(item.href))
                    ? 'text-[var(--foreground)] font-medium bg-[var(--bg-elevated)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-[var(--bg-secondary)]'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="p-6 pt-4 border-t border-[var(--border)] space-y-3">
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <span className="text-xs text-[var(--text-muted)]">
                {shortenAddress(publicKey?.toString() || '')}
              </span>
            </div>
            {isAdmin(publicKey?.toString()) && (
              <Link href="/admin" className="block text-xs text-[var(--text-muted)] hover:text-[var(--foreground)]">
                Админ
              </Link>
            )}
            <span className="text-xs text-[var(--text-muted)]">
              {Math.floor(tokenBalance || 0).toLocaleString()} токенов
            </span>
            {usePhantomMobileConnection ? (
              <button
                type="button"
                onClick={phantomDisconnect}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--foreground)]"
              >
                Отключить
              </button>
            ) : (
              <WalletMultiButton className="!rounded-lg !py-2 !text-xs !block" />
            )}
          </div>
        </aside>

        <div className="lg:hidden fixed top-0 left-0 right-0 z-20 bg-[var(--background)] border-b border-[var(--border)] px-4 py-3 flex items-center justify-between">
          <Link href="/" className="font-display text-sm font-semibold">
            ARTIST
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <WalletMultiButton className="!rounded-lg !py-1.5 !text-xs" />
          </div>
        </div>

        <div className="content-area-bg flex-1 lg:pl-48 xl:pl-64 min-h-screen pt-16 lg:pt-0">
          <ContentBackground />
          <div className="lg:hidden px-4 py-3 flex gap-2 overflow-x-auto border-b border-[var(--border)]">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`block flex-shrink-0 text-xs py-2 px-3 rounded-lg transition-colors ${
                  pathname === item.href || (item.href !== '/exclusive' && pathname.startsWith(item.href))
                    ? 'bg-[var(--bg-elevated)] font-medium'
                    : 'text-[var(--text-muted)] hover:text-[var(--foreground)]'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
          {children}
        </div>
      </main>
    </ExclusiveProvider>
  );
}
