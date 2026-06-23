/**
 * MongoDB Index Creation Script
 *
 * This script creates all recommended indexes for optimal database performance.
 * Safe to run multiple times (idempotent) - will skip existing indexes.
 *
 * Usage:
 *   mongosh "mongodb://localhost:27017/yourdb" scripts/createIndexes.js
 *
 * Features:
 * - Background index creation (non-blocking)
 * - Progress logging
 * - Error handling
 * - Idempotent operation
 * - Performance optimized
 */

// Configuration
const CONFIG = {
  verbose: true,
  background: true, // Create indexes in background
  continueOnError: false // Stop on first error or continue
};

// Helper function for logging
function log(message, type = 'INFO') {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${type}] ${message}`);
}

// Helper function to create index with error handling
function createIndexSafely(collection, keys, options = {}) {
  try {
    const indexName = options.name || Object.keys(keys).join('_');
    log(`Creating index '${indexName}' on ${collection}...`);

    // Check if index already exists
    const existingIndexes = db[collection].getIndexes();
    const indexExists = existingIndexes.some(idx => idx.name === indexName);

    if (indexExists) {
      log(`Index '${indexName}' already exists on ${collection}, skipping...`, 'WARN');
      return { success: true, skipped: true };
    }

    // Create index
    const indexOptions = {
      background: CONFIG.background,
      ...options
    };

    db[collection].createIndex(keys, indexOptions);
    log(`✓ Successfully created index '${indexName}' on ${collection}`, 'SUCCESS');
    return { success: true, skipped: false };

  } catch (error) {
    log(`✗ Failed to create index on ${collection}: ${error.message}`, 'ERROR');
    if (!CONFIG.continueOnError) {
      throw error;
    }
    return { success: false, error: error.message };
  }
}

// Main execution
log('='.repeat(80));
log('Starting MongoDB Index Creation');
log('='.repeat(80));

const startTime = new Date();
const results = {
  total: 0,
  created: 0,
  skipped: 0,
  failed: 0
};

try {
  // ========================================
  // PRODUCTS COLLECTION INDEXES
  // ========================================
  log('\n--- Creating indexes for PRODUCTS collection ---');

  // Single field indexes
  createIndexSafely('products', { slug: 1 }, { name: 'slug_idx', unique: true });
  createIndexSafely('products', { sku: 1 }, { name: 'sku_idx', unique: true });
  createIndexSafely('products', { createdAt: -1 }, { name: 'createdAt_desc_idx' });

  // Category and store indexes
  createIndexSafely('products', { category: 1, isActive: 1 }, { name: 'category_isActive_idx' });
  createIndexSafely('products', { store: 1, isActive: 1 }, { name: 'store_isActive_idx' });
  createIndexSafely('products', { brand: 1, isActive: 1 }, { name: 'brand_isActive_idx' });

  // Pricing and ratings indexes
  createIndexSafely('products', { 'pricing.selling': 1 }, { name: 'pricing_selling_idx' });
  createIndexSafely('products', { 'ratings.average': -1, isActive: 1 }, { name: 'ratings_avg_desc_isActive_idx' });

  // Featured and inventory indexes
  createIndexSafely('products', { isFeatured: 1, isActive: 1 }, { name: 'isFeatured_isActive_idx' });
  createIndexSafely('products', { tags: 1, isActive: 1 }, { name: 'tags_isActive_idx' });
  createIndexSafely('products', { 'inventory.stock': 1, 'inventory.isAvailable': 1 }, { name: 'inventory_stock_available_idx' });

  // Compound indexes for complex queries
  createIndexSafely('products', { category: 1, 'pricing.selling': 1, isActive: 1 }, { name: 'category_pricing_isActive_idx' });
  createIndexSafely('products', { store: 1, 'ratings.average': -1 }, { name: 'store_ratings_desc_idx' });
  createIndexSafely('products', { isFeatured: 1, 'ratings.average': -1, isActive: 1 }, { name: 'featured_ratings_desc_isActive_idx' });
  createIndexSafely('products', { isActive: 1, createdAt: -1 }, { name: 'isActive_createdAt_desc_idx' });

  // Text search index
  createIndexSafely('products',
    { name: 'text', description: 'text', tags: 'text', brand: 'text' },
    {
      name: 'text_search_idx',
      weights: { name: 10, tags: 5, brand: 3, description: 1 }
    }
  );

  results.total += 15;

  // ========================================
  // STORES COLLECTION INDEXES
  // ========================================
  log('\n--- Creating indexes for STORES collection ---');

  // Single field indexes
  createIndexSafely('stores', { slug: 1 }, { name: 'slug_idx', unique: true });
  createIndexSafely('stores', { createdAt: -1 }, { name: 'createdAt_desc_idx' });

  // Category and location indexes
  createIndexSafely('stores', { category: 1, isActive: 1 }, { name: 'category_isActive_idx' });
  createIndexSafely('stores', { 'location.city': 1, isActive: 1 }, { name: 'location_city_isActive_idx' });
  createIndexSafely('stores', { 'location.pincode': 1 }, { name: 'location_pincode_idx' });

  // Geospatial index
  createIndexSafely('stores', { 'location.coordinates': '2dsphere' }, { name: 'location_coordinates_2dsphere_idx' });

  // Ratings and features indexes
  createIndexSafely('stores', { 'ratings.average': -1, isActive: 1 }, { name: 'ratings_avg_desc_isActive_idx' });
  createIndexSafely('stores', { isFeatured: 1, isActive: 1 }, { name: 'isFeatured_isActive_idx' });
  createIndexSafely('stores', { 'offers.isPartner': 1, isActive: 1 }, { name: 'offers_isPartner_isActive_idx' });
  createIndexSafely('stores', { tags: 1, isActive: 1 }, { name: 'tags_isActive_idx' });

  // Menu and booking indexes
  createIndexSafely('stores', { hasMenu: 1, isActive: 1 }, { name: 'hasMenu_isActive_idx' });
  createIndexSafely('stores', { bookingType: 1, isActive: 1 }, { name: 'bookingType_isActive_idx' });

  // Delivery category indexes
  createIndexSafely('stores', { 'deliveryCategories.fastDelivery': 1, isActive: 1 }, { name: 'delivery_fastDelivery_isActive_idx' });
  createIndexSafely('stores', { 'deliveryCategories.budgetFriendly': 1, isActive: 1 }, { name: 'delivery_budgetFriendly_isActive_idx' });
  createIndexSafely('stores', { 'deliveryCategories.premium': 1, isActive: 1 }, { name: 'delivery_premium_isActive_idx' });
  createIndexSafely('stores', { 'deliveryCategories.organic': 1, isActive: 1 }, { name: 'delivery_organic_isActive_idx' });
  createIndexSafely('stores', { 'deliveryCategories.alliance': 1, isActive: 1 }, { name: 'delivery_alliance_isActive_idx' });
  createIndexSafely('stores', { 'deliveryCategories.lowestPrice': 1, isActive: 1 }, { name: 'delivery_lowestPrice_isActive_idx' });
  createIndexSafely('stores', { 'deliveryCategories.mall': 1, isActive: 1 }, { name: 'delivery_mall_isActive_idx' });
  createIndexSafely('stores', { 'deliveryCategories.cashStore': 1, isActive: 1 }, { name: 'delivery_cashStore_isActive_idx' });

  // Compound indexes
  createIndexSafely('stores', { category: 1, 'location.city': 1, isActive: 1 }, { name: 'category_location_city_isActive_idx' });
  createIndexSafely('stores', { 'offers.isPartner': 1, 'ratings.average': -1 }, { name: 'offers_isPartner_ratings_desc_idx' });

  results.total += 22;

  // ========================================
  // VIDEOS COLLECTION INDEXES
  // ========================================
  log('\n--- Creating indexes for VIDEOS collection ---');

  // Single field indexes
  createIndexSafely('videos', { creator: 1 }, { name: 'creator_idx' });
  createIndexSafely('videos', { contentType: 1 }, { name: 'contentType_idx' });
  createIndexSafely('videos', { category: 1 }, { name: 'category_idx' });
  createIndexSafely('videos', { isPublished: 1 }, { name: 'isPublished_idx' });
  createIndexSafely('videos', { isFeatured: 1 }, { name: 'isFeatured_idx' });
  createIndexSafely('videos', { isTrending: 1 }, { name: 'isTrending_idx' });
  createIndexSafely('videos', { moderationStatus: 1 }, { name: 'moderationStatus_idx' });
  createIndexSafely('videos', { publishedAt: -1 }, { name: 'publishedAt_desc_idx' });

  // Array field indexes
  createIndexSafely('videos', { tags: 1, isPublished: 1 }, { name: 'tags_isPublished_idx' });
  createIndexSafely('videos', { hashtags: 1, isPublished: 1 }, { name: 'hashtags_isPublished_idx' });

  // Engagement indexes
  createIndexSafely('videos', { 'engagement.views': -1, isPublished: 1 }, { name: 'engagement_views_desc_isPublished_idx' });

  // Compound indexes
  createIndexSafely('videos', { creator: 1, isPublished: 1, createdAt: -1 }, { name: 'creator_isPublished_createdAt_desc_idx' });
  createIndexSafely('videos', { category: 1, isPublished: 1, publishedAt: -1 }, { name: 'category_isPublished_publishedAt_desc_idx' });
  createIndexSafely('videos', { contentType: 1, isPublished: 1, publishedAt: -1 }, { name: 'contentType_isPublished_publishedAt_desc_idx' });
  createIndexSafely('videos', { isFeatured: 1, isPublished: 1 }, { name: 'isFeatured_isPublished_idx' });
  createIndexSafely('videos', { isTrending: 1, isPublished: 1 }, { name: 'isTrending_isPublished_idx' });
  createIndexSafely('videos', { category: 1, 'engagement.views': -1, publishedAt: -1 }, { name: 'category_engagement_views_desc_publishedAt_desc_idx' });
  createIndexSafely('videos', { creator: 1, privacy: 1, publishedAt: -1 }, { name: 'creator_privacy_publishedAt_desc_idx' });

  // Text search index
  createIndexSafely('videos',
    { title: 'text', description: 'text', tags: 'text', hashtags: 'text' },
    {
      name: 'text_search_idx',
      weights: { title: 10, tags: 5, hashtags: 3, description: 1 }
    }
  );

  // Geospatial index (if location tracking is needed)
  createIndexSafely('videos', { 'location.coordinates': '2dsphere' }, { name: 'location_coordinates_2dsphere_idx', sparse: true });

  results.total += 20;

  // ========================================
  // EVENTS COLLECTION INDEXES
  // ========================================
  log('\n--- Creating indexes for EVENTS collection ---');

  // Single field indexes
  createIndexSafely('events', { merchantId: 1 }, { name: 'merchantId_idx', sparse: true });
  createIndexSafely('events', { featured: 1 }, { name: 'featured_idx' });

  // Status and category indexes
  createIndexSafely('events', { status: 1, date: 1 }, { name: 'status_date_idx' });
  createIndexSafely('events', { category: 1, status: 1 }, { name: 'category_status_idx' });
  createIndexSafely('events', { 'location.city': 1, status: 1 }, { name: 'location_city_status_idx' });
  createIndexSafely('events', { featured: 1, status: 1 }, { name: 'featured_status_idx' });

  // Array field indexes
  createIndexSafely('events', { tags: 1 }, { name: 'tags_idx' });

  // Compound indexes
  createIndexSafely('events', { date: 1, status: 1, featured: 1 }, { name: 'date_status_featured_idx' });

  // Text search index
  createIndexSafely('events', { title: 'text', description: 'text' }, { name: 'text_search_idx' });

  results.total += 9;

  // ========================================
  // OFFERS COLLECTION INDEXES
  // ========================================
  log('\n--- Creating indexes for OFFERS collection ---');

  // Single field indexes
  createIndexSafely('offers', { title: 1 }, { name: 'title_idx' });
  createIndexSafely('offers', { category: 1 }, { name: 'category_idx' });
  createIndexSafely('offers', { 'store.id': 1 }, { name: 'store_id_idx' });
  createIndexSafely('offers', { createdBy: 1 }, { name: 'createdBy_idx' });

  // Validity indexes
  createIndexSafely('offers', { 'validity.startDate': 1 }, { name: 'validity_startDate_idx' });
  createIndexSafely('offers', { 'validity.endDate': 1 }, { name: 'validity_endDate_idx' });
  createIndexSafely('offers', { 'validity.isActive': 1 }, { name: 'validity_isActive_idx' });

  // Metadata indexes
  createIndexSafely('offers', { 'metadata.isNew': 1 }, { name: 'metadata_isNew_idx' });
  createIndexSafely('offers', { 'metadata.isTrending': 1 }, { name: 'metadata_isTrending_idx' });
  createIndexSafely('offers', { 'metadata.isBestSeller': 1 }, { name: 'metadata_isBestSeller_idx' });
  createIndexSafely('offers', { 'metadata.isSpecial': 1 }, { name: 'metadata_isSpecial_idx' });
  createIndexSafely('offers', { 'metadata.priority': 1 }, { name: 'metadata_priority_idx' });
  createIndexSafely('offers', { 'metadata.featured': 1 }, { name: 'metadata_featured_idx' });

  // Geospatial index
  createIndexSafely('offers', { location: '2dsphere' }, { name: 'location_2dsphere_idx' });

  // Compound indexes
  createIndexSafely('offers', { category: 1, 'validity.isActive': 1, 'validity.endDate': 1 }, { name: 'category_validity_isActive_endDate_idx' });
  createIndexSafely('offers', { 'metadata.isTrending': 1, 'validity.isActive': 1 }, { name: 'metadata_isTrending_validity_isActive_idx' });
  createIndexSafely('offers', { 'metadata.isNew': 1, 'validity.isActive': 1 }, { name: 'metadata_isNew_validity_isActive_idx' });
  createIndexSafely('offers', { 'metadata.featured': 1, 'validity.isActive': 1 }, { name: 'metadata_featured_validity_isActive_idx' });
  createIndexSafely('offers', { 'store.id': 1, 'validity.isActive': 1 }, { name: 'store_id_validity_isActive_idx' });
  createIndexSafely('offers', { 'metadata.priority': -1, 'validity.isActive': 1 }, { name: 'metadata_priority_desc_validity_isActive_idx' });

  results.total += 20;

  // ========================================
  // CATEGORIES COLLECTION INDEXES
  // ========================================
  log('\n--- Creating indexes for CATEGORIES collection ---');

  createIndexSafely('categories', { slug: 1 }, { name: 'slug_idx', unique: true });
  createIndexSafely('categories', { isActive: 1 }, { name: 'isActive_idx' });
  createIndexSafely('categories', { parent: 1 }, { name: 'parent_idx', sparse: true });
  createIndexSafely('categories', { order: 1 }, { name: 'order_idx' });

  results.total += 4;

  // ========================================
  // Calculate Results
  // ========================================
  log('\n' + '='.repeat(80));
  log('Index Creation Summary');
  log('='.repeat(80));

  // Get actual stats by checking collections
  const collections = ['products', 'stores', 'videos', 'events', 'offers', 'categories'];
  let totalCreated = 0;

  collections.forEach(collectionName => {
    if (db[collectionName]) {
      const indexes = db[collectionName].getIndexes();
      log(`${collectionName}: ${indexes.length} indexes total`);
      totalCreated += indexes.length - 1; // Subtract default _id index
    }
  });

  const endTime = new Date();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  log('\nExecution Details:');
  log(`- Total indexes attempted: ${results.total}`);
  log(`- Execution time: ${duration} seconds`);
  log(`- Background indexing: ${CONFIG.background ? 'ENABLED' : 'DISABLED'}`);
  log('\n✓ Index creation completed successfully!');
  log('='.repeat(80));

} catch (error) {
  log(`\n✗ FATAL ERROR: ${error.message}`, 'ERROR');
  log('Index creation failed. Please check the error and retry.', 'ERROR');
  throw error;
}
