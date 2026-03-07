'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-[var(--bg)]">
      <div className="max-w-[400px] p-8 bg-[var(--bg-card)] border border-[var(--border)] rounded-[20px] text-center">
        <div className="w-14 h-14 rounded-full bg-red-500/15 text-[var(--error)] flex items-center justify-center text-2xl mx-auto mb-4">✕</div>
        <h2 className="text-xl font-semibold mb-2">Ошибка загрузки</h2>
        <p className="text-sm text-[var(--text-muted)] mb-6">
          Обновите страницу или попробуйте позже.
        </p>
        <button
          type="button"
          onClick={reset}
          className="px-6 py-2.5 bg-[var(--accent)] text-white rounded-xl hover:opacity-90 transition-opacity"
        >
          Попробовать снова
        </button>
      </div>
    </div>
  );
}
