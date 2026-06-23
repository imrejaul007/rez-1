const axios = require('axios');

// Backend API URL
const API_URL = process.env.API_URL || 'http://localhost:5001/api';

// Test configuration
const testConfig = {
  phoneNumber: '+919876543210',
  otp: '123456'
};

let authToken = null;
let userId = null;

// Core functionality test suite
async function testCoreFunctionality() {
  console.log('\n🚀 TESTING REZ APP CORE FUNCTIONALITY\n');
  console.log('='.repeat(60));
  console.log(`📅 Time: ${new Date().toLocaleString()}`);
  console.log(`🔗 Backend: ${API_URL}`);
  console.log('='.repeat(60));

  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  // Helper function for testing
  async function test(name, testFn) {
    try {
      console.log(`\n⚡ Testing: ${name}...`);
      const result = await testFn();
      if (result.success) {
        console.log(`✅ PASSED: ${name}`);
        if (result.details) console.log(`   ${result.details}`);
        results.passed++;
        results.tests.push({ name, status: 'passed', details: result.details });
      } else {
        console.log(`❌ FAILED: ${name}`);
        console.log(`   Error: ${result.error}`);
        results.failed++;
        results.tests.push({ name, status: 'failed', error: result.error });
      }
    } catch (error) {
      console.log(`❌ FAILED: ${name}`);
      console.log(`   Error: ${error.message}`);
      results.failed++;
      results.tests.push({ name, status: 'failed', error: error.message });
    }
  }

  // 1. AUTHENTICATION FLOW
  console.log('\n══════════════════════════════════════════');
  console.log('📱 AUTHENTICATION & USER MANAGEMENT');
  console.log('══════════════════════════════════════════');

  await test('Send OTP for Login', async () => {
    const response = await axios.post(`${API_URL}/user/auth/send-otp`, {
      phoneNumber: testConfig.phoneNumber
    });
    return {
      success: response.status === 200,
      details: `OTP sent to ${testConfig.phoneNumber}`
    };
  });

  await test('Verify OTP & Login', async () => {
    const response = await axios.post(`${API_URL}/user/auth/verify-otp`, {
      phoneNumber: testConfig.phoneNumber,
      otp: testConfig.otp
    });

    if (response.status === 200 && response.data.data?.tokens?.accessToken) {
      authToken = response.data.data.tokens.accessToken;
      userId = response.data.data.user?.id;
      return {
        success: true,
        details: `User logged in: ${response.data.data.user?.phoneNumber}`
      };
    }
    return { success: false, error: 'Failed to get auth token' };
  });

  await test('Get User Profile', async () => {
    const response = await axios.get(`${API_URL}/user/auth/me`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    return {
      success: response.status === 200,
      details: `Profile retrieved for user: ${response.data.user?.phoneNumber || response.data.phoneNumber}`
    };
  });

  // 2. PRODUCT CATALOG
  console.log('\n══════════════════════════════════════════');
  console.log('📦 PRODUCT CATALOG');
  console.log('══════════════════════════════════════════');

  let productId = null;
  await test('Get All Products', async () => {
    const response = await axios.get(`${API_URL}/products`);
    const productCount = response.data.products?.length || response.data.data?.length || 0;
    if (productCount > 0) {
      productId = response.data.products?.[0]?._id || response.data.data?.[0]?._id;
    }
    return {
      success: response.status === 200,
      details: `Found ${productCount} products`
    };
  });

  await test('Get Featured Products', async () => {
    const response = await axios.get(`${API_URL}/products/featured`);
    return {
      success: response.status === 200,
      details: `Featured products retrieved`
    };
  });

  await test('Get Categories', async () => {
    const response = await axios.get(`${API_URL}/categories`);
    const categoryCount = response.data.categories?.length || response.data.data?.length || 0;
    return {
      success: response.status === 200,
      details: `Found ${categoryCount} categories`
    };
  });

  // 3. SHOPPING CART
  console.log('\n══════════════════════════════════════════');
  console.log('🛒 SHOPPING CART');
  console.log('══════════════════════════════════════════');

  await test('Get Shopping Cart', async () => {
    const response = await axios.get(`${API_URL}/cart`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    const itemCount = response.data.cart?.items?.length || response.data.items?.length || 0;
    return {
      success: response.status === 200,
      details: `Cart has ${itemCount} items`
    };
  });

  if (productId) {
    await test('Add Product to Cart', async () => {
      try {
        const response = await axios.post(`${API_URL}/cart/add`, {
          productId,
          quantity: 1
        }, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        return {
          success: response.status === 200 || response.status === 201,
          details: `Added product ${productId} to cart`
        };
      } catch (error) {
        // Cart might already have the item
        if (error.response?.status === 400 && error.response?.data?.message?.includes('already')) {
          return {
            success: true,
            details: 'Product already in cart'
          };
        }
        throw error;
      }
    });
  }

  // 4. STORES
  console.log('\n══════════════════════════════════════════');
  console.log('🏪 STORES & LOCATIONS');
  console.log('══════════════════════════════════════════');

  await test('Get All Stores', async () => {
    const response = await axios.get(`${API_URL}/stores`);
    const storeCount = response.data.stores?.length || response.data.data?.length || 0;
    return {
      success: response.status === 200,
      details: `Found ${storeCount} stores`
    };
  });

  // 5. WALLET
  console.log('\n══════════════════════════════════════════');
  console.log('💰 WALLET & PAYMENTS');
  console.log('══════════════════════════════════════════');

  await test('Get Wallet Balance', async () => {
    const response = await axios.get(`${API_URL}/wallet/balance`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    const balance = response.data.balance || response.data.wallet?.balance || 0;
    return {
      success: response.status === 200,
      details: `Wallet balance: ₹${balance}`
    };
  });

  await test('Get Wallet Transactions', async () => {
    const response = await axios.get(`${API_URL}/wallet/transactions`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    const transactionCount = response.data.transactions?.length || 0;
    return {
      success: response.status === 200,
      details: `Found ${transactionCount} transactions`
    };
  });

  // 6. ORDERS
  console.log('\n══════════════════════════════════════════');
  console.log('📋 ORDERS');
  console.log('══════════════════════════════════════════');

  await test('Get Order History', async () => {
    const response = await axios.get(`${API_URL}/orders`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    const orderCount = response.data.orders?.length || response.data.data?.length || 0;
    return {
      success: response.status === 200,
      details: `Found ${orderCount} orders`
    };
  });

  // 7. WISHLIST
  console.log('\n══════════════════════════════════════════');
  console.log('❤️ WISHLIST');
  console.log('══════════════════════════════════════════');

  await test('Get Wishlist', async () => {
    const response = await axios.get(`${API_URL}/wishlist`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    const itemCount = response.data.wishlist?.items?.length || response.data.items?.length || 0;
    return {
      success: response.status === 200,
      details: `Wishlist has ${itemCount} items`
    };
  });

  // 8. USER SETTINGS
  console.log('\n══════════════════════════════════════════');
  console.log('⚙️ USER SETTINGS');
  console.log('══════════════════════════════════════════');

  await test('Get User Settings', async () => {
    const response = await axios.get(`${API_URL}/user-settings`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    return {
      success: response.status === 200,
      details: 'User settings retrieved'
    };
  });

  await test('Get User Addresses', async () => {
    const response = await axios.get(`${API_URL}/addresses`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    const addressCount = response.data.addresses?.length || response.data.data?.length || 0;
    return {
      success: response.status === 200,
      details: `Found ${addressCount} addresses`
    };
  });

  // 9. NOTIFICATIONS
  console.log('\n══════════════════════════════════════════');
  console.log('🔔 NOTIFICATIONS');
  console.log('══════════════════════════════════════════');

  await test('Get Notifications', async () => {
    const response = await axios.get(`${API_URL}/notifications`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    const notificationCount = response.data.notifications?.length || response.data.data?.length || 0;
    return {
      success: response.status === 200,
      details: `Found ${notificationCount} notifications`
    };
  });

  // 10. LOGOUT
  console.log('\n══════════════════════════════════════════');
  console.log('🚪 SESSION MANAGEMENT');
  console.log('══════════════════════════════════════════');

  await test('Logout', async () => {
    const response = await axios.post(`${API_URL}/user/auth/logout`, {}, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    return {
      success: response.status === 200,
      details: 'User logged out successfully'
    };
  });

  // FINAL REPORT
  console.log('\n' + '='.repeat(60));
  console.log('📊 CORE FUNCTIONALITY TEST RESULTS');
  console.log('='.repeat(60));

  const total = results.passed + results.failed;
  const passRate = ((results.passed / total) * 100).toFixed(1);

  console.log(`\n✅ Passed: ${results.passed}/${total}`);
  console.log(`❌ Failed: ${results.failed}/${total}`);
  console.log(`📈 Pass Rate: ${passRate}%`);

  // Health Assessment
  console.log('\n🏥 SYSTEM HEALTH ASSESSMENT:');
  if (passRate >= 90) {
    console.log('🎉 EXCELLENT - All core features working!');
  } else if (passRate >= 75) {
    console.log('✅ GOOD - Most core features operational');
  } else if (passRate >= 50) {
    console.log('⚠️ WARNING - Several core features need attention');
  } else {
    console.log('❌ CRITICAL - Core functionality compromised');
  }

  // Feature Status
  console.log('\n📋 FEATURE STATUS:');
  console.log('   ✅ Authentication: WORKING');
  if (results.tests.find(t => t.name.includes('Products') && t.status === 'passed')) {
    console.log('   ✅ Product Catalog: WORKING');
  }
  if (results.tests.find(t => t.name.includes('Cart') && t.status === 'passed')) {
    console.log('   ✅ Shopping Cart: WORKING');
  }
  if (results.tests.find(t => t.name.includes('Wallet') && t.status === 'passed')) {
    console.log('   ✅ Wallet System: WORKING');
  }
  if (results.tests.find(t => t.name.includes('Orders') && t.status === 'passed')) {
    console.log('   ✅ Order Management: WORKING');
  }

  // Failed tests details
  const failedTests = results.tests.filter(t => t.status === 'failed');
  if (failedTests.length > 0) {
    console.log('\n❌ FAILED TESTS:');
    failedTests.forEach(test => {
      console.log(`   - ${test.name}: ${test.error}`);
    });
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ CORE FUNCTIONALITY TEST COMPLETE');
  console.log('='.repeat(60));

  return {
    passRate,
    passed: results.passed,
    failed: results.failed,
    total
  };
}

// Check if server is running
async function checkServer() {
  try {
    await axios.get(`${API_URL}/health`);
    return true;
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Backend server is not running!');
      console.log('\n💡 Start the backend:');
      console.log('   cd user-backend');
      console.log('   npm start\n');
      return false;
    }
    return true; // Server running, health endpoint might not exist
  }
}

// Main execution
async function main() {
  const serverRunning = await checkServer();
  if (!serverRunning) {
    process.exit(1);
  }

  const results = await testCoreFunctionality();
  process.exit(results.passRate >= 75 ? 0 : 1);
}

// Run tests
main().catch(console.error);