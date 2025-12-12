import axios from 'axios';
import dotenv from 'dotenv';
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
  clusterApiUrl,
} from '@solana/web3.js';

// Load environment variables
dotenv.config();
import {
  getAssociatedTokenAddress,
  createTransferInstruction,
  getAccount,
} from '@solana/spl-token';
import bs58 from 'bs58';
import { PaymentInvoice } from './types';

// Using devnet USDC for testing
const USDC_MINT = new PublicKey(
  process.env.USDC_MINT || 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr'
);

/**
 * AI Agent Client for Solana Data Oracle
 * Automatically handles x402 payments for data queries
 */
export class SolanaOracleAgent {
  private connection: Connection;
  public wallet: Keypair;
  private baseUrl: string;
  public stats = {
    queriesMade: 0,
    totalSpent: 0,
    successfulPayments: 0,
    failedPayments: 0,
  };

  constructor(privateKey: string, oracleUrl: string, rpcUrl?: string) {
    this.wallet = Keypair.fromSecretKey(bs58.decode(privateKey));
    this.baseUrl = oracleUrl;
    this.connection = new Connection(
      rpcUrl || process.env.SOLANA_RPC_URL || clusterApiUrl('devnet'),
      'confirmed'
    );
    
    console.log('🤖 AI Agent initialized');
    console.log(`   Wallet: ${this.wallet.publicKey.toBase58()}`);
    console.log(`   Oracle: ${this.baseUrl}`);
  }

  /**
   * Make a query to the oracle with automatic payment
   */
  public async query(endpoint: string): Promise<any> {
    try {
      // Try request without payment first
      const response = await axios.get(`${this.baseUrl}${endpoint}`, {
        validateStatus: (status: number) => status < 500,
      });

      // If successful, return data
      if (response.status === 200) {
        return response.data;
      }

      // If 402 Payment Required, process payment
      if (response.status === 402) {
        const invoice: PaymentInvoice = response.data;
        
        if (!invoice.payment_required) {
          throw new Error('Invalid payment invoice');
        }

        console.log(`💳 Payment required for ${endpoint}`);
        
        // 🌉 CROSS-CHAIN: Choose optimal payment method
        // This client automatically selects Solana (faster & cheaper)
        // But could choose Ethereum Sepolia if needed!
        const solanaMethod = invoice.payment_methods.find(m => m.chain === 'solana');
        const ethMethod = invoice.payment_methods.find(m => m.chain === 'ethereum-sepolia' || m.chain === 'ethereum');
        
        console.log('🔍 Available payment chains:');
        if (solanaMethod) {
          console.log(`   ✅ Solana Devnet: ${Number(solanaMethod.amount) / 1_000_000} USDC (RECOMMENDED - FREE testnet)`);
        }
        if (ethMethod) {
          console.log(`   ⚠️  Ethereum Sepolia: ${Number(ethMethod.amount) / 1_000_000} USDC (FREE testnet, but slower)`);
        }

        if (!solanaMethod) {
          throw new Error('No Solana payment method available');
        }

        console.log('💡 Auto-selecting Solana for speed & testnet convenience');

        // Make payment
        const signature = await this.pay(invoice, solanaMethod);

        // Retry with payment signature
        const paidResponse = await axios.get(`${this.baseUrl}${endpoint}`, {
          headers: {
            'x-payment-method': 'solana-transfer',
            'x-payment-signature': signature,
            'x-payment-from': this.wallet.publicKey.toBase58(),
          },
        });

        this.stats.successfulPayments++;
        this.stats.totalSpent += Number(solanaMethod.amount) / 1_000_000;
        
        console.log(`✅ Payment verified, data received`);

        return paidResponse.data;
      }

      throw new Error(`Unexpected status code: ${response.status}`);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNREFUSED') {
          throw new Error(`Cannot connect to oracle server at ${this.baseUrl}. Make sure the server is running with: npm start`);
        }
        throw new Error(`Query failed: ${error.message} (${error.code || 'unknown error'})`);
      }
      throw error;
    } finally {
      this.stats.queriesMade++;
    }
  }

  /**
   * Process USDC payment on Solana
   */
  private async pay(invoice: PaymentInvoice, selectedMethod?: any): Promise<string> {
    try {
      const paymentMethod = selectedMethod || invoice.payment_methods[0];
      
      // Only Solana payments supported in this client
      if (paymentMethod.chain !== 'solana') {
        throw new Error('Only Solana payments supported by this agent');
      }

      const amount = BigInt(paymentMethod.amount);
      const recipient = new PublicKey(paymentMethod.recipient);

      // Get sender token account
      const senderTokenAccount = await getAssociatedTokenAddress(
        USDC_MINT,
        this.wallet.publicKey
      );

      // Verify sender has enough USDC
      const senderAccount = await getAccount(this.connection, senderTokenAccount);
      if (BigInt(senderAccount.amount) < amount) {
        throw new Error(`Insufficient USDC balance. Required: ${amount}, Available: ${senderAccount.amount}`);
      }

      // Get or create recipient token account
      const { getOrCreateAssociatedTokenAccount } = await import('@solana/spl-token');
      const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(
        this.connection,
        this.wallet, // Payer creates the account if needed
        USDC_MINT,
        recipient
      );

      console.log(`   Recipient token account: ${recipientTokenAccount.address.toBase58()}`);

      // Create transfer instruction
      const transferIx = createTransferInstruction(
        senderTokenAccount,
        recipientTokenAccount.address,
        this.wallet.publicKey,
        amount
      );

      // Create and send transaction
      const transaction = new Transaction().add(transferIx);
      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [this.wallet],
        { commitment: 'confirmed' }
      );

      console.log(`   Transaction: ${signature}`);
      console.log(`   🔍 View: https://explorer.solana.com/tx/${signature}?cluster=devnet`);

      return signature;
    } catch (error) {
      this.stats.failedPayments++;
      console.error('❌ Payment failed:', error);
      throw error;
    }
  }

  // ============================================================================
  // PUBLIC API METHODS
  // ============================================================================

  /**
   * Get token price in USD
   */
  async getTokenPrice(tokenMint: string): Promise<{
    token: string;
    price_usd: number;
    timestamp: number;
  }> {
    const result = await this.query(`/api/v1/price/${tokenMint}`);
    return result.data;
  }

  /**
   * Get wallet balance and token holdings
   */
  async getWalletInfo(address: string): Promise<{
    address: string;
    sol_balance: number;
    token_count: number;
    tokens: Array<{ 
      mint: string; 
      symbol: string;
      name: string;
      amount: number; 
      decimals: number;
    }>;
  }> {
    const result = await this.query(`/api/v1/wallet/${address}`);
    return result.data;
  }

  /**
   * Get token holder count
   */
  async getTokenHolders(mint: string): Promise<{
    mint: string;
    holder_count: number;
  }> {
    const result = await this.query(`/api/v1/holders/${mint}`);
    return result.data;
  }

  /**
   * Get transaction history
   */
  async getTransactionHistory(
    address: string,
    limit = 10
  ): Promise<{
    address: string;
    transaction_count: number;
    transactions: Array<any>;
  }> {
    const result = await this.query(`/api/v1/transactions/${address}?limit=${limit}`);
    return result.data;
  }

  /**
   * Get comprehensive token analytics
   */
  async getTokenAnalytics(mint: string): Promise<{
    mint: string;
    supply: { total: number; decimals: number };
    holders: number;
    price_usd: number;
    market_cap: number;
  }> {
    const result = await this.query(`/api/v1/analytics/${mint}`);
    return result.data;
  }

  /**
   * 🌉 NEW: Get cross-chain wallet balance (Solana + Ethereum)
   * Demonstrates x402 as a universal payment standard!
   */
  async getCrossChainBalance(address: string): Promise<any> {
    const result = await this.query(`/api/v1/cross-chain/balance/${address}`);
    return result.data;
  }

  /**
   * Get agent statistics
   */
  getStats() {
    return {
      ...this.stats,
      wallet: this.wallet.publicKey.toBase58(),
      averageCostPerQuery: this.stats.queriesMade > 0
        ? (this.stats.totalSpent / this.stats.queriesMade).toFixed(4)
        : '0.0000',
    };
  }

  /**
   * Check USDC balance
   */
  async getUSDCBalance(): Promise<number> {
    try {
      const tokenAccount = await getAssociatedTokenAddress(
        USDC_MINT,
        this.wallet.publicKey
      );
      const account = await getAccount(this.connection, tokenAccount);
      return Number(account.amount) / 1_000_000;
    } catch (error) {
      return 0;
    }
  }
}

/**
 * Demo: Autonomous AI agent making multiple queries
 */
async function demo() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║     🤖 Autonomous AI Agent Demo - x402 + Solana       ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  // Initialize agent
  const agent = new SolanaOracleAgent(
    process.env.SOLANA_PRIVATE_KEY!,
    process.env.ORACLE_URL || 'http://localhost:3402'
  );

  try {
    // Check balance
    const balance = await agent.getUSDCBalance();
    console.log(`💰 Current USDC balance: $${balance.toFixed(2)}\n`);

    if (balance < 1) {
      console.log('⚠️  Warning: Low USDC balance. Please fund your wallet.\n');
    }

    // Helper function to add delay between queries
    const QUERY_DELAY_MS = parseInt(process.env.QUERY_DELAY_MS || '0', 10);
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    
    if (QUERY_DELAY_MS > 0) {
      console.log(`⏱️  Delay between queries: ${QUERY_DELAY_MS}ms\n`);
    }

    // Query 1: Get SOL price
    console.log('📊 Query 1: Getting SOL price...');
    const solPrice = await agent.getTokenPrice('So11111111111111111111111111111111111111112');
    console.log(`   SOL Price: $${solPrice.price_usd}\n`);
    await delay(QUERY_DELAY_MS);

    // Query 2: Get my wallet info (AI agent's own wallet)
    console.log('📊 Query 2: Getting my wallet information...');
    const agentWalletAddress = agent['wallet'].publicKey.toBase58();
    console.log(`   My wallet: ${agentWalletAddress}`);
    const walletInfo = await agent.getWalletInfo(agentWalletAddress);
    console.log(`   SOL Balance: ${walletInfo.sol_balance.toFixed(4)}`);
    
    // Display Custom Test USDC if present
    if (walletInfo.tokens && walletInfo.tokens.length > 0) {
      const customUsdc = walletInfo.tokens.find((t: any) => 
        t.mint === process.env.USDC_MINT || t.name === 'Custom Test USDC'
      );
      if (customUsdc) {
        console.log(`   Custom Test USDC: ${customUsdc.amount.toFixed(2)} ${customUsdc.symbol}`);
      }
    }
    
    console.log(`   Token Count: ${walletInfo.token_count}`);
    console.log();
    await delay(QUERY_DELAY_MS);

    // Query 3: Get Custom Test USDC holder count
    console.log('📊 Query 3: Getting Custom Test USDC holders...');
    const customUsdcMint = process.env.USDC_MINT || 'Chkg2bcUdGuYjLKezAxH47f9dXmtDyJvmWgECr6tbDLj';
    console.log(`   Token: ${customUsdcMint}`);
    const holders = await agent.getTokenHolders(customUsdcMint);
    console.log(`   Holder Count: ${holders.holder_count}\n`);
    await delay(QUERY_DELAY_MS);

    // Query 4: Get token analytics for Custom Test USDC
    console.log('📊 Query 4: Getting Custom Test USDC analytics...');
    const analytics = await agent.getTokenAnalytics(customUsdcMint);
    console.log(`   Supply: ${analytics.supply.total.toLocaleString()}`);
    console.log(`   Holders: ${analytics.holders}`);
    if (analytics.market_cap) {
      console.log(`   Market Cap: $${analytics.market_cap.toLocaleString()}`);
    }
    console.log();
    await delay(QUERY_DELAY_MS);

    // Query 5: Get cross-chain wallet balance (Solana)
    console.log('📊 Query 5: Getting CROSS-CHAIN wallet balance (Solana)...');
    const solanaCrossChainAddress = agentWalletAddress; // Agent's Solana wallet
    console.log(`   Address: ${solanaCrossChainAddress}`);
    const solanaCrossChainBalance = await agent.getCrossChainBalance(solanaCrossChainAddress);
    
    // Display Solana balance
    if (solanaCrossChainBalance.chains?.solana && !solanaCrossChainBalance.chains.solana.error) {
      console.log(`   Solana:`);
      console.log(`     SOL: ${solanaCrossChainBalance.chains.solana.native_balance || 0} ${solanaCrossChainBalance.chains.solana.native_symbol || 'SOL'}`);
      
      // Display Custom Test USDC if present
      if (solanaCrossChainBalance.chains.solana.tokens && solanaCrossChainBalance.chains.solana.tokens.length > 0) {
        const customUsdc = solanaCrossChainBalance.chains.solana.tokens.find((t: any) => 
          t.mint === process.env.USDC_MINT
        );
        if (customUsdc) {
          console.log(`     Custom Test USDC: ${customUsdc.amount.toFixed(2)} USDC`);
        }
      }
      
      console.log(`     Tokens: ${solanaCrossChainBalance.chains.solana.token_count || 0}`);
    }
    console.log();
    await delay(QUERY_DELAY_MS);

    // Query 6: Get cross-chain wallet balance (Ethereum)
    console.log('📊 Query 6: Getting CROSS-CHAIN wallet balance (Ethereum)...');
    const ethCrossChainAddress = process.env.SERVER_ETH_WALLET || '0x6eb294b8144BA61c60e74E93Bf9Cc7990B8C5A3a';
    console.log(`   Address: ${ethCrossChainAddress}`);
    const ethCrossChainBalance = await agent.getCrossChainBalance(ethCrossChainAddress);
    
    // Display Ethereum balance
    if (ethCrossChainBalance.chains?.ethereum && !ethCrossChainBalance.chains.ethereum.error) {
      console.log(`   Ethereum:`);
      console.log(`     ETH: ${ethCrossChainBalance.chains.ethereum.native_balance || 0} ${ethCrossChainBalance.chains.ethereum.native_symbol || 'ETH'}`);
      if (ethCrossChainBalance.chains.ethereum.usdc_balance !== undefined) {
        console.log(`     USDC: ${ethCrossChainBalance.chains.ethereum.usdc_balance} USDC`);
      }
      if (ethCrossChainBalance.chains.ethereum.note) {
        console.log(`     Note: ${ethCrossChainBalance.chains.ethereum.note}`);
      }
    }
    console.log();

    // Display agent stats
    console.log('═══════════════════════════════════════════════════════');
    console.log('📈 Agent Statistics:');
    const stats = agent.getStats();
    console.log(`   Total Queries: ${stats.queriesMade}`);
    console.log(`   Successful Payments: ${stats.successfulPayments}`);
    console.log(`   Failed Payments: ${stats.failedPayments}`);
    console.log(`   Total Spent: $${stats.totalSpent.toFixed(4)} USDC`);
    console.log(`   Avg Cost/Query: $${stats.averageCostPerQuery} USDC`);
    console.log('═══════════════════════════════════════════════════════\n');

    console.log('✅ Demo completed successfully!');
    console.log('💡 The AI agent autonomously paid for each query using x402');

  } catch (error) {
    console.error('❌ Demo error:', error);
    process.exit(1);
  }
}

// Run demo if executed directly
if (require.main === module) {
  demo();
}

export default SolanaOracleAgent;
