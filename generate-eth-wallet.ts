import { ethers } from 'ethers';

// Generate a new Ethereum wallet
const wallet = ethers.Wallet.createRandom();

console.log('🔑 New Ethereum Server Wallet Generated:');
console.log('='.repeat(70));
console.log(`Address (add to .env as SERVER_ETH_WALLET):`);
console.log(wallet.address);
console.log('='.repeat(70));
console.log('\nAdd this to your .env file:');
console.log(`SERVER_ETH_WALLET=${wallet.address}`);
console.log('\n⚠️  Note: This is just the public address. You don\'t need the private key');
console.log('since the server only receives payments, it doesn\'t send them.');
console.log('\n💡 If you ever need the private key (for withdrawals), save it securely:');
console.log(`Private Key: ${wallet.privateKey}`);
console.log('\n⚠️  IMPORTANT: Never commit private keys to Git!');
