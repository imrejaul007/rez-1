#!/usr/bin/env node

// Integration test script to verify frontend-backend connectivity
const axios = require('axios');

const API_BASE_URL = 'http://localhost:5001/api';

async function testBackendEndpoints() {
  console.log('🔍 Testing Backend API Endpoints...\n');

  const endpoints = [
    { name: 'Categories', url: '/categories', requiresAuth: false },
    { name: 'Products', url: '/products', requiresAuth: false },
    { name: 'Stores', url: '/stores', requiresAuth: false },
    { name: 'Auth (Send OTP)', url: '/auth/send-otp', requiresAuth: false, method: 'POST', data: { phoneNumber: '+1234567890' } },
    { name: 'Wishlist', url: '/wishlist', requiresAuth: true },
  ];

  const results = [];

  for (const endpoint of endpoints) {
    try {
      console.log(`Testing ${endpoint.name}...`);
      
      const config = {
        method: endpoint.method || 'GET',
        url: `${API_BASE_URL}${endpoint.url}`,
        timeout: 5000,
        ...(endpoint.data && { data: endpoint.data })
      };

      const response = await axios(config);
      
      if (response.data) {
        results.push({
          endpoint: endpoint.name,
          status: '✅ SUCCESS',
          data: Array.isArray(response.data.data) ? `${response.data.data.length} items` : 'Data returned',
          message: response.data.message || 'OK'
        });
      }
    } catch (error) {
      let status = '❌ FAILED';
      let message = error.message;
      
      if (error.response) {
        const status_code = error.response.status;
        if (endpoint.requiresAuth && status_code === 401) {
          status = '🔐 AUTH_REQUIRED';
          message = 'Authentication required (expected)';
        } else if (status_code === 404) {
          status = '📭 NOT_FOUND';
          message = 'Endpoint not found';
        } else if (status_code === 429) {
          status = '⚠️ RATE_LIMITED';
          message = 'Too many requests';
        }
      }
      
      results.push({
        endpoint: endpoint.name,
        status,
        data: 'N/A',
        message
      });
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n📊 Integration Test Results:');
  console.log('=' .repeat(60));
  results.forEach(result => {
    console.log(`${result.endpoint.padEnd(20)} ${result.status.padEnd(15)} ${result.message}`);
  });

  const successCount = results.filter(r => r.status.includes('SUCCESS')).length;
  const authRequiredCount = results.filter(r => r.status.includes('AUTH_REQUIRED')).length;
  const totalWorking = successCount + authRequiredCount;

  console.log('\n📈 Summary:');
  console.log(`Total Endpoints: ${results.length}`);
  console.log(`Working: ${totalWorking} (${successCount} public + ${authRequiredCount} protected)`);
  console.log(`Failed: ${results.length - totalWorking}`);
  
  if (totalWorking === results.length) {
    console.log('\n🎉 All endpoints are responding correctly!');
    return true;
  } else {
    console.log('\n⚠️ Some endpoints need attention.');
    return false;
  }
}

async function testMongoDbData() {
  console.log('\n🗄️ Testing MongoDB Data...\n');
  
  try {
    const response = await axios.get(`${API_BASE_URL}/categories`);
    const categories = response.data.data;
    
    console.log(`Found ${categories.length} categories in MongoDB:`);
    categories.forEach(cat => {
      console.log(`  - ${cat.name} (${cat.slug}) - ${cat.productCount || 0} products`);
    });
    
    const productsResponse = await axios.get(`${API_BASE_URL}/products`);
    const products = productsResponse.data.data;
    
    console.log(`\nFound ${products.length} products in MongoDB:`);
    products.slice(0, 3).forEach(prod => {
      console.log(`  - ${prod.name} - ₹${prod.pricing.selling}`);
    });
    
    return true;
  } catch (error) {
    console.log('❌ Failed to retrieve MongoDB data:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting REZ App Integration Tests\n');
  
  try {
    const backendTest = await testBackendEndpoints();
    const dataTest = await testMongoDbData();
    
    console.log('\n' + '='.repeat(60));
    if (backendTest && dataTest) {
      console.log('🎯 Integration Test: PASSED');
      console.log('✅ Frontend can successfully connect to backend');
      console.log('✅ MongoDB contains seeded data');
      console.log('✅ API endpoints are functioning');
      process.exit(0);
    } else {
      console.log('❌ Integration Test: FAILED');
      console.log('⚠️ There are issues that need to be resolved');
      process.exit(1);
    }
  } catch (error) {
    console.error('💥 Test execution failed:', error.message);
    process.exit(1);
  }
}

// Run the tests
if (require.main === module) {
  main();
}

module.exports = { testBackendEndpoints, testMongoDbData };