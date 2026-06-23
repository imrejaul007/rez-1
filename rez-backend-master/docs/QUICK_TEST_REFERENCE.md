# Quick Test Reference - One Page Cheat Sheet

## 🚀 Run All Tests (3 Minutes)

```bash
# Make sure backend is running first!
node comprehensive-api-test.js
```

Expected: **25/25 tests passing** in under 15 seconds

---

## 🏥 Quick Health Check

```bash
curl http://localhost:5001/health
```

Should return: `{"status":"ok","database":{"status":"healthy"},...}`

---

## 🔐 Get Auth Token Fast

```bash
# Send OTP
curl -X POST http://localhost:5001/api/user/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"9999999999"}'

# Verify with dev OTP (always 123456)
curl -X POST http://localhost:5001/api/user/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"9999999999","otp":"123456"}'

# Copy the "token" from response
```

---

## 📊 Test Data APIs (30 Seconds)

```bash
# Products (should return 10+)
curl "http://localhost:5001/api/products?limit=5"

# Stores (should return 10+)
curl "http://localhost:5001/api/stores?limit=5"

# Offers (should return 15+)
curl "http://localhost:5001/api/offers?limit=5"

# Videos (should return 10+)
curl "http://localhost:5001/api/videos?limit=5"

# Projects (should return 5+)
curl "http://localhost:5001/api/projects?limit=5"
```

---

## 🔒 Test Protected Endpoints (1 Minute)

Replace `YOUR_TOKEN` with token from auth step above.

```bash
# Get cart
curl http://localhost:5001/api/cart \
  -H "Authorization: Bearer YOUR_TOKEN"

# Add to cart (replace PRODUCT_ID with actual ID from products API)
curl -X POST http://localhost:5001/api/cart/items \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"productId":"PRODUCT_ID","quantity":1}'

# Get wishlist
curl http://localhost:5001/api/wishlist \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## ⚠️ Troubleshooting

| Problem | Solution |
|---------|----------|
| Backend not responding | `npm run dev` in user-backend directory |
| "Route not found" | Check endpoint: auth is at `/api/user/auth/*` |
| Empty data arrays | Run `npm run seed` to seed database |
| 401 Unauthorized | Get fresh auth token (see above) |

---

## 📁 Test Files

- **Run automated tests:** `node comprehensive-api-test.js`
- **Quick smoke test:** `quick-test.bat` (Windows) or `bash quick-test.sh` (Linux/Mac)
- **Manual testing guide:** `COMPREHENSIVE_TEST_GUIDE.md`
- **Report template:** `TEST_RESULTS_REPORT_TEMPLATE.md`
- **Full documentation:** `TESTING_README.md`

---

## ✅ Pass Criteria

- ✓ 25/25 tests passing (or at least 24/25)
- ✓ All data APIs returning data (not empty)
- ✓ Response times < 500ms
- ✓ Auth working (tokens generated)
- ✓ Protected routes require auth (401 without token)

---

## 🎯 Key Endpoints

**Public:**
- `POST /api/user/auth/send-otp` - Send OTP
- `POST /api/user/auth/verify-otp` - Verify OTP
- `GET /api/products` - Products
- `GET /api/stores` - Stores
- `GET /api/offers` - Offers
- `GET /api/videos` - Videos
- `GET /api/projects` - Projects
- `GET /api/categories` - Categories
- `GET /api/homepage` - Homepage data

**Protected (need token):**
- `GET /api/user/auth/me` - Current user
- `GET /api/cart` - User cart
- `POST /api/cart/items` - Add to cart
- `GET /api/wishlist` - Wishlist
- `POST /api/wishlist/items` - Add to wishlist

---

## 📈 Expected Data Counts

- Products: 50+
- Stores: 50+
- Offers: 15+
- Videos: 10+
- Projects: 5+
- Categories: 5+

---

**Need help?** See `TESTING_README.md` or `COMPREHENSIVE_TEST_GUIDE.md`
