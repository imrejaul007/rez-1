# MongoDB Index Migration Guide

Complete guide for creating, verifying, monitoring, and managing MongoDB indexes for production deployment.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Scripts Overview](#scripts-overview)
- [Quick Start](#quick-start)
- [Detailed Usage](#detailed-usage)
- [Safety Guidelines](#safety-guidelines)
- [Troubleshooting](#troubleshooting)
- [Performance Testing](#performance-testing)
- [Rollback Procedures](#rollback-procedures)
- [Best Practices](#best-practices)

---

## Overview

This migration suite provides production-ready scripts for managing MongoDB indexes across all collections in your application. The scripts are:

- **Idempotent**: Safe to run multiple times
- **Production-ready**: Background indexing by default
- **Comprehensive**: Full error handling and logging
- **Safe**: Built-in protections for critical indexes

### What Gets Indexed

- **Products**: 15+ indexes for search, filtering, sorting
- **Stores**: 22+ indexes for location, categories, delivery options
- **Videos**: 20+ indexes for content discovery, engagement
- **Events**: 9+ indexes for scheduling, categories
- **Offers**: 20+ indexes for validity, location, metadata
- **Categories**: 4+ indexes for navigation, hierarchy

---

## Prerequisites

### Required

- MongoDB 4.4 or higher (for background index creation)
- `mongosh` (MongoDB Shell) installed
- Database access credentials
- Sufficient disk space (indexes typically use 10-30% of collection size)

### Recommended

- Staging environment for testing
- Database backup before migration
- Low-traffic period for index creation
- Monitoring tools configured

### Check Prerequisites

```bash
# Check MongoDB version
mongosh --version

# Check database size
mongosh "mongodb://localhost:27017/yourdb" --eval "db.stats()"

# Check available disk space
df -h
```

---

## Scripts Overview

### 1. createIndexes.js

**Purpose**: Create all recommended indexes

**Features**:
- Background index creation (non-blocking)
- Skips existing indexes automatically
- Comprehensive error handling
- Progress logging
- Safe for production use

**When to use**:
- Initial setup
- After database restore
- Adding new indexes to production

### 2. verifyIndexes.js

**Purpose**: Verify all indexes exist and are correctly configured

**Features**:
- Checks for missing indexes
- Validates index options (unique, sparse, etc.)
- Reports extra indexes
- Shows storage statistics
- No modifications to database

**When to use**:
- After running createIndexes.js
- Regular health checks
- Before deployment
- Troubleshooting performance issues

### 3. dropIndexes.js

**Purpose**: Safely remove indexes (rollback)

**Features**:
- Protects critical indexes (_id, unique constraints)
- Dry-run mode
- Detailed confirmation and logging
- Safe rollback mechanism

**When to use**:
- Testing index changes
- Removing unused indexes
- Rolling back after issues
- Database maintenance

### 4. monitorIndexes.js

**Purpose**: Monitor index performance and usage

**Features**:
- Index size analysis
- Usage statistics
- Unused index detection
- Performance recommendations
- Health score calculation

**When to use**:
- Regular monitoring (weekly/monthly)
- Performance optimization
- Capacity planning
- Identifying optimization opportunities

---

## Quick Start

### Step 1: Backup Database

```bash
# Create backup
mongodump --uri="mongodb://localhost:27017/yourdb" --out=/backup/$(date +%Y%m%d)
```

### Step 2: Verify Connection

```bash
# Test connection
mongosh "mongodb://localhost:27017/yourdb" --eval "db.stats()"
```

### Step 3: Create Indexes

```bash
# Production deployment
mongosh "mongodb://localhost:27017/yourdb" scripts/createIndexes.js

# With authentication
mongosh "mongodb://username:password@localhost:27017/yourdb" scripts/createIndexes.js

# With connection string
mongosh "mongodb+srv://cluster.mongodb.net/yourdb" scripts/createIndexes.js
```

### Step 4: Verify Indexes

```bash
mongosh "mongodb://localhost:27017/yourdb" scripts/verifyIndexes.js
```

### Step 5: Monitor Performance

```bash
mongosh "mongodb://localhost:27017/yourdb" scripts/monitorIndexes.js
```

---

## Detailed Usage

### Creating Indexes

#### Configuration Options

Edit `createIndexes.js` to customize:

```javascript
const CONFIG = {
  verbose: true,              // Detailed logging
  background: true,           // Non-blocking index creation
  continueOnError: false      // Stop on first error
};
```

#### Execution

```bash
# Standard execution
mongosh "mongodb://localhost:27017/yourdb" scripts/createIndexes.js

# Save output to file
mongosh "mongodb://localhost:27017/yourdb" scripts/createIndexes.js > index_creation.log 2>&1

# With custom timeout
mongosh "mongodb://localhost:27017/yourdb" --eval "load('scripts/createIndexes.js')"
```

#### Expected Output

```
[2025-01-14T10:00:00.000Z] [INFO] ================================================================================
[2025-01-14T10:00:00.000Z] [INFO] Starting MongoDB Index Creation
[2025-01-14T10:00:00.000Z] [INFO] ================================================================================

[2025-01-14T10:00:01.000Z] [INFO] --- Creating indexes for PRODUCTS collection ---
[2025-01-14T10:00:01.123Z] [INFO] Creating index 'slug_idx' on products...
[2025-01-14T10:00:01.456Z] [SUCCESS] ✓ Successfully created index 'slug_idx' on products
...
```

### Verifying Indexes

#### Execution

```bash
mongosh "mongodb://localhost:27017/yourdb" scripts/verifyIndexes.js
```

#### Interpreting Results

- **✓ Found**: Index exists and is correctly configured
- **✗ MISSING**: Index doesn't exist (run createIndexes.js)
- **⚠ INCORRECT**: Index exists but configuration is wrong
- **ℹ EXTRA**: Index exists but not in expected list

#### Sample Output

```
--- Verifying PRODUCTS collection ---
✓ Found: slug_idx
✓ Found: sku_idx
✗ MISSING: { category: 1, isActive: 1 }

Stats for products:
  ✓ Found: 13
  ✗ Missing: 2
  Total indexes: 14
```

### Monitoring Indexes

#### Execution

```bash
mongosh "mongodb://localhost:27017/yourdb" scripts/monitorIndexes.js
```

#### Understanding Metrics

**Size Analysis**:
- **Index to data ratio < 30%**: Healthy
- **Index to data ratio 30-50%**: Monitor
- **Index to data ratio > 50%**: Review immediately

**Usage Statistics**:
- **0 accesses**: Unused index (consider removing)
- **< 10 accesses**: Low usage (monitor)
- **> 1000 accesses**: Active index

**Health Score**:
- **90-100**: Excellent
- **70-89**: Good
- **50-69**: Fair
- **< 50**: Poor (needs attention)

### Dropping Indexes (Rollback)

#### Dry-Run Mode (Recommended First)

```javascript
// In dropIndexes.js, set:
const CONFIG = {
  dryRun: true,  // Shows what would be dropped without actually dropping
  preserveCritical: true,
  verbose: true
};
```

```bash
mongosh "mongodb://localhost:27017/yourdb" scripts/dropIndexes.js
```

#### Actual Execution

```javascript
const CONFIG = {
  dryRun: false,  // Actually drop indexes
  preserveCritical: true,
  verbose: true
};
```

```bash
mongosh "mongodb://localhost:27017/yourdb" scripts/dropIndexes.js
```

---

## Safety Guidelines

### Before Migration

1. **Create Full Backup**
   ```bash
   mongodump --uri="mongodb://localhost:27017/yourdb" --out=/backup/pre-migration
   ```

2. **Test on Staging**
   - Run complete migration on staging environment
   - Verify application functionality
   - Test query performance
   - Monitor resource usage

3. **Check Disk Space**
   ```bash
   # Ensure at least 30% free space
   df -h /data/mongodb
   ```

4. **Review Current Indexes**
   ```bash
   mongosh "mongodb://localhost:27017/yourdb" --eval "
     db.getCollectionNames().forEach(function(collection) {
       print('\\n' + collection + ':');
       db[collection].getIndexes().forEach(function(index) {
         print('  ' + index.name);
       });
     });
   "
   ```

### During Migration

1. **Use Background Indexing**
   - Always enabled by default in createIndexes.js
   - Prevents blocking database operations
   - May take longer but safer for production

2. **Monitor Server Resources**
   ```bash
   # Monitor CPU, Memory, Disk I/O
   top
   iostat 1

   # Monitor MongoDB metrics
   mongostat --uri="mongodb://localhost:27017"
   ```

3. **Schedule During Low Traffic**
   - Ideal: Maintenance window
   - Acceptable: Off-peak hours
   - Avoid: Peak business hours

4. **Keep Logs**
   ```bash
   mongosh "mongodb://localhost:27017/yourdb" scripts/createIndexes.js 2>&1 | tee migration_$(date +%Y%m%d_%H%M%S).log
   ```

### After Migration

1. **Verify All Indexes**
   ```bash
   mongosh "mongodb://localhost:27017/yourdb" scripts/verifyIndexes.js
   ```

2. **Test Application**
   - Run integration tests
   - Verify search functionality
   - Check filtering and sorting
   - Monitor error rates

3. **Monitor Performance**
   ```bash
   mongosh "mongodb://localhost:27017/yourdb" scripts/monitorIndexes.js
   ```

4. **Watch for Issues**
   - Query performance changes
   - Write performance (may be slightly slower)
   - Disk space usage
   - Memory consumption

---

## Troubleshooting

### Issue: "Index already exists"

**Symptom**: Warning messages about existing indexes

**Solution**: This is normal - script skips existing indexes automatically

```
[WARN] Index 'slug_idx' already exists on products, skipping...
```

**Action**: No action needed, script is working correctly

---

### Issue: "Duplicate key error"

**Symptom**: Error creating unique index

```
[ERROR] Failed to create index on products: E11000 duplicate key error
```

**Solution**: Data has duplicate values in indexed field

```bash
# Find duplicates
mongosh "mongodb://localhost:27017/yourdb" --eval "
  db.products.aggregate([
    { \$group: { _id: '\$slug', count: { \$sum: 1 } } },
    { \$match: { count: { \$gt: 1 } } }
  ])
"

# Clean duplicates before retrying
# Or remove unique constraint if duplicates are valid
```

---

### Issue: "Out of disk space"

**Symptom**: Index creation fails with disk space error

**Solution**:
1. Free up disk space
2. Use compact command to reclaim space
   ```bash
   mongosh "mongodb://localhost:27017/yourdb" --eval "db.products.compact()"
   ```
3. Increase disk space if needed

---

### Issue: "Index creation too slow"

**Symptom**: Index creation taking hours

**Cause**: Large collection, background index creation is slow

**Solution**:
1. **Check Progress**
   ```bash
   mongosh "mongodb://localhost:27017/yourdb" --eval "db.currentOp()"
   ```

2. **Consider Foreground Indexing** (only during maintenance window)
   ```javascript
   // In createIndexes.js
   const CONFIG = {
     background: false  // Faster but blocks operations
   };
   ```

3. **Increase Resources**
   - Add more RAM
   - Use faster storage (SSD)
   - Increase CPU allocation

---

### Issue: "Index not being used"

**Symptom**: Query performance not improved

**Solution**:
1. **Verify Index Exists**
   ```bash
   mongosh "mongodb://localhost:27017/yourdb" --eval "db.products.getIndexes()"
   ```

2. **Use Explain to Check Query Plan**
   ```bash
   mongosh "mongodb://localhost:27017/yourdb" --eval "
     db.products.find({ category: 'electronics', isActive: true }).explain('executionStats')
   "
   ```

3. **Check Index Selectivity**
   ```bash
   # Index should be used if:
   # - Query matches index fields
   # - Index is selective (returns < 30% of documents)
   # - Index order matches sort order
   ```

---

### Issue: "Too many indexes warning"

**Symptom**: High index to data ratio

**Solution**:
1. **Run Monitor Script**
   ```bash
   mongosh "mongodb://localhost:27017/yourdb" scripts/monitorIndexes.js
   ```

2. **Identify Unused Indexes**
   - Look for indexes with 0 accesses
   - Check low-usage indexes

3. **Remove Unnecessary Indexes**
   ```bash
   mongosh "mongodb://localhost:27017/yourdb" --eval "
     db.products.dropIndex('unused_index_name')
   "
   ```

---

## Performance Testing

### Before and After Comparison

#### 1. Baseline Metrics (Before Indexing)

```bash
# Run sample queries and record execution time
mongosh "mongodb://localhost:27017/yourdb" --eval "
  var start = new Date();
  db.products.find({ category: 'electronics', isActive: true }).sort({ 'ratings.average': -1 }).limit(20).toArray();
  var end = new Date();
  print('Execution time: ' + (end - start) + 'ms');
"
```

#### 2. Create Indexes

```bash
mongosh "mongodb://localhost:27017/yourdb" scripts/createIndexes.js
```

#### 3. Post-Index Metrics

```bash
# Re-run same queries
mongosh "mongodb://localhost:27017/yourdb" --eval "
  var start = new Date();
  db.products.find({ category: 'electronics', isActive: true }).sort({ 'ratings.average': -1 }).limit(20).toArray();
  var end = new Date();
  print('Execution time: ' + (end - start) + 'ms');
"
```

#### 4. Compare Results

Expected improvements:
- **Search queries**: 10-100x faster
- **Sort operations**: 5-50x faster
- **Filtered queries**: 10-1000x faster
- **Geospatial queries**: 100-10000x faster

### Load Testing

```bash
# Install if needed
npm install -g artillery

# Create test config
cat > load-test.yml <<EOF
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - flow:
    - get:
        url: "/api/products?category=electronics"
    - get:
        url: "/api/stores/nearby?lat=28.6&lng=77.2"
EOF

# Run load test
artillery run load-test.yml
```

---

## Rollback Procedures

### Emergency Rollback

If indexes cause issues and you need to rollback immediately:

#### Option 1: Drop All Non-Critical Indexes

```bash
# Dry-run first
mongosh "mongodb://localhost:27017/yourdb" scripts/dropIndexes.js

# Review output, then set dryRun: false and run again
```

#### Option 2: Drop Specific Index

```bash
mongosh "mongodb://localhost:27017/yourdb" --eval "
  db.products.dropIndex('problematic_index_name')
"
```

#### Option 3: Restore from Backup

```bash
# Stop application
# Restore database
mongorestore --uri="mongodb://localhost:27017/yourdb" /backup/pre-migration

# Restart application
```

### Planned Rollback

1. **Document Current State**
   ```bash
   mongosh "mongodb://localhost:27017/yourdb" scripts/verifyIndexes.js > before_rollback.txt
   ```

2. **Run Rollback Script**
   ```bash
   # Dry-run
   mongosh "mongodb://localhost:27017/yourdb" scripts/dropIndexes.js

   # Actual rollback
   # Edit dropIndexes.js: dryRun: false
   mongosh "mongodb://localhost:27017/yourdb" scripts/dropIndexes.js
   ```

3. **Verify Rollback**
   ```bash
   mongosh "mongodb://localhost:27017/yourdb" scripts/verifyIndexes.js > after_rollback.txt
   diff before_rollback.txt after_rollback.txt
   ```

4. **Test Application**
   - Verify functionality
   - Check performance
   - Monitor error logs

---

## Best Practices

### Index Design

1. **Compound Index Order**
   - Equality filters first
   - Sort fields next
   - Range filters last

   Example: `{ category: 1, rating: -1, price: 1 }`

2. **Index Selectivity**
   - High cardinality fields make better indexes
   - Avoid indexing boolean fields alone
   - Combine low-cardinality fields with high-cardinality

3. **Covering Indexes**
   - Include all fields needed by query
   - Prevents document fetching
   - Significantly faster

### Maintenance

1. **Regular Monitoring**
   ```bash
   # Weekly
   mongosh "mongodb://localhost:27017/yourdb" scripts/monitorIndexes.js

   # Monthly
   # Review unused indexes
   # Check index sizes
   # Plan optimizations
   ```

2. **Index Cleanup**
   ```bash
   # Identify candidates
   mongosh "mongodb://localhost:27017/yourdb" scripts/monitorIndexes.js | grep "UNUSED"

   # Test without index (in staging)
   # Drop if confirmed unnecessary
   ```

3. **Performance Review**
   - Analyze slow query logs
   - Review query patterns
   - Adjust indexes as needed

### Deployment Strategy

1. **Staging First**
   - Test complete migration
   - Verify functionality
   - Measure performance impact

2. **Gradual Rollout**
   - Create indexes during maintenance window
   - Monitor closely for 24-48 hours
   - Roll back if issues detected

3. **Documentation**
   - Document all changes
   - Keep migration logs
   - Update runbooks

### Resource Management

1. **Monitor During Index Creation**
   - CPU usage
   - Memory usage
   - Disk I/O
   - Query performance

2. **Capacity Planning**
   - Expect 10-30% increase in storage
   - Plan for memory overhead
   - Consider index cache needs

3. **Scaling Considerations**
   - Indexes scale with data
   - Monitor growth trends
   - Plan capacity accordingly

---

## Additional Resources

### MongoDB Documentation

- [Index Strategies](https://docs.mongodb.com/manual/applications/indexes/)
- [Index Types](https://docs.mongodb.com/manual/indexes/)
- [Index Performance](https://docs.mongodb.com/manual/core/index-performance/)

### Monitoring Tools

- MongoDB Atlas (cloud monitoring)
- Ops Manager (enterprise monitoring)
- Percona Monitoring and Management
- mongostat, mongotop (CLI tools)

### Support

For issues or questions:
1. Check troubleshooting section above
2. Review MongoDB logs
3. Consult team documentation
4. Contact database administrator

---

## Changelog

### Version 1.0.0 (2025-01-14)
- Initial release
- Support for Products, Stores, Videos, Events, Offers, Categories
- Create, verify, monitor, and drop scripts
- Comprehensive documentation

---

## License

Internal use only - Confidential
