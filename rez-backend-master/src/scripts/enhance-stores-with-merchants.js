/**
 * Seed Script: Enhance Stores with Merchants
 *
 * This script links existing stores with newly created merchants by:
 * 1. Reading all stores from the Store collection
 * 2. Reading all merchants from the User collection (role: 'merchant')
 * 3. Matching stores with merchants based on category
 * 4. Updating store documents with merchant references
 * 5. Updating all products in each store with the correct merchant
 *
 * Database: mongodb+srv://<REDACTED>@cluster0.aulqar3.mongodb.net/test
 */

const mongoose = require('mongoose');
const path = require('path');

// Database configuration
const MONGODB_URI = process.env.MONGODB_URI as string;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };
const DB_NAME = 'test';

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

// Logging utilities
const log = {
  info: (msg) => console.log(`${colors.cyan}ℹ ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✓ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}✗ ${msg}${colors.reset}`),
  header: (msg) => console.log(`\n${colors.bright}${colors.blue}═══ ${msg} ═══${colors.reset}\n`),
  subheader: (msg) => console.log(`${colors.magenta}▶ ${msg}${colors.reset}`)
};

// Category to merchant interest mapping
const CATEGORY_MERCHANT_MAPPING = {
  'fashion': ['fashion', 'clothing', 'apparel', 'jewelry', 'accessories'],
  'electronics': ['electronics', 'technology', 'gadgets', 'mobile'],
  'food': ['food', 'restaurant', 'cafe', 'dining', 'beverages'],
  'groceries': ['groceries', 'supermarket', 'food', 'daily needs'],
  'home': ['home', 'furniture', 'decor', 'lifestyle'],
  'beauty': ['beauty', 'cosmetics', 'skincare', 'salon', 'wellness'],
  'sports': ['sports', 'fitness', 'gym', 'athletics'],
  'books': ['books', 'stationery', 'education'],
  'toys': ['toys', 'kids', 'children', 'games'],
  'health': ['health', 'pharmacy', 'medical', 'wellness'],
  'automotive': ['automotive', 'vehicles', 'auto', 'car'],
  'jewelry': ['jewelry', 'fashion', 'accessories', 'luxury'],
  'services': ['services', 'repair', 'maintenance']
};

// Statistics object
const stats = {
  totalStores: 0,
  totalMerchants: 0,
  totalProducts: 0,
  storesUpdated: 0,
  productsUpdated: 0,
  storesSkipped: 0,
  storesWithoutMerchant: 0,
  errors: [],
  merchantDistribution: {}
};

/**
 * Connect to MongoDB
 */
async function connectToDatabase() {
  try {
    log.header('Connecting to Database');

    await mongoose.connect(`${MONGODB_URI}${DB_NAME}`, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000
    });

    log.success(`Connected to MongoDB: ${DB_NAME}`);
    return true;
  } catch (error) {
    log.error(`Database connection failed: ${error.message}`);
    throw error;
  }
}

/**
 * Define Mongoose schemas (inline for script portability)
 */
function defineSchemas() {
  // User Schema (simplified for merchants)
  const UserSchema = new mongoose.Schema({
    phoneNumber: String,
    email: String,
    profile: {
      firstName: String,
      lastName: String,
      avatar: String,
      location: {
        city: String,
        state: String
      }
    },
    preferences: {
      categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }]
    },
    role: String,
    interests: [String]
  }, { timestamps: true });

  // Store Schema (simplified)
  const StoreSchema = new mongoose.Schema({
    name: String,
    slug: String,
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    merchantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    location: {
      city: String,
      state: String
    }
  }, { timestamps: true });

  // Product Schema (simplified)
  const ProductSchema = new mongoose.Schema({
    name: String,
    slug: String,
    store: { type: mongoose.Schema.Types.ObjectId, ref: 'Store' },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    merchantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }, { timestamps: true });

  // Category Schema (simplified)
  const CategorySchema = new mongoose.Schema({
    name: String,
    slug: String,
    type: String
  }, { timestamps: true });

  // Register models
  const User = mongoose.models.User || mongoose.model('User', UserSchema);
  const Store = mongoose.models.Store || mongoose.model('Store', StoreSchema);
  const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);
  const Category = mongoose.models.Category || mongoose.model('Category', CategorySchema);

  return { User, Store, Product, Category };
}

/**
 * Find the best merchant match for a store based on category and location
 */
function findBestMerchant(store, merchants, categories) {
  if (!merchants || merchants.length === 0) {
    return null;
  }

  // Get category information
  // Handle stores without categories
  if (!store.category) {
    log.warning(`No category assigned for store: ${store.name}, using first merchant`);
    return merchants[0]; // Return first merchant as fallback
  }

  const storeCategory = categories.find(cat =>
    cat._id.toString() === store.category.toString()
  );

  if (!storeCategory) {
    log.warning(`Category not found for store: ${store.name}`);
    return merchants[0]; // Return first merchant as fallback
  }

  const categoryName = storeCategory.name.toLowerCase();
  const categorySlug = storeCategory.slug.toLowerCase();

  // Score each merchant
  const merchantScores = merchants.map(merchant => {
    let score = 0;

    // Check merchant interests
    if (merchant.interests && Array.isArray(merchant.interests)) {
      for (const interest of merchant.interests) {
        const interestLower = interest.toLowerCase();

        // Exact category match
        if (interestLower === categoryName || interestLower === categorySlug) {
          score += 50;
        }

        // Check category mapping
        for (const [key, values] of Object.entries(CATEGORY_MERCHANT_MAPPING)) {
          if (categoryName.includes(key) || categorySlug.includes(key)) {
            if (values.some(v => interestLower.includes(v))) {
              score += 30;
            }
          }
        }

        // Partial match
        if (categoryName.includes(interestLower) || interestLower.includes(categoryName)) {
          score += 20;
        }
      }
    }

    // Check merchant preferred categories
    if (merchant.preferences?.categories && Array.isArray(merchant.preferences.categories)) {
      for (const prefCat of merchant.preferences.categories) {
        if (prefCat.toString() === store.category.toString()) {
          score += 100; // Highest priority for exact category preference
        }
      }
    }

    // Location proximity bonus
    if (store.location?.city && merchant.profile?.location?.city) {
      if (store.location.city.toLowerCase() === merchant.profile.location.city.toLowerCase()) {
        score += 15;
      }
    }

    return { merchant, score };
  });

  // Sort by score descending
  merchantScores.sort((a, b) => b.score - a.score);

  // Return merchant with highest score, or first merchant if all scores are 0
  return merchantScores[0].score > 0
    ? merchantScores[0].merchant
    : merchants[Math.floor(Math.random() * merchants.length)]; // Random if no match
}

/**
 * Fetch all merchants from database
 */
async function fetchMerchants(User) {
  log.subheader('Fetching Merchants');

  try {
    const merchants = await User.find({
      role: 'merchant',
      isActive: true
    })
    .populate('preferences.categories')
    .lean();

    stats.totalMerchants = merchants.length;
    log.success(`Found ${merchants.length} active merchants`);

    return merchants;
  } catch (error) {
    log.error(`Failed to fetch merchants: ${error.message}`);
    throw error;
  }
}

/**
 * Fetch all stores from database
 */
async function fetchStores(Store) {
  log.subheader('Fetching Stores');

  try {
    const stores = await Store.find({ isActive: true })
      .populate('category')
      .lean();

    stats.totalStores = stores.length;
    log.success(`Found ${stores.length} active stores`);

    return stores;
  } catch (error) {
    log.error(`Failed to fetch stores: ${error.message}`);
    throw error;
  }
}

/**
 * Fetch all categories from database
 */
async function fetchCategories(Category) {
  log.subheader('Fetching Categories');

  try {
    const categories = await Category.find({ isActive: true }).lean();

    log.success(`Found ${categories.length} active categories`);

    return categories;
  } catch (error) {
    log.error(`Failed to fetch categories: ${error.message}`);
    throw error;
  }
}

/**
 * Update products for a store with merchant reference
 */
async function updateStoreProducts(storeId, merchantId, Product) {
  try {
    // Verify products exist for this store
    const productCount = await Product.countDocuments({ store: storeId });

    if (productCount === 0) {
      log.warning(`No products found for store ${storeId}`);
      return 0;
    }

    // Update all products for this store
    const result = await Product.updateMany(
      { store: storeId },
      { $set: { merchantId: merchantId } }
    );

    return result.modifiedCount || 0;
  } catch (error) {
    log.error(`Failed to update products for store ${storeId}: ${error.message}`);
    stats.errors.push({
      storeId,
      type: 'product_update',
      error: error.message
    });
    return 0;
  }
}

/**
 * Update a single store with merchant reference
 */
async function updateStoreWithMerchant(store, merchant, Store, Product) {
  try {
    // Skip if store already has a merchant
    if (store.merchantId) {
      log.info(`Store "${store.name}" already has a merchant, skipping...`);
      stats.storesSkipped++;
      return false;
    }

    // Update store with merchant reference
    await Store.updateOne(
      { _id: store._id },
      { $set: { merchantId: merchant._id } }
    );

    // Update all products in this store
    const productsUpdated = await updateStoreProducts(store._id, merchant._id, Product);

    stats.storesUpdated++;
    stats.productsUpdated += productsUpdated;

    // Track merchant distribution
    const merchantName = `${merchant.profile?.firstName || ''} ${merchant.profile?.lastName || ''}`.trim() || merchant.phoneNumber;
    stats.merchantDistribution[merchantName] = (stats.merchantDistribution[merchantName] || 0) + 1;

    log.success(
      `Updated store "${store.name}" → Merchant: ${merchantName} (${productsUpdated} products updated)`
    );

    return true;
  } catch (error) {
    log.error(`Failed to update store "${store.name}": ${error.message}`);
    stats.errors.push({
      storeId: store._id,
      storeName: store.name,
      type: 'store_update',
      error: error.message
    });
    return false;
  }
}

/**
 * Process all stores and assign merchants
 */
async function processStores(stores, merchants, categories, models) {
  log.header('Processing Stores');

  if (merchants.length === 0) {
    log.error('No merchants available to assign to stores!');
    return;
  }

  const { Store, Product } = models;

  // Process each store
  for (let i = 0; i < stores.length; i++) {
    const store = stores[i];

    log.info(`[${i + 1}/${stores.length}] Processing: ${store.name}`);

    // Find best matching merchant
    const merchant = findBestMerchant(store, merchants, categories);

    if (!merchant) {
      log.warning(`No suitable merchant found for store: ${store.name}`);
      stats.storesWithoutMerchant++;
      continue;
    }

    // Update store and products
    await updateStoreWithMerchant(store, merchant, Store, Product);

    // Small delay to prevent overwhelming the database
    if (i % 10 === 0 && i > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}

/**
 * Count total products in database
 */
async function countTotalProducts(Product) {
  try {
    const count = await Product.countDocuments({});
    stats.totalProducts = count;
    log.info(`Total products in database: ${count}`);
  } catch (error) {
    log.warning(`Could not count products: ${error.message}`);
  }
}

/**
 * Display final statistics
 */
function displayStatistics() {
  log.header('Enhancement Summary');

  console.log(`${colors.bright}Database Statistics:${colors.reset}`);
  console.log(`  Total Stores:          ${stats.totalStores}`);
  console.log(`  Total Merchants:       ${stats.totalMerchants}`);
  console.log(`  Total Products:        ${stats.totalProducts}`);

  console.log(`\n${colors.bright}Update Results:${colors.reset}`);
  console.log(`  Stores Updated:        ${colors.green}${stats.storesUpdated}${colors.reset}`);
  console.log(`  Stores Skipped:        ${colors.yellow}${stats.storesSkipped}${colors.reset}`);
  console.log(`  Stores Without Merchant: ${colors.red}${stats.storesWithoutMerchant}${colors.reset}`);
  console.log(`  Products Updated:      ${colors.green}${stats.productsUpdated}${colors.reset}`);
  console.log(`  Errors Encountered:    ${stats.errors.length > 0 ? colors.red : colors.green}${stats.errors.length}${colors.reset}`);

  if (Object.keys(stats.merchantDistribution).length > 0) {
    console.log(`\n${colors.bright}Merchant Distribution:${colors.reset}`);
    const sortedMerchants = Object.entries(stats.merchantDistribution)
      .sort((a, b) => b[1] - a[1]);

    sortedMerchants.forEach(([name, count]) => {
      console.log(`  ${name.padEnd(30)} → ${count} stores`);
    });
  }

  if (stats.errors.length > 0) {
    console.log(`\n${colors.bright}${colors.red}Errors:${colors.reset}`);
    stats.errors.forEach((err, index) => {
      console.log(`  ${index + 1}. ${err.storeName || err.storeId} (${err.type}): ${err.error}`);
    });
  }

  // Success rate calculation
  const successRate = stats.totalStores > 0
    ? ((stats.storesUpdated / stats.totalStores) * 100).toFixed(2)
    : 0;

  console.log(`\n${colors.bright}Success Rate: ${successRate}%${colors.reset}`);

  if (stats.storesUpdated > 0) {
    log.success(`\nStore enhancement completed successfully!`);
  } else if (stats.storesSkipped === stats.totalStores) {
    log.info(`\nAll stores already have merchants assigned.`);
  } else {
    log.warning(`\nEnhancement completed with warnings.`);
  }
}

/**
 * Validation checks before processing
 */
async function validateData(stores, merchants, categories) {
  log.header('Validating Data');

  let hasErrors = false;

  // Check if we have stores
  if (!stores || stores.length === 0) {
    log.error('No stores found in the database!');
    hasErrors = true;
  }

  // Check if we have merchants
  if (!merchants || merchants.length === 0) {
    log.error('No merchants found in the database!');
    hasErrors = true;
  }

  // Check if we have categories
  if (!categories || categories.length === 0) {
    log.warning('No categories found in the database. Category matching may be limited.');
  }

  // Check for stores without categories
  const storesWithoutCategory = stores.filter(s => !s.category);
  if (storesWithoutCategory.length > 0) {
    log.warning(`${storesWithoutCategory.length} stores do not have categories assigned.`);
  }

  if (hasErrors) {
    throw new Error('Validation failed. Cannot proceed with enhancement.');
  }

  log.success('Data validation passed!');
  return true;
}

/**
 * Main execution function
 */
async function main() {
  console.log(`${colors.bright}${colors.cyan}
╔════════════════════════════════════════════════════╗
║   Store-Merchant Enhancement Seed Script          ║
║   Links stores with merchants based on category   ║
╚════════════════════════════════════════════════════╝
${colors.reset}`);

  try {
    // Connect to database
    await connectToDatabase();

    // Define schemas
    const models = defineSchemas();
    const { User, Store, Product, Category } = models;

    // Fetch data
    const merchants = await fetchMerchants(User);
    const stores = await fetchStores(Store);
    const categories = await fetchCategories(Category);
    await countTotalProducts(Product);

    // Validate data
    await validateData(stores, merchants, categories);

    // Process stores
    await processStores(stores, merchants, categories, models);

    // Display statistics
    displayStatistics();

  } catch (error) {
    log.error(`Script execution failed: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Close database connection
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      log.info('Database connection closed.');
    }
  }
}

// Execute script
if (require.main === module) {
  main()
    .then(() => {
      log.success('\nScript completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      log.error(`\nScript failed: ${error.message}`);
      process.exit(1);
    });
}

module.exports = { main };
