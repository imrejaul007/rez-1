/**
 * MongoDB Index Verification Script
 *
 * This script verifies that all recommended indexes exist and are correctly configured.
 * It checks index definitions and reports any missing or incorrect indexes.
 *
 * Usage:
 *   mongosh "mongodb://localhost:27017/yourdb" scripts/verifyIndexes.js
 *
 * Features:
 * - Comprehensive index verification
 * - Reports missing indexes
 * - Validates index configurations
 * - Shows index usage statistics
 */

// Helper function for logging
function log(message, type = 'INFO') {
  const timestamp = new Date().toISOString();
  print(`[${timestamp}] [${type}] ${message}`);
}

// Expected indexes configuration
const EXPECTED_INDEXES = {
  products: [
    { keys: { slug: 1 }, options: { unique: true } },
    { keys: { sku: 1 }, options: { unique: true } },
    { keys: { createdAt: -1 } },
    { keys: { category: 1, isActive: 1 } },
    { keys: { store: 1, isActive: 1 } },
    { keys: { brand: 1, isActive: 1 } },
    { keys: { 'pricing.selling': 1 } },
    { keys: { 'ratings.average': -1, isActive: 1 } },
    { keys: { isFeatured: 1, isActive: 1 } },
    { keys: { tags: 1, isActive: 1 } },
    { keys: { 'inventory.stock': 1, 'inventory.isAvailable': 1 } },
    { keys: { category: 1, 'pricing.selling': 1, isActive: 1 } },
    { keys: { store: 1, 'ratings.average': -1 } },
    { keys: { isFeatured: 1, 'ratings.average': -1, isActive: 1 } },
    { keys: { isActive: 1, createdAt: -1 } }
  ],
  stores: [
    { keys: { slug: 1 }, options: { unique: true } },
    { keys: { createdAt: -1 } },
    { keys: { category: 1, isActive: 1 } },
    { keys: { 'location.city': 1, isActive: 1 } },
    { keys: { 'location.pincode': 1 } },
    { keys: { 'location.coordinates': '2dsphere' } },
    { keys: { 'ratings.average': -1, isActive: 1 } },
    { keys: { isFeatured: 1, isActive: 1 } },
    { keys: { 'offers.isPartner': 1, isActive: 1 } },
    { keys: { tags: 1, isActive: 1 } },
    { keys: { hasMenu: 1, isActive: 1 } },
    { keys: { bookingType: 1, isActive: 1 } },
    { keys: { 'deliveryCategories.fastDelivery': 1, isActive: 1 } },
    { keys: { 'deliveryCategories.budgetFriendly': 1, isActive: 1 } },
    { keys: { 'deliveryCategories.premium': 1, isActive: 1 } },
    { keys: { 'deliveryCategories.organic': 1, isActive: 1 } },
    { keys: { category: 1, 'location.city': 1, isActive: 1 } },
    { keys: { 'offers.isPartner': 1, 'ratings.average': -1 } }
  ],
  videos: [
    { keys: { creator: 1 } },
    { keys: { contentType: 1 } },
    { keys: { category: 1 } },
    { keys: { isPublished: 1 } },
    { keys: { isFeatured: 1 } },
    { keys: { isTrending: 1 } },
    { keys: { moderationStatus: 1 } },
    { keys: { publishedAt: -1 } },
    { keys: { tags: 1, isPublished: 1 } },
    { keys: { hashtags: 1, isPublished: 1 } },
    { keys: { 'engagement.views': -1, isPublished: 1 } },
    { keys: { creator: 1, isPublished: 1, createdAt: -1 } },
    { keys: { category: 1, isPublished: 1, publishedAt: -1 } },
    { keys: { contentType: 1, isPublished: 1, publishedAt: -1 } },
    { keys: { isFeatured: 1, isPublished: 1 } },
    { keys: { isTrending: 1, isPublished: 1 } }
  ],
  events: [
    { keys: { status: 1, date: 1 } },
    { keys: { category: 1, status: 1 } },
    { keys: { 'location.city': 1, status: 1 } },
    { keys: { featured: 1, status: 1 } },
    { keys: { tags: 1 } },
    { keys: { date: 1, status: 1, featured: 1 } }
  ],
  offers: [
    { keys: { title: 1 } },
    { keys: { category: 1 } },
    { keys: { 'store.id': 1 } },
    { keys: { createdBy: 1 } },
    { keys: { 'validity.startDate': 1 } },
    { keys: { 'validity.endDate': 1 } },
    { keys: { 'validity.isActive': 1 } },
    { keys: { 'metadata.isNew': 1 } },
    { keys: { 'metadata.isTrending': 1 } },
    { keys: { 'metadata.featured': 1 } },
    { keys: { 'metadata.priority': 1 } },
    { keys: { location: '2dsphere' } },
    { keys: { category: 1, 'validity.isActive': 1, 'validity.endDate': 1 } },
    { keys: { 'metadata.isTrending': 1, 'validity.isActive': 1 } },
    { keys: { 'metadata.featured': 1, 'validity.isActive': 1 } },
    { keys: { 'store.id': 1, 'validity.isActive': 1 } },
    { keys: { 'metadata.priority': -1, 'validity.isActive': 1 } }
  ],
  categories: [
    { keys: { slug: 1 }, options: { unique: true } },
    { keys: { isActive: 1 } },
    { keys: { order: 1 } }
  ]
};

// Helper function to compare index keys
function indexKeysMatch(expected, actual) {
  const expectedKeys = JSON.stringify(expected);
  const actualKeys = JSON.stringify(actual);
  return expectedKeys === actualKeys;
}

// Verify indexes for a collection
function verifyCollectionIndexes(collectionName) {
  log(`\n--- Verifying ${collectionName.toUpperCase()} collection ---`);

  if (!db[collectionName]) {
    log(`Collection '${collectionName}' does not exist!`, 'WARN');
    return { found: 0, missing: 0, incorrect: 0, extra: 0 };
  }

  const actualIndexes = db[collectionName].getIndexes();
  const expectedIndexes = EXPECTED_INDEXES[collectionName] || [];

  const stats = {
    found: 0,
    missing: 0,
    incorrect: 0,
    extra: 0
  };

  // Check for missing indexes
  expectedIndexes.forEach(expectedIndex => {
    const found = actualIndexes.find(actual => {
      // Skip _id index
      if (actual.name === '_id_') return false;
      return indexKeysMatch(expectedIndex.keys, actual.key);
    });

    if (!found) {
      stats.missing++;
      log(`✗ MISSING: ${JSON.stringify(expectedIndex.keys)}`, 'WARN');
    } else {
      stats.found++;

      // Verify options if specified
      if (expectedIndex.options) {
        if (expectedIndex.options.unique && !found.unique) {
          stats.incorrect++;
          log(`⚠ INCORRECT: ${found.name} should be unique`, 'WARN');
        }
        if (expectedIndex.options.sparse && !found.sparse) {
          stats.incorrect++;
          log(`⚠ INCORRECT: ${found.name} should be sparse`, 'WARN');
        }
      }
    }
  });

  // Check for extra indexes (not in expected list)
  actualIndexes.forEach(actual => {
    // Skip _id index and text indexes
    if (actual.name === '_id_' || actual.key._fts) return;

    const expected = expectedIndexes.find(exp => indexKeysMatch(exp.keys, actual.key));
    if (!expected) {
      stats.extra++;
      log(`ℹ EXTRA: ${actual.name} - ${JSON.stringify(actual.key)}`, 'INFO');
    }
  });

  log(`\nStats for ${collectionName}:`);
  log(`  ✓ Found: ${stats.found}`);
  if (stats.missing > 0) log(`  ✗ Missing: ${stats.missing}`, 'WARN');
  if (stats.incorrect > 0) log(`  ⚠ Incorrect: ${stats.incorrect}`, 'WARN');
  if (stats.extra > 0) log(`  ℹ Extra: ${stats.extra}`, 'INFO');
  log(`  Total indexes: ${actualIndexes.length}`);

  return stats;
}

// Get index statistics
function getIndexStats(collectionName) {
  if (!db[collectionName]) return null;

  const stats = db[collectionName].stats();
  const indexes = db[collectionName].getIndexes();

  return {
    collection: collectionName,
    totalIndexes: indexes.length,
    indexSize: stats.indexSizes || stats.totalIndexSize || 0,
    storageSize: stats.storageSize || 0
  };
}

// Main execution
log('='.repeat(80));
log('MongoDB Index Verification');
log('='.repeat(80));

const startTime = new Date();
const overallStats = {
  collections: 0,
  totalFound: 0,
  totalMissing: 0,
  totalIncorrect: 0,
  totalExtra: 0
};

try {
  // Verify each collection
  Object.keys(EXPECTED_INDEXES).forEach(collectionName => {
    const stats = verifyCollectionIndexes(collectionName);
    overallStats.collections++;
    overallStats.totalFound += stats.found;
    overallStats.totalMissing += stats.missing;
    overallStats.totalIncorrect += stats.incorrect;
    overallStats.totalExtra += stats.extra;
  });

  // Display index statistics
  log('\n' + '='.repeat(80));
  log('Index Storage Statistics');
  log('='.repeat(80));

  Object.keys(EXPECTED_INDEXES).forEach(collectionName => {
    const stats = getIndexStats(collectionName);
    if (stats) {
      log(`\n${collectionName}:`);
      log(`  Total indexes: ${stats.totalIndexes}`);
      log(`  Index size: ${(stats.indexSize / 1024).toFixed(2)} KB`);
      log(`  Storage size: ${(stats.storageSize / 1024).toFixed(2)} KB`);
    }
  });

  // Overall summary
  log('\n' + '='.repeat(80));
  log('Verification Summary');
  log('='.repeat(80));
  log(`Collections checked: ${overallStats.collections}`);
  log(`Total indexes found: ${overallStats.totalFound}`);

  if (overallStats.totalMissing > 0) {
    log(`Missing indexes: ${overallStats.totalMissing}`, 'WARN');
    log('\n⚠ ACTION REQUIRED: Run createIndexes.js to create missing indexes', 'WARN');
  }

  if (overallStats.totalIncorrect > 0) {
    log(`Incorrect indexes: ${overallStats.totalIncorrect}`, 'WARN');
    log('\n⚠ ACTION REQUIRED: Review and fix incorrect indexes', 'WARN');
  }

  if (overallStats.totalExtra > 0) {
    log(`Extra indexes: ${overallStats.totalExtra}`, 'INFO');
  }

  const endTime = new Date();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  log(`\nExecution time: ${duration} seconds`);

  if (overallStats.totalMissing === 0 && overallStats.totalIncorrect === 0) {
    log('\n✓ All recommended indexes are in place and correctly configured!', 'SUCCESS');
  } else {
    log('\n✗ Index verification completed with warnings. Please review above.', 'WARN');
  }

  log('='.repeat(80));

} catch (error) {
  log(`\n✗ FATAL ERROR: ${error.message}`, 'ERROR');
  throw error;
}
