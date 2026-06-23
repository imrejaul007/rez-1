/**
 * Webhook Security Test Suite
 * Tests all 5 security layers of the Razorpay webhook endpoint
 * Run with: npx ts-node scripts/test-webhook-security.ts
 */

import axios from 'axios';
import crypto from 'crypto';

const API_BASE_URL = process.env.API_URL || 'http://localhost:3000';
const WEBHOOK_URL = `${API_BASE_URL}/api/subscriptions/webhook`;
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || 'test_secret';

interface TestResult {
  testName: string;
  passed: boolean;
  expectedStatus: number;
  actualStatus?: number;
  expectedMessage: string;
  actualMessage?: string;
  error?: string;
}

const results: TestResult[] = [];

/**
 * Helper: Create webhook payload
 */
function createWebhookPayload(eventId: string, created_at: number) {
  return {
    id: eventId,
    entity: 'event',
    event: 'subscription.activated',
    created_at,
    payload: {
      subscription: {
        entity: {
          id: 'sub_test123',
          status: 'active',
          customer_id: 'cust_test123',
        },
      },
    },
  };
}

/**
 * Helper: Generate valid signature
 */
function generateSignature(payload: any): string {
  const payloadString = JSON.stringify(payload);
  return crypto
    .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
    .update(payloadString)
    .digest('hex');
}

/**
 * Helper: Send webhook request
 */
async function sendWebhook(
  payload: any,
  signature: string,
  ip: string = '52.66.135.170',
  headers: Record<string, string> = {}
): Promise<{ status: number; data: any }> {
  try {
    const response = await axios.post(WEBHOOK_URL, payload, {
      headers: {
        'x-razorpay-signature': signature,
        'x-forwarded-for': ip,
        'Content-Type': 'application/json',
        ...headers,
      },
      validateStatus: () => true, // Don't throw on any status code
    });

    return {
      status: response.status,
      data: response.data,
    };
  } catch (error: any) {
    throw new Error(`Webhook request failed: ${error.message}`);
  }
}

/**
 * Test 1: IP Whitelist - Valid Razorpay IP
 */
async function test1_IpWhitelist_Valid() {
  console.log('\n✓ TEST 1: IP Whitelist - Valid Razorpay IP');

  const payload = createWebhookPayload('evt_test_1', Math.floor(Date.now() / 1000));
  const signature = generateSignature(payload);

  try {
    const response = await sendWebhook(payload, signature, '52.66.135.170');

    const passed = response.status !== 403;
    results.push({
      testName: 'IP Whitelist - Valid IP',
      passed,
      expectedStatus: 200,
      actualStatus: response.status,
      expectedMessage: 'Should accept request from valid Razorpay IP',
      actualMessage: response.data?.message,
    });

    console.log(`  Status: ${response.status}`);
    console.log(`  Response: ${JSON.stringify(response.data)}`);
  } catch (error: any) {
    results.push({
      testName: 'IP Whitelist - Valid IP',
      passed: false,
      expectedStatus: 200,
      expectedMessage: 'Should accept request',
      error: error.message,
    });
    console.log(`  Error: ${error.message}`);
  }
}

/**
 * Test 2: IP Whitelist - Invalid IP
 */
async function test2_IpWhitelist_Invalid() {
  console.log('\n✗ TEST 2: IP Whitelist - Invalid IP (Should be blocked)');

  const payload = createWebhookPayload('evt_test_2', Math.floor(Date.now() / 1000));
  const signature = generateSignature(payload);

  try {
    const response = await sendWebhook(payload, signature, '192.168.1.1');

    const passed = response.status === 403;
    results.push({
      testName: 'IP Whitelist - Invalid IP',
      passed,
      expectedStatus: 403,
      actualStatus: response.status,
      expectedMessage: 'Should reject request with 403 Forbidden',
      actualMessage: response.data?.message,
    });

    console.log(`  Status: ${response.status} ${passed ? '✓' : '✗'}`);
    console.log(`  Response: ${JSON.stringify(response.data)}`);
  } catch (error: any) {
    results.push({
      testName: 'IP Whitelist - Invalid IP',
      passed: false,
      expectedStatus: 403,
      expectedMessage: 'Should reject with 403',
      error: error.message,
    });
    console.log(`  Error: ${error.message}`);
  }
}

/**
 * Test 3: Signature Verification - Valid Signature
 */
async function test3_Signature_Valid() {
  console.log('\n✓ TEST 3: Signature Verification - Valid Signature');

  const payload = createWebhookPayload('evt_test_3', Math.floor(Date.now() / 1000));
  const signature = generateSignature(payload);

  try {
    const response = await sendWebhook(payload, signature);

    const passed = response.status !== 401;
    results.push({
      testName: 'Signature Verification - Valid',
      passed,
      expectedStatus: 200,
      actualStatus: response.status,
      expectedMessage: 'Should accept request with valid signature',
      actualMessage: response.data?.message,
    });

    console.log(`  Status: ${response.status}`);
    console.log(`  Response: ${JSON.stringify(response.data)}`);
  } catch (error: any) {
    results.push({
      testName: 'Signature Verification - Valid',
      passed: false,
      expectedStatus: 200,
      expectedMessage: 'Should accept valid signature',
      error: error.message,
    });
    console.log(`  Error: ${error.message}`);
  }
}

/**
 * Test 4: Signature Verification - Invalid Signature
 */
async function test4_Signature_Invalid() {
  console.log('\n✗ TEST 4: Signature Verification - Invalid Signature');

  const payload = createWebhookPayload('evt_test_4', Math.floor(Date.now() / 1000));
  const invalidSignature = 'invalid_signature_12345';

  try {
    const response = await sendWebhook(payload, invalidSignature);

    const passed = response.status === 401;
    results.push({
      testName: 'Signature Verification - Invalid',
      passed,
      expectedStatus: 401,
      actualStatus: response.status,
      expectedMessage: 'Should reject request with invalid signature',
      actualMessage: response.data?.message,
    });

    console.log(`  Status: ${response.status} ${passed ? '✓' : '✗'}`);
    console.log(`  Response: ${JSON.stringify(response.data)}`);
  } catch (error: any) {
    results.push({
      testName: 'Signature Verification - Invalid',
      passed: false,
      expectedStatus: 401,
      expectedMessage: 'Should reject with 401',
      error: error.message,
    });
    console.log(`  Error: ${error.message}`);
  }
}

/**
 * Test 5: Timestamp Validation - Old Event (>5 minutes)
 */
async function test5_Timestamp_Old() {
  console.log('\n✗ TEST 5: Timestamp Validation - Old Event (>5 minutes)');

  // Create event 10 minutes in the past
  const tenMinutesAgo = Math.floor(Date.now() / 1000) - 600;
  const payload = createWebhookPayload('evt_test_5', tenMinutesAgo);
  const signature = generateSignature(payload);

  try {
    const response = await sendWebhook(payload, signature);

    const passed = response.status === 400;
    results.push({
      testName: 'Timestamp Validation - Old Event',
      passed,
      expectedStatus: 400,
      actualStatus: response.status,
      expectedMessage: 'Should reject webhook older than 5 minutes',
      actualMessage: response.data?.message,
    });

    console.log(`  Status: ${response.status} ${passed ? '✓' : '✗'}`);
    console.log(`  Response: ${JSON.stringify(response.data)}`);
  } catch (error: any) {
    results.push({
      testName: 'Timestamp Validation - Old Event',
      passed: false,
      expectedStatus: 400,
      expectedMessage: 'Should reject old event',
      error: error.message,
    });
    console.log(`  Error: ${error.message}`);
  }
}

/**
 * Test 6: Timestamp Validation - Fresh Event (<5 minutes)
 */
async function test6_Timestamp_Fresh() {
  console.log('\n✓ TEST 6: Timestamp Validation - Fresh Event (<5 minutes)');

  const now = Math.floor(Date.now() / 1000);
  const payload = createWebhookPayload('evt_test_6', now);
  const signature = generateSignature(payload);

  try {
    const response = await sendWebhook(payload, signature);

    const passed = response.status !== 400;
    results.push({
      testName: 'Timestamp Validation - Fresh Event',
      passed,
      expectedStatus: 200,
      actualStatus: response.status,
      expectedMessage: 'Should accept webhook within 5 minutes',
      actualMessage: response.data?.message,
    });

    console.log(`  Status: ${response.status}`);
    console.log(`  Response: ${JSON.stringify(response.data)}`);
  } catch (error: any) {
    results.push({
      testName: 'Timestamp Validation - Fresh Event',
      passed: false,
      expectedStatus: 200,
      expectedMessage: 'Should accept fresh event',
      error: error.message,
    });
    console.log(`  Error: ${error.message}`);
  }
}

/**
 * Test 7: Missing Required Fields
 */
async function test7_PayloadValidation_MissingFields() {
  console.log('\n✗ TEST 7: Payload Validation - Missing Required Fields');

  const incompletePayload = {
    // Missing: id, event, created_at
    payload: {
      subscription: {
        entity: {
          id: 'sub_test',
        },
      },
    },
  };

  const signature = generateSignature(incompletePayload);

  try {
    const response = await sendWebhook(incompletePayload, signature);

    const passed = response.status === 400;
    results.push({
      testName: 'Payload Validation - Missing Fields',
      passed,
      expectedStatus: 400,
      actualStatus: response.status,
      expectedMessage: 'Should reject payload with missing fields',
      actualMessage: response.data?.message,
    });

    console.log(`  Status: ${response.status} ${passed ? '✓' : '✗'}`);
    console.log(`  Response: ${JSON.stringify(response.data)}`);
  } catch (error: any) {
    results.push({
      testName: 'Payload Validation - Missing Fields',
      passed: false,
      expectedStatus: 400,
      expectedMessage: 'Should reject incomplete payload',
      error: error.message,
    });
    console.log(`  Error: ${error.message}`);
  }
}

/**
 * Test 8: Invalid Event Type
 */
async function test8_PayloadValidation_InvalidEventType() {
  console.log('\n✗ TEST 8: Payload Validation - Invalid Event Type');

  const payload = {
    id: 'evt_test_8',
    entity: 'event',
    event: 'invalid.event.type', // Invalid event type
    created_at: Math.floor(Date.now() / 1000),
    payload: {
      subscription: {
        entity: {
          id: 'sub_test',
        },
      },
    },
  };

  const signature = generateSignature(payload);

  try {
    const response = await sendWebhook(payload, signature);

    const passed = response.status === 400;
    results.push({
      testName: 'Payload Validation - Invalid Event Type',
      passed,
      expectedStatus: 400,
      actualStatus: response.status,
      expectedMessage: 'Should reject invalid event type',
      actualMessage: response.data?.message,
    });

    console.log(`  Status: ${response.status} ${passed ? '✓' : '✗'}`);
    console.log(`  Response: ${JSON.stringify(response.data)}`);
  } catch (error: any) {
    results.push({
      testName: 'Payload Validation - Invalid Event Type',
      passed: false,
      expectedStatus: 400,
      expectedMessage: 'Should reject invalid event',
      error: error.message,
    });
    console.log(`  Error: ${error.message}`);
  }
}

/**
 * Test 9: Duplicate Event Detection
 */
async function test9_DuplicateDetection() {
  console.log('\n✓ TEST 9: Duplicate Event Detection');

  const eventId = `evt_duplicate_${Date.now()}`;
  const now = Math.floor(Date.now() / 1000);
  const payload = createWebhookPayload(eventId, now);
  const signature = generateSignature(payload);

  try {
    // First request - should succeed
    const response1 = await sendWebhook(payload, signature);
    console.log(`  First request: ${response1.status}`);

    // Second request with same event ID - should return 200 (idempotent)
    const response2 = await sendWebhook(payload, signature);
    console.log(`  Second request: ${response2.status}`);

    const passed = response1.status === 200 && response2.status === 200;
    results.push({
      testName: 'Duplicate Event Detection',
      passed,
      expectedStatus: 200,
      actualStatus: response2.status,
      expectedMessage: 'Should handle duplicates idempotently',
      actualMessage: response2.data?.message,
    });

    console.log(`  Response: ${JSON.stringify(response2.data)}`);
  } catch (error: any) {
    results.push({
      testName: 'Duplicate Event Detection',
      passed: false,
      expectedStatus: 200,
      expectedMessage: 'Should handle duplicates',
      error: error.message,
    });
    console.log(`  Error: ${error.message}`);
  }
}

/**
 * Test 10: Rate Limiting
 */
async function test10_RateLimiting() {
  console.log('\n✓ TEST 10: Rate Limiting (100 requests/minute)');

  let blockedCount = 0;
  const requestCount = 150;

  try {
    for (let i = 0; i < requestCount; i++) {
      const payload = createWebhookPayload(`evt_ratelimit_${i}`, Math.floor(Date.now() / 1000));
      const signature = generateSignature(payload);

      const response = await sendWebhook(payload, signature);

      if (response.status === 429) {
        blockedCount++;
      }

      // Print progress every 50 requests
      if ((i + 1) % 50 === 0) {
        console.log(`  Sent ${i + 1}/${requestCount} requests, blocked: ${blockedCount}`);
      }
    }

    const passed = blockedCount > 0; // Should have some rate limited responses
    results.push({
      testName: 'Rate Limiting',
      passed,
      expectedStatus: 429,
      actualStatus: blockedCount > 0 ? 429 : 200,
      expectedMessage: 'Should limit to 100 requests/minute',
      actualMessage: `Blocked ${blockedCount} out of ${requestCount} requests`,
    });

    console.log(`  Total blocked: ${blockedCount}/${requestCount}`);
  } catch (error: any) {
    results.push({
      testName: 'Rate Limiting',
      passed: false,
      expectedStatus: 429,
      expectedMessage: 'Should implement rate limiting',
      error: error.message,
    });
    console.log(`  Error: ${error.message}`);
  }
}

/**
 * Generate Test Report
 */
function generateReport() {
  console.log('\n' + '='.repeat(80));
  console.log('WEBHOOK SECURITY TEST REPORT');
  console.log('='.repeat(80));

  let passCount = 0;
  let failCount = 0;

  console.log('\nDETAILED RESULTS:');
  console.log('-'.repeat(80));

  results.forEach((result, index) => {
    const status = result.passed ? '✓ PASS' : '✗ FAIL';
    console.log(`\n${index + 1}. ${status}: ${result.testName}`);
    console.log(`   Expected: ${result.expectedMessage}`);

    if (result.actualMessage) {
      console.log(`   Got: ${result.actualMessage}`);
    }

    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }

    if (result.actualStatus !== undefined) {
      console.log(`   Status Code: ${result.actualStatus} (expected ${result.expectedStatus})`);
    }

    if (result.passed) {
      passCount++;
    } else {
      failCount++;
    }
  });

  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total Tests: ${results.length}`);
  console.log(`Passed: ${passCount} (${Math.round((passCount / results.length) * 100)}%)`);
  console.log(`Failed: ${failCount} (${Math.round((failCount / results.length) * 100)}%)`);

  if (failCount === 0) {
    console.log('\n✓ ALL SECURITY TESTS PASSED!');
  } else {
    console.log(`\n✗ ${failCount} TEST(S) FAILED - REVIEW RESULTS ABOVE`);
  }

  console.log('='.repeat(80));

  // Print security layer summary
  console.log('\nSECURITY LAYERS STATUS:');
  console.log('─'.repeat(80));

  const layers = [
    {
      name: 'IP Whitelist',
      testIndices: [0, 1],
      passed: results[0].passed && results[1].passed,
    },
    {
      name: 'Signature Verification',
      testIndices: [2, 3],
      passed: results[2].passed && results[3].passed,
    },
    {
      name: 'Timestamp Validation',
      testIndices: [4, 5],
      passed: results[4].passed && results[5].passed,
    },
    {
      name: 'Payload Validation',
      testIndices: [6, 7],
      passed: results[6].passed && results[7].passed,
    },
    {
      name: 'Duplicate Detection',
      testIndices: [8],
      passed: results[8].passed,
    },
    {
      name: 'Rate Limiting',
      testIndices: [9],
      passed: results[9].passed,
    },
  ];

  layers.forEach(layer => {
    const status = layer.passed ? '✓' : '✗';
    console.log(`${status} ${layer.name}`);
  });

  console.log('─'.repeat(80));

  process.exit(failCount > 0 ? 1 : 0);
}

/**
 * Main Test Runner
 */
async function main() {
  console.log('═'.repeat(80));
  console.log('WEBHOOK SECURITY TEST SUITE');
  console.log('═'.repeat(80));
  console.log(`Testing: ${WEBHOOK_URL}`);
  console.log(`Time: ${new Date().toISOString()}`);

  try {
    await test1_IpWhitelist_Valid();
    await test2_IpWhitelist_Invalid();
    await test3_Signature_Valid();
    await test4_Signature_Invalid();
    await test5_Timestamp_Old();
    await test6_Timestamp_Fresh();
    await test7_PayloadValidation_MissingFields();
    await test8_PayloadValidation_InvalidEventType();
    await test9_DuplicateDetection();
    // Note: Skipping rate limit test by default as it sends 150 requests
    // Uncomment to run:
    // await test10_RateLimiting();

    generateReport();
  } catch (error) {
    console.error('Test suite failed:', error);
    process.exit(1);
  }
}

// Run tests
main().catch(console.error);
