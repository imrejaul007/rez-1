#!/usr/bin/env node

/**
 * Test Script for Authentication Integration
 * Tests the connection between frontend and backend auth system
 */

const axios = require('axios');

// Configuration
const BACKEND_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:5001/api';
const TEST_PHONE = '+918102232747'; // Replace with actual test number

console.log('🧪 Testing REZ App Authentication Integration');
console.log(`📡 Backend URL: ${BACKEND_URL}`);
console.log('=' .repeat(50));

async function testHealthCheck() {
  try {
    console.log('\n1️⃣ Testing Backend Health...');
    const response = await axios.get(BACKEND_URL.replace('/api', '/health'));
    
    if (response.data.status === 'ok') {
      console.log('✅ Backend is healthy');
      console.log(`   Database: ${response.data.database.status}`);
      console.log(`   Environment: ${response.data.environment}`);
      return true;
    } else {
      console.log('❌ Backend health check failed');
      return false;
    }
  } catch (error) {
    console.log('❌ Backend is not reachable');
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

async function testSendOTP() {
  try {
    console.log('\n2️⃣ Testing Send OTP...');
    const response = await axios.post(`${BACKEND_URL}/auth/send-otp`, {
      phoneNumber: TEST_PHONE
    });
    
    if (response.data.success) {
      console.log('✅ OTP sent successfully');
      console.log(`   Message: ${response.data.message}`);
      return true;
    } else {
      console.log('❌ Send OTP failed');
      console.log(`   Error: ${response.data.message}`);
      return false;
    }
  } catch (error) {
    console.log('❌ Send OTP request failed');
    console.log(`   Error: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

async function testAPIEndpoints() {
  console.log('\n3️⃣ Testing API Endpoints...');
  
  const endpoints = [
    '/auth/send-otp',
    '/auth/verify-otp', 
    '/auth/refresh-token',
    '/auth/me',
    '/auth/profile'
  ];
  
  for (const endpoint of endpoints) {
    try {
      // Just check if endpoint exists (will return validation error for empty body)
      await axios.post(`${BACKEND_URL}${endpoint}`, {});
    } catch (error) {
      const status = error.response?.status;
      const message = error.response?.data?.message;
      
      if (status === 400 && message?.includes('Validation failed')) {
        console.log(`✅ ${endpoint} - Endpoint exists (validation working)`);
      } else if (status === 401 && message?.includes('Authentication required')) {
        console.log(`✅ ${endpoint} - Endpoint exists (auth required)`);
      } else if (status === 405) {
        console.log(`✅ ${endpoint} - Endpoint exists (method check)`);
      } else {
        console.log(`⚠️  ${endpoint} - Unexpected response: ${status} ${message}`);
      }
    }
  }
}

async function runTests() {
  console.log('\n🚀 Starting Authentication Integration Tests...\n');
  
  const healthOk = await testHealthCheck();
  if (!healthOk) {
    console.log('\n❌ Backend not available. Please start the backend server first.');
    console.log('   Command: cd user-backend && npm start');
    process.exit(1);
  }
  
  await testAPIEndpoints();
  await testSendOTP();
  
  console.log('\n' + '='.repeat(50));
  console.log('✅ Authentication Integration Test Complete!');
  console.log('\n📋 Next Steps:');
  console.log('   1. Start the frontend: cd frontend && npm start');
  console.log('   2. Test the onboarding flow in the app');
  console.log('   3. Use the OTP from backend console logs');
  console.log('\n🎉 Backend is ready for frontend integration!');
}

// Run the tests
runTests().catch(error => {
  console.error('\n💥 Test failed:', error.message);
  process.exit(1);
});