'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

interface Stats {
  totalSpent: number;
  queriesCount: number;
  transactions: Array<{
    timestamp: number;
    type: string;
    amount: string;
  }>;
}

export function Dashboard() {
  const { connected } = useWallet();
  const [stats, setStats] = useState<Stats>({
    totalSpent: 0,
    queriesCount: 0,
    transactions: [],
  });

  // Track spending from localStorage
  useEffect(() => {
    if (!connected) return;

    const loadStats = () => {
      const stored = localStorage.getItem('x402_stats');
      if (stored) {
        setStats(JSON.parse(stored));
      }
    };

    loadStats();
    
    // Listen for storage events (when other tabs update)
    window.addEventListener('storage', loadStats);
    
    return () => window.removeEventListener('storage', loadStats);
  }, [connected]);

  if (!connected) return null;

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-6">Dashboard</h2>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-700/50 rounded-lg p-4">
            <p className="text-sm text-gray-400 mb-1">Total Spent</p>
            <p className="text-2xl font-bold text-solana-green">
              ${stats.totalSpent.toFixed(3)}
            </p>
          </div>
          <div className="bg-gray-700/50 rounded-lg p-4">
            <p className="text-sm text-gray-400 mb-1">Queries</p>
            <p className="text-2xl font-bold text-solana-purple">
              {stats.queriesCount}
            </p>
          </div>
        </div>

        <div className="bg-gray-700/50 rounded-lg p-4">
          <p className="text-sm text-gray-400 mb-1">Average Cost</p>
          <p className="text-xl font-bold">
            ${stats.queriesCount > 0 
              ? (stats.totalSpent / stats.queriesCount).toFixed(3) 
              : '0.000'}
          </p>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-xl font-bold mb-4">Recent Activity</h3>
        
        {stats.transactions.length === 0 ? (
          <p className="text-gray-400 text-center py-4">No queries yet</p>
        ) : (
          <div className="space-y-2">
            {stats.transactions.slice(0, 5).map((tx, idx) => (
              <div 
                key={idx} 
                className="bg-gray-700/50 rounded p-3 flex justify-between items-center"
              >
                <div>
                  <p className="text-sm font-semibold">{tx.type}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(tx.timestamp).toLocaleString()}
                  </p>
                </div>
                <span className="text-sm font-bold text-solana-green">
                  {tx.amount}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="bg-blue-900/30 border border-blue-600/50 rounded-lg p-4">
        <h4 className="font-semibold mb-2">💡 How it works</h4>
        <ul className="text-sm space-y-1 text-gray-300">
          <li>• Select a query type</li>
          <li>• Enter the required address/token</li>
          <li>• Approve payment in Phantom</li>
          <li>• Get instant results</li>
        </ul>
      </div>
    </div>
  );
}
