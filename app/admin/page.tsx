'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ADMIN_ADDRESSES, isAdmin } from '@/lib/admin';
import GlassBlock from '@/app/components/GlassBlock';
import ThemeToggle from '@/app/components/ThemeToggle';

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
  coverPath?: string;
}

const headers = (address: string) => ({
  'x-admin-address': address,
});

export default function AdminPage() {
  const router = useRouter();
  const { publicKey, connected } = useWallet();
  const [addresses, setAddresses] = useState<ConnectedAddress[]>([]);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [blocked, setBlocked] = useState<string[]>([]);
  const [blockInput, setBlockInput] = useState('');
  const [addressSearch, setAddressSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadingCoverId, setUploadingCoverId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

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

  const isProtectedAddress = (addr: string) =>
    addr === adminAddress || ADMIN_ADDRESSES.includes(addr);

  const handleBlockAddress = async (addrOverride?: string) => {
    const addr = (addrOverride ?? blockInput).trim();
    if (!addr || !adminAddress) return;
    if (isProtectedAddress(addr)) return;
    setError(null);
    try {
      const res = await fetch('/api/blocked', {
        method: 'POST',
        headers: { ...headers(adminAddress), 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: addr }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Ошибка блокировки');
      }
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
      if (!isAdmin(adminAddress)) {
        router.replace('/');
        return;
      }
      fetchData();
    } else {
      setAddresses([]);
      setFiles([]);
      setBlocked([]);
      setLoading(false);
    }
  }, [connected, adminAddress, router]);

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

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const handleRenameStart = (f: UploadedFile) => {
    setRenamingId(f.id);
    const ext = /\.(mp3|wav|ogg|m4a|flac)$/i;
    const nameWithoutExt = ext.test(f.name) ? f.name.replace(ext, '') : f.name;
    setRenameValue(nameWithoutExt);
  };

  const handleRenameSave = async () => {
    if (!adminAddress || !renamingId) return;
    const trimmed = renameValue.trim();
    if (!trimmed) {
      setRenamingId(null);
      return;
    }
    try {
      const res = await fetch(`/api/files/${renamingId}`, {
        method: 'PATCH',
        headers: { ...headers(adminAddress), 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) throw new Error('Ошибка переименования');
      const updated = await res.json();
      setFiles((prev) => prev.map((f) => (f.id === renamingId ? updated : f)));
      setRenamingId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
    }
  };

  const handleRenameCancel = () => {
    setRenamingId(null);
    setRenameValue('');
  };

  const isTrack = (f: UploadedFile) => f.category === 'tracks' || /\.(mp3|wav|ogg|m4a|flac)$/i.test(f.name);

  const handleCoverUpload = async (fileId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const coverFile = e.target.files?.[0];
    if (!coverFile || !adminAddress) return;
    setUploadingCoverId(fileId);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('cover', coverFile);
      const res = await fetch(`/api/files/${fileId}/cover`, {
        method: 'POST',
        headers: headers(adminAddress),
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Ошибка загрузки обложки');
      }
      const updated = await res.json();
      setFiles((prev) => prev.map((f) => (f.id === fileId ? updated : f)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setUploadingCoverId(null);
      e.target.value = '';
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
        <header className="fixed top-0 left-0 right-0 z-10 px-6 py-4 border-b border-[var(--border)] bg-[var(--background)]">
          <Link href="/" className="flex items-center">
            <Image src="/Viral.svg" alt="VIRAL" width={120} height={67} className="h-16 w-auto rounded-xl" priority unoptimized />
          </Link>
        </header>
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
          <Link href="/" className="flex items-center">
            <Image src="/Viral.svg" alt="VIRAL" width={120} height={67} className="h-16 w-auto rounded-xl" priority unoptimized />
          </Link>
          <Link href="/" className="text-[var(--text-muted)] hover:text-[var(--foreground)] text-sm">
            ← Главная
          </Link>
          <h1 className="font-display text-2xl font-semibold">Админ-панель</h1>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <WalletMultiButton className="!rounded-lg !py-2 !text-sm" />
        </div>
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
            <GlassBlock className="p-6 space-y-4">
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
            </GlassBlock>

            {/* Загруженные файлы */}
            <GlassBlock className="p-6">
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
                        {renamingId === f.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleRenameSave();
                                if (e.key === 'Escape') handleRenameCancel();
                              }}
                              className="flex-1 bg-[var(--bg-elevated)] border border-[var(--border)] rounded px-2 py-1 text-sm"
                              autoFocus
                            />
                            <button onClick={handleRenameSave} className="text-sm text-emerald-400 hover:text-emerald-300">
                              Сохранить
                            </button>
                            <button onClick={handleRenameCancel} className="text-sm text-[var(--text-muted)] hover:text-[var(--foreground)]">
                              Отмена
                            </button>
                          </div>
                        ) : (
                          <>
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
                          </>
                        )}
                      </div>
                      {renamingId !== f.id && (
                        <div className="flex items-center gap-2 flex-wrap">
                          {isTrack(f) && (
                            <>
                              <input
                                ref={(el) => { coverInputRefs.current[f.id] = el; }}
                                type="file"
                                accept="image/jpeg,image/png,image/gif,image/webp"
                                onChange={(e) => handleCoverUpload(f.id, e)}
                                className="hidden"
                              />
                              <button
                                onClick={() => coverInputRefs.current[f.id]?.click()}
                                disabled={uploadingCoverId === f.id}
                                className="text-[var(--text-muted)] hover:text-[var(--foreground)] text-sm px-2 py-1 disabled:opacity-50"
                              >
                                {uploadingCoverId === f.id ? 'Загрузка...' : f.coverPath ? 'Сменить обложку' : 'Обложка'}
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleRenameStart(f)}
                            className="text-[var(--text-muted)] hover:text-[var(--foreground)] text-sm px-2 py-1"
                          >
                            Переименовать
                          </button>
                          <button
                            onClick={() => handleDelete(f.id)}
                            className="text-red-400 hover:text-red-300 text-sm px-2 py-1"
                          >
                            Удалить
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </GlassBlock>

            {/* Заблокированные кошельки */}
            <GlassBlock className="p-6">
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
                  disabled={!blockInput.trim() || isProtectedAddress(blockInput.trim())}
                  className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg font-medium hover:bg-red-500/30 disabled:opacity-50"
                >
                  Заблокировать
                </button>
              </div>
              {blockInput.trim() && isProtectedAddress(blockInput.trim()) && (
                <p className="text-xs text-amber-400/90">
                  Нельзя заблокировать свой или админский кошелёк
                </p>
              )}
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
            </GlassBlock>

            {/* Подключённые адреса */}
            <GlassBlock className="p-6">
              <h2 className="text-xl font-semibold mb-4">Подключённые адреса Phantom ({addresses.length})</h2>
              {addresses.length > 0 && (
                <div className="mb-4">
                  <input
                    type="text"
                    value={addressSearch}
                    onChange={(e) => setAddressSearch(e.target.value)}
                    placeholder="Поиск по адресу..."
                    className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm font-mono"
                  />
                </div>
              )}
              {addresses.length === 0 ? (
                <p className="text-[var(--text-muted)] text-sm">
                  Адреса появятся после подключения пользователей на главной странице
                </p>
              ) : (
                <ul className="space-y-2">
                  {addresses
                    .filter((a) => !addressSearch.trim() || a.address.toLowerCase().includes(addressSearch.trim().toLowerCase()))
                    .map((a) => (
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
                      {!blocked.includes(a.address) && !isProtectedAddress(a.address) && (
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
              {addresses.length > 0 && addressSearch.trim() && addresses.filter((a) => a.address.toLowerCase().includes(addressSearch.trim().toLowerCase())).length === 0 && (
                <p className="text-[var(--text-muted)] text-sm mt-2">Ничего не найдено</p>
              )}
            </GlassBlock>
          </>
        )}
      </main>
    </div>
  );
}
