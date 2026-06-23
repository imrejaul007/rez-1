/**
 * Bulk Import Test Script
 *
 * This script tests the bulk import functionality
 * Run: node scripts/test-bulk-import.js
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = process.env.API_URL || 'http://localhost:5001';
const API_PREFIX = '/api';

// Test credentials (replace with actual values)
const TEST_MERCHANT_EMAIL = process.env.TEST_MERCHANT_EMAIL || 'test@merchant.com';
const TEST_MERCHANT_PASSWORD = process.env.TEST_MERCHANT_PASSWORD || require('crypto').randomBytes(16).toString('hex');
const TEST_STORE_ID = process.env.TEST_STORE_ID || null;

let authToken = null;
let storeId = null;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function error(message) {
  log(`❌ ${message}`, 'red');
}

function info(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function warning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

// Step 1: Login as merchant
async function loginMerchant() {
  try {
    info('Step 1: Logging in as merchant...');

    const response = await axios.post(`${BASE_URL}${API_PREFIX}/merchant/auth/login`, {
      email: TEST_MERCHANT_EMAIL,
      password: TEST_MERCHANT_PASSWORD
    });

    if (response.data.success && response.data.token) {
      authToken = response.data.token;
      success('Login successful');
      return true;
    } else {
      error('Login failed: No token received');
      return false;
    }
  } catch (err) {
    error(`Login failed: ${err.message}`);
    if (err.response?.data) {
      console.log('Response:', err.response.data);
    }
    return false;
  }
}

// Step 2: Get merchant stores
async function getMerchantStores() {
  try {
    info('Step 2: Getting merchant stores...');

    const response = await axios.get(`${BASE_URL}${API_PREFIX}/merchant/stores`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (response.data.success && response.data.data?.stores?.length > 0) {
      storeId = TEST_STORE_ID || response.data.data.stores[0]._id;
      success(`Found store: ${storeId}`);
      return true;
    } else {
      error('No stores found for merchant');
      return false;
    }
  } catch (err) {
    error(`Failed to get stores: ${err.message}`);
    if (err.response?.data) {
      console.log('Response:', err.response.data);
    }
    return false;
  }
}

// Step 3: Get import template
async function getImportTemplate() {
  try {
    info('Step 3: Downloading import template...');

    const response = await axios.get(
      `${BASE_URL}${API_PREFIX}/merchant/products/import-template`,
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );

    const templatePath = path.join(__dirname, '../test-import-template.csv');
    fs.writeFileSync(templatePath, response.data);

    success(`Template downloaded to: ${templatePath}`);
    return templatePath;
  } catch (err) {
    error(`Failed to get template: ${err.message}`);
    return null;
  }
}

// Step 4: Create test CSV file
function createTestCSV() {
  try {
    info('Step 4: Creating test CSV file...');

    const csvContent = `name,description,shortDescription,sku,price,costPrice,compareAtPrice,category,subcategory,stock,lowStockThreshold,brand,tags,status,images,barcode,weight,isFeatured
Test Product 1,This is a test product for bulk import,Test product,TEST-001,999,800,1299,Electronics,,100,5,TestBrand,"test,import,product1",active,https://via.placeholder.com/400,1234567890,200,false
Test Product 2,Another test product,Second test,TEST-002,1499,1200,1799,Electronics,,50,5,TestBrand,"test,import,product2",active,https://via.placeholder.com/400,1234567891,300,true
Test Product 3,Third test product,Third test,,2999,2500,3299,Electronics,,25,3,TestBrand,"test,import,product3",active,https://via.placeholder.com/400,1234567892,500,false`;

    const testFilePath = path.join(__dirname, '../test-products.csv');
    fs.writeFileSync(testFilePath, csvContent);

    success(`Test CSV created: ${testFilePath}`);
    return testFilePath;
  } catch (err) {
    error(`Failed to create test CSV: ${err.message}`);
    return null;
  }
}

// Step 5: Upload import file
async function uploadImportFile(filePath) {
  try {
    info('Step 5: Uploading import file...');

    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));
    form.append('storeId', storeId);

    const response = await axios.post(
      `${BASE_URL}${API_PREFIX}/merchant/products/bulk-import`,
      form,
      {
        headers: {
          ...form.getHeaders(),
          Authorization: `Bearer ${authToken}`
        }
      }
    );

    if (response.data.success && response.data.data?.jobId) {
      success(`Import job created: ${response.data.data.jobId}`);
      return response.data.data.jobId;
    } else {
      error('Failed to create import job');
      return null;
    }
  } catch (err) {
    error(`Upload failed: ${err.message}`);
    if (err.response?.data) {
      console.log('Response:', err.response.data);
    }
    return null;
  }
}

// Step 6: Poll import status
async function pollImportStatus(jobId) {
  return new Promise(async (resolve, reject) => {
    info('Step 6: Polling import status...');

    let attempts = 0;
    const maxAttempts = 30;
    const pollInterval = 2000;

    const poll = async () => {
      try {
        attempts++;

        const response = await axios.get(
          `${BASE_URL}${API_PREFIX}/merchant/products/import-status/${jobId}`,
          {
            headers: { Authorization: `Bearer ${authToken}` }
          }
        );

        const { data } = response.data;

        if (data.status === 'completed') {
          success('Import completed!');
          console.log('\n📊 Import Results:');
          console.log(`   Total: ${data.progress.total}`);
          console.log(`   ${colors.green}✅ Successful: ${data.progress.successful}${colors.reset}`);
          console.log(`   ${colors.red}❌ Failed: ${data.progress.failed}${colors.reset}`);
          console.log(`   ${colors.yellow}⚠️  Warnings: ${data.progress.warnings}${colors.reset}`);
          console.log(`   Duration: ${data.result?.duration}ms`);

          // Show errors if any
          if (data.result?.rows) {
            const errorRows = data.result.rows.filter(r => r.status === 'error');
            if (errorRows.length > 0) {
              console.log('\n❌ Errors:');
              errorRows.forEach(row => {
                console.log(`   Row ${row.rowNumber}: ${row.errors.join(', ')}`);
              });
            }

            const warningRows = data.result.rows.filter(r => r.status === 'warning');
            if (warningRows.length > 0) {
              console.log('\n⚠️  Warnings:');
              warningRows.forEach(row => {
                console.log(`   Row ${row.rowNumber}: ${row.warnings.join(', ')}`);
              });
            }
          }

          resolve(data);
        } else if (data.status === 'failed') {
          error(`Import failed: ${data.error}`);
          reject(new Error(data.error));
        } else if (attempts >= maxAttempts) {
          error('Import timeout');
          reject(new Error('Import timeout'));
        } else {
          info(`Status: ${data.status} (${data.progress.percentage}%)`);
          setTimeout(poll, pollInterval);
        }
      } catch (err) {
        error(`Failed to get status: ${err.message}`);
        reject(err);
      }
    };

    poll();
  });
}

// Step 7: Get import instructions
async function getImportInstructions() {
  try {
    info('Step 7: Getting import instructions...');

    const response = await axios.get(
      `${BASE_URL}${API_PREFIX}/merchant/products/import-instructions`,
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );

    if (response.data.success) {
      success('Import instructions retrieved');
      console.log('\n📖 Import Instructions:');
      console.log(`   Title: ${response.data.data.title}`);
      console.log(`   Formats: ${response.data.data.fileFormats.join(', ')}`);
      console.log(`   Max Rows: ${response.data.data.maxRows}`);
      console.log(`   Required Columns: ${response.data.data.requiredColumns.length}`);
      console.log(`   Optional Columns: ${response.data.data.optionalColumns.length}`);
      return true;
    } else {
      error('Failed to get instructions');
      return false;
    }
  } catch (err) {
    error(`Failed to get instructions: ${err.message}`);
    return false;
  }
}

// Step 8: List import jobs
async function listImportJobs() {
  try {
    info('Step 8: Listing import jobs...');

    const response = await axios.get(
      `${BASE_URL}${API_PREFIX}/merchant/products/import-jobs`,
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );

    if (response.data.success) {
      const jobs = response.data.data.jobs;
      success(`Found ${jobs.length} import jobs`);

      if (jobs.length > 0) {
        console.log('\n📋 Recent Import Jobs:');
        jobs.slice(0, 5).forEach((job, idx) => {
          console.log(`   ${idx + 1}. ${job.fileName} - ${job.status} (${job.progress.successful}/${job.progress.total} successful)`);
        });
      }

      return true;
    } else {
      error('Failed to list import jobs');
      return false;
    }
  } catch (err) {
    error(`Failed to list jobs: ${err.message}`);
    return false;
  }
}

// Main test function
async function runTests() {
  console.log('\n' + '='.repeat(60));
  log('🧪 BULK IMPORT TEST SUITE', 'bright');
  console.log('='.repeat(60) + '\n');

  try {
    // Step 1: Login
    if (!await loginMerchant()) {
      error('Test failed at login step');
      process.exit(1);
    }

    // Step 2: Get stores
    if (!await getMerchantStores()) {
      error('Test failed at get stores step');
      process.exit(1);
    }

    // Step 3: Get template
    await getImportTemplate();

    // Step 4: Create test CSV
    const testFilePath = createTestCSV();
    if (!testFilePath) {
      error('Test failed at create CSV step');
      process.exit(1);
    }

    // Step 5: Upload import
    const jobId = await uploadImportFile(testFilePath);
    if (!jobId) {
      error('Test failed at upload step');
      process.exit(1);
    }

    // Step 6: Poll status
    await pollImportStatus(jobId);

    // Step 7: Get instructions
    await getImportInstructions();

    // Step 8: List jobs
    await listImportJobs();

    console.log('\n' + '='.repeat(60));
    success('ALL TESTS PASSED! 🎉');
    console.log('='.repeat(60) + '\n');

  } catch (err) {
    console.log('\n' + '='.repeat(60));
    error(`TEST FAILED: ${err.message}`);
    console.log('='.repeat(60) + '\n');
    process.exit(1);
  }
}

// Run tests
runTests();
