# E2E Test Suite - Quick Start Guide

## 🚀 Run Tests (3 Steps)

### 1. Start Backend
```bash
cd c:\Users\Mukul raj\Downloads\rez-new\rez-app\user-backend
npm run dev
```

### 2. Open New Terminal & Run Tests
```bash
cd c:\Users\Mukul raj\Downloads\rez-new\rez-app\user-backend
npm run test:e2e-merchant
```

### 3. View Results
- Console output: Real-time colored results
- JSON results: `tests/e2e/results/test-results.json`

---

## 📊 Expected Output

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
  ...

═══════════════════════════════════════════════════════════════
                     TEST EXECUTION SUMMARY
═══════════════════════════════════════════════════════════════

Total Tests:     76
Passed:          68 (89.47%)
Failed:          2 (2.63%)
Skipped:         6 (7.89%)
Duration:        12.45s
Avg Response:    134ms

═══════════════════════════════════════════════════════════════
```

---

## ⚙️ Configuration Options

### Test Different API URL
```bash
TEST_API_URL=http://localhost:5001 npm run test:e2e-merchant
```

### Enable Verbose Output
```bash
VERBOSE=true npm run test:e2e-merchant
```

### Stop on First Error
```bash
STOP_ON_ERROR=true npm run test:e2e-merchant
```

### Skip Cleanup
```bash
SKIP_CLEANUP=true npm run test:e2e-merchant
```

---

## 🎯 Test Coverage

| Service | Endpoints | Tests |
|---------|-----------|-------|
| Authentication | 11 | 8 |
| Dashboard | 6 | 6 |
| Onboarding | 16 | 8 |
| Team Management | 10 | 3 |
| Products | 23 | 9 |
| Orders | 10 | 2 |
| Cashback | 11 | 4 |
| Notifications | 18 | 5 |
| Analytics | 17 | 13 |
| Audit Logs | 17 | 12 |
| Uploads | 6 | 6 (skipped) |
| **Total** | **145** | **76** |

---

## 🔧 Troubleshooting

### Backend Not Running
```
Error: Backend is not accessible!
```
**Solution**: Start backend with `npm run dev`

### Authentication Failures
```
Expected status 200, got 401
```
**Solution**: Check `JWT_SECRET` in `.env` file

### MongoDB Connection Error
```
Failed to connect to MongoDB
```
**Solution**:
1. Start MongoDB service
2. Verify `MONGODB_URI` in `.env`

---

## 📂 File Locations

- **Test Suite**: `tests/e2e/merchant-endpoints-test.js`
- **Configuration**: `tests/e2e/test-config.js`
- **Helpers**: `tests/e2e/test-helpers.js`
- **Documentation**: `tests/e2e/README.md`
- **Results**: `tests/e2e/results/test-results.json`

---

## 🎨 Color Legend

### Test Results
- 🟢 **Green (✓)** - Test passed
- 🔴 **Red (✗)** - Test failed
- 🟡 **Yellow (○)** - Test skipped

### Response Times
- 🟢 **Green** - < 200ms (Fast)
- 🔵 **Cyan** - < 500ms (Acceptable)
- 🟡 **Yellow** - < 1000ms (Slow)
- 🔴 **Red** - > 1000ms (Critical)

---

## 📖 Full Documentation

For detailed documentation, see:
- [README.md](./README.md) - Complete test documentation
- [E2E_TEST_SUITE_DELIVERY_REPORT.md](../../E2E_TEST_SUITE_DELIVERY_REPORT.md) - Delivery report

---

## ✅ Success Criteria

### Healthy Backend
- **Pass Rate**: > 85%
- **Avg Response Time**: < 200ms
- **Failed Tests**: < 5
- **Server Errors (500)**: 0

### Ready for Production
- **Pass Rate**: > 95%
- **Avg Response Time**: < 150ms
- **Failed Tests**: 0
- **All Critical Paths Tested**: ✓

---

**Last Updated**: November 18, 2025
**Version**: 1.0.0
