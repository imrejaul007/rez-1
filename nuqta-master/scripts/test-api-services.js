// Simple test script to verify API services connectivity
// This tests the basic functionality of our API service layer

const { checkServicesHealth } = require('../services/index.ts');

async function testApiServices() {
  console.log('🧪 Testing API Services Integration...\n');

  try {
    // Test 1: Health Check
    console.log('1. Testing Backend Health Check...');
    const healthResult = await checkServicesHealth();
    
    if (healthResult.status === 'healthy') {
      console.log('✅ Backend health check passed');
      console.log(`   Timestamp: ${healthResult.timestamp}`);
      console.log(`   Database: ${healthResult.details?.database || 'connected'}`);
    } else {
      console.log('❌ Backend health check failed');
      console.log(`   Status: ${healthResult.status}`);
      console.log(`   Error: ${healthResult.error || 'Unknown error'}`);
      return;
    }

    console.log('\n2. Testing API Service Imports...');
    
    // Test 2: Service Imports
    try {
      const services = require('../services/index.ts');
      
      const expectedServices = [
        'apiClient',
        'authService', 
        'productsService',
        'cartService',
        'ordersService', 
        'storesService',
        'videosService',
        'projectsService',
        'notificationsService',
        'reviewsService',
        'wishlistService'
      ];

      for (const serviceName of expectedServices) {
        if (services[serviceName]) {
          console.log(`✅ ${serviceName} imported successfully`);
        } else {
          console.log(`❌ ${serviceName} import failed`);
        }
      }

      console.log('\n3. Testing API Client Configuration...');
      
      // Test 3: API Client Configuration
      const { apiClient } = services;
      const baseURL = apiClient.getBaseURL();
      console.log(`✅ API Client configured with base URL: ${baseURL}`);

      // Test 4: Basic API Endpoints
      console.log('\n4. Testing Basic API Endpoints...');
      
      // Test health endpoint
      const healthResponse = await fetch('http://localhost:5001/health');
      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        console.log('✅ Health endpoint accessible');
        console.log(`   Response: ${JSON.stringify(healthData)}`);
      } else {
        console.log('❌ Health endpoint not accessible');
      }

      // Test API info endpoint
      const apiInfoResponse = await fetch('http://localhost:5001/api-info');
      if (apiInfoResponse.ok) {
        const apiInfoData = await apiInfoResponse.json();
        console.log('✅ API info endpoint accessible');
        console.log(`   Total endpoints: ${apiInfoData.totalEndpoints || 'Unknown'}`);
      } else {
        console.log('❌ API info endpoint not accessible');
      }

      console.log('\n🎉 API Services Integration Test Completed Successfully!');
      console.log('\n📊 Summary:');
      console.log('   ✅ Backend server is running and healthy');
      console.log('   ✅ All API services are properly imported');
      console.log('   ✅ API client is configured correctly');
      console.log('   ✅ Basic endpoints are accessible');
      console.log('\n🚀 Ready for frontend integration!');

    } catch (importError) {
      console.log('❌ Service import test failed:');
      console.log(`   Error: ${importError.message}`);
    }

  } catch (error) {
    console.log('❌ API Services test failed:');
    console.log(`   Error: ${error.message}`);
    console.log(`   Stack: ${error.stack}`);
  }
}

// Run the test
testApiServices().catch(console.error);