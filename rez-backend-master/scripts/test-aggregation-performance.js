/**
 * Aggregation Pipeline Performance Testing Script
 *
 * Tests and compares performance between original and optimized implementations
 *
 * Usage:
 *   node scripts/test-aggregation-performance.js
 *   node scripts/test-aggregation-performance.js --iterations=20
 *   node scripts/test-aggregation-performance.js --explain
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { getHomepageData } = require('../src/services/homepageService');
const { getHomepageDataOptimized, comparePerformance } = require('../src/services/homepageService.optimized');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  iterations: 10,
  explain: false,
  sections: ['featuredProducts', 'newArrivals', 'featuredStores', 'trendingStores', 'megaOffers', 'studentOffers']
};

args.forEach(arg => {
  if (arg.startsWith('--iterations=')) {
    options.iterations = parseInt(arg.split('=')[1]);
  } else if (arg === '--explain') {
    options.explain = true;
  }
});

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function formatDuration(ms) {
  return `${ms.toFixed(2)}ms`;
}

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(2)}KB`;
}

/**
 * Calculate statistics from array of numbers
 */
function calculateStats(numbers) {
  const sorted = [...numbers].sort((a, b) => a - b);
  const sum = numbers.reduce((a, b) => a + b, 0);
  const avg = sum / numbers.length;
  const min = Math.min(...numbers);
  const max = Math.max(...numbers);
  const median = sorted[Math.floor(sorted.length / 2)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  const p99 = sorted[Math.floor(sorted.length * 0.99)];

  return { avg, min, max, median, p95, p99 };
}

/**
 * Test original implementation
 */
async function testOriginal(params, iterations) {
  log('\n📊 Testing ORIGINAL implementation...', 'blue');

  const times = [];
  let errors = 0;

  for (let i = 0; i < iterations; i++) {
    try {
      const start = Date.now();
      const result = await getHomepageData(params);
      const duration = Date.now() - start;
      times.push(duration);

      if (i === 0) {
        log(`  First run completed in ${formatDuration(duration)}`, 'cyan');
        log(`  Sections returned: ${Object.keys(result.data).length}`, 'cyan');
      }
    } catch (error) {
      errors++;
      log(`  ❌ Error on iteration ${i + 1}: ${error.message}`, 'red');
    }

    // Progress indicator
    if ((i + 1) % 5 === 0) {
      process.stdout.write(`  Progress: ${i + 1}/${iterations}\r`);
    }
  }

  console.log(''); // New line after progress

  const stats = calculateStats(times);

  log('\n  Results:', 'yellow');
  log(`    Successful runs: ${times.length}/${iterations}`, 'cyan');
  log(`    Failed runs: ${errors}`, errors > 0 ? 'red' : 'green');
  log(`    Average: ${formatDuration(stats.avg)}`, 'cyan');
  log(`    Median: ${formatDuration(stats.median)}`, 'cyan');
  log(`    Min: ${formatDuration(stats.min)}`, 'green');
  log(`    Max: ${formatDuration(stats.max)}`, 'red');
  log(`    95th percentile: ${formatDuration(stats.p95)}`, 'yellow');
  log(`    99th percentile: ${formatDuration(stats.p99)}`, 'yellow');

  return { times, errors, stats };
}

/**
 * Test optimized implementation
 */
async function testOptimized(params, iterations) {
  log('\n🚀 Testing OPTIMIZED implementation...', 'blue');

  const times = [];
  let errors = 0;

  for (let i = 0; i < iterations; i++) {
    try {
      const start = Date.now();
      const result = await getHomepageDataOptimized(params);
      const duration = Date.now() - start;
      times.push(duration);

      if (i === 0) {
        log(`  First run completed in ${formatDuration(duration)}`, 'cyan');
        log(`  Sections returned: ${Object.keys(result.data).length}`, 'cyan');
      }
    } catch (error) {
      errors++;
      log(`  ❌ Error on iteration ${i + 1}: ${error.message}`, 'red');
    }

    // Progress indicator
    if ((i + 1) % 5 === 0) {
      process.stdout.write(`  Progress: ${i + 1}/${iterations}\r`);
    }
  }

  console.log(''); // New line after progress

  const stats = calculateStats(times);

  log('\n  Results:', 'yellow');
  log(`    Successful runs: ${times.length}/${iterations}`, 'cyan');
  log(`    Failed runs: ${errors}`, errors > 0 ? 'red' : 'green');
  log(`    Average: ${formatDuration(stats.avg)}`, 'cyan');
  log(`    Median: ${formatDuration(stats.median)}`, 'cyan');
  log(`    Min: ${formatDuration(stats.min)}`, 'green');
  log(`    Max: ${formatDuration(stats.max)}`, 'red');
  log(`    95th percentile: ${formatDuration(stats.p95)}`, 'yellow');
  log(`    99th percentile: ${formatDuration(stats.p99)}`, 'yellow');

  return { times, errors, stats };
}

/**
 * Compare results
 */
function compareResults(originalResults, optimizedResults) {
  log('\n📈 COMPARISON', 'magenta');
  log('─'.repeat(60), 'magenta');

  const improvementAvg = ((originalResults.stats.avg - optimizedResults.stats.avg) / originalResults.stats.avg) * 100;
  const improvementMedian = ((originalResults.stats.median - optimizedResults.stats.median) / originalResults.stats.median) * 100;
  const improvementP95 = ((originalResults.stats.p95 - optimizedResults.stats.p95) / originalResults.stats.p95) * 100;

  log(`\n  Average Response Time:`, 'yellow');
  log(`    Original:  ${formatDuration(originalResults.stats.avg)}`, 'cyan');
  log(`    Optimized: ${formatDuration(optimizedResults.stats.avg)}`, 'cyan');
  log(`    Improvement: ${improvementAvg.toFixed(2)}%`, improvementAvg > 0 ? 'green' : 'red');

  log(`\n  Median Response Time:`, 'yellow');
  log(`    Original:  ${formatDuration(originalResults.stats.median)}`, 'cyan');
  log(`    Optimized: ${formatDuration(optimizedResults.stats.median)}`, 'cyan');
  log(`    Improvement: ${improvementMedian.toFixed(2)}%`, improvementMedian > 0 ? 'green' : 'red');

  log(`\n  95th Percentile:`, 'yellow');
  log(`    Original:  ${formatDuration(originalResults.stats.p95)}`, 'cyan');
  log(`    Optimized: ${formatDuration(optimizedResults.stats.p95)}`, 'cyan');
  log(`    Improvement: ${improvementP95.toFixed(2)}%`, improvementP95 > 0 ? 'green' : 'red');

  log(`\n  Reliability:`, 'yellow');
  log(`    Original errors:  ${originalResults.errors}`, originalResults.errors > 0 ? 'red' : 'green');
  log(`    Optimized errors: ${optimizedResults.errors}`, optimizedResults.errors > 0 ? 'red' : 'green');

  // Overall verdict
  log(`\n  Overall Verdict:`, 'yellow');
  if (improvementAvg > 30 && optimizedResults.errors === 0) {
    log(`    ✅ EXCELLENT - Optimized version is significantly better!`, 'green');
    log(`    ✅ Ready for production deployment`, 'green');
  } else if (improvementAvg > 10 && optimizedResults.errors === 0) {
    log(`    ✅ GOOD - Optimized version shows improvement`, 'green');
    log(`    ✅ Ready for staged rollout`, 'green');
  } else if (improvementAvg > 0) {
    log(`    ⚠️  MARGINAL - Some improvement but review carefully`, 'yellow');
  } else {
    log(`    ❌ NO IMPROVEMENT - Stick with original implementation`, 'red');
  }

  return {
    improvementAvg,
    improvementMedian,
    improvementP95
  };
}

/**
 * Test with explain() to analyze query execution
 */
async function runExplainAnalysis() {
  log('\n🔍 Running EXPLAIN analysis...', 'blue');

  const { Product } = require('../src/models/Product');

  // Test original approach
  log('\n  Original Implementation Explain:', 'yellow');
  const originalExplain = await Product.find({
    isActive: true,
    isFeatured: true,
    'inventory.isAvailable': true
  })
    .sort({ 'analytics.views': -1 })
    .limit(10)
    .explain('executionStats');

  log(`    Execution time: ${originalExplain.executionStats.executionTimeMillis}ms`, 'cyan');
  log(`    Documents examined: ${originalExplain.executionStats.totalDocsExamined}`, 'cyan');
  log(`    Documents returned: ${originalExplain.executionStats.nReturned}`, 'cyan');
  log(`    Index used: ${originalExplain.executionStats.executionStages.indexName || 'COLLSCAN'}`, 'cyan');

  // Test optimized aggregation
  log('\n  Optimized Implementation Explain:', 'yellow');
  const optimizedExplain = await Product.aggregate([
    {
      $match: {
        isActive: true,
        isFeatured: true,
        'inventory.isAvailable': true
      }
    },
    {
      $sort: { 'analytics.views': -1 }
    },
    {
      $limit: 10
    }
  ]).explain('executionStats');

  const stage = optimizedExplain.stages[0].$cursor.executionStats;
  log(`    Execution time: ${stage.executionTimeMillis}ms`, 'cyan');
  log(`    Documents examined: ${stage.totalDocsExamined}`, 'cyan');
  log(`    Documents returned: ${stage.nReturned}`, 'cyan');
  log(`    Index used: ${stage.executionStages.indexName || 'COLLSCAN'}`, 'cyan');

  // Compare
  const timeDiff = originalExplain.executionStats.executionTimeMillis - stage.executionTimeMillis;
  const docsDiff = originalExplain.executionStats.totalDocsExamined - stage.totalDocsExamined;

  log('\n  Comparison:', 'yellow');
  log(`    Time saved: ${timeDiff}ms`, timeDiff > 0 ? 'green' : 'red');
  log(`    Documents saved: ${docsDiff}`, docsDiff > 0 ? 'green' : 'red');
}

/**
 * Test database connection
 */
async function testConnection() {
  log('\n🔌 Testing database connection...', 'blue');

  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('MONGODB_URI not found in environment variables');
    }

    await mongoose.connect(uri);
    log('  ✅ Connected to MongoDB', 'green');

    // Check database stats
    const admin = mongoose.connection.db.admin();
    const serverStatus = await admin.serverStatus();

    log(`  Database: ${mongoose.connection.name}`, 'cyan');
    log(`  Version: ${serverStatus.version}`, 'cyan');
    log(`  Uptime: ${Math.floor(serverStatus.uptime / 60)} minutes`, 'cyan');

    // Check collection counts
    const collections = ['products', 'stores', 'events', 'offers', 'videos', 'articles'];
    log('\n  Collection counts:', 'yellow');

    for (const collectionName of collections) {
      try {
        const count = await mongoose.connection.db.collection(collectionName).countDocuments();
        log(`    ${collectionName}: ${count} documents`, 'cyan');
      } catch (error) {
        log(`    ${collectionName}: collection not found`, 'yellow');
      }
    }

    return true;
  } catch (error) {
    log(`  ❌ Connection failed: ${error.message}`, 'red');
    return false;
  }
}

/**
 * Main test function
 */
async function runTests() {
  log('\n' + '═'.repeat(60), 'magenta');
  log('  AGGREGATION PIPELINE PERFORMANCE TEST', 'magenta');
  log('═'.repeat(60), 'magenta');

  log(`\n  Configuration:`, 'yellow');
  log(`    Iterations: ${options.iterations}`, 'cyan');
  log(`    Sections: ${options.sections.join(', ')}`, 'cyan');
  log(`    Explain mode: ${options.explain ? 'Yes' : 'No'}`, 'cyan');

  // Test connection
  const connected = await testConnection();
  if (!connected) {
    log('\n❌ Cannot proceed without database connection', 'red');
    process.exit(1);
  }

  // Prepare test parameters
  const params = {
    sections: options.sections
  };

  try {
    // Run explain analysis if requested
    if (options.explain) {
      await runExplainAnalysis();
    }

    // Warm up (run once to eliminate cold start effects)
    log('\n🔥 Warming up...', 'blue');
    await getHomepageData(params);
    await getHomepageDataOptimized(params);
    log('  ✅ Warm up complete', 'green');

    // Run tests
    const originalResults = await testOriginal(params, options.iterations);
    const optimizedResults = await testOptimized(params, options.iterations);

    // Compare results
    const comparison = compareResults(originalResults, optimizedResults);

    // Generate summary report
    log('\n' + '═'.repeat(60), 'magenta');
    log('  TEST SUMMARY', 'magenta');
    log('═'.repeat(60), 'magenta');

    const summary = {
      timestamp: new Date().toISOString(),
      iterations: options.iterations,
      sections: options.sections,
      original: {
        avgTime: originalResults.stats.avg,
        medianTime: originalResults.stats.median,
        p95Time: originalResults.stats.p95,
        errors: originalResults.errors
      },
      optimized: {
        avgTime: optimizedResults.stats.avg,
        medianTime: optimizedResults.stats.median,
        p95Time: optimizedResults.stats.p95,
        errors: optimizedResults.errors
      },
      improvement: {
        avg: comparison.improvementAvg,
        median: comparison.improvementMedian,
        p95: comparison.improvementP95
      }
    };

    log('\n' + JSON.stringify(summary, null, 2), 'cyan');

    // Save report to file
    const fs = require('fs');
    const reportPath = './performance-test-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(summary, null, 2));
    log(`\n  ✅ Report saved to ${reportPath}`, 'green');

    // Exit successfully
    log('\n✅ All tests completed successfully!', 'green');
    process.exit(0);
  } catch (error) {
    log(`\n❌ Test failed: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

// Handle cleanup
process.on('SIGINT', async () => {
  log('\n\n⚠️  Test interrupted by user', 'yellow');
  await mongoose.disconnect();
  process.exit(0);
});

process.on('unhandledRejection', async (error) => {
  log(`\n❌ Unhandled rejection: ${error.message}`, 'red');
  await mongoose.disconnect();
  process.exit(1);
});

// Run tests
runTests();
