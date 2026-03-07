'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { BrowserSDK, AddressType } from '@phantom/browser-sdk';
import { PublicKey } from '@solana/web3.js';

const PHANTOM_APP_ID = process.env.NEXT_PUBLIC_PHANTOM_APP_ID || '';

interface PhantomMobileContextValue {
  sdk: BrowserSDK | null;
  connected: boolean;
  publicKey: PublicKey | null;
  connectPhantom: () => Promise<void>;
  disconnect: () => Promise<void>;
  isMobile: boolean;
  hasDeeplinkSupport: boolean;
}

const PhantomMobileContext = createContext<PhantomMobileContextValue>({
  sdk: null,
  connected: false,
  publicKey: null,
  connectPhantom: async () => {},
  disconnect: async () => {},
  isMobile: false,
  hasDeeplinkSupport: false,
});

export function PhantomMobileProvider({ children }: { children: React.ReactNode }) {
  const [sdk, setSdk] = useState<BrowserSDK | null>(null);
  const [connected, setConnected] = useState(false);
  const [publicKey, setPublicKey] = useState<PublicKey | null>(null);
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

  useEffect(() => {
    if (typeof window === 'undefined' || !PHANTOM_APP_ID) return;

    const ua = navigator.userAgent;
    const isMobileOrTablet = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) || window.innerWidth < 768;
    const providers = isMobileOrTablet ? (['deeplink'] as const) : (['injected'] as const);

    const instance = new BrowserSDK({
      providers,
      addressTypes: [AddressType.solana],
      appId: PHANTOM_APP_ID,
      authOptions: {
        redirectUrl: `${window.location.origin}/auth/callback`,
      },
      autoConnect: true,
    });

    const onConnect = (data: { addresses?: Array<{ address: string; addressType?: string }> }) => {
      setConnected(true);
      const solanaAddr = data.addresses?.find((a) => (a.addressType || (a as { type?: string }).type) === 'solana');
      if (solanaAddr?.address) {
        setPublicKey(new PublicKey(solanaAddr.address));
      }
    };

    const onDisconnect = () => {
      setConnected(false);
      setPublicKey(null);
    };

    instance.on('connect', onConnect);
    instance.on('disconnect', onDisconnect);

    setSdk(instance);

    instance.autoConnect().then(() => {
      if (instance.isConnected()) {
        const addrs = instance.getAddresses();
        const solana = addrs?.find((a: { addressType?: string; type?: string }) => a.addressType === 'solana' || a.type === 'solana');
        if (solana && 'address' in solana) {
          setPublicKey(new PublicKey((solana as { address: string }).address));
          setConnected(true);
        }
      }
    }).catch(() => {});

    return () => {
      instance.off('connect', onConnect);
      instance.off('disconnect', onDisconnect);
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
        disconnect,
        isMobile,
        hasDeeplinkSupport,
      }}
    >
      {children}
    </PhantomMobileContext.Provider>
  );
}

export function usePhantomMobile() {
  return useContext(PhantomMobileContext);
}
