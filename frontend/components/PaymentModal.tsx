'use client';

import { useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import { getAssociatedTokenAddress, createTransferInstruction, getAccount } from '@solana/spl-token';
import axios from 'axios';

interface PaymentInvoice {
  resource: string;
  payment_methods: Array<{
    chain: string;
    token: string;
    amount: string;
    recipient: string;
    token_symbol?: string;
  }>;
  description?: string;
}

interface PaymentModalProps {
  invoice: PaymentInvoice;
  onApprove: (signature: string) => void;
  onCancel: () => void;
}

export function PaymentModal({ invoice, onApprove, onCancel }: PaymentModalProps) {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Find Solana payment method and calculate readable amount
  const solanaMethod = invoice.payment_methods.find(m => m.chain === 'solana');
  const amountUsdc = solanaMethod ? Number(solanaMethod.amount) / 1_000_000 : 0;

  const handlePay = async () => {
    if (!publicKey || !solanaMethod) return;

    setPaying(true);
    setError(null);

    try {
      const usdcMint = new PublicKey(process.env.NEXT_PUBLIC_USDC_MINT!);
      const recipient = new PublicKey(solanaMethod.recipient);

      // Get token accounts
      const senderTokenAccount = await getAssociatedTokenAddress(usdcMint, publicKey);
      const recipientTokenAccount = await getAssociatedTokenAddress(usdcMint, recipient);

      // Check balance
      const accountInfo = await getAccount(connection, senderTokenAccount);
      const amountNeeded = Number(solanaMethod.amount);
      if (Number(accountInfo.amount) < amountNeeded) {
        throw new Error(`Insufficient USDC balance. Need ${amountUsdc} USDC`);
      }

      // Create transfer transaction
      const transaction = new Transaction().add(
        createTransferInstruction(
          senderTokenAccount,
          recipientTokenAccount,
          publicKey,
          BigInt(solanaMethod.amount)
        )
      );

      // Send transaction (user must approve in Phantom)
      const signature = await sendTransaction(transaction, connection);
      
      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed');
      
      onApprove(signature);
    } catch (err: any) {
      console.error('Payment error:', err);
      setError(err.message || 'Payment failed');
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
        <h3 className="text-xl font-bold mb-4">Payment Required</h3>
        
        <div className="bg-gray-700 rounded p-4 mb-4">
          <p className="text-sm text-gray-400 mb-2">Resource:</p>
          <p className="font-mono text-sm mb-4 break-all">{invoice.resource}</p>
          
          <p className="text-sm text-gray-400 mb-2">Amount:</p>
          <p className="text-2xl font-bold text-solana-green">{amountUsdc.toFixed(3)} USDC</p>
          
          {invoice.description && (
            <>
              <p className="text-sm text-gray-400 mt-3 mb-2">Description:</p>
              <p className="text-sm">{invoice.description}</p>
            </>
          )}
        </div>

        <div className="bg-yellow-900/30 border border-yellow-600/50 rounded p-3 mb-4">
          <p className="text-xs text-yellow-200">
            ⚠️ Phantom will prompt you to approve this transaction. Check the amount before confirming.
          </p>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-600/50 rounded p-3 mb-4">
            <p className="text-sm text-red-200">{error}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handlePay}
            disabled={paying}
            className="flex-1 bg-gradient-to-r from-solana-purple to-solana-green text-white font-semibold py-3 rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {paying ? 'Processing...' : 'Approve & Pay'}
          </button>
          <button
            onClick={onCancel}
            disabled={paying}
            className="px-6 bg-gray-700 text-white font-semibold py-3 rounded-lg hover:bg-gray-600 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// Hook for x402 payment flow
export function useX402Query() {
  const { publicKey } = useWallet();
  const [invoice, setInvoice] = useState<PaymentInvoice | null>(null);
  const [loading, setLoading] = useState(false);

  const executeQuery = async (endpoint: string, params?: any): Promise<any> => {
    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3402';
      
      // First attempt - expect 402
      try {
        const response = await axios.get(`${apiUrl}${endpoint}`, { params });
        return response.data;
      } catch (error: any) {
        if (error.response?.status === 402) {
          // Payment required
          return new Promise((resolve, reject) => {
            setInvoice(error.response.data);
            
            // Wait for payment approval
            const checkPayment = (signature: string) => {
              setInvoice(null);
              // Retry with payment proof
              retryWithPayment(endpoint, params, signature).then(resolve).catch(reject);
            };

            // Store resolver temporarily
            (window as any).__x402Resolve = checkPayment;
            (window as any).__x402Reject = () => {
              setInvoice(null);
              reject(new Error('Payment cancelled'));
            };
          });
        }
        throw error;
      }
    } finally {
      setLoading(false);
    }
  };

  const retryWithPayment = async (endpoint: string, params: any, signature: string) => {
    if (!publicKey) throw new Error('Wallet not connected');
    
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3402';
    const response = await axios.get(`${apiUrl}${endpoint}`, {
      params,
      headers: {
        'x-payment-signature': signature,
        'x-payment-from': publicKey.toBase58(),
        'x-payment-method': 'solana-transfer',
      },
    });
    return response.data;
  };

  const handleApprove = (signature: string) => {
    if ((window as any).__x402Resolve) {
      (window as any).__x402Resolve(signature);
    }
  };

  const handleCancel = () => {
    if ((window as any).__x402Reject) {
      (window as any).__x402Reject();
    }
  };

  return {
    executeQuery,
    loading,
    invoice,
    handleApprove,
    handleCancel,
  };
}
