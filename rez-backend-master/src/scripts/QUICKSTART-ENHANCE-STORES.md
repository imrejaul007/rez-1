# Quick Start: Store-Merchant Enhancement

## 1-Minute Setup

### Run the Script

```bash
cd user-backend
node src/scripts/enhance-stores-with-merchants.js
```

That's it! The script will automatically:
- Connect to your MongoDB database
- Fetch all merchants and stores
- Match them based on categories
- Update stores and products
- Display a comprehensive summary

---

## Expected Output

```
╔════════════════════════════════════════════════════╗
║   Store-Merchant Enhancement Seed Script          ║
║   Links stores with merchants based on category   ║
╚════════════════════════════════════════════════════╝

═══ Connecting to Database ═══
✓ Connected to MongoDB: test

▶ Fetching Merchants
✓ Found 15 active merchants

▶ Fetching Stores
✓ Found 48 active stores

═══ Processing Stores ═══
[Processing each store...]

═══ Enhancement Summary ═══
Stores Updated:        45 ✓
Products Updated:      1200 ✓
Success Rate: 93.75%
```

---

## What It Does

1. **Fetches Data**: Gets all merchants and stores from database
2. **Smart Matching**: Matches stores to merchants based on:
   - Category preferences
   - Merchant interests
   - Location proximity
3. **Updates Database**:
   - Adds `merchantId` to stores
   - Adds `merchantId` to all products in each store
4. **Validates**: Ensures products exist and belong to correct store

---

## Requirements

- Node.js installed
- MongoDB connection (already configured in script)
- At least 1 merchant in database (role: 'merchant')
- At least 1 store in database

---

## Common Issues

### "No merchants found!"
Create merchants first:
```bash
node src/scripts/seed-merchants.js
```

### "No stores found!"
Create stores first:
```bash
node src/scripts/seed-stores.js
```

### Already has merchants?
The script skips stores with existing merchants automatically.

---

## Verify Results

After running, check your database:

```javascript
// MongoDB Shell
db.stores.find({ merchantId: { $exists: true } }).count()
db.products.find({ merchantId: { $exists: true } }).count()
```

---

## Need Help?

See the full documentation: `README-ENHANCE-STORES.md`

---

## Safety

- Won't overwrite existing merchant assignments
- Each store update is independent (failures don't affect others)
- Detailed error logging for troubleshooting
- Can be run multiple times safely
