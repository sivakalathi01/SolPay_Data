'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useX402Query, PaymentModal } from './PaymentModal';
import { ethers } from 'ethers';

interface QueryResult {
  endpoint: string;
  data: any;
  cost: string;
  timestamp: number;
}

export function OracleQueries() {
  const { publicKey } = useWallet();
  const { executeQuery, loading, invoice, handleApprove, handleCancel } = useX402Query();
  const [results, setResults] = useState<QueryResult[]>([]);
  const [selectedEndpoint, setSelectedEndpoint] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [ethAddress, setEthAddress] = useState<string>('');

  // Get Ethereum address from Phantom
  useEffect(() => {
    const getEthAddress = async () => {
      if (typeof window !== 'undefined' && (window as any).phantom?.ethereum) {
        try {
          const phantomProvider = new ethers.BrowserProvider((window as any).phantom.ethereum);
          const accounts = await phantomProvider.send('eth_requestAccounts', []);
          if (accounts && accounts.length > 0) {
            setEthAddress(accounts[0]);
          }
        } catch (err) {
          console.log('Ethereum not available');
        }
      }
    };
    getEthAddress();
  }, []);

  const endpoints = [
    { 
      id: 'price', 
      name: '💰 Token Price', 
      path: '/api/v1/price',
      cost: '$0.01',
      placeholder: 'SOL, USDC, or token address',
      description: 'Get real-time token price data'
    },
    { 
      id: 'wallet', 
      name: '👛 Wallet Analysis', 
      path: '/api/v1/wallet',
      cost: '$0.005',
      placeholder: 'Enter wallet address',
      description: 'Analyze wallet holdings and activity'
    },
    { 
      id: 'holders', 
      name: '👥 Token Holders', 
      path: '/api/v1/holders',
      cost: '$0.05',
      placeholder: 'SOL, USDC, or token address',
      description: 'Get top token holders list'
    },
    { 
      id: 'transactions', 
      name: '📜 Transaction History', 
      path: '/api/v1/transactions',
      cost: '$0.10',
      placeholder: 'Enter wallet address',
      description: 'Fetch recent transaction history'
    },
    { 
      id: 'analytics', 
      name: '📊 Token Analytics', 
      path: '/api/v1/analytics',
      cost: '$0.20',
      placeholder: 'SOL, USDC, or token address',
      description: 'Comprehensive token analytics'
    },
    { 
      id: 'cross-chain', 
      name: '🌉 Cross-Chain Balance', 
      path: '/api/v1/cross-chain/balance',
      cost: '$0.02',
      placeholder: 'Uses your connected wallets',
      description: 'Check balances across Solana + Ethereum'
    },
  ];

  // Helper to convert friendly token names to addresses
  const resolveTokenAddress = (input: string): string => {
    const tokens: { [key: string]: string } = {
      'sol': 'So11111111111111111111111111111111111111112',
      'usdc': process.env.NEXT_PUBLIC_USDC_MINT || 'Chkg2bcUdGuYjLKezAxH47f9dXmtDyJvmWgECr6tbDLj',
      'devnet-usdc': 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr',
    };
    
    const lowercaseInput = input.toLowerCase().trim();
    return tokens[lowercaseInput] || input;
  };

  const handleQuery = async (endpoint: any) => {
    // For cross-chain, don't need input - use connected wallets
    if (endpoint.id !== 'cross-chain' && !inputValue.trim()) {
      alert('Please enter a value');
      return;
    }

    try {
      // Build the complete endpoint URL with the input value
      let fullEndpoint = endpoint.path;
      let queryInput = inputValue;
      
      // Convert friendly token names to addresses for token-related queries
      if (endpoint.id === 'price' || endpoint.id === 'holders' || endpoint.id === 'analytics') {
        queryInput = resolveTokenAddress(inputValue);
        fullEndpoint = `${endpoint.path}/${queryInput}`;
      } else if (endpoint.id === 'wallet' || endpoint.id === 'transactions') {
        fullEndpoint = `${endpoint.path}/${queryInput}`;
      } else if (endpoint.id === 'cross-chain') {
        // Use both connected wallet addresses
        if (!publicKey || !ethAddress) {
          alert('Please connect both Solana and Ethereum wallets');
          return;
        }
        fullEndpoint = `${endpoint.path}?solana=${publicKey.toBase58()}&ethereum=${ethAddress}`;
      }

      const data = await executeQuery(fullEndpoint);
      
      // Update stats in localStorage
      const costValue = parseFloat(endpoint.cost.replace('$', ''));
      const stored = localStorage.getItem('x402_stats');
      const stats = stored ? JSON.parse(stored) : { totalSpent: 0, queriesCount: 0, transactions: [] };
      
      stats.totalSpent += costValue;
      stats.queriesCount += 1;
      stats.transactions.unshift({
        timestamp: Date.now(),
        type: endpoint.name,
        amount: endpoint.cost,
      });
      stats.transactions = stats.transactions.slice(0, 10); // Keep last 10
      
      localStorage.setItem('x402_stats', JSON.stringify(stats));
      
      // Trigger storage event for Dashboard
      window.dispatchEvent(new Event('storage'));
      
      setResults(prev => [{
        endpoint: endpoint.name,
        data,
        cost: endpoint.cost,
        timestamp: Date.now(),
      }, ...prev].slice(0, 5)); // Keep last 5 results
      
      setInputValue('');
    } catch (error: any) {
      alert(`Query failed: ${error.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Payment Modal */}
      {invoice && (
        <PaymentModal 
          invoice={invoice} 
          onApprove={handleApprove} 
          onCancel={handleCancel} 
        />
      )}

      {/* Query Interface */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-6">Oracle Queries</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {endpoints.map((endpoint) => (
            <div
              key={endpoint.id}
              className="bg-gray-700/50 rounded-lg p-4 hover:bg-gray-700 transition-colors cursor-pointer border-2 border-transparent hover:border-solana-purple"
              onClick={() => setSelectedEndpoint(endpoint.id)}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-lg">{endpoint.name}</h3>
                <span className="text-xs bg-solana-green/20 text-solana-green px-2 py-1 rounded">
                  {endpoint.cost}
                </span>
              </div>
              <p className="text-sm text-gray-400">{endpoint.description}</p>
            </div>
          ))}
        </div>

        {/* Query Input */}
        {selectedEndpoint && (
          <div className="mt-6 bg-gray-700 rounded-lg p-4">
            <h3 className="font-semibold mb-3">
              {endpoints.find(e => e.id === selectedEndpoint)?.name}
            </h3>
            <div className="flex gap-3">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={endpoints.find(e => e.id === selectedEndpoint)?.placeholder}
                className="flex-1 bg-gray-800 border border-gray-600 rounded px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-solana-purple"
                disabled={loading}
              />
              <button
                onClick={() => handleQuery(endpoints.find(e => e.id === selectedEndpoint)!)}
                disabled={loading || !inputValue.trim()}
                className="bg-gradient-to-r from-solana-purple to-solana-green text-white font-semibold px-6 py-2 rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : 'Query'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-4">Recent Results</h2>
          <div className="space-y-4">
            {results.map((result, idx) => (
              <div key={idx} className="bg-gray-700/50 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold">{result.endpoint}</h3>
                  <div className="text-right">
                    <span className="text-xs bg-solana-green/20 text-solana-green px-2 py-1 rounded">
                      {result.cost}
                    </span>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(result.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                <pre className="text-xs bg-gray-900 rounded p-3 overflow-x-auto">
                  {JSON.stringify(result.data, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
