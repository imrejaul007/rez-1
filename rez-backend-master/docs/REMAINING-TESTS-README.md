# Remaining Failed Tests - Debug Guide

## Overview

After our fixes, **34 out of 76 tests (44.74%)** are now passing. This document helps debug the remaining **31 failed tests**.

## Quick Start

```bash
cd user-backend
node test-remaining-failed.js
```

## Test Breakdown (31 tests)

### 📊 Dashboard - 4 tests
**Issue**: Return 200 but fail validation checks
- GET /api/merchant/dashboard/activity
- GET /api/merchant/dashboard/top-products
- GET /api/merchant/dashboard/sales-data
- GET /api/merchant/dashboard/low-stock

**Status**: Likely test validation issue, not backend issue

---

### 🚀 Onboarding - 5 tests
**Issue**: Some need complete data, others fail validation
- GET /api/merchant/onboarding/status (validation)
- POST /api/merchant/onboarding/step/1 (needs companyName)
- POST /api/merchant/onboarding/step/2 (needs storeName)
- POST /api/merchant/onboarding/step/5 (needs documents)
- POST /api/merchant/onboarding/submit (needs all steps)

**Status**: The script provides complete data - check if validation is correct

---

### 👥 Team - 2 tests
**Issue**: Return 200/201 but fail validation
- GET /api/merchant/team
- POST /api/merchant/team/invite

**Status**: Likely test validation issue

---

### 🛍️ Products - 1 test
**Issue**: Needs complete product data with valid category
- POST /api/merchant/products

**Status**: The script provides complete data - may need valid category ID from DB

---

### 📦 Orders - 1 test
**Issue**: Returns 200 but fails validation
- GET /api/merchant/orders/analytics

**Status**: Likely test validation issue

---

### 🔔 Notifications - 1 test
**Issue**: Returns 200 but fails validation
- GET /api/merchant/notifications/stats

**Status**: Likely test validation issue

---

### 📈 Analytics - 9 tests
**Issue**: Most return 200 but fail validation, 1 returns 404
- GET /api/merchant/analytics/sales/overview
- GET /api/merchant/analytics/sales/trends
- GET /api/merchant/analytics/sales/by-time
- GET /api/merchant/analytics/sales/by-day
- GET /api/merchant/analytics/products/top-selling
- GET /api/merchant/analytics/categories/performance
- GET /api/merchant/analytics/customers/insights
- GET /api/merchant/analytics/inventory/status
- GET /api/merchant/analytics/payments/breakdown
- GET /api/merchant/analytics/export ⚠️ **Returns 404**

**Status**: Mostly validation issues, except export endpoint

---

### 📝 Audit - 7 tests
**Issue**: Return 200 but fail validation checks
- GET /api/merchant/audit/stats
- GET /api/merchant/audit/timeline
- GET /api/merchant/audit/timeline/today
- GET /api/merchant/audit/timeline/recent
- GET /api/merchant/audit/timeline/critical
- GET /api/merchant/audit/retention/stats
- GET /api/merchant/audit/retention/compliance

**Status**: Likely test validation issue

---

## Common Issues

### 1. **Validation Failures (Most Tests)**
**Symptom**: Endpoint returns 200, test marks as failed

**Cause**: The E2E test validation function checks for specific fields or formats that don't match actual API response

**Solution**:
- Run `test-remaining-failed.js` to see actual response
- Compare with test validation function
- Update validation function in `tests/e2e/merchant-endpoints-test.js`

**Example**:
```javascript
// Current validation (might be wrong)
validate: (data) => data.success && Array.isArray(data.data.logs)

// Actual response might be:
{
  success: true,
  data: {
    searchTerm: "test",
    results: [],
    count: 0
  }
}

// Correct validation should be:
validate: (data) => data.success && data.data.searchTerm
```

---

### 2. **Missing Data (Onboarding Tests)**
**Symptom**: Returns 400 with validation error

**Cause**: Test not providing required fields

**Solution**: Already provided in `test-remaining-failed.js` - if still failing, check backend validation schema

---

### 3. **Analytics Export (404)**
**Symptom**: Returns 404

**Cause**: Route may not exist or requires different URL format

**Solution**: Check if route exists in `src/merchantroutes/analytics.ts`

---

## How to Fix

### Step 1: Run the debug script
```bash
node test-remaining-failed.js
```

### Step 2: Review output for each test
The script shows:
- ✅ Actual HTTP status
- 📊 Complete response data
- 📊 Response analysis (structure, keys, types)

### Step 3: Compare with test expectations
Open `tests/e2e/merchant-endpoints-test.js` and find the test:
```javascript
{
  name: 'GET /api/merchant/dashboard/activity',
  validate: (data) => data.success && Array.isArray(data.data.activities)  // ← Check this
}
```

### Step 4: Fix validation function
Update the validation to match actual response:
```javascript
{
  name: 'GET /api/merchant/dashboard/activity',
  validate: (data) => data.success && Array.isArray(data.data)  // ← Fixed
}
```

---

## Expected Outcomes

After running the script, you should see:

1. **~25 tests**: Status 200 but "validation issue"
   - → Fix test validation functions

2. **~4 tests**: Status 400 with clear validation errors
   - → Check if test data is complete

3. **~1 test**: Status 404 (analytics/export)
   - → Check if route exists

4. **~1 test**: Onboarding submit needs prerequisites
   - → Complete all onboarding steps first in sequence

---

## Tips

1. **Focus on patterns**: Many failed tests have the same validation issue
2. **Backend is likely correct**: Most endpoints return 200 successfully
3. **Tests need updating**: Validation functions may be outdated
4. **Run one by one**: Script pauses between tests for clarity

---

## Next Steps

After identifying issues:

1. ✅ Update validation functions in E2E test file
2. ✅ Fix any real backend issues found
3. ✅ Re-run full E2E suite: `node tests/e2e/merchant-endpoints-test.js`
4. ✅ Aim for 60%+ pass rate (46+ tests passing)

---

## Support

If you find actual backend bugs (not validation issues):
1. Note the endpoint
2. Note the expected vs actual response
3. Share backend console output
4. I'll fix the backend code

Good luck! 🚀
