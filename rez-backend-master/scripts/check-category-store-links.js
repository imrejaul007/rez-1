/**
 * Database Diagnostic Script
 * Check how stores, categories, and products are linked in MongoDB
 */

const mongoose = require('mongoose');

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };
const DB_NAME = 'test';

async function runDiagnostic() {
  console.log('='.repeat(60));
  console.log('DATABASE DIAGNOSTIC - Category/Store/Product Links');
  console.log('='.repeat(60));
  console.log('');

  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
    console.log('Connected successfully!\n');

    const db = mongoose.connection.db;

    // ==================== CATEGORIES ====================
    console.log('--- CATEGORIES ---');
    const categoriesCollection = db.collection('categories');

    const totalCategories = await categoriesCollection.countDocuments();
    const parentCategories = await categoriesCollection.countDocuments({
      $or: [
        { parentCategory: null },
        { parentCategory: { $exists: false } }
      ]
    });
    const childCategories = await categoriesCollection.countDocuments({
      parentCategory: { $exists: true, $ne: null }
    });
    const activeCategories = await categoriesCollection.countDocuments({ isActive: true });

    console.log(`Total categories: ${totalCategories}`);
    console.log(`Parent categories (no parent): ${parentCategories}`);
    console.log(`Child categories: ${childCategories}`);
    console.log(`Active categories: ${activeCategories}`);

    // Sample categories
    const sampleCategories = await categoriesCollection.find({}).limit(5).toArray();
    console.log('\nSample categories:');
    sampleCategories.forEach(cat => {
      console.log(`  - ${cat.name} (${cat._id}) | parent: ${cat.parentCategory || 'none'}`);
    });

    // ==================== STORES ====================
    console.log('\n--- STORES ---');
    const storesCollection = db.collection('stores');

    const totalStores = await storesCollection.countDocuments();
    const storesWithCategory = await storesCollection.countDocuments({
      category: { $exists: true, $ne: null }
    });
    const storesWithoutCategory = await storesCollection.countDocuments({
      $or: [
        { category: null },
        { category: { $exists: false } }
      ]
    });
    const activeStores = await storesCollection.countDocuments({ isActive: true });
    const storesWithSubCategories = await storesCollection.countDocuments({
      subCategories: { $exists: true, $ne: [], $type: 'array' }
    });

    console.log(`Total stores: ${totalStores}`);
    console.log(`Stores WITH category field: ${storesWithCategory}`);
    console.log(`Stores WITHOUT category field: ${storesWithoutCategory}`);
    console.log(`Stores with subCategories: ${storesWithSubCategories}`);
    console.log(`Active stores: ${activeStores}`);

    // Sample stores with their category
    const sampleStores = await storesCollection.find({}).limit(5).toArray();
    console.log('\nSample stores:');
    sampleStores.forEach(store => {
      console.log(`  - ${store.name} | category: ${store.category || 'NONE'} | subCategories: ${store.subCategories?.length || 0}`);
    });

    // Category distribution in stores
    const categoryDistribution = await storesCollection.aggregate([
      { $match: { category: { $exists: true, $ne: null } } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]).toArray();

    if (categoryDistribution.length > 0) {
      console.log('\nTop 10 categories by store count:');
      for (const item of categoryDistribution) {
        const cat = await categoriesCollection.findOne({ _id: item._id });
        console.log(`  - ${cat?.name || 'Unknown'}: ${item.count} stores`);
      }
    }

    // ==================== PRODUCTS ====================
    console.log('\n--- PRODUCTS ---');
    const productsCollection = db.collection('products');

    const totalProducts = await productsCollection.countDocuments();
    const productsWithStore = await productsCollection.countDocuments({
      store: { $exists: true, $ne: null }
    });
    const productsWithCategory = await productsCollection.countDocuments({
      category: { $exists: true, $ne: null }
    });
    const productsWithBoth = await productsCollection.countDocuments({
      store: { $exists: true, $ne: null },
      category: { $exists: true, $ne: null }
    });
    const activeProducts = await productsCollection.countDocuments({ isActive: true });

    console.log(`Total products: ${totalProducts}`);
    console.log(`Products WITH store field: ${productsWithStore}`);
    console.log(`Products WITH category field: ${productsWithCategory}`);
    console.log(`Products with BOTH store AND category: ${productsWithBoth}`);
    console.log(`Active products: ${activeProducts}`);

    // Sample products
    const sampleProducts = await productsCollection.find({}).limit(5).toArray();
    console.log('\nSample products:');
    sampleProducts.forEach(prod => {
      console.log(`  - ${prod.name} | store: ${prod.store || 'NONE'} | category: ${prod.category || 'NONE'}`);
    });

    // ==================== VALIDATION ====================
    console.log('\n--- VALIDATION ---');

    // Check if store categories reference valid categories
    const storeCategories = await storesCollection.distinct('category');
    const validCategoryIds = await categoriesCollection.distinct('_id');
    const validCategoryIdStrings = validCategoryIds.map(id => id.toString());

    let invalidStoreCategoryRefs = 0;
    for (const catId of storeCategories) {
      if (catId && !validCategoryIdStrings.includes(catId.toString())) {
        invalidStoreCategoryRefs++;
      }
    }
    console.log(`Stores with invalid category references: ${invalidStoreCategoryRefs}`);

    // Check if product categories reference valid categories
    const productCategories = await productsCollection.distinct('category');
    let invalidProductCategoryRefs = 0;
    for (const catId of productCategories) {
      if (catId && !validCategoryIdStrings.includes(catId.toString())) {
        invalidProductCategoryRefs++;
      }
    }
    console.log(`Products with invalid category references: ${invalidProductCategoryRefs}`);

    // Check if products reference valid stores
    const productStoreIds = await productsCollection.distinct('store');
    const validStoreIds = await storesCollection.distinct('_id');
    const validStoreIdStrings = validStoreIds.map(id => id.toString());

    let invalidProductStoreRefs = 0;
    for (const storeId of productStoreIds) {
      if (storeId && !validStoreIdStrings.includes(storeId.toString())) {
        invalidProductStoreRefs++;
      }
    }
    console.log(`Products with invalid store references: ${invalidProductStoreRefs}`);

    // ==================== SUMMARY ====================
    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));

    const storesCategoryPercentage = totalStores > 0
      ? ((storesWithCategory / totalStores) * 100).toFixed(1)
      : 0;
    const productsLinkedPercentage = totalProducts > 0
      ? ((productsWithBoth / totalProducts) * 100).toFixed(1)
      : 0;

    console.log(`\nStores with category: ${storesWithCategory}/${totalStores} (${storesCategoryPercentage}%)`);
    console.log(`Products properly linked: ${productsWithBoth}/${totalProducts} (${productsLinkedPercentage}%)`);

    if (storesWithoutCategory > 0) {
      console.log(`\n⚠️  WARNING: ${storesWithoutCategory} stores have NO category assigned!`);
      console.log('   These stores will NOT appear when filtering by category.');
    }

    if (storesWithCategory === 0) {
      console.log('\n❌ CRITICAL: No stores have categories assigned!');
      console.log('   You need to run a migration to assign categories to stores.');
    } else {
      console.log('\n✅ Stores have categories assigned.');
    }

    // List stores without categories
    if (storesWithoutCategory > 0 && storesWithoutCategory <= 20) {
      const storesNoCat = await storesCollection.find({
        $or: [
          { category: null },
          { category: { $exists: false } }
        ]
      }).limit(20).toArray();

      console.log('\nStores without category:');
      storesNoCat.forEach(store => {
        console.log(`  - ${store.name} (${store._id})`);
      });
    }

    console.log('\n' + '='.repeat(60));
    console.log('DIAGNOSTIC COMPLETE');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

runDiagnostic();
