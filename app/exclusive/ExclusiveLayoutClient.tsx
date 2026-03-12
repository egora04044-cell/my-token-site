'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useExclusiveAccess } from '@/app/lib/useExclusiveAccess';
import { isAdmin } from '@/lib/admin';
import ThemeToggle from '@/app/components/ThemeToggle';
import ContentBackground from '@/app/components/ContentBackground';
import { ExclusiveProvider } from './ExclusiveProvider';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

const navItems = [
  { id: 'projects', label: 'Проекты' },
  { id: 'favorites', label: 'Избранное' },
  { id: 'about', label: 'О нас' },
  { id: 'contact', label: 'Контакты' },
];

export default function ExclusiveLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState('projects');
  const {
    connected,
    publicKey,
    publicKeyStr,
    hasAccess,
    loading,
    isBlocked,
    connecting,
    tokenBalance,
    usePhantomMobileConnection,
    phantomDisconnect,
  } = useExclusiveAccess();

  const shortenAddress = (addr: string) => `${addr.slice(0, 4)}...${addr.slice(-4)}`;

  // Не редиректить, пока кошелёк инициализируется или проверяется баланс
  const isInitializing = connecting || loading;
  const hasCheckedRef = useRef(false);
  const hadLoadingRef = useRef(false);
  useEffect(() => {
    if (loading) hadLoadingRef.current = true;
    else if (hadLoadingRef.current) {
      hasCheckedRef.current = true;
    }
  }, [loading]);

  useEffect(() => {
    if (!hasCheckedRef.current) return;
    if ((!connected || !hasAccess || isBlocked) && !isInitializing) {
      router.replace('/');
    }
  }, [connected, hasAccess, isBlocked, isInitializing, router]);

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const ids = ['projects', 'favorites', 'about', 'contact'];
    const handleScroll = () => {
      const scrollY = window.scrollY + 150;
      for (let i = ids.length - 1; i >= 0; i--) {
        const el = document.getElementById(ids[i]);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top + window.scrollY <= scrollY) {
            setActiveSection(ids[i]);
            break;
          }
        }
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!connected || !hasAccess || isInitializing || isBlocked) {
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
            <Link href="/" className="flex items-center">
              <Image src="/0_3-8714b874-d448-4052-afb0-db79e77b2598.png" alt="VIRAL" width={120} height={67} className="h-16 w-auto rounded-xl" priority />
            </Link>
          </div>
          <nav className="flex-1 px-6 py-4 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => scrollToSection(item.id)}
                className={`block w-full text-left text-sm py-2 px-3 rounded-lg transition-colors ${
                  activeSection === item.id
                    ? 'text-[var(--foreground)] font-medium bg-[var(--bg-elevated)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-[var(--bg-secondary)]'
                }`}
              >
                {item.label}
              </button>
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
          <Link href="/" className="flex items-center">
            <Image src="/0_3-8714b874-d448-4052-afb0-db79e77b2598.png" alt="VIRAL" width={120} height={67} className="h-16 w-auto rounded-xl" priority />
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
              <button
                key={item.id}
                type="button"
                onClick={() => scrollToSection(item.id)}
                className={`block flex-shrink-0 text-xs py-2 px-3 rounded-lg transition-colors ${
                  activeSection === item.id ? 'bg-[var(--bg-elevated)] font-medium' : 'text-[var(--text-muted)] hover:text-[var(--foreground)]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          {children}
        </div>
      </main>
    </ExclusiveProvider>
  );
}
