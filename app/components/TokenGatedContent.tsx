'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { useState, useEffect, useRef } from 'react';
import { isAdmin } from '@/lib/admin';
import { usePhantomMobile } from '@/lib/phantom-mobile';
import AudioPlayer from './AudioPlayer';
import SecureFileLink from './SecureFileLink';
import ThemeToggle from './ThemeToggle';
import ContentBackground from './ContentBackground';
import FavoriteButton from './FavoriteButton';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

const REQUIRED_TOKEN_MINT = new PublicKey("9AB5cgUf1r1iUU2MfYyzm3YujXpdyS1JQVqRSkxbpump");
const REQUIRED_AMOUNT = 1000;

interface UploadedFile {
    id: string;
    name: string;
    path: string;
    size: number;
    uploadedAt: string;
    category?: 'tracks' | 'videos' | 'community' | 'tickets' | 'other';
    coverPath?: string;
}

export default function TokenGatedContent() {
    const { publicKey: adapterPublicKey, connected: adapterConnected } = useWallet();
    const { connected: phantomConnected, publicKey: phantomPublicKey, connectPhantom, connectWithGoogle, connectWithApple, disconnect: phantomDisconnect, hasDeeplinkSupport, isPhantomInAppBrowser } = usePhantomMobile();

    const usePhantomMobileConnection = hasDeeplinkSupport && phantomConnected;
    const publicKey = usePhantomMobileConnection ? phantomPublicKey : adapterPublicKey;
    const connected = usePhantomMobileConnection || adapterConnected;
    const [tokenBalance, setTokenBalance] = useState<number | null>(null);
    const [hasAccess, setHasAccess] = useState(false);
    const [loading, setLoading] = useState(false);
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
    const [isBlocked, setIsBlocked] = useState(false);

    const mountedRef = useRef(true);
    const checkingRef = useRef(false);
    useEffect(() => () => { mountedRef.current = false; }, []);

    const isLocalhost = typeof window !== 'undefined' && /localhost|127\.0\.0\.1/.test(window.location.hostname);
    const devAccess = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('dev_access') === '1';

    const checkTokenBalance = async () => {
        if (checkingRef.current || !publicKey) return;
        checkingRef.current = true;
        setLoading(true);
        setIsBlocked(false);
        const timeoutMs = isLocalhost ? 5000 : 8000;
        const withTimeout = <T,>(p: Promise<T>) =>
            Promise.race([p, new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeoutMs))]);

        try {
            const res = await withTimeout(
                fetch('/api/check-balance', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ address: publicKey.toString() }),
                })
            );
            const data = await res.json();
            if (!mountedRef.current) return;
            setTokenBalance(data.balance ?? 0);
            setHasAccess(data.hasAccess ?? false);
            setIsBlocked(data.blocked ?? false);
        } catch (error) {
            if (mountedRef.current) {
                console.error('Ошибка при проверке баланса:', error);
                setTokenBalance(0);
                setHasAccess(false);
            }
        } finally {
            if (mountedRef.current) {
                setLoading(false);
                checkingRef.current = false;
            }
        }
    };

    const publicKeyStr = publicKey?.toString() ?? '';

    useEffect(() => {
        if (connected && publicKeyStr) {
            if (isLocalhost && devAccess) {
                setLoading(false);
                setTokenBalance(9999);
                setHasAccess(true);
                setIsBlocked(false);
                return;
            }
            const fromAuth = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('phantom_connected') === '1';
            const delay = fromAuth ? 1500 : 0;
            const t = setTimeout(() => {
                checkTokenBalance();
                fetch('/api/connect', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ address: publicKeyStr }),
                }).catch(() => {});
            }, delay);
            return () => clearTimeout(t);
        } else {
            setTokenBalance(null);
            setHasAccess(false);
            setIsBlocked(false);
        }
    }, [connected, publicKeyStr]);

    useEffect(() => {
        if (!loading) return;
        const failsafeMs = isLocalhost ? 6000 : 10000;
        const t = setTimeout(() => {
            if (mountedRef.current) {
                setLoading(false);
                checkingRef.current = false;
            }
        }, failsafeMs);
        return () => clearTimeout(t);
    }, [loading]);

    useEffect(() => {
        if (hasAccess) {
            fetch('/api/files/public')
                .then((r) => r.ok ? r.json() : [])
                .then((data) => { if (mountedRef.current) setUploadedFiles(data); })
                .catch(() => { if (mountedRef.current) setUploadedFiles([]); });
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
            if (mountedRef.current) setFileAccess((prev) => ({ ...prev, ...access }));
        };
        fetchTokens();
    }, [hasAccess, publicKey, uploadedFiles]);

    const shortenAddress = (addr: string) => `${addr.slice(0, 4)}...${addr.slice(-4)}`;
    const isAudioFile = (name: string) => /\.(mp3|wav|ogg|m4a|flac)$/i.test(name);
    const isTrack = (f: UploadedFile) => f.category === 'tracks' || isAudioFile(f.name);
    const [playingId, setPlayingId] = useState<string | null>(null);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [activeSection, setActiveSection] = useState('projects');
    const [favorites, setFavorites] = useState<string[]>([]);
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

    const navItems = [
        { id: 'projects', label: 'Проекты' },
        { id: 'favorites', label: 'Избранное' },
        { id: 'about', label: 'О нас' },
        { id: 'contact', label: 'Контакты' },
    ];

    const scrollToSection = (id: string) => {
        setActiveSection(id);
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (!hasAccess || !publicKeyStr) return;
        fetch(`/api/favorites?address=${encodeURIComponent(publicKeyStr)}`)
            .then((r) => r.ok ? r.json() : [])
            .then((list) => { if (mountedRef.current) setFavorites(Array.isArray(list) ? list : []); })
            .catch(() => {});
    }, [hasAccess, publicKeyStr]);

    const toggleFavorite = async (path: string) => {
        if (!publicKeyStr) return;
        const isFav = favorites.includes(path);
        try {
            const res = await fetch('/api/favorites', {
                method: isFav ? 'DELETE' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address: publicKeyStr, path }),
            });
            if (res.ok) {
                const list = await res.json();
                setFavorites(Array.isArray(list) ? list : []);
            }
        } catch {
            // ignore
        }
    };

    useEffect(() => {
        if (!connected || !hasAccess) return;
        const ids = ['projects', 'favorites', 'about', 'contact'];
        const handleScroll = () => {
            const scrollY = window.scrollY + 150;
            for (let i = ids.length - 1; i >= 0; i--) {
                const el = document.getElementById(ids[i]);
                if (el) {
                    const rect = el.getBoundingClientRect();
                    if (rect.top + window.scrollY <= scrollY) {
                        setActiveSection(ids[i]);
                        break;
                    }
                }
            }
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [connected, hasAccess]);

    return (
        <div className="min-h-screen">
            {/* Gate Screen */}
            {(!connected || loading || !hasAccess || isBlocked) && (
                <main className="min-h-screen flex flex-col content-area-bg gate-screen-bg">
                    <ContentBackground />
                    <nav className="w-full max-w-[1200px] mx-auto px-6 py-6 flex items-center justify-between opacity-0 animate-fade-in-up">
                        <a href="/" className="font-display text-sm font-semibold text-[var(--foreground)] tracking-tight">ARTIST</a>
                        <div className="flex items-center gap-4">
                            {connected && isAdmin(publicKey?.toString()) && (
                                <a href="/admin" className="text-sm text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors">
                                    Админ
                                </a>
                            )}
                            <ThemeToggle />
                            <span className="text-xs text-[var(--text-muted)] px-2.5 py-1 border border-[var(--border)] rounded">EXCLUSIVE</span>
                        </div>
                    </nav>

                    <section className="flex-1 flex flex-col items-center justify-center px-6 py-16 w-full max-w-[720px] mx-auto text-center">
                        {isPhantomInAppBrowser && !connected && (
                            <div className="w-full mb-8 p-6 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl opacity-0 animate-fade-in-up animate-delay-200">
                                <p className="text-[var(--foreground)] font-medium mb-4">
                                    Откройте сайт в Safari или Chrome для подключения кошелька.
                                </p>
                                <a
                                    href="x-safari-https://nextuplabel.online"
                                    className="inline-block px-6 py-3 bg-[var(--foreground)] text-[var(--background)] font-medium rounded-lg hover:opacity-90 transition-opacity"
                                >
                                    Открыть в Safari
                                </a>
                            </div>
                        )}

                        <h1 className="font-display text-[clamp(2.5rem,6vw,4rem)] font-semibold leading-[1.1] text-[var(--foreground)] mb-5 opacity-0 animate-fade-in-up">
                            Доступ к эксклюзивному контенту
                        </h1>
                        <p className="text-[var(--text-secondary)] text-[1.05rem] leading-relaxed mb-14 max-w-[520px] mx-auto opacity-0 animate-fade-in-up animate-delay-100">
                            Подключите Phantom кошелёк с минимум <strong className="font-semibold text-[var(--foreground)]">{REQUIRED_AMOUNT} токенов</strong> артиста,
                            чтобы получить доступ к закрытым материалам и ранним релизам.
                        </p>

                        <div className="w-full max-w-[360px] mx-auto flex flex-col items-center opacity-0 animate-fade-in-up animate-delay-200">
                            {!connected ? (
                                <div className="flex flex-col gap-4">
                                    {hasDeeplinkSupport ? (
                                        <>
                                            <button
                                                type="button"
                                                onClick={connectWithGoogle}
                                                className="flex items-center justify-center gap-3 w-full px-6 py-3.5 bg-white hover:bg-gray-50 text-gray-800 font-medium rounded-lg transition-colors border border-[var(--border)]"
                                            >
                                                <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                                                Войти через Google
                                            </button>
                                            <button
                                                type="button"
                                                onClick={connectWithApple}
                                                className="flex items-center justify-center gap-3 w-full px-6 py-3.5 bg-[var(--foreground)] hover:opacity-90 text-[var(--background)] font-medium rounded-lg transition-opacity"
                                            >
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-1.18 1.35-2.15 2.7-3.45 3.95zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
                                                Войти через Apple
                                            </button>
                                            <p className="text-xs text-[var(--text-muted)] mt-2">Или</p>
                                            <button
                                                type="button"
                                                onClick={connectPhantom}
                                                className="flex items-center justify-center gap-3 w-full px-6 py-3 border border-[var(--border)] hover:border-[var(--border-hover)] text-[var(--foreground)] font-medium rounded-lg transition-colors"
                                            >
                                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 24C18.6274 24 24 18.6274 24 12C24 5.37258 18.6274 0 12 0C5.37258 0 0 5.37258 0 12C0 18.6274 5.37258 24 12 24Z" fill="url(#phantom-b)"/><path d="M13.5 6H10.5V14.25C10.5 14.6625 10.8375 15 11.25 15H12.75C13.1625 15 13.5 14.6625 13.5 14.25V6Z" fill="white"/><path d="M16.5 6H15V8.25H16.5C16.9125 8.25 17.25 8.5875 17.25 9V6.75C17.25 6.3375 16.9125 6 16.5 6Z" fill="white"/><defs><linearGradient id="phantom-b" x1="12" y1="0" x2="12" y2="24" gradientUnits="userSpaceOnUse"><stop stopColor="#534BB1"/><stop offset="1" stopColor="#551BF9"/></linearGradient></defs></svg>
                                                Phantom (приложение)
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <div className="w-full flex justify-center">
                                                <WalletMultiButton className="!flex !items-center !justify-center !gap-3 !rounded-lg !mx-auto" />
                                            </div>
                                            <p className="text-sm text-[var(--text-muted)] text-center mt-3">
                                                {isMobile ? 'На телефоне: откройте сайт в Safari или Chrome.' : 'Безопасное подключение через Phantom'}
                                            </p>
                                        </>
                                    )}
                                </div>
                            ) : loading ? (
                                <div className="p-8 flex flex-col items-center gap-4">
                                    <div className="w-8 h-8 border-2 border-[var(--border)] border-t-[var(--foreground)] rounded-full animate-spin" />
                                    <span className="text-sm text-[var(--text-muted)]">Проверка баланса...</span>
                                </div>
                            ) : isBlocked ? (
                                <div className="p-8 text-center border border-[var(--border)] rounded-lg">
                                    <p className="text-[var(--foreground)] font-medium mb-2">Доступ заблокирован</p>
                                    <p className="text-sm text-[var(--text-muted)]">Этот кошелёк заблокирован администратором.</p>
                                </div>
                            ) : !hasAccess ? (
                                <div className="p-8 text-center border border-[var(--border)] rounded-lg">
                                    <p className="text-[var(--foreground)] font-medium mb-2">Недостаточно токенов</p>
                                    <p className="text-sm text-[var(--text-muted)] mb-4">
                                        На кошельке <strong>{Math.floor(tokenBalance || 0).toLocaleString()}</strong> токенов. Требуется минимум <strong>{REQUIRED_AMOUNT}</strong>.
                                    </p>
                                    {usePhantomMobileConnection ? (
                                        <button type="button" onClick={phantomDisconnect} className="text-sm text-[var(--text-muted)] hover:text-[var(--foreground)] underline">
                                            Отключить кошелёк
                                        </button>
                                    ) : (
                                        <WalletMultiButton className="!rounded-lg" />
                                    )}
                                </div>
                            ) : null}
                        </div>
                    </section>

                    <footer className="py-12 flex flex-col items-center gap-4 opacity-0 animate-fade-in-up animate-delay-400">
                        <p className="text-xs text-[var(--text-muted)]">Phantom Wallet · {REQUIRED_AMOUNT}+ токенов · Solana</p>
                        {typeof window !== 'undefined' && /localhost|127\.0\.0\.1/.test(window.location.hostname) && (
                            <p className="text-xs text-[var(--text-muted)]/70">
                                Локалка: добавьте <code className="px-1 py-0.5 bg-[var(--bg-secondary)] rounded">?dev_access=1</code> к URL для теста без проверки баланса
                            </p>
                        )}
                        <p className="text-xs text-[var(--text-muted)]/70">Прокрутите вниз</p>
                        <svg className="w-5 h-5 text-[var(--text-muted)]/50 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                    </footer>
                </main>
            )}

            {/* Content Screen */}
            {connected && hasAccess && !loading && !isBlocked && (
                <main className="min-h-screen flex">
                    {/* Left sidebar navigation — как на Framer */}
                    <aside className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 w-48 lg:w-56 xl:w-64 border-r border-[var(--border)] bg-[var(--background)] z-20">
                        <div className="p-6 pb-4">
                            <a href="/" className="font-display text-sm font-semibold text-[var(--foreground)] tracking-tight">ARTIST</a>
                        </div>
                        <nav className="flex-1 px-6 py-4 space-y-1">
                            {navItems.map((item) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => scrollToSection(item.id)}
                                    className={`block w-full text-left text-sm py-2 px-3 rounded-lg transition-colors ${
                                        activeSection === item.id
                                            ? 'text-[var(--foreground)] font-medium bg-[var(--bg-elevated)]'
                                            : 'text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-[var(--bg-secondary)]'
                                    }`}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </nav>
                        <div className="p-6 pt-4 border-t border-[var(--border)] space-y-3">
                            <div className="flex items-center gap-2">
                                <ThemeToggle />
                                <span className="text-xs text-[var(--text-muted)]">{shortenAddress(publicKey?.toString() || '')}</span>
                            </div>
                            {isAdmin(publicKey?.toString()) && (
                                <a href="/admin" className="block text-xs text-[var(--text-muted)] hover:text-[var(--foreground)]">
                                    Админ
                                </a>
                            )}
                            <span className="text-xs text-[var(--text-muted)]">
                                {Math.floor(tokenBalance || 0).toLocaleString()} токенов
                            </span>
                            {usePhantomMobileConnection ? (
                                <button type="button" onClick={phantomDisconnect} className="text-xs text-[var(--text-muted)] hover:text-[var(--foreground)]">
                                    Отключить
                                </button>
                            ) : (
                                <WalletMultiButton className="!rounded-lg !py-2 !text-xs !block" />
                            )}
                        </div>
                    </aside>

                    {/* Mobile top bar */}
                    <div className="lg:hidden fixed top-0 left-0 right-0 z-20 bg-[var(--background)] border-b border-[var(--border)] px-4 py-3 flex items-center justify-between">
                        <a href="/" className="font-display text-sm font-semibold">ARTIST</a>
                        <div className="flex items-center gap-3">
                            <nav className="flex gap-2">
                                {navItems.map((item) => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => scrollToSection(item.id)}
                                        className={`text-xs px-2 py-1 rounded ${activeSection === item.id ? 'bg-[var(--bg-elevated)] font-medium' : 'text-[var(--text-muted)]'}`}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </nav>
                            <ThemeToggle />
                            <WalletMultiButton className="!rounded-lg !py-1.5 !text-xs" />
                        </div>
                    </div>

                    {/* Main content — scrollable */}
                    <div className="content-area-bg flex-1 lg:pl-48 xl:pl-64 min-h-screen pt-16 lg:pt-0">
                        <ContentBackground />
                        <section id="projects" className="min-h-screen px-6 py-16 lg:py-24">
                            <h1 className="font-display text-[clamp(1.75rem,3vw,2.25rem)] font-semibold text-[var(--foreground)] mb-2">
                                Проекты
                            </h1>
                            <p className="text-[var(--text-secondary)] mb-12">Эксклюзивный контент для держателей токенов</p>

                        <div className="p-8 bg-[var(--bg-card)]/60 backdrop-blur-xl border border-[var(--border)]/60 rounded-lg">
                            {uploadedFiles.length > 0 ? (
                                <div className="space-y-10">
                                    {uploadedFiles.filter(isTrack).length > 0 && (
                                        <div>
                                            <div className="flex items-center justify-between gap-4 mb-4">
                                                <h2 className="text-lg font-medium text-[var(--foreground)]">Треки</h2>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => { if (isMuted) { if (volume === 0) setVolume(0.5); setIsMuted(false); } else setIsMuted(true); }}
                                                        className="p-1.5 text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors rounded"
                                                        aria-label={isMuted ? 'Включить звук' : 'Выключить звук'}
                                                    >
                                                        {isMuted || volume === 0 ? (
                                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>
                                                        ) : volume < 0.5 ? (
                                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z"/></svg>
                                                        ) : (
                                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
                                                        )}
                                                    </button>
                                                    <input type="range" min={0} max={1} step={0.01} value={volume} onChange={(e) => { const v = parseFloat(e.target.value); setVolume(v); setIsMuted(v === 0); }} className="audio-progress cursor-pointer w-24" />
                                                </div>
                                            </div>
                                            <div className="grid gap-3">
                                                {uploadedFiles.filter(isTrack).map((f) =>
                                                    fileAccess[f.path] ? (
                                                        <AudioPlayer key={f.id} id={f.id} path={f.path} token={fileAccess[f.path].token} address={fileAccess[f.path].address} name={f.name} coverPath={f.coverPath} playingId={playingId} onPlay={setPlayingId} volume={volume} isMuted={isMuted} isFavorite={favorites.includes(f.path)} onToggleFavorite={() => toggleFavorite(f.path)} />
                                                    ) : (
                                                        <div key={f.id} className="flex items-center gap-4 p-4 bg-[var(--bg-secondary)]/60 backdrop-blur-md rounded-lg animate-pulse">
                                                            <div className="w-10 h-10 rounded bg-[var(--border)]" />
                                                            <div><p className="text-sm font-medium truncate">{f.name}</p><p className="text-xs text-[var(--text-muted)]">Загрузка...</p></div>
                                                        </div>
                                                    )
                                                )}
                                            </div>
                                        </div>
                                    )}
                                    {uploadedFiles.filter((f) => !isTrack(f)).length > 0 && (
                                        <div>
                                            <h2 className="text-lg font-medium text-[var(--foreground)] mb-4">Другие файлы</h2>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {uploadedFiles.filter((f) => !isTrack(f)).map((f) => (
                                                    <div key={f.id} className="relative group/card">
                                                        <SecureFileLink path={f.path} access={fileAccess[f.path]} name={f.name} size={f.size} />
                                                        <div className="absolute top-2 right-2 z-10 opacity-100 sm:opacity-0 sm:group-hover/card:opacity-100 transition-opacity">
                                                            <FavoriteButton isFavorite={favorites.includes(f.path)} onToggle={() => toggleFavorite(f.path)} />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <p className="text-[var(--text-secondary)]">Контент появится здесь. Админ загружает файлы в панели управления.</p>
                            )}
                        </div>
                        </section>

                        <section id="favorites" className="min-h-screen px-6 py-16 lg:py-24 border-t border-[var(--border)]">
                            <h1 className="font-display text-[clamp(1.75rem,3vw,2.25rem)] font-semibold text-[var(--foreground)] mb-2">
                                Избранное
                            </h1>
                            <p className="text-[var(--text-secondary)] mb-12">Контент, добавленный в избранное</p>
                            <div className="p-8 bg-[var(--bg-card)]/60 backdrop-blur-xl border border-[var(--border)]/60 rounded-lg">
                                {favorites.length === 0 ? (
                                    <p className="text-[var(--text-secondary)]">Добавьте контент в избранное, нажав на сердечко при наведении</p>
                                ) : (
                                    <div className="space-y-10">
                                        {uploadedFiles.filter(isTrack).filter((f) => favorites.includes(f.path)).length > 0 && (
                                            <div>
                                                <h2 className="text-lg font-medium text-[var(--foreground)] mb-4">Треки</h2>
                                                <div className="grid gap-3">
                                                    {uploadedFiles.filter(isTrack).filter((f) => favorites.includes(f.path)).map((f) =>
                                                        fileAccess[f.path] ? (
                                                            <AudioPlayer key={f.id} id={f.id} path={f.path} token={fileAccess[f.path].token} address={fileAccess[f.path].address} name={f.name} coverPath={f.coverPath} playingId={playingId} onPlay={setPlayingId} volume={volume} isMuted={isMuted} isFavorite={true} onToggleFavorite={() => toggleFavorite(f.path)} />
                                                        ) : null
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                        {uploadedFiles.filter((f) => !isTrack(f)).filter((f) => favorites.includes(f.path)).length > 0 && (
                                            <div>
                                                <h2 className="text-lg font-medium text-[var(--foreground)] mb-4">Другие файлы</h2>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                                    {uploadedFiles.filter((f) => !isTrack(f)).filter((f) => favorites.includes(f.path)).map((f) => (
                                                        <div key={f.id} className="relative group/card">
                                                            <SecureFileLink path={f.path} access={fileAccess[f.path]} name={f.name} size={f.size} />
                                                            <div className="absolute top-2 right-2 z-10">
                                                                <FavoriteButton isFavorite={true} onToggle={() => toggleFavorite(f.path)} />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </section>

                        <section id="about" className="min-h-screen px-6 py-16 lg:py-24 border-t border-[var(--border)]">
                            <h2 className="font-display text-2xl font-semibold text-[var(--foreground)] mb-4">О нас</h2>
                            <p className="text-[var(--text-secondary)] max-w-[600px] leading-relaxed">
                                Эксклюзивное сообщество для держателей токенов артиста. Ранний доступ к релизам, закрытые материалы и личное сообщество.
                            </p>
                        </section>

                        <section id="contact" className="min-h-screen px-6 py-16 lg:py-24 border-t border-[var(--border)]">
                            <h2 className="font-display text-2xl font-semibold text-[var(--foreground)] mb-4">Контакты</h2>
                            <p className="text-[var(--text-secondary)] max-w-[600px] leading-relaxed">
                                Свяжитесь с нами через сообщество или официальные каналы артиста.
                            </p>
                        </section>
                    </div>
                </main>
            )}
        </div>
    );
}
