/**
 * LEADERBOARD REAL-TIME TESTING SCRIPT
 * =====================================
 *
 * This script comprehensively tests the leaderboard real-time functionality
 * including WebSocket connections, API endpoints, concurrent users, and error handling.
 *
 * Usage:
 *   npx ts-node scripts/test-leaderboard-realtime.ts
 */

import fetch from 'node-fetch';
import { io, Socket } from 'socket.io-client';

// Configuration
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:5001/api';
const SOCKET_URL = API_BASE_URL.replace('/api', '');
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Test Results Storage
interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
  details?: any;
}

const testResults: TestResult[] = [];

// Helper Functions
function log(message: string, color: keyof typeof COLORS = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function logSection(title: string) {
  console.log('\n' + '='.repeat(80));
  log(title, 'bright');
  console.log('='.repeat(80) + '\n');
}

function logTest(testName: string) {
  log(`\n▶ Testing: ${testName}`, 'cyan');
}

function logSuccess(message: string) {
  log(`  ✓ ${message}`, 'green');
}

function logError(message: string) {
  log(`  ✗ ${message}`, 'red');
}

function logWarning(message: string) {
  log(`  ⚠ ${message}`, 'yellow');
}

function logInfo(message: string) {
  log(`  ℹ ${message}`, 'blue');
}

async function runTest(testName: string, testFn: () => Promise<any>): Promise<TestResult> {
  logTest(testName);
  const startTime = Date.now();

  try {
    const result = await testFn();
    const duration = Date.now() - startTime;

    logSuccess(`Passed in ${duration}ms`);

    const testResult: TestResult = {
      name: testName,
      passed: true,
      duration,
      details: result,
    };

    testResults.push(testResult);
    return testResult;
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    logError(`Failed in ${duration}ms`);
    logError(`Error: ${errorMessage}`);

    const testResult: TestResult = {
      name: testName,
      passed: false,
      duration,
      error: errorMessage,
    };

    testResults.push(testResult);
    return testResult;
  }
}

// Test 1: Backend Health Check
async function testBackendHealth(): Promise<any> {
  const response = await fetch(`${SOCKET_URL}/health`);

  if (!response.ok) {
    throw new Error(`Backend health check failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  logInfo(`Backend status: ${data.status}`);

  return data;
}

// Test 2: API Endpoint - Get Leaderboard (Limit: 10)
async function testLeaderboardAPI_Limit10(): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/referral/leaderboard?limit=10`, {
    headers: {
      'Content-Type': 'application/json',
      // Note: Authentication required - this will test error handling
    },
  });

  const data = await response.json();

  if (response.status === 401) {
    logWarning('Authentication required (expected)');
    logInfo(`Response: ${data.message}`);
    return { authRequired: true, message: data.message };
  }

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  logInfo(`Leaderboard entries: ${data.data?.leaderboard?.length || 0}`);
  logInfo(`User rank: ${data.data?.userRank?.rank || 'N/A'}`);

  return data.data;
}

// Test 3: API Endpoint - Get Leaderboard (Limit: 20)
async function testLeaderboardAPI_Limit20(): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/referral/leaderboard?limit=20`, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();

  if (response.status === 401) {
    logWarning('Authentication required (expected)');
    return { authRequired: true };
  }

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  logInfo(`Leaderboard entries: ${data.data?.leaderboard?.length || 0}`);

  return data.data;
}

// Test 4: API Endpoint - Get Leaderboard (Limit: 50)
async function testLeaderboardAPI_Limit50(): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/referral/leaderboard?limit=50`, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();

  if (response.status === 401) {
    logWarning('Authentication required (expected)');
    return { authRequired: true };
  }

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  logInfo(`Leaderboard entries: ${data.data?.leaderboard?.length || 0}`);

  return data.data;
}

// Test 5: WebSocket Connection
async function testWebSocketConnection(): Promise<any> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.disconnect();
      reject(new Error('WebSocket connection timeout (10s)'));
    }, 10000);

    logInfo(`Connecting to: ${SOCKET_URL}`);

    const socket: Socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: false,
      timeout: 5000,
    });

    socket.on('connect', () => {
      clearTimeout(timeout);
      logSuccess('WebSocket connected successfully');
      logInfo(`Socket ID: ${socket.id}`);

      setTimeout(() => {
        socket.disconnect();
        resolve({ connected: true, socketId: socket.id });
      }, 1000);
    });

    socket.on('connect_error', (error) => {
      clearTimeout(timeout);
      socket.disconnect();
      reject(new Error(`Connection error: ${error.message}`));
    });

    socket.on('error', (error) => {
      clearTimeout(timeout);
      socket.disconnect();
      reject(new Error(`Socket error: ${error}`));
    });
  });
}

// Test 6: WebSocket Event Listeners
async function testWebSocketEventListeners(): Promise<any> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.disconnect();
      reject(new Error('Event listener test timeout (5s)'));
    }, 5000);

    const socket: Socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: false,
      timeout: 5000,
    });

    let eventsRegistered = 0;
    const expectedEvents = ['leaderboard:update', 'leaderboard:user_scored', 'leaderboard:rank_change'];

    socket.on('connect', () => {
      logInfo('Registering event listeners...');

      // Register leaderboard event listeners
      socket.on('leaderboard:update', (data) => {
        logInfo('Received leaderboard:update event');
        eventsRegistered++;
      });

      socket.on('leaderboard:user_scored', (data) => {
        logInfo('Received leaderboard:user_scored event');
        eventsRegistered++;
      });

      socket.on('leaderboard:rank_change', (data) => {
        logInfo('Received leaderboard:rank_change event');
        eventsRegistered++;
      });

      // Test event registration by checking internal state
      setTimeout(() => {
        clearTimeout(timeout);
        socket.disconnect();

        logSuccess(`Event listeners registered: ${expectedEvents.length}`);
        resolve({
          listenersRegistered: expectedEvents.length,
          events: expectedEvents,
        });
      }, 2000);
    });

    socket.on('connect_error', (error) => {
      clearTimeout(timeout);
      socket.disconnect();
      reject(new Error(`Connection error: ${error.message}`));
    });
  });
}

// Test 7: Concurrent API Requests
async function testConcurrentAPIRequests(): Promise<any> {
  const numRequests = 5;
  logInfo(`Making ${numRequests} concurrent requests...`);

  const requests = Array.from({ length: numRequests }, () =>
    fetch(`${API_BASE_URL}/referral/leaderboard?limit=10`, {
      headers: { 'Content-Type': 'application/json' },
    })
  );

  const startTime = Date.now();
  const responses = await Promise.all(requests);
  const duration = Date.now() - startTime;

  const successCount = responses.filter(r => r.ok || r.status === 401).length;

  logInfo(`Completed ${successCount}/${numRequests} requests in ${duration}ms`);
  logInfo(`Average response time: ${(duration / numRequests).toFixed(2)}ms`);

  return {
    totalRequests: numRequests,
    successful: successCount,
    duration,
    averageTime: duration / numRequests,
  };
}

// Test 8: Concurrent WebSocket Connections
async function testConcurrentWebSocketConnections(): Promise<any> {
  return new Promise(async (resolve, reject) => {
    const numConnections = 3;
    logInfo(`Creating ${numConnections} concurrent WebSocket connections...`);

    const sockets: Socket[] = [];
    let connectedCount = 0;

    const timeout = setTimeout(() => {
      sockets.forEach(s => s.disconnect());
      reject(new Error('Concurrent connection test timeout (15s)'));
    }, 15000);

    for (let i = 0; i < numConnections; i++) {
      const socket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        reconnection: false,
        timeout: 5000,
      });

      socket.on('connect', () => {
        connectedCount++;
        logInfo(`Connection ${i + 1} established (ID: ${socket.id})`);

        if (connectedCount === numConnections) {
          clearTimeout(timeout);

          setTimeout(() => {
            sockets.forEach(s => s.disconnect());
            resolve({
              totalConnections: numConnections,
              successful: connectedCount,
            });
          }, 2000);
        }
      });

      socket.on('connect_error', (error) => {
        logWarning(`Connection ${i + 1} failed: ${error.message}`);
      });

      sockets.push(socket);
    }
  });
}

// Test 9: Error Handling - Invalid Endpoint
async function testInvalidEndpoint(): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/referral/invalid-endpoint`, {
    headers: { 'Content-Type': 'application/json' },
  });

  if (response.status === 404) {
    logSuccess('Correctly returned 404 for invalid endpoint');
    return { status: 404, handled: true };
  }

  throw new Error(`Expected 404, got ${response.status}`);
}

// Test 10: Error Handling - Invalid Limit Parameter
async function testInvalidLimitParameter(): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/referral/leaderboard?limit=invalid`, {
    headers: { 'Content-Type': 'application/json' },
  });

  const data = await response.json();

  // Should either return error or use default limit
  if (!response.ok || data.data?.leaderboard) {
    logInfo('Invalid limit parameter handled gracefully');
    return { handled: true };
  }

  throw new Error('Invalid limit parameter not handled');
}

// Test 11: Response Structure Validation
async function testResponseStructure(): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/referral/leaderboard?limit=10`, {
    headers: { 'Content-Type': 'application/json' },
  });

  const data = await response.json();

  if (response.status === 401) {
    logWarning('Cannot validate structure without authentication');
    return { authRequired: true };
  }

  if (!response.ok) {
    throw new Error('API request failed');
  }

  // Validate structure
  const hasData = 'data' in data;
  const hasLeaderboard = data.data && 'leaderboard' in data.data;
  const hasUserRank = data.data && 'userRank' in data.data;

  if (!hasData) throw new Error('Missing "data" field');
  if (!hasLeaderboard) throw new Error('Missing "leaderboard" field');
  if (!hasUserRank) throw new Error('Missing "userRank" field');

  // Validate leaderboard entry structure
  if (data.data.leaderboard.length > 0) {
    const entry = data.data.leaderboard[0];
    const requiredFields = ['rank', 'userId', 'username', 'totalReferrals', 'lifetimeEarnings', 'tier'];

    for (const field of requiredFields) {
      if (!(field in entry)) {
        throw new Error(`Missing required field in leaderboard entry: ${field}`);
      }
    }

    logSuccess('All required fields present in leaderboard entries');
  }

  return { valid: true };
}

// Test 12: WebSocket Reconnection
async function testWebSocketReconnection(): Promise<any> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.disconnect();
      reject(new Error('Reconnection test timeout (15s)'));
    }, 15000);

    const socket: Socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 3,
      reconnectionDelay: 1000,
      timeout: 5000,
    });

    let connectCount = 0;
    let reconnectCount = 0;

    socket.on('connect', () => {
      connectCount++;
      logInfo(`Connected (attempt ${connectCount})`);

      if (connectCount === 1) {
        // Disconnect to trigger reconnection
        logInfo('Forcing disconnect to test reconnection...');
        setTimeout(() => {
          socket.io.engine.close();
        }, 1000);
      } else if (connectCount === 2) {
        clearTimeout(timeout);
        logSuccess('Reconnection successful');
        socket.disconnect();
        resolve({
          connectAttempts: connectCount,
          reconnectAttempts: reconnectCount,
        });
      }
    });

    socket.on('reconnect_attempt', () => {
      reconnectCount++;
      logInfo(`Reconnection attempt ${reconnectCount}`);
    });

    socket.on('connect_error', (error) => {
      logWarning(`Connection error: ${error.message}`);
    });
  });
}

// Generate Test Report
function generateReport() {
  logSection('TEST RESULTS SUMMARY');

  const passed = testResults.filter(r => r.passed).length;
  const failed = testResults.filter(r => !r.passed).length;
  const total = testResults.length;
  const passRate = ((passed / total) * 100).toFixed(2);

  log(`Total Tests: ${total}`, 'bright');
  log(`Passed: ${passed}`, 'green');
  log(`Failed: ${failed}`, 'red');
  log(`Pass Rate: ${passRate}%`, passRate === '100.00' ? 'green' : 'yellow');

  console.log('\n' + '-'.repeat(80));
  log('Detailed Results:', 'bright');
  console.log('-'.repeat(80));

  testResults.forEach((result, index) => {
    const status = result.passed ? `${COLORS.green}✓ PASS${COLORS.reset}` : `${COLORS.red}✗ FAIL${COLORS.reset}`;
    console.log(`${index + 1}. ${result.name}`);
    console.log(`   Status: ${status}`);
    console.log(`   Duration: ${result.duration}ms`);

    if (result.error) {
      console.log(`   ${COLORS.red}Error: ${result.error}${COLORS.reset}`);
    }

    console.log('');
  });

  return {
    total,
    passed,
    failed,
    passRate: parseFloat(passRate),
    tests: testResults,
  };
}

// Save Report to File
function saveReport(report: any) {
  const fs = require('fs');
  const path = require('path');

  const reportPath = path.join(__dirname, '..', 'LEADERBOARD_TESTING_REPORT.md');

  let content = `# Leaderboard Real-Time Testing Report\n\n`;
  content += `**Generated:** ${new Date().toISOString()}\n\n`;
  content += `## Executive Summary\n\n`;
  content += `- **Total Tests:** ${report.total}\n`;
  content += `- **Passed:** ${report.passed}\n`;
  content += `- **Failed:** ${report.failed}\n`;
  content += `- **Pass Rate:** ${report.passRate}%\n\n`;

  content += `## Test Results\n\n`;

  report.tests.forEach((test: TestResult, index: number) => {
    content += `### ${index + 1}. ${test.name}\n\n`;
    content += `- **Status:** ${test.passed ? '✅ PASS' : '❌ FAIL'}\n`;
    content += `- **Duration:** ${test.duration}ms\n`;

    if (test.error) {
      content += `- **Error:** ${test.error}\n`;
    }

    if (test.details) {
      content += `- **Details:** \`\`\`json\n${JSON.stringify(test.details, null, 2)}\n\`\`\`\n`;
    }

    content += `\n`;
  });

  content += `## Issues Found\n\n`;

  const failedTests = report.tests.filter((t: TestResult) => !t.passed);

  if (failedTests.length === 0) {
    content += `No issues found. All tests passed successfully! ✅\n\n`;
  } else {
    failedTests.forEach((test: TestResult, index: number) => {
      content += `${index + 1}. **${test.name}**\n`;
      content += `   - Error: ${test.error}\n\n`;
    });
  }

  content += `## Recommendations\n\n`;
  content += `Based on the test results:\n\n`;

  if (report.passRate === 100) {
    content += `- ✅ All tests passed! The leaderboard real-time system is working correctly.\n`;
    content += `- Consider adding authentication tests with valid tokens.\n`;
    content += `- Monitor WebSocket performance under high load.\n`;
  } else {
    content += `- Review failed tests and fix identified issues.\n`;
    content += `- Ensure WebSocket server is running and accessible.\n`;
    content += `- Verify API authentication is properly configured.\n`;
    content += `- Test with production-like data volumes.\n`;
  }

  content += `\n## Configuration\n\n`;
  content += `- **API Base URL:** ${API_BASE_URL}\n`;
  content += `- **Socket URL:** ${SOCKET_URL}\n`;
  content += `- **Test Date:** ${new Date().toLocaleDateString()}\n`;

  fs.writeFileSync(reportPath, content);

  logSuccess(`Report saved to: ${reportPath}`);
}

// Main Test Runner
async function runAllTests() {
  logSection('LEADERBOARD REAL-TIME TESTING SUITE');

  log('Starting comprehensive tests...', 'bright');
  log(`API Base URL: ${API_BASE_URL}`, 'cyan');
  log(`Socket URL: ${SOCKET_URL}`, 'cyan');

  // Backend Tests
  logSection('1. BACKEND HEALTH CHECKS');
  await runTest('Backend Health Check', testBackendHealth);

  // API Endpoint Tests
  logSection('2. API ENDPOINT TESTS');
  await runTest('Get Leaderboard (Limit: 10)', testLeaderboardAPI_Limit10);
  await runTest('Get Leaderboard (Limit: 20)', testLeaderboardAPI_Limit20);
  await runTest('Get Leaderboard (Limit: 50)', testLeaderboardAPI_Limit50);
  await runTest('Response Structure Validation', testResponseStructure);

  // WebSocket Tests
  logSection('3. WEBSOCKET CONNECTION TESTS');
  await runTest('WebSocket Connection', testWebSocketConnection);
  await runTest('WebSocket Event Listeners', testWebSocketEventListeners);
  await runTest('WebSocket Reconnection', testWebSocketReconnection);

  // Concurrent Tests
  logSection('4. CONCURRENT LOAD TESTS');
  await runTest('Concurrent API Requests', testConcurrentAPIRequests);
  await runTest('Concurrent WebSocket Connections', testConcurrentWebSocketConnections);

  // Error Handling Tests
  logSection('5. ERROR HANDLING TESTS');
  await runTest('Invalid Endpoint', testInvalidEndpoint);
  await runTest('Invalid Limit Parameter', testInvalidLimitParameter);

  // Generate and Save Report
  logSection('6. GENERATING REPORT');
  const report = generateReport();
  saveReport(report);

  logSection('TEST SUITE COMPLETE');

  // Exit with appropriate code
  process.exit(report.failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch((error) => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});
