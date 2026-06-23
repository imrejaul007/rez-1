# Product Seeding & Testing Guide

## 📍 Database Connection
```
MONGODB_URI=mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
DB_NAME=test
```

## 🌱 Seed Product Fields

### What This Does:
- Checks all existing products in the database
- Adds missing fields to products:
  - **Cashback configuration** (percentage, maxAmount, terms)
  - **Delivery information** (estimatedDays, express availability)
  - **Today's analytics** (todayPurchases, todayViews)
  - **Bundle products** (for cross-selling)
  - **Frequently bought together** (purchase patterns)
- Creates sample products if database is empty

### Run the Seeder:
```bash
cd user-backend

# Using npm script (recommended)
npm run seed:product-fields

# Or directly with ts-node
npx ts-node scripts/seed-product-fields.ts
```

### What You'll See:
```
✅ Connected to MongoDB
📍 Database: test

═══════════════════════════════════════════════════
📊 CHECKING EXISTING PRODUCTS
═══════════════════════════════════════════════════

Total products in database: 150

Field Status:
  Cashback configured:     0/150 ⚠️
  Delivery info set:       0/150 ⚠️
  Today analytics:         0/150 ⚠️
  Bundle products:         0/150
  Frequently bought with:  0/150

═══════════════════════════════════════════════════
🌱 SEEDING NEW PRODUCT FIELDS
═══════════════════════════════════════════════════

  ✓ Added cashback (10%) to: Margherita Pizza
  ✓ Added delivery info (Under 30min) to: Margherita Pizza
  ✓ Added today's analytics (45 sales) to: Margherita Pizza
  ... (continues for all products)

✅ Successfully updated 150 products
```

## 🧪 Test Product Integration

### What This Tests:
- Featured products API with new fields
- Product detail retrieval with computed values
- View tracking functionality
- Analytics endpoint (people bought today, cashback)
- Frequently bought together API
- Bundle products API

### Run the Tests:
```bash
cd user-backend

# Using npm script (recommended)
npm run test:product-integration

# Or directly with ts-node
npx ts-node scripts/test-product-integration.ts
```

### Expected Output:
```
🚀 Starting Product Integration Tests...

✅ Connected to MongoDB

🔧 Updating Sample Products with New Fields...
✅ Updated product: Margherita Pizza
✅ Updated product: Summer Dress
...

🧪 Testing Product APIs...

📍 Test 1: Get Featured Products
📍 Test 2: Get Product Details with New Fields
📍 Test 3: Track Product View
📍 Test 4: Get Product Analytics
📍 Test 5: Get Frequently Bought Together
📍 Test 6: Get Bundle Products
📍 Test 7: Search Products with Enhanced Data

============================================================
📊 TEST RESULTS SUMMARY
============================================================

✅ Get Featured Products: PASSED
   Found 10 featured products

✅ Get Product with New Fields: PASSED
   Product has new fields
   Data: {
     "cashback": { "percentage": 10, "maxAmount": 30 },
     "deliveryInfo": { "estimatedDays": "Under 30min" },
     "todayPurchases": 45,
     "todayViews": 230
   }

✅ Track Product View: PASSED
   Views: 1251, Today: 46

✅ Get Product Analytics: PASSED
   Analytics retrieved successfully
   Data: {
     "peopleBoughtToday": 45,
     "cashback": { "percentage": 10, "amount": 30 },
     "delivery": { "estimated": "Under 30min" }
   }

... (more test results)

============================================================
TOTAL: 7 passed, 0 failed out of 7 tests
============================================================

🎉 All tests passed! Product integration is working correctly.
```

## 📝 Quick Check Commands

### Check if products have new fields:
```bash
# In MongoDB shell or Compass
db.products.findOne()

# Should show:
{
  "_id": ObjectId("..."),
  "name": "Margherita Pizza",
  "cashback": {
    "percentage": 10,
    "maxAmount": 30,
    "minPurchase": 200
  },
  "deliveryInfo": {
    "estimatedDays": "Under 30min",
    "freeShippingThreshold": 399,
    "expressAvailable": true
  },
  "analytics": {
    "todayPurchases": 45,
    "todayViews": 230,
    "lastResetDate": ISODate("2025-10-09")
  }
  // ... other fields
}
```

### Count products with new fields:
```javascript
// Products with cashback
db.products.countDocuments({ "cashback.percentage": { $exists: true } })

// Products with delivery info
db.products.countDocuments({ "deliveryInfo.estimatedDays": { $exists: true } })

// Products with today's analytics
db.products.countDocuments({ "analytics.todayPurchases": { $exists: true } })
```

## 🔄 Re-run Seeding

The seeder is **safe to run multiple times**:
- It only adds missing fields
- Doesn't overwrite existing data
- Checks before updating

## 🚨 Troubleshooting

### Connection Issues:
```
❌ MongoDB connection failed
```
**Solution**: Check your internet connection and MongoDB URI

### No Products Found:
```
No products found. Creating sample products...
```
**Solution**: The script will create sample products automatically

### Fields Already Exist:
```
✅ All products already have the new fields!
```
**Solution**: No action needed - your database is up to date

## 📊 Verify in Frontend

After seeding, check the frontend:
1. Navigate to Home Delivery page
2. Click on any product
3. You should see:
   - Real "people bought today" counter
   - Actual cashback percentage
   - Dynamic delivery time
   - View count increasing

## 🎉 Success Indicators

Your products are ready when:
- ✅ All products have cashback configuration
- ✅ Delivery times are set based on category
- ✅ Today's analytics are tracking
- ✅ API tests pass successfully
- ✅ Frontend displays real data