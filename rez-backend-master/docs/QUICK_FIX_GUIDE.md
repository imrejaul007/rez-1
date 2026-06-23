# Backend Quick Fix Guide

**🚨 URGENT FIXES NEEDED FOR FRONTEND INTEGRATION**

---

## Fix 1: Authentication OTP Issues (CRITICAL - 30 mins)

### Problem
- Frontend getting 400 errors on send-otp and verify-otp
- Phone number validation too strict
- Email required even for login
- OTP verification disabled in development

### Fix Steps

**Step 1: Update Phone Validation**
```bash
# File: src/middleware/validation.ts (Line 88)
```
Replace:
```typescript
phoneNumber: Joi.string().pattern(/^(\+91|91)?[6-9]\d{9}$/).message('Invalid phone number format')
```

With:
```typescript
phoneNumber: Joi.string()
  .trim()
  .pattern(/^(\+91)?[6-9]\d{9}$/)
  .message('Invalid phone number. Use format: +919876543210 or 9876543210')
  .custom((value, helpers) => {
    let normalized = value.replace(/\s+/g, '');
    normalized = normalized.replace(/^91/, '+91');
    if (!normalized.startsWith('+')) {
      normalized = '+91' + normalized;
    }
    return normalized;
  }, 'normalize phone number')
```

**Step 2: Fix Send OTP Controller**
```bash
# File: src/controllers/authController.ts (Lines 104-247)
```

Add phone normalization at start:
```typescript
// After line 105
const normalizedPhone = phoneNumber.startsWith('+91')
  ? phoneNumber
  : `+91${phoneNumber.replace(/^91/, '')}`;
```

Change user lookup to:
```typescript
let user = await User.findOne({ phoneNumber: normalizedPhone });
```

Add development OTP in response (after line 232):
```typescript
const responseData: any = {
  message: 'OTP sent successfully',
  expiresIn: 10 * 60,
  isNewUser: !user || user.isActive === false
};

if (process.env.NODE_ENV === 'development' || process.env.DEBUG_MODE === 'true') {
  responseData.devOtp = otp;
  responseData.devMessage = 'OTP included for testing. Remove in production.';
}

sendSuccess(res, responseData, 'OTP sent to your phone number');
```

**Step 3: Fix Verify OTP Controller**
```bash
# File: src/controllers/authController.ts (Lines 250-424)
```

Add phone normalization (after line 251):
```typescript
const normalizedPhone = phoneNumber.startsWith('+91')
  ? phoneNumber
  : `+91${phoneNumber.replace(/^91/, '')}`;
```

Enable OTP verification with dev bypass (replace lines 284-300):
```typescript
const isDevelopment = process.env.NODE_ENV === 'development' || process.env.DEBUG_MODE === 'true';
let isValidOTP = false;

if (isDevelopment) {
  // Accept correct OTP OR development OTP (123XXX)
  isValidOTP = user.verifyOTP(otp) || /^123\d{3}$/.test(otp);
  if (/^123\d{3}$/.test(otp)) {
    console.log(`🔧 [DEV MODE] Accepted development OTP: ${otp}`);
  }
} else {
  isValidOTP = user.verifyOTP(otp);
}

if (!isValidOTP) {
  console.log(`❌ [OTP DEBUG] OTP verification failed`);
  await user.incrementLoginAttempts();
  return sendUnauthorized(res, 'Invalid or expired OTP');
}
```

**Step 4: Test**
```bash
# Terminal 1
npm run dev

# Terminal 2
curl -X POST http://localhost:5001/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "9876543210", "email": "test@test.com"}'

# Should return: { "success": true, "data": { "devOtp": "123456", ... } }

curl -X POST http://localhost:5001/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "9876543210", "otp": "123456"}'

# Should return: { "success": true, "data": { "user": {...}, "tokens": {...} } }
```

---

## Fix 2: Database Seeding (CRITICAL - 1 hour)

### Problem
- APIs return empty data []
- Frontend has no products, stores, offers to display
- Missing videos for Play page
- Missing projects for Earn page

### Quick Seed Solution

**Step 1: Create Master Seed Script**
```bash
# File: scripts/seed-all-quick.js
```

```javascript
const mongoose = require('mongoose');
require('dotenv').config();

async function quickSeed() {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'test' });
  console.log('Connected to MongoDB');

  // Import models
  const Category = require('../dist/models/Category').Category;
  const Store = require('../dist/models/Store').Store;
  const Product = require('../dist/models/Product').Product;
  const Offer = require('../dist/models/Offer').Offer;
  const Video = require('../dist/models/Video').Video;
  const Project = require('../dist/models/Project').Project;

  // Clear existing data
  await Promise.all([
    Category.deleteMany({}),
    Store.deleteMany({}),
    Product.deleteMany({}),
    Offer.deleteMany({}),
    Video.deleteMany({}),
    Project.deleteMany({})
  ]);

  // Seed Categories
  const categories = await Category.insertMany([
    { name: 'Electronics', slug: 'electronics', isActive: true },
    { name: 'Fashion', slug: 'fashion', isActive: true },
    { name: 'Food', slug: 'food', isActive: true },
    { name: 'Groceries', slug: 'groceries', isActive: true },
    { name: 'Home & Living', slug: 'home-living', isActive: true }
  ]);

  // Seed Stores
  const stores = await Store.insertMany([
    {
      name: 'TechHub Store',
      slug: 'techhub-store',
      category: categories[0]._id,
      location: { type: 'Point', coordinates: [77.5946, 12.9716] },
      isActive: true,
      isFeatured: true,
      rating: { average: 4.5, count: 100 }
    },
    {
      name: 'Fashion Paradise',
      slug: 'fashion-paradise',
      category: categories[1]._id,
      location: { type: 'Point', coordinates: [77.5946, 12.9716] },
      isActive: true,
      isFeatured: true,
      rating: { average: 4.3, count: 85 }
    },
    // Add 8 more stores...
  ]);

  // Seed Products (20+)
  const products = [];
  for (let i = 0; i < 25; i++) {
    products.push({
      name: `Product ${i + 1}`,
      slug: `product-${i + 1}`,
      category: categories[i % 5]._id,
      store: stores[i % stores.length]._id,
      pricing: { selling: 999 + i * 100, mrp: 1499 + i * 100 },
      inventory: { isAvailable: true, stock: 50 },
      isActive: true,
      isFeatured: i < 10,
      ratings: { average: 4.0 + (i % 10) / 10, count: 50 + i * 5 },
      images: [`https://via.placeholder.com/300?text=Product${i + 1}`]
    });
  }
  await Product.insertMany(products);

  // Seed Offers (15+)
  const offers = [];
  for (let i = 0; i < 20; i++) {
    offers.push({
      title: `Offer ${i + 1}`,
      description: `Get ${10 + i * 2}% off`,
      offerType: 'percentage',
      value: 10 + i * 2,
      category: categories[i % 5]._id,
      store: stores[i % stores.length]._id,
      isActive: true,
      isFeatured: i < 8,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });
  }
  await Offer.insertMany(offers);

  // Seed Videos (10+)
  const videos = [];
  for (let i = 0; i < 15; i++) {
    videos.push({
      title: `Video ${i + 1}`,
      contentType: i % 2 === 0 ? 'merchant' : 'ugc',
      videoUrl: `https://res.cloudinary.com/demo/video/sample${i}.mp4`,
      thumbnailUrl: `https://via.placeholder.com/300?text=Video${i + 1}`,
      duration: 60 + i * 10,
      category: ['trending_me', 'trending_her', 'featured'][i % 3],
      store: stores[i % stores.length]._id,
      engagement: { views: 100 + i * 50, shares: 5 + i },
      isActive: true
    });
  }
  await Video.insertMany(videos);

  // Seed Projects (5+)
  const projects = await Project.insertMany([
    {
      title: 'Product Photography',
      description: 'Take photos of products',
      category: 'photography',
      type: 'photography',
      coinReward: 500,
      totalSlots: 50,
      filledSlots: 20,
      status: 'active',
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    },
    {
      title: 'Product Reviews',
      description: 'Write detailed reviews',
      category: 'content',
      type: 'review_writing',
      coinReward: 200,
      totalSlots: 100,
      filledSlots: 60,
      status: 'active',
      deadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
    },
    // Add 3 more projects...
  ]);

  console.log('\n✅ Seeding Complete!');
  console.log(`   Categories: ${categories.length}`);
  console.log(`   Stores: ${stores.length}`);
  console.log(`   Products: ${products.length}`);
  console.log(`   Offers: ${offers.length}`);
  console.log(`   Videos: ${videos.length}`);
  console.log(`   Projects: ${projects.length}`);

  await mongoose.disconnect();
  process.exit(0);
}

quickSeed().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
```

**Step 2: Run Seed**
```bash
node scripts/seed-all-quick.js
```

**Step 3: Verify**
```bash
# Check products
curl http://localhost:5001/api/products?limit=5

# Check stores
curl http://localhost:5001/api/stores?limit=5

# Check offers
curl http://localhost:5001/api/offers?limit=5

# Check videos
curl http://localhost:5001/api/videos?limit=5
```

---

## Fix 3: API Response Validation (MEDIUM - 30 mins)

### Problem
- Some API responses don't match frontend expectations
- Missing required fields

### Fix Steps

**Check common response issues:**

```bash
# File: src/utils/response.ts
```

Ensure all responses follow this format:
```typescript
{
  success: true/false,
  data: { ... } | null,
  message: "...",
  errors: [...] // Only for validation errors
}
```

**Test each endpoint:**
```bash
# Products
curl http://localhost:5001/api/products/featured

# Stores
curl http://localhost:5001/api/stores/featured

# Offers
curl http://localhost:5001/api/offers/featured

# Videos
curl http://localhost:5001/api/videos/trending
```

---

## Testing Checklist

### Auth Flow
- [ ] Send OTP for signup (with email)
- [ ] Send OTP for login (without email)
- [ ] Verify OTP with correct code
- [ ] Verify OTP with dev code (123456)
- [ ] Get 400 error for invalid phone
- [ ] Get 401 error for wrong OTP

### Data APIs
- [ ] Get products list (20+ items)
- [ ] Get featured products (10+ items)
- [ ] Get stores list (10+ items)
- [ ] Get featured stores (5+ items)
- [ ] Get offers list (15+ items)
- [ ] Get videos list (10+ items)
- [ ] Get projects list (5+ items)

### Response Format
- [ ] All responses have `success` field
- [ ] All responses have `data` or `errors`
- [ ] All responses have `message`
- [ ] Error responses return proper status codes

---

## Production Checklist

Before deploying to production:

### Code Changes
- [ ] Remove `devOtp` from send-otp response
- [ ] Remove development OTP bypass (123XXX)
- [ ] Enable strict OTP verification
- [ ] Remove all console.log statements
- [ ] Enable rate limiting

### Environment
- [ ] Set `NODE_ENV=production`
- [ ] Set `DEBUG_MODE=false`
- [ ] Configure production Twilio credentials
- [ ] Set production CORS origins
- [ ] Configure production database

### Testing
- [ ] Test full auth flow in production
- [ ] Verify OTP delivery via SMS
- [ ] Test all critical APIs
- [ ] Load test endpoints
- [ ] Security audit

---

## Common Errors & Solutions

### "Invalid phone number format"
**Cause:** Phone number not in accepted format
**Fix:** Use +919876543210 or 9876543210

### "User not found"
**Cause:** User doesn't exist, trying to login without signup
**Fix:** Signup first with email, or check phone number

### "Invalid OTP"
**Cause:** Wrong OTP or expired
**Fix:**
- Development: Use OTP from console or 123456
- Production: Get SMS OTP

### "Empty data []"
**Cause:** Database not seeded
**Fix:** Run `node scripts/seed-all-quick.js`

### "500 Internal Server Error"
**Cause:** Database connection or server error
**Fix:**
1. Check MongoDB connection
2. Check server logs
3. Verify environment variables

---

## Quick Commands

```bash
# Start backend
npm run dev

# Seed database
node scripts/seed-all-quick.js

# Test auth
curl -X POST http://localhost:5001/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"9876543210","email":"test@test.com"}'

# Test products API
curl http://localhost:5001/api/products?limit=10

# Check database
mongo "mongodb+srv://..." --eval "db.products.count()"

# Clear logs
> logs/app.log
```

---

## Support

**Backend Team Lead:** Check BACKEND_CRITICAL_ISSUES_ANALYSIS.md for detailed fixes
**Frontend Team:** Use devOtp from send-otp response for testing
**Questions:** Check console logs for detailed error messages

---

**PRIORITY:** Fix authentication first (30 mins), then seed database (1 hour)
**TIMELINE:** Both fixes should be done within 2 hours
**TESTING:** Test all endpoints after each fix
