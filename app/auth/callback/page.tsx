'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { BrowserSDK, AddressType } from '@phantom/browser-sdk';

const PHANTOM_APP_ID = process.env.NEXT_PUBLIC_PHANTOM_APP_ID || '';

function AuthCallbackContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!PHANTOM_APP_ID) {
      setStatus('error');
      setErrorMsg('Phantom App ID не настроен. Добавьте NEXT_PUBLIC_PHANTOM_APP_ID.');
      return;
    }

    const hasPhantomParams =
      searchParams.has('data') ||
      searchParams.has('phantom_encryption_public_key') ||
      searchParams.has('session_id') ||
      searchParams.has('wallet_id') ||
      searchParams.has('organization_id') ||
      searchParams.has('code');

    if (!hasPhantomParams) {
      window.location.replace('/');
      return;
    }

    const sdk = new BrowserSDK({
      providers: ['deeplink', 'google', 'apple', 'injected'],
      addressTypes: [AddressType.solana],
      appId: PHANTOM_APP_ID,
      authOptions: {
        redirectUrl: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : 'https://nextuplabel.online/auth/callback',
      },
      autoConnect: true,
    });

    sdk.on('connect', () => {
      setStatus('success');
      setTimeout(() => {
        window.location.replace('/?phantom_connected=1');
      }, 2000);
    });

    sdk.on('connect_error', (data: { error?: unknown }) => {
      setStatus('error');
      setErrorMsg(String(data?.error || 'Ошибка подключения'));
    });

    sdk.autoConnect().catch((err) => {
      setStatus('error');
      setErrorMsg(String(err?.message || err || 'Не удалось завершить подключение'));
    });
  }, [searchParams]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-[radial-gradient(ellipse,rgba(167,139,250,0.25)_0%,transparent_70%)] opacity-40 pointer-events-none" />
      <div className="relative z-10 max-w-[400px] w-full p-8 bg-[var(--bg-card)] border border-[var(--border)] rounded-[20px] text-center">
        {status === 'processing' && (
          <>
            <div className="w-12 h-12 border-2 border-[var(--border)] border-t-[var(--accent)] rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[var(--text-secondary)]">Завершение подключения Phantom...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-[var(--success)] flex items-center justify-center text-2xl mx-auto mb-4">✓</div>
            <p className="text-[var(--foreground)] font-medium">Подключено! Перенаправление...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="w-14 h-14 rounded-full bg-red-500/15 text-[var(--error)] flex items-center justify-center text-2xl mx-auto mb-4">✕</div>
            <p className="text-[var(--foreground)] font-medium mb-2">Ошибка подключения</p>
            <p className="text-sm text-[var(--text-muted)] mb-4">{errorMsg}</p>
            <p className="text-xs text-[var(--text-muted)] mb-6">
              Попробуйте снова или откройте сайт в Safari/Chrome (не в браузере Phantom).
            </p>
            <a href="/" className="inline-block px-6 py-2.5 bg-[var(--accent)] text-white rounded-xl hover:opacity-90 transition-opacity">
              Вернуться на главную
            </a>
          </>
        )}
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col items-center justify-center px-6">
        <div className="w-12 h-12 border-2 border-[var(--border)] border-t-[var(--accent)] rounded-full animate-spin" />
        <p className="mt-4 text-[var(--text-muted)]">Загрузка...</p>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}
