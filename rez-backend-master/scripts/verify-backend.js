const axios = require('axios');
const colors = require('colors');

// Backend API URL
const API_URL = process.env.API_URL || 'http://localhost:5001/api';

// Test data
const testUser = {
  phone: '+919876543210',
  otp: '123456' // Default OTP for testing
};

// API endpoints to test
const endpoints = [
  // Authentication
  { method: 'POST', path: '/auth/send-otp', data: { phone: testUser.phone }, name: 'Send OTP' },
  { method: 'POST', path: '/auth/verify-otp', data: testUser, name: 'Verify OTP' },

  // Products
  { method: 'GET', path: '/products', name: 'Get Products' },
  { method: 'GET', path: '/products/featured', name: 'Get Featured Products' },
  { method: 'GET', path: '/products/search?query=phone', name: 'Search Products' },

  // Categories
  { method: 'GET', path: '/categories', name: 'Get Categories' },

  // Stores
  { method: 'GET', path: '/stores', name: 'Get Stores' },
  { method: 'GET', path: '/stores/nearby?lat=12.9716&lng=77.5946', name: 'Get Nearby Stores' },

  // Cart (requires auth)
  { method: 'GET', path: '/cart', name: 'Get Cart', requiresAuth: true },

  // Orders (requires auth)
  { method: 'GET', path: '/orders', name: 'Get Orders', requiresAuth: true },

  // User Profile (requires auth)
  { method: 'GET', path: '/users/profile', name: 'Get Profile', requiresAuth: true },

  // Vouchers
  { method: 'GET', path: '/vouchers', name: 'Get Vouchers' },

  // Loyalty
  { method: 'GET', path: '/loyalty/points', name: 'Get Loyalty Points', requiresAuth: true },

  // Wallet
  { method: 'GET', path: '/wallet/balance', name: 'Get Wallet Balance', requiresAuth: true }
];

let authToken = null;
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: []
};

// Test single endpoint
async function testEndpoint(endpoint) {
  try {
    const config = {
      method: endpoint.method,
      url: `${API_URL}${endpoint.path}`,
      headers: {}
    };

    if (endpoint.data) {
      config.data = endpoint.data;
    }

    if (endpoint.requiresAuth && authToken) {
      config.headers.Authorization = `Bearer ${authToken}`;
    }

    const response = await axios(config);

    if (response.status >= 200 && response.status < 300) {
      console.log(`✅ ${endpoint.name}`.green);

      // Save auth token if login endpoint
      if (endpoint.path === '/auth/verify-otp' && response.data.token) {
        authToken = response.data.token;
        console.log('   🔑 Auth token saved'.yellow);
      }

      // Show sample data
      if (response.data) {
        if (Array.isArray(response.data)) {
          console.log(`   📦 Found ${response.data.length} items`.gray);
        } else if (response.data.data && Array.isArray(response.data.data)) {
          console.log(`   📦 Found ${response.data.data.length} items`.gray);
        } else if (response.data.message) {
          console.log(`   💬 ${response.data.message}`.gray);
        }
      }

      results.passed++;
      return true;
    }
  } catch (error) {
    console.log(`❌ ${endpoint.name}`.red);

    if (error.response) {
      console.log(`   ⚠️  ${error.response.status}: ${error.response.data?.message || error.message}`.yellow);
      results.errors.push({
        endpoint: endpoint.name,
        status: error.response.status,
        message: error.response.data?.message || error.message
      });
    } else if (error.code === 'ECONNREFUSED') {
      console.log('   ⚠️  Backend server is not running'.yellow);
      results.errors.push({
        endpoint: endpoint.name,
        message: 'Server not running'
      });
    } else {
      console.log(`   ⚠️  ${error.message}`.yellow);
      results.errors.push({
        endpoint: endpoint.name,
        message: error.message
      });
    }

    results.failed++;
    return false;
  }

  results.total++;
}

// Check if backend is running
async function checkBackendStatus() {
  try {
    const response = await axios.get(`${API_URL}/health`);
    console.log('✅ Backend server is running'.green);
    console.log(`   📡 API URL: ${API_URL}`.gray);
    return true;
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Backend server is not running'.red);
      console.log(`   📡 Tried to connect to: ${API_URL}`.gray);
      console.log('\n💡 To start the backend:'.yellow);
      console.log('   cd user-backend');
      console.log('   npm start');
      return false;
    }
    // Server is running but health endpoint might not exist
    return true;
  }
}

// Main test function
async function runTests() {
  console.log('🔍 REZ App Backend Verification\n'.cyan.bold);
  console.log('='.repeat(50));

  // Check if backend is running
  const isRunning = await checkBackendStatus();
  if (!isRunning) {
    console.log('\n⚠️  Please start the backend server first'.yellow);
    process.exit(1);
  }

  console.log('\n📋 Testing API Endpoints:\n'.cyan);

  // Test each endpoint
  for (const endpoint of endpoints) {
    await testEndpoint(endpoint);
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST SUMMARY'.cyan.bold);
  console.log('='.repeat(50));

  console.log(`\n✅ Passed: ${results.passed}`.green);
  console.log(`❌ Failed: ${results.failed}`.red);
  console.log(`📊 Total: ${results.passed + results.failed}`);

  const passRate = ((results.passed / (results.passed + results.failed)) * 100).toFixed(1);
  console.log(`📈 Pass Rate: ${passRate}%`);

  if (results.errors.length > 0) {
    console.log('\n⚠️  Failed Endpoints:'.yellow);
    results.errors.forEach(error => {
      console.log(`   - ${error.endpoint}: ${error.message}`);
    });
  }

  if (passRate === '100.0') {
    console.log('\n🎉 All endpoints are working correctly!'.green.bold);
    console.log('✅ Your backend is fully functional!'.green);
  } else if (passRate >= 80) {
    console.log('\n✅ Backend is mostly functional'.green);
    console.log('   Some endpoints need attention'.yellow);
  } else if (passRate >= 50) {
    console.log('\n⚠️  Backend is partially functional'.yellow);
    console.log('   Several endpoints need fixing'.yellow);
  } else {
    console.log('\n❌ Backend has significant issues'.red);
    console.log('   Most endpoints are not working'.red);
  }

  // Recommendations
  if (results.failed > 0) {
    console.log('\n💡 Recommendations:'.cyan);

    const authErrors = results.errors.filter(e => e.message.includes('auth') || e.message.includes('token'));
    if (authErrors.length > 0) {
      console.log('   - Check authentication middleware');
      console.log('   - Verify JWT secret is configured');
    }

    const serverErrors = results.errors.filter(e => e.status >= 500);
    if (serverErrors.length > 0) {
      console.log('   - Check server logs for errors');
      console.log('   - Verify database connection');
    }

    const notFoundErrors = results.errors.filter(e => e.status === 404);
    if (notFoundErrors.length > 0) {
      console.log('   - Check route definitions');
      console.log('   - Verify API path prefix');
    }
  }

  console.log('\n' + '='.repeat(50));
}

// Run the tests
runTests().catch(console.error);