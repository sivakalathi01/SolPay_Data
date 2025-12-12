import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { mintTo, getOrCreateAssociatedTokenAccount } from '@solana/spl-token';
import bs58 from 'bs58';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function mintDevnetUSDC() {
  try {
    // Check if private key is set
    if (!process.env.SOLANA_PRIVATE_KEY || process.env.SOLANA_PRIVATE_KEY === 'your_base58_encoded_private_key') {
      console.error('❌ Please set SOLANA_PRIVATE_KEY in your .env file');
      console.log('\nHow to get your private key:');
      console.log('1. From Phantom: Settings → Security & Privacy → Show Private Key');
      console.log('2. From Solana CLI: cat ~/.config/solana/id.json (convert array to base58)');
      process.exit(1);
    }

    console.log('🔗 Connecting to Solana Devnet...');
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    
    // Decode private key from base58
    const privateKeyBytes = bs58.decode(process.env.SOLANA_PRIVATE_KEY);
    const payer = Keypair.fromSecretKey(privateKeyBytes);
    
    console.log(`💰 Wallet: ${payer.publicKey.toBase58()}`);
    
    // Check SOL balance first
    const balance = await connection.getBalance(payer.publicKey);
    console.log(`💵 SOL Balance: ${balance / 1e9} SOL`);
    
    if (balance === 0) {
      console.log('\n⚠️  You need SOL for transaction fees!');
      console.log(`Run: solana airdrop 2 ${payer.publicKey.toBase58()} --url devnet`);
      console.log('Or visit: https://faucet.solana.com');
      process.exit(1);
    }
    
    const mintAddress = new PublicKey('Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr');
    
    console.log('\n📝 Creating/Getting USDC token account...');
    const tokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      mintAddress,
      payer.publicKey
    );
    
    console.log(`✅ Token Account: ${tokenAccount.address.toBase58()}`);
    
    const amount = 100_000_000; // 100 USDC (6 decimals)
    console.log(`\n🪙 Minting ${amount / 1e6} USDC...`);
    
    const signature = await mintTo(
      connection,
      payer,
      mintAddress,
      tokenAccount.address,
      payer, // On devnet, anyone can be mint authority
      amount
    );
    
    console.log(`✅ Success! Transaction: ${signature}`);
    console.log(`🔍 View: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
    console.log(`🔍 View on Solana Explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
    
    // Check new balance
    const tokenBalance = await connection.getTokenAccountBalance(tokenAccount.address);
    console.log(`\n💎 Your USDC Balance: ${tokenBalance.value.uiAmount} USDC`);
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    
    if (error.message.includes('mint authority')) {
      console.log('\n⚠️  Note: This mint address might not allow public minting on devnet.');
      console.log('Try using the official devnet USDC faucet or CLI commands instead.');
    }
    
    process.exit(1);
  }
}

mintDevnetUSDC();
