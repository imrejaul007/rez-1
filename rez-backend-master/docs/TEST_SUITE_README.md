# Comprehensive Test Suite Documentation

This test suite provides comprehensive testing for your application's database integrity, data quality, and API endpoints.

## 📋 Table of Contents

- [Overview](#overview)
- [Test Files](#test-files)
- [Setup](#setup)
- [Running Tests](#running-tests)
- [Understanding Results](#understanding-results)
- [Troubleshooting](#troubleshooting)

## 🎯 Overview

The test suite includes three main test categories:

1. **Relationship Integrity Tests** - Validates all database relationships (Products → Stores, Orders → Users, etc.)
2. **Data Quality Tests** - Checks data consistency and format validity
3. **API Endpoint Tests** - Verifies all API endpoints return correct responses

## 📁 Test Files

### Core Test Scripts

- **`test-relationships.js`** - Tests database relationship integrity
  - Validates foreign key references
  - Checks for orphaned records
  - Verifies populate operations work correctly

- **`test-data-quality.js`** - Tests data format consistency
  - Validates URLs, emails, phone numbers
  - Checks price and rating ranges
  - Identifies missing required fields

- **`test-api-endpoints.js`** - Tests API endpoints
  - Verifies HTTP status codes
  - Checks response structure
  - Measures response times

- **`run-all-tests.js`** - Master test runner
  - Runs all tests sequentially
  - Generates comprehensive reports
  - Creates HTML visualization

### Setup Scripts

- **`setup-tests.bat`** (Windows) - Installs dependencies
- **`setup-tests.sh`** (Linux/Mac) - Installs dependencies

## 🔧 Setup

### Prerequisites

1. **MongoDB** must be running
2. **Backend server** must be running (for API tests)
3. **Environment variables** configured in `.env`

### Installation

**Windows:**
```bash
setup-tests.bat
```

**Linux/Mac:**
```bash
chmod +x setup-tests.sh
./setup-tests.sh
```

**Manual:**
```bash
npm install --save-dev chalk
```

### Environment Configuration

Ensure your `.env` file has:

```env
MONGODB_URI=mongodb://localhost:27017/your-database
API_BASE_URL=http://localhost:5000/api
```

## 🚀 Running Tests

### Run All Tests (Recommended)

This runs all test suites and generates a comprehensive HTML report:

```bash
node run-all-tests.js
```

**Output:**
- Console summary
- `test-results-master.json` - Master results file
- `test-results-report.html` - Visual HTML report
- Individual JSON result files

### Run Individual Tests

**Test Relationship Integrity Only:**
```bash
node test-relationships.js
```
Output: `test-results-relationships.json`

**Test Data Quality Only:**
```bash
node test-data-quality.js
```
Output: `test-results-data-quality.json`

**Test API Endpoints Only:**
```bash
node test-api-endpoints.js
```
Output: `test-results-api-endpoints.json`

## 📊 Understanding Results

### Console Output

Tests provide real-time colored output:
- ✅ **Green** - Test passed
- ⚠️ **Yellow** - Warning (non-critical issue)
- ❌ **Red** - Test failed (critical issue)

### Relationship Integrity Results

```
✅ Products → Stores
   Total Products: 389
   With Store Ref: 389 (100%)
   Valid Links: 389 (100%)
   Broken Links: 0
```

**Interpretation:**
- **Total**: Number of records checked
- **With Reference**: Records that have the foreign key
- **Valid Links**: References that successfully populate
- **Broken Links**: Invalid/missing references (⚠️ requires fixing)

### Data Quality Results

```
❌ Invalid Prices: 15 (3.86%)
⚠️  Missing Images: 42 (10.80%)
```

**Interpretation:**
- **Percentage** indicates scope of the issue
- **Red (❌)** indicates critical data issues
- **Yellow (⚠️)** indicates quality improvements needed

### API Endpoint Results

```
✅ PASSED (245ms) - Status: 200
   GET /products
```

**Interpretation:**
- **Response time** in milliseconds
- **Status code** (200 = success, 401 = auth required, etc.)
- **PASSED/FAILED** based on expected status

### Overall Health Score

```
OVERALL RELATIONSHIP HEALTH: 98.5% ✅
```

**Scoring:**
- **95-100%** - Excellent ✅
- **80-94%** - Good ⚠️
- **Below 80%** - Critical ❌

## 📈 HTML Report

Open `test-results-report.html` in your browser for:
- Visual dashboard with statistics
- Color-coded test results
- Detailed tables for each test category
- Response time charts
- Overall health indicators

## 🔍 What Each Test Checks

### 1. Relationship Integrity Tests

#### Products → Stores
- All products have a valid store reference
- Store can be populated successfully
- No orphaned products

#### Products → Categories
- All products link to valid categories
- Category data loads correctly
- Proper categorization

#### Videos → Products
- Shoppable videos link to real products
- Product references are valid
- Shopping functionality works

#### Orders → Users
- Every order belongs to a user
- User data accessible from order
- Proper ownership tracking

#### Orders → Products
- Order items reference real products
- Product details available
- Inventory tracking works

#### Reviews → Products/Stores
- Reviews link to valid entities
- Can fetch product/store reviews
- Rating system works

#### Wishlists → Users/Products
- Wishlists belong to users
- Wishlist items reference products
- User collections work

#### Carts → Users/Products
- Carts belong to users
- Cart items reference products
- Shopping cart functions properly

### 2. Data Quality Tests

#### Product Quality
- ✓ Names are not empty
- ✓ Prices are valid numbers ≥ 0
- ✓ Discounts don't exceed original price
- ✓ Images are valid URLs
- ✓ Descriptions exist
- ✓ Stock is valid number ≥ 0

#### Store Quality
- ✓ Names exist
- ✓ Locations are complete
- ✓ Emails are valid format
- ✓ Phone numbers are valid
- ✓ Logo URLs are valid
- ✓ Ratings are 0-5 range

#### Category Quality
- ✓ Names exist
- ✓ Slugs exist and are unique
- ✓ Icon URLs are valid

#### Video Quality
- ✓ Titles exist
- ✓ Video URLs are valid
- ✓ Thumbnails are valid URLs
- ✓ Duration is positive number
- ✓ View counts are valid

#### Review Quality
- ✓ Ratings are 0-5 range
- ✓ Content exists
- ✓ Linked to product or store

#### User Quality
- ✓ Names exist
- ✓ Emails are valid and unique
- ✓ Phone numbers are valid format

### 3. API Endpoint Tests

#### Product Endpoints
- `GET /products` - Fetch all products
- `GET /products/:id` - Fetch single product
- `GET /products/search` - Search products
- `GET /products/store/:storeId` - Products by store
- `GET /products/category/:categoryId` - Products by category

#### Store Endpoints
- `GET /stores` - Fetch all stores
- `GET /stores/:id` - Fetch single store
- `GET /stores/search` - Search stores
- `GET /stores/nearby` - Find nearby stores

#### Category Endpoints
- `GET /categories` - Fetch all categories
- `GET /categories/:id` - Fetch single category
- `GET /categories/hierarchy` - Category tree

#### Video Endpoints
- `GET /videos` - Fetch all videos
- `GET /videos/:id` - Fetch single video
- `GET /videos/shoppable` - Shoppable videos only
- `GET /videos/feed` - Video feed with pagination

#### Review Endpoints
- `GET /reviews/product/:id` - Product reviews
- `GET /reviews/store/:id` - Store reviews
- `GET /reviews/stats/product/:id` - Review statistics

#### Search Endpoints
- `GET /search` - Global search
- `GET /search/advanced` - Advanced search with filters
- `GET /search/autocomplete` - Search suggestions

#### Homepage Endpoints
- `GET /homepage` - Homepage data
- `GET /homepage/featured` - Featured products
- `GET /homepage/trending` - Trending products
- `GET /homepage/recommended-stores` - Store recommendations

#### Offer Endpoints
- `GET /offers` - All offers
- `GET /offers/active` - Active offers only
- `GET /offers/deals` - Deal listings

## 🐛 Troubleshooting

### Common Issues

#### "Cannot connect to MongoDB"
**Solution:**
```bash
# Check if MongoDB is running
mongosh

# Or start MongoDB service
# Windows:
net start MongoDB

# Linux:
sudo systemctl start mongod

# Mac:
brew services start mongodb-community
```

#### "API endpoint tests failing"
**Solution:**
```bash
# Make sure backend server is running
cd user-backend
npm run dev

# Or check if server is running on correct port
curl http://localhost:5000/api/products
```

#### "Module 'chalk' not found"
**Solution:**
```bash
npm install --save-dev chalk
```

#### "Tests timing out"
**Solution:**
- Check network connection
- Ensure MongoDB has no performance issues
- Reduce test dataset size if needed

### Expected Warnings

Some warnings are normal:

- **401 errors on protected endpoints** - Expected for auth-required routes
- **Missing images on some products** - Data quality issue, not critical
- **Empty descriptions** - Content quality issue, not functional

### When to Be Concerned

Fix these issues immediately:

- ❌ **Broken Links > 5%** - Data integrity problem
- ❌ **API failures on public endpoints** - System broken
- ❌ **Invalid prices or negative stock** - Critical data error
- ❌ **Duplicate email addresses** - Database constraint violated

## 📝 Adding Custom Tests

To add your own tests, follow this pattern:

```javascript
async function testMyFeature() {
  console.log(chalk.blue('Testing My Feature...'));

  const items = await MyModel.find().limit(100);
  let validCount = 0;
  let invalidCount = 0;

  for (const item of items) {
    if (/* validation logic */) {
      validCount++;
    } else {
      invalidCount++;
    }
  }

  printTest('🔧', 'My Feature Test', items.length, validCount, invalidCount);
  addTest('My Feature', items.length, validCount, invalidCount);
}
```

Then add to `run-all-tests.js`:

```javascript
await testMyFeature();
```

## 📊 Interpreting Production Readiness

### Production Ready Criteria

Your app is production-ready when:

✅ Relationship Health ≥ 95%
✅ All public API endpoints returning 200
✅ No critical data quality issues
✅ Response times < 1000ms average
✅ No security vulnerabilities (401s on protected routes working)

### Pre-Production Checklist

- [ ] All relationship tests passing
- [ ] Data quality score ≥ 90%
- [ ] API endpoints responding correctly
- [ ] No broken foreign keys
- [ ] All images/URLs valid
- [ ] Price and stock data accurate
- [ ] User authentication working
- [ ] Search functionality operational
- [ ] Cart and wishlist systems working

## 🎯 Best Practices

1. **Run tests regularly** - Especially after seeding or migrations
2. **Fix broken links immediately** - They indicate data corruption
3. **Monitor data quality scores** - Aim for continuous improvement
4. **Check API response times** - Optimize slow endpoints
5. **Review HTML reports** - Easier to spot patterns
6. **Keep test results** - Track quality over time
7. **Fix critical issues first** - Red errors before yellow warnings

## 📧 Support

If tests reveal issues you can't resolve:

1. Check the specific test output for details
2. Review the JSON result files for raw data
3. Examine the HTML report for patterns
4. Check MongoDB logs for database errors
5. Review backend server logs for API issues

## 🔄 Continuous Integration

To run tests in CI/CD:

```yaml
# Example GitHub Actions
- name: Run Tests
  run: |
    node setup-tests.bat
    node run-all-tests.js

- name: Upload Results
  uses: actions/upload-artifact@v2
  with:
    name: test-results
    path: |
      test-results-*.json
      test-results-report.html
```

## 📈 Metrics to Track

- **Relationship Health** - Should stay ≥ 95%
- **Data Quality Score** - Aim for 100%
- **API Success Rate** - Should be 100% for public endpoints
- **Average Response Time** - Keep under 500ms
- **Issues Count** - Should trend downward over time

---

**Generated Test Reports:**
- `test-results-relationships.json`
- `test-results-data-quality.json`
- `test-results-api-endpoints.json`
- `test-results-master.json`
- `test-results-report.html` ⭐ **Open this in browser**
