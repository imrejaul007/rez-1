const axios = require('axios');

const BASE_URL = 'http://localhost:5001/api';

// Test phone number from previous sessions
const TEST_PHONE = '8210224305';

async function testPhase1() {
  console.log('\n🧪 PHASE 1 TEST - Wallet Balance Integration\n');
  console.log('=' .repeat(60));

  try {
    // Step 1: Login/Get Token
    console.log('\n📱 Step 1: Authenticating user...');
    let token;

    try {
      // Try to send OTP
      const otpResponse = await axios.post(`${BASE_URL}/auth/send-otp`, {
        phoneNumber: TEST_PHONE
      });

      console.log('✅ OTP sent (or would be sent in production)');

      // In development, use a test OTP or get from console
      // For this test, let's try to find an existing token or create one
      console.log('⚠️  For this test, we need a valid JWT token');
      console.log('💡 Please run the frontend login flow to get a token, or:');
      console.log('   1. Check frontend localStorage/AsyncStorage for existing token');
      console.log('   2. Login via frontend app and copy token from network tab');

      // Try with a mock verification (will likely fail but let's try)
      try {
        const verifyResponse = await axios.post(`${BASE_URL}/auth/verify-otp`, {
          phoneNumber: TEST_PHONE,
          otp: '123456' // Mock OTP
        });

        if (verifyResponse.data.data && verifyResponse.data.data.token) {
          token = verifyResponse.data.data.token;
          console.log('✅ Token obtained:', token.substring(0, 20) + '...');
        }
      } catch (verifyError) {
        console.log('⚠️  Mock OTP verification failed (expected)');
      }
    } catch (authError) {
      console.log('⚠️  Auth flow failed:', authError.response?.data?.message || authError.message);
    }

    // If we don't have a token, we can't proceed
    if (!token) {
      console.log('\n❌ Cannot proceed without JWT token');
      console.log('\n📋 MANUAL TEST REQUIRED:');
      console.log('   1. Open the REZ app frontend');
      console.log('   2. Login with phone number');
      console.log('   3. Navigate to checkout page');
      console.log('   4. Check if balance shows real data (not 382)');
      console.log('   5. Refer to PHASE_1_TEST_GUIDE.md for detailed steps\n');
      return;
    }

    // Step 2: Test Wallet Balance Endpoint
    console.log('\n💰 Step 2: Fetching wallet balance...');
    const walletResponse = await axios.get(`${BASE_URL}/wallet/balance`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const walletData = walletResponse.data.data;
    console.log('✅ Wallet data received:');
    console.log('   Total Balance:', walletData.balance.total);
    console.log('   Currency:', walletData.currency);

    if (walletData.coins && walletData.coins.length > 0) {
      console.log('   Coins:');
      walletData.coins.forEach(coin => {
        console.log(`     - ${coin.type}: ${coin.amount} (active: ${coin.isActive})`);
      });

      // Verify expected values from migration
      const wasilCoin = walletData.coins.find(c => c.type === 'wasil');
      const promoCoin = walletData.coins.find(c => c.type === 'promotion');

      console.log('\n📊 Phase 1 Validation:');
      console.log('=' .repeat(60));

      if (wasilCoin) {
        console.log(`✅ Wasil Coin: ${wasilCoin.amount} RC (Expected: 3500)`);
        if (wasilCoin.amount === 3500) {
          console.log('   ✓ Amount matches expected value');
        } else {
          console.log('   ⚠️  Amount differs from expected (3500)');
        }
      } else {
        console.log('❌ Wasil coin not found in response');
      }

      if (promoCoin) {
        console.log(`✅ Promo Coin: ${promoCoin.amount} RC (Expected: 0)`);
        if (promoCoin.amount === 0) {
          console.log('   ✓ Amount matches expected value');
        }
      } else {
        console.log('❌ Promo coin not found in response');
      }

      // Step 3: Frontend Integration Check
      console.log('\n🎨 Step 3: Frontend Integration Checklist:');
      console.log('=' .repeat(60));
      console.log('To complete Phase 1 testing, verify in frontend:');
      console.log('');
      console.log('□ Checkout header shows:', (wasilCoin?.amount || 0) + (promoCoin?.amount || 0), 'RC (not 382)');
      console.log('□ Payment button shows: Bal RC', (wasilCoin?.amount || 0) + (promoCoin?.amount || 0), '(not ₹1,660)');
      console.log('□ REZ Coin toggle shows:', wasilCoin?.amount || 0, 'available');
      console.log('□ Promo Coin toggle shows:', promoCoin?.amount || 0, 'available');
      console.log('□ Bill summary updates when toggling coins');
      console.log('□ No console errors in frontend');
      console.log('');
      console.log('📄 See PHASE_1_TEST_GUIDE.md for detailed test cases\n');

    } else {
      console.log('❌ No coins array in wallet response');
      console.log('   This may indicate migration did not run successfully');
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error.response?.data || error.message);

    if (error.response?.status === 401) {
      console.log('\n💡 Authentication required. Please:');
      console.log('   1. Login via frontend app');
      console.log('   2. Extract JWT token from network tab or storage');
      console.log('   3. Manually test endpoints with Postman/curl');
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ PHASE 1 BACKEND TEST COMPLETE');
  console.log('📋 Next: Run manual frontend tests from PHASE_1_TEST_GUIDE.md');
  console.log('='.repeat(60) + '\n');
}

// Run the test
testPhase1();