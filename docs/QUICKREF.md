# 🚀 Quick Reference Card

## Installation (30 seconds)

```bash
npm install
cp .env.example .env
# Edit .env with your Solana wallet details
```

## Running (3 commands)

```bash
# Terminal 1: Start oracle server
npm start

# Terminal 2: Run AI agent demo
npm run demo

# Browser: Open dashboard
open http://localhost:3402
```

## Environment Variables

```env
SERVER_SOLANA_WALLET=YourPublicAddress    # Receives payments
SOLANA_PRIVATE_KEY=Base58PrivateKey       # Makes payments (agent)
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
PORT=3402
```

## API Endpoints

### Free Endpoints
```
GET /api/v1/pricing    # View all prices
GET /api/v1/stats      # Service statistics
GET /health            # Health check
```

### Paid Endpoints (require USDC payment)
```
GET /api/v1/price/:token           # $0.01 per query
GET /api/v1/wallet/:address        # $0.005 per query
GET /api/v1/holders/:mint          # $0.05 per query
GET /api/v1/transactions/:address  # $0.10 per query
GET /api/v1/analytics/:mint        # $0.20 per query
```

## Testing Without Payment

```bash
# Test free endpoint
curl http://localhost:3402/api/v1/pricing

# Test paid endpoint (will get 402)
curl http://localhost:3402/api/v1/price/So11111111111111111111111111111111111111112
```

## Payment Flow

```
1. Client requests data
   ↓
2. Server returns 402 + invoice
   ↓
3. Client sends USDC on Solana
   ↓
4. Client retries with tx signature
   ↓
5. Server verifies on-chain
   ↓
6. Server returns data
```

## Common Token Addresses

```
SOL:  So11111111111111111111111111111111111111112
USDC: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
BONK: DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263
JUP:  JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN
```

## Troubleshooting

**"Insufficient USDC"** → Fund wallet with USDC  
**"Transaction not found"** → Wait 2-3 seconds and retry  
**"Port in use"** → Change PORT in .env  
**"Cannot find module"** → Run `npm install`

## Code Examples

### Query from JavaScript

```javascript
const response = await fetch('http://localhost:3402/api/v1/price/SOL');
if (response.status === 402) {
  const invoice = await response.json();
  // Pay the invoice amount, then retry with headers
}
```

### Use the Agent Client

```typescript
import { SolanaOracleAgent } from './src/agent-client';

const agent = new SolanaOracleAgent(
  process.env.SOLANA_PRIVATE_KEY!,
  'http://localhost:3402'
);

const price = await agent.getTokenPrice('SOL');
console.log('SOL Price:', price.price_usd);
```

## File Structure

```
src/
├── oracle-server.ts   # Main server with x402
├── agent-client.ts    # AI agent with auto-payment
├── types.ts           # TypeScript definitions
├── server.ts          # Multi-chain reference
└── client.ts          # Multi-chain reference

public/
└── index.html         # Dashboard

docs/
├── README.md          # Main docs
├── SETUP.md           # Installation guide
├── SUBMISSION.md      # Challenge submission
└── *.md              # Protocol guides
```

## Key Metrics

- **Cost per query:** $0.001 - $0.20
- **Payment settlement:** ~400ms (Solana)
- **Transaction fee:** ~$0.00025
- **Cost savings:** 99.6% vs traditional APIs

## Important Links

- **Dashboard:** http://localhost:3402
- **Pricing:** http://localhost:3402/api/v1/pricing
- **Stats:** http://localhost:3402/api/v1/stats
- **Docs:** [README.md](./README.md)
- **Setup:** [SETUP.md](./SETUP.md)

## Security Notes

- ✅ On-chain verification
- ✅ Replay protection (timestamp check)
- ✅ Amount validation
- ✅ Signature verification
- ⚠️ Rate limiting (TODO for production)
- ⚠️ Use paid RPC for production

## Production Deployment

```bash
# Railway
railway up

# Vercel
vercel

# Fly.io
fly launch
```

## Support

- 📚 Read [SETUP.md](./SETUP.md) for detailed instructions
- 🐛 Check troubleshooting section
- 💬 Open GitHub issue
- 📧 Contact: your-email@example.com

---

**Remember:** You need USDC in your wallet to run the agent demo!

Get USDC:
1. Buy on exchange (Coinbase, Binance)
2. Swap SOL → USDC on [Jupiter](https://jup.ag/)
3. Bridge from Ethereum via [Portal](https://portalbridge.com/)

Minimum: $0.50 for testing | Recommended: $5 for full demo

---

Made with ❤️ for x402 + Solana Integration Challenge
