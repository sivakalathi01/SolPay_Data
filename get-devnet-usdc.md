# Get Devnet USDC - Step by Step

Since the official devnet USDC mint is controlled and you can't mint it yourself, use these methods:

## Method 1: Create Your Own Test USDC Token

```bash
# 1. Set to devnet
solana config set --url https://api.devnet.solana.com

# 2. Get some SOL for fees
solana airdrop 2

# 3. Create your own USDC-like token (you'll be the mint authority)
spl-token create-token --decimals 6

# This will output a token address like: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
# Copy this address and update your .env file: USDC_MINT=<your-new-token-address>

# 4. Create a token account for yourself
spl-token create-account <your-token-address>

# 5. Mint tokens to yourself (you're the authority!)
spl-token mint <your-token-address> 1000
```

## Method 2: Use a Devnet USDC Faucet

Some services provide devnet USDC:
- https://spl-token-faucet.com/ (if available)
- Solana Foundation's faucets
- Create a support ticket with devnet projects

## Method 3: Use the Script Below (Creates Your Own Token)

Run: `ts-node create-own-usdc.ts`
