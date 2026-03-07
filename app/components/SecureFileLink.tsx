'use client';

import { useState } from 'react';

interface SecureFileLinkProps {
  path: string;
  access: { token: string; address: string } | undefined;
  name: string;
  size: number;
}

export default function SecureFileLink({ path, access, name, size }: SecureFileLinkProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!access) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/serve?path=${encodeURIComponent(path)}`, {
        headers: {
          'X-Serve-Token': access.token,
          'X-Serve-Address': access.address,
        },
      });
      if (!res.ok) throw new Error('Access denied');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const icon = name.match(/\.(mp4|webm|mov)$/i) ? '🎬' : name.match(/\.(jpg|png|gif|webp)$/i) ? '🖼️' : '📄';

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!access || loading}
      className="flex items-center gap-3 p-4 bg-[var(--bg-elevated)] rounded-lg border border-[var(--border)] hover:border-[var(--accent)]/50 transition-colors w-full text-left disabled:opacity-60 disabled:pointer-events-none"
    >
      <span className="text-2xl">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{name}</p>
        <p className="text-xs text-[var(--text-muted)]">
          {loading ? 'Загрузка...' : `${(size / 1024).toFixed(1)} KB`}
        </p>
      </div>
    </button>
  );
}
