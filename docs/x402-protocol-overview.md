# x402 Protocol: Internet-Native Payments

## Overview

The x402 protocol is a groundbreaking standard for machine-to-machine (M2M) payments over HTTP, initiated by Coinbase. It revives the HTTP 402 "Payment Required" status code to enable autonomous, internet-native micropayments without traditional authentication.

## What is x402?

**x402** is a protocol that enables:
- **Autonomous payments**: Machines/agents can pay for services automatically
- **No accounts needed**: No API keys, usernames, or passwords required
- **Chain-agnostic**: Works across multiple blockchains (Ethereum, Solana, Base, etc.)
- **Standard HTTP**: Built on top of existing web infrastructure
- **Micropayments**: Perfect for per-request pricing and pay-as-you-go models

## How x402 Works

### 1. Payment Flow

```
┌─────────┐                                    ┌─────────┐
│ Client  │                                    │ Server  │
│ (Agent) │                                    │   API   │
└────┬────┘                                    └────┬────┘
     │                                              │
     │  1. GET /api/resource                        │
     │─────────────────────────────────────────────>│
     │                                              │
     │  2. HTTP 402 Payment Required                │
     │     + Machine-readable invoice               │
     │<─────────────────────────────────────────────│
     │                                              │
     │  3. GET /api/resource                        │
     │     + Payment header (signed tx)             │
     │─────────────────────────────────────────────>│
     │                                              │
     │  4. Verify payment on-chain                  │
     │                                              │
     │  5. HTTP 200 OK + Resource                   │
     │<─────────────────────────────────────────────│
     │                                              │
```

### 2. HTTP 402 Response

When a client requests a resource without payment, the server responds with a 402 status code and a machine-readable invoice:

```http
HTTP/1.1 402 Payment Required
Content-Type: application/json

{
  "version": "1.0",
  "payment_required": true,
  "payment_methods": [
    {
      "type": "eip-3009",
      "chain": "ethereum",
      "chain_id": 1,
      "token": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      "token_symbol": "USDC",
      "recipient": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
      "amount": "1000000",
      "valid_until": 1733356800
    },
    {
      "type": "solana-transfer",
      "chain": "solana",
      "token": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      "token_symbol": "USDC",
      "recipient": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
      "amount": "1000000"
    }
  ],
  "resource": "/api/resource",
  "description": "Access to premium AI model endpoint"
}
```

### 3. Payment Submission

The client creates a signed payment transaction and includes it in the request header:

```http
GET /api/resource HTTP/1.1
Host: api.example.com
X-Payment-Method: eip-3009
X-Payment-Signature: 0x1234567890abcdef...
X-Payment-From: 0xABC123...
X-Payment-Nonce: 12345
X-Payment-ValidAfter: 1733270400
X-Payment-ValidBefore: 1733356800
```

## Key Features

### Chain-Agnostic Design

x402 works across multiple blockchains:
- **Ethereum**: Using EIP-712 (typed data signing) and EIP-3009 (transferWithAuthorization)
- **Solana**: Using native transfers and token programs
- **Base, Polygon, Arbitrum**: Any EVM-compatible chain
- **Future**: Can support traditional fiat payments

### Standards Used

#### On Ethereum:
- **EIP-712**: Typed structured data hashing and signing
- **EIP-3009**: Transfer with authorization for USDC and other stablecoins
- **EIP-2612**: Permit (approve by signature)

#### On Solana:
- Native SOL transfers
- SPL Token transfers with signed transactions

### Benefits

1. **No Authentication Overhead**: No need for API keys, OAuth, or session management
2. **Frictionless Access**: Pay-per-use model eliminates subscription barriers
3. **Machine-Readable**: Agents and AI can automatically process payments
4. **Privacy**: No user accounts or personal data required
5. **Global**: Works across borders without payment processors
6. **Micropayments**: Enable pricing models previously impractical with traditional payments

## Use Cases

### 1. AI Agent Payments
AI agents can autonomously pay for services they consume:
- LLM API calls
- Data retrieval
- Computation resources

### 2. Web3 RPC Access
Pay-per-request for blockchain node access:
- Read blockchain state
- Submit transactions
- Historical data queries

### 3. Web2 API Monetization
Traditional APIs can adopt x402:
- Weather data
- Financial market data
- Translation services

### 4. Content Micropayments
Pay for individual articles, images, or videos:
- Journalism
- Stock photos
- Research papers

### 5. IoT and Machine-to-Machine
Devices paying each other:
- Smart charging stations
- Data marketplaces
- Sensor networks

## x402 vs Traditional Payment Methods

| Feature                      | x402 | API Keys      | Credit Cards |
|---------                     |------|----------     |--------------|
| Setup time                   | None | Minutes/Hours | Days         |
| Per-request pricing          | ✓    | Limited       | ✗           |
| Machine-readable             | ✓    | ✗            | ✗           |
| Privacy                      | High | Medium        | Low          |
| Global access                | ✓    | Varies        | Limited     |
| Micro-transactions           | ✓    | ✗            | ✗           |
| Autonomous agents            | ✓    | Limited       | ✗           |

## Technical Implementation

### Server Side

1. **Detect unpaid request**
2. **Generate payment invoice** with supported payment methods
3. **Return HTTP 402** with invoice
4. **Verify payment signature** when request includes payment
5. **Check on-chain** that payment was executed
6. **Serve resource** if payment is valid

### Client Side

1. **Make initial request**
2. **Parse 402 response** and invoice
3. **Select payment method** (choose blockchain/token)
4. **Create and sign payment** transaction
5. **Retry request** with payment headers
6. **Receive and process** resource

## Security Considerations

- **Replay Protection**: Use nonces and expiration times
- **Amount Verification**: Client must verify invoice amounts
- **Recipient Verification**: Ensure payment goes to legitimate recipient
- **Chain Verification**: Confirm correct blockchain and token
- **Signature Validation**: Server must verify cryptographic signatures
- **Double-Spending**: Check on-chain status before serving resources

## Future Potential

x402 can evolve to support:
- **Dynamic pricing**: Based on demand, user reputation, or resource availability
- **Payment channels**: For frequent small payments
- **Multi-party payments**: Split payments between multiple recipients
- **Refunds and disputes**: Protocol extensions for reversals
- **Traditional rails**: Integration with fiat payment systems
- **Cross-chain payments**: Automatic bridging and conversion

## Conclusion

x402 represents a paradigm shift in how services can be monetized on the internet. By leveraging HTTP standards and blockchain technology, it enables a future where agents, applications, and services can autonomously exchange value without the friction of traditional payment and authentication systems.

The protocol is especially powerful when combined with other Web3 innovations like account abstraction (EIP-4337), enabling even more seamless and user-friendly payment experiences.
