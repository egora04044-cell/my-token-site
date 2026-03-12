'use client';

import dynamic from 'next/dynamic';

const ExclusiveLayoutClient = dynamic(
  () => import('@/app/exclusive/ExclusiveLayoutClient'),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <div className="animate-pulse text-[var(--text-muted)]">Загрузка...</div>
      </div>
    ),
  }
);

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ExclusiveLayoutClient>{children}</ExclusiveLayoutClient>;
}
