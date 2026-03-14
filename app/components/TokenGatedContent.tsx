'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { isAdmin } from '@/lib/admin';
import { usePhantomMobile } from '@/lib/phantom-mobile';
import ContentBackground from './ContentBackground';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

const REQUIRED_AMOUNT = 1000;

type PageMode = 'gate' | 'content';

export default function TokenGatedContent({ mode = 'gate' }: { mode?: PageMode }) {
    const { publicKey: adapterPublicKey, connected: adapterConnected } = useWallet();
    const { connected: phantomConnected, publicKey: phantomPublicKey, connectPhantom, connectWithGoogle, connectWithApple, disconnect: phantomDisconnect, hasDeeplinkSupport, isPhantomInAppBrowser } = usePhantomMobile();

    const usePhantomMobileConnection = hasDeeplinkSupport && phantomConnected;
    const publicKey = usePhantomMobileConnection ? phantomPublicKey : adapterPublicKey;
    const connected = usePhantomMobileConnection || adapterConnected;
    const [tokenBalance, setTokenBalance] = useState<number | null>(null);
    const [hasAccess, setHasAccess] = useState(false);
    const [loading, setLoading] = useState(false);
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
            setLoading(true);
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
            setLoading(false);
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

    const showGate = mode === 'gate';

    return (
        <div className="min-h-screen">
            {/* Gate Screen — главная страница */}
            {showGate && (
                <main className="min-h-screen flex flex-col content-area-bg gate-screen-bg">
                    <ContentBackground />
                    <nav className="w-full max-w-[1200px] mx-auto px-6 py-6 flex items-center justify-between opacity-0 animate-fade-in-up">
                        <Link href="/" className="flex items-center">
                            <Image src="/Viral.svg" alt="VIRAL" width={240} height={134} className="h-20 w-auto rounded-xl" priority unoptimized />
                        </Link>
                        <div className="flex items-center gap-6">
                            <a href="#about" className="hidden sm:block text-sm text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors">
                                О проекте
                            </a>
                            <a href="#ambassadors" className="hidden sm:block text-sm text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors">
                                Амбассадоры
                            </a>
                            {connected && isAdmin(publicKey?.toString()) && (
                                <a href="/admin" className="text-sm text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors">
                                    Админ
                                </a>
                            )}
                        </div>
                    </nav>

                    <section className="flex-1 flex flex-col items-center justify-center px-6 py-20 lg:py-28 w-full max-w-[720px] mx-auto text-center">
                        {isPhantomInAppBrowser && !connected && (
                            <div className="w-full mb-8 p-6 bg-[var(--bg-card)]/80 backdrop-blur-xl border border-[var(--border)] rounded-2xl opacity-0 animate-fade-in-up animate-delay-200">
                                <p className="text-[var(--foreground)] font-medium mb-4">
                                    Откройте сайт в Safari или Chrome для подключения кошелька.
                                </p>
                                <a
                                    href="x-safari-https://nextuplabel.online"
                                    className="inline-block px-6 py-3 bg-[var(--foreground)] text-[var(--background)] font-medium rounded-xl hover:opacity-90 transition-opacity"
                                >
                                    Открыть в Safari
                                </a>
                            </div>
                        )}

                        <p className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-widest mb-6 opacity-0 animate-fade-in-up">
                            Эксклюзивный доступ
                        </p>
                        <h1 className="font-display text-[clamp(2.25rem,5vw,3.5rem)] font-semibold leading-[1.1] text-[var(--foreground)] mb-6 opacity-0 animate-fade-in-up">
                            Ваш пропуск к закрытому контенту
                        </h1>
                        <p className="text-[var(--text-secondary)] text-[1.1rem] leading-relaxed mb-12 max-w-[540px] mx-auto opacity-0 animate-fade-in-up animate-delay-100">
                            Подключите Phantom кошелёк с минимум <strong className="font-semibold text-[var(--foreground)]">{REQUIRED_AMOUNT} токенов</strong> артиста,
                            чтобы получить доступ к ранним релизам и закрытым материалам.
                        </p>

                        <div className="w-full max-w-[380px] mx-auto flex flex-col items-center opacity-0 animate-fade-in-up animate-delay-200">
                            {!connected ? (
                                <div className="flex flex-col gap-4">
                                    {hasDeeplinkSupport ? (
                                        <>
                                            <button
                                                type="button"
                                                onClick={connectWithGoogle}
                                                className="flex items-center justify-center gap-3 w-full px-6 py-3.5 bg-white hover:bg-gray-50 text-gray-800 font-medium rounded-xl transition-colors border border-[var(--border)]"
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
                                                className="flex items-center justify-center gap-3 w-full px-6 py-3.5 border border-[var(--border)] hover:border-[var(--border-hover)] text-[var(--foreground)] font-medium rounded-xl transition-colors"
                                            >
                                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 24C18.6274 24 24 18.6274 24 12C24 5.37258 18.6274 0 12 0C5.37258 0 0 5.37258 0 12C0 18.6274 5.37258 24 12 24Z" fill="url(#phantom-b)"/><path d="M13.5 6H10.5V14.25C10.5 14.6625 10.8375 15 11.25 15H12.75C13.1625 15 13.5 14.6625 13.5 14.25V6Z" fill="white"/><path d="M16.5 6H15V8.25H16.5C16.9125 8.25 17.25 8.5875 17.25 9V6.75C17.25 6.3375 16.9125 6 16.5 6Z" fill="white"/><defs><linearGradient id="phantom-b" x1="12" y1="0" x2="12" y2="24" gradientUnits="userSpaceOnUse"><stop stopColor="#534BB1"/><stop offset="1" stopColor="#551BF9"/></linearGradient></defs></svg>
                                                Phantom (приложение)
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <div className="w-full flex justify-center">
                                                <WalletMultiButton className="!flex !items-center !justify-center !gap-3 !rounded-xl !mx-auto !px-8 !py-4" />
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
                                <div className="p-8 text-center border border-[var(--border)] rounded-xl bg-[var(--bg-card)]/60 backdrop-blur-xl">
                                    <p className="text-[var(--foreground)] font-medium mb-2">Доступ заблокирован</p>
                                    <p className="text-sm text-[var(--text-muted)]">Этот кошелёк заблокирован администратором.</p>
                                </div>
                            ) : !hasAccess ? (
                                <div className="p-8 text-center border border-[var(--border)] rounded-xl bg-[var(--bg-card)]/60 backdrop-blur-xl">
                                    <p className="text-[var(--foreground)] font-medium mb-2">Недостаточно токенов</p>
                                    <p className="text-sm text-[var(--text-muted)] mb-4">
                                        На кошельке <strong>{Math.floor(tokenBalance || 0).toLocaleString()}</strong> токенов. Требуется минимум <strong>{REQUIRED_AMOUNT}</strong>.
                                    </p>
                                    {usePhantomMobileConnection ? (
                                        <button type="button" onClick={phantomDisconnect} className="text-sm text-[var(--text-muted)] hover:text-[var(--foreground)] underline">
                                            Отключить кошелёк
                                        </button>
                                    ) : (
                                        <WalletMultiButton className="!rounded-xl" />
                                    )}
                                </div>
                            ) : (
                                <div className="p-8 text-center border border-[var(--border)]/60 rounded-xl bg-[var(--bg-card)]/60 backdrop-blur-xl">
                                    <p className="text-[var(--foreground)] font-medium mb-6">Доступ получен</p>
                                    <Link
                                        href="/exclusive"
                                        className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-[var(--foreground)]/80 backdrop-blur-sm text-[var(--background)] font-semibold rounded-xl hover:bg-[var(--foreground)]/90 transition-colors border border-[var(--border)]/40"
                                    >
                                        Вход
                                    </Link>
                                </div>
                            )}
                        </div>
                    </section>

                    <section className="px-6 py-8">
                        <div className="max-w-[1200px] mx-auto border-t border-[var(--border)]/80 pt-8 text-center">
                            <p className="text-xs text-[var(--text-muted)] uppercase tracking-widest">
                                Phantom · Solana · {REQUIRED_AMOUNT}+ токенов
                            </p>
                        </div>
                    </section>

                    <section className="px-6 pb-16 lg:pb-24">
                        <div className="max-w-[1200px] mx-auto border-t border-[var(--border)]/80 pt-16 lg:pt-24">
                            <h2 className="font-display text-2xl lg:text-3xl font-semibold text-[var(--foreground)] text-center mb-12">
                                Что внутри
                            </h2>
                            <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
                                <div className="p-6 lg:p-8 rounded-2xl bg-[var(--bg-card)]/60 backdrop-blur-xl border border-[var(--border)]/60 hover:border-[var(--border-hover)] transition-colors">
                                    <div className="w-12 h-12 rounded-xl bg-[var(--bg-elevated)] flex items-center justify-center mb-4">
                                        <svg className="w-6 h-6 text-[var(--foreground)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/></svg>
                                    </div>
                                    <h3 className="font-display text-lg font-semibold text-[var(--foreground)] mb-2">Ранние релизы</h3>
                                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                                        Неизданные треки и эксклюзивные материалы в одном месте.
                                    </p>
                                </div>
                                <div className="p-6 lg:p-8 rounded-2xl bg-[var(--bg-card)]/60 backdrop-blur-xl border border-[var(--border)]/60 hover:border-[var(--border-hover)] transition-colors">
                                    <div className="w-12 h-12 rounded-xl bg-[var(--bg-elevated)] flex items-center justify-center mb-4">
                                        <svg className="w-6 h-6 text-[var(--foreground)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
                                    </div>
                                    <h3 className="font-display text-lg font-semibold text-[var(--foreground)] mb-2">Избранное</h3>
                                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                                        Сохраняйте любимые треки и файлы в удобном списке.
                                    </p>
                                </div>
                                <div className="p-6 lg:p-8 rounded-2xl bg-[var(--bg-card)]/60 backdrop-blur-xl border border-[var(--border)]/60 hover:border-[var(--border-hover)] transition-colors">
                                    <div className="w-12 h-12 rounded-xl bg-[var(--bg-elevated)] flex items-center justify-center mb-4">
                                        <svg className="w-6 h-6 text-[var(--foreground)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                                    </div>
                                    <h3 className="font-display text-lg font-semibold text-[var(--foreground)] mb-2">Безопасно</h3>
                                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                                        Phantom — самокастодиальный кошелёк. Вы контролируете свои средства.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section id="about" className="px-6 pb-16 lg:pb-24">
                        <div className="max-w-[1200px] mx-auto border-t border-[var(--border)]/80 pt-16 lg:pt-24">
                            <h2 className="font-display text-2xl lg:text-3xl font-semibold text-[var(--foreground)] text-center mb-12">
                                О проекте
                            </h2>
                            <div className="max-w-[720px] mx-auto space-y-6 text-center">
                                <p className="text-[var(--text-secondary)] leading-relaxed">
                                    <strong className="text-[var(--foreground)]">VIRAL</strong> — это эксклюзивная платформа для держателей токенов артиста. Проект объединяет технологию блокчейна Solana и закрытый контент: владея токенами, вы получаете прямой доступ к материалам, которые недоступны широкой публике.
                                </p>
                                <p className="text-[var(--text-secondary)] leading-relaxed">
                                    Как это работает: подключите кошелёк Phantom с минимум 1000 токенами — и откроется доступ к разделу с неизданными треками, эксклюзивными видео, билетами и материалами сообщества. Всё хранится безопасно, вы полностью контролируете свои активы.
                                </p>
                                <p className="text-[var(--text-secondary)] leading-relaxed">
                                    Поддерживая артиста через владение токенами, вы не только получаете привилегированный контент, но и становитесь частью закрытого сообщества фанатов с ранним доступом к релизам и прямым контактом с командой проекта.
                                </p>
                            </div>
                        </div>
                    </section>

                    <section id="ambassadors" className="px-6 pb-16 lg:pb-24">
                        <div className="max-w-[1200px] mx-auto border-t border-[var(--border)]/80 pt-16 lg:pt-24">
                            <h2 className="font-display text-2xl lg:text-3xl font-semibold text-[var(--foreground)] text-center mb-12">
                                Амбассадоры
                            </h2>
                            <div className="max-w-[640px] mx-auto text-center">
                                <p className="text-[var(--text-secondary)] leading-relaxed mb-6">
                                    Наши амбассадоры — активные участники сообщества, которые помогают развивать проект и делиться контентом с фанатами.
                                </p>
                                <div className="flex flex-wrap justify-center gap-4">
                                    <div className="w-16 h-16 rounded-full bg-[var(--bg-elevated)] border-2 border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] text-sm font-medium">
                                        ?
                                    </div>
                                    <div className="w-16 h-16 rounded-full bg-[var(--bg-elevated)] border-2 border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] text-sm font-medium">
                                        ?
                                    </div>
                                    <div className="w-16 h-16 rounded-full bg-[var(--bg-elevated)] border-2 border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] text-sm font-medium">
                                        ?
                                    </div>
                                </div>
                                <p className="text-sm text-[var(--text-muted)] mt-6">
                                    Хотите стать амбассадором? Свяжитесь с нами.
                                </p>
                            </div>
                        </div>
                    </section>

                    <section className="px-6 pb-16 lg:pb-20">
                        <div className="max-w-[1200px] mx-auto border-t border-[var(--border)]/80 pt-16 lg:pt-20 text-center">
                            <h2 className="font-display text-xl lg:text-2xl font-semibold text-[var(--foreground)] mb-4">
                                Готовы начать?
                            </h2>
                            <p className="text-[var(--text-secondary)] mb-8 max-w-md mx-auto">
                                Подключите Phantom и получите доступ к эксклюзивному контенту.
                            </p>
                            {!connected && (
                                <div className="flex justify-center">
                                    <WalletMultiButton className="!rounded-xl !px-8 !py-4 !font-semibold" />
                                </div>
                            )}
                        </div>
                    </section>

                    <footer className="pb-16 lg:pb-20 bg-[linear-gradient(to_bottom,transparent_0%,rgba(0,0,0,0.4)_12%,rgba(0,0,0,0.6)_100%)] backdrop-blur-md">
                        <div className="max-w-[1200px] mx-auto px-6 border-t border-[var(--border)]/80 pt-16 lg:pt-20">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12">
                                <div>
                                    <h3 className="font-display text-sm font-semibold text-[var(--foreground)] uppercase tracking-wider mb-4">О проекте</h3>
                                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                                        VIRAL — платформа для держателей токенов на Solana. Подключите Phantom с 1000+ токенами и получите доступ к неизданным трекам, эксклюзивным материалам и закрытому сообществу.
                                    </p>
                                </div>
                                <div>
                                    <h3 className="font-display text-sm font-semibold text-[var(--foreground)] uppercase tracking-wider mb-4">Контакты</h3>
                                    <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
                                        <li><a href="mailto:info@nextuplabel.online" className="hover:text-[var(--foreground)] transition-colors">info@nextuplabel.online</a></li>
                                    </ul>
                                </div>
                                <div>
                                    <h3 className="font-display text-sm font-semibold text-[var(--foreground)] uppercase tracking-wider mb-4">Ссылки</h3>
                                    <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
                                        <li><a href="#about" className="hover:text-[var(--foreground)] transition-colors">О проекте</a></li>
                                        <li><a href="#ambassadors" className="hover:text-[var(--foreground)] transition-colors">Амбассадоры</a></li>
                                        <li><a href="https://phantom.app" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--foreground)] transition-colors">Скачать Phantom</a></li>
                                    </ul>
                                </div>
                                <div>
                                    <h3 className="font-display text-sm font-semibold text-[var(--foreground)] uppercase tracking-wider mb-4">Технологии</h3>
                                    <p className="text-sm text-[var(--text-muted)]">
                                        Phantom · Solana · {REQUIRED_AMOUNT}+ токенов
                                    </p>
                                </div>
                            </div>
                            <div className="mt-12 pt-8 border-t border-[var(--border)]/80 flex flex-col sm:flex-row items-center justify-between gap-4">
                                <p className="text-xs text-[var(--text-muted)]">
                                    © {new Date().getFullYear()} VIRAL. Все права защищены.
                                </p>
                                {typeof window !== 'undefined' && /localhost|127\.0\.0\.1/.test(window.location.hostname) && (
                                    <p className="text-xs text-[var(--text-muted)]/70">
                                        Локалка: <code className="px-1 py-0.5 bg-[var(--bg-secondary)] rounded">?dev_access=1</code>
                                    </p>
                                )}
                            </div>
                        </div>
                    </footer>
                </main>
            )}
        </div>
    );
}
