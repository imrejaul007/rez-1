# Comprehensive Backend API Testing Guide

This guide provides step-by-step instructions to test all critical backend functionality after fixes have been applied.

## Prerequisites

1. **Backend server must be running** on `http://localhost:5001`
2. **Database must be seeded** with sample data
3. Have `curl` installed (or use the Node.js test script)

## Quick Start

### Option 1: Automated Testing (Recommended)

```bash
# Install dependencies if needed
npm install axios chalk

# Run comprehensive test suite
node comprehensive-api-test.js
```

This will:
- Test all authentication flows
- Test all data APIs
- Test protected endpoints
- Test error handling
- Generate a detailed JSON report

### Option 2: Manual Testing with cURL

Follow the tests below section by section.

---

## TASK 1: Authentication Flow Testing

### Test 1.1: Send OTP - New User with Email

**Request:**
```bash
curl -X POST http://localhost:5001/api/user/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"9876543210","email":"test@example.com"}'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "devOtp": "123456",
  "expiresIn": 600000
}
```

**Success Criteria:**
- ✓ Status code: 200
- ✓ `success: true`
- ✓ `devOtp` is present (development mode)
- ✓ Response time < 1 second

---

### Test 1.2: Send OTP - Existing User (without email)

**Request:**
```bash
curl -X POST http://localhost:5001/api/user/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"9876543210"}'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "devOtp": "123456"
}
```

**Success Criteria:**
- ✓ Status code: 200
- ✓ `success: true`
- ✓ Works without email parameter

---

### Test 1.3: Send OTP - Different Phone Formats

Test with various phone number formats:

**Format 1: With country code (+91)**
```bash
curl -X POST http://localhost:5001/api/user/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"+919876543210"}'
```

**Format 2: With country code (no +)**
```bash
curl -X POST http://localhost:5001/api/user/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"919876543210"}'
```

**Format 3: 10 digits only**
```bash
curl -X POST http://localhost:5001/api/user/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"9876543210"}'
```

**Success Criteria:**
- ✓ All formats should work
- ✓ Phone numbers are normalized correctly

---

### Test 1.4: Verify OTP - Correct OTP

**Step 1: Send OTP**
```bash
curl -X POST http://localhost:5001/api/user/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"9876543211","email":"verify@example.com"}'
```

**Step 2: Copy the `devOtp` from response and verify**
```bash
curl -X POST http://localhost:5001/api/user/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"9876543211","otp":"<PASTE_DEV_OTP_HERE>"}'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "OTP verified successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "phoneNumber": "9876543211",
    "email": "verify@example.com",
    ...
  },
  "isNewUser": true
}
```

**Success Criteria:**
- ✓ Status code: 200
- ✓ `success: true`
- ✓ `token` is present
- ✓ `refreshToken` is present
- ✓ `user` object is present
- ✓ `isNewUser` indicates if this is a new registration

**Important:** Save the `token` for protected endpoint tests!

---

### Test 1.5: Verify OTP - Development OTP (123456)

**Request:**
```bash
curl -X POST http://localhost:5001/api/user/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"9876543211","otp":"123456"}'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "OTP verified successfully",
  "token": "...",
  ...
}
```

**Success Criteria:**
- ✓ Development OTP `123456` always works in development mode
- ✓ Returns valid token

---

### Test 1.6: Get Current User

**Request:**
```bash
curl http://localhost:5001/api/user/auth/me \
  -H "Authorization: Bearer <YOUR_TOKEN_HERE>"
```

**Expected Response:**
```json
{
  "success": true,
  "user": {
    "_id": "...",
    "phoneNumber": "9876543211",
    "email": "verify@example.com",
    "profile": { ... },
    ...
  }
}
```

**Success Criteria:**
- ✓ Returns user data when authenticated
- ✓ Returns 401 without token

---

## TASK 2: Data APIs Testing

### Test 2.1: Products API

**Request:**
```bash
curl "http://localhost:5001/api/products?page=1&limit=10"
```

**Expected Response:**
```json
{
  "success": true,
  "products": [ ... ],
  "pagination": {
    "total": 50,
    "page": 1,
    "pages": 5,
    "limit": 10
  }
}
```

**Success Criteria:**
- ✓ Status code: 200
- ✓ Returns at least 10 products
- ✓ Pagination info is present
- ✓ Each product has required fields (name, price, images, etc.)

---

### Test 2.2: Featured Products

**Request:**
```bash
curl http://localhost:5001/api/products/featured
```

**Expected Response:**
```json
{
  "success": true,
  "products": [ ... ]
}
```

**Success Criteria:**
- ✓ Returns at least 5 featured products
- ✓ Products have `featured: true` flag

---

### Test 2.3: Stores API

**Request:**
```bash
curl "http://localhost:5001/api/stores?page=1&limit=10"
```

**Expected Response:**
```json
{
  "success": true,
  "stores": [ ... ],
  "pagination": { ... }
}
```

**Success Criteria:**
- ✓ Returns at least 10 stores
- ✓ Each store has required fields (name, address, logo, etc.)

---

### Test 2.4: Offers API

**Request:**
```bash
curl http://localhost:5001/api/offers
```

**Expected Response:**
```json
{
  "success": true,
  "offers": [ ... ]
}
```

**Success Criteria:**
- ✓ Returns at least 15 offers
- ✓ Offers have valid dates and discount information

---

### Test 2.5: Videos API

**Request:**
```bash
curl http://localhost:5001/api/videos
```

**Expected Response:**
```json
{
  "success": true,
  "videos": [ ... ]
}
```

**Success Criteria:**
- ✓ Returns at least 10 videos
- ✓ Videos have URLs, thumbnails, and metadata

---

### Test 2.6: Projects API

**Request:**
```bash
curl http://localhost:5001/api/projects
```

**Expected Response:**
```json
{
  "success": true,
  "projects": [ ... ]
}
```

**Success Criteria:**
- ✓ Returns at least 5 projects
- ✓ Projects have earnings, status, and details

---

### Test 2.7: Categories API

**Request:**
```bash
curl http://localhost:5001/api/categories
```

**Expected Response:**
```json
{
  "success": true,
  "categories": [ ... ]
}
```

**Success Criteria:**
- ✓ Returns categories list
- ✓ Categories have icons and names

---

### Test 2.8: Homepage API

**Request:**
```bash
curl http://localhost:5001/api/homepage
```

**Expected Response:**
```json
{
  "success": true,
  "sections": [
    { "type": "featured_products", "data": [...] },
    { "type": "categories", "data": [...] },
    ...
  ]
}
```

**Success Criteria:**
- ✓ Returns multiple sections
- ✓ Each section has type and data

---

## TASK 3: Protected Endpoints Testing

**Note:** You need a valid auth token from Test 1.4 or 1.5

### Test 3.1: Get Cart

**Request:**
```bash
curl http://localhost:5001/api/cart \
  -H "Authorization: Bearer <YOUR_TOKEN>"
```

**Expected Response:**
```json
{
  "success": true,
  "cart": {
    "items": [],
    "subtotal": 0,
    "total": 0
  }
}
```

**Success Criteria:**
- ✓ Returns cart (even if empty)
- ✓ Returns 401 without token

---

### Test 3.2: Add to Cart

**Request:**
```bash
curl -X POST http://localhost:5001/api/cart/items \
  -H "Authorization: Bearer <YOUR_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "<PRODUCT_ID_FROM_TEST_2.1>",
    "quantity": 1
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Item added to cart",
  "cart": {
    "items": [
      {
        "product": { ... },
        "quantity": 1,
        "price": 999
      }
    ],
    "subtotal": 999,
    "total": 999
  }
}
```

**Success Criteria:**
- ✓ Item is added to cart
- ✓ Cart totals are calculated correctly
- ✓ Returns updated cart

---

### Test 3.3: Get Wishlist

**Request:**
```bash
curl http://localhost:5001/api/wishlist \
  -H "Authorization: Bearer <YOUR_TOKEN>"
```

**Expected Response:**
```json
{
  "success": true,
  "wishlist": {
    "items": []
  }
}
```

**Success Criteria:**
- ✓ Returns wishlist (even if empty)
- ✓ Returns 401 without token

---

### Test 3.4: Add to Wishlist

**Request:**
```bash
curl -X POST http://localhost:5001/api/wishlist/items \
  -H "Authorization: Bearer <YOUR_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "<PRODUCT_ID_FROM_TEST_2.1>"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Item added to wishlist",
  "wishlist": {
    "items": [
      {
        "product": { ... },
        "addedAt": "2025-11-15T..."
      }
    ]
  }
}
```

**Success Criteria:**
- ✓ Item is added to wishlist
- ✓ Returns updated wishlist

---

## TASK 4: Error Handling Testing

### Test 4.1: Invalid OTP

**Request:**
```bash
curl -X POST http://localhost:5001/api/user/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"9876543210","otp":"000000"}'
```

**Expected Response:**
```json
{
  "success": false,
  "message": "Invalid or expired OTP"
}
```

**Success Criteria:**
- ✓ Status code: 400 or 401
- ✓ Properly rejects invalid OTP
- ✓ Returns error message

---

### Test 4.2: Missing Phone Number

**Request:**
```bash
curl -X POST http://localhost:5001/api/user/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

**Expected Response:**
```json
{
  "success": false,
  "message": "Phone number is required"
}
```

**Success Criteria:**
- ✓ Status code: 400
- ✓ Validation catches missing required field

---

### Test 4.3: Unauthorized Access

**Request:**
```bash
curl http://localhost:5001/api/cart
```

**Expected Response:**
```json
{
  "success": false,
  "message": "Authentication required"
}
```

**Success Criteria:**
- ✓ Status code: 401
- ✓ Protected routes require authentication

---

## Performance Metrics

Record response times for each test:

| Test | Endpoint | Expected Time | Actual Time |
|------|----------|---------------|-------------|
| Send OTP | POST /api/user/auth/send-otp | < 500ms | ___ ms |
| Verify OTP | POST /api/user/auth/verify-otp | < 500ms | ___ ms |
| Products | GET /api/products | < 200ms | ___ ms |
| Featured Products | GET /api/products/featured | < 200ms | ___ ms |
| Stores | GET /api/stores | < 200ms | ___ ms |
| Offers | GET /api/offers | < 200ms | ___ ms |
| Videos | GET /api/videos | < 200ms | ___ ms |
| Projects | GET /api/projects | < 200ms | ___ ms |
| Categories | GET /api/categories | < 100ms | ___ ms |
| Homepage | GET /api/homepage | < 300ms | ___ ms |
| Get Cart | GET /api/cart | < 200ms | ___ ms |
| Add to Cart | POST /api/cart/items | < 300ms | ___ ms |
| Get Wishlist | GET /api/wishlist | < 200ms | ___ ms |
| Add to Wishlist | POST /api/wishlist/items | < 300ms | ___ ms |

---

## Test Results Summary Template

### Overall Results

- **Total Tests:** ___
- **Passed:** ___
- **Failed:** ___
- **Pass Rate:** ___%

### Failed Tests (if any)

1. **Test Name:** ___
   - **Error:** ___
   - **Expected:** ___
   - **Actual:** ___

### Issues Found

1. ___
2. ___

### Recommendations

1. ___
2. ___

---

## Troubleshooting

### Backend Not Responding

```bash
# Check if backend is running
curl http://localhost:5001/health

# If not, start backend
npm run dev
```

### Database Not Seeded

```bash
# Run seeding script
npm run seed
```

### Token Expired

- Re-run authentication tests (1.4 or 1.5) to get a fresh token

### CORS Errors

- Make sure you're testing from the same domain or CORS is configured

---

## Next Steps After Testing

1. **Document all failures** in test results report
2. **Fix any critical issues** found during testing
3. **Re-run tests** to verify fixes
4. **Update API documentation** with actual response samples
5. **Create frontend integration guide** based on working endpoints

---

## Quick Reference: Common Commands

```bash
# Run automated tests
node comprehensive-api-test.js

# Check backend health
curl http://localhost:5001/health

# Get auth token quickly
curl -X POST http://localhost:5001/api/user/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"9999999999"}' && \
curl -X POST http://localhost:5001/api/user/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"9999999999","otp":"123456"}'

# Test all data APIs at once
curl http://localhost:5001/api/products?limit=1 && \
curl http://localhost:5001/api/stores?limit=1 && \
curl http://localhost:5001/api/offers?limit=1 && \
curl http://localhost:5001/api/videos?limit=1 && \
curl http://localhost:5001/api/projects?limit=1
```
