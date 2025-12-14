'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useEffect, useState } from 'react';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getAccount, getAssociatedTokenAddress } from '@solana/spl-token';
import { ethers } from 'ethers';

export function WalletConnect() {
  const { publicKey, connected } = useWallet();
  const [mounted, setMounted] = useState(false);
  const [solBalance, setSolBalance] = useState<number | null>(null);
  const [customUsdcBalance, setCustomUsdcBalance] = useState<number | null>(null);
  const [devnetUsdcBalance, setDevnetUsdcBalance] = useState<number | null>(null);
  const [ethAddress, setEthAddress] = useState<string | null>(null);
  const [ethBalance, setEthBalance] = useState<string | null>(null);
  const [ethNetwork, setEthNetwork] = useState<string>('Unknown');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !connected || !publicKey) {
      setSolBalance(null);
      setCustomUsdcBalance(null);
      setDevnetUsdcBalance(null);
      setEthAddress(null);
      setEthBalance(null);
      return;
    }

    const loadBalances = async () => {
      try {
        // Solana balances
        const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
        
        // SOL balance
        const balance = await connection.getBalance(publicKey);
        setSolBalance(balance / LAMPORTS_PER_SOL);

        // Custom USDC balance
        try {
          const customUsdcMint = new PublicKey(process.env.NEXT_PUBLIC_USDC_MINT!);
          const customTokenAccount = await getAssociatedTokenAddress(customUsdcMint, publicKey);
          try {
            const account = await getAccount(connection, customTokenAccount);
            setCustomUsdcBalance(Number(account.amount) / 1_000_000);
          } catch {
            setCustomUsdcBalance(0);
          }
        } catch (err) {
          console.error('Error loading custom USDC:', err);
          setCustomUsdcBalance(0);
        }

        // Devnet USDC balance
        try {
          const devnetUsdcMint = new PublicKey('Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr');
          const devnetTokenAccount = await getAssociatedTokenAddress(devnetUsdcMint, publicKey);
          try {
            const account = await getAccount(connection, devnetTokenAccount);
            setDevnetUsdcBalance(Number(account.amount) / 1_000_000);
          } catch {
            setDevnetUsdcBalance(0);
          }
        } catch (err) {
          console.error('Error loading devnet USDC:', err);
          setDevnetUsdcBalance(0);
        }

        // Ethereum Sepolia (via backend to avoid CORS)
        if (typeof window !== 'undefined' && (window as any).phantom?.ethereum) {
          try {
            // Get address from Phantom
            const phantomProvider = new ethers.BrowserProvider((window as any).phantom.ethereum);
            const accounts = await phantomProvider.send('eth_requestAccounts', []);
            
            if (accounts && accounts.length > 0) {
              const ethAddr = accounts[0];
              console.log('🔍 Phantom returned Ethereum address:', ethAddr);
              setEthAddress(ethAddr);
              setEthNetwork('Sepolia');
              
              // Get balance via backend (avoids CORS issues)
              const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3402'}/api/v1/eth-balance/${ethAddr}`);
              const data = await response.json();
              
              if (data.success) {
                console.log('💰 Sepolia balance for', ethAddr, ':', data.balance_eth, 'ETH');
                console.log('🔗 Check on Sepolia explorer: https://sepolia.etherscan.io/address/' + ethAddr);
                setEthBalance(data.balance_eth);
              } else {
                console.error('Failed to get ETH balance:', data.error);
                setEthBalance('0');
              }
            }
          } catch (err) {
            console.log('Ethereum not available:', err);
          }
        }
      } catch (error) {
        console.error('Error loading balances:', error);
      }
    };

    loadBalances();
  }, [mounted, connected, publicKey]);

  if (!mounted) {
    return (
      <div className="space-y-4">
        <div className="flex justify-center">
          <div className="h-12 w-40 bg-gray-700 rounded-lg animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <WalletMultiButton />
      </div>

      {connected && (
        <div className="bg-gray-800 rounded-lg p-6 max-w-2xl mx-auto">
          <h3 className="text-lg font-semibold mb-4 text-center">Wallet Information</h3>
          
          <div className="space-y-3">
            {/* Solana */}
            <div className="bg-gray-700/50 rounded p-3">
              <p className="text-xs text-gray-400 mb-1">Solana Devnet</p>
              <p className="text-sm font-mono text-solana-purple break-all">{publicKey?.toString()}</p>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <span className="text-sm">SOL: <strong>{solBalance !== null ? solBalance.toFixed(4) : 'Loading...'}</strong></span>
                <span className="text-sm">Custom USDC: <strong>{customUsdcBalance !== null ? customUsdcBalance.toFixed(2) : 'Loading...'}</strong></span>
                <span className="text-sm col-span-2">Devnet USDC: <strong>{devnetUsdcBalance !== null ? devnetUsdcBalance.toFixed(2) : 'Loading...'}</strong></span>
              </div>
              {customUsdcBalance === 0 && (
                <div className="mt-2 text-xs bg-yellow-900/30 border border-yellow-600/50 rounded p-2">
                  <p className="text-yellow-200">
                    ⚠️ No custom USDC tokens. Mint tokens: <code className="bg-gray-900 px-1 rounded">npx ts-node mint-usdc.ts YOUR_WALLET 100</code>
                  </p>
                </div>
              )}
            </div>

            {/* Ethereum Sepolia */}
            {ethAddress && (
              <div className="bg-gray-700/50 rounded p-3">
                <p className="text-xs text-gray-400 mb-1">Ethereum ({ethNetwork})</p>
                <p className="text-sm font-mono text-solana-green break-all">{ethAddress}</p>
                <div className="mt-2">
                  <span className="text-sm">ETH: <strong>{parseFloat(ethBalance || '0').toFixed(4)}</strong></span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
