/**
 * Script to check Going Out section stores and categories
 * Run with: node scripts/check-goingout-stores.js
 */

const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };
const DB_NAME = 'test';

// Going Out subcategory slugs
const GOING_OUT_SLUGS = ['cafes', 'family-restaurants', 'fine-dining', 'qsr-fast-food'];

async function run() {
  try {
    await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const stores = db.collection('stores');
    const categories = db.collection('categories');

    // 1. Check if subcategories exist
    console.log('=== CHECKING SUBCATEGORIES ===\n');
    for (const slug of GOING_OUT_SLUGS) {
      const category = await categories.findOne({ slug: slug });
      if (category) {
        console.log(`✅ "${slug}" exists:`);
        console.log(`   - ID: ${category._id}`);
        console.log(`   - Name: ${category.name}`);
        console.log(`   - Parent: ${category.parentCategory || 'None (root)'}`);
      } else {
        console.log(`❌ "${slug}" NOT FOUND in categories collection`);
      }
    }

    // 2. Check stores count by subcategory
    console.log('\n\n=== STORES COUNT BY SUBCATEGORY ===\n');
    for (const slug of GOING_OUT_SLUGS) {
      const category = await categories.findOne({ slug: slug });

      if (category) {
        // Count stores linked to this category
        const storeCount = await stores.countDocuments({
          isActive: true,
          $or: [
            { category: category._id },
            { subcategory: category._id },
            { subcategorySlug: slug },
            { subCategories: category._id }
          ]
        });
        console.log(`📦 "${slug}": ${storeCount} stores`);
      } else {
        console.log(`❌ "${slug}": Category not found`);
      }
    }

    // 3. Check Food & Dining parent category
    console.log('\n\n=== FOOD & DINING CATEGORY ===\n');
    const foodDining = await categories.findOne({ slug: 'food-dining' });
    if (foodDining) {
      console.log(`✅ Food & Dining exists: ${foodDining._id}`);

      // Count total stores in Food & Dining
      const totalFoodStores = await stores.countDocuments({
        isActive: true,
        category: foodDining._id
      });
      console.log(`📦 Total stores with category = Food & Dining: ${totalFoodStores}`);
    } else {
      console.log('❌ Food & Dining category NOT FOUND');
    }

    // 4. Show sample stores
    console.log('\n\n=== SAMPLE STORES (first 5) ===\n');
    const sampleStores = await stores.find({ isActive: true }).limit(5).toArray();
    for (const store of sampleStores) {
      console.log(`📍 ${store.name}`);
      console.log(`   - category: ${store.category}`);
      console.log(`   - subcategory: ${store.subcategory || 'Not set'}`);
      console.log(`   - subcategorySlug: ${store.subcategorySlug || 'Not set'}`);
      console.log(`   - subCategories: ${store.subCategories ? JSON.stringify(store.subCategories) : 'Not set'}`);
      console.log('');
    }

    // 5. Check stores structure
    console.log('\n=== STORE FIELDS ANALYSIS ===\n');
    const allStores = await stores.find({ isActive: true }).toArray();
    let withSubcategory = 0;
    let withSubcategorySlug = 0;
    let withSubCategories = 0;

    for (const store of allStores) {
      if (store.subcategory) withSubcategory++;
      if (store.subcategorySlug) withSubcategorySlug++;
      if (store.subCategories && store.subCategories.length > 0) withSubCategories++;
    }

    console.log(`Total active stores: ${allStores.length}`);
    console.log(`Stores with 'subcategory' field: ${withSubcategory}`);
    console.log(`Stores with 'subcategorySlug' field: ${withSubcategorySlug}`);
    console.log(`Stores with 'subCategories' array: ${withSubCategories}`);

    await mongoose.disconnect();
    console.log('\n✅ Done');

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

run();
