const axios = require('axios');

// Backend API URL
const API_URL = process.env.API_URL || 'http://localhost:5001/api';

// Test user data
const testUser = {
  phoneNumber: '+919876543210',
  otp: '123456' // Default OTP for testing
};

async function testAuthFlow() {
  console.log('🔍 Testing Authentication Flow\n');
  console.log('='.repeat(50));

  try {
    // Test 1: Send OTP
    console.log('\n1️⃣ Testing Send OTP...');
    const sendOtpResponse = await axios.post(`${API_URL}/user/auth/send-otp`, {
      phoneNumber: testUser.phoneNumber
    });

    if (sendOtpResponse.status === 200) {
      console.log('✅ Send OTP successful');
      console.log(`   Message: ${sendOtpResponse.data.message}`);
    }

    // Test 2: Verify OTP
    console.log('\n2️⃣ Testing Verify OTP...');
    const verifyOtpResponse = await axios.post(`${API_URL}/user/auth/verify-otp`, {
      phoneNumber: testUser.phoneNumber,
      otp: testUser.otp
    });

    // Check for different token locations
    const token = verifyOtpResponse.data.data?.tokens?.accessToken ||
                  verifyOtpResponse.data.token ||
                  verifyOtpResponse.data.accessToken;

    if (verifyOtpResponse.status === 200 && token) {
      console.log('✅ OTP Verification successful');
      console.log(`   Token received: ${token.substring(0, 20)}...`);

      // Test 3: Get Profile
      console.log('\n3️⃣ Testing Get Profile...');
      const profileResponse = await axios.get(`${API_URL}/user/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (profileResponse.status === 200) {
        console.log('✅ Get Profile successful');
        console.log(`   User: ${profileResponse.data.user?.name || profileResponse.data.name || 'Demo User'}`);
        console.log(`   Phone: ${profileResponse.data.user?.phoneNumber || profileResponse.data.phoneNumber || testUser.phoneNumber}`);
      }

      // Test 4: Logout
      console.log('\n4️⃣ Testing Logout...');
      const logoutResponse = await axios.post(`${API_URL}/user/auth/logout`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (logoutResponse.status === 200) {
        console.log('✅ Logout successful');
        console.log(`   Message: ${logoutResponse.data.message}`);
      }

      console.log('\n' + '='.repeat(50));
      console.log('🎉 ALL AUTHENTICATION TESTS PASSED!');
      console.log('✅ Your authentication flow is working correctly!');

    } else {
      throw new Error(`OTP verification failed - Status: ${verifyOtpResponse.status}, Token: ${token ? 'exists' : 'missing'}`);
    }

  } catch (error) {
    console.log('\n❌ Authentication Test Failed');

    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Error: ${error.response.data?.message || error.message}`);

      // Check if it's the specific "User not found" error
      if (error.response.data?.message?.includes('User not found')) {
        console.log('\n💡 This error indicates the frontend-backend connection is working,');
        console.log('   but the user needs to be registered first.');
        console.log('   Run: node scripts/seed-database.js');
      }
    } else if (error.code === 'ECONNREFUSED') {
      console.log('   ⚠️ Backend server is not running');
      console.log('\n💡 To start the backend:');
      console.log('   cd user-backend');
      console.log('   npm start');
    } else {
      console.log(`   Error: ${error.message}`);
    }
  }

  console.log('\n' + '='.repeat(50));
}

// Run the test
testAuthFlow().catch(console.error);