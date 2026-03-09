'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useState, useEffect, useRef } from 'react';
import { usePhantomMobile } from '@/lib/phantom-mobile';

export function useExclusiveAccess() {
  const { publicKey: adapterPublicKey, connected: adapterConnected } = useWallet();
  const { connected: phantomConnected, publicKey: phantomPublicKey, disconnect: phantomDisconnect, hasDeeplinkSupport, isPhantomInAppBrowser } = usePhantomMobile();

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
    } catch {
      if (mountedRef.current) {
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

  return {
    connected,
    publicKey,
    publicKeyStr,
    hasAccess,
    loading,
    isBlocked,
    tokenBalance,
    usePhantomMobileConnection,
    phantomDisconnect,
    isPhantomInAppBrowser,
  };
}
