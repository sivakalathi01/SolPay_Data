import express, { Request, Response } from 'express';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { ethers } from 'ethers';
import { PaymentInvoice, PaymentMethod } from './types';

const app = express();
app.use(express.json());

// Configuration
const SOLANA_USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const ETHEREUM_USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const SERVER_SOLANA_WALLET = process.env.SERVER_SOLANA_WALLET || '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';
const SERVER_ETH_WALLET = process.env.SERVER_ETH_WALLET || '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
const ENTRYPOINT_ADDRESS = '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789'; // EIP-4337 EntryPoint v0.6

// Connection setup
const solanaConnection = new Connection(clusterApiUrl('mainnet-beta'));
const ethereumProvider = new ethers.JsonRpcProvider(
  process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/your-api-key'
);

// Simple in-memory storage for processed payments
const processedPayments = new Set<string>();

/**
 * Generate a payment invoice for x402 protocol
 */
function generatePaymentInvoice(resource: string, description: string, amountUSDC: string): PaymentInvoice {
  const now = Math.floor(Date.now() / 1000);
  const validUntil = now + 3600; // 1 hour validity

  const paymentMethods: PaymentMethod[] = [
    // Solana payment method
    {
      type: 'solana-transfer',
      chain: 'solana',
      token: SOLANA_USDC,
      token_symbol: 'USDC',
      recipient: SERVER_SOLANA_WALLET,
      amount: amountUSDC, // USDC has 6 decimals
    },
    // Ethereum EIP-3009 payment method
    {
      type: 'eip-3009',
      chain: 'ethereum',
      chain_id: 1,
      token: ETHEREUM_USDC,
      token_symbol: 'USDC',
      recipient: SERVER_ETH_WALLET,
      amount: amountUSDC,
      valid_until: validUntil,
    },
    // EIP-4337 Account Abstraction payment method
    {
      type: 'eip-4337',
      chain: 'ethereum',
      chain_id: 1,
      token: ETHEREUM_USDC,
      token_symbol: 'USDC',
      recipient: SERVER_ETH_WALLET,
      amount: amountUSDC,
      entrypoint: ENTRYPOINT_ADDRESS,
      bundler: process.env.BUNDLER_URL || 'https://api.stackup.sh/v1/node/your-api-key',
    },
  ];

  return {
    version: '1.0',
    payment_required: true,
    payment_methods: paymentMethods,
    resource,
    description,
    invoice_id: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    created_at: now,
  };
}

/**
 * Verify Solana payment
 */
async function verifySolanaPayment(signature: string, expectedAmount: string): Promise<boolean> {
  try {
    const txInfo = await solanaConnection.getTransaction(signature, {
      maxSupportedTransactionVersion: 0,
    });

    if (!txInfo || !txInfo.meta) {
      return false;
    }

    // Check if transaction was successful
    if (txInfo.meta.err) {
      return false;
    }

    // Verify recipient and amount in the transaction
    // This is simplified - in production, you'd parse the transaction details more carefully
    const accountKeys = txInfo.transaction.message.getAccountKeys();
    const recipientPubkey = new PublicKey(SERVER_SOLANA_WALLET);
    
    // Check if recipient is in the transaction
    const recipientFound = accountKeys.staticAccountKeys.some(
      key => key.equals(recipientPubkey)
    );

    if (!recipientFound) {
      return false;
    }

    // Mark as processed to prevent replay
    processedPayments.add(signature);
    
    return true;
  } catch (error) {
    console.error('Error verifying Solana payment:', error);
    return false;
  }
}

/**
 * Verify EIP-3009 payment authorization
 */
async function verifyEIP3009Payment(
  from: string,
  signature: string,
  value: string,
  nonce: string,
  validAfter: string,
  validBefore: string
): Promise<boolean> {
  try {
    // Create the EIP-712 domain and types
    const domain = {
      name: 'USD Coin',
      version: '2',
      chainId: 1,
      verifyingContract: ETHEREUM_USDC,
    };

    const types = {
      TransferWithAuthorization: [
        { name: 'from', type: 'address' },
        { name: 'to', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'validAfter', type: 'uint256' },
        { name: 'validBefore', type: 'uint256' },
        { name: 'nonce', type: 'bytes32' },
      ],
    };

    const message = {
      from,
      to: SERVER_ETH_WALLET,
      value,
      validAfter,
      validBefore,
      nonce,
    };

    // Recover signer from signature
    const recoveredAddress = ethers.verifyTypedData(domain, types, message, signature);

    // Verify signer matches claimed sender
    if (recoveredAddress.toLowerCase() !== from.toLowerCase()) {
      return false;
    }

    // Verify timing
    const now = Math.floor(Date.now() / 1000);
    if (now < parseInt(validAfter) || now > parseInt(validBefore)) {
      return false;
    }

    // Check if already processed
    const paymentId = `eip3009_${from}_${nonce}`;
    if (processedPayments.has(paymentId)) {
      return false;
    }

    processedPayments.add(paymentId);
    return true;
  } catch (error) {
    console.error('Error verifying EIP-3009 payment:', error);
    return false;
  }
}

/**
 * Verify EIP-4337 UserOperation payment
 */
async function verifyEIP4337Payment(userOpHash: string, expectedAmount: string): Promise<boolean> {
  try {
    // In a real implementation, you would:
    // 1. Query the bundler for the UserOperation status
    // 2. Verify the UserOperation was included in a block
    // 3. Check that the callData includes a USDC transfer to SERVER_ETH_WALLET
    // 4. Verify the amount matches expectedAmount
    
    // This is a simplified version
    const paymentId = `eip4337_${userOpHash}`;
    if (processedPayments.has(paymentId)) {
      return false;
    }

    // Here you would make an RPC call to the bundler to verify the UserOp
    // For now, we'll return true if the hash format is valid
    if (userOpHash.match(/^0x[a-fA-F0-9]{64}$/)) {
      processedPayments.add(paymentId);
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error verifying EIP-4337 payment:', error);
    return false;
  }
}

/**
 * Middleware to check for payment
 */
async function requirePayment(req: Request, res: Response, next: Function) {
  const paymentMethod = req.headers['x-payment-method'] as string;
  const paymentSignature = req.headers['x-payment-signature'] as string;
  const paymentFrom = req.headers['x-payment-from'] as string;

  // If no payment headers, return 402 with invoice
  if (!paymentMethod || !paymentSignature || !paymentFrom) {
    const invoice = generatePaymentInvoice(
      req.path,
      'Access to premium API endpoint',
      '1000000' // 1 USDC (6 decimals)
    );

    return res.status(402).json(invoice);
  }

  let paymentValid = false;

  // Verify payment based on method
  switch (paymentMethod) {
    case 'solana-transfer':
      const txHash = req.headers['x-payment-tx-hash'] as string;
      if (txHash) {
        paymentValid = await verifySolanaPayment(txHash, '1000000');
      }
      break;

    case 'eip-3009':
      const nonce = req.headers['x-payment-nonce'] as string;
      const validAfter = req.headers['x-payment-valid-after'] as string;
      const validBefore = req.headers['x-payment-valid-before'] as string;
      
      if (nonce && validAfter && validBefore) {
        paymentValid = await verifyEIP3009Payment(
          paymentFrom,
          paymentSignature,
          '1000000',
          nonce,
          validAfter,
          validBefore
        );
      }
      break;

    case 'eip-4337':
      const userOpHash = req.headers['x-payment-user-op-hash'] as string;
      if (userOpHash) {
        paymentValid = await verifyEIP4337Payment(userOpHash, '1000000');
      }
      break;

    default:
      return res.status(400).json({ error: 'Unsupported payment method' });
  }

  if (!paymentValid) {
    return res.status(402).json({
      error: 'Payment verification failed',
      message: 'The provided payment could not be verified. Please try again.',
    });
  }

  // Payment verified, proceed to resource
  next();
}

// API Endpoints

/**
 * Free endpoint - no payment required
 */
app.get('/api/public/hello', (req, res) => {
  res.json({
    message: 'Hello! This is a public endpoint.',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Premium endpoint - requires x402 payment
 */
app.get('/api/premium/data', requirePayment, async (req, res) => {
  res.json({
    message: 'Access granted to premium data!',
    data: {
      ai_response: 'This is premium AI-generated content.',
      model: 'gpt-4',
      tokens_used: 150,
      cost_usdc: '1.00',
    },
    timestamp: new Date().toISOString(),
  });
});

/**
 * Another premium endpoint - AI completion
 */
app.post('/api/premium/ai/complete', requirePayment, async (req, res) => {
  const { prompt } = req.body;

  res.json({
    message: 'AI completion generated successfully',
    prompt,
    completion: `This is a simulated AI response to: "${prompt}"`,
    model: 'gpt-4',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Web3 RPC endpoint - blockchain data
 */
app.post('/api/premium/rpc/ethereum', requirePayment, async (req, res) => {
  const { method, params } = req.body;

  // Simulate RPC response
  res.json({
    jsonrpc: '2.0',
    id: 1,
    result: `Simulated result for ${method}`,
  });
});

/**
 * Health check
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', protocol: 'x402', version: '1.0' });
});

const PORT = process.env.PORT || 3402;

app.listen(PORT, () => {
  console.log(`🚀 x402 Server running on port ${PORT}`);
  console.log(`📝 Protocol: x402 (HTTP 402 Payment Required)`);
  console.log(`💰 Accepted payments: Solana, Ethereum (EIP-3009), EIP-4337 Account Abstraction`);
  console.log(`\nEndpoints:`);
  console.log(`  - GET  /api/public/hello (free)`);
  console.log(`  - GET  /api/premium/data (requires payment)`);
  console.log(`  - POST /api/premium/ai/complete (requires payment)`);
  console.log(`  - POST /api/premium/rpc/ethereum (requires payment)`);
});

export default app;
