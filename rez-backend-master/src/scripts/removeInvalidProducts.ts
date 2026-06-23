/**
 * Script to remove invalid products from the database
 * Products that weren't properly updated or have mismatched data
 *
 * Run: npx ts-node src/scripts/removeInvalidProducts.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI as string;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); }
;
const DB_NAME = process.env.DB_NAME || 'test';

// SubSubCategories that indicate products weren't properly updated
const INVALID_SUB_SUB_CATEGORIES = [
  'Mutton/Lamb',
  'Seafood',
  'Poultry',
  'Processed Meats',
  'Seasonal Produce',
  'Exotic Vegetables',
  'Organic Vegetables'
];

// Old product names that weren't updated
const OLD_PRODUCT_NAMES = [
  'Eggs 30pc',
  'Chicken 1kg',
  'Pomfret',
  'Prawns',
  'Mutton 1kg',
  'Fish Curry Cut',
  'Chicken Breast',
  'Goat Meat',
  'Lamb Chops',
  'Salmon Fillet',
  'Tuna Steak',
  'Shrimp',
  'Lobster',
  'Crab',
  'Tomatoes 1kg',
  'Potatoes 1kg',
  'Onions 1kg',
  'Carrots 500g',
  'Spinach Bunch',
  'Cabbage',
  'Cauliflower',
  'Broccoli',
  'Capsicum',
  'Cucumber'
];

async function removeInvalidProducts() {
  try {
    console.log('🚀 Starting invalid product removal...');
    console.log(`📡 Connecting to MongoDB...`);

    await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db!;

    // Count total products before
    const totalBefore = await db.collection('products').countDocuments({});
    console.log(`📦 Total products before cleanup: ${totalBefore}\n`);

    // Find products with invalid subSubCategories
    console.log('========================================');
    console.log('FINDING INVALID PRODUCTS');
    console.log('========================================\n');

    const invalidBySubSubCat = await db.collection('products').find({
      subSubCategory: { $in: INVALID_SUB_SUB_CATEGORIES }
    }).toArray();

    console.log(`Found ${invalidBySubSubCat.length} products with invalid subSubCategories:`);
    for (const p of invalidBySubSubCat.slice(0, 20)) {
      console.log(`   - ${(p as any).name} | subSubCategory: ${(p as any).subSubCategory}`);
    }
    if (invalidBySubSubCat.length > 20) {
      console.log(`   ... and ${invalidBySubSubCat.length - 20} more`);
    }

    // Find products with old names
    const invalidByName = await db.collection('products').find({
      name: { $in: OLD_PRODUCT_NAMES }
    }).toArray();

    console.log(`\nFound ${invalidByName.length} products with old/invalid names:`);
    for (const p of invalidByName.slice(0, 20)) {
      console.log(`   - ${(p as any).name}`);
    }

    // Find products without proper pricing
    const invalidByPrice = await db.collection('products').find({
      $or: [
        { 'pricing.selling': { $exists: false } },
        { 'pricing.selling': null },
        { 'pricing.selling': 0 }
      ]
    }).toArray();

    console.log(`\nFound ${invalidByPrice.length} products without proper pricing`);

    // Collect all IDs to delete
    const allInvalidIds = new Set<string>();

    invalidBySubSubCat.forEach(p => allInvalidIds.add((p as any)._id.toString()));
    invalidByName.forEach(p => allInvalidIds.add((p as any)._id.toString()));
    invalidByPrice.forEach(p => allInvalidIds.add((p as any)._id.toString()));

    const idsToDelete = Array.from(allInvalidIds).map(id => new mongoose.Types.ObjectId(id));

    console.log(`\n========================================`);
    console.log(`DELETING ${idsToDelete.length} INVALID PRODUCTS`);
    console.log(`========================================\n`);

    if (idsToDelete.length > 0) {
      const result = await db.collection('products').deleteMany({
        _id: { $in: idsToDelete }
      });
      console.log(`✅ Deleted ${result.deletedCount} products`);
    } else {
      console.log('No invalid products to delete');
    }

    // Count total products after
    const totalAfter = await db.collection('products').countDocuments({});
    console.log(`\n📦 Total products after cleanup: ${totalAfter}`);
    console.log(`📉 Products removed: ${totalBefore - totalAfter}`);

    // Show sample of remaining products
    console.log('\n========================================');
    console.log('SAMPLE OF REMAINING PRODUCTS');
    console.log('========================================\n');

    const sampleProducts = await db.collection('products').find({}).limit(10).toArray();
    for (const p of sampleProducts) {
      const prod = p as any;
      console.log(`   ${prod.name}`);
      console.log(`      SubSubCategory: ${prod.subSubCategory}`);
      console.log(`      Price: ₹${prod.pricing?.selling}`);
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

removeInvalidProducts()
  .then(() => {
    console.log('✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
