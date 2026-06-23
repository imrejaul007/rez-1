# Store-Merchant Enhancement Seed Script

## Overview

This script links existing stores in your database with newly created merchants. It intelligently matches stores to merchants based on:
- Category alignment
- Merchant interests and preferences
- Geographic location proximity
- Store characteristics

## Features

- **Smart Matching Algorithm**: Uses a scoring system to find the best merchant for each store
- **Category-Based Assignment**: Matches merchants to stores based on their category preferences and interests
- **Location Awareness**: Gives preference to merchants in the same city as the store
- **Bulk Updates**: Updates both stores and all their associated products
- **Validation**: Ensures products exist and belong to the correct store
- **Comprehensive Logging**: Detailed console output with color-coded messages
- **Error Handling**: Robust error handling with detailed error reporting
- **Statistics**: Provides detailed statistics on the enhancement process
- **Safety**: Skips stores that already have merchants assigned

## Prerequisites

1. **Node.js**: Version 14 or higher
2. **MongoDB**: Access to the database
3. **Merchants**: At least one merchant user must exist in the database
4. **Stores**: Active stores in the database
5. **Products**: Products associated with stores (optional but recommended)

## Installation

No additional installation required. The script uses the existing project dependencies.

## Usage

### Running the Script

From the `user-backend` directory:

```bash
# Using Node directly
node src/scripts/enhance-stores-with-merchants.js

# Or from project root
cd user-backend
npm run enhance-stores
```

### Adding to package.json (Optional)

Add this to your `package.json` scripts section:

```json
{
  "scripts": {
    "enhance-stores": "node src/scripts/enhance-stores-with-merchants.js"
  }
}
```

## How It Works

### 1. Data Fetching
```
┌─────────────┐
│   Fetch     │
│  Merchants  │──┐
└─────────────┘  │
                 │
┌─────────────┐  │    ┌──────────────┐
│   Fetch     │──┼───→│   Validate   │
│   Stores    │  │    │     Data     │
└─────────────┘  │    └──────────────┘
                 │
┌─────────────┐  │
│   Fetch     │──┘
│ Categories  │
└─────────────┘
```

### 2. Matching Algorithm

For each store, the script calculates a score for each merchant:

| Criteria | Points | Description |
|----------|--------|-------------|
| Exact category preference match | 100 | Merchant has the exact category in preferences |
| Exact category match | 50 | Merchant interests match store category exactly |
| Category mapping match | 30 | Related categories (e.g., fashion → jewelry) |
| Partial match | 20 | Category name contains merchant interest |
| Same city | 15 | Merchant and store in same city |

The merchant with the highest score is assigned to the store.

### 3. Update Process

```
Store
  ├─ Update merchantId
  │
  └─ Find all products
      └─ Update merchantId for all products
```

### 4. Category Mapping

The script uses intelligent category mapping:

```javascript
'fashion' → ['fashion', 'clothing', 'apparel', 'jewelry', 'accessories']
'electronics' → ['electronics', 'technology', 'gadgets', 'mobile']
'food' → ['food', 'restaurant', 'cafe', 'dining', 'beverages']
// ... and more
```

## Output Examples

### Successful Execution

```
═══ Connecting to Database ═══

✓ Connected to MongoDB: test

▶ Fetching Merchants
✓ Found 15 active merchants

▶ Fetching Stores
✓ Found 48 active stores

▶ Fetching Categories
✓ Found 12 active categories

═══ Validating Data ═══

✓ Data validation passed!

═══ Processing Stores ═══

ℹ [1/48] Processing: Fashion Hub
✓ Updated store "Fashion Hub" → Merchant: John Doe (25 products updated)

ℹ [2/48] Processing: Tech World
✓ Updated store "Tech World" → Merchant: Jane Smith (30 products updated)

...

═══ Enhancement Summary ═══

Database Statistics:
  Total Stores:          48
  Total Merchants:       15
  Total Products:        1250

Update Results:
  Stores Updated:        45
  Stores Skipped:        3
  Stores Without Merchant: 0
  Products Updated:      1200
  Errors Encountered:    0

Merchant Distribution:
  John Doe                       → 12 stores
  Jane Smith                     → 10 stores
  Mike Johnson                   → 8 stores
  ...

Success Rate: 93.75%

✓ Store enhancement completed successfully!
```

## Database Schema Changes

### Store Model
```javascript
{
  name: String,
  slug: String,
  category: ObjectId,
  merchantId: ObjectId,  // ← ADDED/UPDATED
  location: {
    city: String,
    state: String
  }
}
```

### Product Model
```javascript
{
  name: String,
  slug: String,
  store: ObjectId,
  category: ObjectId,
  merchantId: ObjectId  // ← ADDED/UPDATED
}
```

## Error Handling

The script handles various error scenarios:

1. **No Merchants**: Exits with error if no merchants found
2. **No Stores**: Exits with error if no stores found
3. **Missing Categories**: Warning only, continues processing
4. **Database Connection Failure**: Exits with error
5. **Update Failures**: Logs error, continues with other stores
6. **Product Update Failures**: Logs error, but marks store as updated

## Safety Features

- **Skip Existing Assignments**: Won't overwrite stores that already have merchants
- **Transaction Safety**: Updates are atomic per store
- **Validation**: Verifies data before processing
- **Error Isolation**: Errors on one store don't affect others

## Customization

### Modifying Category Mapping

Edit the `CATEGORY_MERCHANT_MAPPING` object:

```javascript
const CATEGORY_MERCHANT_MAPPING = {
  'your_category': ['interest1', 'interest2', 'interest3'],
  // Add more mappings
};
```

### Adjusting Scoring

Modify the `findBestMerchant` function to adjust scoring:

```javascript
// Example: Increase location bonus
if (store.location?.city === merchant.profile?.location?.city) {
  score += 30;  // Changed from 15
}
```

### Forcing Reassignment

To reassign merchants even for stores with existing merchants, modify:

```javascript
// In updateStoreWithMerchant function, comment out:
// if (store.merchantId) {
//   log.info(`Store "${store.name}" already has a merchant, skipping...`);
//   stats.storesSkipped++;
//   return false;
// }
```

## Troubleshooting

### Issue: "No merchants found in the database!"

**Solution**: Create merchants first using the merchant seed script:
```bash
node src/scripts/seed-merchants.js
```

### Issue: "No stores found in the database!"

**Solution**: Create stores first using the store seed script:
```bash
node src/scripts/seed-stores.js
```

### Issue: Database connection timeout

**Solution**:
- Check your internet connection
- Verify MongoDB credentials
- Increase timeout in the script:
```javascript
serverSelectionTimeoutMS: 60000,  // Increase to 60 seconds
```

### Issue: Some stores not getting merchants

**Solution**:
- Check if stores have categories assigned
- Verify merchants have interests or category preferences set
- Review the category mapping configuration

## Best Practices

1. **Backup First**: Always backup your database before running:
   ```bash
   mongodump --uri="your_mongodb_uri"
   ```

2. **Run in Test Environment**: Test the script on a non-production database first

3. **Review Logs**: Check the output for warnings and errors

4. **Verify Results**: Query the database after to verify assignments:
   ```javascript
   db.stores.find({ merchantId: { $exists: true } }).count()
   ```

5. **Run Periodically**: Schedule the script to run when new stores are added

## Database Queries for Verification

### Check stores with merchants
```javascript
db.stores.find({ merchantId: { $exists: true } }).count()
```

### Check products with merchants
```javascript
db.products.find({ merchantId: { $exists: true } }).count()
```

### Find stores without merchants
```javascript
db.stores.find({ merchantId: { $exists: false } })
```

### Merchant store count
```javascript
db.stores.aggregate([
  { $match: { merchantId: { $exists: true } } },
  { $group: { _id: "$merchantId", count: { $sum: 1 } } },
  { $sort: { count: -1 } }
])
```

## Performance Considerations

- **Batch Size**: Processes all stores, but adds small delays every 10 stores
- **Memory Usage**: Loads all data into memory (optimize for very large datasets)
- **Database Load**: Uses updateMany for products to minimize queries
- **Execution Time**: ~1-2 seconds per store (depending on product count)

## Future Enhancements

Potential improvements for future versions:

1. **Dry Run Mode**: Preview assignments without making changes
2. **Manual Overrides**: Specify custom merchant-store mappings
3. **Batch Processing**: Process stores in smaller batches for huge datasets
4. **Undo Feature**: Ability to revert assignments
5. **Email Notifications**: Send summary to administrators
6. **API Integration**: Expose as an API endpoint

## Support

For issues or questions:
1. Check the error messages in the console output
2. Review the errors array in the summary
3. Verify database connection and credentials
4. Ensure all prerequisites are met

## License

Part of the Rez App project.
