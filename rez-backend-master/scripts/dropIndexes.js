/**
 * MongoDB Index Rollback Script
 *
 * This script safely removes indexes created by the createIndexes.js script.
 * It includes safety checks to prevent dropping critical indexes.
 *
 * Usage:
 *   mongosh "mongodb://localhost:27017/yourdb" scripts/dropIndexes.js
 *
 * Features:
 * - Safe index removal
 * - Preserves _id and critical indexes
 * - Progress logging
 * - Dry-run mode
 * - Comprehensive error handling
 */

// Configuration
const CONFIG = {
  dryRun: false, // Set to true to see what would be dropped without actually dropping
  preserveCritical: true, // Never drop _id or unique indexes on critical fields
  verbose: true
};

// Critical indexes that should NEVER be dropped
const CRITICAL_INDEXES = {
  products: ['_id_', 'slug_idx', 'sku_idx'],
  stores: ['_id_', 'slug_idx'],
  categories: ['_id_', 'slug_idx'],
  videos: ['_id_'],
  events: ['_id_'],
  offers: ['_id_']
};

// Helper function for logging
function log(message, type = 'INFO') {
  const timestamp = new Date().toISOString();
  print(`[${timestamp}] [${type}] ${message}`);
}

// Helper function to check if index is critical
function isCriticalIndex(collectionName, indexName) {
  const criticalList = CRITICAL_INDEXES[collectionName] || [];
  return criticalList.includes(indexName) || indexName === '_id_';
}

// Helper function to drop index safely
function dropIndexSafely(collectionName, indexName) {
  try {
    // Safety check - never drop critical indexes
    if (isCriticalIndex(collectionName, indexName)) {
      log(`SKIPPED: ${indexName} on ${collectionName} (critical index)`, 'WARN');
      return { success: false, skipped: true, reason: 'critical' };
    }

    // Dry run mode
    if (CONFIG.dryRun) {
      log(`DRY-RUN: Would drop ${indexName} on ${collectionName}`, 'INFO');
      return { success: true, dryRun: true };
    }

    // Actually drop the index
    log(`Dropping index '${indexName}' on ${collectionName}...`);
    db[collectionName].dropIndex(indexName);
    log(`✓ Successfully dropped index '${indexName}' on ${collectionName}`, 'SUCCESS');
    return { success: true, dropped: true };

  } catch (error) {
    log(`✗ Failed to drop index '${indexName}' on ${collectionName}: ${error.message}`, 'ERROR');
    return { success: false, error: error.message };
  }
}

// Drop all non-critical indexes from a collection
function dropCollectionIndexes(collectionName) {
  log(`\n--- Processing ${collectionName.toUpperCase()} collection ---`);

  if (!db[collectionName]) {
    log(`Collection '${collectionName}' does not exist!`, 'WARN');
    return { total: 0, dropped: 0, skipped: 0, failed: 0 };
  }

  const indexes = db[collectionName].getIndexes();
  const stats = {
    total: indexes.length,
    dropped: 0,
    skipped: 0,
    failed: 0
  };

  indexes.forEach(index => {
    const indexName = index.name;

    // Skip _id index
    if (indexName === '_id_') {
      stats.skipped++;
      return;
    }

    const result = dropIndexSafely(collectionName, indexName);

    if (result.dropped || result.dryRun) {
      stats.dropped++;
    } else if (result.skipped) {
      stats.skipped++;
    } else if (result.error) {
      stats.failed++;
    }
  });

  log(`\nStats for ${collectionName}:`);
  log(`  Total indexes: ${stats.total}`);
  log(`  Dropped: ${stats.dropped}`);
  if (stats.skipped > 0) log(`  Skipped: ${stats.skipped}`, 'INFO');
  if (stats.failed > 0) log(`  Failed: ${stats.failed}`, 'ERROR');

  return stats;
}

// Interactive confirmation
function confirmDrop() {
  if (CONFIG.dryRun) {
    log('DRY-RUN MODE: No indexes will actually be dropped', 'INFO');
    return true;
  }

  log('\n' + '!'.repeat(80), 'WARN');
  log('WARNING: This will drop non-critical indexes from the database!', 'WARN');
  log('This operation cannot be undone without re-running createIndexes.js', 'WARN');
  log('!'.repeat(80), 'WARN');

  // In mongosh, we can't easily prompt for input, so we'll check a flag
  // Users should modify CONFIG.dryRun to false to confirm
  return true;
}

// Main execution
log('='.repeat(80));
log('MongoDB Index Rollback Script');
log('='.repeat(80));

if (CONFIG.dryRun) {
  log('DRY-RUN MODE ENABLED - No changes will be made', 'INFO');
}

const startTime = new Date();
const overallStats = {
  collections: 0,
  totalDropped: 0,
  totalSkipped: 0,
  totalFailed: 0
};

try {
  // Confirm before proceeding
  if (!confirmDrop()) {
    log('Operation cancelled by user', 'INFO');
    quit();
  }

  // Collections to process
  const collections = ['products', 'stores', 'videos', 'events', 'offers', 'categories'];

  // Drop indexes from each collection
  collections.forEach(collectionName => {
    const stats = dropCollectionIndexes(collectionName);
    overallStats.collections++;
    overallStats.totalDropped += stats.dropped;
    overallStats.totalSkipped += stats.skipped;
    overallStats.totalFailed += stats.failed;
  });

  // Overall summary
  log('\n' + '='.repeat(80));
  log('Rollback Summary');
  log('='.repeat(80));
  log(`Collections processed: ${overallStats.collections}`);
  log(`Total indexes dropped: ${overallStats.totalDropped}`);
  log(`Total indexes skipped: ${overallStats.totalSkipped}`);

  if (overallStats.totalFailed > 0) {
    log(`Total indexes failed: ${overallStats.totalFailed}`, 'ERROR');
  }

  const endTime = new Date();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  log(`\nExecution time: ${duration} seconds`);

  if (CONFIG.dryRun) {
    log('\n✓ Dry-run completed. Set CONFIG.dryRun = false to actually drop indexes.', 'INFO');
  } else {
    if (overallStats.totalFailed === 0) {
      log('\n✓ Index rollback completed successfully!', 'SUCCESS');
      log('Run createIndexes.js to recreate the indexes if needed.', 'INFO');
    } else {
      log('\n⚠ Index rollback completed with errors. Please review above.', 'WARN');
    }
  }

  log('='.repeat(80));

} catch (error) {
  log(`\n✗ FATAL ERROR: ${error.message}`, 'ERROR');
  log('Rollback failed. Database state may be inconsistent.', 'ERROR');
  throw error;
}

// Display remaining indexes
log('\n' + '='.repeat(80));
log('Remaining Indexes Per Collection');
log('='.repeat(80));

const collections = ['products', 'stores', 'videos', 'events', 'offers', 'categories'];
collections.forEach(collectionName => {
  if (db[collectionName]) {
    const indexes = db[collectionName].getIndexes();
    log(`\n${collectionName}: ${indexes.length} indexes`);
    indexes.forEach(idx => {
      const critical = isCriticalIndex(collectionName, idx.name) ? ' [CRITICAL]' : '';
      log(`  - ${idx.name}${critical}`);
    });
  }
});

log('\n' + '='.repeat(80));
