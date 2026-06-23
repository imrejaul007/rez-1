/**
 * E2E Test Helper Functions
 *
 * Utility functions for merchant backend E2E testing
 */

const axios = require('axios');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const config = require('./test-config');

/**
 * Create axios instance with configuration
 */
const createAxiosInstance = (token = null) => {
  const headers = {
    'Content-Type': 'application/json'
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return axios.create({
    baseURL: config.baseURL,
    timeout: config.timeout,
    headers,
    validateStatus: () => true // Don't throw on any status
  });
};

/**
 * Authentication Helper
 */
class AuthHelper {
  constructor() {
    this.token = null;
    this.merchantId = null;
    this.merchant = null;
  }

  /**
   * Register a new test merchant
   */
  async register(credentials = config.testMerchant) {
    const api = createAxiosInstance();
    const response = await api.post('/api/merchant/auth/register', credentials);

    if (response.data.success) {
      this.merchant = response.data.data.merchant;
      this.merchantId = this.merchant._id || this.merchant.id;
    }

    return response;
  }

  /**
   * Login and get JWT token
   */
  async login(email = config.testMerchant.email, password = config.testMerchant.password) {
    const api = createAxiosInstance();
    const response = await api.post('/api/merchant/auth/login', { email, password });

    if (response.data.success) {
      this.token = response.data.data.token;
      this.merchant = response.data.data.merchant;
      this.merchantId = this.merchant._id || this.merchant.id;
    }

    return response;
  }

  /**
   * Get current merchant info
   */
  async getMe() {
    if (!this.token) {
      throw new Error('Not authenticated. Call login() first.');
    }

    const api = createAxiosInstance(this.token);
    const response = await api.get('/api/merchant/auth/me');

    if (response.data.success) {
      this.merchant = response.data.data.merchant;
      this.merchantId = this.merchant._id || this.merchant.id;
    }

    return response;
  }

  /**
   * Logout
   */
  async logout() {
    if (!this.token) return;

    const api = createAxiosInstance(this.token);
    const response = await api.post('/api/merchant/auth/logout');

    this.token = null;
    this.merchantId = null;
    this.merchant = null;

    return response;
  }

  /**
   * Get authorization token
   */
  getToken() {
    return this.token;
  }

  /**
   * Get merchant ID
   */
  getMerchantId() {
    return this.merchantId;
  }
}

/**
 * Request Helper with retry logic
 */
class RequestHelper {
  constructor(token) {
    this.token = token;
    this.api = createAxiosInstance(token);
  }

  /**
   * Make HTTP request with retry logic
   */
  async request(method, url, data = null, options = {}) {
    const maxRetries = options.maxRetries || config.retry.maxRetries;
    const retryDelay = options.retryDelay || config.retry.retryDelay;
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const startTime = Date.now();

        let response;
        if (method.toLowerCase() === 'get') {
          response = await this.api.get(url, { params: data });
        } else if (method.toLowerCase() === 'post') {
          response = await this.api.post(url, data);
        } else if (method.toLowerCase() === 'put') {
          response = await this.api.put(url, data);
        } else if (method.toLowerCase() === 'delete') {
          response = await this.api.delete(url, { data });
        } else if (method.toLowerCase() === 'patch') {
          response = await this.api.patch(url, data);
        }

        const responseTime = Date.now() - startTime;
        response.responseTime = responseTime;

        // Return response (whether success or error)
        return response;

      } catch (error) {
        lastError = error;

        // Check if we should retry
        const shouldRetry =
          attempt < maxRetries &&
          (error.code === 'ECONNREFUSED' ||
           error.code === 'ETIMEDOUT' ||
           (error.response && config.retry.retryableStatuses.includes(error.response.status)));

        if (shouldRetry) {
          await this.delay(retryDelay);
          continue;
        }

        // If not retryable, return error response
        if (error.response) {
          error.response.responseTime = 0;
          return error.response;
        }

        throw error;
      }
    }

    throw lastError;
  }

  /**
   * Delay helper
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Convenience methods
   */
  get(url, params) {
    return this.request('get', url, params);
  }

  post(url, data) {
    return this.request('post', url, data);
  }

  put(url, data) {
    return this.request('put', url, data);
  }

  delete(url, data) {
    return this.request('delete', url, data);
  }

  patch(url, data) {
    return this.request('patch', url, data);
  }
}

/**
 * Test Result Tracker
 */
class TestResultTracker {
  constructor() {
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      tests: [],
      startTime: Date.now(),
      endTime: null
    };
  }

  /**
   * Add test result
   */
  addResult(test, result, error = null, responseTime = 0) {
    this.results.total++;

    const testResult = {
      service: test.service,
      name: test.name,
      method: test.method,
      url: test.url,
      status: result,
      expectedStatus: test.expectedStatus,
      actualStatus: test.actualStatus,
      responseTime,
      error: error ? error.message : null,
      timestamp: new Date().toISOString()
    };

    if (result === 'passed') {
      this.results.passed++;
    } else if (result === 'failed') {
      this.results.failed++;
    } else if (result === 'skipped') {
      this.results.skipped++;
    }

    this.results.tests.push(testResult);
  }

  /**
   * Get summary
   */
  getSummary() {
    this.results.endTime = Date.now();
    this.results.duration = this.results.endTime - this.results.startTime;

    return {
      ...this.results,
      passRate: ((this.results.passed / this.results.total) * 100).toFixed(2),
      failRate: ((this.results.failed / this.results.total) * 100).toFixed(2),
      avgResponseTime: this.results.tests.reduce((sum, t) => sum + t.responseTime, 0) / this.results.tests.length
    };
  }

  /**
   * Save results to JSON file
   */
  saveToFile(filepath) {
    const summary = this.getSummary();
    const dir = path.dirname(filepath);

    // Create directory if it doesn't exist
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filepath, JSON.stringify(summary, null, 2));
    return filepath;
  }

  /**
   * Print summary to console
   */
  printSummary() {
    const summary = this.getSummary();

    console.log('\n' + chalk.bold.blue('═══════════════════════════════════════════════════════════════'));
    console.log(chalk.bold.blue('                     TEST EXECUTION SUMMARY                        '));
    console.log(chalk.bold.blue('═══════════════════════════════════════════════════════════════\n'));

    console.log(chalk.bold('Total Tests:     ') + chalk.cyan(summary.total));
    console.log(chalk.bold('Passed:          ') + chalk.green(summary.passed) + chalk.gray(` (${summary.passRate}%)`));
    console.log(chalk.bold('Failed:          ') + chalk.red(summary.failed) + chalk.gray(` (${summary.failRate}%)`));
    console.log(chalk.bold('Skipped:         ') + chalk.yellow(summary.skipped));
    console.log(chalk.bold('Duration:        ') + chalk.cyan(`${(summary.duration / 1000).toFixed(2)}s`));
    console.log(chalk.bold('Avg Response:    ') + this.colorizeResponseTime(summary.avgResponseTime));

    console.log('\n' + chalk.bold.blue('═══════════════════════════════════════════════════════════════\n'));

    // Print failed tests details if any
    if (summary.failed > 0) {
      console.log(chalk.bold.red('❌ FAILED TESTS:\n'));
      summary.tests
        .filter(t => t.status === 'failed')
        .forEach(t => {
          console.log(chalk.red(`  ✗ ${t.service} - ${t.name}`));
          console.log(chalk.gray(`    ${t.method.toUpperCase()} ${t.url}`));
          console.log(chalk.gray(`    Expected: ${t.expectedStatus}, Got: ${t.actualStatus}`));
          if (t.error) {
            console.log(chalk.gray(`    Error: ${t.error}`));
          }
          console.log('');
        });
    }
  }

  /**
   * Colorize response time based on performance targets
   */
  colorizeResponseTime(time) {
    const t = Math.round(time);
    if (t < config.performanceTargets.fast) {
      return chalk.green(`${t}ms`);
    } else if (t < config.performanceTargets.acceptable) {
      return chalk.cyan(`${t}ms`);
    } else if (t < config.performanceTargets.slow) {
      return chalk.yellow(`${t}ms`);
    } else {
      return chalk.red(`${t}ms`);
    }
  }
}

/**
 * Assertion Helper
 */
class AssertHelper {
  /**
   * Assert response status
   */
  static assertStatus(response, expectedStatus) {
    return response.status === expectedStatus;
  }

  /**
   * Assert response has success field
   */
  static assertSuccess(response) {
    return response.data && response.data.success === true;
  }

  /**
   * Assert response has data
   */
  static assertHasData(response) {
    return response.data && response.data.data !== undefined;
  }

  /**
   * Assert response has specific field
   */
  static assertHasField(response, field) {
    return response.data && response.data.data && response.data.data[field] !== undefined;
  }

  /**
   * Assert response data is array
   */
  static assertIsArray(response) {
    return response.data && response.data.data && Array.isArray(response.data.data);
  }

  /**
   * Custom validator function
   */
  static customValidate(response, validatorFn) {
    try {
      return validatorFn(response.data);
    } catch (error) {
      return false;
    }
  }
}

/**
 * Data Generator
 */
class DataGenerator {
  /**
   * Generate random product
   */
  static generateProduct(overrides = {}) {
    return {
      ...config.testProduct,
      name: `Test Product ${Date.now()}`,
      sku: `SKU-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...overrides
    };
  }

  /**
   * Generate random order
   */
  static generateOrder(productId, overrides = {}) {
    return {
      ...config.testOrder,
      orderNumber: `ORD-${Date.now()}`,
      items: [
        {
          product: productId,
          quantity: 1,
          price: 99.99
        }
      ],
      ...overrides
    };
  }

  /**
   * Generate random team member
   */
  static generateTeamMember(overrides = {}) {
    return {
      ...config.testTeamMember,
      email: `team-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@example.com`,
      ...overrides
    };
  }
}

/**
 * Logger
 */
class Logger {
  static service(name) {
    console.log('\n' + chalk.bold.cyan(`📦 Testing ${name}...`));
  }

  static test(name, status, responseTime = 0) {
    const icon = status === 'passed' ? '✓' : status === 'failed' ? '✗' : '○';
    const color = status === 'passed' ? chalk.green : status === 'failed' ? chalk.red : chalk.yellow;
    const time = responseTime > 0 ? chalk.gray(` (${responseTime}ms)`) : '';

    console.log(color(`  ${icon} ${name}${time}`));
  }

  static error(message) {
    console.log(chalk.red(`  ⚠ ${message}`));
  }

  static info(message) {
    console.log(chalk.gray(`  ℹ ${message}`));
  }

  static success(message) {
    console.log(chalk.green(`  ✓ ${message}`));
  }

  static warning(message) {
    console.log(chalk.yellow(`  ⚠ ${message}`));
  }
}

module.exports = {
  createAxiosInstance,
  AuthHelper,
  RequestHelper,
  TestResultTracker,
  AssertHelper,
  DataGenerator,
  Logger
};
