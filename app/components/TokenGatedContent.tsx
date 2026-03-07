'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PublicKey } from '@solana/web3.js';
import { useState, useEffect } from 'react';
import { isAdmin } from '@/lib/admin';
import { usePhantomMobile } from '@/lib/phantom-mobile';
import AudioPlayer from './AudioPlayer';
import GlassBlock from './GlassBlock';
import SecureFileLink from './SecureFileLink';

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
    const { publicKey: adapterPublicKey, connected: adapterConnected } = useWallet();
    const { connection } = useConnection();
    const { connected: phantomConnected, publicKey: phantomPublicKey, connectPhantom, disconnect: phantomDisconnect, hasDeeplinkSupport } = usePhantomMobile();

    const usePhantomMobileConnection = hasDeeplinkSupport && phantomConnected;
    const publicKey = usePhantomMobileConnection ? phantomPublicKey : adapterPublicKey;
    const connected = usePhantomMobileConnection || adapterConnected;
    const [tokenBalance, setTokenBalance] = useState<number | null>(null);
    const [hasAccess, setHasAccess] = useState(false);
    const [loading, setLoading] = useState(false);
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
    const [isBlocked, setIsBlocked] = useState(false);

    const checkTokenBalance = async () => {
        if (!publicKey) return;
        setLoading(true);
        setIsBlocked(false);
        try {
            const blockedRes = await fetch('/api/check-blocked', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address: publicKey.toString() }),
            });
            const blockedData = await blockedRes.json();
            if (blockedData.blocked) {
                setTokenBalance(0);
                setHasAccess(false);
                setIsBlocked(true);
                setLoading(false);
                return;
            }

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
            setIsBlocked(false);
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
            setFileAccess({});
        }
    }, [hasAccess]);

    const [fileAccess, setFileAccess] = useState<Record<string, { token: string; address: string }>>({});

    useEffect(() => {
        if (!hasAccess || !publicKey || uploadedFiles.length === 0) return;
        const addr = publicKey.toString();
        const fetchTokens = async () => {
            const access: Record<string, { token: string; address: string }> = {};
            await Promise.all(
                uploadedFiles.map(async (f) => {
                    try {
                        const res = await fetch('/api/serve-token', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ path: f.path, address: addr }),
                        });
                        if (res.ok) {
                            const { token } = await res.json();
                            access[f.path] = { token, address: addr };
                        }
                    } catch {
                        // ignore
                    }
                })
            );
            setFileAccess((prev) => ({ ...prev, ...access }));
        };
        fetchTokens();
    }, [hasAccess, publicKey, uploadedFiles]);

    const shortenAddress = (addr: string) => `${addr.slice(0, 4)}...${addr.slice(-4)}`;
    const isAudioFile = (name: string) => /\.(mp3|wav|ogg|m4a|flac)$/i.test(name);
    const [playingId, setPlayingId] = useState<string | null>(null);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const check = () => {
            const ua = navigator.userAgent;
            const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) || window.innerWidth < 768;
            setIsMobile(mobile);
        };
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    return (
        <div className="min-h-screen relative">
            {/* Gate Screen — не подключен, проверка или недостаточно токенов */}
            {(!connected || loading || !hasAccess || isBlocked) && (
                <main className="min-h-screen flex flex-col items-center justify-between px-6 py-8 pb-12 relative">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-[radial-gradient(ellipse,rgba(167,139,250,0.25)_0%,transparent_70%)] opacity-40 pointer-events-none" />
                    
                    <header className="w-full max-w-[600px] flex items-center justify-between z-10">
                        <div className="font-serif text-2xl tracking-[0.15em]">ARTIST</div>
                        <div className="flex items-center gap-3">
                            {connected && isAdmin(publicKey?.toString()) && (
                                <a href="/admin" className="text-xs text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors">
                                    Админ
                                </a>
                            )}
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
                                    {hasDeeplinkSupport ? (
                                        <>
                                            <button
                                                type="button"
                                                onClick={connectPhantom}
                                                className="flex items-center justify-center gap-3 w-full max-w-[320px] px-6 py-3.5 bg-[var(--accent)] hover:opacity-90 text-white font-medium rounded-xl transition-opacity"
                                            >
                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="shrink-0">
                                                    <path d="M12 24C18.6274 24 24 18.6274 24 12C24 5.37258 18.6274 0 12 0C5.37258 0 0 5.37258 0 12C0 18.6274 5.37258 24 12 24Z" fill="url(#phantom-a)" />
                                                    <path d="M13.5 6H10.5V14.25C10.5 14.6625 10.8375 15 11.25 15H12.75C13.1625 15 13.5 14.6625 13.5 14.25V6Z" fill="white" />
                                                    <path d="M16.5 6H15V8.25H16.5C16.9125 8.25 17.25 8.5875 17.25 9V6.75C17.25 6.3375 16.9125 6 16.5 6Z" fill="white" />
                                                    <defs><linearGradient id="phantom-a" x1="12" y1="0" x2="12" y2="24" gradientUnits="userSpaceOnUse"><stop stopColor="#534BB1" /><stop offset="1" stopColor="#551BF9" /></linearGradient></defs>
                                                </svg>
                                                Подключить Phantom
                                            </button>
                                            <p className="text-sm text-[var(--text-muted)] text-center max-w-[320px]">
                                                Откроется приложение Phantom. Подключите кошелёк — вы автоматически вернётесь в браузер с доступом к эксклюзивному контенту.
                                            </p>
                                        </>
                                    ) : (
                                        <>
                                            <WalletMultiButton className="!flex !items-center !justify-center !gap-3 !w-full !max-w-[320px] !rounded-xl" />
                                            <p className="text-sm text-[var(--text-muted)]">
                                                {isMobile
                                                    ? 'На телефоне: выберите WalletConnect → Phantom. Подключение вернётся в браузер.'
                                                    : 'Безопасное подключение через Phantom Wallet'}
                                            </p>
                                        </>
                                    )}
                                </div>
                            ) : loading ? (
                                <div className="w-full max-w-[400px] mx-auto p-8 bg-[var(--bg-card)] border border-[var(--border)] rounded-[20px] flex flex-col items-center gap-4">
                                    <div className="w-10 h-10 border-2 border-[var(--border)] border-t-[var(--accent)] rounded-full animate-spin" />
                                    <span className="text-[var(--text-secondary)]">Проверка баланса токенов...</span>
                                </div>
                            ) : isBlocked ? (
                                <div className="w-full max-w-[400px] mx-auto p-8 bg-[var(--bg-card)] border border-[var(--border)] rounded-[20px] text-center">
                                    <div className="w-14 h-14 rounded-full bg-red-500/15 text-[var(--error)] flex items-center justify-center text-2xl font-bold mx-auto mb-3">🚫</div>
                                    <h3 className="text-xl font-semibold mb-2">Доступ заблокирован</h3>
                                    <p className="text-[var(--text-secondary)] text-[0.95rem]">
                                        Этот кошелёк заблокирован администратором.
                                    </p>
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
                                        {usePhantomMobileConnection ? (
                                            <button
                                                type="button"
                                                onClick={phantomDisconnect}
                                                className="px-6 py-2.5 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl hover:border-[var(--accent)]/50 transition-colors"
                                            >
                                                Отключить кошелёк
                                            </button>
                                        ) : (
                                            <WalletMultiButton className="!rounded-xl" />
                                        )}
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
            {connected && hasAccess && !loading && !isBlocked && (
                <main className="min-h-screen flex flex-col px-6 py-8">
                    <header className="flex items-center justify-between max-w-[1200px] w-full mx-auto mb-12 pb-6 border-b border-[var(--border)]">
                        <div className="font-serif text-2xl tracking-[0.15em]">ARTIST</div>
                        <div className="flex items-center gap-4">
                            {isAdmin(publicKey?.toString()) && (
                                <a href="/admin" className="text-sm text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors">
                                    Админ
                                </a>
                            )}
                            <span className="text-sm text-[var(--text-muted)] font-mono">{shortenAddress(publicKey?.toString() || '')}</span>
                            <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-500/15 text-[var(--success)] rounded-full">
                                {Math.floor(tokenBalance || 0).toLocaleString()}+ токенов
                            </span>
                            {usePhantomMobileConnection ? (
                                <button
                                    type="button"
                                    onClick={phantomDisconnect}
                                    className="px-4 py-2 text-sm bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg hover:border-[var(--accent)]/50 transition-colors"
                                >
                                    Отключить
                                </button>
                            ) : (
                                <WalletMultiButton className="!rounded-lg !py-2 !text-sm" />
                            )}
                        </div>
                    </header>

                    <section className="flex-1 max-w-[1200px] w-full mx-auto">
                        <h1 className="font-serif text-[clamp(2rem,4vw,2.75rem)] font-normal mb-2">Добро пожаловать в эксклюзивную зону</h1>
                        <p className="text-[var(--text-secondary)] mb-12">Контент только для держателей токенов</p>

                        <GlassBlock className="p-8" onContextMenu={(e) => e.preventDefault()}>
                            <h2 className="text-2xl font-semibold mb-4"><span className="opacity-60">🌟</span> Эксклюзивный контент</h2>
                            {uploadedFiles.length > 0 ? (
                                <div className="space-y-6">
                                    {uploadedFiles.filter((f) => isAudioFile(f.name)).length > 0 && (
                                        <div>
                                            <div className="flex items-center justify-between gap-4 mb-3">
                                                <h3 className="text-lg font-semibold text-[var(--foreground)]">Треки</h3>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (isMuted) {
                                                                if (volume === 0) setVolume(0.5);
                                                                setIsMuted(false);
                                                            } else {
                                                                setIsMuted(true);
                                                            }
                                                        }}
                                                        className="p-1.5 text-[var(--text-muted)] opacity-70 hover:opacity-100 hover:text-[var(--foreground)] transition-colors rounded-lg hover:bg-[var(--bg-elevated)]"
                                                        aria-label={isMuted ? 'Включить звук' : 'Выключить звук'}
                                                    >
                                                        {isMuted || volume === 0 ? (
                                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                                                <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                                                            </svg>
                                                        ) : volume < 0.5 ? (
                                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                                                <path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z" />
                                                            </svg>
                                                        ) : (
                                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                                                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                                                            </svg>
                                                        )}
                                                    </button>
                                                    <input
                                                        type="range"
                                                        min={0}
                                                        max={1}
                                                        step={0.01}
                                                        value={volume}
                                                        onChange={(e) => {
                                                            const v = parseFloat(e.target.value);
                                                            setVolume(v);
                                                            setIsMuted(v === 0);
                                                        }}
                                                        className="audio-progress cursor-pointer w-28"
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 gap-3">
                                                {uploadedFiles
                                                    .filter((f) => isAudioFile(f.name))
                                                    .map((f) =>
                                                        fileAccess[f.path] ? (
                                                            <AudioPlayer
                                                                key={f.id}
                                                                id={f.id}
                                                                path={f.path}
                                                                token={fileAccess[f.path].token}
                                                                address={fileAccess[f.path].address}
                                                                name={f.name}
                                                                playingId={playingId}
                                                                onPlay={setPlayingId}
                                                                volume={volume}
                                                                isMuted={isMuted}
                                                            />
                                                        ) : (
                                                            <div key={f.id} className="flex items-center gap-4 p-4 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border)] opacity-60">
                                                                <div className="w-12 h-12 rounded-full bg-[var(--border)] animate-pulse" />
                                                                <div className="flex-1">
                                                                    <p className="text-sm font-medium truncate">{f.name}</p>
                                                                    <p className="text-xs text-[var(--text-muted)]">Загрузка...</p>
                                                                </div>
                                                            </div>
                                                        )
                                                    )}
                                            </div>
                                        </div>
                                    )}
                                    {uploadedFiles.filter((f) => !isAudioFile(f.name)).length > 0 && (
                                        <div>
                                            <h3 className="text-lg font-semibold mb-3 text-[var(--foreground)]">Другие файлы</h3>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {uploadedFiles
                                                    .filter((f) => !isAudioFile(f.name))
                                                    .map((f) => (
                                                        <SecureFileLink
                                                            key={f.id}
                                                            path={f.path}
                                                            access={fileAccess[f.path]}
                                                            name={f.name}
                                                            size={f.size}
                                                        />
                                                    ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <p className="text-[var(--text-secondary)]">
                                    Загруженные файлы появятся здесь. Админ загружает контент в панели управления.
                                </p>
                            )}
                        </GlassBlock>
                    </section>
                </main>
            )}
        </div>
    );
}
