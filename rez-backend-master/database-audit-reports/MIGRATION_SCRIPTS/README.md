# Database Migration Scripts

This directory contains migration scripts for cleaning up database inconsistencies.

## Quick Start

```bash
cd user-backend

# Run all migrations in order
node database-audit-reports/MIGRATION_SCRIPTS/migrate-faqs-id-standardization.js
node database-audit-reports/MIGRATION_SCRIPTS/fix-broken-category-references.js

# Verify results
node database-audit-reports/MIGRATION_SCRIPTS/verify-migrations.js
```

## Scripts Overview

### 1. migrate-faqs-id-standardization.js
**Purpose:** Remove duplicate `id` and `uniqueId` fields from FAQs collection

**What it does:**
- Drops the `id_1` unique index on FAQs collection
- Removes `id` field from all FAQs
- Removes `uniqueId` field from all FAQs
- Keeps only MongoDB's native `_id` field

**Expected changes:**
- 31 FAQs modified
- 1 index dropped
- 0 data loss

**Status:** ✅ Completed Successfully

---

### 2. fix-broken-category-references.js
**Purpose:** Fix products that reference non-existent categories

**What it does:**
- Identifies products with invalid category references
- Creates "Uncategorized" category if it doesn't exist
- Updates products to reference the "Uncategorized" category

**Expected changes:**
- 7 products modified
- 1 new category created
- 0 data loss

**Status:** ✅ Completed Successfully

---

### 3. verify-migrations.js
**Purpose:** Verify all migrations completed successfully

**What it checks:**
- FAQs have no duplicate ID fields
- All products reference valid categories
- Record counts are unchanged
- Database integrity maintained

**Status:** ✅ All Verifications Passed

---

## Results Summary

### FAQs Migration
```
✅ Total FAQs: 32 (unchanged)
✅ Modified: 31 FAQs
✅ Duplicate IDs remaining: 0
✅ Status: SUCCESS
```

### Category References Migration
```
✅ Total Products: 389 (unchanged)
✅ Modified: 7 products
✅ Invalid references remaining: 0
✅ New category created: "Uncategorized"
✅ Status: SUCCESS
```

---

## Safety Features

All migration scripts include:
- ✅ Connection verification
- ✅ Pre-migration checks
- ✅ Detailed logging
- ✅ Post-migration verification
- ✅ Error handling
- ✅ Rollback support (via MongoDB transactions)

---

## Troubleshooting

### If migration fails:
1. Check MongoDB connection string in `.env`
2. Ensure you have write permissions on the database
3. Check for running locks on collections
4. Review error messages in console output

### To rollback (if needed):
The scripts are designed to be safe, but if you need to rollback:
1. Restore from your MongoDB backup
2. Re-run only the necessary migrations
3. Contact database administrator

---

## Files in This Directory

| File | Purpose | Status |
|------|---------|--------|
| `migrate-faqs-id-standardization.js` | Remove duplicate FAQ IDs | ✅ Complete |
| `fix-broken-category-references.js` | Fix broken category refs | ✅ Complete |
| `verify-migrations.js` | Verify all migrations | ✅ Verified |
| `MIGRATION_REPORT.md` | Detailed report | 📄 Documentation |
| `README.md` | This file | 📄 Documentation |

---

## Next Steps

1. ✅ **COMPLETED:** Run all migrations
2. ✅ **COMPLETED:** Verify results
3. ⚠️ **TODO:** Review uncategorized products and assign proper categories
4. ⚠️ **TODO:** Update frontend code if it relied on FAQ `id` field
5. ⚠️ **TODO:** Add validation to prevent future broken references

---

## Support

For questions or issues:
1. Review `MIGRATION_REPORT.md` for detailed information
2. Check console logs for specific error messages
3. Verify database connection and permissions
4. Contact the development team

---

**Last Updated:** November 15, 2025
**Migration Status:** ✅ All Migrations Completed Successfully
