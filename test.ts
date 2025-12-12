/**
 * Quick test script to verify the setup
 * Run: npx ts-node test.ts
 */

import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const ORACLE_URL = process.env.ORACLE_URL || 'http://localhost:3402';

async function runTests() {
  console.log('🧪 Running x402 Oracle Tests...\n');

  let passed = 0;
  let failed = 0;

  // Test 1: Health Check
  try {
    console.log('Test 1: Health Check');
    const response = await axios.get(`${ORACLE_URL}/health`);
    if (response.data.status === 'operational') {
      console.log('✅ PASS: Server is operational\n');
      passed++;
    } else {
      console.log('❌ FAIL: Unexpected health status\n');
      failed++;
    }
  } catch (error) {
    console.log('❌ FAIL: Cannot connect to server');
    console.log('   Make sure server is running: npm start\n');
    failed++;
  }

  // Test 2: Pricing Endpoint
  try {
    console.log('Test 2: Pricing Endpoint');
    const response = await axios.get(`${ORACLE_URL}/api/v1/pricing`);
    if (response.data.success && response.data.pricing.length > 0) {
      console.log('✅ PASS: Pricing endpoint working');
      console.log(`   Found ${response.data.pricing.length} endpoints\n`);
      passed++;
    } else {
      console.log('❌ FAIL: Invalid pricing response\n');
      failed++;
    }
  } catch (error) {
    console.log('❌ FAIL: Pricing endpoint error\n');
    failed++;
  }

  // Test 3: 402 Response
  try {
    console.log('Test 3: HTTP 402 Payment Required');
    const response = await axios.get(
      `${ORACLE_URL}/api/v1/price/So11111111111111111111111111111111111111112`,
      { validateStatus: (status) => status < 500 }
    );
    
    if (response.status === 402) {
      console.log('✅ PASS: Server returns 402 for unpaid requests');
      
      if (response.data.payment_required && response.data.payment_methods) {
        console.log('✅ PASS: Payment invoice is valid');
        console.log(`   Amount: ${Number(response.data.payment_methods[0].amount) / 1_000_000} USDC\n`);
        passed += 2;
      } else {
        console.log('❌ FAIL: Invalid payment invoice\n');
        failed++;
      }
    } else {
      console.log(`❌ FAIL: Expected 402, got ${response.status}\n`);
      failed++;
    }
  } catch (error) {
    console.log('❌ FAIL: 402 endpoint error\n');
    failed++;
  }

  // Test 4: Stats Endpoint
  try {
    console.log('Test 4: Stats Endpoint');
    const response = await axios.get(`${ORACLE_URL}/api/v1/stats`);
    if (response.data.success && response.data.stats) {
      console.log('✅ PASS: Stats endpoint working');
      console.log(`   Total queries: ${response.data.stats.total_queries}`);
      console.log(`   Total revenue: $${response.data.stats.total_revenue_usd}\n`);
      passed++;
    } else {
      console.log('❌ FAIL: Invalid stats response\n');
      failed++;
    }
  } catch (error) {
    console.log('❌ FAIL: Stats endpoint error\n');
    failed++;
  }

  // Test 5: Payment Method Validation
  try {
    console.log('Test 5: Payment Method Validation');
    const response = await axios.get(
      `${ORACLE_URL}/api/v1/price/So11111111111111111111111111111111111111112`,
      { validateStatus: (status) => status < 500 }
    );
    
    const method = response.data.payment_methods[0];
    
    // Accept either devnet USDC or custom USDC mint
    const validUsdcMints = [
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // Devnet USDC
      'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr', // Devnet USDC (alternative)
      process.env.USDC_MINT, // Custom USDC from .env
    ].filter(Boolean);
    
    if (
      method.type === 'solana-transfer' &&
      method.chain === 'solana' &&
      validUsdcMints.includes(method.token) &&
      method.token_symbol === 'USDC' &&
      method.recipient &&
      method.amount
    ) {
      console.log('✅ PASS: Payment method structure is valid');
      console.log(`   Type: ${method.type}`);
      console.log(`   Token: ${method.token_symbol}`);
      console.log(`   Recipient: ${method.recipient}\n`);
      passed++;
    } else {
      console.log('❌ FAIL: Invalid payment method structure');
      console.log(`   Expected USDC mint from: ${validUsdcMints.join(', ')}`);
      console.log(`   Got: ${method.token}\n`);
      failed++;
    }
  } catch (error) {
    console.log('❌ FAIL: Payment validation error\n');
    failed++;
  }

  // Test 6: Dashboard HTML
  try {
    console.log('Test 6: Dashboard HTML');
    const response = await axios.get(ORACLE_URL);
    if (response.data.includes('Solana AI Data Oracle')) {
      console.log('✅ PASS: Dashboard HTML is served\n');
      passed++;
    } else {
      console.log('❌ FAIL: Dashboard HTML not found\n');
      failed++;
    }
  } catch (error) {
    console.log('❌ FAIL: Dashboard error\n');
    failed++;
  }

  // Summary
  console.log('═══════════════════════════════════════════════════');
  console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);
  console.log('═══════════════════════════════════════════════════\n');

  if (failed === 0) {
    console.log('🎉 All tests passed! Your setup is working correctly.');
    console.log('\nNext steps:');
    console.log('1. Fund your wallet with USDC');
    console.log('2. Run the AI agent demo: npm run demo');
    console.log('3. Open dashboard: http://localhost:3402\n');
  } else {
    console.log('⚠️  Some tests failed. Please check the errors above.');
    console.log('\nTroubleshooting:');
    console.log('1. Ensure server is running: npm start');
    console.log('2. Check environment variables in .env');
    console.log('3. Verify ORACLE_URL is correct');
    console.log('4. See SETUP.md for detailed troubleshooting\n');
  }

  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch((error) => {
  console.error('❌ Test runner error:', error);
  process.exit(1);
});
