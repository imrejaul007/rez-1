/**
 * Test script to verify endpoint response formats
 * Tests the 16 endpoints mentioned in the task
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5001/api/merchant';

// Test merchant credentials (you'll need to provide valid ones)
const TEST_MERCHANT = {
  email: 'test@merchant.com',
  password: 'test123'
};

let authToken = '';

async function login() {
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, TEST_MERCHANT);
    if (response.data.success && response.data.data.token) {
      authToken = response.data.data.token;
      console.log('✓ Login successful');
      return true;
    }
  } catch (error) {
    console.error('✗ Login failed:', error.message);
    return false;
  }
}

async function testEndpoint(name, url) {
  try {
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    const { data, status } = response;

    // Check if response has correct structure
    const hasSuccess = data.hasOwnProperty('success');
    const hasData = data.hasOwnProperty('data');
    const isSuccessTrue = data.success === true;

    if (status === 200 && hasSuccess && hasData && isSuccessTrue) {
      console.log(`✓ ${name}: PASS`);
      return true;
    } else {
      console.log(`✗ ${name}: FAIL`);
      console.log(`  Status: ${status}`);
      console.log(`  Has success: ${hasSuccess}, value: ${data.success}`);
      console.log(`  Has data: ${hasData}`);
      console.log(`  Response structure:`, Object.keys(data));
      return false;
    }
  } catch (error) {
    console.log(`✗ ${name}: ERROR`);
    console.log(`  ${error.message}`);
    if (error.response) {
      console.log(`  Status: ${error.response.status}`);
      console.log(`  Data:`, error.response.data);
    }
    return false;
  }
}

async function runTests() {
  console.log('='.repeat(60));
  console.log('Testing Dashboard & Analytics Endpoints');
  console.log('='.repeat(60));
  console.log('');

  // Login first
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('\nCannot proceed without authentication');
    return;
  }

  console.log('\nDashboard Endpoints (4):');
  console.log('-'.repeat(60));

  const dashboardTests = [
    ['GET /dashboard/activity', `${BASE_URL}/dashboard/activity`],
    ['GET /dashboard/top-products', `${BASE_URL}/dashboard/top-products`],
    ['GET /dashboard/sales-data', `${BASE_URL}/dashboard/sales-data`],
    ['GET /dashboard/low-stock', `${BASE_URL}/dashboard/low-stock`]
  ];

  let dashboardPassed = 0;
  for (const [name, url] of dashboardTests) {
    if (await testEndpoint(name, url)) dashboardPassed++;
  }

  console.log('\nAnalytics Endpoints (12):');
  console.log('-'.repeat(60));

  const analyticsTests = [
    ['GET /analytics/sales/overview', `${BASE_URL}/analytics/sales/overview`],
    ['GET /analytics/sales/trends', `${BASE_URL}/analytics/sales/trends`],
    ['GET /analytics/sales/by-time', `${BASE_URL}/analytics/sales/by-time`],
    ['GET /analytics/sales/by-day', `${BASE_URL}/analytics/sales/by-day`],
    ['GET /analytics/products/top-selling', `${BASE_URL}/analytics/products/top-selling`],
    ['GET /analytics/categories/performance', `${BASE_URL}/analytics/categories/performance`],
    ['GET /analytics/customers/insights', `${BASE_URL}/analytics/customers/insights`],
    ['GET /analytics/inventory/status', `${BASE_URL}/analytics/inventory/status`],
    ['GET /analytics/payments/breakdown', `${BASE_URL}/analytics/payments/breakdown`],
    ['GET /analytics/forecast/sales', `${BASE_URL}/analytics/forecast/sales`],
    ['GET /analytics/trends/seasonal', `${BASE_URL}/analytics/trends/seasonal`],
    ['GET /analytics/export/test-export-id', `${BASE_URL}/analytics/export/test-export-id`]
  ];

  let analyticsPassed = 0;
  for (const [name, url] of analyticsTests) {
    if (await testEndpoint(name, url)) analyticsPassed++;
  }

  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Dashboard: ${dashboardPassed}/4 passed`);
  console.log(`Analytics: ${analyticsPassed}/12 passed`);
  console.log(`Total: ${dashboardPassed + analyticsPassed}/16 passed`);
  console.log('='.repeat(60));
}

// Run the tests
runTests().catch(console.error);
