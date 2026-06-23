# Discovery UI Data Seeding Guide

This guide explains how to seed data required for the Search Discovery UI feature.

## Prerequisites

- MongoDB connection configured in `.env` file
- Node.js and TypeScript installed
- Database: `test` (or set `DB_NAME` in `.env`)

## Seed Scripts

### 1. Update Store Payment Methods (REQUIRED FIRST)

**Script**: `update-store-payment-methods.ts`

**Purpose**: Adds payment methods array to all stores (currently 0 stores have this field)

**Run**:
```bash
npm run seed:payment-methods
```

**What it does**:
- Adds default payment methods (`['upi', 'card', 'wallet', 'cash']`) to all stores
- Ensures all stores have the `operationalInfo.paymentMethods` field
- This is required before seeding BNPL stores

**Expected Output**:
- All 110 stores should have payment methods
- Coverage: 100%

---

### 2. Seed BNPL Stores

**Script**: `seed-store-bnpl.ts`

**Purpose**: Adds BNPL payment options to 20-30 eligible stores

**Run**:
```bash
npm run seed:bnpl-stores
```

**What it does**:
- Adds BNPL to stores with cashback >= 15%
- Adds BNPL to stores in premium categories (electronics, fashion, etc.)
- Adds BNPL to top-rated stores (>= 4.5 rating, >= 50 reviews)
- Sets `paymentSettings.acceptPayLater: true`
- Adds `['bnpl', 'pay-later', 'installment']` to payment methods

**Expected Output**:
- At least 20 stores with BNPL enabled
- Target: 20-30 stores

---

### 3. Seed Search History

**Script**: `seed-search-history.ts`

**Purpose**: Populates `search_histories` collection with trending search queries

**Run**:
```bash
npm run seed:search-history
```

**What it does**:
- Creates search history entries for 50+ trending queries
- Includes food searches, category searches, location-based searches, price-based searches
- Distributes searches across users and time (last week)
- Simulates realistic search patterns

**Expected Output**:
- 50+ search history entries
- 50+ unique search queries
- Used for "Trending on ReZ" section

---

### 4. Seed Nearby Activity

**Script**: `seed-nearby-activity.ts`

**Purpose**: Generates social proof data for "People near you saved" feature

**Run**:
```bash
npm run seed:nearby-activity
```

**What it does**:
- Aggregates savings from `orders` collection
- Aggregates savings from `transactions` collection (cashback category)
- Groups by city and date
- Creates entries for today, this week, and this month
- Stores in `nearby_activities` collection

**Expected Output**:
- Today entries for major cities
- This week entries
- This month entries
- Used for "People Near You Saved" card

---

### 5. Validate Seeded Data

**Script**: `validate-discovery-data.ts`

**Purpose**: Validates that all seeded data meets requirements

**Run**:
```bash
npm run validate:discovery
```

**What it checks**:
- ✅ All stores have payment methods
- ✅ At least 20 stores have BNPL
- ✅ Search history has 50+ entries
- ✅ Nearby activity data exists
- ✅ Stores with cashback >= 10%
- ✅ Stores with location coordinates

---

## Run All Scripts in Order

To seed all discovery data at once:

```bash
npm run seed:discovery
```

This runs all scripts in the correct order:
1. Payment methods (base)
2. BNPL stores (depends on payment methods)
3. Search history (independent)
4. Nearby activity (depends on orders/transactions)

---

## Manual Execution Order

If you prefer to run scripts individually:

```bash
# Step 1: Base data
npm run seed:payment-methods

# Step 2: BNPL (depends on step 1)
npm run seed:bnpl-stores

# Step 3: Search history (independent)
npm run seed:search-history

# Step 4: Nearby activity (independent)
npm run seed:nearby-activity

# Step 5: Validate everything
npm run validate:discovery
```

---

## Troubleshooting

### Issue: "No stores updated"
- **Solution**: Check if stores exist in database
- Run: `node scripts/inspect-mongodb-data.js` to verify

### Issue: "BNPL stores count is low"
- **Solution**: Script targets stores with cashback >= 15% and high ratings
- Check if you have stores meeting these criteria
- You can modify the script to lower thresholds if needed

### Issue: "Search history empty"
- **Solution**: Script creates entries even without users
- If you have users, entries will be associated with them
- Check `search_histories` collection after running

### Issue: "Nearby activity has no data"
- **Solution**: Script creates sample data if no orders/transactions found
- Check if `orders` or `transactions` collections have data
- Sample data will be created for major cities

---

## Verification

After seeding, verify the data:

1. **Check stores with payment methods**:
   ```javascript
   db.stores.countDocuments({ 'operationalInfo.paymentMethods': { $exists: true, $ne: [] } })
   // Should be: 110 (all stores)
   ```

2. **Check BNPL stores**:
   ```javascript
   db.stores.countDocuments({ 'paymentSettings.acceptPayLater': true })
   // Should be: >= 20
   ```

3. **Check search history**:
   ```javascript
   db.search_histories.countDocuments({})
   // Should be: >= 50
   ```

4. **Check nearby activity**:
   ```javascript
   db.nearby_activities.countDocuments({ period: 'today' })
   // Should be: > 0
   ```

---

## Notes

- All scripts are idempotent (safe to run multiple times)
- Scripts use upsert operations where appropriate
- Data is seeded based on existing database content
- Sample data is created if real data is insufficient

---

## Next Steps

After seeding:
1. Restart the backend server
2. Test the discovery UI in the frontend
3. Verify all sections load correctly
4. Check that trending searches appear
5. Verify BNPL stores show up in Discover & Save section














