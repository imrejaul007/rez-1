/**
 * Comprehensive Integration Test Suite
 * Tests all critical flows and features between frontend and backend
 */

const API_BASE_URL = 'http://localhost:5001/api';
let authToken = null;
let testUserId = null;
let testCartId = null;
let testOrderId = null;
let testProductId = null;
let testStoreId = null;

// Test results storage
const testResults = {
  passed: [],
  failed: [],
  warnings: [],
  performance: []
};

// Helper function to make API calls
async function apiCall(endpoint, method = 'GET', data = null, requiresAuth = false) {
  const startTime = Date.now();

  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };

  if (requiresAuth && authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const config = {
    method,
    headers
  };

  if (data && method !== 'GET') {
    config.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    const responseData = await response.json();
    const duration = Date.now() - startTime;

    return {
      success: response.ok,
      status: response.status,
      data: responseData,
      duration
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    return {
      success: false,
      status: 0,
      error: error.message,
      duration
    };
  }
}

// Test helper functions
function logTest(testName, result, details = '') {
  const emoji = result ? '✅' : '❌';
  console.log(`${emoji} ${testName}`);
  if (details) console.log(`   ${details}`);

  if (result) {
    testResults.passed.push(testName);
  } else {
    testResults.failed.push({ testName, details });
  }
}

function logPerformance(testName, duration) {
  const status = duration < 500 ? '🚀' : duration < 1000 ? '⚡' : '🐌';
  console.log(`${status} ${testName}: ${duration}ms`);
  testResults.performance.push({ testName, duration });
}

function logWarning(message) {
  console.log(`⚠️  ${message}`);
  testResults.warnings.push(message);
}

// Test Suite 1: Health & Connectivity
async function testHealthAndConnectivity() {
  console.log('\n┌─────────────────────────────────────────┐');
  console.log('│  TEST SUITE 1: HEALTH & CONNECTIVITY    │');
  console.log('└─────────────────────────────────────────┘\n');

  // Test 1.1: Backend health check
  try {
    const response = await fetch('http://localhost:5001/health');
    const data = await response.json();
    logTest('Backend Health Check', response.ok && data.status === 'ok');
    if (data.database) {
      logTest('Database Connection', data.database.status === 'healthy');
    }
  } catch (error) {
    logTest('Backend Health Check', false, error.message);
  }

  // Test 1.2: API base URL accessibility
  const apiTest = await apiCall('/user/auth/send-otp', 'POST', { phoneNumber: '9999999999' });
  logTest('API Endpoint Accessibility', apiTest.status !== 0, `Status: ${apiTest.status}`);
}

// Test Suite 2: Authentication Flow
async function testAuthenticationFlow() {
  console.log('\n┌─────────────────────────────────────────┐');
  console.log('│  TEST SUITE 2: AUTHENTICATION FLOW      │');
  console.log('└─────────────────────────────────────────┘\n');

  const testPhoneNumber = `${Date.now().toString().slice(-10)}`;

  // Test 2.1: Send OTP
  const otpResponse = await apiCall('/user/auth/send-otp', 'POST', {
    phoneNumber: testPhoneNumber,
    email: `test${Date.now()}@test.com`
  });

  logTest('Send OTP', otpResponse.success, `Duration: ${otpResponse.duration}ms`);
  logPerformance('Send OTP', otpResponse.duration);

  // Test 2.2: Verify OTP (with test OTP)
  const verifyResponse = await apiCall('/user/auth/verify-otp', 'POST', {
    phoneNumber: testPhoneNumber,
    otp: '123456' // Test OTP
  });

  if (verifyResponse.success && verifyResponse.data.data) {
    authToken = verifyResponse.data.data.tokens?.accessToken;
    testUserId = verifyResponse.data.data.user?.id;
    logTest('Verify OTP', true, `Token received: ${!!authToken}`);
  } else {
    logTest('Verify OTP', false, verifyResponse.error || 'No token received');
    logWarning('Authentication failed - using existing test user if available');
  }

  // Test 2.3: Get Profile
  if (authToken) {
    const profileResponse = await apiCall('/user/auth/me', 'GET', null, true);
    logTest('Get Profile', profileResponse.success);
    logPerformance('Get Profile', profileResponse.duration);
  }

  // Test 2.4: Update Profile
  if (authToken) {
    const updateResponse = await apiCall('/user/auth/profile', 'PUT', {
      profile: {
        firstName: 'Test',
        lastName: 'User'
      }
    }, true);
    logTest('Update Profile', updateResponse.success);
  }
}

// Test Suite 3: Product & Store Operations
async function testProductAndStoreOperations() {
  console.log('\n┌─────────────────────────────────────────┐');
  console.log('│  TEST SUITE 3: PRODUCTS & STORES        │');
  console.log('└─────────────────────────────────────────┘\n');

  // Test 3.1: Get Products
  const productsResponse = await apiCall('/user/products?limit=10', 'GET');
  logTest('Get Products List', productsResponse.success);
  logPerformance('Get Products', productsResponse.duration);

  if (productsResponse.success && productsResponse.data.data?.products?.length > 0) {
    testProductId = productsResponse.data.data.products[0]._id;
    logTest('Product Data Retrieved', true, `Found ${productsResponse.data.data.products.length} products`);
  }

  // Test 3.2: Get Product Details
  if (testProductId) {
    const productDetailResponse = await apiCall(`/user/products/${testProductId}`, 'GET');
    logTest('Get Product Details', productDetailResponse.success);
    logPerformance('Get Product Details', productDetailResponse.duration);
  }

  // Test 3.3: Get Stores
  const storesResponse = await apiCall('/user/stores?limit=10', 'GET');
  logTest('Get Stores List', storesResponse.success);
  logPerformance('Get Stores', storesResponse.duration);

  if (storesResponse.success && storesResponse.data.data?.stores?.length > 0) {
    testStoreId = storesResponse.data.data.stores[0]._id;
    logTest('Store Data Retrieved', true, `Found ${storesResponse.data.data.stores.length} stores`);
  }

  // Test 3.4: Get Store Details
  if (testStoreId) {
    const storeDetailResponse = await apiCall(`/user/stores/${testStoreId}`, 'GET');
    logTest('Get Store Details', storeDetailResponse.success);
  }

  // Test 3.5: Search Products
  const searchResponse = await apiCall('/user/products/search?query=test', 'GET');
  logTest('Search Products', searchResponse.success);
  logPerformance('Product Search', searchResponse.duration);

  // Test 3.6: Get Categories
  const categoriesResponse = await apiCall('/user/categories', 'GET');
  logTest('Get Categories', categoriesResponse.success);
}

// Test Suite 4: Cart Operations
async function testCartOperations() {
  console.log('\n┌─────────────────────────────────────────┐');
  console.log('│  TEST SUITE 4: CART OPERATIONS          │');
  console.log('└─────────────────────────────────────────┘\n');

  if (!authToken) {
    logWarning('Skipping cart tests - no authentication token');
    return;
  }

  // Test 4.1: Get Cart
  const cartResponse = await apiCall('/user/cart', 'GET', null, true);
  logTest('Get Cart', cartResponse.success);
  logPerformance('Get Cart', cartResponse.duration);

  // Test 4.2: Add to Cart
  if (testProductId) {
    const addToCartResponse = await apiCall('/user/cart/items', 'POST', {
      productId: testProductId,
      quantity: 1
    }, true);
    logTest('Add to Cart', addToCartResponse.success);
    logPerformance('Add to Cart', addToCartResponse.duration);

    if (addToCartResponse.success) {
      testCartId = addToCartResponse.data.data?.cart?._id;
    }
  }

  // Test 4.3: Update Cart Item
  if (testProductId) {
    const updateCartResponse = await apiCall('/user/cart/items', 'PUT', {
      productId: testProductId,
      quantity: 2
    }, true);
    logTest('Update Cart Item', updateCartResponse.success);
  }

  // Test 4.4: Get Cart Summary
  const summaryResponse = await apiCall('/user/cart/summary', 'GET', null, true);
  logTest('Get Cart Summary', summaryResponse.success);

  // Test 4.5: Remove from Cart
  if (testProductId) {
    const removeResponse = await apiCall(`/user/cart/items/${testProductId}`, 'DELETE', null, true);
    logTest('Remove from Cart', removeResponse.success);
  }
}

// Test Suite 5: Order Operations
async function testOrderOperations() {
  console.log('\n┌─────────────────────────────────────────┐');
  console.log('│  TEST SUITE 5: ORDER OPERATIONS         │');
  console.log('└─────────────────────────────────────────┘\n');

  if (!authToken) {
    logWarning('Skipping order tests - no authentication token');
    return;
  }

  // Test 5.1: Get Orders
  const ordersResponse = await apiCall('/user/orders', 'GET', null, true);
  logTest('Get Orders List', ordersResponse.success);
  logPerformance('Get Orders', ordersResponse.duration);

  if (ordersResponse.success && ordersResponse.data.data?.orders?.length > 0) {
    testOrderId = ordersResponse.data.data.orders[0]._id;
  }

  // Test 5.2: Get Order Details
  if (testOrderId) {
    const orderDetailResponse = await apiCall(`/user/orders/${testOrderId}`, 'GET', null, true);
    logTest('Get Order Details', orderDetailResponse.success);
    logPerformance('Get Order Details', orderDetailResponse.duration);
  }

  // Test 5.3: Track Order
  if (testOrderId) {
    const trackingResponse = await apiCall(`/user/orders/${testOrderId}/tracking`, 'GET', null, true);
    logTest('Track Order', trackingResponse.success);
  }
}

// Test Suite 6: Wishlist Operations
async function testWishlistOperations() {
  console.log('\n┌─────────────────────────────────────────┐');
  console.log('│  TEST SUITE 6: WISHLIST OPERATIONS      │');
  console.log('└─────────────────────────────────────────┘\n');

  if (!authToken) {
    logWarning('Skipping wishlist tests - no authentication token');
    return;
  }

  // Test 6.1: Get Wishlist
  const wishlistResponse = await apiCall('/user/wishlist', 'GET', null, true);
  logTest('Get Wishlist', wishlistResponse.success);
  logPerformance('Get Wishlist', wishlistResponse.duration);

  // Test 6.2: Add to Wishlist
  if (testProductId) {
    const addResponse = await apiCall('/user/wishlist/items', 'POST', {
      productId: testProductId
    }, true);
    logTest('Add to Wishlist', addResponse.success);
  }

  // Test 6.3: Remove from Wishlist
  if (testProductId) {
    const removeResponse = await apiCall(`/user/wishlist/items/${testProductId}`, 'DELETE', null, true);
    logTest('Remove from Wishlist', removeResponse.success);
  }
}

// Test Suite 7: Review Operations
async function testReviewOperations() {
  console.log('\n┌─────────────────────────────────────────┐');
  console.log('│  TEST SUITE 7: REVIEW OPERATIONS        │');
  console.log('└─────────────────────────────────────────┘\n');

  if (!authToken) {
    logWarning('Skipping review tests - no authentication token');
    return;
  }

  // Test 7.1: Get Product Reviews
  if (testProductId) {
    const reviewsResponse = await apiCall(`/user/reviews/product/${testProductId}`, 'GET');
    logTest('Get Product Reviews', reviewsResponse.success);
    logPerformance('Get Reviews', reviewsResponse.duration);
  }

  // Test 7.2: Get Store Reviews
  if (testStoreId) {
    const storeReviewsResponse = await apiCall(`/user/reviews/store/${testStoreId}`, 'GET');
    logTest('Get Store Reviews', storeReviewsResponse.success);
  }
}

// Test Suite 8: Wallet Operations
async function testWalletOperations() {
  console.log('\n┌─────────────────────────────────────────┐');
  console.log('│  TEST SUITE 8: WALLET OPERATIONS        │');
  console.log('└─────────────────────────────────────────┘\n');

  if (!authToken) {
    logWarning('Skipping wallet tests - no authentication token');
    return;
  }

  // Test 8.1: Get Wallet Balance
  const walletResponse = await apiCall('/user/wallet/balance', 'GET', null, true);
  logTest('Get Wallet Balance', walletResponse.success);
  logPerformance('Get Wallet', walletResponse.duration);

  // Test 8.2: Get Wallet Transactions
  const transactionsResponse = await apiCall('/user/wallet/transactions', 'GET', null, true);
  logTest('Get Wallet Transactions', transactionsResponse.success);
}

// Test Suite 9: Notification Operations
async function testNotificationOperations() {
  console.log('\n┌─────────────────────────────────────────┐');
  console.log('│  TEST SUITE 9: NOTIFICATION OPERATIONS  │');
  console.log('└─────────────────────────────────────────┘\n');

  if (!authToken) {
    logWarning('Skipping notification tests - no authentication token');
    return;
  }

  // Test 9.1: Get Notifications
  const notificationsResponse = await apiCall('/user/notifications', 'GET', null, true);
  logTest('Get Notifications', notificationsResponse.success);
  logPerformance('Get Notifications', notificationsResponse.duration);

  // Test 9.2: Get Unread Count
  const unreadResponse = await apiCall('/user/notifications/unread-count', 'GET', null, true);
  logTest('Get Unread Count', unreadResponse.success);
}

// Test Suite 10: Offers & Vouchers
async function testOffersAndVouchers() {
  console.log('\n┌─────────────────────────────────────────┐');
  console.log('│  TEST SUITE 10: OFFERS & VOUCHERS       │');
  console.log('└─────────────────────────────────────────┘\n');

  // Test 10.1: Get Offers
  const offersResponse = await apiCall('/user/offers', 'GET');
  logTest('Get Offers', offersResponse.success);
  logPerformance('Get Offers', offersResponse.duration);

  // Test 10.2: Get Vouchers
  if (authToken) {
    const vouchersResponse = await apiCall('/user/vouchers', 'GET', null, true);
    logTest('Get Vouchers', vouchersResponse.success);
  }
}

// Test Suite 11: Social Features
async function testSocialFeatures() {
  console.log('\n┌─────────────────────────────────────────┐');
  console.log('│  TEST SUITE 11: SOCIAL FEATURES         │');
  console.log('└─────────────────────────────────────────┘\n');

  // Test 11.1: Get Videos/Projects
  const videosResponse = await apiCall('/user/videos', 'GET');
  logTest('Get Videos/Content', videosResponse.success);
  logPerformance('Get Videos', videosResponse.duration);

  // Test 11.2: Get Projects
  const projectsResponse = await apiCall('/user/projects', 'GET');
  logTest('Get Projects', projectsResponse.success);
}

// Test Suite 12: Search Functionality
async function testSearchFunctionality() {
  console.log('\n┌─────────────────────────────────────────┐');
  console.log('│  TEST SUITE 12: SEARCH FUNCTIONALITY    │');
  console.log('└─────────────────────────────────────────┘\n');

  // Test 12.1: Search Products
  const productSearchResponse = await apiCall('/user/products/search?query=test', 'GET');
  logTest('Search Products', productSearchResponse.success);
  logPerformance('Product Search', productSearchResponse.duration);

  // Test 12.2: Search Stores
  const storeSearchResponse = await apiCall('/user/stores/search?query=test', 'GET');
  logTest('Search Stores', storeSearchResponse.success);
  logPerformance('Store Search', storeSearchResponse.duration);

  // Test 12.3: Filter Products
  const filterResponse = await apiCall('/user/products?category=electronics&minPrice=100&maxPrice=1000', 'GET');
  logTest('Filter Products', filterResponse.success);
}

// Test Suite 13: Payment Integration
async function testPaymentIntegration() {
  console.log('\n┌─────────────────────────────────────────┐');
  console.log('│  TEST SUITE 13: PAYMENT INTEGRATION     │');
  console.log('└─────────────────────────────────────────┘\n');

  if (!authToken) {
    logWarning('Skipping payment tests - no authentication token');
    return;
  }

  // Test 13.1: Get Payment Methods
  const paymentMethodsResponse = await apiCall('/user/payment-methods', 'GET', null, true);
  logTest('Get Payment Methods', paymentMethodsResponse.success);

  // Test 13.2: Get Addresses
  const addressesResponse = await apiCall('/user/addresses', 'GET', null, true);
  logTest('Get Addresses', addressesResponse.success);
}

// Test Suite 14: Advanced Features
async function testAdvancedFeatures() {
  console.log('\n┌─────────────────────────────────────────┐');
  console.log('│  TEST SUITE 14: ADVANCED FEATURES       │');
  console.log('└─────────────────────────────────────────┘\n');

  if (!authToken) {
    logWarning('Skipping advanced feature tests - no authentication token');
    return;
  }

  // Test 14.1: Achievements
  const achievementsResponse = await apiCall('/user/achievements', 'GET', null, true);
  logTest('Get Achievements', achievementsResponse.success);

  // Test 14.2: Activities
  const activitiesResponse = await apiCall('/user/activities', 'GET', null, true);
  logTest('Get Activities', activitiesResponse.success);

  // Test 14.3: Referrals
  const referralResponse = await apiCall('/user/referral', 'GET', null, true);
  logTest('Get Referral Info', referralResponse.success);

  // Test 14.4: Cashback
  const cashbackResponse = await apiCall('/user/cashback', 'GET', null, true);
  logTest('Get Cashback', cashbackResponse.success);

  // Test 14.5: Support
  const supportResponse = await apiCall('/user/support/tickets', 'GET', null, true);
  logTest('Get Support Tickets', supportResponse.success);
}

// Test Suite 15: Error Handling
async function testErrorHandling() {
  console.log('\n┌─────────────────────────────────────────┐');
  console.log('│  TEST SUITE 15: ERROR HANDLING          │');
  console.log('└─────────────────────────────────────────┘\n');

  // Test 15.1: Invalid endpoint
  const invalidResponse = await apiCall('/user/invalid-endpoint', 'GET');
  logTest('Handle Invalid Endpoint', invalidResponse.status === 404);

  // Test 15.2: Unauthorized access
  const unauthorizedResponse = await apiCall('/user/orders', 'GET', null, false);
  logTest('Handle Unauthorized Access', unauthorizedResponse.status === 401);

  // Test 15.3: Invalid data
  const invalidDataResponse = await apiCall('/user/auth/send-otp', 'POST', {
    phoneNumber: 'invalid'
  });
  logTest('Handle Invalid Data', !invalidDataResponse.success);
}

// Generate Final Report
function generateReport() {
  console.log('\n\n');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('           COMPREHENSIVE INTEGRATION TEST REPORT               ');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log(`✅ PASSED TESTS: ${testResults.passed.length}`);
  console.log(`❌ FAILED TESTS: ${testResults.failed.length}`);
  console.log(`⚠️  WARNINGS: ${testResults.warnings.length}\n`);

  if (testResults.failed.length > 0) {
    console.log('\n❌ FAILED TESTS:');
    console.log('─────────────────────────────────────────');
    testResults.failed.forEach(failure => {
      console.log(`\n• ${failure.testName}`);
      if (failure.details) {
        console.log(`  Details: ${failure.details}`);
      }
    });
  }

  if (testResults.warnings.length > 0) {
    console.log('\n\n⚠️  WARNINGS:');
    console.log('─────────────────────────────────────────');
    testResults.warnings.forEach(warning => {
      console.log(`• ${warning}`);
    });
  }

  // Performance Analysis
  console.log('\n\n⚡ PERFORMANCE ANALYSIS:');
  console.log('─────────────────────────────────────────');
  const avgPerformance = testResults.performance.reduce((sum, test) => sum + test.duration, 0) / testResults.performance.length;
  console.log(`Average Response Time: ${avgPerformance.toFixed(2)}ms`);

  const slowTests = testResults.performance.filter(test => test.duration > 1000);
  if (slowTests.length > 0) {
    console.log('\n🐌 Slow Tests (>1000ms):');
    slowTests.forEach(test => {
      console.log(`  • ${test.testName}: ${test.duration}ms`);
    });
  }

  // Success Rate
  const totalTests = testResults.passed.length + testResults.failed.length;
  const successRate = ((testResults.passed.length / totalTests) * 100).toFixed(2);

  console.log('\n\n📊 OVERALL STATISTICS:');
  console.log('─────────────────────────────────────────');
  console.log(`Total Tests Run: ${totalTests}`);
  console.log(`Success Rate: ${successRate}%`);
  console.log(`Total Warnings: ${testResults.warnings.length}`);

  console.log('\n═══════════════════════════════════════════════════════════════\n');
}

// Main execution
async function runAllTests() {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║     COMPREHENSIVE FRONTEND-BACKEND INTEGRATION TEST SUITE     ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log(`\nTest Started at: ${new Date().toISOString()}\n`);

  try {
    await testHealthAndConnectivity();
    await testAuthenticationFlow();
    await testProductAndStoreOperations();
    await testCartOperations();
    await testOrderOperations();
    await testWishlistOperations();
    await testReviewOperations();
    await testWalletOperations();
    await testNotificationOperations();
    await testOffersAndVouchers();
    await testSocialFeatures();
    await testSearchFunctionality();
    await testPaymentIntegration();
    await testAdvancedFeatures();
    await testErrorHandling();

    generateReport();
  } catch (error) {
    console.error('\n❌ CRITICAL ERROR:', error.message);
    console.error(error.stack);
  }

  console.log(`\nTest Completed at: ${new Date().toISOString()}\n`);
}

// Run the tests
runAllTests();
