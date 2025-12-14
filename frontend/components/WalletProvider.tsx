'use client';

import React, { FC, ReactNode, useMemo } from 'react';
import { ConnectionProvider, WalletProvider as SolanaWalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';

// Import styles
require('@solana/wallet-adapter-react-ui/styles.css');

export const WalletProvider: FC<{ children: ReactNode }> = ({ children }) => {
  // Use devnet endpoint - but don't enforce it on wallet
  const endpoint = useMemo(() => 'https://api.devnet.solana.com', []);

  // Configure wallets without network restriction
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={wallets} autoConnect={false} onError={(error) => {
        // Suppress network mismatch errors
        if (error.message?.includes('testnet') || error.message?.includes('network')) {
          console.warn('Network warning (can be ignored):', error.message);
        } else {
          console.error('Wallet error:', error);
        }
      }}>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
};
