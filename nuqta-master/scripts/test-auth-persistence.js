#!/usr/bin/env node

/**
 * Test Script for Authentication Persistence
 * Tests if auth state survives app refreshes
 */

// This would be run in browser console to test auth persistence
const testAuthPersistence = `
// Test Authentication Persistence in Browser Console
console.log('🧪 Testing Authentication Persistence');
console.log('=====================================');

// Check if AsyncStorage has auth data
const checkStoredAuth = async () => {
  try {
    // Get stored auth data (web uses localStorage, mobile uses AsyncStorage)
    const getStorageData = () => {
      if (typeof window !== 'undefined' && window.localStorage) {
        // Web environment
        return {
          accessToken: localStorage.getItem('access_token'),
          refreshToken: localStorage.getItem('refresh_token'),
          user: localStorage.getItem('auth_user')
        };
      } else if (global.AsyncStorage) {
        // Mobile environment
        return global.AsyncStorage.multiGet([
          'access_token',
          'refresh_token', 
          'auth_user'
        ]);
      }
      return null;
    };

    const storedData = getStorageData();
    console.log('📦 Stored Auth Data:', {
      hasAccessToken: !!storedData?.accessToken,
      hasRefreshToken: !!storedData?.refreshToken,
      hasUser: !!storedData?.user,
      userData: storedData?.user ? JSON.parse(storedData.user) : null
    });

    // Check current auth context state
    console.log('🔍 Current Auth State: Check your app context');
    
    return storedData;
  } catch (error) {
    console.error('❌ Error checking stored auth:', error);
    return null;
  }
};

// Run the test
checkStoredAuth();

console.log('');
console.log('📋 Manual Testing Steps:');
console.log('1. Login with valid OTP');
console.log('2. Complete onboarding');
console.log('3. Reach home screen');
console.log('4. Refresh page (Ctrl+R or F5)');
console.log('5. Should stay on home screen, NOT redirect to splash');
console.log('');
console.log('✅ Expected: User stays authenticated');
console.log('❌ Bug: User gets logged out and redirected to splash');
`;

console.log(testAuthPersistence);

console.log('\n🧪 Authentication Persistence Test');
console.log('=====================================');
console.log('\n📋 To test auth persistence:');
console.log('1. Copy the above code');
console.log('2. Open browser dev tools (F12)'); 
console.log('3. Go to Console tab');
console.log('4. Paste and run the code');
console.log('5. Follow the manual testing steps');
console.log('\n✅ Expected Result: User should stay logged in after refresh');
console.log('❌ Bug: User gets redirected to splash/onboarding screens');

// Also create a simple auth test for developers
console.log('\n🛠️  Quick Auth State Check:');
console.log('==========================================');
console.log('In browser console, run: localStorage.getItem("auth_user")');
console.log('Should return: User object JSON if logged in, null if not');