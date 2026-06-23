# Backend Testing & Verification Guide

**Purpose:** Step-by-step testing guide to verify all fixes are working

---

## Pre-Testing Setup

### 1. Start Backend Server

```bash
cd user-backend
npm run dev
```

**Expected Output:**
```
✅ Connected to MongoDB
✅ Twilio client initialized
🚀 Server running on http://localhost:5001
📡 API available at http://localhost:5001/api
```

### 2. Check Environment Variables

```bash
# Verify these are set in .env
NODE_ENV=development
DEBUG_MODE=true
MONGODB_URI=mongodb+srv://...
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
```

---

## Test Suite 1: Authentication Flow

### Test 1.1: Send OTP - Signup (New User)

**Request:**
```bash
curl -X POST http://localhost:5001/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "9876543210",
    "email": "newuser@test.com"
  }'
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "OTP sent successfully",
    "expiresIn": 600,
    "isNewUser": true,
    "devOtp": "123456",
    "devMessage": "OTP included for development testing. This will be removed in production."
  },
  "message": "OTP sent to your phone number"
}
```

**What to Check:**
- ✅ Status code is 200
- ✅ `success` is true
- ✅ `devOtp` is present (6 digits)
- ✅ `isNewUser` is true
- ✅ Backend console shows OTP logs

**Backend Console Should Show:**
```
🚀 [SEND_OTP] NEW OTP REQUEST RECEIVED
📱 Phone: 9876543210
📧 Email: newuser@test.com
🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉
   🔥 OTP GENERATED SUCCESSFULLY! 🔥
   📱 Phone: +919876543210
   🔑 OTP CODE: 123456
   👤 User Type: NEW USER (SIGNUP)
🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉
```

---

### Test 1.2: Send OTP - Login (Existing User)

**Request:**
```bash
curl -X POST http://localhost:5001/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "9876543210"
  }'
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "OTP sent successfully",
    "expiresIn": 600,
    "isNewUser": false,
    "devOtp": "654321"
  },
  "message": "OTP sent to your phone number"
}
```

**What to Check:**
- ✅ Status code is 200
- ✅ `isNewUser` is false (user exists from Test 1.1)
- ✅ Email not required for login
- ✅ Different OTP generated

---

### Test 1.3: Send OTP - Different Phone Formats

Test with various phone number formats:

```bash
# Format 1: Plain 10 digits
curl -X POST http://localhost:5001/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"9876543210","email":"test1@test.com"}'

# Format 2: With +91 prefix
curl -X POST http://localhost:5001/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"+919876543211","email":"test2@test.com"}'

# Format 3: With 91 prefix (no +)
curl -X POST http://localhost:5001/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"919876543212","email":"test3@test.com"}'

# Format 4: With spaces
curl -X POST http://localhost:5001/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"+91 9876543213","email":"test4@test.com"}'
```

**All should return 200 OK** with normalized phone number in logs.

---

### Test 1.4: Verify OTP - Correct OTP

**Request:**
```bash
curl -X POST http://localhost:5001/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "9876543210",
    "otp": "123456"
  }'
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "673d...",
      "phoneNumber": "+919876543210",
      "email": "newuser@test.com",
      "profile": {
        "firstName": null,
        "lastName": null,
        "avatar": null
      },
      "wallet": {
        "balance": 0,
        "totalEarned": 0
      },
      "role": "user",
      "isVerified": true,
      "isOnboarded": false
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": 604800
    }
  },
  "message": "Login successful"
}
```

**What to Check:**
- ✅ Status code is 200
- ✅ User object present with all fields
- ✅ `isVerified` is true
- ✅ Both tokens present
- ✅ `accessToken` is valid JWT
- ✅ Phone number normalized to +91 format

**Backend Console Should Show:**
```
🔍 [VERIFY] Starting OTP verification for 9876543210
✅ [VERIFY] User found for phone: +919876543210
✅ [OTP DEBUG] OTP verification successful
✅ [GAMIFICATION] Login tracking completed
```

---

### Test 1.5: Verify OTP - Development OTP (123XXX)

**Request:**
```bash
curl -X POST http://localhost:5001/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "9876543210",
    "otp": "123999"
  }'
```

**Expected Response (200 OK):**
Same as Test 1.4 - should accept any OTP starting with 123 in development.

**Backend Console Should Show:**
```
🔧 [DEV MODE] Accepted development OTP: 123999
✅ [OTP DEBUG] OTP verification successful
```

---

### Test 1.6: Verify OTP - Wrong OTP

**Request:**
```bash
curl -X POST http://localhost:5001/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "9876543210",
    "otp": "999999"
  }'
```

**Expected Response (401 Unauthorized):**
```json
{
  "success": false,
  "message": "Invalid or expired OTP"
}
```

**What to Check:**
- ✅ Status code is 401
- ✅ Error message is clear
- ✅ Login attempts incremented

---

### Test 1.7: Invalid Phone Number

**Request:**
```bash
curl -X POST http://localhost:5001/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "12345",
    "email": "test@test.com"
  }'
```

**Expected Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "phoneNumber",
      "message": "Invalid phone number. Use format: +919876543210 or 9876543210"
    }
  ]
}
```

---

## Test Suite 2: Database Seeding

### Test 2.1: Run Seed Script

```bash
cd user-backend
node scripts/seed-all-quick.js
```

**Expected Output:**
```
Connected to MongoDB
✅ Seeding Complete!
   Categories: 5
   Stores: 10
   Products: 25
   Offers: 20
   Videos: 15
   Projects: 5
Disconnected from MongoDB
```

**What to Check:**
- ✅ No errors during seeding
- ✅ All counts match expected values
- ✅ Script exits cleanly

---

### Test 2.2: Verify Products API

**Request:**
```bash
curl http://localhost:5001/api/products?limit=5
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "673d...",
      "name": "Product 1",
      "slug": "product-1",
      "pricing": {
        "selling": 999,
        "mrp": 1499,
        "discount": 33
      },
      "inventory": {
        "isAvailable": true,
        "stock": 50
      },
      "ratings": {
        "average": 4.0,
        "count": 50
      },
      "isFeatured": true,
      "isActive": true,
      "images": ["https://via.placeholder.com/300?text=Product1"],
      "category": {
        "_id": "...",
        "name": "Electronics",
        "slug": "electronics"
      },
      "store": {
        "_id": "...",
        "name": "TechHub Store",
        "logo": "..."
      }
    }
    // ... 4 more products
  ],
  "pagination": {
    "total": 25,
    "page": 1,
    "limit": 5,
    "pages": 5
  },
  "message": "Products retrieved successfully"
}
```

**What to Check:**
- ✅ Returns array of products (not empty)
- ✅ Each product has all required fields
- ✅ Category and store are populated
- ✅ Images array is not empty
- ✅ Pagination shows total = 25

---

### Test 2.3: Verify Featured Products

**Request:**
```bash
curl http://localhost:5001/api/products/featured?limit=10
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "name": "Product 1",
      "isFeatured": true,
      ...
    }
    // ... 9 more featured products
  ],
  "message": "Featured products retrieved successfully"
}
```

**What to Check:**
- ✅ Returns 10 products
- ✅ All have `isFeatured: true`
- ✅ No pagination (single page)

---

### Test 2.4: Verify Stores API

**Request:**
```bash
curl http://localhost:5001/api/stores?limit=5
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "name": "TechHub Store",
      "slug": "techhub-store",
      "category": {
        "_id": "...",
        "name": "Electronics"
      },
      "location": {
        "type": "Point",
        "coordinates": [77.5946, 12.9716]
      },
      "rating": {
        "average": 4.5,
        "count": 100
      },
      "isActive": true,
      "isFeatured": true
    }
    // ... 4 more stores
  ],
  "pagination": {
    "total": 10,
    "page": 1,
    "limit": 5,
    "pages": 2
  }
}
```

**What to Check:**
- ✅ Returns array of stores (not empty)
- ✅ Each store has category populated
- ✅ Location coordinates present
- ✅ Rating data present
- ✅ Total = 10

---

### Test 2.5: Verify Offers API

**Request:**
```bash
curl http://localhost:5001/api/offers?limit=5
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "title": "Offer 1",
      "description": "Get 10% off",
      "offerType": "percentage",
      "value": 10,
      "category": {
        "_id": "...",
        "name": "Electronics"
      },
      "store": {
        "_id": "...",
        "name": "TechHub Store"
      },
      "isActive": true,
      "isFeatured": true,
      "startDate": "2025-11-15T...",
      "endDate": "2025-12-15T..."
    }
    // ... 4 more offers
  ],
  "pagination": {
    "total": 20,
    "page": 1,
    "limit": 5,
    "pages": 4
  }
}
```

**What to Check:**
- ✅ Returns array of offers (not empty)
- ✅ Category and store populated
- ✅ Start and end dates valid
- ✅ Total = 20

---

### Test 2.6: Verify Videos API

**Request:**
```bash
curl http://localhost:5001/api/videos?limit=5
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "title": "Video 1",
      "contentType": "merchant",
      "videoUrl": "https://res.cloudinary.com/demo/video/sample0.mp4",
      "thumbnailUrl": "https://via.placeholder.com/300?text=Video1",
      "duration": 60,
      "category": "trending_me",
      "store": {
        "_id": "...",
        "name": "TechHub Store"
      },
      "engagement": {
        "views": 100,
        "shares": 5,
        "likes": [],
        "comments": 0
      },
      "isActive": true
    }
    // ... 4 more videos
  ],
  "pagination": {
    "total": 15,
    "page": 1,
    "limit": 5,
    "pages": 3
  }
}
```

**What to Check:**
- ✅ Returns array of videos (not empty)
- ✅ Video and thumbnail URLs present
- ✅ Store populated
- ✅ Engagement data present
- ✅ Total = 15

---

### Test 2.7: Verify Projects API (Earn Page)

**Request:**
```bash
curl http://localhost:5001/api/projects?limit=5
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "title": "Product Photography",
      "description": "Take photos of products",
      "category": "photography",
      "type": "photography",
      "coinReward": 500,
      "totalSlots": 50,
      "filledSlots": 20,
      "status": "active",
      "deadline": "2025-12-15T...",
      "difficulty": "easy",
      "estimatedTime": "2 hours"
    }
    // ... 4 more projects
  ],
  "pagination": {
    "total": 5,
    "page": 1,
    "limit": 5,
    "pages": 1
  }
}
```

**What to Check:**
- ✅ Returns array of projects (not empty)
- ✅ All required fields present
- ✅ Status is "active"
- ✅ Total = 5

---

## Test Suite 3: Integration Testing

### Test 3.1: Complete User Journey

```bash
# 1. Signup
SIGNUP_RESPONSE=$(curl -s -X POST http://localhost:5001/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"9999999999","email":"journey@test.com"}')

echo "Signup Response: $SIGNUP_RESPONSE"

# Extract devOtp (on Unix/Linux/Mac)
OTP=$(echo $SIGNUP_RESPONSE | jq -r '.data.devOtp')

# 2. Verify OTP
VERIFY_RESPONSE=$(curl -s -X POST http://localhost:5001/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d "{\"phoneNumber\":\"9999999999\",\"otp\":\"$OTP\"}")

echo "Verify Response: $VERIFY_RESPONSE"

# Extract access token
TOKEN=$(echo $VERIFY_RESPONSE | jq -r '.data.tokens.accessToken')

# 3. Get user profile (authenticated)
curl -X GET http://localhost:5001/api/auth/me \
  -H "Authorization: Bearer $TOKEN"

# 4. Browse products (no auth required)
curl http://localhost:5001/api/products?limit=10

# 5. View product details
PRODUCT_ID=$(curl -s http://localhost:5001/api/products?limit=1 | jq -r '.data[0]._id')
curl http://localhost:5001/api/products/$PRODUCT_ID
```

**All requests should return 200 OK with appropriate data.**

---

## Test Suite 4: Error Handling

### Test 4.1: Missing Required Fields

```bash
# Missing phoneNumber
curl -X POST http://localhost:5001/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com"}'

# Expected: 400 with validation error

# Missing email for new user
curl -X POST http://localhost:5001/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"8888888888"}'

# Expected: 400 "User not found. Please sign up first with your email."
```

### Test 4.2: Invalid Data Types

```bash
# Invalid phone format
curl -X POST http://localhost:5001/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"abc","email":"test@test.com"}'

# Expected: 400 with validation error

# Invalid email format
curl -X POST http://localhost:5001/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"9876543210","email":"notanemail"}'

# Expected: 400 with validation error
```

### Test 4.3: Non-Existent Resources

```bash
# Non-existent product
curl http://localhost:5001/api/products/673d0000000000000000000

# Expected: 404 "Product not found"

# Non-existent store
curl http://localhost:5001/api/stores/673d0000000000000000000

# Expected: 404 "Store not found"
```

---

## Verification Checklist

### Authentication ✅
- [ ] Send OTP works with +91XXXXXXXXXX format
- [ ] Send OTP works with XXXXXXXXXX format
- [ ] Send OTP works with 91XXXXXXXXXX format
- [ ] Send OTP returns devOtp in development
- [ ] Send OTP distinguishes signup vs login
- [ ] Verify OTP accepts correct OTP
- [ ] Verify OTP accepts dev OTP (123XXX)
- [ ] Verify OTP rejects wrong OTP
- [ ] Verify OTP returns user and tokens
- [ ] Phone numbers normalized to +91 format

### Database ✅
- [ ] Seed script runs without errors
- [ ] Categories seeded (5+)
- [ ] Stores seeded (10+)
- [ ] Products seeded (20+)
- [ ] Offers seeded (15+)
- [ ] Videos seeded (10+)
- [ ] Projects seeded (5+)

### API Responses ✅
- [ ] Products API returns data
- [ ] Stores API returns data
- [ ] Offers API returns data
- [ ] Videos API returns data
- [ ] Projects API returns data
- [ ] All responses have success field
- [ ] All responses have proper pagination
- [ ] All nested objects are populated

### Error Handling ✅
- [ ] Invalid phone returns 400
- [ ] Wrong OTP returns 401
- [ ] Missing fields return 400
- [ ] Non-existent resources return 404
- [ ] Error messages are clear

---

## Performance Benchmarks

Run this after all fixes:

```bash
# Time each endpoint
time curl http://localhost:5001/api/products?limit=20
time curl http://localhost:5001/api/stores?limit=20
time curl http://localhost:5001/api/offers?limit=20
time curl http://localhost:5001/api/videos?limit=20
```

**Expected:**
- Products API: < 500ms
- Stores API: < 500ms
- Offers API: < 500ms
- Videos API: < 500ms

---

## Troubleshooting

### Backend Won't Start
```bash
# Check MongoDB connection
mongo "YOUR_MONGODB_URI"

# Check port availability
netstat -ano | findstr :5001  # Windows
lsof -i :5001  # Unix/Mac

# Check environment variables
echo $MONGODB_URI
echo $NODE_ENV
```

### Seed Script Fails
```bash
# Check MongoDB connection
node -e "
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI, {dbName: 'test'})
  .then(() => console.log('✅ Connected'))
  .catch(err => console.error('❌ Error:', err));
"

# Clear database and retry
mongo "YOUR_MONGODB_URI" --eval "db.dropDatabase()"
node scripts/seed-all-quick.js
```

### API Returns Empty Data
```bash
# Check database contents
mongo "YOUR_MONGODB_URI" --eval "
  db = db.getSiblingDB('test');
  print('Products:', db.products.count());
  print('Stores:', db.stores.count());
"

# If empty, re-run seed
node scripts/seed-all-quick.js
```

---

## Success Criteria

All tests pass when:

1. ✅ All authentication endpoints return 200 for valid requests
2. ✅ All data APIs return non-empty arrays
3. ✅ All error cases return appropriate status codes
4. ✅ Database has minimum required data
5. ✅ Response format is consistent across all endpoints
6. ✅ No console errors during normal operations
7. ✅ All phone number formats are accepted
8. ✅ Development OTP bypass works

---

**When all tests pass, backend is ready for frontend integration! ✅**
