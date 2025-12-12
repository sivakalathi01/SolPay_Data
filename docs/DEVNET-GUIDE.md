# 🪂 Getting Devnet Tokens - Quick Guide

## Why Devnet?

Devnet (Solana's test network) is **completely free** and perfect for testing the x402 oracle without spending real money. You can get unlimited free SOL and create your own test USDC tokens!

## Step 1: Get Devnet SOL (Free!)

### Option A: Using Solana CLI (Recommended)

```bash
# Install Solana CLI if you haven't
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Configure to use devnet
solana config set --url devnet

# Request airdrop (can do this multiple times)
solana airdrop 2

# Check your balance
solana balance
```

### Option B: Using Web Faucet

1. Visit https://faucet.solana.com/
2. Enter your wallet address
3. Click "Confirm Airdrop"
4. Wait 10-30 seconds

### Option C: Programmatically in Code

```typescript
import { Connection, LAMPORTS_PER_SOL, clusterApiUrl } from '@solana/web3.js';

const connection = new Connection(clusterApiUrl('devnet'));

// Request 2 SOL airdrop
const signature = await connection.requestAirdrop(
  yourPublicKey,
  2 * LAMPORTS_PER_SOL
);

await connection.confirmTransaction(signature);
```

## Step 2: Get Devnet USDC

### Option A: Mint Your Own Test USDC (Easiest)

```bash
# Install SPL Token CLI
cargo install spl-token-cli

# Create a test USDC token (you'll be the mint authority!)
spl-token create-token --decimals 6

# This outputs a Token Address - save this!
# Example: Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr

# Create an associated token account
spl-token create-account <TOKEN_ADDRESS>

# Mint yourself some test USDC (1 million USDC!)
spl-token mint <TOKEN_ADDRESS> 1000000

# Check balance
spl-token balance <TOKEN_ADDRESS>
```

### Option B: Use Existing Devnet USDC Faucet

Some devnet USDC faucets:
- https://spl-token-faucet.com/ (community faucet)
- Devnet USDC mint: `Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr`

### Option C: Using TypeScript

```typescript
import { 
  Connection, 
  Keypair, 
  Transaction,
  clusterApiUrl 
} from '@solana/web3.js';
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';

const connection = new Connection(clusterApiUrl('devnet'));
const payer = Keypair.fromSecretKey(/* your secret key */);

// Create a new token (test USDC)
const mint = await createMint(
  connection,
  payer,
  payer.publicKey, // mint authority
  null,
  6 // decimals (same as USDC)
);

console.log('Test USDC Mint:', mint.toBase58());

// Create token account
const tokenAccount = await getOrCreateAssociatedTokenAccount(
  connection,
  payer,
  mint,
  payer.publicKey
);

// Mint 1,000 USDC to yourself
await mintTo(
  connection,
  payer,
  mint,
  tokenAccount.address,
  payer.publicKey,
  1_000_000_000 // 1000 USDC (6 decimals)
);

console.log('Minted 1,000 test USDC!');
```

## Step 3: Configure the Oracle

Update your `.env` file:

```env
# Use devnet
SOLANA_RPC_URL=https://api.devnet.solana.com

# Your wallet (has devnet SOL and test USDC)
SERVER_SOLANA_WALLET=YourDevnetPublicKey
SOLANA_PRIVATE_KEY=YourDevnetPrivateKey

# If you created custom USDC, add the mint address
USDC_MINT=YourTestUSDCMintAddress

# Otherwise, use the default devnet USDC
# USDC_MINT=Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr
```

## Step 4: Test It!

```bash
# Start the server
npm start

# In another terminal, run the agent
npm run demo
```

## Quick Commands Reference

```bash
# Airdrop SOL
solana airdrop 2 --url devnet

# Check SOL balance
solana balance --url devnet

# Check USDC balance
spl-token balance <USDC_MINT_ADDRESS> --url devnet

# List all token accounts
spl-token accounts --url devnet

# Create token account for specific mint
spl-token create-account <MINT_ADDRESS> --url devnet

# Mint more test USDC
spl-token mint <MINT_ADDRESS> 100 --url devnet
```

## Using a Test Wallet

### Generate New Devnet Wallet

```bash
# Generate new keypair
solana-keygen new --outfile ~/devnet-wallet.json

# Get public key
solana-keygen pubkey ~/devnet-wallet.json

# Airdrop SOL
solana airdrop 2 $(solana-keygen pubkey ~/devnet-wallet.json) --url devnet

# Export private key for .env (base58 format)
# On macOS/Linux:
cat ~/devnet-wallet.json | jq -r '.[0:32]' | base58

# On Windows PowerShell:
# Use a Solana tool or manually convert the JSON array to base58
```

### Or Use Code

```typescript
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

// Generate new wallet
const wallet = Keypair.generate();

console.log('Public Key:', wallet.publicKey.toBase58());
console.log('Private Key (base58):', bs58.encode(wallet.secretKey));

// Save these to your .env file!
```

## Common Issues

### "Transaction too large"
**Solution**: You're trying to airdrop too much. Max is 2-5 SOL per request. Just request multiple times.

```bash
solana airdrop 2 --url devnet
solana airdrop 2 --url devnet
solana airdrop 2 --url devnet
```

### "Airdrop request failed"
**Solution**: Rate limited. Wait 1-2 minutes and try again.

### "Token account not found"
**Solution**: Create the associated token account first.

```bash
spl-token create-account <MINT_ADDRESS> --url devnet
```

### "Insufficient funds"
**Solution**: Get more devnet SOL for transaction fees.

```bash
solana airdrop 1 --url devnet
```

## Devnet vs Mainnet Comparison

| Feature | Devnet | Mainnet |
|---------|--------|---------|
| SOL Cost | FREE (airdrops) | Real money |
| USDC | Test tokens (free) | Real USDC |
| Transaction Fees | FREE | ~$0.00025 |
| Data | Test/dummy data | Real blockchain data |
| Reset | Occasionally | Never |
| Good for | Testing, development | Production |

## Production Deployment

Once you've tested on devnet, switching to mainnet is easy:

1. Change `SOLANA_RPC_URL` to `https://api.mainnet-beta.solana.com`
2. Update `USDC_MINT` to mainnet USDC: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`
3. Use a mainnet wallet with real USDC
4. That's it!

## Resources

- **Devnet Faucet**: https://faucet.solana.com/
- **Devnet Explorer**: https://explorer.solana.com/?cluster=devnet
- **SPL Token Faucet**: https://spl-token-faucet.com/
- **Solana Cookbook**: https://solanacookbook.com/

## Pro Tips

1. **Bookmark the faucet** - You'll use it often during development
2. **Create multiple test wallets** - One for server, one for client testing
3. **Mint generous amounts** - 1 million test USDC is fine, it's free!
4. **Check Explorer** - Verify transactions at https://explorer.solana.com/?cluster=devnet
5. **Save your mint address** - You might need to mint more tokens later

---

**Happy Testing!** 🚀

Remember: Devnet tokens have **zero value** - feel free to experiment without worry!
