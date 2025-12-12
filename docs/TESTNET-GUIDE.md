# 🧪 Testnet Setup Guide

## Overview

This project uses **FREE testnets** for both Solana and Ethereum, so you can test everything without spending real money!

- **Solana Devnet** - Fast, free transactions
- **Ethereum Sepolia** - Free testnet for Ethereum

---

## 🟣 Solana Devnet Setup

### 1. Get Free SOL

Visit the Solana faucet and request free testnet SOL:

**Option A: Web Faucet**
```
https://faucet.solana.com
```
- Enter your wallet address
- Click "Request Airdrop"
- Receive 1-2 SOL instantly

**Option B: CLI**
```bash
solana airdrop 2 YOUR_WALLET_ADDRESS --url devnet
```

### 2. Get Free Devnet USDC

**Using SPL Token CLI:**

```bash
# Set to devnet
solana config set --url devnet

# Create USDC token account
spl-token create-account Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr

# Mint test USDC to your account
spl-token mint Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr 100

# Check balance
spl-token balance Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr
```

You now have **100 USDC** on Solana Devnet (free testnet tokens)!

---

## 🔵 Ethereum Sepolia Setup

### 1. Get Free Sepolia ETH

Sepolia is Ethereum's recommended testnet. Get free ETH from these faucets:

**Option A: Alchemy Sepolia Faucet**
```
https://sepoliafaucet.com
```
- Sign in with Alchemy account (free)
- Enter your Ethereum address
- Receive 0.5 ETH per day

**Option B: Sepolia PoW Faucet**
```
https://faucet.sepolia.dev
```
- Enter your Ethereum address
- Mine a small proof-of-work
- Receive testnet ETH

**Option C: Chainlink Faucet**
```
https://faucets.chain.link/sepolia
```
- Connect wallet
- Complete captcha
- Receive 0.1 ETH

### 2. Get Free Sepolia USDC

**Circle's Testnet USDC:**

The USDC contract on Sepolia is: `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`

**Method 1: Direct Faucet (if available)**
- Visit Circle's developer portal
- Request testnet USDC

**Method 2: Bridge from Faucet**
- Some faucets provide USDC directly
- Check https://faucet.circle.com (if available)

**Method 3: Use a DEX**
- Swap your testnet ETH for testnet USDC on Uniswap Sepolia
- Or use any Sepolia DEX

**Note:** For this demo, Ethereum payment verification is implemented but optional. You can test everything with just Solana Devnet!

---

## ✅ Verification

### Check Your Solana Devnet Balance

```bash
solana balance --url devnet
spl-token balance Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr --url devnet
```

### Check Your Ethereum Sepolia Balance

**Using Etherscan:**
```
https://sepolia.etherscan.io/address/YOUR_ADDRESS
```

**Using cast (Foundry):**
```bash
cast balance YOUR_ADDRESS --rpc-url https://eth-sepolia.g.alchemy.com/v2/demo
```

---

## 🚀 Running the Demo

Once you have testnet tokens:

### 1. Configure Environment

Copy `.env.example` to `.env` and add your details:

```env
# Your wallet addresses
SERVER_SOLANA_WALLET=your_solana_address
SERVER_ETH_WALLET=your_ethereum_address

# Your private key for agent demo
SOLANA_PRIVATE_KEY=your_base58_private_key

# Testnet RPC URLs (default to free public RPCs)
SOLANA_RPC_URL=https://api.devnet.solana.com
ETH_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/demo
```

### 2. Start the Oracle Server

```bash
npm install
npm start
```

Expected output:
```
🚀 Solana Data Oracle started on port 3402
📡 Connected to Solana devnet
📡 Connected to Ethereum Sepolia testnet
💰 Accepting payments on:
   - Solana Devnet: 7xKXtg...
   - Ethereum Sepolia: 0x742d35...
🧪 100% FREE - Both testnets!
```

### 3. Run the AI Agent Demo

```bash
npm run demo
```

Expected output:
```
🤖 Autonomous AI Agent Demo - x402 + Solana

💰 Current USDC balance: $100.00

📊 Query 1: Getting SOL price...
💳 Payment required for /api/v1/price/So11111111111111111111111111111111111111112
🔍 Available payment chains:
   ✅ Solana Devnet: 0.01 USDC (RECOMMENDED - FREE testnet)
   ⚠️  Ethereum Sepolia: 0.01 USDC (FREE testnet, but slower)
💡 Auto-selecting Solana for speed & testnet convenience
   Transaction: 3kZ9s7Hn...
✅ Payment verified, data received
   SOL Price: $145.32

...
```

---

## 🆘 Troubleshooting

### "Insufficient SOL balance"
- Visit https://faucet.solana.com and request more SOL
- Wait a few seconds and try again

### "Insufficient USDC balance"
- Run the `spl-token mint` command again
- Devnet allows unlimited minting!

### "Transaction failed on Sepolia"
- Get more ETH from faucets
- Sepolia can be congested, try again in a few minutes
- Remember: Solana Devnet is faster and the recommended testnet!

### "RPC rate limit exceeded"
- Use your own RPC endpoint (Alchemy, QuickNode)
- Add your API key to `.env`

---

## 💡 Tips

1. **Start with Solana Devnet** - It's faster and easier to get tokens
2. **Both networks are FREE** - No real money required for testing
3. **Devnet tokens have no value** - Feel free to experiment
4. **Solana is faster** - ~400ms vs ~15s for Ethereum
5. **Get your own RPC** - Free tiers from Alchemy, QuickNode, etc.

---

## 🔗 Useful Links

**Solana:**
- Faucet: https://faucet.solana.com
- Explorer: https://explorer.solana.com/?cluster=devnet
- Docs: https://docs.solana.com

**Ethereum Sepolia:**
- Faucet 1: https://sepoliafaucet.com
- Faucet 2: https://faucet.sepolia.dev
- Explorer: https://sepolia.etherscan.io
- Docs: https://ethereum.org/en/developers/docs/networks/#sepolia

**RPC Providers (Free Tiers):**
- Alchemy: https://www.alchemy.com
- QuickNode: https://www.quicknode.com
- Infura: https://www.infura.io

---

## ✨ You're Ready!

With testnet tokens in your wallet, you can now:
- ✅ Test the full x402 payment flow
- ✅ Query blockchain data without spending money
- ✅ See autonomous AI agent payments in action
- ✅ Compare Solana vs Ethereum performance
- ✅ Experiment with cross-chain coordination

Happy testing! 🎉
