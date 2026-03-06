'use client';

import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { WalletConnectWalletAdapter } from '@solana/wallet-adapter-walletconnect';
import { useMemo } from 'react';

// Эти стили нужны для красивой кнопки
import '@solana/wallet-adapter-react-ui/styles.css';

const WALLETCONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'e899c82be21d4acca2c8aec45e893598';

export function Providers({ children }: { children: React.ReactNode }) {
  const endpoint = useMemo(() => 'https://mainnet.helius-rpc.com/?api-key=2054c8a4-ab5b-4b18-acc4-1d581439ff25', []);

  const wallets = useMemo(() => {
    const phantom = new PhantomWalletAdapter();
    const wc = new WalletConnectWalletAdapter({
      network: 'mainnet-beta',
      options: {
        relayUrl: 'wss://relay.walletconnect.com',
        projectId: WALLETCONNECT_PROJECT_ID,
        metadata: {
          name: 'NextUp Label',
          description: 'Эксклюзивный контент для держателей токенов',
          url: typeof window !== 'undefined' ? window.location.origin : 'https://nextuplabel.online',
          icons: ['https://nextuplabel.online/favicon.ico'],
        },
      },
    });
    return [phantom, wc];
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}