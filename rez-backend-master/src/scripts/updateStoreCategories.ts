/**
 * Update Store Categories Script
 * Ensures each store has correct category (main) and subcategory ObjectIds
 * Based on the subcategorySlug already assigned to each store
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI as string;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); }
;
const DB_NAME = process.env.DB_NAME || 'test';

// Mapping of subcategory slug to parent category slug
const SUBCATEGORY_TO_PARENT: Record<string, string> = {
  // Food & Dining
  'cafes': 'food-dining',
  'qsr-fast-food': 'food-dining',
  'family-restaurants': 'food-dining',
  'fine-dining': 'food-dining',
  'ice-cream-dessert': 'food-dining',
  'bakery-confectionery': 'food-dining',
  'cloud-kitchens': 'food-dining',
  'street-food': 'food-dining',

  // Grocery & Essentials
  'supermarkets': 'grocery-essentials',
  'kirana-stores': 'grocery-essentials',
  'fresh-vegetables': 'grocery-essentials',
  'meat-fish': 'grocery-essentials',
  'dairy': 'grocery-essentials',
  'packaged-goods': 'grocery-essentials',
  'water-cans': 'grocery-essentials',

  // Beauty & Wellness
  'salons': 'beauty-wellness',
  'spa-massage': 'beauty-wellness',
  'beauty-services': 'beauty-wellness',
  'cosmetology': 'beauty-wellness',
  'dermatology': 'beauty-wellness',
  'skincare-cosmetics': 'beauty-wellness',
  'nail-studios': 'beauty-wellness',
  'grooming-men': 'beauty-wellness',

  // Healthcare
  'pharmacy': 'healthcare',
  'clinics': 'healthcare',
  'diagnostics': 'healthcare',
  'dental': 'healthcare',
  'physiotherapy': 'healthcare',
  'home-nursing': 'healthcare',
  'vision-eyewear': 'healthcare',

  // Fashion
  'footwear': 'fashion',
  'bags-accessories': 'fashion',
  'electronics': 'fashion',
  'mobile-accessories': 'fashion',
  'watches': 'fashion',
  'jewelry': 'fashion',
  'local-brands': 'fashion',

  // Fitness & Sports
  'gyms': 'fitness-sports',
  'crossfit': 'fitness-sports',
  'yoga': 'fitness-sports',
  'zumba': 'fitness-sports',
  'martial-arts': 'fitness-sports',
  'sports-academies': 'fitness-sports',
  'sportswear': 'fitness-sports',

  // Education & Learning
  'coaching-centers': 'education-learning',
  'skill-development': 'education-learning',
  'music-dance-classes': 'education-learning',
  'art-craft': 'education-learning',
  'vocational': 'education-learning',
  'language-training': 'education-learning',

  // Home Services
  'ac-repair': 'home-services',
  'plumbing': 'home-services',
  'electrical': 'home-services',
  'cleaning': 'home-services',
  'pest-control': 'home-services',
  'house-shifting': 'home-services',
  'laundry-dry-cleaning': 'home-services',
  'home-tutors': 'home-services',

  // Travel & Experiences
  'hotels': 'travel-experiences',
  'intercity-travel': 'travel-experiences',
  'taxis': 'travel-experiences',
  'bike-rentals': 'travel-experiences',
  'weekend-getaways': 'travel-experiences',
  'tours': 'travel-experiences',
  'activities': 'travel-experiences',

  // Entertainment
  'movies': 'entertainment',
  'live-events': 'entertainment',
  'festivals': 'entertainment',
  'workshops': 'entertainment',
  'amusement-parks': 'entertainment',
  'gaming-cafes': 'entertainment',
  'vr-ar-experiences': 'entertainment',

  // Financial Lifestyle
  'bill-payments': 'financial-lifestyle',
  'mobile-recharge': 'financial-lifestyle',
  'broadband': 'financial-lifestyle',
  'cable-ott': 'financial-lifestyle',
  'insurance': 'financial-lifestyle',
  'gold-savings': 'financial-lifestyle',
  'donations': 'financial-lifestyle',
};

async function updateStoreCategories() {
  try {
    console.log('🚀 Starting Store Category Update...');
    console.log(`📡 Connecting to MongoDB...`);

    await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db!;
    const categoriesCollection = db.collection('categories');
    const storesCollection = db.collection('stores');

    // Step 1: Build category slug → ObjectId mapping
    console.log('📦 Building Category Mapping...\n');
    const categoryMapping: Record<string, mongoose.Types.ObjectId> = {};

    const allCategories = await categoriesCollection.find({}).toArray();
    for (const cat of allCategories) {
      categoryMapping[cat.slug] = cat._id as mongoose.Types.ObjectId;
    }

    console.log(`   Found ${allCategories.length} categories in database\n`);

    // Step 2: Get all stores
    const stores = await storesCollection.find({}).toArray();
    console.log(`📦 Processing ${stores.length} stores...\n`);

    let updatedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const store of stores) {
      const subcategorySlug = store.subcategorySlug;

      if (!subcategorySlug) {
        console.log(`   ⚠️ ${store.name}: No subcategorySlug assigned`);
        errors.push(`${store.name}: No subcategorySlug`);
        errorCount++;
        continue;
      }

      // Find parent category slug
      const parentSlug = SUBCATEGORY_TO_PARENT[subcategorySlug];
      if (!parentSlug) {
        console.log(`   ⚠️ ${store.name}: Unknown subcategory '${subcategorySlug}'`);
        errors.push(`${store.name}: Unknown subcategory '${subcategorySlug}'`);
        errorCount++;
        continue;
      }

      // Get ObjectIds
      const mainCategoryId = categoryMapping[parentSlug];
      const subcategoryId = categoryMapping[subcategorySlug];

      if (!mainCategoryId) {
        console.log(`   ⚠️ ${store.name}: Main category '${parentSlug}' not found in DB`);
        errors.push(`${store.name}: Main category '${parentSlug}' not in DB`);
        errorCount++;
        continue;
      }

      if (!subcategoryId) {
        console.log(`   ⚠️ ${store.name}: Subcategory '${subcategorySlug}' not found in DB`);
        errors.push(`${store.name}: Subcategory '${subcategorySlug}' not in DB`);
        errorCount++;
        continue;
      }

      // Update store
      await storesCollection.updateOne(
        { _id: store._id },
        {
          $set: {
            category: mainCategoryId,
            subcategory: subcategoryId,
            updatedAt: new Date(),
          },
        }
      );

      console.log(`   ✅ ${store.name}: ${parentSlug} → ${subcategorySlug}`);
      updatedCount++;
    }

    console.log('\n========================================');
    console.log('📊 UPDATE SUMMARY');
    console.log('========================================');
    console.log(`Total Stores: ${stores.length}`);
    console.log(`Successfully Updated: ${updatedCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log('========================================\n');

    if (errors.length > 0) {
      console.log('❌ ERRORS:');
      errors.forEach((e) => console.log(`   - ${e}`));
      console.log('');
    }

    // Verification: Check a few stores
    console.log('📊 VERIFICATION (Sample Stores):');
    const sampleStores = await storesCollection
      .find({})
      .limit(5)
      .toArray();

    for (const store of sampleStores) {
      const mainCat = await categoriesCollection.findOne({ _id: store.category });
      const subCat = await categoriesCollection.findOne({ _id: store.subcategory });
      console.log(`   ${store.name}:`);
      console.log(`      category: ${mainCat?.name || 'NOT FOUND'} (${mainCat?.slug || 'N/A'})`);
      console.log(`      subcategory: ${subCat?.name || 'NOT FOUND'} (${subCat?.slug || 'N/A'})`);
      console.log(`      subcategorySlug: ${store.subcategorySlug}`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

updateStoreCategories()
  .then(() => {
    console.log('✅ Store category update completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
