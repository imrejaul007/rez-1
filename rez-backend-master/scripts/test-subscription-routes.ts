import axios from 'axios';

const BASE_URL = 'http://localhost:5001/api';
const TOKEN = '<JWT_TOKEN_REDACTED>';

const headers = {
  'Authorization': `Bearer ${TOKEN}`,
  'Content-Type': 'application/json'
};

interface TestResult {
  endpoint: string;
  method: string;
  status: 'PASS' | 'FAIL';
  statusCode?: number;
  error?: string;
  response?: any;
}

const results: TestResult[] = [];

async function testEndpoint(method: string, endpoint: string, data?: any, useAuth: boolean = true) {
  try {
    const config: any = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: useAuth ? headers : { 'Content-Type': 'application/json' }
    };

    // Only add data for POST/PATCH/PUT requests
    if (data && ['POST', 'PATCH', 'PUT'].includes(method.toUpperCase())) {
      config.data = data;
    }

    const response = await axios(config);

    results.push({
      endpoint,
      method,
      status: 'PASS',
      statusCode: response.status,
      response: response.data
    });

    console.log(`✅ ${method} ${endpoint} - ${response.status}`);
    return response.data;
  } catch (error: any) {
    results.push({
      endpoint,
      method,
      status: 'FAIL',
      statusCode: error.response?.status,
      error: error.response?.data?.message || error.message
    });

    console.log(`❌ ${method} ${endpoint} - ${error.response?.status || 'ERROR'}: ${error.response?.data?.message || error.message}`);
    console.log(`   Full error:`, error.response?.data || error.message);
    return null;
  }
}

async function runTests() {
  console.log('\n🧪 TESTING SUBSCRIPTION ROUTES\n');
  console.log('='.repeat(60));

  // Public routes
  console.log('\n📋 Testing Public Routes:');
  await testEndpoint('GET', '/subscriptions/tiers', null, false);

  // Protected routes
  console.log('\n🔒 Testing Protected Routes:');
  await testEndpoint('GET', '/subscriptions/current');
  await testEndpoint('GET', '/subscriptions/benefits');
  await testEndpoint('GET', '/subscriptions/usage');
  await testEndpoint('GET', '/subscriptions/value-proposition/premium');
  await testEndpoint('GET', '/subscriptions/value-proposition/vip');

  // Test subscription operations
  console.log('\n💳 Testing Subscription Operations:');

  // Test subscribe (this will likely fail if already subscribed, but tests the endpoint)
  await testEndpoint('POST', '/subscriptions/subscribe', {
    tier: 'premium',
    billingCycle: 'monthly'
  });

  // Test toggle auto-renew
  await testEndpoint('PATCH', '/subscriptions/auto-renew', {
    autoRenew: true
  });

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 SUBSCRIPTION ROUTES TEST SUMMARY\n');

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;

  console.log(`Total Tests: ${results.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / results.length) * 100).toFixed(2)}%`);

  // Show failed tests
  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  - ${r.method} ${r.endpoint}`);
      console.log(`    Status: ${r.statusCode}`);
      console.log(`    Error: ${r.error}`);
    });
  }

  console.log('\n' + '='.repeat(60));

  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

runTests();

