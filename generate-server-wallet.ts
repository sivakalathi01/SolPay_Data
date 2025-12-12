import { Keypair } from '@solana/web3.js';

// Generate a new server wallet
const serverWallet = Keypair.generate();

console.log('🔑 New Server Wallet Generated:');
console.log('='.repeat(70));
console.log(`Public Key (add to .env as SERVER_SOLANA_WALLET):`);
console.log(serverWallet.publicKey.toBase58());
console.log('='.repeat(70));
console.log('\nAdd this to your .env file:');
console.log(`SERVER_SOLANA_WALLET=${serverWallet.publicKey.toBase58()}`);
console.log('\n⚠️  Note: This is just the public key. You don\'t need the private key');
console.log('since the server only receives payments, it doesn\'t send them.');
