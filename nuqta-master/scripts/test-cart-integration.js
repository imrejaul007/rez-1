#!/usr/bin/env node

// Cart Integration test script to verify cart functionality
const axios = require('axios');

const API_BASE_URL = 'http://localhost:5001/api';

// Test user token (replace with a valid token)
const TEST_TOKEN = '<JWT_TOKEN_REDACTED>';

// Test product IDs from our backend
const TEST_PRODUCT_IDS = {
  IPHONE: '68da62658dc2bd85d0afdb4e',
  JAVASCRIPT_BOOK: '68da62658dc2bd85d0afdb57',
  DATA_SCIENCE_BOOK: '68da62658dc2bd85d0afdb58'
};

// Helper function to make authenticated API calls
async function apiCall(method, endpoint, data = null) {
  try {
    const config = {
      method,
      url: `${API_BASE_URL}${endpoint}`,
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json'
      }
    };

    if (data && (method === 'POST' || method === 'PUT')) {
      config.data = data;
    }

    const response = await axios(config);
    return {
      success: true,
      data: response.data.data || response.data,
      message: response.data.message,
      status: response.status
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || error.message,
      status: error.response?.status || 500
    };
  }
}

async function testCartIntegration() {
  console.log('🧪 Starting Cart Integration Tests...\n');

  try {
    // Test 1: Get Cart
    console.log('📋 Test 1: Get Cart');
    const cartResponse = await apiCall('GET', '/cart');
    console.log('✅ Get Cart Response:', {
      success: cartResponse.success,
      itemCount: cartResponse.data?.itemCount || 0,
      storeCount: cartResponse.data?.storeCount || 0,
      subtotal: cartResponse.data?.totals?.subtotal || 0,
      status: cartResponse.status
    });
    if (!cartResponse.success) {
      console.log('❌ Error:', cartResponse.error);
    }

    // Test 2: Add Item to Cart
    console.log('\n➕ Test 2: Add Item to Cart (JavaScript Book)');
    const addResponse = await apiCall('POST', '/cart/add', {
      productId: TEST_PRODUCT_IDS.JAVASCRIPT_BOOK,
      quantity: 1
    });
    console.log('✅ Add to Cart Response:', {
      success: addResponse.success,
      itemCount: addResponse.data?.itemCount || 0,
      message: addResponse.message,
      status: addResponse.status
    });
    if (!addResponse.success) {
      console.log('❌ Error:', addResponse.error);
    }

    // Test 3: Update Item Quantity (iPhone)
    console.log('\n✏️ Test 3: Update Item Quantity (iPhone to 3)');
    const updateResponse = await apiCall('PUT', `/cart/item/${TEST_PRODUCT_IDS.IPHONE}`, {
      quantity: 3
    });
    console.log('✅ Update Item Response:', {
      success: updateResponse.success,
      itemCount: updateResponse.data?.itemCount || 0,
      message: updateResponse.message,
      status: updateResponse.status
    });
    if (!updateResponse.success) {
      console.log('❌ Error:', updateResponse.error);
    }

    // Test 4: Get Cart Summary
    console.log('\n📊 Test 4: Get Cart Summary');
    const summaryResponse = await apiCall('GET', '/cart/summary');
    console.log('✅ Cart Summary Response:', {
      success: summaryResponse.success,
      itemCount: summaryResponse.data?.itemCount || 0,
      subtotal: summaryResponse.data?.totals?.subtotal || 0,
      tax: summaryResponse.data?.totals?.tax || 0,
      total: summaryResponse.data?.totals?.total || 0,
      status: summaryResponse.status
    });
    if (!summaryResponse.success) {
      console.log('❌ Error:', summaryResponse.error);
    }

    // Test 5: Validate Cart
    console.log('\n🔍 Test 5: Validate Cart');
    const validateResponse = await apiCall('GET', '/cart/validate');
    console.log('✅ Validate Cart Response:', {
      success: validateResponse.success,
      valid: validateResponse.data?.isValid || false,
      message: validateResponse.message,
      status: validateResponse.status
    });
    if (!validateResponse.success) {
      console.log('❌ Error:', validateResponse.error);
    }

    // Test 6: Remove Item (JavaScript Book)
    console.log('\n🗑️ Test 6: Remove Item (JavaScript Book)');
    const removeResponse = await apiCall('DELETE', `/cart/item/${TEST_PRODUCT_IDS.JAVASCRIPT_BOOK}`);
    console.log('✅ Remove Item Response:', {
      success: removeResponse.success,
      itemCount: removeResponse.data?.itemCount || 0,
      message: removeResponse.message,
      status: removeResponse.status
    });
    if (!removeResponse.success) {
      console.log('❌ Error:', removeResponse.error);
    }

    // Test 7: Apply Coupon (if available)
    console.log('\n🎟️ Test 7: Apply Coupon');
    const couponResponse = await apiCall('POST', '/cart/coupon', {
      couponCode: 'WELCOME10'
    });
    console.log('✅ Apply Coupon Response:', {
      success: couponResponse.success,
      message: couponResponse.message,
      status: couponResponse.status
    });
    if (!couponResponse.success) {
      console.log('❌ Error:', couponResponse.error);
    }

    // Final Cart State
    console.log('\n📋 Final: Get Complete Cart State');
    const finalCartResponse = await apiCall('GET', '/cart');
    if (finalCartResponse.success) {
      console.log('✅ Final Cart:', {
        success: finalCartResponse.success,
        itemCount: finalCartResponse.data?.itemCount || 0,
        storeCount: finalCartResponse.data?.storeCount || 0,
        subtotal: finalCartResponse.data?.totals?.subtotal || 0,
        tax: finalCartResponse.data?.totals?.tax || 0,
        total: finalCartResponse.data?.totals?.total || 0,
        savings: finalCartResponse.data?.totals?.savings || 0,
        couponApplied: !!finalCartResponse.data?.coupon?.code,
        items: finalCartResponse.data?.items?.map(item => ({
          name: item.product?.name,
          quantity: item.quantity,
          price: item.price
        })) || []
      });
    } else {
      console.log('❌ Final Cart Error:', finalCartResponse.error);
    }

    console.log('\n🎉 Cart Integration Tests Completed!');

  } catch (error) {
    console.error('❌ Cart Integration Test Failed:', error.message);
  }
}

// Run the tests
testCartIntegration();
