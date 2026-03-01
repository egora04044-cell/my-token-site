'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PublicKey } from '@solana/web3.js';
import { useState, useEffect } from 'react';

const REQUIRED_TOKEN_MINT = new PublicKey("9AB5cgUf1r1iUU2MfYyzm3YujXpdyS1JQVqRSkxbpump");
const REQUIRED_AMOUNT = 1000;

interface UploadedFile {
    id: string;
    name: string;
    path: string;
    size: number;
    uploadedAt: string;
    category?: 'tracks' | 'videos' | 'community' | 'tickets' | 'other';
}

export default function TokenGatedContent() {
    const { publicKey, connected } = useWallet();
    const { connection } = useConnection();
    const [tokenBalance, setTokenBalance] = useState<number | null>(null);
    const [hasAccess, setHasAccess] = useState(false);
    const [loading, setLoading] = useState(false);
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

    const checkTokenBalance = async () => {
        if (!publicKey) return;
        setLoading(true);
        try {
            const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
                publicKey,
                { mint: REQUIRED_TOKEN_MINT }
            );
            if (tokenAccounts.value.length > 0) {
                const balance = tokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount;
                setTokenBalance(balance);
                setHasAccess(balance >= REQUIRED_AMOUNT);
            } else {
                setTokenBalance(0);
                setHasAccess(false);
            }
        } catch (error) {
            console.error('Ошибка при проверке баланса:', error);
            setTokenBalance(0);
            setHasAccess(false);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (connected && publicKey) {
            checkTokenBalance();
            fetch('/api/connect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address: publicKey.toString() }),
            }).catch(() => {});
        } else {
            setTokenBalance(null);
            setHasAccess(false);
        }
    }, [connected, publicKey]);

    useEffect(() => {
        if (hasAccess) {
            fetch('/api/files/public')
                .then((r) => r.ok ? r.json() : [])
                .then(setUploadedFiles)
                .catch(() => setUploadedFiles([]));
        } else {
            setUploadedFiles([]);
        }
    }, [hasAccess]);

    const shortenAddress = (addr: string) => `${addr.slice(0, 4)}...${addr.slice(-4)}`;
    const filesByCategory = (cat: UploadedFile['category']) =>
        uploadedFiles.filter((f) => (f.category ?? 'other') === (cat ?? 'other'));

    return (
        <div className="min-h-screen relative">
            {/* Gate Screen — не подключен, проверка или недостаточно токенов */}
            {(!connected || loading || !hasAccess) && (
                <main className="min-h-screen flex flex-col items-center justify-between px-6 py-8 pb-12 relative">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-[radial-gradient(ellipse,rgba(167,139,250,0.25)_0%,transparent_70%)] opacity-40 pointer-events-none" />
                    
                    <header className="w-full max-w-[600px] flex items-center justify-between z-10">
                        <div className="font-serif text-2xl tracking-[0.15em]">ARTIST</div>
                        <div className="flex items-center gap-3">
                            <a href="/admin" className="text-xs text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors">
                                Админ
                            </a>
                            <span className="text-xs font-semibold tracking-[0.2em] px-3 py-1.5 border border-[var(--accent)] rounded-full text-[var(--accent)] bg-[rgba(167,139,250,0.08)]">
                                EXCLUSIVE
                            </span>
                        </div>
                    </header>

                    <section className="flex-1 flex flex-col items-center text-center max-w-[520px] z-10">
                        <h1 className="font-serif text-[clamp(2.5rem,6vw,3.5rem)] leading-tight mb-6">
                            <span className="block">Доступ к</span>
                            <span className="block bg-gradient-to-r from-violet-600 via-purple-400 to-purple-300 bg-clip-text text-transparent">
                                эксклюзивному контенту
                            </span>
                        </h1>
                        <p className="text-[1.05rem] text-[var(--text-secondary)] mb-10 leading-relaxed">
                            Подключите Phantom кошелёк с минимум <strong className="text-[var(--accent-bright)] font-medium">{REQUIRED_AMOUNT} токенов</strong> артиста,
                            чтобы получить доступ к закрытым материалам, ранним релизам и личному сообществу.
                        </p>

                        <div className="w-full mb-8">
                            {!connected ? (
                                <div className="flex flex-col items-center gap-4">
                                    <WalletMultiButton className="!flex !items-center !justify-center !gap-3 !w-full !max-w-[320px] !rounded-xl" />
                                    <p className="text-sm text-[var(--text-muted)]">Безопасное подключение через Phantom Wallet</p>
                                </div>
                            ) : loading ? (
                                <div className="w-full max-w-[400px] mx-auto p-8 bg-[var(--bg-card)] border border-[var(--border)] rounded-[20px] flex flex-col items-center gap-4">
                                    <div className="w-10 h-10 border-2 border-[var(--border)] border-t-[var(--accent)] rounded-full animate-spin" />
                                    <span className="text-[var(--text-secondary)]">Проверка баланса токенов...</span>
                                </div>
                            ) : !hasAccess ? (
                                <div className="w-full max-w-[400px] mx-auto p-8 bg-[var(--bg-card)] border border-[var(--border)] rounded-[20px] text-center">
                                    <div className="w-14 h-14 rounded-full bg-red-500/15 text-[var(--error)] flex items-center justify-center text-2xl font-bold mx-auto mb-3">✕</div>
                                    <h3 className="text-xl font-semibold mb-2">Недостаточно токенов</h3>
                                    <p className="text-[var(--text-secondary)] text-[0.95rem] mb-1">
                                        На вашем кошельке <span className="text-white font-medium">{Math.floor(tokenBalance || 0).toLocaleString()}</span> токенов. Требуется минимум <strong>{REQUIRED_AMOUNT}</strong>.
                                    </p>
                                    <p className="text-sm text-[var(--text-muted)]">Приобретите токены артиста, чтобы получить доступ.</p>
                                    <div className="mt-6">
                                        <WalletMultiButton className="!rounded-xl" />
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    </section>

                    <footer className="z-10 flex items-center gap-2 text-xs text-[var(--text-muted)]">
                        <span>Phantom Wallet</span>
                        <span className="opacity-50">•</span>
                        <span>{REQUIRED_AMOUNT}+ токенов</span>
                        <span className="opacity-50">•</span>
                        <span>Solana Network</span>
                    </footer>
                </main>
            )}

            {/* Content Screen — доступ разрешён */}
            {connected && hasAccess && !loading && (
                <main className="min-h-screen flex flex-col px-6 py-8">
                    <header className="flex items-center justify-between max-w-[1200px] w-full mx-auto mb-12 pb-6 border-b border-[var(--border)]">
                        <div className="font-serif text-2xl tracking-[0.15em]">ARTIST</div>
                        <div className="flex items-center gap-4">
                            <a href="/admin" className="text-sm text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors">
                                Админ
                            </a>
                            <span className="text-sm text-[var(--text-muted)] font-mono">{shortenAddress(publicKey?.toString() || '')}</span>
                            <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-500/15 text-[var(--success)] rounded-full">
                                {Math.floor(tokenBalance || 0).toLocaleString()}+ токенов
                            </span>
                            <WalletMultiButton className="!rounded-lg !py-2 !text-sm" />
                        </div>
                    </header>

                    <section className="flex-1 max-w-[1200px] w-full mx-auto">
                        <h1 className="font-serif text-[clamp(2rem,4vw,2.75rem)] font-normal mb-2">Добро пожаловать в эксклюзивную зону</h1>
                        <p className="text-[var(--text-secondary)] mb-12">Контент только для держателей токенов</p>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {[
                                { emoji: '🎵', title: 'Неизданные треки', desc: 'Ранний доступ к новым релизам', category: 'tracks' as const },
                                { emoji: '🎬', title: 'Эксклюзивные видео', desc: 'За кулисами и бонусные материалы', category: 'videos' as const },
                                { emoji: '💬', title: 'Закрытое сообщество', desc: 'Прямая связь с артистом', category: 'community' as const },
                                { emoji: '🎫', title: 'Приоритетные билеты', desc: 'Ранняя продажа на концерты', category: 'tickets' as const },
                            ].map((card) => {
                                const catFiles = filesByCategory(card.category);
                                return (
                                    <article
                                        key={card.title}
                                        className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6 text-left min-h-[200px] flex flex-col justify-between gap-3 transition-all duration-300 hover:border-[var(--border-hover)] hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(0,0,0,0.3)]"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-3xl">{card.emoji}</span>
                                            <div>
                                                <h3 className="text-lg font-semibold">{card.title}</h3>
                                                <p className="text-xs text-[var(--text-secondary)]">{card.desc}</p>
                                            </div>
                                        </div>
                                        <div className="mt-2">
                                            {catFiles.length === 0 ? (
                                                <p className="text-xs text-[var(--text-muted)]">
                                                    Здесь появится контент этой категории после загрузки в админ-панели.
                                                </p>
                                            ) : (
                                                <ul className="space-y-1">
                                                    {catFiles.slice(0, 3).map((f) => (
                                                        <li key={f.id}>
                                                            <a
                                                                href={f.path}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-xs text-[var(--accent-bright)] hover:underline truncate block"
                                                            >
                                                                {f.name}
                                                            </a>
                                                        </li>
                                                    ))}
                                                    {catFiles.length > 3 && (
                                                        <li className="text-[0.7rem] text-[var(--text-muted)]">
                                                            + ещё {catFiles.length - 3}
                                                        </li>
                                                    )}
                                                </ul>
                                            )}
                                        </div>
                                    </article>
                                );
                            })}
                        </div>

                        <div className="mt-12 p-8 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl">
                            <h2 className="text-2xl font-semibold mb-4">🌟 Эксклюзивный контент</h2>
                            {uploadedFiles.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {uploadedFiles.map((f) => (
                                        <a
                                            key={f.id}
                                            href={f.path}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-3 p-4 bg-[var(--bg-elevated)] rounded-lg border border-[var(--border)] hover:border-[var(--accent)]/50 transition-colors"
                                        >
                                            <span className="text-2xl">
                                                {f.name.match(/\.(mp4|webm|mov)$/i) ? '🎬' : f.name.match(/\.(mp3|wav|ogg)$/i) ? '🎵' : f.name.match(/\.(jpg|png|gif|webp)$/i) ? '🖼️' : '📄'}
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-medium truncate">{f.name}</p>
                                                <p className="text-xs text-[var(--text-muted)]">
                                                    {(f.size / 1024).toFixed(1)} KB
                                                </p>
                                            </div>
                                        </a>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-[var(--text-secondary)]">
                                    Загруженные файлы появятся здесь. Админ загружает контент в панели управления.
                                </p>
                            )}
                        </div>
                    </section>
                </main>
            )}
        </div>
    );
}
