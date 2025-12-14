# SolPay Data Oracle Frontend

Next.js frontend for the x402 Solana micropayment oracle platform.

## Features

- 🔌 Phantom wallet integration (Solana Devnet + Ethereum Sepolia)
- 💰 x402 payment flow with user approval
- 🎯 6 oracle query endpoints
- 🌉 Cross-chain support (Solana + Ethereum)
- 📊 Real-time balance tracking
- 📈 Spending dashboard

## Prerequisites

1. **Phantom Wallet** installed in your browser
2. **Testnet Mode enabled** in Phantom:
   - Settings → Developer Settings → Testnet Mode: ON
3. **Test funds**:
   - Solana Devnet SOL: https://faucet.solana.com
   - Custom USDC tokens (from mint-usdc.ts)
   - Ethereum Sepolia ETH: https://sepoliafaucet.com

## Installation

```bash
cd frontend
npm install
```

## Running the Frontend

1. **Start the backend oracle server** (in root directory):
   ```bash
   npm start
   ```

2. **Start the frontend** (in frontend directory):
   ```bash
   npm run dev
   ```

3. **Open browser**: http://localhost:3000

## Usage

### 1. Connect Wallet
- Click "Select Wallet" button
- Choose Phantom
- Approve connection
- View your Solana & Ethereum balances

### 2. Query Oracle
- Select a query type (Price, Wallet, Holders, etc.)
- Enter the required address/token
- Click "Query"

### 3. Approve Payment
- Review payment amount in modal
- Click "Approve & Pay"
- Confirm transaction in Phantom wallet
- View results instantly

## Available Queries

| Query | Cost | Description |
|-------|------|-------------|
| Token Price | $0.01 | Real-time token price data |
| Wallet Analysis | $0.005 | Wallet holdings and activity |
| Token Holders | $0.05 | Top token holders list |
| Transaction History | $0.10 | Recent transaction history |
| Token Analytics | $0.20 | Comprehensive token analytics |
| Cross-Chain Balance | $0.02 | Solana + Ethereum balances |

## Configuration

Edit `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3402
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_USDC_MINT=Chkg2bcUdGuYjLKezAxH47f9dXmtDyJvmWgECr6tbDLj
```

## Troubleshooting

**Wallet not connecting?**
- Ensure Phantom is installed and unlocked
- Enable testnet mode in Phantom settings

**Payment failing?**
- Check USDC balance (use mint-usdc.ts to get tokens)
- Ensure you're on Solana Devnet
- Verify backend server is running

**Ethereum address not showing?**
- Ensure Phantom has Ethereum support enabled
- Check testnet mode is ON

## Architecture

```
Frontend (Next.js) → Backend (Express) → Blockchain (Solana/Ethereum)
     ↓
User approves payment in Phantom
     ↓
Transaction sent to Solana Devnet
     ↓
Backend validates payment
     ↓
Return query results
```

## Development

- Built with Next.js 14 + TypeScript
- Solana wallet-adapter-react
- TailwindCSS for styling
- Ethers.js for Ethereum

## Production Deployment

```bash
npm run build
npm start
```

Deploy to Vercel, Netlify, or any Node.js hosting platform.
