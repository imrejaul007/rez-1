# Merchant Backend E2E Test Suite

Comprehensive end-to-end testing for all 122+ merchant backend endpoints.

## Overview

This test suite provides automated testing for the complete merchant backend API, covering:

- **Authentication** (11 endpoints) - Registration, login, password management
- **Dashboard** (6 endpoints) - Metrics, activity, charts
- **Onboarding** (16 endpoints) - 5-step merchant onboarding wizard
- **Team Management** (10 endpoints) - RBAC, invitations, permissions
- **Products** (23 endpoints) - CRUD, variants, reviews, bulk operations
- **Orders** (10 endpoints) - Order management, analytics
- **Cashback** (11 endpoints) - Cashback processing, approvals, payouts
- **Notifications** (18 endpoints) - Real-time notifications, preferences
- **Analytics** (17 endpoints) - Sales, forecasting, trends, insights
- **Audit Logs** (17 endpoints) - Activity tracking, compliance
- **Uploads** (6 endpoints) - File uploads, image optimization

**Total: 145+ endpoints tested**

## Prerequisites

### 1. Backend Running

Ensure the merchant backend is running:

```bash
cd c:\Users\Mukul raj\Downloads\rez-new\rez-app\user-backend
npm run dev
```

Backend should be accessible at `http://localhost:5001`

### 2. Dependencies Installed

The test suite uses these dependencies (already in package.json):

- `axios` - HTTP client
- `chalk` - Colored console output
- Node.js 18+ required

Install if needed:

```bash
npm install
```

### 3. MongoDB Running

Ensure MongoDB is running and accessible. Check `.env` configuration:

```env
MONGODB_URI=mongodb://localhost:27017/rez-merchant
```

## Running Tests

### Basic Execution

Run all tests:

```bash
cd tests/e2e
node merchant-endpoints-test.js
```

### With NPM Script

Add to `package.json`:

```json
{
  "scripts": {
    "test:e2e-merchant": "node tests/e2e/merchant-endpoints-test.js"
  }
}
```

Then run:

```bash
npm run test:e2e-merchant
```

### Environment Variables

Configure test execution with environment variables:

```bash
# Test against different API URL
TEST_API_URL=http://localhost:5001 node merchant-endpoints-test.js

# Enable verbose logging
VERBOSE=true node merchant-endpoints-test.js

# Stop on first error
STOP_ON_ERROR=true node merchant-endpoints-test.js

# Skip cleanup after tests
SKIP_CLEANUP=true node merchant-endpoints-test.js

# Run only specific tests
ONLY_TESTS=Authentication,Products node merchant-endpoints-test.js

# Skip specific tests
SKIP_TESTS=Uploads,Notifications node merchant-endpoints-test.js
```

## Test Output

### Console Output

The test suite provides color-coded console output:

```
═══════════════════════════════════════════════════════════════
  MERCHANT BACKEND E2E TEST SUITE - 122+ ENDPOINTS
  Base URL: http://localhost:5001
═══════════════════════════════════════════════════════════════

🔍 Checking Backend Connectivity...
  ✓ Backend is running and healthy

📦 Testing Authentication Endpoints (11 endpoints)...
  ✓ POST /api/merchant/auth/register - Register new merchant (234ms)
  ✓ POST /api/merchant/auth/login - Login merchant (187ms)
  ✓ GET /api/merchant/auth/me - Get current merchant (45ms)
  ✓ PUT /api/merchant/auth/change-password - Change password (156ms)
  ...

📦 Testing Dashboard Endpoints (6 endpoints)...
  ✓ GET /api/merchant/dashboard - Get dashboard overview (89ms)
  ✓ GET /api/merchant/dashboard/metrics - Get metric cards (67ms)
  ...

═══════════════════════════════════════════════════════════════
                     TEST EXECUTION SUMMARY
═══════════════════════════════════════════════════════════════

Total Tests:     145
Passed:          132 (91.03%)
Failed:          7 (4.83%)
Skipped:         6 (4.14%)
Duration:        45.23s
Avg Response:    156ms

═══════════════════════════════════════════════════════════════
```

### Color Coding

- 🟢 **Green** - Test passed
- 🔴 **Red** - Test failed
- 🟡 **Yellow** - Test skipped
- ⚪ **Gray** - Informational messages

### Response Time Colors

- 🟢 **Green** - < 200ms (Fast)
- 🔵 **Cyan** - < 500ms (Acceptable)
- 🟡 **Yellow** - < 1000ms (Slow)
- 🔴 **Red** - > 1000ms (Critical)

### JSON Results

Test results are automatically saved to:

```
tests/e2e/results/test-results.json
```

Example output:

```json
{
  "total": 145,
  "passed": 132,
  "failed": 7,
  "skipped": 6,
  "passRate": "91.03",
  "failRate": "4.83",
  "avgResponseTime": 156,
  "duration": 45230,
  "startTime": 1700000000000,
  "endTime": 1700000045230,
  "tests": [
    {
      "service": "Authentication",
      "name": "POST /api/merchant/auth/register - Register new merchant",
      "method": "post",
      "url": "/api/merchant/auth/register",
      "status": "passed",
      "expectedStatus": 201,
      "actualStatus": 201,
      "responseTime": 234,
      "error": null,
      "timestamp": "2025-11-18T06:00:00.000Z"
    }
    // ... more tests
  ]
}
```

## Test Structure

### Test Configuration (`test-config.js`)

Central configuration for all tests:

- API base URL
- Test credentials
- Test data (products, orders, etc.)
- Retry settings
- Performance targets
- Reporting options

### Test Helpers (`test-helpers.js`)

Utility functions:

- **AuthHelper** - Authentication management
- **RequestHelper** - HTTP requests with retry logic
- **TestResultTracker** - Track and report test results
- **AssertHelper** - Response validation
- **DataGenerator** - Generate test data
- **Logger** - Color-coded console output

### Main Test Suite (`merchant-endpoints-test.js`)

Comprehensive test coverage:

1. Backend connectivity check
2. Authentication and setup
3. Systematic testing of all services
4. Cleanup and reporting

## Test Features

### ✅ Implemented Features

- **Color-coded output** - Easy to read results
- **Progress indicators** - Real-time test execution status
- **Response time tracking** - Performance monitoring
- **Retry logic** - Handle flaky network conditions
- **Skip/only support** - Run specific tests
- **Cleanup** - Remove test data after execution
- **JSON export** - Machine-readable results
- **Error details** - Comprehensive error messages
- **Authentication flow** - Automatic login and token management
- **Data persistence** - Share data between tests (e.g., created products)

### 🔄 Retry Logic

Tests automatically retry on:

- Network errors (ECONNREFUSED, ETIMEDOUT)
- Server errors (500, 502, 503, 504)
- Timeout errors (408)

Configuration:

- Max retries: 3
- Retry delay: 1000ms
- Exponential backoff: No (fixed delay)

### 📊 Performance Monitoring

Response times are tracked and color-coded:

- **Fast** - < 200ms (🟢 Green)
- **Acceptable** - < 500ms (🔵 Cyan)
- **Slow** - < 1000ms (🟡 Yellow)
- **Critical** - > 1000ms (🔴 Red)

## Test Coverage

### Endpoint Coverage by Service

| Service | Endpoints | Status |
|---------|-----------|--------|
| Authentication | 11 | ✅ Full coverage |
| Dashboard | 6 | ✅ Full coverage |
| Onboarding | 16 | ✅ Full coverage |
| Team Management | 10 | ✅ Full coverage |
| Products | 23 | ✅ Full coverage |
| Orders | 10 | ✅ Full coverage |
| Cashback | 11 | ✅ Full coverage |
| Notifications | 18 | ✅ Full coverage |
| Analytics | 17 | ✅ Full coverage |
| Audit Logs | 17 | ✅ Full coverage |
| Uploads | 6 | ⚠️ Skipped (requires multipart/form-data) |

**Total: 145+ endpoints with 139 fully tested**

### Test Types

- **Happy Path** - Valid requests with expected data
- **Validation** - Response structure and data validation
- **Error Handling** - Invalid requests and error responses
- **Performance** - Response time monitoring
- **Authentication** - Token-based access control

## Interpreting Results

### Success Criteria

A test is considered **PASSED** if:

1. Response status code matches expected status
2. Response validation passes (if validator provided)
3. Response time is reasonable (< 2000ms)

A test is considered **FAILED** if:

1. Wrong status code received
2. Validation fails
3. Network error or timeout

A test is considered **SKIPPED** if:

1. Required data is missing (e.g., no products created)
2. Test is explicitly skipped via configuration
3. Test requires manual intervention (e.g., file uploads)

### Expected Results

For a **healthy backend**, you should see:

- **Pass Rate**: > 95%
- **Average Response Time**: < 200ms
- **Failed Tests**: 0-5 (some may fail due to test data constraints)
- **Skipped Tests**: 6-10 (upload tests, data-dependent tests)

### Common Failures

1. **Authentication Failures**
   - Cause: JWT token expired or invalid
   - Fix: Check JWT_SECRET configuration

2. **404 Not Found**
   - Cause: Endpoint route not registered
   - Fix: Check route registration in server.ts

3. **500 Server Error**
   - Cause: Backend crash or database error
   - Fix: Check backend logs and MongoDB connection

4. **Timeout Errors**
   - Cause: Slow backend or network issues
   - Fix: Increase timeout in test-config.js

## Customization

### Adding New Tests

To add tests for a new endpoint:

```javascript
// In merchant-endpoints-test.js

async function testNewServiceEndpoints() {
  Logger.service('New Service Endpoints');

  const tests = [
    {
      service: 'NewService',
      name: 'GET /api/merchant/new-service - Description',
      method: 'get',
      url: '/api/merchant/new-service',
      expectedStatus: 200,
      validate: (data) => data.success && data.data
    }
  ];

  for (const test of tests) {
    await executeTest(test);
  }
}

// Add to runAllTests()
await testNewServiceEndpoints();
```

### Custom Validators

Add custom validation logic:

```javascript
{
  name: 'GET /api/merchant/products - List products',
  method: 'get',
  url: '/api/merchant/products',
  expectedStatus: 200,
  validate: (data) => {
    // Custom validation
    if (!data.success) return false;
    if (!Array.isArray(data.data.products)) return false;
    if (data.data.products.length === 0) return false;

    // Validate product structure
    const product = data.data.products[0];
    return product.name && product.price && product.sku;
  }
}
```

### Test Data Management

Share data between tests:

```javascript
{
  name: 'POST /api/merchant/products - Create product',
  method: 'post',
  url: '/api/merchant/products',
  data: DataGenerator.generateProduct(),
  expectedStatus: 201,
  validate: (data) => data.success && data.data.product,
  saveResponse: (data) => {
    // Save product ID for later tests
    testData.products.push(data.data.product);
  }
}

// Use saved data in subsequent tests
{
  name: 'GET /api/merchant/products/:id - Get product',
  method: 'get',
  url: () => `/api/merchant/products/${testData.products[0]._id}`,
  expectedStatus: 200,
  skip: () => testData.products.length === 0 // Skip if no product created
}
```

## Troubleshooting

### Backend Not Running

```
Error: Backend is not accessible!
Make sure the backend is running at http://localhost:5001
```

**Solution**: Start the backend server:

```bash
cd c:\Users\Mukul raj\Downloads\rez-new\rez-app\user-backend
npm run dev
```

### MongoDB Connection Error

```
Error: Failed to connect to MongoDB
```

**Solution**:

1. Start MongoDB service
2. Check MONGODB_URI in `.env`
3. Ensure database exists

### Authentication Failures

```
✗ GET /api/merchant/auth/me - Get current merchant
Expected status 200, got 401
```

**Solution**:

1. Check JWT_SECRET in `.env`
2. Verify token expiration settings
3. Check authentication middleware

### All Tests Skipped

```
Skipped: 145 (100%)
```

**Solution**: Check skip conditions in tests. This usually means:

1. Authentication failed
2. Required data is missing
3. Backend is not responding

## CI/CD Integration

### GitHub Actions

Add to `.github/workflows/test.yml`:

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e-tests:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm install

      - name: Start MongoDB
        uses: supercharge/mongodb-github-action@1.10.0
        with:
          mongodb-version: '6.0'

      - name: Start Backend
        run: |
          npm run build
          npm start &
          sleep 10

      - name: Run E2E Tests
        run: npm run test:e2e-merchant

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: tests/e2e/results/
```

### Jenkins

Add to `Jenkinsfile`:

```groovy
stage('E2E Tests') {
  steps {
    sh 'npm install'
    sh 'npm run build'
    sh 'npm start &'
    sh 'sleep 10'
    sh 'npm run test:e2e-merchant'
  }
  post {
    always {
      archiveArtifacts artifacts: 'tests/e2e/results/*.json'
      junit 'tests/e2e/results/*.xml'
    }
  }
}
```

## Best Practices

### 1. Run Tests Regularly

- Before committing code
- In CI/CD pipeline
- Before deployments
- After database migrations

### 2. Monitor Performance

- Track response times over time
- Set performance budgets
- Alert on degradation

### 3. Keep Tests Updated

- Add tests for new endpoints
- Update tests when APIs change
- Remove tests for deprecated endpoints

### 4. Use Test Data Wisely

- Use unique identifiers (timestamps)
- Clean up after tests
- Don't rely on external data

### 5. Handle Failures Gracefully

- Log detailed error messages
- Don't stop on first failure (unless debugging)
- Retry flaky tests
- Report all failures

## License

This test suite is part of the REZ Merchant Backend project.

## Support

For issues or questions:

1. Check backend logs
2. Review test output
3. Check MongoDB connection
4. Verify environment variables
5. Contact development team

---

**Last Updated**: November 18, 2025
**Version**: 1.0.0
**Test Coverage**: 145+ endpoints
**Pass Rate Target**: > 95%
