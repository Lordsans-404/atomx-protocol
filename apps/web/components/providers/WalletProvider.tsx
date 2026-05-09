'use client';

import React, { FC, ReactNode, useMemo, useCallback, useState, useEffect } from 'react';
import { ConnectionProvider, WalletProvider as SolanaWalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork, WalletError } from '@solana/wallet-adapter-base';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';
import dynamic from 'next/dynamic';

import '@solana/wallet-adapter-react-ui/styles.css';

interface Props {
  children: ReactNode;
}

// Lazy load WalletModalProvider to avoid blocking initial render
const WalletModalProviderDynamic = dynamic(
  () => import('@solana/wallet-adapter-react-ui').then(mod => mod.WalletModalProvider),
  { ssr: false, loading: () => null }
);

export const WalletProvider: FC<Props> = ({ children }) => {
  const network = WalletAdapterNetwork.Devnet;

  // Tracks whether the component has mounted on the client.
  // autoConnect must only be true client-side to prevent Next.js hydration mismatch
  // (window.solana does not exist during server-side render).
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const endpoint = useMemo(
    () => process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl(network),
    [network]
  );

  const wallets = useMemo(() => [], []);

  const onError = useCallback((error: WalletError) => {
    // Silently ignore user-rejected connection attempts on auto-connect
    if (error.name === 'WalletConnectionError' && error.message === 'Connection rejected') {
      return;
    }
    console.error(error);
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={wallets} autoConnect={mounted} onError={onError}>
        <WalletModalProviderDynamic>{children}</WalletModalProviderDynamic>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
};