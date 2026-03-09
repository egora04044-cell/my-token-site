'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ExclusiveMainPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/exclusive/projects');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse text-[var(--text-muted)]">Переход...</div>
    </div>
  );
}
