const axios = require('axios');

// Backend API URL
const API_URL = process.env.API_URL || 'http://localhost:5001/api';

// Test user credentials
const testUser = {
  phoneNumber: '+919876543210',
  otp: '123456'
};

let authToken = null;
let testResults = {
  passed: [],
  failed: [],
  total: 0,
  startTime: new Date()
};

// Test utilities
async function makeRequest(method, path, data = null, requiresAuth = false) {
  const config = {
    method,
    url: `${API_URL}${path}`,
    headers: {}
  };

  if (data) config.data = data;
  if (requiresAuth && authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }

  try {
    const response = await axios(config);
    return { success: true, status: response.status, data: response.data };
  } catch (error) {
    return {
      success: false,
      status: error.response?.status || 0,
      error: error.response?.data?.message || error.message
    };
  }
}

async function runTest(name, testFn) {
  testResults.total++;
  try {
    const result = await testFn();
    if (result.success) {
      testResults.passed.push(name);
      console.log(`✅ ${name}`);
      return true;
    } else {
      testResults.failed.push({ name, error: result.error });
      console.log(`❌ ${name}: ${result.error}`);
      return false;
    }
  } catch (error) {
    testResults.failed.push({ name, error: error.message });
    console.log(`❌ ${name}: ${error.message}`);
    return false;
  }
}

// Main test suite
async function runComprehensiveTests() {
  console.log('🔍 COMPREHENSIVE REZ APP TESTING');
  console.log('='.repeat(60));
  console.log(`📅 Date: ${new Date().toLocaleString()}`);
  console.log(`🔗 API URL: ${API_URL}`);
  console.log('='.repeat(60));

  // 1. AUTHENTICATION TESTS
  console.log('\n📱 AUTHENTICATION TESTS\n');

  await runTest('Send OTP', async () => {
    const result = await makeRequest('POST', '/user/auth/send-otp', {
      phoneNumber: testUser.phoneNumber
    });
    return result;
  });

  await runTest('Verify OTP & Login', async () => {
    const result = await makeRequest('POST', '/user/auth/verify-otp', {
      phoneNumber: testUser.phoneNumber,
      otp: testUser.otp
    });
    if (result.success) {
      authToken = result.data.data?.tokens?.accessToken || result.data.token;
    }
    return result;
  });

  await runTest('Get User Profile', async () => {
    return await makeRequest('GET', '/user/auth/me', null, true);
  });

  // 2. PRODUCTS TESTS
  console.log('\n📦 PRODUCTS TESTS\n');

  await runTest('Get All Products', async () => {
    return await makeRequest('GET', '/products');
  });

  await runTest('Get Featured Products', async () => {
    return await makeRequest('GET', '/products/featured');
  });

  await runTest('Search Products', async () => {
    return await makeRequest('GET', '/products/search?query=phone');
  });

  // 3. CATEGORIES TESTS
  console.log('\n🗂️ CATEGORIES TESTS\n');

  await runTest('Get All Categories', async () => {
    return await makeRequest('GET', '/categories');
  });

  // 4. STORES TESTS
  console.log('\n🏪 STORES TESTS\n');

  await runTest('Get All Stores', async () => {
    return await makeRequest('GET', '/stores');
  });

  await runTest('Get Nearby Stores', async () => {
    return await makeRequest('GET', '/stores/nearby?lat=12.9716&lng=77.5946');
  });

  // 5. CART TESTS
  console.log('\n🛒 CART TESTS\n');

  await runTest('Get Cart', async () => {
    return await makeRequest('GET', '/cart', null, true);
  });

  let productId = null;
  await runTest('Add to Cart', async () => {
    // First get a product
    const productsResult = await makeRequest('GET', '/products');
    if (productsResult.success && productsResult.data.products?.length > 0) {
      productId = productsResult.data.products[0]._id;
      return await makeRequest('POST', '/cart/add', {
        productId,
        quantity: 1
      }, true);
    }
    return { success: false, error: 'No products available' };
  });

  // 6. ORDERS TESTS
  console.log('\n📋 ORDERS TESTS\n');

  await runTest('Get Orders', async () => {
    return await makeRequest('GET', '/orders', null, true);
  });

  // 7. WISHLIST TESTS
  console.log('\n❤️ WISHLIST TESTS\n');

  await runTest('Get Wishlist', async () => {
    return await makeRequest('GET', '/wishlist', null, true);
  });

  // 8. WALLET TESTS
  console.log('\n💰 WALLET TESTS\n');

  await runTest('Get Wallet Balance', async () => {
    return await makeRequest('GET', '/wallet/balance', null, true);
  });

  await runTest('Get Wallet Transactions', async () => {
    return await makeRequest('GET', '/wallet/transactions', null, true);
  });

  // 9. VOUCHERS TESTS
  console.log('\n🎟️ VOUCHERS TESTS\n');

  await runTest('Get Available Vouchers', async () => {
    return await makeRequest('GET', '/vouchers');
  });

  await runTest('Get My Vouchers', async () => {
    return await makeRequest('GET', '/vouchers/my', null, true);
  });

  // 10. LOYALTY TESTS
  console.log('\n🏆 LOYALTY TESTS\n');

  await runTest('Get Loyalty Points', async () => {
    return await makeRequest('GET', '/loyalty/points', null, true);
  });

  // 11. NOTIFICATIONS TESTS
  console.log('\n🔔 NOTIFICATIONS TESTS\n');

  await runTest('Get Notifications', async () => {
    return await makeRequest('GET', '/notifications', null, true);
  });

  // 12. OFFERS TESTS
  console.log('\n🎁 OFFERS TESTS\n');

  await runTest('Get Active Offers', async () => {
    return await makeRequest('GET', '/offers');
  });

  // 13. REVIEWS TESTS
  console.log('\n⭐ REVIEWS TESTS\n');

  await runTest('Get Product Reviews', async () => {
    if (productId) {
      return await makeRequest('GET', `/reviews/product/${productId}`);
    }
    return { success: false, error: 'No product ID available' };
  });

  // 14. SEARCH TESTS
  console.log('\n🔍 SEARCH TESTS\n');

  await runTest('Global Search', async () => {
    return await makeRequest('GET', '/search?q=phone');
  });

  // 15. USER SETTINGS TESTS
  console.log('\n⚙️ USER SETTINGS TESTS\n');

  await runTest('Get User Settings', async () => {
    return await makeRequest('GET', '/user-settings', null, true);
  });

  // 16. ADDRESSES TESTS
  console.log('\n📍 ADDRESSES TESTS\n');

  await runTest('Get User Addresses', async () => {
    return await makeRequest('GET', '/addresses', null, true);
  });

  // 17. PAYMENT METHODS TESTS
  console.log('\n💳 PAYMENT METHODS TESTS\n');

  await runTest('Get Payment Methods', async () => {
    return await makeRequest('GET', '/payment-methods', null, true);
  });

  // 18. SOCIAL FEATURES TESTS
  console.log('\n👥 SOCIAL FEATURES TESTS\n');

  await runTest('Get Social Feed', async () => {
    return await makeRequest('GET', '/social-media/feed', null, true);
  });

  // 19. REFERRALS TESTS
  console.log('\n🔗 REFERRALS TESTS\n');

  await runTest('Get Referral Info', async () => {
    return await makeRequest('GET', '/referrals/info', null, true);
  });

  // 20. LOGOUT TEST
  console.log('\n🚪 LOGOUT TEST\n');

  await runTest('Logout', async () => {
    return await makeRequest('POST', '/user/auth/logout', {}, true);
  });

  // FINAL SUMMARY
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));

  const passRate = ((testResults.passed.length / testResults.total) * 100).toFixed(1);
  const duration = ((new Date() - testResults.startTime) / 1000).toFixed(1);

  console.log(`\n✅ Passed: ${testResults.passed.length}/${testResults.total} (${passRate}%)`);
  console.log(`❌ Failed: ${testResults.failed.length}/${testResults.total}`);
  console.log(`⏱️ Duration: ${duration} seconds`);

  if (testResults.failed.length > 0) {
    console.log('\n❌ FAILED TESTS:');
    testResults.failed.forEach(test => {
      console.log(`   - ${test.name}: ${test.error}`);
    });
  }

  // HEALTH SCORE CALCULATION
  const healthScore = Math.round(passRate);
  console.log('\n' + '='.repeat(60));
  console.log('🏥 SYSTEM HEALTH SCORE: ' + healthScore + '/100');

  if (healthScore >= 90) {
    console.log('🎉 EXCELLENT - System is fully operational!');
  } else if (healthScore >= 75) {
    console.log('✅ GOOD - System is mostly functional');
  } else if (healthScore >= 50) {
    console.log('⚠️ FAIR - Some features need attention');
  } else {
    console.log('❌ POOR - System needs immediate attention');
  }

  console.log('='.repeat(60));

  // RECOMMENDATIONS
  if (testResults.failed.length > 0) {
    console.log('\n💡 RECOMMENDATIONS:');

    const authFailed = testResults.failed.some(t => t.name.toLowerCase().includes('auth'));
    if (authFailed) {
      console.log('   - Check authentication middleware and JWT configuration');
    }

    const cartFailed = testResults.failed.some(t => t.name.toLowerCase().includes('cart'));
    if (cartFailed) {
      console.log('   - Verify cart service and product availability');
    }

    const dbFailed = testResults.failed.some(t => t.error.includes('not found') || t.error.includes('empty'));
    if (dbFailed) {
      console.log('   - Run: node scripts/seed-database.js to populate test data');
    }
  }

  return {
    passRate,
    healthScore,
    passed: testResults.passed.length,
    failed: testResults.failed.length,
    total: testResults.total
  };
}

// Check server connection first
async function checkServerConnection() {
  try {
    await axios.get(`${API_URL}/health`);
    return true;
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Backend server is not running!');
      console.log('\n💡 Please start the backend server:');
      console.log('   cd user-backend');
      console.log('   npm start\n');
      return false;
    }
    return true; // Server is running, health endpoint might not exist
  }
}

// Main execution
async function main() {
  console.log('\n🚀 REZ APP COMPREHENSIVE TESTING SUITE\n');

  const serverRunning = await checkServerConnection();
  if (!serverRunning) {
    process.exit(1);
  }

  const results = await runComprehensiveTests();

  // Exit with appropriate code
  process.exit(results.healthScore >= 75 ? 0 : 1);
}

// Run tests
main().catch(console.error);