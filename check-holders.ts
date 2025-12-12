import { Connection, PublicKey } from '@solana/web3.js';
import dotenv from 'dotenv';

dotenv.config();

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
const mint = new PublicKey(process.env.USDC_MINT!);

async function checkHolders() {
  console.log('Checking holders for mint:', mint.toString());
  console.log('');
  
  // Get all token accounts for this mint
  const accounts = await connection.getProgramAccounts(
    new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
    {
      filters: [
        { dataSize: 165 },
        {
          memcmp: {
            offset: 0,
            bytes: mint.toBase58(),
          },
        },
      ],
    }
  );
  
  console.log('📊 Total token accounts found:', accounts.length);
  console.log('');
  
  for (const account of accounts) {
    const data = account.account.data;
    const owner = new PublicKey(data.slice(32, 64));
    const amount = data.readBigUInt64LE(64);
    
    console.log('Token Account:', account.pubkey.toString());
    console.log('  Owner Wallet:', owner.toString());
    console.log('  Balance:', (Number(amount) / 1_000_000).toFixed(6), 'USDC');
    console.log('');
  }
  
  if (accounts.length === 0) {
    console.log('⚠️  No token accounts found!');
    console.log('This means the minted tokens might be in the mint authority wallet directly,');
    console.log('but no associated token accounts were created yet.');
  }
}

checkHolders().catch(console.error);
