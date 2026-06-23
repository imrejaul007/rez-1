/**
 * Backend Connectivity Check Script
 * This script verifies if the backend server is running and accessible
 */

const fetch = require('node-fetch');

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:5001/api';
const BACKEND_URL = API_BASE_URL.replace('/api', '');

async function checkBackendHealth() {
  console.log('\n========================================');
  console.log('🔍 Checking Backend Server Status');
  console.log('========================================\n');
  console.log(`Backend URL: ${BACKEND_URL}`);
  console.log(`API URL: ${API_BASE_URL}`);
  console.log('\n----------------------------------------\n');

  // Check main server health
  try {
    console.log('📡 Checking server health endpoint...');
    const healthResponse = await fetch(`${BACKEND_URL}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 5000
    });

    if (healthResponse.ok) {
      const data = await healthResponse.json();
      console.log('✅ Server is healthy!');
      console.log('   Response:', JSON.stringify(data, null, 2));
    } else {
      console.log(`⚠️  Server responded with status: ${healthResponse.status}`);
    }
  } catch (error) {
    console.error('❌ Server health check failed:', error.message);
    console.log('\n⚠️  Backend server appears to be down or unreachable.');
    console.log('\nTo start the backend server:');
    console.log('1. Navigate to the backend directory:');
    console.log('   cd "C:\\Users\\Mukul raj\\Downloads\\rez-new\\rez-app\\user-backend"');
    console.log('2. Install dependencies (if not already done):');
    console.log('   npm install');
    console.log('3. Start the server:');
    console.log('   npm run dev');
    process.exit(1);
  }

  // Check API endpoints
  const endpoints = [
    { path: '/categories', name: 'Categories' },
    { path: '/products', name: 'Products' },
    { path: '/stores', name: 'Stores' }
  ];

  console.log('\n📋 Checking API endpoints...\n');

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint.path}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });

      if (response.ok) {
        console.log(`✅ ${endpoint.name} endpoint is accessible`);
      } else {
        console.log(`⚠️  ${endpoint.name} endpoint returned status: ${response.status}`);
      }
    } catch (error) {
      console.error(`❌ ${endpoint.name} endpoint failed:`, error.message);
    }
  }

  console.log('\n========================================');
  console.log('✅ Backend connectivity check complete!');
  console.log('========================================\n');
}

// Run the check
checkBackendHealth().catch(error => {
  console.error('\n❌ Fatal error during backend check:', error);
  process.exit(1);
});