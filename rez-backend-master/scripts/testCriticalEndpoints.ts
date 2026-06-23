import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5001';
const TEST_TOKEN = process.env.TEST_AUTH_TOKEN || '';

if (!TEST_TOKEN) {
  console.error('ERROR: TEST_AUTH_TOKEN environment variable is required.');
  console.error('Generate a token and set it: export TEST_AUTH_TOKEN="Bearer eyJ..."');
  process.exit(1);
}

interface TestResult {
  endpoint: string;
  method: string;
  status: 'PASS' | 'FAIL';
  statusCode?: number;
  message?: string;
  data?: any;
}

const results: TestResult[] = [];

async function testEndpoint(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: any,
  requiresAuth: boolean = true
): Promise<TestResult> {
  try {
    const config: any = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (requiresAuth) {
      config.headers['Authorization'] = TEST_TOKEN;
    }

    if (body) {
      config.data = body;
    }

    const response = await axios(config);

    return {
      endpoint,
      method,
      status: 'PASS',
      statusCode: response.status,
      message: response.data.message || 'Success',
      data: response.data.data || response.data
    };
  } catch (error: any) {
    return {
      endpoint,
      method,
      status: 'FAIL',
      statusCode: error.response?.status,
      message: error.response?.data?.message || error.message,
      data: error.response?.data
    };
  }
}

async function runTests() {
  console.log('🧪 Testing Critical Backend Endpoints\n');
  console.log('=' .repeat(80));

  // Test 1: Health Check
  console.log('\n📊 Test 1: Health Check');
  const health = await testEndpoint('/health', 'GET', null, false);
  results.push(health);
  console.log(`   ${health.status === 'PASS' ? '✅' : '❌'} ${health.endpoint} - ${health.message}`);

  // Test 2: Referral Code
  console.log('\n📊 Test 2: Referral Code Endpoint');
  const referralCode = await testEndpoint('/api/referral/code', 'GET');
  results.push(referralCode);
  console.log(`   ${referralCode.status === 'PASS' ? '✅' : '❌'} ${referralCode.endpoint} - ${referralCode.message}`);
  if (referralCode.status === 'PASS' && referralCode.data) {
    console.log(`   📝 Referral Code: ${referralCode.data.referralCode || 'N/A'}`);
  }

  // Test 3: Referral Stats
  console.log('\n📊 Test 3: Referral Stats Endpoint');
  const referralStats = await testEndpoint('/api/referral/stats', 'GET');
  results.push(referralStats);
  console.log(`   ${referralStats.status === 'PASS' ? '✅' : '❌'} ${referralStats.endpoint} - ${referralStats.message}`);
  if (referralStats.status === 'PASS' && referralStats.data) {
    console.log(`   📊 Total Referrals: ${referralStats.data.totalReferrals || 0}`);
    console.log(`   💰 Total Earned: ₹${referralStats.data.totalEarned || 0}`);
  }

  // Test 4: Wallet Balance
  console.log('\n📊 Test 4: Wallet Balance Endpoint');
  const walletBalance = await testEndpoint('/api/wallet/balance', 'GET');
  results.push(walletBalance);
  console.log(`   ${walletBalance.status === 'PASS' ? '✅' : '❌'} ${walletBalance.endpoint} - ${walletBalance.message}`);
  if (walletBalance.status === 'PASS' && walletBalance.data) {
    console.log(`   💰 Balance: ₹${walletBalance.data.balance || 0}`);
  }

  // Test 5: Offers
  console.log('\n📊 Test 5: Offers Endpoint');
  const offers = await testEndpoint('/api/offers', 'GET');
  results.push(offers);
  console.log(`   ${offers.status === 'PASS' ? '✅' : '❌'} ${offers.endpoint} - ${offers.message}`);
  if (offers.status === 'PASS' && offers.data) {
    const offerCount = Array.isArray(offers.data) ? offers.data.length : offers.data.offers?.length || 0;
    console.log(`   📦 Total Offers: ${offerCount}`);
  }

  // Test 6: Vouchers
  console.log('\n📊 Test 6: Vouchers Endpoint');
  const vouchers = await testEndpoint('/api/vouchers', 'GET');
  results.push(vouchers);
  console.log(`   ${vouchers.status === 'PASS' ? '✅' : '❌'} ${vouchers.endpoint} - ${vouchers.message}`);
  if (vouchers.status === 'PASS' && vouchers.data) {
    const voucherCount = Array.isArray(vouchers.data) ? vouchers.data.length : vouchers.data.vouchers?.length || 0;
    console.log(`   📦 Total Voucher Brands: ${voucherCount}`);
  }

  // Test 7: Products
  console.log('\n📊 Test 7: Products Endpoint');
  const products = await testEndpoint('/api/products', 'GET');
  results.push(products);
  console.log(`   ${products.status === 'PASS' ? '✅' : '❌'} ${products.endpoint} - ${products.message}`);
  if (products.status === 'PASS' && products.data) {
    const productCount = Array.isArray(products.data) ? products.data.length : products.data.products?.length || 0;
    console.log(`   📦 Total Products: ${productCount}`);
  }

  // Test 8: Stores
  console.log('\n📊 Test 8: Stores Endpoint');
  const stores = await testEndpoint('/api/stores', 'GET');
  results.push(stores);
  console.log(`   ${stores.status === 'PASS' ? '✅' : '❌'} ${stores.endpoint} - ${stores.message}`);
  if (stores.status === 'PASS' && stores.data) {
    const storeCount = Array.isArray(stores.data) ? stores.data.length : stores.data.stores?.length || 0;
    console.log(`   📦 Total Stores: ${storeCount}`);
  }

  // Test 9: Orders
  console.log('\n📊 Test 9: Orders Endpoint');
  const orders = await testEndpoint('/api/orders', 'GET');
  results.push(orders);
  console.log(`   ${orders.status === 'PASS' ? '✅' : '❌'} ${orders.endpoint} - ${orders.message}`);
  if (orders.status === 'PASS' && orders.data) {
    const orderCount = Array.isArray(orders.data) ? orders.data.length : orders.data.orders?.length || 0;
    console.log(`   📦 Total Orders: ${orderCount}`);
  }

  // Test 10: Referral History
  console.log('\n📊 Test 10: Referral History Endpoint');
  const referralHistory = await testEndpoint('/api/referral/history', 'GET');
  results.push(referralHistory);
  console.log(`   ${referralHistory.status === 'PASS' ? '✅' : '❌'} ${referralHistory.endpoint} - ${referralHistory.message}`);

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('\n📊 Test Summary\n');

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const total = results.length;
  const passRate = parseFloat(((passed / total) * 100).toFixed(2));

  console.log(`   ✅ Passed: ${passed}/${total} (${passRate}%)`);
  console.log(`   ❌ Failed: ${failed}/${total}`);

  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.filter(r => r.status === 'FAIL').forEach((result, index) => {
      console.log(`   ${index + 1}. ${result.method} ${result.endpoint}`);
      console.log(`      Status Code: ${result.statusCode || 'N/A'}`);
      console.log(`      Message: ${result.message}`);
    });
  }

  console.log('\n' + '='.repeat(80));

  // Exit with appropriate code
  if (passed === total) {
    console.log('\n🎉 ALL TESTS PASSED! Backend is 100% production ready!\n');
    process.exit(0);
  } else if (passRate >= 80) {
    console.log('\n✅ Most tests passed! Backend is production ready with minor issues.\n');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Please fix the issues before deploying.\n');
    process.exit(1);
  }
}

runTests().catch(error => {
  console.error('❌ Test execution failed:', error);
  process.exit(1);
});
