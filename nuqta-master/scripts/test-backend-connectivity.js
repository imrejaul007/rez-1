// Simple test script to verify backend connectivity
// Tests if backend endpoints are accessible

const fetch = require('node-fetch');

async function testBackendConnectivity() {
  console.log('🧪 Testing Backend Connectivity...\n');

  const baseURL = 'http://localhost:5001';
  
  const endpoints = [
    { path: '/health', description: 'Health Check' },
    { path: '/api-info', description: 'API Information' },
    { path: '/api/auth/profile', description: 'Auth Profile (should fail without token)', expectAuth: true },
    { path: '/api/products', description: 'Products List' },
    { path: '/api/stores', description: 'Stores List' },
    { path: '/api/categories', description: 'Categories List' }
  ];

  let passCount = 0;
  let totalTests = endpoints.length;

  for (const endpoint of endpoints) {
    try {
      console.log(`Testing ${endpoint.description}...`);
      
      const response = await fetch(`${baseURL}${endpoint.path}`, {
        timeout: 5000
      });

      if (endpoint.expectAuth && response.status === 401) {
        console.log(`✅ ${endpoint.description} - Expected 401 (auth required)`);
        passCount++;
      } else if (!endpoint.expectAuth && response.ok) {
        const data = await response.json();
        console.log(`✅ ${endpoint.description} - Response received`);
        if (endpoint.path === '/health') {
          console.log(`   Status: ${data.status}`);
          console.log(`   Database: ${data.database}`);
        } else if (endpoint.path === '/api-info') {
          console.log(`   Total Endpoints: ${data.totalEndpoints || 'Unknown'}`);
        }
        passCount++;
      } else {
        console.log(`❌ ${endpoint.description} - Status: ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ ${endpoint.description} - Error: ${error.message}`);
    }
    
    console.log(''); // Add spacing
  }

  console.log('📊 Test Results:');
  console.log(`   Passed: ${passCount}/${totalTests}`);
  console.log(`   Success Rate: ${((passCount/totalTests) * 100).toFixed(1)}%`);

  if (passCount === totalTests) {
    console.log('\n🎉 All backend connectivity tests passed!');
    console.log('✅ Backend is ready for frontend integration');
  } else {
    console.log('\n⚠️  Some tests failed. Check backend server status.');
  }
}

// Check if node-fetch is available, if not provide fallback
async function testWithFallback() {
  try {
    await testBackendConnectivity();
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      console.log('node-fetch not available, using basic connectivity test...\n');
      
      // Fallback test using curl
      const { spawn } = require('child_process');

      const curlTest = spawn('curl', ['-s', 'http://localhost:5001/health']);
      
      curlTest.stdout.on('data', (data) => {
        console.log('✅ Backend is responding');
        console.log(`Response: ${data}`);
      });
      
      curlTest.on('error', (err) => {
        console.log('❌ Backend connectivity test failed');
        console.log(`Error: ${err.message}`);
      });
    } else {
      throw error;
    }
  }
}

testWithFallback().catch(console.error);