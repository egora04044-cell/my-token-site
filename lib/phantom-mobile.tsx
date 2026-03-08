'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { BrowserSDK, AddressType } from '@phantom/browser-sdk';
import { PublicKey } from '@solana/web3.js';

const PHANTOM_APP_ID = process.env.NEXT_PUBLIC_PHANTOM_APP_ID || '';

interface PhantomMobileContextValue {
  sdk: BrowserSDK | null;
  connected: boolean;
  publicKey: PublicKey | null;
  connectPhantom: () => Promise<void>;
  connectWithGoogle: () => Promise<void>;
  connectWithApple: () => Promise<void>;
  disconnect: () => Promise<void>;
  isMobile: boolean;
  hasDeeplinkSupport: boolean;
  /** На мобильном + window.phantom = открыто в браузере Phantom, не в Safari/Chrome */
  isPhantomInAppBrowser: boolean;
}

const PhantomMobileContext = createContext<PhantomMobileContextValue>({
  sdk: null,
  connected: false,
  publicKey: null,
  connectPhantom: async () => {},
  connectWithGoogle: async () => {},
  connectWithApple: async () => {},
  disconnect: async () => {},
  isMobile: false,
  hasDeeplinkSupport: false,
  isPhantomInAppBrowser: false,
});

export function PhantomMobileProvider({ children }: { children: React.ReactNode }) {
  const [sdk, setSdk] = useState<BrowserSDK | null>(null);
  const [connected, setConnected] = useState(false);
  const [publicKey, setPublicKey] = useState<PublicKey | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isPhantomInAppBrowser, setIsPhantomInAppBrowser] = useState(false);
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  useEffect(() => {
    const check = () => {
      const ua = navigator.userAgent;
      const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) || window.innerWidth < 768;
      setIsMobile(mobile);
      // На мобильном window.phantom = браузер Phantom (нет расширений на телефоне)
      setIsPhantomInAppBrowser(mobile && Boolean((window as unknown as { phantom?: { solana?: unknown } }).phantom?.solana));
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !PHANTOM_APP_ID) return;

    const ua = navigator.userAgent;
    const isMobileOrTablet = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) || window.innerWidth < 768;
    const inPhantomBrowser = isMobileOrTablet && Boolean((window as unknown as { phantom?: { solana?: unknown } }).phantom?.solana);

    if (inPhantomBrowser) {
      return;
    }

    let instance: BrowserSDK | null = null;
    const onConnect = (data: { addresses?: Array<{ address: string; addressType?: string }> }) => {
      setConnected(true);
      const solanaAddr = data.addresses?.find((a) => (a.addressType || (a as { type?: string }).type) === 'solana');
      if (solanaAddr?.address) {
        try {
          setPublicKey(new PublicKey(solanaAddr.address));
        } catch {
          // ignore invalid address
        }
      }
    };
    const onDisconnect = () => {
      setConnected(false);
      setPublicKey(null);
    };

    try {
      const providers = isMobileOrTablet ? (['deeplink', 'google', 'apple'] as const) : (['injected'] as const);

      instance = new BrowserSDK({
        providers,
        addressTypes: [AddressType.solana],
        appId: PHANTOM_APP_ID,
        authOptions: {
          redirectUrl: `${window.location.origin}/auth/callback`,
        },
        autoConnect: true,
      });

      instance.on('connect', onConnect);
      instance.on('disconnect', onDisconnect);

      if (mountedRef.current) setSdk(instance);

      const fromAuth = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('phantom_connected') === '1';
      if (fromAuth && typeof window !== 'undefined') {
        window.history.replaceState({}, '', '/');
      }

      const tryRestore = () => {
        if (!mountedRef.current || !instance) return;
        if (instance.isConnected()) {
          const addrs = instance.getAddresses();
          const solana = addrs?.find((a: { addressType?: string; type?: string }) => a.addressType === 'solana' || a.type === 'solana');
          if (solana && 'address' in solana) {
            try {
              setPublicKey(new PublicKey((solana as { address: string }).address));
              setConnected(true);
            } catch {
              // ignore
            }
          }
        }
      };

      instance.autoConnect().then(() => {
        tryRestore();
        if (fromAuth && !instance?.isConnected()) {
          setTimeout(() => instance?.autoConnect().then(tryRestore).catch(() => {}), 1500);
        }
      }).catch(() => {});
    } catch (err) {
      console.error('Phantom SDK init error:', err);
    }

    return () => {
      if (instance) {
        instance.off('connect', onConnect);
        instance.off('disconnect', onDisconnect);
      }
    };
  }, []);

  const connectPhantom = useCallback(async () => {
    if (!sdk || !PHANTOM_APP_ID) return;
    try {
      await sdk.connect({ provider: 'deeplink' });
    } catch {
      // Redirect happened - user will return via callback
    }
  }, [sdk]);

  const connectWithGoogle = useCallback(async () => {
    if (!sdk || !PHANTOM_APP_ID) return;
    try {
      await sdk.connect({ provider: 'google' });
    } catch (e) {
      console.error('Google connect error:', e);
    }
  }, [sdk]);

  const connectWithApple = useCallback(async () => {
    if (!sdk || !PHANTOM_APP_ID) return;
    try {
      await sdk.connect({ provider: 'apple' });
    } catch (e) {
      console.error('Apple connect error:', e);
    }
  }, [sdk]);

  const disconnect = useCallback(async () => {
    if (!sdk) return;
    await sdk.disconnect();
    setConnected(false);
    setPublicKey(null);
  }, [sdk]);

  const hasDeeplinkSupport = Boolean(PHANTOM_APP_ID && isMobile);

  return (
    <PhantomMobileContext.Provider
      value={{
        sdk,
        connected,
        publicKey,
        connectPhantom,
        connectWithGoogle,
        connectWithApple,
        disconnect,
        isMobile,
        hasDeeplinkSupport,
        isPhantomInAppBrowser,
      }}
    >
      {children}
    </PhantomMobileContext.Provider>
  );
}

export function usePhantomMobile() {
  return useContext(PhantomMobileContext);
}
