// Test Order Tracking Integration
// This script tests the order tracking page with real MongoDB data

const API_BASE_URL = 'http://localhost:5001/api';
const AUTH_TOKEN = '<JWT_TOKEN_REDACTED>';

interface TestResult {
  test: string;
  status: 'PASS' | 'FAIL';
  message: string;
  data?: any;
}

const results: TestResult[] = [];

async function makeRequest(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  console.log(`\n🔍 Making request to: ${url}`);

  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${AUTH_TOKEN}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = await response.json();
  console.log(`Response status: ${response.status}`);
  console.log(`Response data:`, JSON.stringify(data, null, 2));

  return { response, data };
}

async function testGetOrders() {
  console.log('\n📦 TEST 1: Get All Orders');
  console.log('=' .repeat(50));

  try {
    const { response, data } = await makeRequest('/orders?page=1&limit=50');

    if (response.ok && data.success) {
      const ordersCount = data.data?.orders?.length || 0;
      results.push({
        test: 'Get Orders',
        status: 'PASS',
        message: `Successfully retrieved ${ordersCount} orders`,
        data: {
          totalOrders: ordersCount,
          orders: data.data.orders?.map((o: any) => ({
            orderNumber: o.orderNumber,
            status: o.status,
            total: o.totals?.total || o.summary?.total
          }))
        }
      });

      return data.data.orders;
    } else {
      results.push({
        test: 'Get Orders',
        status: 'FAIL',
        message: data.message || 'Failed to retrieve orders'
      });
      return [];
    }
  } catch (error: any) {
    results.push({
      test: 'Get Orders',
      status: 'FAIL',
      message: `Error: ${error.message}`
    });
    return [];
  }
}

async function testGetOrderById(orderId: string) {
  console.log(`\n📦 TEST 2: Get Order by ID (${orderId})`);
  console.log('=' .repeat(50));

  try {
    const { response, data } = await makeRequest(`/orders/${orderId}`);

    if (response.ok && data.success) {
      results.push({
        test: 'Get Order by ID',
        status: 'PASS',
        message: `Successfully retrieved order ${data.data.orderNumber}`,
        data: {
          orderNumber: data.data.orderNumber,
          status: data.data.status,
          items: data.data.items?.length,
          timeline: data.data.timeline?.length
        }
      });

      return data.data;
    } else {
      results.push({
        test: 'Get Order by ID',
        status: 'FAIL',
        message: data.message || 'Failed to retrieve order'
      });
      return null;
    }
  } catch (error: any) {
    results.push({
      test: 'Get Order by ID',
      status: 'FAIL',
      message: `Error: ${error.message}`
    });
    return null;
  }
}

async function testGetOrderTracking(orderId: string) {
  console.log(`\n📍 TEST 3: Get Order Tracking (${orderId})`);
  console.log('=' .repeat(50));

  try {
    const { response, data } = await makeRequest(`/orders/${orderId}/tracking`);

    if (response.ok && data.success) {
      results.push({
        test: 'Get Order Tracking',
        status: 'PASS',
        message: `Successfully retrieved tracking for order`,
        data: {
          currentStatus: data.data.currentStatus,
          timeline: data.data.timeline?.length,
          estimatedDelivery: data.data.estimatedDeliveryTime
        }
      });

      return data.data;
    } else {
      results.push({
        test: 'Get Order Tracking',
        status: 'FAIL',
        message: data.message || 'Failed to retrieve tracking'
      });
      return null;
    }
  } catch (error: any) {
    results.push({
      test: 'Get Order Tracking',
      status: 'FAIL',
      message: `Error: ${error.message}`
    });
    return null;
  }
}

async function testDataMapping(order: any) {
  console.log('\n🗺️  TEST 4: Data Mapping Validation');
  console.log('=' .repeat(50));

  const issues: string[] = [];

  // Check required fields
  if (!order.orderNumber) issues.push('Missing orderNumber');
  if (!order.status) issues.push('Missing status');
  if (!order.items || order.items.length === 0) issues.push('Missing or empty items');
  if (!order.totals && !order.summary) issues.push('Missing totals/summary');
  if (!order.timeline || order.timeline.length === 0) issues.push('Missing or empty timeline');

  // Check items structure
  if (order.items && order.items.length > 0) {
    const item = order.items[0];
    if (!item.product) issues.push('Item missing product reference');
    if (!item.name) issues.push('Item missing name');
    if (item.quantity === undefined) issues.push('Item missing quantity');
  }

  // Check timeline structure
  if (order.timeline && order.timeline.length > 0) {
    const event = order.timeline[0];
    if (!event.status) issues.push('Timeline event missing status');
    if (!event.message) issues.push('Timeline event missing message');
    if (!event.timestamp) issues.push('Timeline event missing timestamp');
  }

  if (issues.length === 0) {
    results.push({
      test: 'Data Mapping',
      status: 'PASS',
      message: 'All required fields present and properly structured'
    });
  } else {
    results.push({
      test: 'Data Mapping',
      status: 'FAIL',
      message: `Data mapping issues: ${issues.join(', ')}`,
      data: { issues }
    });
  }
}

function printResults() {
  console.log('\n\n' + '='.repeat(70));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('='.repeat(70));

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;

  results.forEach((result, index) => {
    const icon = result.status === 'PASS' ? '✅' : '❌';
    console.log(`\n${icon} Test ${index + 1}: ${result.test}`);
    console.log(`   Status: ${result.status}`);
    console.log(`   Message: ${result.message}`);
    if (result.data) {
      console.log(`   Data:`, JSON.stringify(result.data, null, 2));
    }
  });

  console.log('\n' + '='.repeat(70));
  console.log(`✅ PASSED: ${passed}`);
  console.log(`❌ FAILED: ${failed}`);
  console.log(`📊 TOTAL:  ${results.length}`);
  console.log('='.repeat(70));

  // Print recommendations
  console.log('\n📝 RECOMMENDATIONS:');
  if (failed === 0) {
    console.log('   ✅ All tests passed! The tracking page is properly integrated.');
  } else {
    console.log('   ⚠️  Some tests failed. Please review the issues above.');
    console.log('   ⚠️  Ensure the backend is running and the token is valid.');
  }
  console.log('\n');
}

async function runTests() {
  console.log('🚀 Starting Order Tracking Integration Tests');
  console.log('Token:', AUTH_TOKEN.substring(0, 20) + '...');
  console.log('API URL:', API_BASE_URL);

  try {
    // Test 1: Get all orders
    const orders = await testGetOrders();

    if (orders && orders.length > 0) {
      const firstOrder = orders[0];
      const orderId = firstOrder._id;

      // Test 2: Get order by ID
      const order = await testGetOrderById(orderId);

      if (order) {
        // Test 3: Get order tracking
        await testGetOrderTracking(orderId);

        // Test 4: Validate data mapping
        await testDataMapping(order);
      }
    } else {
      console.log('\n⚠️  No orders found in database. Cannot test individual order endpoints.');
      results.push({
        test: 'Get Order by ID',
        status: 'FAIL',
        message: 'No orders available to test'
      });
      results.push({
        test: 'Get Order Tracking',
        status: 'FAIL',
        message: 'No orders available to test'
      });
      results.push({
        test: 'Data Mapping',
        status: 'FAIL',
        message: 'No orders available to test'
      });
    }

  } catch (error: any) {
    console.error('\n❌ Fatal error during tests:', error);
  }

  // Print final results
  printResults();
}

// Run tests
runTests().catch(console.error);

