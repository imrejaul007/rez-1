/**
 * Redis Cache Verification Script
 *
 * This script verifies that Redis caching is working correctly
 * by testing cache operations and checking endpoint performance.
 */

const axios = require('axios');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5001';
const API_URL = `${BASE_URL}/api`;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testEndpoint(name, url, expectedCacheOnSecondCall = true) {
  log(`\n${name}:`, 'cyan');
  log(`URL: ${url}`, 'blue');

  try {
    // First call - should be cache MISS
    const start1 = Date.now();
    const response1 = await axios.get(url);
    const time1 = Date.now() - start1;
    log(`  First call: ${time1}ms (Cache MISS expected)`, 'yellow');

    // Second call - should be cache HIT
    const start2 = Date.now();
    const response2 = await axios.get(url);
    const time2 = Date.now() - start2;

    if (expectedCacheOnSecondCall) {
      const improvement = Math.round(((time1 - time2) / time1) * 100);
      log(`  Second call: ${time2}ms (Cache HIT expected)`, time2 < time1 ? 'green' : 'red');
      log(`  Improvement: ${improvement}%`, improvement > 0 ? 'green' : 'red');

      if (time2 < time1 * 0.5) {
        log(`  ✅ PASS - Significant performance improvement`, 'green');
        return { success: true, time1, time2, improvement };
      } else if (time2 < time1) {
        log(`  ⚠️ PARTIAL - Some improvement but less than expected`, 'yellow');
        return { success: true, time1, time2, improvement };
      } else {
        log(`  ❌ FAIL - No performance improvement (cache may not be working)`, 'red');
        return { success: false, time1, time2, improvement };
      }
    } else {
      log(`  ✅ PASS - Endpoint working`, 'green');
      return { success: true, time1, time2 };
    }
  } catch (error) {
    log(`  ❌ ERROR: ${error.message}`, 'red');
    if (error.response) {
      log(`  Status: ${error.response.status}`, 'red');
      log(`  Message: ${error.response.data?.message || 'No message'}`, 'red');
    }
    return { success: false, error: error.message };
  }
}

async function runTests() {
  log('\n========================================', 'cyan');
  log('  Redis Cache Verification Tests', 'cyan');
  log('========================================\n', 'cyan');

  const results = [];

  // Test 1: Product List
  results.push(await testEndpoint(
    'Test 1: Product List',
    `${API_URL}/products?page=1&limit=20`
  ));

  // Test 2: Featured Products
  results.push(await testEndpoint(
    'Test 2: Featured Products',
    `${API_URL}/products/featured?limit=10`
  ));

  // Test 3: New Arrivals
  results.push(await testEndpoint(
    'Test 3: New Arrivals',
    `${API_URL}/products/new-arrivals?limit=10`
  ));

  // Test 4: Search Suggestions
  results.push(await testEndpoint(
    'Test 4: Search Suggestions',
    `${API_URL}/products/suggestions?q=laptop`
  ));

  // Test 5: Popular Searches
  results.push(await testEndpoint(
    'Test 5: Popular Searches',
    `${API_URL}/products/popular-searches?limit=10`
  ));

  // Test 6: Trending Products
  results.push(await testEndpoint(
    'Test 6: Trending Products',
    `${API_URL}/products/trending?limit=20&days=7`
  ));

  // Test 7: Product Search
  results.push(await testEndpoint(
    'Test 7: Product Search',
    `${API_URL}/products/search?q=laptop&page=1&limit=20`
  ));

  // Summary
  log('\n========================================', 'cyan');
  log('  Test Summary', 'cyan');
  log('========================================\n', 'cyan');

  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const total = results.length;
  const successRate = Math.round((passed / total) * 100);

  log(`Total Tests: ${total}`, 'blue');
  log(`Passed: ${passed}`, passed > 0 ? 'green' : 'red');
  log(`Failed: ${failed}`, failed === 0 ? 'green' : 'red');
  log(`Success Rate: ${successRate}%`, successRate >= 80 ? 'green' : successRate >= 60 ? 'yellow' : 'red');

  // Calculate average improvement
  const improvements = results
    .filter(r => r.improvement !== undefined && r.improvement > 0)
    .map(r => r.improvement);

  if (improvements.length > 0) {
    const avgImprovement = Math.round(
      improvements.reduce((a, b) => a + b, 0) / improvements.length
    );
    log(`\nAverage Performance Improvement: ${avgImprovement}%`, avgImprovement >= 50 ? 'green' : 'yellow');
  }

  // Recommendations
  log('\n========================================', 'cyan');
  log('  Recommendations', 'cyan');
  log('========================================\n', 'cyan');

  if (successRate === 100 && improvements.length > 0) {
    const avgImprovement = Math.round(
      improvements.reduce((a, b) => a + b, 0) / improvements.length
    );
    if (avgImprovement >= 70) {
      log('✅ All tests passed with excellent cache performance!', 'green');
      log('   Redis caching is working optimally.', 'green');
    } else if (avgImprovement >= 50) {
      log('✅ All tests passed with good cache performance.', 'green');
      log('   Consider tuning TTL values for better performance.', 'yellow');
    } else {
      log('⚠️ All tests passed but cache improvement is lower than expected.', 'yellow');
      log('   Check Redis connection and configuration.', 'yellow');
    }
  } else if (successRate >= 80) {
    log('⚠️ Most tests passed but some endpoints may have issues.', 'yellow');
    log('   Review failed tests above for details.', 'yellow');
  } else {
    log('❌ Multiple tests failed. Redis caching may not be configured correctly.', 'red');
    log('   Action items:', 'yellow');
    log('   1. Verify Redis is running and accessible', 'yellow');
    log('   2. Check REDIS_URL in .env file', 'yellow');
    log('   3. Ensure CACHE_ENABLED=true', 'yellow');
    log('   4. Review backend logs for errors', 'yellow');
  }

  log('\n');
  process.exit(successRate >= 80 ? 0 : 1);
}

// Run the tests
runTests().catch(error => {
  log(`\n❌ Test runner error: ${error.message}`, 'red');
  process.exit(1);
});
