# Integration Test Quick Checklist

## 🔴 CRITICAL - Fix Immediately (P0)

### 1. Authentication System
- [ ] Fix OTP send endpoint (currently returns 400)
- [ ] Fix OTP verify endpoint (no token returned)
- [ ] Test phone number validation
- [ ] Verify token generation
- [ ] Test token storage
- [ ] Test login flow end-to-end

**Test Command:**
```bash
curl -X POST http://localhost:5001/api/user/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"9999999999","email":"test@test.com"}'
```

### 2. Product APIs
- [ ] Seed products in database (minimum 20 products)
- [ ] Test GET /api/user/products
- [ ] Test GET /api/user/products/:id
- [ ] Verify product schema matches frontend
- [ ] Test product images are accessible
- [ ] Test product search

**Test Command:**
```bash
curl http://localhost:5001/api/user/products?limit=10
```

### 3. Store APIs
- [ ] Seed stores in database (minimum 10 stores)
- [ ] Test GET /api/user/stores
- [ ] Test GET /api/user/stores/:id
- [ ] Verify store schema matches frontend
- [ ] Test store images are accessible
- [ ] Test store search

**Test Command:**
```bash
curl http://localhost:5001/api/user/stores?limit=10
```

---

## 🟡 HIGH PRIORITY - Fix Soon (P1)

### 4. Search Functionality
- [ ] Test product search endpoint
- [ ] Test store search endpoint
- [ ] Test filter by category
- [ ] Test filter by price range
- [ ] Test sorting options

### 5. Content APIs
- [ ] Fix GET /api/user/offers
- [ ] Fix GET /api/user/videos
- [ ] Fix GET /api/user/projects
- [ ] Seed sample offers
- [ ] Seed sample videos
- [ ] Seed sample projects

### 6. Authorization
- [ ] Test unauthorized access returns 401
- [ ] Test expired token handling
- [ ] Test token refresh flow
- [ ] Test protected endpoints require auth

---

## 🟢 MEDIUM PRIORITY - Test After P0/P1 Fixed (P2)

### 7. Cart Operations (Requires Auth)
- [ ] Test GET /api/user/cart
- [ ] Test POST /api/user/cart/items (add to cart)
- [ ] Test PUT /api/user/cart/items (update quantity)
- [ ] Test DELETE /api/user/cart/items/:id (remove)
- [ ] Test POST /api/user/cart/clear
- [ ] Test cart validation

### 8. Order Operations (Requires Auth)
- [ ] Test GET /api/user/orders
- [ ] Test GET /api/user/orders/:id
- [ ] Test POST /api/user/orders (create order)
- [ ] Test order tracking
- [ ] Test order cancellation

### 9. Wishlist Operations (Requires Auth)
- [ ] Test GET /api/user/wishlist
- [ ] Test POST /api/user/wishlist/items
- [ ] Test DELETE /api/user/wishlist/items/:id

### 10. Review System (Requires Auth)
- [ ] Test GET /api/user/reviews/product/:id
- [ ] Test GET /api/user/reviews/store/:id
- [ ] Test POST /api/user/reviews (create review)
- [ ] Test PUT /api/user/reviews/:id (update review)
- [ ] Test DELETE /api/user/reviews/:id

### 11. Wallet Operations (Requires Auth)
- [ ] Test GET /api/user/wallet/balance
- [ ] Test GET /api/user/wallet/transactions
- [ ] Test POST /api/user/wallet/topup
- [ ] Test POST /api/user/wallet/transfer

### 12. Notification System (Requires Auth)
- [ ] Test GET /api/user/notifications
- [ ] Test GET /api/user/notifications/unread-count
- [ ] Test PUT /api/user/notifications/:id/read
- [ ] Test POST /api/user/notifications/mark-all-read

---

## 📋 Quick Test Commands

### Run Full Integration Test
```bash
cd frontend
node scripts/comprehensive-integration-test.js
```

### Test Specific Backend Endpoint
```bash
# Health check
curl http://localhost:5001/health

# Products
curl http://localhost:5001/api/user/products

# Stores
curl http://localhost:5001/api/user/stores

# With auth token
curl http://localhost:5001/api/user/cart \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Check Backend Logs
```bash
cd ../user-backend
npm run dev
# Watch for errors in console
```

---

## 🎯 Success Criteria

### Phase 1: Basic Functionality (Must Pass)
- ✅ Backend health check passes
- ✅ Database connected
- ❌ User can send OTP
- ❌ User can verify OTP and login
- ❌ Homepage loads products
- ❌ Product details page works
- ❌ Stores list loads
- ❌ Store details page works

### Phase 2: Core Features (Should Pass)
- ⏭️ User can add to cart
- ⏭️ User can update cart
- ⏭️ User can checkout
- ⏭️ User can create order
- ⏭️ User can track order
- ⏭️ User can search products
- ⏭️ User can filter products

### Phase 3: Advanced Features (Nice to Have)
- ⏭️ User can add to wishlist
- ⏭️ User can write reviews
- ⏭️ User can check wallet
- ⏭️ User can view notifications
- ⏭️ User can earn from projects
- ⏭️ User can refer friends

---

## 📊 Current Status

**Last Test Run:** November 14, 2025
**Pass Rate:** 27.78% (5/18 tests)
**Status:** 🔴 NOT READY FOR PRODUCTION

**Passed Tests:**
- ✅ Backend Health Check
- ✅ Database Connection
- ✅ API Endpoint Accessibility
- ✅ Handle Invalid Endpoint
- ✅ Handle Invalid Data

**Failed Tests:**
- ❌ Send OTP (400 error)
- ❌ Verify OTP (no token)
- ❌ Get Products (API error)
- ❌ Get Stores (API error)
- ❌ Search Products (API error)
- ❌ Get Categories (API error)
- ❌ Get Offers (API error)
- ❌ Get Videos (API error)
- ❌ Get Projects (API error)
- ❌ Search Stores (API error)
- ❌ Filter Products (API error)
- ❌ Handle Unauthorized (not returning 401)

**Skipped Tests (due to auth failure):**
- ⏭️ Cart operations (5 tests)
- ⏭️ Order operations (3 tests)
- ⏭️ Wishlist operations (3 tests)
- ⏭️ Review operations (2 tests)
- ⏭️ Wallet operations (2 tests)
- ⏭️ Notification operations (2 tests)
- ⏭️ Payment operations (2 tests)
- ⏭️ Advanced features (5 tests)

---

## 🚀 Quick Fix Guide

### Fix Authentication (Highest Priority)
```javascript
// 1. Check backend validation
// File: user-backend/src/routes/auth.js
// Ensure phoneNumber validation matches frontend format

// 2. Test OTP generation
// Verify OTP is created and stored in database

// 3. Test token generation
// Ensure JWT token is generated and returned

// 4. Update frontend if needed
// File: frontend/services/authApi.ts
// Match request format to backend expectations
```

### Seed Database
```bash
# Navigate to backend
cd user-backend

# Run seed script (if exists)
npm run seed

# Or manually add data via MongoDB
# Use MongoDB Compass or CLI
```

### Test Each Fix
```bash
# After each fix, run integration test
node frontend/scripts/comprehensive-integration-test.js

# Or test specific endpoint
curl -X POST http://localhost:5001/api/user/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"9999999999"}'
```

---

## 📈 Progress Tracking

### Day 1 Targets
- [ ] Fix authentication (OTP send/verify)
- [ ] Seed products database
- [ ] Seed stores database
- [ ] Verify product APIs working
- [ ] Verify store APIs working
- [ ] Re-run integration tests
- [ ] Target: 60%+ pass rate

### Day 2 Targets
- [ ] Fix search functionality
- [ ] Fix content APIs (offers, videos, projects)
- [ ] Test cart operations
- [ ] Test order operations
- [ ] Re-run integration tests
- [ ] Target: 80%+ pass rate

### Day 3 Targets
- [ ] Test all remaining features
- [ ] Fix authorization enforcement
- [ ] Complete security audit
- [ ] Performance testing
- [ ] Final integration test
- [ ] Target: 95%+ pass rate

---

## 🔧 Troubleshooting

### Common Issues

**Issue: "Cannot connect to backend"**
- Check if backend is running: `curl http://localhost:5001/health`
- Verify port 5001 is not in use
- Check firewall settings

**Issue: "Authentication failed"**
- Check phone number format
- Verify OTP generation logic
- Check database for OTP storage
- Verify token generation

**Issue: "Products not loading"**
- Check if products exist in database
- Verify product schema
- Check API endpoint path
- Check CORS settings

**Issue: "Authorization required"**
- Verify token is being sent
- Check token expiration
- Verify Bearer token format
- Check auth middleware

---

## 📞 Quick Reference

**Backend URL:** http://localhost:5001
**API Base:** http://localhost:5001/api
**Health Check:** http://localhost:5001/health

**Test Script:** `frontend/scripts/comprehensive-integration-test.js`
**Full Report:** `frontend/COMPREHENSIVE_INTEGRATION_TEST_REPORT.md`

**Average Response Time:** 9.88ms ✅
**Backend Status:** Healthy ✅
**Database Status:** Connected ✅

---

**Last Updated:** November 14, 2025
**Next Review:** After critical fixes
