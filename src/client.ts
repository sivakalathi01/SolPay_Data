import axios, { AxiosError } from 'axios';
import { Connection, Keypair, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { getAssociatedTokenAddress, createTransferInstruction } from '@solana/spl-token';
import { ethers } from 'ethers';
import bs58 from 'bs58';
import { PaymentInvoice, PaymentMethod, EIP4337UserOperation } from './types';

/**
 * x402 Client - Handles HTTP 402 responses and automatic payments
 */
export class X402Client {
  private solanaConnection?: Connection;
  private solanaKeypair?: Keypair;
  private ethereumWallet?: ethers.Wallet;
  private preferredChain: 'solana' | 'ethereum' = 'solana';

  constructor(config?: {
    solanaRpcUrl?: string;
    solanaPrivateKey?: string;
    ethereumRpcUrl?: string;
    ethereumPrivateKey?: string;
    preferredChain?: 'solana' | 'ethereum';
  }) {
    if (config?.solanaRpcUrl && config?.solanaPrivateKey) {
      this.solanaConnection = new Connection(config.solanaRpcUrl);
      this.solanaKeypair = Keypair.fromSecretKey(bs58.decode(config.solanaPrivateKey));
    }

    if (config?.ethereumRpcUrl && config?.ethereumPrivateKey) {
      const provider = new ethers.JsonRpcProvider(config.ethereumRpcUrl);
      this.ethereumWallet = new ethers.Wallet(config.ethereumPrivateKey, provider);
    }

    if (config?.preferredChain) {
      this.preferredChain = config.preferredChain;
    }
  }

  /**
   * Make a request to an x402-enabled API
   * Automatically handles 402 responses and payment
   */
  async request(url: string, options?: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    data?: any;
    headers?: Record<string, string>;
    autoRetry?: boolean;
  }): Promise<any> {
    const method = options?.method || 'GET';
    const autoRetry = options?.autoRetry !== false;

    try {
      // Make initial request
      const response = await axios({
        method,
        url,
        data: options?.data,
        headers: options?.headers,
        validateStatus: (status) => status < 500, // Don't throw on 402
      });

      // If not 402, return response
      if (response.status !== 402) {
        return response.data;
      }

      // Handle 402 Payment Required
      if (!autoRetry) {
        throw new Error('Payment required and autoRetry is disabled');
      }

      const invoice: PaymentInvoice = response.data;
      console.log('💳 Payment required for:', invoice.description);
      console.log('💰 Amount:', invoice.payment_methods[0]?.amount, invoice.payment_methods[0]?.token_symbol);

      // Process payment
      const paymentHeaders = await this.processPayment(invoice);

      // Retry request with payment
      const paidResponse = await axios({
        method,
        url,
        data: options?.data,
        headers: {
          ...options?.headers,
          ...paymentHeaders,
        },
      });

      console.log('✅ Payment verified, resource accessed');
      return paidResponse.data;

    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Request failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Process payment based on invoice
   */
  private async processPayment(invoice: PaymentInvoice): Promise<Record<string, string>> {
    // Select payment method based on preference and availability
    let selectedMethod: PaymentMethod | undefined;

    if (this.preferredChain === 'solana' && this.solanaKeypair) {
      selectedMethod = invoice.payment_methods.find(m => m.type === 'solana-transfer');
    } else if (this.preferredChain === 'ethereum' && this.ethereumWallet) {
      // Prefer EIP-4337 if available, fallback to EIP-3009
      selectedMethod = invoice.payment_methods.find(m => m.type === 'eip-4337') ||
                      invoice.payment_methods.find(m => m.type === 'eip-3009');
    }

    // Fallback to any available method
    if (!selectedMethod) {
      if (this.solanaKeypair) {
        selectedMethod = invoice.payment_methods.find(m => m.type === 'solana-transfer');
      } else if (this.ethereumWallet) {
        selectedMethod = invoice.payment_methods.find(m => 
          m.type === 'eip-4337' || m.type === 'eip-3009'
        );
      }
    }

    if (!selectedMethod) {
      throw new Error('No compatible payment method found');
    }

    // Execute payment based on type
    switch (selectedMethod.type) {
      case 'solana-transfer':
        return await this.paySolana(selectedMethod);
      
      case 'eip-3009':
        return await this.payEIP3009(selectedMethod);
      
      case 'eip-4337':
        return await this.payEIP4337(selectedMethod);
      
      default:
        throw new Error(`Unsupported payment method: ${selectedMethod.type}`);
    }
  }

  /**
   * Pay using Solana
   */
  private async paySolana(method: PaymentMethod): Promise<Record<string, string>> {
    if (!this.solanaConnection || !this.solanaKeypair) {
      throw new Error('Solana wallet not configured');
    }

    console.log('💸 Sending Solana payment...');

    const recipientPubkey = new PublicKey(method.recipient);
    const tokenMint = new PublicKey(method.token);
    const amount = BigInt(method.amount);

    // Get token accounts
    const senderTokenAccount = await getAssociatedTokenAddress(
      tokenMint,
      this.solanaKeypair.publicKey
    );

    const recipientTokenAccount = await getAssociatedTokenAddress(
      tokenMint,
      recipientPubkey
    );

    // Create transfer instruction
    const transferInstruction = createTransferInstruction(
      senderTokenAccount,
      recipientTokenAccount,
      this.solanaKeypair.publicKey,
      amount
    );

    // Create and send transaction
    const transaction = new Transaction().add(transferInstruction);
    const signature = await sendAndConfirmTransaction(
      this.solanaConnection,
      transaction,
      [this.solanaKeypair]
    );

    console.log('✅ Solana payment sent:', signature);

    return {
      'x-payment-method': 'solana-transfer',
      'x-payment-signature': signature,
      'x-payment-from': this.solanaKeypair.publicKey.toString(),
      'x-payment-tx-hash': signature,
    };
  }

  /**
   * Pay using EIP-3009 (transferWithAuthorization)
   */
  private async payEIP3009(method: PaymentMethod): Promise<Record<string, string>> {
    if (!this.ethereumWallet) {
      throw new Error('Ethereum wallet not configured');
    }

    console.log('💸 Creating EIP-3009 payment authorization...');

    const now = Math.floor(Date.now() / 1000);
    const nonce = ethers.hexlify(ethers.randomBytes(32));
    const validAfter = now;
    const validBefore = method.valid_until || (now + 3600);

    // Create EIP-712 domain
    const domain = {
      name: 'USD Coin',
      version: '2',
      chainId: method.chain_id || 1,
      verifyingContract: method.token,
    };

    // Create types
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

    // Create message
    const message = {
      from: this.ethereumWallet.address,
      to: method.recipient,
      value: method.amount,
      validAfter,
      validBefore,
      nonce,
    };

    // Sign
    const signature = await this.ethereumWallet.signTypedData(domain, types, message);

    console.log('✅ EIP-3009 authorization created');

    return {
      'x-payment-method': 'eip-3009',
      'x-payment-signature': signature,
      'x-payment-from': this.ethereumWallet.address,
      'x-payment-nonce': nonce,
      'x-payment-valid-after': validAfter.toString(),
      'x-payment-valid-before': validBefore.toString(),
    };
  }

  /**
   * Pay using EIP-4337 Account Abstraction
   */
  private async payEIP4337(method: PaymentMethod): Promise<Record<string, string>> {
    if (!this.ethereumWallet) {
      throw new Error('Ethereum wallet not configured');
    }

    console.log('💸 Creating EIP-4337 UserOperation...');

    // This is a simplified example. In a real implementation, you would:
    // 1. Create a UserOperation that includes a USDC transfer in the callData
    // 2. Sign the UserOperation
    // 3. Send it to the bundler
    // 4. Wait for inclusion and get the userOpHash

    // Create callData for USDC transfer
    const usdcInterface = new ethers.Interface([
      'function transfer(address to, uint256 amount) returns (bool)',
    ]);

    const callData = usdcInterface.encodeFunctionData('transfer', [
      method.recipient,
      method.amount,
    ]);

    // Simplified UserOperation (in production, you'd use a library like userop or @account-abstraction/sdk)
    const userOp: Partial<EIP4337UserOperation> = {
      sender: this.ethereumWallet.address, // In reality, this would be your smart account address
      nonce: '0x0',
      initCode: '0x',
      callData,
      callGasLimit: '100000',
      verificationGasLimit: '150000',
      preVerificationGas: '21000',
      maxFeePerGas: '1000000000',
      maxPriorityFeePerGas: '1000000000',
      paymasterAndData: '0x', // Could use a paymaster here
      signature: '0x',
    };

    // Sign the UserOperation (simplified)
    const userOpHash = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'uint256', 'bytes'],
        [userOp.sender, userOp.nonce, userOp.callData]
      )
    );

    userOp.signature = await this.ethereumWallet.signMessage(ethers.getBytes(userOpHash));

    // In a real implementation, send to bundler
    // const bundlerUrl = method.bundler || 'https://api.stackup.sh/v1/node/your-api-key';
    // await axios.post(bundlerUrl, {
    //   jsonrpc: '2.0',
    //   id: 1,
    //   method: 'eth_sendUserOperation',
    //   params: [userOp, method.entrypoint],
    // });

    console.log('✅ EIP-4337 UserOperation created');

    return {
      'x-payment-method': 'eip-4337',
      'x-payment-signature': userOp.signature!,
      'x-payment-from': this.ethereumWallet.address,
      'x-payment-user-op-hash': userOpHash,
    };
  }
}

/**
 * Example usage
 */
async function main() {
  // Initialize client
  const client = new X402Client({
    solanaRpcUrl: 'https://api.mainnet-beta.solana.com',
    solanaPrivateKey: process.env.SOLANA_PRIVATE_KEY,
    ethereumRpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/your-api-key',
    ethereumPrivateKey: process.env.ETHEREUM_PRIVATE_KEY,
    preferredChain: 'ethereum', // Use 'solana' or 'ethereum'
  });

  try {
    console.log('🔄 Testing x402 client...\n');

    // Test public endpoint (no payment required)
    console.log('📡 Requesting public endpoint...');
    const publicData = await client.request('http://localhost:3402/api/public/hello');
    console.log('Response:', publicData);
    console.log('');

    // Test premium endpoint (requires payment)
    console.log('📡 Requesting premium endpoint...');
    const premiumData = await client.request('http://localhost:3402/api/premium/data');
    console.log('Response:', premiumData);
    console.log('');

    // Test AI completion endpoint
    console.log('📡 Requesting AI completion...');
    const aiData = await client.request('http://localhost:3402/api/premium/ai/complete', {
      method: 'POST',
      data: { prompt: 'What is the meaning of life?' },
    });
    console.log('Response:', aiData);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export default X402Client;
