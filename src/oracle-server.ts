import express, { Request, Response } from 'express';
import { Connection, PublicKey, clusterApiUrl, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getAccount, getAssociatedTokenAddress } from '@solana/spl-token';
import { ethers } from 'ethers';
import axios from 'axios';
import dotenv from 'dotenv';
import { PaymentInvoice, PaymentMethod } from './types';

// Load environment variables first
dotenv.config();

const app = express();
app.use(express.json());
app.use(express.static('public'));

// Configuration - Multi-chain support
// Solana (devnet by default)
const SOLANA_USDC = process.env.USDC_MINT || 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr'; // Devnet USDC
const SERVER_SOLANA_WALLET = process.env.SERVER_SOLANA_WALLET || '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';

console.log(`🔧 Configuration loaded:`);
console.log(`   USDC Mint: ${SOLANA_USDC}`);
console.log(`   Server Wallet: ${SERVER_SOLANA_WALLET}\n`);

// Ethereum Sepolia Testnet (for free testing)
const ETHEREUM_USDC = process.env.ETH_USDC_ADDRESS || '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'; // Sepolia USDC
const SERVER_ETH_WALLET = process.env.SERVER_ETH_WALLET || '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';

const USDC_DECIMALS = 6;

// Helper function for readable timestamps
function getTimestampData() {
  const now = Date.now();
  return {
    timestamp: now,
    timestamp_readable: new Date(now).toISOString(),
    timestamp_local: new Date(now).toLocaleString(),
  };
}

// Blockchain connections
const solanaConnection = new Connection(
  process.env.SOLANA_RPC_URL || clusterApiUrl('devnet'),
  'confirmed'
);

const ethereumProvider = new ethers.JsonRpcProvider(
  process.env.ETH_RPC_URL || 'https://eth-sepolia.g.alchemy.com/v2/demo'
);

// Analytics storage
const analytics = {
  totalQueries: 0,
  totalRevenue: 0,
  queryTypes: {} as Record<string, number>,
  recentTransactions: [] as Array<{
    timestamp: number;
    type: string;
    amount: string;
    from: string;
    signature: string;
  }>,
};

// Pricing (in USDC, 6 decimals)
const PRICING = {
  'token-price': 10000, // $0.01
  'wallet-balance': 5000, // $0.005
  'token-holders': 50000, // $0.05
  'nft-metadata': 20000, // $0.02
  'transaction-history': 100000, // $0.10
  'defi-positions': 150000, // $0.15
  'token-analytics': 200000, // $0.20
};

/**
 * Generate payment invoice for x402 with multi-chain support
 */
function generateInvoice(
  resource: string,
  queryType: string,
  amount: number
): PaymentInvoice {
  const now = Math.floor(Date.now() / 1000);
  
  const paymentMethods: PaymentMethod[] = [
    // Solana payment - RECOMMENDED (fast & cheap)
    {
      type: 'solana-transfer',
      chain: 'solana',
      token: SOLANA_USDC,
      token_symbol: 'USDC',
      recipient: SERVER_SOLANA_WALLET,
      amount: amount.toString(),
    },
    // Ethereum Sepolia payment - Alternative (testnet, free!)
    {
      type: 'eip-3009',
      chain: 'ethereum-sepolia',
      chain_id: 11155111,
      token: ETHEREUM_USDC,
      token_symbol: 'USDC',
      recipient: SERVER_ETH_WALLET,
      amount: amount.toString(),
      valid_until: now + 3600,
    },
  ];

  return {
    version: '1.0',
    payment_required: true,
    payment_methods: paymentMethods,
    resource,
    description: `Cross-chain ${queryType} data query`,
    invoice_id: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    created_at: now,
  };
}

/**
 * Verify Solana USDC payment
 */
async function verifySolanaPayment(
  signature: string,
  expectedAmount: number,
  senderAddress: string
): Promise<boolean> {
  try {
    console.log(`🔍 Verifying payment: ${signature}`);
    
    // Get transaction details
    const tx = await solanaConnection.getTransaction(signature, {
      maxSupportedTransactionVersion: 0,
    });

    if (!tx || !tx.meta) {
      console.log('❌ Transaction not found or no metadata');
      return false;
    }

    // Check if transaction was successful
    if (tx.meta.err) {
      console.log('❌ Transaction failed:', tx.meta.err);
      return false;
    }

    // Verify the transaction is recent (within last hour)
    const txTime = tx.blockTime || 0;
    const now = Math.floor(Date.now() / 1000);
    if (now - txTime > 3600) {
      console.log('❌ Transaction too old');
      return false;
    }

    // Parse pre and post token balances to verify amount
    const preBalances = tx.meta.preTokenBalances || [];
    const postBalances = tx.meta.postTokenBalances || [];

    // Find recipient's token balance change
    const serverPubkey = new PublicKey(SERVER_SOLANA_WALLET);
    
    console.log(`🔍 Verifying payment: Expected mint=${SOLANA_USDC}, amount>=${expectedAmount}`);
    console.log(`   Pre-balances: ${preBalances.length}, Post-balances: ${postBalances.length}`);
    
    for (const postBalance of postBalances) {
      console.log(`   Checking balance: mint=${postBalance.mint}`);
      if (postBalance.mint === SOLANA_USDC) {
        const preBalance = preBalances.find(
          (b) => b.accountIndex === postBalance.accountIndex
        );
        
        const preAmount = BigInt(preBalance?.uiTokenAmount.amount || '0');
        const postAmount = BigInt(postBalance.uiTokenAmount.amount);
        const transferred = postAmount - preAmount;

        console.log(`   Transfer detected: ${transferred.toString()} (expected: ${expectedAmount})`);

        // Check if amount matches expected
        if (transferred >= BigInt(expectedAmount)) {
          console.log(`✅ Payment verified: ${transferred.toString()} USDC`);
          
          // Record analytics
          analytics.totalRevenue += Number(transferred) / Math.pow(10, USDC_DECIMALS);
          analytics.recentTransactions.unshift({
            timestamp: Date.now(),
            type: 'solana-transfer',
            amount: (Number(transferred) / Math.pow(10, USDC_DECIMALS)).toFixed(2),
            from: senderAddress,
            signature,
          });
          
          // Keep only last 50 transactions
          if (analytics.recentTransactions.length > 50) {
            analytics.recentTransactions.pop();
          }

          return true;
        }
      }
    }

    console.log('❌ Payment amount mismatch or recipient not found');
    return false;
  } catch (error) {
    console.error('❌ Error verifying payment:', error);
    return false;
  }
}

/**
 * Verify Ethereum EIP-3009 payment authorization
 */
async function verifyEthereumPayment(
  from: string,
  signature: string,
  value: string,
  nonce: string,
  validAfter: string,
  validBefore: string
): Promise<boolean> {
  try {
    console.log(`🔍 Verifying Ethereum payment from ${from}`);
    
    // Create EIP-712 domain
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

    // Recover signer
    const recoveredAddress = ethers.verifyTypedData(domain, types, message, signature);

    if (recoveredAddress.toLowerCase() !== from.toLowerCase()) {
      console.log('❌ Signer mismatch');
      return false;
    }

    // Verify timing
    const now = Math.floor(Date.now() / 1000);
    if (now < parseInt(validAfter) || now > parseInt(validBefore)) {
      console.log('❌ Authorization expired');
      return false;
    }

    console.log('✅ Ethereum payment authorization verified');
    
    // Record analytics
    analytics.totalRevenue += Number(value) / Math.pow(10, USDC_DECIMALS);
    analytics.recentTransactions.unshift({
      ...getTimestampData(),
      type: 'ethereum-eip3009',
      amount: (Number(value) / Math.pow(10, USDC_DECIMALS)).toFixed(2),
      from,
      signature,
    });
    
    if (analytics.recentTransactions.length > 50) {
      analytics.recentTransactions.pop();
    }

    return true;
  } catch (error) {
    console.error('❌ Ethereum verification error:', error);
    return false;
  }
}

/**
 * Middleware to require x402 payment - now supports multi-chain!
 */
function requirePayment(queryType: keyof typeof PRICING) {
  return async (req: Request, res: Response, next: Function) => {
    const signature = req.headers['x-payment-signature'] as string;
    const from = req.headers['x-payment-from'] as string;
    const method = req.headers['x-payment-method'] as string;

    const price = PRICING[queryType];

    // If no payment headers, return 402 with multi-chain invoice
    if (!signature || !from || !method) {
      const invoice = generateInvoice(req.path, queryType, price);
      return res.status(402).json(invoice);
    }

    let isValid = false;

    // Verify payment based on chosen method
    if (method === 'solana-transfer') {
      isValid = await verifySolanaPayment(signature, price, from);
    } else if (method === 'eip-3009') {
      const nonce = req.headers['x-payment-nonce'] as string;
      const validAfter = req.headers['x-payment-valid-after'] as string;
      const validBefore = req.headers['x-payment-valid-before'] as string;
      
      if (nonce && validAfter && validBefore) {
        isValid = await verifyEthereumPayment(
          from,
          signature,
          price.toString(),
          nonce,
          validAfter,
          validBefore
        );
      }
    }

    if (!isValid) {
      return res.status(402).json({
        error: 'Payment verification failed',
        message: 'Invalid or insufficient payment',
        expected_amount: price,
        expected_token: 'USDC',
        supported_chains: ['solana', 'ethereum'],
      });
    }

    // Update analytics
    analytics.totalQueries++;
    analytics.queryTypes[queryType] = (analytics.queryTypes[queryType] || 0) + 1;

    next();
  };
}

// =============================================================================
// SOLANA DATA ORACLE ENDPOINTS
// =============================================================================

/**
 * 🌉 CROSS-CHAIN: Aggregated multi-chain wallet balance
 * This endpoint showcases x402 as a universal payment standard!
 * Query both Solana AND Ethereum balances with a single payment.
 */
app.get('/api/v1/cross-chain/balance/:address', requirePayment('wallet-balance'), async (req, res) => {
  const { address } = req.params;

  try {
    const results: any = {
      address,
      ...getTimestampData(),
      chains: {},
    };

    // Determine if address is Ethereum (starts with 0x) or Solana
    const isEthAddress = address.startsWith('0x');
    const isSolanaAddress = !isEthAddress;

    // Fetch Solana balance (only if Solana address provided)
    if (isSolanaAddress) {
      try {
        const pubkey = new PublicKey(address);
        const balance = await solanaConnection.getBalance(pubkey);
        const tokenAccounts = await solanaConnection.getParsedTokenAccountsByOwner(pubkey, {
          programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
        });

        const tokens = tokenAccounts.value.map((account) => ({
          mint: account.account.data.parsed.info.mint,
          amount: account.account.data.parsed.info.tokenAmount.uiAmount,
          decimals: account.account.data.parsed.info.tokenAmount.decimals,
        }));

        results.chains.solana = {
          native_balance: balance / LAMPORTS_PER_SOL,
          native_symbol: 'SOL',
          token_count: tokens.length,
          tokens: tokens.slice(0, 5),
        };
      } catch (e) {
        results.chains.solana = { error: 'Invalid Solana address or fetch failed' };
      }
    } else {
      results.chains.solana = { error: 'Ethereum address provided - cannot query Solana chain' };
    }

    // Fetch Ethereum balance (only if Ethereum address provided)
    if (isEthAddress) {
      try {
        const balance = await ethereumProvider.getBalance(address);
        const usdcContract = new ethers.Contract(
          ETHEREUM_USDC,
          ['function balanceOf(address) view returns (uint256)'],
          ethereumProvider
        );
        const usdcBalance = await usdcContract.balanceOf(address);

        results.chains.ethereum = {
          native_balance: Number(ethers.formatEther(balance)),
          native_symbol: 'ETH',
          usdc_balance: Number(ethers.formatUnits(usdcBalance, USDC_DECIMALS)),
        };
      } catch (e: any) {
        // Check if it's a rate limit error
        if (e.message?.includes('429') || e.message?.includes('Too Many Requests') || e.message?.includes('retry limit')) {
          // Return mock data for demo purposes when hitting rate limits
          results.chains.ethereum = {
            native_balance: 0.3,
            native_symbol: 'ETH',
            usdc_balance: 0,
            note: 'Demo data (RPC rate limited)',
          };
        } else {
          results.chains.ethereum = { error: `Ethereum fetch failed: ${e.message}` };
        }
      }
    } else {
      results.chains.ethereum = { error: 'Solana address provided - cannot query Ethereum chain' };
    }

    res.json({
      success: true,
      data: results,
      note: '🌉 Cross-chain data aggregation powered by x402 universal payments!',
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch cross-chain data' });
  }
});

/**
 * Get token price in USD
 */
app.get('/api/v1/price/:token', requirePayment('token-price'), async (req, res) => {
  const { token } = req.params;

  try {
    console.log(`📊 Fetching price for token: ${token}`);
    
    // Token to CoinGecko ID mapping
    const tokenMap: Record<string, string> = {
      'So11111111111111111111111111111111111111112': 'solana',
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'usd-coin',
    };
    
    let priceData: any = null;
    let source = '';

    // Try Jupiter API first (v6)
    try {
      console.log(`   Trying Jupiter API...`);
      const jupResponse = await axios.get(`https://api.jup.ag/price/v2?ids=${token}`, {
        timeout: 5000,
        headers: { 'Accept': 'application/json' }
      });
      
      if (jupResponse.data?.data?.[token]) {
        priceData = jupResponse.data.data[token];
        source = 'Jupiter';
        console.log(`   ✅ Jupiter: $${priceData.price}`);
      }
    } catch (jupError: any) {
      console.log(`   ⚠️  Jupiter failed: ${jupError.message}`);
    }

    // Fallback to CoinGecko if Jupiter fails
    if (!priceData && tokenMap[token]) {
      try {
        console.log(`   Trying CoinGecko API...`);
        const cgResponse = await axios.get(
          `https://api.coingecko.com/api/v3/simple/price?ids=${tokenMap[token]}&vs_currencies=usd`,
          { timeout: 5000 }
        );
        
        if (cgResponse.data?.[tokenMap[token]]?.usd) {
          priceData = { price: cgResponse.data[tokenMap[token]].usd };
          source = 'CoinGecko';
          console.log(`   ✅ CoinGecko: $${priceData.price}`);
        }
      } catch (cgError: any) {
        console.log(`   ⚠️  CoinGecko failed: ${cgError.message}`);
      }
    }

    // If both APIs fail, use mock data
    if (!priceData) {
      console.log(`   📝 Using mock data`);
      priceData = { 
        price: token.includes('So1111111') ? 180.50 : 1.00 
      };
      source = 'Mock (APIs unavailable)';
    }

    res.json({
      success: true,
      data: {
        token,
        price_usd: priceData.price,
        source,
        ...getTimestampData(),
      },
    });
  } catch (error: any) {
    console.error(`❌ Unexpected error:`, error.message);
    // Return mock data as last resort
    res.json({
      success: true,
      data: {
        token,
        price_usd: token.includes('So1111111') ? 180.50 : 1.00,
        ...getTimestampData(),
        source: 'Mock (Error)',
      },
    });
  }
});

/**
 * Get wallet balance and SOL holdings
 */
app.get('/api/v1/wallet/:address', requirePayment('wallet-balance'), async (req, res) => {
  const { address } = req.params;

  try {
    console.log(`💼 Fetching wallet data for: ${address}`);
    const pubkey = new PublicKey(address);
    
    console.log(`   Getting SOL balance...`);
    const balance = await solanaConnection.getBalance(pubkey);
    console.log(`   SOL: ${balance / LAMPORTS_PER_SOL}`);
    
    console.log(`   Getting token accounts...`);
    const tokenAccounts = await solanaConnection.getParsedTokenAccountsByOwner(pubkey, {
      programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
    });
    console.log(`   Found ${tokenAccounts.value.length} token accounts`);

    // Known token mapping
    const knownTokens: Record<string, { symbol: string; name: string }> = {
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': { symbol: 'USDC', name: 'USD Coin' },
      'So11111111111111111111111111111111111111112': { symbol: 'SOL', name: 'Wrapped SOL' },
      'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': { symbol: 'USDT', name: 'Tether USD' },
      'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr': { symbol: 'USDC', name: 'USDC (Devnet)' },
      [SOLANA_USDC]: { symbol: 'USDC', name: 'Custom Test USDC' },
    };

    const tokens = tokenAccounts.value.map((account) => {
      const mint = account.account.data.parsed.info.mint;
      const tokenInfo = knownTokens[mint];
      
      return {
        mint,
        symbol: tokenInfo?.symbol || 'UNKNOWN',
        name: tokenInfo?.name || 'Unknown Token',
        amount: account.account.data.parsed.info.tokenAmount.uiAmount,
        decimals: account.account.data.parsed.info.tokenAmount.decimals,
      };
    });

    console.log(`✅ Wallet data ready`);
    res.json({
      success: true,
      data: {
        address,
        sol_balance: balance / LAMPORTS_PER_SOL,
        token_count: tokens.length,
        tokens: tokens.slice(0, 10), // Limit to first 10
        ...getTimestampData(),
      },
    });
  } catch (error: any) {
    console.error(`❌ Wallet query error:`, error.message);
    res.status(500).json({ error: 'Failed to fetch wallet data', details: error.message });
  }
});

/**
 * Get token holder count
 */
app.get('/api/v1/holders/:mint', requirePayment('token-holders'), async (req, res) => {
  const { mint } = req.params;

  try {
    const mintPubkey = new PublicKey(mint);
    const accounts = await solanaConnection.getProgramAccounts(
      new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
      {
        filters: [
          { dataSize: 165 },
          { memcmp: { offset: 0, bytes: mintPubkey.toBase58() } },
        ],
      }
    );

    res.json({
      success: true,
      data: {
        mint,
        holder_count: accounts.length,
        ...getTimestampData(),
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch holder data' });
  }
});

/**
 * Get transaction history for an address
 */
app.get('/api/v1/transactions/:address', requirePayment('transaction-history'), async (req, res) => {
  const { address } = req.params;
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

  try {
    const pubkey = new PublicKey(address);
    const signatures = await solanaConnection.getSignaturesForAddress(pubkey, { limit });

    res.json({
      success: true,
      data: {
        address,
        transaction_count: signatures.length,
        transactions: signatures.map((sig) => ({
          signature: sig.signature,
          slot: sig.slot,
          timestamp: sig.blockTime,
          err: sig.err,
        })),
        ...getTimestampData(),
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

/**
 * Get comprehensive token analytics
 */
app.get('/api/v1/analytics/:mint', requirePayment('token-analytics'), async (req, res) => {
  const { mint } = req.params;

  try {
    console.log(`📊 Fetching analytics for token: ${mint}`);
    const mintPubkey = new PublicKey(mint);
    
    // Get supply info
    const supply = await solanaConnection.getTokenSupply(mintPubkey);
    console.log(`   Supply: ${supply.value.uiAmount}`);
    
    // Get holder count
    const accounts = await solanaConnection.getProgramAccounts(
      new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
      {
        filters: [
          { dataSize: 165 },
          { memcmp: { offset: 0, bytes: mintPubkey.toBase58() } },
        ],
      }
    );
    console.log(`   Holders: ${accounts.length}`);

    // Try to get price from Jupiter
    let price = 0;
    try {
      const priceRes = await axios.get(`https://price.jup.ag/v4/price?ids=${mint}`, { timeout: 5000 });
      price = priceRes.data.data[mint]?.price || 0;
      console.log(`   Price: $${price}`);
    } catch (e) {
      console.log(`   Price: unavailable`);
    }

    console.log(`✅ Analytics ready`);
    res.json({
      success: true,
      data: {
        mint,
        supply: {
          total: supply.value.uiAmount,
          decimals: supply.value.decimals,
        },
        holders: accounts.length,
        price_usd: price,
        market_cap: price * (supply.value.uiAmount || 0),
        ...getTimestampData(),
      },
    });
  } catch (error: any) {
    console.error(`❌ Analytics error:`, error.message);
    res.status(500).json({ error: 'Failed to fetch analytics', details: error.message });
  }
});

// =============================================================================
// FREE ENDPOINTS
// =============================================================================

/**
 * Get pricing information
 */
app.get('/api/v1/pricing', (req, res) => {
  res.json({
    success: true,
    pricing: Object.entries(PRICING).map(([endpoint, price]) => ({
      endpoint,
      price_usdc: (price / Math.pow(10, USDC_DECIMALS)).toFixed(3),
      description: `Query ${endpoint.replace(/-/g, ' ')} data`,
    })),
    payment_method: 'Solana USDC (SPL Token)',
    protocol: 'x402',
  });
});

/**
 * Get service analytics
 */
app.get('/api/v1/stats', (req, res) => {
  res.json({
    success: true,
    stats: {
      total_queries: analytics.totalQueries,
      total_revenue_usd: analytics.totalRevenue.toFixed(2),
      query_distribution: analytics.queryTypes,
      recent_transactions: analytics.recentTransactions.slice(0, 10),
    },
  });
});

/**
 * Health check
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'operational',
    service: 'Solana AI Data Oracle',
    protocol: 'x402',
    blockchain: 'Solana',
    ...getTimestampData(),
  });
});

// =============================================================================
// START SERVER
// =============================================================================

const PORT = process.env.PORT || 3402;

app.listen(PORT, () => {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║   🤖 Solana AI Data Oracle with x402 Micropayments      ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`🌐 Server running on http://localhost:${PORT}`);
  console.log(`💰 Payment token: USDC on Solana`);
  console.log(`📊 Protocol: x402 (HTTP 402 Payment Required)`);
  console.log('');
  console.log('📡 Available Data Endpoints:');
  console.log(`  • GET  /api/v1/price/:token          - Token price ($0.01)`);
  console.log(`  • GET  /api/v1/wallet/:address       - Wallet balance ($0.005)`);
  console.log(`  • GET  /api/v1/holders/:mint         - Token holders ($0.05)`);
  console.log(`  • GET  /api/v1/transactions/:address - TX history ($0.10)`);
  console.log(`  • GET  /api/v1/analytics/:mint       - Full analytics ($0.20)`);
  console.log('');
  console.log('🆓 Free Endpoints:');
  console.log(`  • GET  /api/v1/pricing - View all pricing`);
  console.log(`  • GET  /api/v1/stats   - Service statistics`);
  console.log('');
  console.log('💡 Payments processed automatically via x402 protocol');
  console.log('');
});

export default app;
