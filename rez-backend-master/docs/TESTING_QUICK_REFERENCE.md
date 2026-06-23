# Testing Quick Reference Guide

## 🚀 Quick Start

```bash
# 1. Setup (first time only)
setup-tests.bat  # Windows
# or
./setup-tests.sh  # Linux/Mac

# 2. Run all tests
node run-all-tests.js

# 3. View results
# Open test-results-report.html in browser
```

## 📋 Individual Tests

| Command | Purpose | Output File |
|---------|---------|-------------|
| `node test-relationships.js` | Database relationships | `test-results-relationships.json` |
| `node test-data-quality.js` | Data consistency | `test-results-data-quality.json` |
| `node test-api-endpoints.js` | API endpoints | `test-results-api-endpoints.json` |
| `node run-all-tests.js` | Everything + HTML report | `test-results-report.html` |

## ✅ What Gets Tested

### Relationships (8 tests)
- ✓ Products → Stores
- ✓ Products → Categories
- ✓ Videos → Products
- ✓ Orders → Users
- ✓ Orders → Products
- ✓ Reviews → Products
- ✓ Reviews → Stores
- ✓ Wishlists/Carts → Users/Products

### Data Quality (6 collections)
- ✓ Products: prices, images, stock
- ✓ Stores: locations, contacts
- ✓ Categories: names, slugs
- ✓ Videos: URLs, thumbnails
- ✓ Reviews: ratings, content
- ✓ Users: emails, phones

### API Endpoints (40+ routes)
- ✓ Product CRUD operations
- ✓ Store search & filters
- ✓ Category hierarchy
- ✓ Video feeds
- ✓ Review systems
- ✓ Search & autocomplete
- ✓ Homepage data
- ✓ Offers & deals

## 🎯 Score Interpretation

| Score | Status | Action |
|-------|--------|--------|
| 95-100% | ✅ Excellent | Production ready |
| 80-94% | ⚠️ Good | Fix warnings |
| Below 80% | ❌ Critical | Fix immediately |

## 🔍 Common Issues

| Issue | Likely Cause | Fix |
|-------|--------------|-----|
| "Cannot connect to MongoDB" | MongoDB not running | `net start MongoDB` (Win) or `sudo systemctl start mongod` (Linux) |
| "API endpoint 404" | Server not running | `npm run dev` in backend |
| "Module not found: chalk" | Missing dependency | `npm install chalk` |
| "Broken links > 0" | Data seeding issue | Re-run seed scripts |
| "Invalid URLs" | Placeholder data | Update with real URLs |

## 📊 Result Files

### JSON Files (machine-readable)
- `test-results-relationships.json` - Raw relationship data
- `test-results-data-quality.json` - Quality metrics
- `test-results-api-endpoints.json` - API test results
- `test-results-master.json` - Combined summary

### HTML Report (human-readable)
- `test-results-report.html` - **Visual dashboard** ⭐

## 🎨 Console Output Colors

| Color | Meaning |
|-------|---------|
| 🟢 Green ✅ | Test passed |
| 🟡 Yellow ⚠️ | Warning (non-critical) |
| 🔴 Red ❌ | Failed (critical) |
| 🔵 Blue ℹ️ | Information |
| ⚪ Gray | Details/context |

## ⚡ Power User Tips

### Run specific test category
```bash
# Only relationship tests
node test-relationships.js

# Only products quality
node test-data-quality.js | grep -A 10 "PRODUCT"
```

### Save results with timestamp
```bash
node run-all-tests.js > test-results-$(date +%Y%m%d-%H%M%S).log
```

### Compare results over time
```bash
# Run before changes
node run-all-tests.js
cp test-results-master.json results-before.json

# Make changes...

# Run after changes
node run-all-tests.js
cp test-results-master.json results-after.json

# Compare
diff results-before.json results-after.json
```

### Quick health check
```bash
# Just show overall scores
node test-relationships.js | grep "OVERALL HEALTH"
node test-data-quality.js | grep "Quality Score"
node test-api-endpoints.js | grep "Success Rate"
```

## 🔧 Prerequisites Checklist

Before running tests:

- [ ] MongoDB is running (`mongosh` to verify)
- [ ] Backend server is running (`curl http://localhost:5000/api/products`)
- [ ] `.env` file configured (`MONGODB_URI` and `API_BASE_URL`)
- [ ] Dependencies installed (`npm install`)
- [ ] Database has data (`db.products.countDocuments()` > 0)

## 📈 Production Readiness Checklist

- [ ] Relationship Health ≥ 95%
- [ ] All broken links fixed (0 broken)
- [ ] Data Quality Score ≥ 90%
- [ ] No critical data issues (❌)
- [ ] API Success Rate = 100% (public endpoints)
- [ ] Average response time < 500ms
- [ ] Auth endpoints returning 401 (working correctly)
- [ ] No duplicate emails/slugs
- [ ] All required fields populated
- [ ] Valid URLs for images/videos

## 🆘 Emergency Quick Fixes

### Fix all broken product-store links
```javascript
// Run in MongoDB shell
db.products.updateMany(
  { store: { $exists: false } },
  { $set: { store: ObjectId("507f1f77bcf86cd799439011") } } // Default store
);
```

### Remove products without stores
```javascript
db.products.deleteMany({ store: { $exists: false } });
```

### Fix invalid prices
```javascript
db.products.updateMany(
  { $or: [{ price: { $lt: 0 } }, { price: null }] },
  { $set: { price: 0 } }
);
```

### Fix missing images
```javascript
db.products.updateMany(
  { images: { $size: 0 } },
  { $set: { images: ["https://via.placeholder.com/300"] } }
);
```

## 📞 When to Run Tests

- ✅ After seeding database
- ✅ After data migration
- ✅ Before deployment
- ✅ After major code changes
- ✅ Weekly in development
- ✅ Before each release

## 🎯 Test Coverage

| Category | Tests | Coverage |
|----------|-------|----------|
| Relationships | 8 | 100% of FK relationships |
| Data Quality | 6 collections | All core models |
| API Endpoints | 40+ routes | All public routes |
| Performance | Response times | All APIs |

## 💡 Interpreting HTML Report

The HTML report shows:

1. **Summary Cards** (top)
   - Total test suites
   - Pass/fail counts
   - Overall DB health

2. **Test Suite Results** (table)
   - Status badges
   - Duration metrics

3. **Relationship Details** (table)
   - Total records
   - Valid vs broken links
   - Health percentages

4. **Data Quality Issues** (table)
   - Collections tested
   - Issues found
   - Status indicators

5. **API Performance** (table)
   - Endpoint paths
   - HTTP methods
   - Response times

## 🔄 Automated Testing

### Add to package.json
```json
{
  "scripts": {
    "test:all": "node run-all-tests.js",
    "test:db": "node test-relationships.js",
    "test:quality": "node test-data-quality.js",
    "test:api": "node test-api-endpoints.js"
  }
}
```

### Then run with npm
```bash
npm run test:all
npm run test:db
npm run test:quality
npm run test:api
```

---

**💡 Pro Tip:** Bookmark `test-results-report.html` for quick access to latest results!

**⚡ Ultra Quick Check:**
```bash
node run-all-tests.js && start test-results-report.html
```
This runs all tests and automatically opens the HTML report when done.
