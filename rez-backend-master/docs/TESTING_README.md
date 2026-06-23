# Backend API Testing - Quick Start Guide

This directory contains comprehensive testing tools and documentation for the backend API.

## 🚀 Quick Start

### Option 1: Automated Testing (Recommended)

**Prerequisites:**
- Backend server running on `http://localhost:5001`
- Database seeded with sample data

**Run Tests:**
```bash
# Install dependencies (if needed)
npm install axios chalk

# Run comprehensive test suite
node comprehensive-api-test.js
```

This will:
- ✓ Test all 25+ critical endpoints
- ✓ Validate authentication flow
- ✓ Check data APIs
- ✓ Test protected endpoints
- ✓ Verify error handling
- ✓ Generate detailed JSON report

**Expected Output:**
```
==========================================================
  COMPREHENSIVE BACKEND API TEST SUITE
==========================================================

✓ Backend is running
  Database: healthy
  Environment: development

──────────────────────────────────────────────────────────
TASK 1: AUTHENTICATION FLOW
──────────────────────────────────────────────────────────

🧪 Running: 1.1 - Send OTP (New User with Email)
✓ PASSED (245ms)

...

==========================================================
  TEST SUMMARY
==========================================================

Total Tests: 25
Passed: 25
Failed: 0
Pass Rate: 100%

📄 Detailed report saved to: test-results-report.json
```

---

### Option 2: Quick Smoke Test

**Windows:**
```bash
quick-test.bat
```

**Linux/Mac:**
```bash
bash quick-test.sh
```

This runs a quick smoke test of critical endpoints.

---

### Option 3: Manual Testing with cURL

See **[COMPREHENSIVE_TEST_GUIDE.md](./COMPREHENSIVE_TEST_GUIDE.md)** for detailed manual testing instructions.

---

## 📁 Testing Files

| File | Purpose |
|------|---------|
| **comprehensive-api-test.js** | Automated test suite (Node.js) |
| **quick-test.bat** | Quick smoke test (Windows) |
| **quick-test.sh** | Quick smoke test (Linux/Mac) |
| **COMPREHENSIVE_TEST_GUIDE.md** | Detailed manual testing guide with cURL commands |
| **TEST_RESULTS_REPORT_TEMPLATE.md** | Template for documenting test results |
| **TESTING_README.md** | This file - testing overview |

---

## 🧪 What Gets Tested

### 1. Authentication Flow (6 tests)
- ✓ Send OTP for new users
- ✓ Send OTP for existing users
- ✓ Phone number format handling
- ✓ OTP verification
- ✓ Development OTP (123456)
- ✓ Get current user

### 2. Data APIs (8 tests)
- ✓ Products API (pagination)
- ✓ Featured products
- ✓ Stores API (pagination)
- ✓ Offers API
- ✓ Videos API
- ✓ Projects API
- ✓ Categories API
- ✓ Homepage API

### 3. Protected Endpoints (4 tests)
- ✓ Get cart
- ✓ Add to cart
- ✓ Get wishlist
- ✓ Add to wishlist

### 4. Error Handling (3 tests)
- ✓ Invalid OTP rejection
- ✓ Missing required fields
- ✓ Unauthorized access prevention

**Total: 21+ comprehensive tests**

---

## 📊 Test Results

After running tests, you'll get:

1. **Console Output** - Real-time test results with pass/fail status
2. **JSON Report** - `test-results-report.json` with detailed results
3. **Performance Metrics** - Response times for each endpoint

**Sample JSON Report:**
```json
{
  "timestamp": "2025-11-15T07:45:00.000Z",
  "summary": {
    "total": 25,
    "passed": 25,
    "failed": 0,
    "passRate": "100%"
  },
  "tests": [
    {
      "name": "1.1 - Send OTP (New User with Email)",
      "status": "PASSED",
      "duration": "245ms",
      "details": { ... }
    },
    ...
  ]
}
```

---

## 🔧 Troubleshooting

### Backend Not Responding

**Check if backend is running:**
```bash
curl http://localhost:5001/health
```

**If not running, start it:**
```bash
cd user-backend
npm run dev
```

### Database Not Seeded

**Run seeding script:**
```bash
npm run seed
```

### Tests Failing

1. **Check backend logs** for errors
2. **Verify database connection** in health check
3. **Check if data is seeded** by testing data APIs manually
4. **Review test output** for specific error messages

### Port Already in Use

If port 5001 is already in use:
```bash
# Find and kill the process
# Windows:
netstat -ano | findstr :5001
taskkill /PID <PID> /F

# Linux/Mac:
lsof -ti:5001 | xargs kill -9
```

---

## 📝 Common Testing Scenarios

### Scenario 1: Testing New User Registration

```bash
# 1. Send OTP
curl -X POST http://localhost:5001/api/user/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"9999999999","email":"newuser@test.com"}'

# 2. Verify with dev OTP
curl -X POST http://localhost:5001/api/user/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"9999999999","otp":"123456"}'

# Save the token from response
```

### Scenario 2: Testing Cart Operations

```bash
# 1. Get a product ID
curl http://localhost:5001/api/products?limit=1

# 2. Add to cart (requires auth token)
curl -X POST http://localhost:5001/api/cart/items \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"productId":"PRODUCT_ID","quantity":1}'

# 3. View cart
curl http://localhost:5001/api/cart \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Scenario 3: Testing Wishlist

```bash
# 1. Add to wishlist
curl -X POST http://localhost:5001/api/wishlist/items \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"productId":"PRODUCT_ID"}'

# 2. View wishlist
curl http://localhost:5001/api/wishlist \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🎯 Expected Performance

All tests should complete within these timeframes:

| Test Category | Expected Time |
|---------------|---------------|
| Authentication | < 500ms per test |
| Data APIs | < 200ms per test |
| Protected Endpoints | < 300ms per test |
| Error Handling | < 200ms per test |
| **Total Suite** | **< 15 seconds** |

---

## ✅ Success Criteria

Tests are considered successful if:

- ✓ **Pass rate ≥ 95%** (at least 24/25 tests passing)
- ✓ **All data APIs return data** (not empty arrays)
- ✓ **Authentication works** (tokens generated and validated)
- ✓ **Protected endpoints require auth** (401 without token)
- ✓ **Error handling works** (proper error codes and messages)
- ✓ **Response times acceptable** (see table above)

---

## 📋 Pre-Deployment Checklist

Before deploying to production, ensure:

- [ ] All 25 tests passing
- [ ] Database properly seeded
- [ ] Authentication flow working
- [ ] Protected endpoints secured
- [ ] Error handling tested
- [ ] Performance benchmarks met
- [ ] Security validation complete
- [ ] API documentation updated
- [ ] Frontend integration tested

---

## 🔗 Related Documentation

- **[COMPREHENSIVE_TEST_GUIDE.md](./COMPREHENSIVE_TEST_GUIDE.md)** - Detailed testing guide with cURL commands
- **[TEST_RESULTS_REPORT_TEMPLATE.md](./TEST_RESULTS_REPORT_TEMPLATE.md)** - Template for documenting results
- **[API_DOCUMENTATION.md](./API_DOCUMENTATION.md)** - Complete API reference
- **[BACKEND_STATUS.md](./BACKEND_STATUS.md)** - Current backend status

---

## 💡 Tips

1. **Run tests after every code change** to catch regressions early
2. **Use development OTP (123456)** for faster testing
3. **Save auth tokens** for testing protected endpoints
4. **Check response times** to identify performance issues
5. **Review JSON report** for detailed failure analysis
6. **Test error cases** to ensure proper validation

---

## 🆘 Getting Help

If tests fail or you encounter issues:

1. **Check backend logs** - Look for error messages
2. **Review test output** - Read the error details
3. **Run health check** - Verify backend status
4. **Check database** - Ensure data is present
5. **Review documentation** - Check API guides
6. **Run individual tests** - Isolate the failing test

---

## 📈 Next Steps

After successful testing:

1. **Document results** using the report template
2. **Fix any failures** found during testing
3. **Re-run tests** to verify fixes
4. **Update API docs** with actual responses
5. **Create frontend integration guide**
6. **Deploy to staging** for integration testing

---

**Last Updated:** 2025-11-15
**Version:** 1.0.0
**Maintained By:** Backend Team
