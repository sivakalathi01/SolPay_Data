# 🚀 Setup & Testing Guide

## Complete Setup Instructions

### Step 1: Install Dependencies

```bash
npm install
```

This will install:
- `@solana/web3.js` - Solana blockchain interaction
- `@solana/spl-token` - SPL token operations
- `express` - Web server
- `axios` - HTTP client
- `bs58` - Base58 encoding
- `ethers` - Ethereum (for multi-chain support)
- TypeScript and development tools

### Step 2: Get a Solana Wallet

#### Option A: Use Phantom Wallet (Recommended for Testing)

1. Install [Phantom Wallet](https://phantom.app/)
2. Create a new wallet or import existing
3. Export private key:
   - Settings → Show Secret Recovery Phrase
   - Or: Settings → Show Private Key
4. Save as base58 string

#### Option B: Generate New Wallet with Solana CLI

```bash
# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Generate new keypair
solana-keygen new --outfile ~/solana-wallet.json

# View public address
solana-keygen pubkey ~/solana-wallet.json

# Get private key in base58 (for .env)
cat ~/solana-wallet.json
```

#### Option C: Use Code to Generate

```typescript
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

const keypair = Keypair.generate();
console.log('Public Key:', keypair.publicKey.toBase58());
console.log('Private Key:', bs58.encode(keypair.secretKey));
```

### Step 3: Fund Your Wallet with USDC

You need USDC to pay for queries. Here's how to get it:

#### On Devnet (Free Testing)

```bash
# Switch to devnet
solana config set --url devnet

# Airdrop SOL for gas
solana airdrop 2

# Note: You'll need to modify the code to use devnet USDC
```

#### On Mainnet (Real Money)

1. **Buy USDC on Exchange**
   - Purchase USDC on Coinbase, Binance, or Kraken
   - Withdraw to Solana network (cheapest)
   
2. **Swap SOL for USDC**
   - Use [Jupiter](https://jup.ag/)
   - Connect Phantom wallet
   - Swap SOL → USDC
   - Even $1 USDC = 1000 queries!

3. **Bridge from Ethereum**
   - Use [Portal Bridge](https://www.portalbridge.com/)
   - Bridge USDC from Ethereum to Solana

### Step 4: Configure Environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Your wallet that receives payments (server)
SERVER_SOLANA_WALLET=YourPublicAddressHere

# Your wallet that makes payments (client/agent)
SOLANA_PRIVATE_KEY=YourBase58PrivateKeyHere

# RPC endpoint (free tier is fine for testing)
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# Server configuration
PORT=3402
ORACLE_URL=http://localhost:3402
```

### Step 5: Test the Setup

#### Verify Your USDC Balance

```bash
# Run this to check balance
npm run demo
```

The agent will show your USDC balance. If it's 0, fund your wallet first.

#### Manual Balance Check

```bash
solana balance <YOUR_WALLET_ADDRESS>
spl-token balance EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
```

---

## Testing the Application

### Test 1: Start the Oracle Server

Terminal 1:
```bash
npm start
```

Expected output:
```
╔══════════════════════════════════════════════════════════╗
║   🤖 Solana AI Data Oracle with x402 Micropayments      ║
╚══════════════════════════════════════════════════════════╝

🌐 Server running on http://localhost:3402
💰 Payment token: USDC on Solana
📊 Protocol: x402 (HTTP 402 Payment Required)

📡 Available Data Endpoints:
  • GET  /api/v1/price/:token          - Token price ($0.01)
  • GET  /api/v1/wallet/:address       - Wallet balance ($0.005)
  ...
```

### Test 2: Check Free Endpoints

```bash
# Get pricing info
curl http://localhost:3402/api/v1/pricing

# Get service stats
curl http://localhost:3402/api/v1/stats

# Health check
curl http://localhost:3402/health
```

### Test 3: Try a Paid Endpoint (Should Return 402)

```bash
# This will return HTTP 402 Payment Required
curl -v http://localhost:3402/api/v1/price/So11111111111111111111111111111111111111112
```

Expected response:
```json
{
  "version": "1.0",
  "payment_required": true,
  "payment_methods": [{
    "type": "solana-transfer",
    "chain": "solana",
    "token": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    "amount": "10000",
    "recipient": "..."
  }],
  "resource": "/api/v1/price/So11...",
  "description": "Solana token-price data query"
}
```

### Test 4: Run the AI Agent Demo

Terminal 2:
```bash
npm run demo
```

Expected output:
```
╔════════════════════════════════════════════════════════╗
║     🤖 Autonomous AI Agent Demo - x402 + Solana       ║
╚════════════════════════════════════════════════════════╝

🤖 AI Agent initialized
   Wallet: 9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM
   Oracle: http://localhost:3402

💰 Current USDC balance: $10.00

📊 Query 1: Getting SOL price...
💳 Payment required for /api/v1/price/So11...
   Amount: 0.01 USDC
   Transaction: 5j7s8k2m...
✅ Payment verified, data received
   SOL Price: $98.45

📊 Query 2: Getting wallet information...
💳 Payment required for /api/v1/wallet/9WzD...
   Amount: 0.005 USDC
✅ Payment verified, data received
   SOL Balance: 2.5432
   Token Count: 15

═══════════════════════════════════════════════════════
📈 Agent Statistics:
   Total Queries: 4
   Successful Payments: 4
   Total Spent: $0.365 USDC
   Avg Cost/Query: $0.0912 USDC
═══════════════════════════════════════════════════════

✅ Demo completed successfully!
```

### Test 5: Check the Dashboard

Open browser to: `http://localhost:3402`

You should see:
- Total queries: 4
- Total revenue: $0.365
- Recent transactions with signatures
- Query distribution chart

---

## Troubleshooting

### Error: "Insufficient USDC balance"

**Solution**: Fund your wallet with USDC
- Minimum: $0.50 for testing
- Recommended: $5 for full demo

### Error: "Transaction not found"

**Causes**:
1. Transaction hasn't confirmed yet (wait 1-2 seconds)
2. RPC endpoint is slow (use paid RPC)
3. Wrong network (devnet vs mainnet)

**Solution**:
```env
# Use faster RPC
SOLANA_RPC_URL=https://solana-mainnet.g.alchemy.com/v2/YOUR_KEY
```

### Error: "Cannot find module"

**Solution**: Install dependencies
```bash
rm -rf node_modules package-lock.json
npm install
```

### Error: "Port 3402 already in use"

**Solution**: Kill existing process or change port
```bash
# Windows
netstat -ano | findstr :3402
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:3402 | xargs kill -9

# Or change port in .env
PORT=3403
```

### Warning: "Low USDC balance"

This is just a warning. You can still run queries if you have enough for at least one.

### Dashboard not loading

**Causes**:
1. Server not running
2. Wrong URL
3. Browser cache

**Solution**:
```bash
# Ensure server is running
npm start

# Open in incognito mode
# or clear cache (Ctrl+Shift+R)
```

---

## Advanced Testing

### Test with Custom Tokens

```bash
# Get price of any Solana token
curl -H "X-Payment-Method: solana-transfer" \
     -H "X-Payment-Signature: YOUR_TX_SIG" \
     -H "X-Payment-From: YOUR_ADDRESS" \
     http://localhost:3402/api/v1/price/BONK_MINT_ADDRESS
```

### Load Testing

```bash
# Install artillery
npm install -g artillery

# Create test config
cat > load-test.yml << EOF
config:
  target: "http://localhost:3402"
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - name: "Get pricing"
    flow:
      - get:
          url: "/api/v1/pricing"
EOF

# Run load test
artillery run load-test.yml
```

### Monitor Solana Transactions

```bash
# View transaction in explorer
https://solscan.io/tx/YOUR_SIGNATURE

# CLI check
solana confirm YOUR_SIGNATURE
```

---

## Production Deployment

### Option 1: Railway

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and deploy
railway login
railway init
railway up

# Set environment variables
railway variables set SERVER_SOLANA_WALLET=...
```

### Option 2: Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in dashboard
```

### Option 3: Fly.io

```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Launch app
fly launch

# Set secrets
fly secrets set SERVER_SOLANA_WALLET=...
```

---

## Next Steps

1. ✅ Run the demo successfully
2. 📝 Read the [x402 Protocol Overview](./x402-protocol-overview.md)
3. 🔧 Modify pricing in `src/oracle-server.ts`
4. 🚀 Add custom data endpoints
5. 🌐 Deploy to production
6. 💰 Start earning from your API!

---

## Support

If you encounter issues:
1. Check this troubleshooting guide
2. Review the error message carefully
3. Search issues on GitHub
4. Open a new issue with full error details

Happy building! 🚀
