# SMOKE TEST SUITE

> **Purpose**: Critical path tests to verify staging/production deployment
>
> **When to Run**: After every deployment to staging or production
>
> **Duration**: ~30-45 minutes for complete suite
>
> **Last Updated**: 2025-11-15

---

## Table of Contents

1. [Critical Path Tests](#1-critical-path-tests)
2. [Automated Smoke Tests](#2-automated-smoke-tests)
3. [Manual Verification Steps](#3-manual-verification-steps)
4. [Performance Baseline Tests](#4-performance-baseline-tests)
5. [Security Scans](#5-security-scans)
6. [Test Results Template](#6-test-results-template)

---

## 1. Critical Path Tests

These are the MUST-PASS tests before considering deployment successful.

### 1.1 Health & Connectivity

**Priority**: P0 (Critical)

| Test ID | Test Case | Expected Result | Status |
|---------|-----------|----------------|--------|
| H-001 | Backend API health endpoint accessible | `200 OK` with `{"status": "ok"}` | ⬜ |
| H-002 | Database connection working | `200 OK` from `/api/health/db` | ⬜ |
| H-003 | Redis connection working | `200 OK` from `/api/health/redis` | ⬜ |
| H-004 | Frontend loads successfully | Homepage displays in < 3s | ⬜ |
| H-005 | SSL certificate valid | No browser warnings | ⬜ |

**Test Commands:**
```bash
# H-001: Backend health
curl -i https://staging-api.rezapp.com/api/health

# H-002: Database health
curl -i https://staging-api.rezapp.com/api/health/db

# H-003: Redis health
curl -i https://staging-api.rezapp.com/api/health/redis

# H-004: Frontend response
curl -i https://staging.rezapp.com

# H-005: SSL check
curl -vI https://staging-api.rezapp.com 2>&1 | grep "SSL certificate verify ok"
```

---

### 1.2 Authentication Flow

**Priority**: P0 (Critical)

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|----------------|--------|
| A-001 | User Registration | 1. Open app<br>2. Click "Sign Up"<br>3. Enter email, phone, password<br>4. Submit | - OTP sent to phone<br>- User redirected to OTP screen<br>- Confirmation email sent | ⬜ |
| A-002 | OTP Verification | 1. Enter valid OTP<br>2. Submit | - OTP validated<br>- User logged in<br>- Redirected to home | ⬜ |
| A-003 | User Login | 1. Click "Login"<br>2. Enter email/phone<br>3. Enter password<br>4. Submit | - JWT token received<br>- User redirected to home<br>- Session persists | ⬜ |
| A-004 | Token Refresh | 1. Wait for token expiry<br>2. Make API call | - Token auto-refreshed<br>- Request succeeds | ⬜ |
| A-005 | Logout | 1. Click "Logout"<br>2. Confirm | - Token invalidated<br>- Redirected to login<br>- Cannot access protected routes | ⬜ |
| A-006 | Forgot Password | 1. Click "Forgot Password"<br>2. Enter email<br>3. Submit | - Reset email sent<br>- Reset link works<br>- Password can be changed | ⬜ |

**API Test Script:**
```bash
#!/bin/bash
API_URL="https://staging-api.rezapp.com/api"

# A-001: Register
echo "Testing registration..."
REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "phone": "+919999999999",
    "password": "Test@1234",
    "name": "Test User"
  }')
echo $REGISTER_RESPONSE | jq .

# A-003: Login
echo "Testing login..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test@1234"
  }')
TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token')
echo "Token: $TOKEN"

# Verify token works
echo "Testing authenticated request..."
curl -s -X GET "$API_URL/users/profile" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

---

### 1.3 Product Browsing

**Priority**: P0 (Critical)

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|----------------|--------|
| P-001 | View Homepage | Open app | - Products displayed<br>- Categories shown<br>- Images load | ⬜ |
| P-002 | Browse Category | Click category tile | - Category products load<br>- Filters available<br>- Pagination works | ⬜ |
| P-003 | View Product | Click product card | - Product details display<br>- Images load<br>- Price shown<br>- Add to cart button visible | ⬜ |
| P-004 | Search Products | Enter search term "shirt" | - Relevant results shown<br>- Response < 1s<br>- Results paginated | ⬜ |
| P-005 | Filter Products | Apply price filter | - Filtered results shown<br>- Filter persists<br>- Can clear filter | ⬜ |

**API Tests:**
```bash
# P-001: Get homepage data
curl -s "$API_URL/homepage" | jq '.sections | length'

# P-002: Get category products
curl -s "$API_URL/products?category=electronics" | jq '.products | length'

# P-003: Get product details
curl -s "$API_URL/products/PRODUCT_ID" | jq '.name'

# P-004: Search products
curl -s "$API_URL/products/search?q=shirt" | jq '.results | length'

# P-005: Filter products
curl -s "$API_URL/products?minPrice=500&maxPrice=2000" | jq '.products | length'
```

---

### 1.4 Shopping Cart

**Priority**: P0 (Critical)

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|----------------|--------|
| C-001 | Add to Cart | 1. View product<br>2. Click "Add to Cart" | - Item added to cart<br>- Cart count updates<br>- Success message shown | ⬜ |
| C-002 | View Cart | Click cart icon | - Cart items display<br>- Correct quantities<br>- Total price correct | ⬜ |
| C-003 | Update Quantity | Increase/decrease quantity | - Quantity updates<br>- Price recalculates<br>- API call successful | ⬜ |
| C-004 | Remove from Cart | Click remove button | - Item removed<br>- Total updates<br>- Cart count decreases | ⬜ |
| C-005 | Empty Cart | Remove all items | - "Cart is empty" message<br>- Checkout disabled | ⬜ |

**API Tests:**
```bash
# C-001: Add to cart
curl -s -X POST "$API_URL/cart/items" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"productId": "PRODUCT_ID", "quantity": 1}' | jq .

# C-002: Get cart
curl -s "$API_URL/cart" \
  -H "Authorization: Bearer $TOKEN" | jq '.items | length'

# C-003: Update quantity
curl -s -X PUT "$API_URL/cart/items/ITEM_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"quantity": 2}' | jq .

# C-004: Remove item
curl -s -X DELETE "$API_URL/cart/items/ITEM_ID" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

---

### 1.5 Checkout & Payment

**Priority**: P0 (Critical)

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|----------------|--------|
| CH-001 | Initiate Checkout | Click "Checkout" | - Redirected to checkout<br>- Cart summary shown<br>- Address form displayed | ⬜ |
| CH-002 | Add Address | Fill address form | - Address saved<br>- Can be selected<br>- Validation works | ⬜ |
| CH-003 | Select Payment (Stripe) | Choose Stripe payment | - Payment form loads<br>- Can enter card details | ⬜ |
| CH-004 | Test Payment (Stripe) | Use test card 4242 4242 4242 4242 | - Payment succeeds<br>- Order created<br>- Confirmation shown | ⬜ |
| CH-005 | Select Payment (Razorpay) | Choose Razorpay | - Razorpay modal opens<br>- Can select UPI/card | ⬜ |
| CH-006 | Test Payment (Razorpay) | Use test UPI | - Payment succeeds<br>- Order created<br>- Webhook received | ⬜ |
| CH-007 | COD Payment | Select Cash on Delivery | - COD fee shown<br>- Order created<br>- Payment status: pending | ⬜ |

**Stripe Test Card:**
```
Card Number: 4242 4242 4242 4242
Expiry: Any future date (e.g., 12/25)
CVC: Any 3 digits (e.g., 123)
```

**Razorpay Test:**
```
Test Mode: Enabled
UPI: success@razorpay
Card: Any test card
```

**API Tests:**
```bash
# CH-004: Create Stripe payment intent
curl -s -X POST "$API_URL/payment/create-intent" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount": 1000, "currency": "inr"}' | jq .

# CH-006: Create Razorpay order
curl -s -X POST "$API_URL/payment/razorpay/order" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount": 1000, "currency": "INR"}' | jq .

# CH-007: Create COD order
curl -s -X POST "$API_URL/orders" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"paymentMethod": "cod", "items": [...]}' | jq .
```

---

### 1.6 Order Management

**Priority**: P0 (Critical)

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|----------------|--------|
| O-001 | View Orders | Navigate to "My Orders" | - Order list displays<br>- Correct status shown<br>- Recent orders first | ⬜ |
| O-002 | View Order Details | Click on order | - All order details shown<br>- Items list correct<br>- Tracking info (if shipped) | ⬜ |
| O-003 | Track Order | Click "Track Order" | - Tracking page loads<br>- Status updates shown<br>- Realtime updates (WebSocket) | ⬜ |
| O-004 | Cancel Order | Click "Cancel Order" (if allowed) | - Order status → Cancelled<br>- Refund initiated<br>- Notification sent | ⬜ |

---

## 2. Automated Smoke Tests

### 2.1 Setup Automated Tests

**Install Test Dependencies:**
```bash
cd frontend
npm install --save-dev jest supertest @testing-library/react-native
```

**Create Smoke Test Suite:**
```javascript
// __tests__/smoke/smoke.test.ts
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://staging-api.rezapp.com/api';

describe('Smoke Tests - Critical Path', () => {
  let authToken: string;
  let userId: string;

  // Test user credentials
  const testUser = {
    email: 'smoketest@rezapp.com',
    password: 'SmokeTest@123',
    phone: '+919876543210',
    name: 'Smoke Test User'
  };

  test('S-001: Backend health check', async () => {
    const response = await axios.get(`${API_URL}/health`);
    expect(response.status).toBe(200);
    expect(response.data.status).toBe('ok');
  });

  test('S-002: Database connectivity', async () => {
    const response = await axios.get(`${API_URL}/health/db`);
    expect(response.status).toBe(200);
    expect(response.data.connected).toBe(true);
  });

  test('S-003: User registration', async () => {
    const response = await axios.post(`${API_URL}/auth/register`, testUser);
    expect(response.status).toBeIn([200, 201]);
    expect(response.data).toHaveProperty('userId');
    userId = response.data.userId;
  });

  test('S-004: User login', async () => {
    const response = await axios.post(`${API_URL}/auth/login`, {
      email: testUser.email,
      password: testUser.password
    });
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('token');
    authToken = response.data.token;
  });

  test('S-005: Get products', async () => {
    const response = await axios.get(`${API_URL}/products?limit=10`);
    expect(response.status).toBe(200);
    expect(response.data.products).toBeInstanceOf(Array);
    expect(response.data.products.length).toBeGreaterThan(0);
  });

  test('S-006: Search products', async () => {
    const response = await axios.post(`${API_URL}/products/search`, {
      query: 'shirt'
    });
    expect(response.status).toBe(200);
    expect(response.data.results).toBeInstanceOf(Array);
  });

  test('S-007: Add to cart', async () => {
    const products = await axios.get(`${API_URL}/products?limit=1`);
    const productId = products.data.products[0]._id;

    const response = await axios.post(
      `${API_URL}/cart/items`,
      { productId, quantity: 1 },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    expect(response.status).toBeIn([200, 201]);
  });

  test('S-008: View cart', async () => {
    const response = await axios.get(`${API_URL}/cart`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    expect(response.status).toBe(200);
    expect(response.data.items.length).toBeGreaterThan(0);
  });

  test('S-009: Get user profile', async () => {
    const response = await axios.get(`${API_URL}/users/profile`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    expect(response.status).toBe(200);
    expect(response.data.email).toBe(testUser.email);
  });

  test('S-010: Logout', async () => {
    const response = await axios.post(
      `${API_URL}/auth/logout`,
      {},
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    expect(response.status).toBe(200);
  });
});
```

**Run Automated Tests:**
```bash
# Set environment
export EXPO_PUBLIC_API_BASE_URL=https://staging-api.rezapp.com/api

# Run smoke tests
npm run test -- __tests__/smoke/smoke.test.ts

# With coverage
npm run test:coverage -- __tests__/smoke/
```

### 2.2 CI/CD Integration

**GitHub Actions Workflow:**
```yaml
# .github/workflows/smoke-tests.yml
name: Smoke Tests

on:
  deployment_status:
    types: [success]

jobs:
  smoke-tests:
    runs-on: ubuntu-latest
    if: github.event.deployment_status.state == 'success'

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: |
          cd frontend
          npm ci

      - name: Run smoke tests
        env:
          EXPO_PUBLIC_API_BASE_URL: ${{ secrets.STAGING_API_URL }}
        run: |
          cd frontend
          npm run test -- __tests__/smoke/

      - name: Notify on failure
        if: failure()
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'Smoke tests failed on staging!'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

---

## 3. Manual Verification Steps

### 3.1 UI/UX Checks

**Visual Inspection:**
- [ ] Homepage loads with correct layout
- [ ] All images display correctly (no broken images)
- [ ] Navigation works (bottom tabs, drawer)
- [ ] Buttons are clickable and styled correctly
- [ ] Forms have proper validation messages
- [ ] Loading states show spinners
- [ ] Error messages display correctly
- [ ] Success messages/toasts appear
- [ ] Modal dialogs open/close properly
- [ ] Pull-to-refresh works

### 3.2 Platform-Specific Tests

**iOS:**
- [ ] App launches without crash
- [ ] Tab bar navigation works
- [ ] Push notifications work
- [ ] Camera permissions work
- [ ] Location permissions work
- [ ] Keyboard behavior correct
- [ ] Safe area insets correct
- [ ] Dark mode support works

**Android:**
- [ ] App launches without crash
- [ ] Bottom navigation works
- [ ] Back button behavior correct
- [ ] Push notifications work
- [ ] Camera permissions work
- [ ] Location permissions work
- [ ] Keyboard behavior correct
- [ ] Material Design components render

**Web:**
- [ ] Responsive design works (mobile/tablet/desktop)
- [ ] Works in Chrome
- [ ] Works in Safari
- [ ] Works in Firefox
- [ ] Works in Edge
- [ ] PWA installable (if configured)

### 3.3 Accessibility Checks

- [ ] Screen reader announces UI elements
- [ ] All buttons have accessible labels
- [ ] Form inputs have labels
- [ ] Color contrast meets WCAG AA
- [ ] Touch targets >= 44x44 pixels
- [ ] Keyboard navigation works (web)

### 3.4 Performance Checks

- [ ] App launches in < 3 seconds
- [ ] Scrolling is smooth (60fps)
- [ ] Images load progressively
- [ ] No memory leaks (check over time)
- [ ] API calls complete in < 1s
- [ ] Animations are smooth
- [ ] No jank or stuttering

---

## 4. Performance Baseline Tests

### 4.1 Load Testing

**Test Concurrent Users:**
```bash
# Install Artillery
npm install -g artillery

# Create load test config
# load-test.yml
config:
  target: "https://staging-api.rezapp.com"
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 120
      arrivalRate: 50
      name: "Sustained load"
    - duration: 60
      arrivalRate: 100
      name: "Peak load"
scenarios:
  - name: "Browse products"
    flow:
      - get:
          url: "/api/products"
      - think: 2
      - get:
          url: "/api/products/{{ $randomString() }}"

# Run load test
artillery run load-test.yml
```

**Expected Metrics:**
```
✓ Response time p95 < 500ms
✓ Response time p99 < 1000ms
✓ Success rate > 99%
✓ Errors < 1%
```

### 4.2 Frontend Performance

**Lighthouse Audit (Web):**
```bash
npm install -g lighthouse

# Run audit
lighthouse https://staging.rezapp.com --output html --output-path ./lighthouse-report.html --view

# Expected scores:
# Performance: > 80
# Accessibility: > 90
# Best Practices: > 90
# SEO: > 80
```

**React Native Performance:**
```bash
# Use Expo development tools
# Monitor:
# - Bundle size: < 50MB
# - Time to interactive: < 5s
# - JavaScript execution time: < 2s
```

### 4.3 Database Performance

```bash
# MongoDB performance stats
mongosh "$MONGODB_URI" --eval "db.stats()"

# Check slow queries
mongosh "$MONGODB_URI" --eval "
  db.setProfilingLevel(2);
  db.system.profile.find({millis: {\$gt: 100}}).sort({millis: -1}).limit(10)
"
```

---

## 5. Security Scans

### 5.1 Vulnerability Scanning

**NPM Audit:**
```bash
# Backend
cd user-backend
npm audit --production
# Expected: 0 high/critical vulnerabilities

# Frontend
cd frontend
npm audit --production
# Expected: 0 high/critical vulnerabilities
```

### 5.2 SSL/TLS Check

```bash
# Check SSL configuration
nmap --script ssl-enum-ciphers -p 443 staging-api.rezapp.com

# Or use online tool
# https://www.ssllabs.com/ssltest/analyze.html?d=staging-api.rezapp.com
# Expected grade: A or A+
```

### 5.3 Security Headers

```bash
# Check security headers
curl -I https://staging-api.rezapp.com

# Expected headers:
# X-Frame-Options: DENY
# X-Content-Type-Options: nosniff
# Strict-Transport-Security: max-age=31536000
# X-XSS-Protection: 1; mode=block
```

### 5.4 API Security

**Test Rate Limiting:**
```bash
# Send 100 rapid requests
for i in {1..100}; do
  curl -s -o /dev/null -w "%{http_code}\n" https://staging-api.rezapp.com/api/products
done

# Expected: Some 429 (Too Many Requests) responses
```

**Test Authentication:**
```bash
# Try accessing protected endpoint without token
curl -i https://staging-api.rezapp.com/api/users/profile
# Expected: 401 Unauthorized

# Try with invalid token
curl -i -H "Authorization: Bearer invalid-token" https://staging-api.rezapp.com/api/users/profile
# Expected: 401 Unauthorized
```

---

## 6. Test Results Template

### 6.1 Test Execution Report

```markdown
# Smoke Test Execution Report

**Environment**: Staging
**Date**: 2025-11-15
**Executed By**: [Your Name]
**Duration**: 45 minutes

## Summary

| Category | Total | Passed | Failed | Skipped |
|----------|-------|--------|--------|---------|
| Health & Connectivity | 5 | 5 | 0 | 0 |
| Authentication | 6 | 6 | 0 | 0 |
| Product Browsing | 5 | 5 | 0 | 0 |
| Shopping Cart | 5 | 5 | 0 | 0 |
| Checkout & Payment | 7 | 7 | 0 | 0 |
| Order Management | 4 | 4 | 0 | 0 |
| **TOTAL** | **32** | **32** | **0** | **0** |

## Pass/Fail Criteria

✅ **PASSED** - All critical tests passed (100%)

## Detailed Results

### Critical Tests (P0)
✅ All P0 tests passed

### Failed Tests
None

### Performance Metrics
- API Response Time (p95): 320ms ✅
- Page Load Time: 2.1s ✅
- Concurrent Users Supported: 150 ✅

### Security Scans
- NPM Vulnerabilities: 0 critical ✅
- SSL Grade: A+ ✅
- Security Headers: All present ✅

## Issues Found
None

## Recommendations
- Proceed to production deployment
- Continue monitoring staging for 24 hours

## Sign-Off
- Tested By: [Name]
- Approved By: [Tech Lead Name]
- Date: 2025-11-15
```

---

## Appendix: Quick Test Checklist

```
□ Backend health check passes
□ Frontend loads successfully
□ User can register
□ User can login
□ Products display correctly
□ Add to cart works
□ Checkout flow completes
□ Payment (test mode) succeeds
□ Order is created
□ User can view order history
□ All critical APIs respond < 500ms
□ No critical security vulnerabilities
□ SSL certificate valid
```

**If ALL boxes are checked ✅ → Proceed to production**

**If ANY box fails ❌ → Fix issues before production deployment**

---

**Document Version**: 1.0.0
**Last Updated**: 2025-11-15
**Maintained By**: QA Team
