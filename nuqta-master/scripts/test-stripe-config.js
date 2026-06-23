/**
 * Stripe Configuration Test Script
 * Run this to verify your Stripe setup is correct
 */

const FRONTEND_KEY = 'pk_test_51PQsD1A3bD41AFFrCYnvxrNlg2dlljlcLaEyI9OajniOFvCSXjbhCkUcPqxDw4atsYQBsP042AmCZf37Uhq1wxZq00HE39FdK5';

console.log('\n=================================');
console.log('STRIPE CONFIGURATION CHECK');
console.log('=================================\n');

// 1. Check frontend key format
console.log('1. Frontend Stripe Key Check:');
console.log('   Key:', FRONTEND_KEY.substring(0, 32) + '...');

if (FRONTEND_KEY.startsWith('pk_test_')) {
  console.log('   ✅ Using TEST mode key (correct for development)');
} else if (FRONTEND_KEY.startsWith('pk_live_')) {
  console.log('   ⚠️  Using LIVE mode key (should be test for development)');
} else {
  console.log('   ❌ Invalid key format');
}

// 2. Extract account ID from key
const keyParts = FRONTEND_KEY.split('_');
if (keyParts.length >= 3) {
  const accountIndicator = keyParts[2].substring(0, 10);
  console.log('   Account ID indicator:', accountIndicator);
}

console.log('\n2. Backend Configuration:');
console.log('   ⚠️  IMPORTANT: The backend MUST use the matching SECRET key from the SAME Stripe account');
console.log('   The backend secret key should start with: sk_test_ (for test mode)');
console.log('   Both keys must be from the SAME Stripe account\n');

console.log('3. Common Issues:');
console.log('   ❌ 401 Error Causes:');
console.log('      - Backend using different Stripe account than frontend');
console.log('      - Backend using live key while frontend uses test key (or vice versa)');
console.log('      - Payment intent created with different key than confirmation');
console.log('      - Expired payment intent (older than 24 hours)');

console.log('\n4. How to Fix:');
console.log('   1. Log into your Stripe Dashboard: https://dashboard.stripe.com');
console.log('   2. Ensure you\'re in TEST mode (toggle in top-right)');
console.log('   3. Go to Developers → API Keys');
console.log('   4. Copy BOTH keys from the SAME account:');
console.log('      - Publishable key (pk_test_...) → Frontend .env');
console.log('      - Secret key (sk_test_...) → Backend .env');
console.log('   5. Restart both frontend and backend servers');

console.log('\n5. Verify Backend:');
console.log('   Check your backend .env file for:');
console.log('   STRIPE_SECRET_KEY=sk_test_... (should match the account of the publishable key)');

console.log('\n6. Test Payment Intent:');
console.log('   To test if keys match, try creating a payment intent via backend');
console.log('   and check Stripe Dashboard → Payments to see if it appears');

console.log('\n=================================\n');

// Test API connection
console.log('Testing backend connection...');
fetch('http://localhost:5001/api/wallet/paybill/test-stripe', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
  }
})
  .then(res => res.json())
  .then(data => {
    console.log('✅ Backend response:', data);
  })
  .catch(err => {
    console.log('❌ Backend not responding or endpoint doesn\'t exist');
    console.log('   This is normal if the test endpoint hasn\'t been created');
  });