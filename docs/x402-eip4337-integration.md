# x402 + EIP-4337 Integration

## How x402 and EIP-4337 Work Together

This document explains how the x402 protocol and EIP-4337 Account Abstraction complement each other to create seamless, user-friendly machine-to-machine payments.

## Overview

### x402 Protocol
- **Purpose**: Enable HTTP-based micropayments without traditional authentication
- **Scope**: Application/protocol layer (HTTP)
- **Benefit**: Removes friction from accessing paid services

### EIP-4337 Account Abstraction
- **Purpose**: Flexible smart contract wallets with improved UX
- **Scope**: Blockchain layer (Ethereum)
- **Benefit**: Gas abstraction, batching, social recovery, custom logic

## Integration Benefits

When used together, x402 + EIP-4337 provide:

1. **No Manual Approvals**: Smart accounts can be pre-configured to automatically approve x402 payments
2. **Gas Abstraction**: Paymasters can pay gas fees, users only pay in stablecoins
3. **Batch Payments**: Multiple x402 payments can be bundled into one UserOperation
4. **Session Keys**: Temporary keys for agents with spending limits
5. **Better Security**: Smart account logic can enforce spending rules
6. **Seamless UX**: Agents/users don't need to manage gas or multiple transactions

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     AI Agent / Application                  │
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              x402 Client Library                       │ │
│  │                                                        │ │
│  │  • Detects HTTP 402 responses                          │ │
│  │  • Parses payment invoices                             │ │
│  │  • Selects payment method                              │ │
│  │  • Triggers payment flow                               │ │
│  └─────────────────────┬──────────────────────────────────┘ │
└────────────────────────┼────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  EIP-4337 Account Abstraction               │
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              Smart Contract Wallet                     │ │
│  │                                                        │ │
│  │  • Session key validation                              │ │
│  │  • Spending limit checks                               │ │
│  │  • Payment authorization logic                         │ │
│  │  • Batch multiple payments                             │ │
│  └─────────────────────┬──────────────────────────────────┘ │
│                        │                                    │
│  ┌─────────────────────┴──────────────────────────────────┐ │
│  │              Bundler                                   │ │
│  │                                                        │ │
│  │  • Aggregates UserOperations                           │ │
│  │  • Submits to EntryPoint contract                      │ │
│  └─────────────────────┬──────────────────────────────────┘ │
└────────────────────────┼────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                      Blockchain                             │
│                                                             │
│  • EntryPoint contract validates and executes UserOp        │
│  • USDC transfer to service provider                        │
│  • Paymaster (optional) covers gas                          │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   x402 API Server                           │
│                                                             │
│  • Verifies UserOperation execution                         │
│  • Checks payment amount and recipient                      │
│  • Serves requested resource                                │
└─────────────────────────────────────────────────────────────┘
```

## Example Flow

### Traditional Payment Flow (Without EIP-4337)

1. Agent requests API endpoint
2. Server returns HTTP 402 with invoice
3. Agent creates EIP-3009 signature
4. Agent submits payment header
5. Server verifies signature
6. Server serves resource

**Limitations**: User must have ETH for gas, must approve each transaction manually

### Enhanced Flow (With EIP-4337)

1. Agent requests API endpoint
2. Server returns HTTP 402 with invoice (including EIP-4337 payment option)
3. Agent creates UserOperation with:
   - USDC transfer callData
   - Session key signature
   - Paymaster data (optional)
4. Agent submits UserOp to bundler
5. Bundler includes UserOp in blockchain transaction
6. Agent includes UserOpHash in payment header
7. Server verifies UserOp execution on-chain
8. Server serves resource

**Benefits**: No gas tokens needed, session keys enable automation, better security

## Code Example: Smart Account Configuration

```typescript
// Configure a smart account for x402 payments
import { SmartAccount } from '@account-abstraction/sdk';

async function setupX402SmartAccount() {
  const smartAccount = new SmartAccount({
    owner: userWallet,
    entryPoint: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
  });

  // Create a session key for x402 payments
  const sessionKey = ethers.Wallet.createRandom();
  
  // Configure session key with spending limits
  await smartAccount.addSessionKey({
    key: sessionKey.address,
    validUntil: Date.now() + 86400000, // 24 hours
    validAfter: Date.now(),
    // Allow spending up to 100 USDC per day
    spendingLimit: {
      token: USDC_ADDRESS,
      amount: '100000000', // 100 USDC (6 decimals)
      period: 86400, // 1 day
    },
    // Only allow transfers to whitelisted x402 providers
    allowedRecipients: [
      '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb', // API provider 1
      '0x123...', // API provider 2
    ],
  });

  return { smartAccount, sessionKey };
}
```

## Code Example: x402 Client with Smart Account

```typescript
import { X402Client } from './client';
import { SmartAccount } from '@account-abstraction/sdk';

async function aiAgentWorkflow() {
  // Setup smart account
  const { smartAccount, sessionKey } = await setupX402SmartAccount();

  // Initialize x402 client with session key
  const client = new X402Client({
    smartAccount,
    sessionKey,
    preferredChain: 'ethereum',
  });

  // Agent can now autonomously make multiple API calls
  for (let i = 0; i < 10; i++) {
    const result = await client.request('https://api.example.com/ai/complete', {
      method: 'POST',
      data: { prompt: `Query ${i}` },
    });
    
    console.log(`Result ${i}:`, result);
    // No manual approvals needed!
  }
}
```

## Use Cases

### 1. Autonomous AI Agents

**Scenario**: An AI agent needs to access multiple paid APIs to complete a task

**Without EIP-4337**:
- Agent needs ETH for gas
- Each payment requires user approval
- Complex gas price management

**With EIP-4337 + x402**:
- Agent uses session key with spending limits
- Paymaster covers gas (agent only pays in USDC)
- Multiple payments bundled efficiently
- No user intervention needed

### 2. IoT Device Payments

**Scenario**: Smart devices paying for cloud services

**Benefits**:
- Devices use lightweight session keys
- Spending limits prevent abuse
- No need to store ETH on devices
- Batch multiple small payments

### 3. Developer Tool Access

**Scenario**: IDE accessing paid API services on behalf of developers

**Benefits**:
- Developer sets spending budget
- IDE autonomously pays for API calls
- All payments in stablecoins
- Easy accounting and billing

## Security Considerations

### Session Keys

```typescript
// Session key with constraints
{
  validUntil: Date.now() + 86400000, // Expires in 24h
  spendingLimit: '100000000', // Max 100 USDC
  allowedMethods: ['transfer'], // Only allow transfers
  allowedRecipients: [...], // Whitelist of API providers
}
```

### Smart Account Policies

1. **Spending Limits**: Daily/hourly caps per session key
2. **Recipient Whitelisting**: Only approved service providers
3. **Velocity Checks**: Maximum payments per time period
4. **Multi-sig**: Require multiple approvals for large amounts
5. **Social Recovery**: Recover account if key is lost

### Payment Verification

The x402 server should:
1. Verify UserOperation was executed successfully
2. Check the callData includes correct USDC transfer
3. Validate recipient and amount match invoice
4. Ensure UserOp hasn't been replayed
5. Check transaction finality

## Comparison Table

| Feature | x402 Only | x402 + EIP-4337 |
|---------|-----------|-----------------|
| Payment Method | EIP-3009 signature | UserOperation |
| Gas Requirement | User must have ETH | Paymaster can pay |
| Automation | Limited by approvals | Full automation with session keys |
| Batching | One payment per request | Multiple payments in one UserOp |
| Security Model | EOA signature | Smart contract logic + session keys |
| User Experience | Manual approvals | Seamless automation |
| Recovery | Private key only | Social recovery, guardians |
| Spending Controls | None | Built into smart account |

## Implementation Checklist

### For API Providers (Servers)

- [ ] Implement HTTP 402 responses with payment invoices
- [ ] Support EIP-4337 as a payment method
- [ ] Include bundler URL in payment invoice
- [ ] Verify UserOperation execution on-chain
- [ ] Parse callData to extract payment details
- [ ] Check transaction finality before serving resources
- [ ] Implement replay protection

### For Clients/Agents

- [ ] Detect and parse HTTP 402 responses
- [ ] Choose between EIP-3009 and EIP-4337 based on context
- [ ] Create UserOperations with proper callData
- [ ] Sign UserOperations with session keys
- [ ] Submit UserOperations to bundlers
- [ ] Include UserOpHash in payment headers
- [ ] Handle payment failures gracefully

### For Smart Account Setup

- [ ] Deploy smart account contract
- [ ] Configure session keys with appropriate limits
- [ ] Whitelist trusted API providers
- [ ] Set up paymaster if needed
- [ ] Implement spending limit logic
- [ ] Add recovery mechanisms
- [ ] Monitor and adjust limits over time

## Conclusion

The combination of x402 and EIP-4337 creates a powerful framework for autonomous machine-to-machine payments:

- **x402** provides the protocol-level standard for HTTP-based payments
- **EIP-4337** provides the blockchain-level infrastructure for flexible, user-friendly payments

Together, they enable a future where AI agents, applications, and services can seamlessly exchange value without manual intervention, complex authentication, or gas token management.
