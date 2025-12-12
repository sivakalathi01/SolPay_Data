import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { createMint, getOrCreateAssociatedTokenAccount, mintTo } from '@solana/spl-token';
import bs58 from 'bs58';
import dotenv from 'dotenv';

dotenv.config();

async function createOwnUSDC() {
  try {
    if (!process.env.SOLANA_PRIVATE_KEY || process.env.SOLANA_PRIVATE_KEY === 'your_base58_encoded_private_key') {
      console.error('❌ Please set SOLANA_PRIVATE_KEY in your .env file');
      process.exit(1);
    }

    console.log('🔗 Connecting to Solana Devnet...');
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    
    const privateKeyBytes = bs58.decode(process.env.SOLANA_PRIVATE_KEY);
    const payer = Keypair.fromSecretKey(privateKeyBytes);
    
    console.log(`💰 Wallet: ${payer.publicKey.toBase58()}`);
    
    const balance = await connection.getBalance(payer.publicKey);
    console.log(`💵 SOL Balance: ${balance / 1e9} SOL`);
    
    if (balance < 0.01e9) {
      console.log('\n⚠️  You need more SOL for transaction fees!');
      console.log(`Run: solana airdrop 2 ${payer.publicKey.toBase58()} --url devnet`);
      console.log('Or visit: https://faucet.solana.com');
      process.exit(1);
    }

    console.log('\n🪙 Creating your own USDC-like token (you will be the mint authority)...');
    
    const mint = await createMint(
      connection,
      payer,
      payer.publicKey, // mint authority
      payer.publicKey, // freeze authority
      6 // decimals (same as USDC)
    );
    
    console.log(`✅ Token Created: ${mint.toBase58()}`);
    console.log(`🔍 View on Explorer: https://explorer.solana.com/address/${mint.toBase58()}?cluster=devnet`);
    
    console.log('\n📝 Creating token account...');
    const tokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      mint,
      payer.publicKey
    );
    
    console.log(`✅ Token Account: ${tokenAccount.address.toBase58()}`);
    
    const amount = 1000_000_000; // 1000 tokens with 6 decimals
    console.log(`\n💎 Minting ${amount / 1e6} tokens to yourself...`);
    
    const signature = await mintTo(
      connection,
      payer,
      mint,
      tokenAccount.address,
      payer, // you are the mint authority!
      amount
    );
    
    console.log(`✅ Minted! Transaction: ${signature}`);
    console.log(`🔍 View Transaction: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
    
    const tokenBalance = await connection.getTokenAccountBalance(tokenAccount.address);
    console.log(`\n💰 Your Token Balance: ${tokenBalance.value.uiAmount} tokens`);
    
    console.log('\n' + '='.repeat(70));
    console.log('📋 IMPORTANT: Update your .env file with this token address:');
    console.log('='.repeat(70));
    console.log(`USDC_MINT=${mint.toBase58()}`);
    console.log('='.repeat(70));
    console.log('\n✨ Now you can mint tokens anytime using mint-usdc.ts with this address!');
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createOwnUSDC();
