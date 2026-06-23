/**
 * Webhook Security Test Suite
 * Tests all security features of the Razorpay webhook endpoint
 */

import axios, { AxiosError } from 'axios';
import crypto from 'crypto';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || 'test_webhook_secret';
const RAZORPAY_IP = '52.66.135.160'; // Valid Razorpay IP from whitelist

interface TestResult {
  name: string;
  passed: boolean;
  expectedStatus: number;
  actualStatus?: number;
  error?: string;
  details?: any;
}

const results: TestResult[] = [];

/**
 * Create a signed webhook payload
 */
function createSignedWebhookPayload(payload: any): { signature: string; body: string } {
  const body = JSON.stringify(payload);
  const signature = crypto
    .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
    .update(body)
    .digest('hex');

  return { signature, body };
}

/**
 * Create a valid webhook payload
 */
function createValidPayload() {
  return {
    id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    event: 'subscription.activated',
    created_at: Math.floor(Date.now() / 1000),
    payload: {
      subscription: {
        id: 'sub_test_123',
        status: 'active',
        customer_id: 'cust_test_123',
        plan_id: 'plan_test_123',
      },
    },
  };
}

/**
 * Test 1: Valid webhook with correct signature
 */
async function testValidWebhook(): Promise<void> {
  const payload = createValidPayload();
  const { signature } = createSignedWebhookPayload(payload);

  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/subscriptions/webhook`,
      payload,
      {
        headers: {
          'x-razorpay-signature': signature,
          'x-forwarded-for': RAZORPAY_IP,
        },
        validateStatus: () => true,
      }
    );

    results.push({
      name: 'Test 1: Valid webhook with correct signature',
      passed: response.status === 200,
      expectedStatus: 200,
      actualStatus: response.status,
      details: response.data,
    });
  } catch (error: any) {
    results.push({
      name: 'Test 1: Valid webhook with correct signature',
      passed: false,
      expectedStatus: 200,
      error: error.message,
    });
  }
}

/**
 * Test 2: Webhook with invalid signature
 */
async function testInvalidSignature(): Promise<void> {
  const payload = createValidPayload();
  const invalidSignature = 'invalid_signature_12345';

  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/subscriptions/webhook`,
      payload,
      {
        headers: {
          'x-razorpay-signature': invalidSignature,
          'x-forwarded-for': RAZORPAY_IP,
        },
        validateStatus: () => true,
      }
    );

    results.push({
      name: 'Test 2: Webhook with invalid signature',
      passed: response.status === 401,
      expectedStatus: 401,
      actualStatus: response.status,
      details: response.data,
    });
  } catch (error: any) {
    results.push({
      name: 'Test 2: Webhook with invalid signature',
      passed: false,
      expectedStatus: 401,
      error: error.message,
    });
  }
}

/**
 * Test 3: Webhook from unauthorized IP
 */
async function testUnauthorizedIP(): Promise<void> {
  const payload = createValidPayload();
  const { signature } = createSignedWebhookPayload(payload);

  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/subscriptions/webhook`,
      payload,
      {
        headers: {
          'x-razorpay-signature': signature,
          'x-forwarded-for': '192.168.1.1', // Invalid IP (not in Razorpay whitelist)
        },
        validateStatus: () => true,
      }
    );

    results.push({
      name: 'Test 3: Webhook from unauthorized IP',
      passed: response.status === 403,
      expectedStatus: 403,
      actualStatus: response.status,
      details: response.data,
    });
  } catch (error: any) {
    results.push({
      name: 'Test 3: Webhook from unauthorized IP',
      passed: false,
      expectedStatus: 403,
      error: error.message,
    });
  }
}

/**
 * Test 4: Duplicate webhook event (replay attack)
 */
async function testDuplicateEvent(): Promise<void> {
  const payload = createValidPayload();
  const { signature } = createSignedWebhookPayload(payload);

  try {
    // Send first request
    const response1 = await axios.post(
      `${API_BASE_URL}/api/subscriptions/webhook`,
      payload,
      {
        headers: {
          'x-razorpay-signature': signature,
          'x-forwarded-for': RAZORPAY_IP,
        },
        validateStatus: () => true,
      }
    );

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 100));

    // Send exact same payload again
    const response2 = await axios.post(
      `${API_BASE_URL}/api/subscriptions/webhook`,
      payload,
      {
        headers: {
          'x-razorpay-signature': signature,
          'x-forwarded-for': RAZORPAY_IP,
        },
        validateStatus: () => true,
      }
    );

    // Both should succeed (200), but second is marked as already processed
    results.push({
      name: 'Test 4: Duplicate webhook event (replay attack)',
      passed:
        response1.status === 200 &&
        response2.status === 200 &&
        response2.data.message?.includes('already processed'),
      expectedStatus: 200,
      actualStatus: response2.status,
      details: {
        firstResponse: response1.status,
        secondResponse: response2.status,
        secondMessage: response2.data.message,
      },
    });
  } catch (error: any) {
    results.push({
      name: 'Test 4: Duplicate webhook event (replay attack)',
      passed: false,
      expectedStatus: 200,
      error: error.message,
    });
  }
}

/**
 * Test 5: Webhook too old (>5 minutes)
 */
async function testExpiredWebhook(): Promise<void> {
  const payload = createValidPayload();
  // Set created_at to 10 minutes ago
  payload.created_at = Math.floor(Date.now() / 1000) - 600;

  const { signature } = createSignedWebhookPayload(payload);

  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/subscriptions/webhook`,
      payload,
      {
        headers: {
          'x-razorpay-signature': signature,
          'x-forwarded-for': RAZORPAY_IP,
        },
        validateStatus: () => true,
      }
    );

    results.push({
      name: 'Test 5: Webhook too old (>5 minutes)',
      passed: response.status === 400,
      expectedStatus: 400,
      actualStatus: response.status,
      details: response.data,
    });
  } catch (error: any) {
    results.push({
      name: 'Test 5: Webhook too old (>5 minutes)',
      passed: false,
      expectedStatus: 400,
      error: error.message,
    });
  }
}

/**
 * Test 6: Missing required fields
 */
async function testMissingFields(): Promise<void> {
  const payload: any = createValidPayload();
  delete (payload as any).id; // Remove required field

  const { signature } = createSignedWebhookPayload(payload);

  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/subscriptions/webhook`,
      payload,
      {
        headers: {
          'x-razorpay-signature': signature,
          'x-forwarded-for': RAZORPAY_IP,
        },
        validateStatus: () => true,
      }
    );

    results.push({
      name: 'Test 6: Missing required fields',
      passed: response.status === 400,
      expectedStatus: 400,
      actualStatus: response.status,
      details: response.data,
    });
  } catch (error: any) {
    results.push({
      name: 'Test 6: Missing required fields',
      passed: false,
      expectedStatus: 400,
      error: error.message,
    });
  }
}

/**
 * Test 7: Invalid event type
 */
async function testInvalidEventType(): Promise<void> {
  const payload = createValidPayload();
  payload.event = 'invalid.event.type';

  const { signature } = createSignedWebhookPayload(payload);

  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/subscriptions/webhook`,
      payload,
      {
        headers: {
          'x-razorpay-signature': signature,
          'x-forwarded-for': RAZORPAY_IP,
        },
        validateStatus: () => true,
      }
    );

    results.push({
      name: 'Test 7: Invalid event type',
      passed: response.status === 400,
      expectedStatus: 400,
      actualStatus: response.status,
      details: response.data,
    });
  } catch (error: any) {
    results.push({
      name: 'Test 7: Invalid event type',
      passed: false,
      expectedStatus: 400,
      error: error.message,
    });
  }
}

/**
 * Test 8: Rate limiting (send 101 requests in short time)
 */
async function testRateLimiting(): Promise<void> {
  const payload = createValidPayload();
  const { signature } = createSignedWebhookPayload(payload);

  const requests = Array(101)
    .fill(null)
    .map(() =>
      axios.post(`${API_BASE_URL}/api/subscriptions/webhook`, payload, {
        headers: {
          'x-razorpay-signature': signature,
          'x-forwarded-for': RAZORPAY_IP,
        },
        validateStatus: () => true,
      })
    );

  try {
    const responses = await Promise.all(requests);
    const rateLimited = responses.some(r => r.status === 429);
    const successes = responses.filter(r => r.status === 200 || r.status === 200).length;

    results.push({
      name: 'Test 8: Rate limiting',
      passed: rateLimited && successes > 0,
      expectedStatus: 200,
      details: {
        totalRequests: 101,
        rateLimitedResponses: responses.filter(r => r.status === 429).length,
        successfulResponses: successes,
        message: 'Rate limit should trigger after 100 requests',
      },
    });
  } catch (error: any) {
    results.push({
      name: 'Test 8: Rate limiting',
      passed: false,
      expectedStatus: 200,
      error: error.message,
    });
  }
}

/**
 * Print test results
 */
function printResults(): void {
  console.log('\n' + '='.repeat(80));
  console.log('WEBHOOK SECURITY TEST RESULTS');
  console.log('='.repeat(80) + '\n');

  const passed = results.filter(r => r.passed).length;
  const total = results.length;

  results.forEach(result => {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} | ${result.name}`);

    if (!result.passed) {
      console.log(`   Expected Status: ${result.expectedStatus}`);
      if (result.actualStatus) {
        console.log(`   Actual Status: ${result.actualStatus}`);
      }
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    }

    if (result.details) {
      console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`);
    }
    console.log();
  });

  console.log('='.repeat(80));
  console.log(
    `SUMMARY: ${passed}/${total} tests passed (${Math.round((passed / total) * 100)}%)`
  );
  console.log('='.repeat(80) + '\n');

  if (passed !== total) {
    process.exit(1);
  }
}

/**
 * Run all tests
 */
async function runTests(): Promise<void> {
  console.log('Starting Webhook Security Tests...\n');

  try {
    await testValidWebhook();
    console.log('✓ Test 1 completed');

    await testInvalidSignature();
    console.log('✓ Test 2 completed');

    await testUnauthorizedIP();
    console.log('✓ Test 3 completed');

    await testDuplicateEvent();
    console.log('✓ Test 4 completed');

    await testExpiredWebhook();
    console.log('✓ Test 5 completed');

    await testMissingFields();
    console.log('✓ Test 6 completed');

    await testInvalidEventType();
    console.log('✓ Test 7 completed');

    await testRateLimiting();
    console.log('✓ Test 8 completed');

    printResults();
  } catch (error: any) {
    console.error('Fatal error during testing:', error.message);
    process.exit(1);
  }
}

// Run tests if executed directly
if (require.main === module) {
  runTests();
}

export { runTests };
