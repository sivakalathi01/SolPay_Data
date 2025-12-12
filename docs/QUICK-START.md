# 🚀 Quick Start Guide for Judges

**Time to first query: 5 minutes**

This guide will get you up and running with the AI-powered blockchain oracle in the fastest way possible.

---

## ✅ Pre-requisites

- **Node.js** 18+ installed
- **Git** installed
- **Solana wallet** with devnet SOL (we'll help you get this)

That's it! No API keys, no accounts, no credit cards needed.

---

## 📦 Step 1: Clone and Install (1 minute)

```bash
# Clone the repository
git clone https://github.com/yourusername/SolPay.git
cd SolPay

# Install dependencies
npm install
```

---

## 🔑 Step 2: Create Wallet (1 minute)

You need a Solana wallet with some devnet SOL and USDC. We've made this super easy:

### Option A: Generate New Wallet (Recommended)

```bash
# Generate a new Solana keypair
npx solana-keygen new --no-bip39-passphrase --outfile wallet.json

# Get the public key (you'll need this)
npx solana-keygen pubkey wallet.json
```

### Option B: Use Existing Wallet

If you already have a Solana wallet, export the private key in base58 format.

---

## 💰 Step 3: Get Devnet SOL & USDC (2 minutes)

### Get SOL (for transaction fees)

```bash
# Airdrop 2 SOL to your wallet
solana airdrop 2 <YOUR_PUBLIC_KEY> --url devnet
```

Or use the web faucet: https://faucet.solana.com/

### Get USDC (for oracle payments)

We've created a custom USDC token for testing. Run our setup script:

```bash
# Set your private key
export SOLANA_PRIVATE_KEY="your_base58_private_key"

# Create and mint USDC tokens
npm run setup-usdc
```

This will:
- Create a custom USDC token (you'll be the mint authority)
- Mint 1000 USDC to your wallet
- Set up token accounts

**OR** manually create `.env` file:

```bash
# Copy example env file
cp .env.example .env

# Edit .env and add your private key
nano .env
```

Add this line to `.env`:
```
SOLANA_PRIVATE_KEY=your_base58_private_key_here
```

---

## 🎬 Step 4: Start the Oracle Server (30 seconds)

In one terminal:

```bash
npm start
```

You should see:
```
╔══════════════════════════════════════════════════════════╗
║   🤖 Solana AI Data Oracle with x402 Micropayments      ║
╚══════════════════════════════════════════════════════════╝

🌐 Server running on http://localhost:3402
💰 Payment token: USDC on Solana
📊 Protocol: x402 (HTTP 402 Payment Required)
```

---

## 🤖 Step 5: Run the AI Agent (30 seconds)

In a **second terminal**:

```bash
npm run ai
```

You'll see an interactive chat interface:
```
╔═══════════════════════════════════════════════════════════╗
║        🤖 AI-Powered Blockchain Oracle Assistant         ║
╚═══════════════════════════════════════════════════════════╝

💡 I can answer questions about blockchain data by automatically
   querying the oracle and paying with USDC!

You: 
```

---

## 🎯 Step 6: Try It Out! (2 minutes)

### Example Queries to Try

Type these questions into the AI agent:

#### 1. **Check Solana Price**
```
You: What's the current price of Solana?
```

Watch the agent:
- 🔍 Detect it needs price data
- 💳 Automatically pay $0.01 USDC
- ✅ Receive real-time SOL price from CoinGecko
- 🔗 Show Solana Explorer transaction link

#### 2. **Check Your Wallet Balance**
```
You: What's in my wallet?
```

The agent will:
- 💰 Pay $0.005 USDC
- 📊 Show your SOL balance
- 🪙 List all your tokens (including Custom Test USDC)

#### 3. **Token Analytics**
```
You: Show me analytics for USDC
```

The agent will:
- 💸 Pay $0.20 USDC (comprehensive data)
- 📈 Show total supply
- 👥 Show number of holders
- 💵 Show market cap (if available)

#### 4. **Check Ethereum Balance** (Cross-chain!)
```
You: What's my Ethereum balance?
```

The agent will:
- 🌉 Query cross-chain endpoint
- 💎 Show ETH balance on Sepolia testnet
- 💰 Show USDC balance on Ethereum

#### 5. **Ask Anything!**
```
You: How many people hold USDC tokens?
You: What are my recent transactions?
You: Show me the current SOL price in USD
```

The AI understands natural language and picks the right oracle endpoints!

---

## 📊 Step 7: Verify on Blockchain

After each query, you'll see transaction links like:
```
🔍 View: https://explorer.solana.com/tx/5Dh7L3Y4cBSb...?cluster=devnet
```

Click these to see:
- ✅ Your USDC payment transaction
- 📍 From: Your wallet
- 📍 To: Server wallet
- 💰 Amount: Exact oracle pricing
- ⏱️ Confirmation time: ~400ms

---

## 🎥 What to Look For (Judge Checklist)

### ✅ Autonomous Payments
- [ ] Agent detects 402 Payment Required
- [ ] Agent automatically creates USDC transfer
- [ ] Agent sends transaction without human intervention
- [ ] Payment verified on-chain

### ✅ Real Data
- [ ] SOL price matches current market price (check CoinGecko)
- [ ] Wallet balances are accurate
- [ ] Token holder counts are real on-chain data

### ✅ Performance
- [ ] Query response time: < 1 second
- [ ] Payment confirmation: < 500ms on Solana
- [ ] No rate limits or API keys required

### ✅ Cost Efficiency
- [ ] Price queries: $0.01 each
- [ ] Wallet queries: $0.005 each
- [ ] Analytics: $0.20 each
- [ ] No subscription needed

### ✅ Cross-Chain Support
- [ ] Can query Ethereum data
- [ ] Can pay with Solana OR Ethereum
- [ ] Single endpoint for multi-chain data

### ✅ AI Intelligence
- [ ] Understands natural language questions
- [ ] Selects appropriate oracle endpoints
- [ ] Provides human-readable responses
- [ ] Shows token names instead of addresses

---

## 💡 Tips for Testing

### See Payment Flow in Detail

Enable verbose logging in `.env`:
```bash
DEBUG=true
```

This shows:
- 🔍 Payment verification steps
- 📊 Balance checks (before/after)
- ✅ Transaction confirmation details

### Check Server Statistics

In your browser, visit:
```
http://localhost:3402/api/v1/stats
```

You'll see:
- Total queries processed
- Total revenue earned
- Recent transactions
- Uptime

### View Pricing

```
http://localhost:3402/api/v1/pricing
```

Shows all endpoint prices and descriptions.

---

## 🐛 Troubleshooting

### "Insufficient funds"
```bash
# Check your USDC balance
solana balance <YOUR_PUBLIC_KEY> --url devnet

# If low, mint more USDC
npm run setup-usdc
```

### "Connection refused"
Make sure the oracle server is running:
```bash
npm start
```

### "Payment verification failed"
The server wallet might not have a token account. Restart the server:
```bash
# Stop server (Ctrl+C)
npm start
```

### "OpenAI API error"
Add your OpenAI API key to `.env`:
```bash
OPENAI_API_KEY=sk-...
```

Or use the example queries without AI:
```bash
# Direct HTTP test (no AI needed)
curl http://localhost:3402/api/v1/pricing
```

---

## 🎯 5-Minute Demo Script

Perfect for judges with limited time:

```bash
# Terminal 1
npm start

# Terminal 2
npm run ai

# In AI chat:
What's the price of Solana?

# Observe:
# ✅ 402 Payment Required response
# ✅ Automatic USDC payment
# ✅ Transaction confirmed on Solana
# ✅ Real SOL price returned
# ✅ Explorer link to verify
# ✅ Total time: ~1 second
```

**That's it!** You've just seen:
- x402 protocol in action
- Autonomous AI agent payments
- Sub-second blockchain settlement
- Pay-per-request pricing
- Full transparency via block explorer

---

## 📚 Next Steps

Once you've seen the basics:

1. **Read the docs**: See `docs/PROBLEM-STATEMENT.md` and `docs/WHY-X402.md`
2. **Try cross-chain**: Ask about Ethereum balances
3. **Check the code**: See `src/oracle-server.ts` and `src/ai-agent.ts`
4. **View architecture**: See main `README.md` for system design

---

## 🆘 Need Help?

- **Discord**: [your-discord-link]
- **GitHub Issues**: [your-github-repo/issues]
- **Email**: [your-email]

We're here to help judges test the project successfully!
