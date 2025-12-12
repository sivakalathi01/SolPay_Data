import { Connection, PublicKey } from '@solana/web3.js';
import { getOrCreateAssociatedTokenAccount, getAccount } from '@solana/spl-token';
import bs58 from 'bs58';
import dotenv from 'dotenv';

dotenv.config();

async function setupTokenAccounts() {
  try {
    console.log('🔧 Setting up token accounts for both wallets...\n');
    
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    const mintAddress = new PublicKey(process.env.USDC_MINT!);
    
    console.log(`Token Mint: ${mintAddress.toBase58()}\n`);
    
    // Setup for agent (payer)
    if (!process.env.SOLANA_PRIVATE_KEY || process.env.SOLANA_PRIVATE_KEY === 'your_base58_encoded_private_key') {
      console.error('❌ SOLANA_PRIVATE_KEY not set in .env');
      process.exit(1);
    }
    
    const { Keypair } = await import('@solana/web3.js');
    const privateKeyBytes = bs58.decode(process.env.SOLANA_PRIVATE_KEY);
    const payer = Keypair.fromSecretKey(privateKeyBytes);
    
    console.log(`👤 Agent Wallet: ${payer.publicKey.toBase58()}`);
    
    // Check SOL balance
    const balance = await connection.getBalance(payer.publicKey);
    console.log(`   SOL Balance: ${balance / 1e9} SOL`);
    
    if (balance < 0.01e9) {
      console.log('   ⚠️  Need more SOL for fees!');
      console.log(`   Get from: https://faucet.solana.com\n`);
    }
    
    // Create token account for agent
    console.log('   Creating/checking token account...');
    const agentTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      mintAddress,
      payer.publicKey
    );
    console.log(`   ✅ Token Account: ${agentTokenAccount.address.toBase58()}`);
    
    const agentBalance = await connection.getTokenAccountBalance(agentTokenAccount.address);
    console.log(`   💰 Token Balance: ${agentBalance.value.uiAmount} tokens\n`);
    
    // Setup for server wallet (recipient)
    if (!process.env.SERVER_SOLANA_WALLET || process.env.SERVER_SOLANA_WALLET === 'your_solana_public_key_here') {
      console.log('⚠️  SERVER_SOLANA_WALLET not set in .env, skipping...\n');
    } else {
      const serverWallet = new PublicKey(process.env.SERVER_SOLANA_WALLET);
      console.log(`🏦 Server Wallet: ${serverWallet.toBase58()}`);
      
      // Create token account for server
      console.log('   Creating/checking token account...');
      const serverTokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        payer,  // Agent pays for creating server's token account
        mintAddress,
        serverWallet
      );
      console.log(`   ✅ Token Account: ${serverTokenAccount.address.toBase58()}`);
      
      const serverBalance = await connection.getTokenAccountBalance(serverTokenAccount.address);
      console.log(`   💰 Token Balance: ${serverBalance.value.uiAmount} tokens\n`);
    }
    
    console.log('✅ Setup complete! Both wallets are ready to send/receive tokens.');
    console.log('\nYou can now run: npm run demo');
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

setupTokenAccounts();
