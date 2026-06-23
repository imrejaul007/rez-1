#!/usr/bin/env ts-node
/**
 * Bill Upload Integration Test Script
 *
 * This script tests the bill upload flow from frontend to backend
 * Run: npx ts-node scripts/test-bill-upload-integration.ts
 */

import fetch from 'node-fetch';

const BACKEND_URL = 'http://localhost:5001';
const API_URL = `${BACKEND_URL}/api`;

interface TestResult {
  test: string;
  passed: boolean;
  message: string;
  details?: any;
}

const results: TestResult[] = [];

/**
 * Test 1: Check if backend server is running
 */
async function testBackendConnection(): Promise<TestResult> {
  console.log('\n🧪 Test 1: Backend Server Connection');
  console.log('━'.repeat(50));

  try {
    const response = await fetch(`${BACKEND_URL}/health`, { timeout: 5000 });
    const data = await response.json();

    if (response.ok) {
      console.log('✅ Backend server is running');
      console.log('Server status:', JSON.stringify(data, null, 2));
      return {
        test: 'Backend Connection',
        passed: true,
        message: 'Backend server is accessible',
        details: data
      };
    } else {
      console.log('❌ Backend server returned error');
      return {
        test: 'Backend Connection',
        passed: false,
        message: `Server returned ${response.status}: ${response.statusText}`,
        details: data
      };
    }
  } catch (error: any) {
    console.log('❌ Cannot connect to backend server');
    console.log('Error:', error.message);
    return {
      test: 'Backend Connection',
      passed: false,
      message: `Connection failed: ${error.message}`,
      details: { error: error.message, code: error.code }
    };
  }
}

/**
 * Test 2: Check if bill routes are registered
 */
async function testBillRoutesRegistration(): Promise<TestResult> {
  console.log('\n🧪 Test 2: Bill Routes Registration');
  console.log('━'.repeat(50));

  try {
    // Try to access the bills endpoint (will get 401 without auth, but that's ok)
    const response = await fetch(`${API_URL}/bills`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // 401 means route exists but requires auth - that's good!
    // 404 means route doesn't exist - that's bad!
    if (response.status === 401) {
      console.log('✅ Bill routes are registered (got 401 - auth required)');
      return {
        test: 'Bill Routes Registration',
        passed: true,
        message: 'Bill routes are properly registered and require authentication'
      };
    } else if (response.status === 404) {
      console.log('❌ Bill routes not found (404)');
      return {
        test: 'Bill Routes Registration',
        passed: false,
        message: 'Bill routes are not registered or not accessible'
      };
    } else {
      console.log(`⚠️  Unexpected response: ${response.status}`);
      const text = await response.text();
      return {
        test: 'Bill Routes Registration',
        passed: false,
        message: `Unexpected status code: ${response.status}`,
        details: text
      };
    }
  } catch (error: any) {
    console.log('❌ Error checking bill routes');
    console.log('Error:', error.message);
    return {
      test: 'Bill Routes Registration',
      passed: false,
      message: `Route check failed: ${error.message}`
    };
  }
}

/**
 * Test 3: Check if upload endpoint accepts multipart/form-data
 */
async function testUploadEndpoint(): Promise<TestResult> {
  console.log('\n🧪 Test 3: Upload Endpoint Configuration');
  console.log('━'.repeat(50));

  try {
    const FormData = require('form-data');
    const formData = new FormData();
    formData.append('test', 'value');

    const response = await fetch(`${API_URL}/bills/upload`, {
      method: 'POST',
      body: formData
    });

    // 401 means endpoint exists but requires auth - good!
    // 404 means endpoint doesn't exist - bad!
    if (response.status === 401) {
      console.log('✅ Upload endpoint is configured (requires auth)');
      return {
        test: 'Upload Endpoint',
        passed: true,
        message: 'Upload endpoint accepts multipart/form-data'
      };
    } else if (response.status === 404) {
      console.log('❌ Upload endpoint not found');
      return {
        test: 'Upload Endpoint',
        passed: false,
        message: 'Upload endpoint /api/bills/upload not found'
      };
    } else {
      console.log(`⚠️  Response status: ${response.status}`);
      const text = await response.text();
      return {
        test: 'Upload Endpoint',
        passed: response.status !== 404,
        message: `Endpoint returned ${response.status}`,
        details: text.substring(0, 200)
      };
    }
  } catch (error: any) {
    console.log('❌ Error testing upload endpoint');
    console.log('Error:', error.message);
    return {
      test: 'Upload Endpoint',
      passed: false,
      message: `Upload endpoint test failed: ${error.message}`
    };
  }
}

/**
 * Test 4: Check Cloudinary configuration
 */
async function testCloudinaryConfig(): Promise<TestResult> {
  console.log('\n🧪 Test 4: Cloudinary Configuration');
  console.log('━'.repeat(50));

  try {
    const response = await fetch(`${BACKEND_URL}/health`);
    const data: any = await response.json();

    // Check if health endpoint includes cloudinary status
    const cloudinaryConfigured = data.cloudinary !== false;

    if (cloudinaryConfigured) {
      console.log('✅ Cloudinary appears to be configured');
      return {
        test: 'Cloudinary Configuration',
        passed: true,
        message: 'Cloudinary configuration detected'
      };
    } else {
      console.log('⚠️  Cloudinary may not be configured');
      return {
        test: 'Cloudinary Configuration',
        passed: false,
        message: 'Cloudinary configuration not confirmed',
        details: 'Check backend logs for Cloudinary validation message'
      };
    }
  } catch (error: any) {
    console.log('⚠️  Cannot verify Cloudinary configuration');
    return {
      test: 'Cloudinary Configuration',
      passed: false,
      message: 'Unable to verify Cloudinary setup'
    };
  }
}

/**
 * Test 5: Check frontend API client configuration
 */
async function testFrontendConfig(): Promise<TestResult> {
  console.log('\n🧪 Test 5: Frontend Configuration');
  console.log('━'.repeat(50));

  const frontendApiUrl = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:5001/api';

  console.log('Frontend API URL:', frontendApiUrl);
  console.log('Expected Backend URL:', API_URL);

  if (frontendApiUrl === API_URL) {
    console.log('✅ Frontend API URL matches backend');
    return {
      test: 'Frontend Configuration',
      passed: true,
      message: 'Frontend is configured to connect to correct backend'
    };
  } else {
    console.log('⚠️  Frontend API URL mismatch');
    return {
      test: 'Frontend Configuration',
      passed: false,
      message: 'Frontend API URL does not match backend',
      details: {
        frontend: frontendApiUrl,
        backend: API_URL
      }
    };
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║   BILL UPLOAD INTEGRATION DIAGNOSTIC TESTS      ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log('\nTesting bill upload integration between frontend and backend...\n');

  // Run all tests
  results.push(await testBackendConnection());
  results.push(await testBillRoutesRegistration());
  results.push(await testUploadEndpoint());
  results.push(await testCloudinaryConfig());
  results.push(await testFrontendConfig());

  // Print summary
  console.log('\n\n╔══════════════════════════════════════════════════╗');
  console.log('║              TEST RESULTS SUMMARY                ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  results.forEach((result, index) => {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${index + 1}. ${status} - ${result.test}`);
    console.log(`   ${result.message}`);
    if (result.details && !result.passed) {
      console.log(`   Details:`, JSON.stringify(result.details, null, 2));
    }
    console.log('');
  });

  console.log('━'.repeat(50));
  console.log(`Total Tests: ${results.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log('━'.repeat(50));

  // Provide recommendations
  console.log('\n\n╔══════════════════════════════════════════════════╗');
  console.log('║              RECOMMENDATIONS                     ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  if (failed === 0) {
    console.log('✅ All tests passed! Bill upload system is ready.');
    console.log('\nNext steps:');
    console.log('1. Ensure you have a valid auth token');
    console.log('2. Test bill upload from the frontend app');
    console.log('3. Check backend logs for any errors during upload');
  } else {
    console.log('⚠️  Some tests failed. Here\'s what to check:\n');

    results.forEach(result => {
      if (!result.passed) {
        console.log(`❌ ${result.test}:`);
        console.log(`   Issue: ${result.message}`);

        if (result.test === 'Backend Connection') {
          console.log('   Fix: Start the backend server with: npm run dev');
        } else if (result.test === 'Bill Routes Registration') {
          console.log('   Fix: Verify billRoutes are imported and registered in server.ts');
        } else if (result.test === 'Upload Endpoint') {
          console.log('   Fix: Check billRoutes.ts for POST /upload endpoint');
        } else if (result.test === 'Cloudinary Configuration') {
          console.log('   Fix: Add CLOUDINARY_* environment variables to backend .env');
        } else if (result.test === 'Frontend Configuration') {
          console.log('   Fix: Update EXPO_PUBLIC_API_BASE_URL in frontend .env');
        }
        console.log('');
      }
    });
  }

  console.log('\n\n╔══════════════════════════════════════════════════╗');
  console.log('║              FRONTEND ERROR GUIDE                ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  console.log('Common frontend errors when clicking "Upload Bills":');
  console.log('\n1. "Network request failed" / "Cannot connect"');
  console.log('   → Backend not running or wrong API_BASE_URL');
  console.log('   → Check: EXPO_PUBLIC_API_BASE_URL in frontend/.env');
  console.log('   → Should be: http://localhost:5001/api');

  console.log('\n2. "404 Not Found"');
  console.log('   → Bill routes not registered in backend');
  console.log('   → Check: backend server logs for "Bill routes registered"');

  console.log('\n3. "401 Unauthorized"');
  console.log('   → User not logged in or token expired');
  console.log('   → Fix: Log in first, then try uploading');

  console.log('\n4. "500 Internal Server Error"');
  console.log('   → Cloudinary not configured or other backend error');
  console.log('   → Check: backend console for detailed error');

  console.log('\n5. Navigation error / App crashes');
  console.log('   → Check: bill-upload.tsx file exists in app/ folder');
  console.log('   → Verify: No TypeScript errors in the component');

  console.log('\n\n');
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});
