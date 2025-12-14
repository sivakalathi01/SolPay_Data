'use client';

import { WalletConnect } from '@/components/WalletConnect';
import { OracleQueries } from '@/components/OracleQueries';
import { Dashboard } from '@/components/Dashboard';
import { useWallet } from '@solana/wallet-adapter-react';

export default function Home() {
  const { connected } = useWallet();

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-solana-purple to-solana-green bg-clip-text text-transparent">
            🔮 SolPay Data Oracle
          </h1>
          <p className="text-xl text-gray-300">
            AI-Powered Blockchain Analytics with x402 Micropayments
          </p>
          <p className="text-sm text-gray-400 mt-2">
            Solana Devnet • Ethereum Sepolia • Pay-per-Query
          </p>
        </div>

        {/* Wallet Connection */}
        <div className="flex justify-center mb-8">
          <WalletConnect />
        </div>

        {/* Main Content */}
        {connected ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Oracle Queries - 2 columns */}
            <div className="lg:col-span-2">
              <OracleQueries />
            </div>
            
            {/* Dashboard - 1 column */}
            <div className="lg:col-span-1">
              <Dashboard />
            </div>
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="bg-gray-800 rounded-lg p-12 max-w-2xl mx-auto">
              <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
              <p className="text-gray-400 mb-6">
                Connect your Phantom wallet in <span className="text-solana-green font-semibold">Testnet mode</span> to access:
              </p>
              <ul className="text-left space-y-2 mb-8 max-w-md mx-auto">
                <li className="flex items-center">
                  <span className="text-solana-purple mr-2">✓</span>
                  Solana Devnet tokens & custom USDC
                </li>
                <li className="flex items-center">
                  <span className="text-solana-purple mr-2">✓</span>
                  Ethereum Sepolia wallet & ETH balance
                </li>
                <li className="flex items-center">
                  <span className="text-solana-purple mr-2">✓</span>
                  Pay-per-query oracle access ($0.005 - $0.20)
                </li>
                <li className="flex items-center">
                  <span className="text-solana-purple mr-2">✓</span>
                  Real-time blockchain analytics
                </li>
              </ul>
              <div className="bg-yellow-900/30 border border-yellow-600/50 rounded p-4">
                <p className="text-sm text-yellow-200">
                  💡 <strong>Enable Testnet Mode:</strong> Settings → Developer Settings → Testnet Mode
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-12 text-gray-500 text-sm">
          <p>Powered by Solana x402 Protocol • Built for AI Agents & Human Explorers</p>
        </div>
      </div>
    </main>
  );
}
