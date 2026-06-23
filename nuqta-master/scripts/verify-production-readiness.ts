/**
 * Production Readiness Verification Script
 *
 * This script performs comprehensive checks to ensure the application is ready for production:
 * - Backend routes availability
 * - Required backend files existence
 * - Mock data detection in production code
 * - TODO/FIXME comments that might indicate incomplete features
 *
 * Usage:
 *   ts-node scripts/verify-production-readiness.ts
 */

import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5001/api';

interface VerificationResult {
  category: string;
  test: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
}

const results: VerificationResult[] = [];

/**
 * Verify that critical backend routes are accessible
 */
async function verifyBackendRoutes() {
  console.log('\n🔍 Verifying Backend Routes...\n');

  const routes = [
    { path: '/bills', name: 'Bill Upload', method: 'GET' },
    { path: '/gamification/challenges', name: 'Gamification Challenges', method: 'GET' },
    { path: '/subscriptions/plans', name: 'Subscription Plans', method: 'GET' },
    { path: '/referral/code', name: 'Referral Code', method: 'GET' },
    { path: '/social/feed', name: 'Social Feed', method: 'GET' },
    { path: '/payment/methods', name: 'Payment Methods', method: 'GET' },
    { path: '/wallet/balance', name: 'Wallet Balance', method: 'GET' },
    { path: '/products', name: 'Products List', method: 'GET' },
    { path: '/categories', name: 'Categories List', method: 'GET' },
    { path: '/stores', name: 'Stores List', method: 'GET' },
  ];

  for (const route of routes) {
    try {
      const response = await axios.get(`${API_URL}${route.path}`, {
        validateStatus: (status) => status < 500, // Accept 401, 404, etc. as "accessible"
      }).catch(e => e.response);

      // Routes that return 401 (Unauthorized) are still accessible - just need auth
      // Routes that return 404 might indicate the route isn't registered
      if (response && (response.status === 200 || response.status === 401 || response.status === 403)) {
        results.push({
          category: 'Backend Routes',
          test: `${route.name} Route`,
          status: 'PASS',
          message: `✅ ${route.path} is accessible (HTTP ${response.status})`
        });
      } else if (response && response.status === 404) {
        results.push({
          category: 'Backend Routes',
          test: `${route.name} Route`,
          status: 'FAIL',
          message: `❌ ${route.path} returned 404 - route may not be registered`
        });
      } else {
        results.push({
          category: 'Backend Routes',
          test: `${route.name} Route`,
          status: 'WARN',
          message: `⚠️  ${route.path} returned ${response?.status || 'no response'}`
        });
      }
    } catch (error: any) {
      results.push({
        category: 'Backend Routes',
        test: `${route.name} Route`,
        status: 'FAIL',
        message: `❌ ${route.path} - ${error.message}`
      });
    }
  }
}

/**
 * Verify that required backend files exist
 */
function verifyBackendFiles() {
  console.log('\n🔍 Verifying Backend Files...\n');

  const requiredFiles = [
    'src/utils/cloudinaryUtils.ts',
    'src/routes/billRoutes.ts',
    'src/routes/unifiedGamificationRoutes.ts',
    'src/routes/activityFeedRoutes.ts',
    'src/services/spinWheelService.ts',
    'src/services/quizService.ts',
    'src/services/subscriptionService.ts',
    'src/services/billVerificationService.ts',
    'src/controllers/billController.ts',
  ];

  const backendPath = path.join(__dirname, '../../user-backend');

  for (const file of requiredFiles) {
    const filePath = path.join(backendPath, file);
    const exists = fs.existsSync(filePath);

    results.push({
      category: 'Backend Files',
      test: file,
      status: exists ? 'PASS' : 'FAIL',
      message: exists ? `✅ ${file} exists` : `❌ ${file} missing`
    });
  }
}

/**
 * Check for mock data in production files
 */
function checkForMockData() {
  console.log('\n🔍 Checking for Mock Data in Production...\n');

  const frontendPath = path.join(__dirname, '../app');
  const mockPatterns = [
    'const mockData',
    'const MOCK_',
    'const dummyData',
    'const sampleData',
    'const mockPost',
    'const mockComments',
    '// Mock data',
  ];

  let mockDataFound = false;
  const mockFiles: { file: string; patterns: string[] }[] = [];

  function scanDirectory(dir: string) {
    if (!fs.existsSync(dir)) {
      console.log(`⚠️  Directory not found: ${dir}`);
      return;
    }

    const files = fs.readdirSync(dir);

    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory() && !file.includes('node_modules') && !file.includes('__tests__') && !file.includes('__mocks__')) {
        scanDirectory(filePath);
      } else if ((file.endsWith('.tsx') || file.endsWith('.ts')) && !file.endsWith('.test.ts') && !file.endsWith('.test.tsx')) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const foundPatterns: string[] = [];

        for (const pattern of mockPatterns) {
          if (content.includes(pattern)) {
            foundPatterns.push(pattern);
          }
        }

        if (foundPatterns.length > 0) {
          const relativePath = path.relative(frontendPath, filePath);

          // Skip files in test, mock, or demo directories
          if (relativePath.includes('test') || relativePath.includes('mock') || relativePath.includes('demo') || relativePath.includes('example')) {
            continue;
          }

          mockDataFound = true;
          mockFiles.push({ file: relativePath, patterns: foundPatterns });
        }
      }
    }
  }

  scanDirectory(frontendPath);

  if (mockDataFound) {
    for (const { file, patterns } of mockFiles) {
      results.push({
        category: 'Mock Data',
        test: file,
        status: 'WARN',
        message: `⚠️  Found mock data patterns: ${patterns.join(', ')}`
      });
    }
  } else {
    results.push({
      category: 'Mock Data',
      test: 'Production Files',
      status: 'PASS',
      message: '✅ No mock data found in production files'
    });
  }
}

/**
 * Check for TODO/FIXME comments that might indicate incomplete features
 */
function checkForTODOs() {
  console.log('\n🔍 Checking for TODO/FIXME Comments...\n');

  const frontendPath = path.join(__dirname, '../app');
  const todoPatterns = ['// TODO:', '// FIXME:', '// HACK:'];

  let todosFound = false;
  const todoFiles: { file: string; count: number }[] = [];

  function scanDirectory(dir: string) {
    if (!fs.existsSync(dir)) {
      return;
    }

    const files = fs.readdirSync(dir);

    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory() && !file.includes('node_modules') && !file.includes('__tests__')) {
        scanDirectory(filePath);
      } else if ((file.endsWith('.tsx') || file.endsWith('.ts')) && !file.endsWith('.test.ts')) {
        const content = fs.readFileSync(filePath, 'utf-8');
        let todoCount = 0;

        for (const pattern of todoPatterns) {
          const matches = content.match(new RegExp(pattern, 'g'));
          if (matches) {
            todoCount += matches.length;
          }
        }

        if (todoCount > 0) {
          const relativePath = path.relative(frontendPath, filePath);
          todosFound = true;
          todoFiles.push({ file: relativePath, count: todoCount });
        }
      }
    }
  }

  scanDirectory(frontendPath);

  if (todosFound) {
    const totalTodos = todoFiles.reduce((sum, f) => sum + f.count, 0);
    results.push({
      category: 'Code Quality',
      test: 'TODO Comments',
      status: 'WARN',
      message: `⚠️  Found ${totalTodos} TODO/FIXME comments across ${todoFiles.length} files - review before deployment`
    });
  } else {
    results.push({
      category: 'Code Quality',
      test: 'TODO Comments',
      status: 'PASS',
      message: '✅ No TODO/FIXME comments found'
    });
  }
}

/**
 * Check environment configuration
 */
function checkEnvironmentConfig() {
  console.log('\n🔍 Checking Environment Configuration...\n');

  const requiredEnvVars = [
    'EXPO_PUBLIC_API_URL',
    'EXPO_PUBLIC_RAZORPAY_KEY_ID',
  ];

  const envPath = path.join(__dirname, '../.env');

  if (!fs.existsSync(envPath)) {
    results.push({
      category: 'Configuration',
      test: 'Environment File',
      status: 'FAIL',
      message: '❌ .env file not found'
    });
    return;
  }

  const envContent = fs.readFileSync(envPath, 'utf-8');

  for (const varName of requiredEnvVars) {
    if (envContent.includes(varName)) {
      results.push({
        category: 'Configuration',
        test: varName,
        status: 'PASS',
        message: `✅ ${varName} is configured`
      });
    } else {
      results.push({
        category: 'Configuration',
        test: varName,
        status: 'WARN',
        message: `⚠️  ${varName} not found in .env`
      });
    }
  }
}

/**
 * Print formatted results
 */
function printResults() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 PRODUCTION READINESS VERIFICATION RESULTS');
  console.log('='.repeat(80) + '\n');

  const categories = [...new Set(results.map(r => r.category))];

  for (const category of categories) {
    console.log(`\n📁 ${category}:`);
    console.log('-'.repeat(80));

    const categoryResults = results.filter(r => r.category === category);

    for (const result of categoryResults) {
      const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
      console.log(`${icon} ${result.test}`);
      console.log(`   ${result.message}`);
    }
  }

  console.log('\n' + '='.repeat(80));

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const warnings = results.filter(r => r.status === 'WARN').length;
  const total = results.length;

  console.log(`\n📈 Summary: ${passed}/${total} PASSED, ${failed} FAILED, ${warnings} WARNINGS`);

  if (failed === 0 && warnings === 0) {
    console.log('\n🎉 ✅ ALL CHECKS PASSED - PRODUCTION READY! 🚀\n');
  } else if (failed === 0) {
    console.log('\n⚠️  Some warnings found - Review before deployment\n');
  } else {
    console.log('\n❌ Critical issues found - Fix before deployment\n');
  }

  // Return exit code
  return failed === 0 ? 0 : 1;
}

/**
 * Main execution function
 */
async function main() {
  console.log('🚀 Starting Production Readiness Verification...\n');
  console.log(`📍 API URL: ${API_URL}\n`);

  try {
    // Run all checks
    checkEnvironmentConfig();
    verifyBackendFiles();
    checkForMockData();
    checkForTODOs();
    await verifyBackendRoutes();

    // Print results
    const exitCode = printResults();

    // Save results to file
    const reportPath = path.join(__dirname, '../verification-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
    console.log(`📄 Detailed report saved to: ${reportPath}\n`);

    process.exit(exitCode);
  } catch (error) {
    console.error('❌ Verification failed with error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { main, verifyBackendRoutes, verifyBackendFiles, checkForMockData };
