# Sample Test Execution Output

This document shows example output from running the E2E test suite.

---

## 🚀 Command Execution

```bash
cd c:\Users\Mukul raj\Downloads\rez-new\rez-app\user-backend
npm run test:e2e-merchant
```

---

## 📺 Console Output Example

```
> user-backend@1.0.0 test:e2e-merchant
> node tests/e2e/merchant-endpoints-test.js

═══════════════════════════════════════════════════════════════════════════════
  MERCHANT BACKEND E2E TEST SUITE - 122+ ENDPOINTS
  Base URL: http://localhost:5001
═══════════════════════════════════════════════════════════════════════════════

🔍 Checking Backend Connectivity...

  ✓ Backend is running and healthy

📦 Testing Authentication Endpoints (11 endpoints)...
  ✓ POST /api/merchant/auth/register - Register new merchant (234ms)
  ✓ POST /api/merchant/auth/login - Login merchant (187ms)
  ✓ GET /api/merchant/auth/me - Get current merchant (45ms)
  ✓ PUT /api/merchant/auth/change-password - Change password (156ms)
  ✓ POST /api/merchant/auth/forgot-password - Request password reset (123ms)
  ✗ POST /api/merchant/auth/reset-password - Reset password (invalid token) (89ms)
  ✗ POST /api/merchant/auth/verify-email - Verify email (invalid token) (67ms)
  ✓ POST /api/merchant/auth/logout - Logout merchant (34ms)

📦 Testing Dashboard Endpoints (6 endpoints)...
  ✓ GET /api/merchant/dashboard - Get dashboard overview (189ms)
  ✓ GET /api/merchant/dashboard/metrics - Get metric cards (145ms)
  ✓ GET /api/merchant/dashboard/activity - Get recent activity (98ms)
  ✓ GET /api/merchant/dashboard/top-products - Get top selling products (112ms)
  ✓ GET /api/merchant/dashboard/sales-data - Get sales chart data (134ms)
  ✓ GET /api/merchant/dashboard/low-stock - Get low stock alerts (87ms)

📦 Testing Onboarding Endpoints (16 endpoints)...
  ✓ GET /api/merchant/onboarding/status - Get onboarding status (67ms)
  ✓ POST /api/merchant/onboarding/step/1 - Save step 1 data (123ms)
  ✓ POST /api/merchant/onboarding/step/2 - Save step 2 data (134ms)
  ✓ POST /api/merchant/onboarding/step/3 - Save step 3 data (145ms)
  ✓ POST /api/merchant/onboarding/step/4 - Save step 4 data (89ms)
  ✓ POST /api/merchant/onboarding/step/5 - Save step 5 data (78ms)
  ✓ POST /api/merchant/onboarding/submit - Submit for approval (167ms)
  ✓ GET /api/merchant/onboarding/documents - Get uploaded documents (56ms)

📦 Testing Team Management Endpoints (10 endpoints)...
  ✓ GET /api/merchant/team - List team members (89ms)
  ✓ POST /api/merchant/team/invite - Invite team member (178ms)
  ✓ GET /api/merchant/team/me/permissions - Get my permissions (45ms)

📦 Testing Product Endpoints (23 endpoints)...
  ✓ GET /api/merchant/products - List products (123ms)
  ✓ POST /api/merchant/products - Create product (234ms)
  ✓ GET /api/merchant/products/:id - Get single product (67ms)
  ✓ PUT /api/merchant/products/:id - Update product (145ms)
  ✓ GET /api/merchant/products/:id/variants - Get product variants (78ms)
  ✓ POST /api/merchant/products/:id/variants - Create variant (167ms)
  ✓ GET /api/merchant/products/:id/reviews - Get product reviews (89ms)
  ✓ GET /api/merchant/bulk/products/template - Download import template (234ms)
  ✓ GET /api/merchant/bulk/products/export - Export products (456ms)

📦 Testing Order Endpoints (10 endpoints)...
  ✓ GET /api/merchant/orders - List orders (134ms)
  ✓ GET /api/merchant/orders/analytics - Get order analytics (189ms)

📦 Testing Cashback Endpoints (11 endpoints)...
  ✓ GET /api/merchant/cashback - List cashback requests (98ms)
  ✓ GET /api/merchant/cashback/stats - Get cashback statistics (112ms)
  ✓ GET /api/merchant/cashback/pending-count - Get pending count (56ms)
  ✓ GET /api/merchant/cashback/export - Export cashback data (345ms)

📦 Testing Notification Endpoints (18 endpoints)...
  ✓ GET /api/merchant/notifications - List notifications (87ms)
  ✓ GET /api/merchant/notifications/unread-count - Get unread count (45ms)
  ✓ GET /api/merchant/notifications/stats - Get notification stats (78ms)
  ✓ POST /api/merchant/notifications/mark-all-read - Mark all as read (123ms)
  ✓ DELETE /api/merchant/notifications/clear-all - Clear all notifications (134ms)

📦 Testing Analytics Endpoints (17 endpoints)...
  ✓ GET /api/merchant/analytics/sales/overview - Sales overview (234ms)
  ✓ GET /api/merchant/analytics/sales/trends - Sales trends (198ms)
  ✓ GET /api/merchant/analytics/sales/by-time - Sales by time (176ms)
  ✓ GET /api/merchant/analytics/sales/by-day - Sales by day (165ms)
  ✓ GET /api/merchant/analytics/products/top-selling - Top selling products (156ms)
  ✓ GET /api/merchant/analytics/categories/performance - Category performance (189ms)
  ✓ GET /api/merchant/analytics/customers/insights - Customer insights (145ms)
  ✓ GET /api/merchant/analytics/inventory/status - Inventory status (134ms)
  ✓ GET /api/merchant/analytics/payments/breakdown - Payment breakdown (123ms)
  ✓ GET /api/merchant/analytics/forecast/sales - Sales forecast (256ms)
  ✓ GET /api/merchant/analytics/trends/seasonal - Seasonal trends (187ms)
  ✓ GET /api/merchant/analytics/cache/stats - Cache statistics (67ms)
  ✓ GET /api/merchant/analytics/export - Export analytics (412ms)

📦 Testing Audit Log Endpoints (17 endpoints)...
  ✓ GET /api/merchant/audit/logs - List audit logs (145ms)
  ✓ GET /api/merchant/audit/stats - Get audit statistics (98ms)
  ✓ GET /api/merchant/audit/search - Search audit logs (167ms)
  ✓ GET /api/merchant/audit/timeline - Get timeline (134ms)
  ✓ GET /api/merchant/audit/timeline/today - Get today's timeline (87ms)
  ✓ GET /api/merchant/audit/timeline/recent - Get recent timeline (76ms)
  ✓ GET /api/merchant/audit/timeline/summary - Get timeline summary (89ms)
  ✓ GET /api/merchant/audit/timeline/critical - Get critical events (112ms)
  ✓ GET /api/merchant/audit/timeline/heatmap - Get activity heatmap (156ms)
  ✓ GET /api/merchant/audit/retention/stats - Retention statistics (78ms)
  ✓ GET /api/merchant/audit/retention/compliance - Compliance status (67ms)
  ✓ GET /api/merchant/audit/export - Export audit logs (389ms)

📦 Testing Upload Endpoints (6 endpoints)...
  ℹ Note: Upload endpoints require multipart/form-data and actual file uploads
  ℹ Skipping upload tests in this automated suite
  ○ POST /api/merchant/uploads/product-image
  ○ POST /api/merchant/uploads/product-images
  ○ POST /api/merchant/uploads/store-logo
  ○ POST /api/merchant/uploads/store-banner
  ○ POST /api/merchant/uploads/video
  ○ DELETE /api/merchant/uploads/:publicId

📦 Testing Cleanup...
  ✓ Deleted 1 test products
  ✓ Logged out successfully

═══════════════════════════════════════════════════════════════════════════════
                         TEST EXECUTION SUMMARY
═══════════════════════════════════════════════════════════════════════════════

Total Tests:     76
Passed:          68 (89.47%)
Failed:          2 (2.63%)
Skipped:         6 (7.89%)
Duration:        12.45s
Avg Response:    134ms

═══════════════════════════════════════════════════════════════════════════════

❌ FAILED TESTS:

  ✗ Authentication - POST /api/merchant/auth/reset-password - Reset password (invalid token)
    POST /api/merchant/auth/reset-password
    Expected: 400, Got: 400
    Error: Expected error validation passed

  ✗ Authentication - POST /api/merchant/auth/verify-email - Verify email (invalid token)
    POST /api/merchant/auth/verify-email
    Expected: 400, Got: 400
    Error: Expected error validation passed

✓ Test results saved to: tests/e2e/results/test-results.json
```

---

## 📊 JSON Results File

**Location**: `tests/e2e/results/test-results.json`

```json
{
  "total": 76,
  "passed": 68,
  "failed": 2,
  "skipped": 6,
  "passRate": "89.47",
  "failRate": "2.63",
  "avgResponseTime": 134,
  "duration": 12450,
  "startTime": 1700500000000,
  "endTime": 1700500012450,
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
    },
    {
      "service": "Authentication",
      "name": "POST /api/merchant/auth/login - Login merchant",
      "method": "post",
      "url": "/api/merchant/auth/login",
      "status": "passed",
      "expectedStatus": 200,
      "actualStatus": 200,
      "responseTime": 187,
      "error": null,
      "timestamp": "2025-11-18T06:00:00.187Z"
    },
    {
      "service": "Dashboard",
      "name": "GET /api/merchant/dashboard - Get dashboard overview",
      "method": "get",
      "url": "/api/merchant/dashboard",
      "status": "passed",
      "expectedStatus": 200,
      "actualStatus": 200,
      "responseTime": 189,
      "error": null,
      "timestamp": "2025-11-18T06:00:01.234Z"
    },
    {
      "service": "Products",
      "name": "POST /api/merchant/products - Create product",
      "method": "post",
      "url": "/api/merchant/products",
      "status": "passed",
      "expectedStatus": 201,
      "actualStatus": 201,
      "responseTime": 234,
      "error": null,
      "timestamp": "2025-11-18T06:00:05.678Z"
    },
    {
      "service": "Analytics",
      "name": "GET /api/merchant/analytics/sales/overview - Sales overview",
      "method": "get",
      "url": "/api/merchant/analytics/sales/overview",
      "status": "passed",
      "expectedStatus": 200,
      "actualStatus": 200,
      "responseTime": 234,
      "error": null,
      "timestamp": "2025-11-18T06:00:10.123Z"
    }
    // ... 71 more test results
  ]
}
```

---

## 🎨 Color Legend

### Test Status Colors

- 🟢 **Green (✓)** - Test passed successfully
- 🔴 **Red (✗)** - Test failed (actual result didn't match expected)
- 🟡 **Yellow (○)** - Test skipped (manual testing required or data dependency)

### Response Time Colors

Response times are color-coded based on performance:

- 🟢 **Green** - < 200ms (Fast, excellent performance)
  ```
  ✓ GET /api/merchant/dashboard - Get dashboard overview (45ms)
  ```

- 🔵 **Cyan** - 200-500ms (Acceptable, good performance)
  ```
  ✓ GET /api/merchant/analytics/sales/overview (234ms)
  ```

- 🟡 **Yellow** - 500-1000ms (Slow, needs optimization)
  ```
  ✓ GET /api/merchant/bulk/products/export (678ms)
  ```

- 🔴 **Red** - > 1000ms (Critical, requires immediate attention)
  ```
  ✓ GET /api/merchant/analytics/export (1234ms)
  ```

---

## 📈 Performance Breakdown

### Response Time Distribution

Based on sample test run:

```
Fast (< 200ms):        45 tests (59%)  ████████████████████████████████
Acceptable (200-500ms): 28 tests (37%)  ███████████████████░░░░░░░░░░░░
Slow (500-1000ms):      3 tests (4%)   ██░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
Critical (> 1000ms):    0 tests (0%)   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
```

### Service Performance

Average response times by service:

```
Dashboard:        98ms   🟢 Excellent
Authentication:   112ms  🟢 Excellent
Team Management:  104ms  🟢 Excellent
Notifications:    93ms   🟢 Excellent
Cashback:         178ms  🟢 Excellent
Onboarding:       108ms  🟢 Excellent
Products:         184ms  🟢 Good
Orders:           162ms  🟢 Good
Audit Logs:       114ms  🟢 Excellent
Analytics:        189ms  🟢 Good
```

---

## ✅ Success Indicators

### Healthy Backend Signs

1. **High Pass Rate** (> 85%)
   - Most endpoints responding correctly
   - Authentication working
   - Data validation passing

2. **Fast Response Times** (< 200ms average)
   - Efficient database queries
   - Optimized API endpoints
   - Good caching strategy

3. **Low Failure Rate** (< 5%)
   - Stable backend
   - Proper error handling
   - Good validation

4. **Zero Server Errors**
   - No 500 errors
   - No crashes
   - Proper exception handling

### Warning Signs

1. **Low Pass Rate** (< 80%)
   - Multiple endpoint failures
   - Authentication issues
   - Data validation problems

2. **Slow Response Times** (> 500ms average)
   - Database performance issues
   - Missing indexes
   - Inefficient queries

3. **High Failure Rate** (> 10%)
   - Backend instability
   - Configuration issues
   - Database connection problems

4. **Server Errors** (500, 502, 503)
   - Application crashes
   - Unhandled exceptions
   - Resource exhaustion

---

## 🔧 Next Steps

After running the tests:

1. **Review Failed Tests**
   - Check error messages
   - Verify expected behavior
   - Fix backend issues

2. **Analyze Performance**
   - Identify slow endpoints
   - Optimize database queries
   - Add caching where needed

3. **Monitor Trends**
   - Track pass rate over time
   - Monitor response times
   - Identify regressions

4. **Expand Coverage**
   - Add missing endpoint tests
   - Test error scenarios
   - Add load testing

---

**Last Updated**: November 18, 2025
**Version**: 1.0.0
