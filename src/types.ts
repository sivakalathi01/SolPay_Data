// x402 Protocol Type Definitions

export interface PaymentMethod {
  type: 'eip-3009' | 'eip-2612' | 'solana-transfer' | 'eip-4337';
  chain: string;
  chain_id?: number;
  token: string;
  token_symbol: string;
  recipient: string;
  amount: string;
  valid_until?: number;
  entrypoint?: string; // For EIP-4337
  bundler?: string; // For EIP-4337
}

export interface PaymentInvoice {
  version: string;
  payment_required: boolean;
  payment_methods: PaymentMethod[];
  resource: string;
  description: string;
  invoice_id?: string;
  created_at?: number;
}

export interface PaymentHeaders {
  'x-payment-method': string;
  'x-payment-signature': string;
  'x-payment-from': string;
  'x-payment-nonce'?: string;
  'x-payment-valid-after'?: string;
  'x-payment-valid-before'?: string;
  'x-payment-tx-hash'?: string; // For Solana
  'x-payment-user-op-hash'?: string; // For EIP-4337
}

export interface SolanaPaymentData {
  signature: string;
  from: string;
  to: string;
  amount: string;
  token?: string;
}

export interface EIP4337UserOperation {
  sender: string;
  nonce: string;
  initCode: string;
  callData: string;
  callGasLimit: string;
  verificationGasLimit: string;
  preVerificationGas: string;
  maxFeePerGas: string;
  maxPriorityFeePerGas: string;
  paymasterAndData: string;
  signature: string;
}

export interface EIP3009Authorization {
  from: string;
  to: string;
  value: string;
  validAfter: number;
  validBefore: number;
  nonce: string;
  v: number;
  r: string;
  s: string;
}
