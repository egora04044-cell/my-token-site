'use client';

import dynamic from 'next/dynamic';

const TokenGatedContent = dynamic(() => import('./components/TokenGatedContent'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
      <div className="animate-pulse text-[var(--text-muted)]">Загрузка...</div>
    </div>
  ),
});

export default function Home() {
  return <TokenGatedContent />;
}