'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

interface ConnectedAddress {
  address: string;
  connectedAt: string;
}

interface UploadedFile {
  id: string;
  name: string;
  path: string;
  size: number;
  uploadedAt: string;
  category?: string;
}

const headers = (address: string) => ({
  'x-admin-address': address,
});

export default function AdminPage() {
  const { publicKey, connected } = useWallet();
  const [addresses, setAddresses] = useState<ConnectedAddress[]>([]);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [blocked, setBlocked] = useState<string[]>([]);
  const [blockInput, setBlockInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const adminAddress = publicKey?.toString();
  const [category, setCategory] = useState<'tracks' | 'videos' | 'community' | 'tickets' | 'other'>('tracks');

  const fetchData = async () => {
    if (!adminAddress) return;
    setLoading(true);
    setError(null);
    try {
      const [addrRes, filesRes, blockedRes] = await Promise.all([
        fetch('/api/addresses', { headers: headers(adminAddress) }),
        fetch('/api/files', { headers: headers(adminAddress) }),
        fetch('/api/blocked', { headers: headers(adminAddress) }),
      ]);
      if (!addrRes.ok) throw new Error(addrRes.status === 403 ? 'Нет прав администратора' : 'Ошибка загрузки адресов');
      if (!filesRes.ok) throw new Error('Ошибка загрузки файлов');
      const [addrData, filesData] = await Promise.all([addrRes.json(), filesRes.json()]);
      setAddresses(addrData);
      setFiles(filesData);
      setBlocked(blockedRes.ok ? await blockedRes.json() : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setLoading(false);
    }
  };

  const handleBlockAddress = async (addrOverride?: string) => {
    const addr = (addrOverride ?? blockInput).trim();
    if (!addr || !adminAddress) return;
    setError(null);
    try {
      const res = await fetch('/api/blocked', {
        method: 'POST',
        headers: { ...headers(adminAddress), 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: addr }),
      });
      if (!res.ok) throw new Error('Ошибка блокировки');
      const list = await res.json();
      setBlocked(list);
      if (!addrOverride) setBlockInput('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
    }
  };

  const handleUnblockAddress = async (address: string) => {
    if (!adminAddress) return;
    setError(null);
    try {
      const res = await fetch(`/api/blocked?address=${encodeURIComponent(address)}`, {
        method: 'DELETE',
        headers: headers(adminAddress),
      });
      if (!res.ok) throw new Error('Ошибка разблокировки');
      const list = await res.json();
      setBlocked(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
    }
  };

  useEffect(() => {
    if (connected && adminAddress) {
      fetchData();
    } else {
      setAddresses([]);
      setFiles([]);
      setBlocked([]);
      setLoading(false);
    }
  }, [connected, adminAddress]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !adminAddress) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', category);
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: headers(adminAddress),
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Ошибка ${res.status}`);
      }
      const uploaded = await res.json();
      setFiles((prev) => [uploaded, ...prev]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!adminAddress) return;
    try {
      const res = await fetch(`/api/files/${id}`, {
        method: 'DELETE',
        headers: headers(adminAddress),
      });
      if (!res.ok) throw new Error('Ошибка удаления');
      setFiles((prev) => prev.filter((f) => f.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
    }
  };

  const shortenAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const categoryLabel = (cat?: string) => {
    switch (cat) {
      case 'tracks':
        return 'Неизданные треки';
      case 'videos':
        return 'Эксклюзивные видео';
      case 'community':
        return 'Сообщество';
      case 'tickets':
        return 'Билеты';
      default:
        return 'Без категории';
    }
  };

  if (!connected) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6">
        <div className="max-w-md w-full text-center">
          <h1 className="font-serif text-3xl mb-4">Панель администратора</h1>
          <p className="text-[var(--text-secondary)] mb-8">
            Подключите Phantom кошелёк с правами администратора
          </p>
          <WalletMultiButton className="!rounded-xl !mx-auto" />
          <Link href="/" className="block mt-8 text-sm text-[var(--text-muted)] hover:text-[var(--accent)]">
            ← На главную
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-6 py-8">
      <header className="max-w-4xl mx-auto flex items-center justify-between mb-12 pb-6 border-b border-[var(--border)]">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-[var(--text-muted)] hover:text-white text-sm">
            ← Главная
          </Link>
          <h1 className="font-serif text-2xl">Админ-панель</h1>
        </div>
        <WalletMultiButton className="!rounded-lg !py-2 !text-sm" />
      </header>

      <main className="max-w-4xl mx-auto space-y-12">
        {error && (
          <div className="p-4 bg-red-500/15 border border-red-500/30 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-10 h-10 border-2 border-[var(--border)] border-t-[var(--accent)] rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Загрузка файлов */}
            <section className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6 space-y-4">
              <h2 className="text-xl font-semibold">Загрузить файлы</h2>
              <p className="text-sm text-[var(--text-muted)]">
                Изображения, аудио, видео, PDF (макс. 50 MB)
              </p>
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <div>
                  <label className="block text-xs text-[var(--text-muted)] mb-1">Категория</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as typeof category)}
                    className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="tracks">Неизданные треки</option>
                    <option value="videos">Эксклюзивные видео</option>
                    <option value="community">Сообщество</option>
                    <option value="tickets">Билеты</option>
                    <option value="other">Другое</option>
                  </select>
                </div>
                <div className="flex-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,audio/*,video/*,.pdf"
                    onChange={handleUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="px-6 py-3 bg-[var(--accent)]/20 text-[var(--accent)] rounded-xl font-medium hover:bg-[var(--accent)]/30 transition-colors disabled:opacity-50"
                  >
                    {uploading ? 'Загрузка...' : 'Выбрать файл'}
                  </button>
                </div>
              </div>
            </section>

            {/* Загруженные файлы */}
            <section className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6">
              <h2 className="text-xl font-semibold mb-4">Загруженные файлы ({files.length})</h2>
              {files.length === 0 ? (
                <p className="text-[var(--text-muted)] text-sm">Нет загруженных файлов</p>
              ) : (
                <ul className="space-y-3">
                  {files.map((f) => (
                    <li
                      key={f.id}
                      className="flex items-center justify-between gap-4 py-3 border-b border-[var(--border)] last:border-0"
                    >
                      <div className="min-w-0 flex-1">
                        <a
                          href={f.path}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[var(--accent-bright)] hover:underline truncate block"
                        >
                          {f.name}
                        </a>
                        <span className="text-xs text-[var(--text-muted)]">
                          {formatSize(f.size)} · {categoryLabel(f.category)}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDelete(f.id)}
                        className="text-red-400 hover:text-red-300 text-sm px-2 py-1"
                      >
                        Удалить
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Заблокированные кошельки */}
            <section className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6">
              <h2 className="text-xl font-semibold mb-4">Заблокированные кошельки ({blocked.length})</h2>
              <p className="text-sm text-[var(--text-muted)] mb-4">
                Заблокированные адреса не могут получить доступ к контенту, даже при наличии токенов.
              </p>
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={blockInput}
                  onChange={(e) => setBlockInput(e.target.value)}
                  placeholder="Адрес кошелька для блокировки"
                  className="flex-1 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm font-mono"
                />
                <button
                  onClick={handleBlockAddress}
                  disabled={!blockInput.trim()}
                  className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg font-medium hover:bg-red-500/30 disabled:opacity-50"
                >
                  Заблокировать
                </button>
              </div>
              {blocked.length === 0 ? (
                <p className="text-[var(--text-muted)] text-sm">Нет заблокированных адресов</p>
              ) : (
                <ul className="space-y-2">
                  {blocked.map((addr) => (
                    <li
                      key={addr}
                      className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0"
                    >
                      <code className="text-sm text-[var(--text-secondary)] font-mono">
                        {addr}
                      </code>
                      <button
                        onClick={() => handleUnblockAddress(addr)}
                        className="text-sm text-emerald-400 hover:text-emerald-300"
                      >
                        Разблокировать
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Подключённые адреса */}
            <section className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6">
              <h2 className="text-xl font-semibold mb-4">Подключённые адреса Phantom ({addresses.length})</h2>
              {addresses.length === 0 ? (
                <p className="text-[var(--text-muted)] text-sm">
                  Адреса появятся после подключения пользователей на главной странице
                </p>
              ) : (
                <ul className="space-y-2">
                  {addresses.map((a) => (
                    <li
                      key={a.address}
                      className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0 gap-2"
                    >
                      <code className="text-sm text-[var(--text-secondary)] font-mono truncate flex-1">
                        {a.address}
                      </code>
                      <span className="text-xs text-[var(--text-muted)] flex-shrink-0">
                        {new Date(a.connectedAt).toLocaleString('ru')}
                      </span>
                      {!blocked.includes(a.address) && (
                        <button
                          onClick={() => handleBlockAddress(a.address)}
                          className="text-xs text-red-400 hover:text-red-300 flex-shrink-0"
                        >
                          Заблокировать
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
