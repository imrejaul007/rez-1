/**
 * Cash Store Data Check & Seed Script
 *
 * Checks MallCategory + MallBrand data in MongoDB
 * Seeds default categories if none exist
 * Fixes brandCount sync issues
 *
 * Run: node scripts/checkCashStoreData.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'test';

// Default categories to seed if none exist
const DEFAULT_CATEGORIES = [
  { name: 'Fashion', slug: 'fashion', icon: 'shirt-outline', color: '#E8B896', backgroundColor: '#FFF0E6', maxCashback: 20, sortOrder: 1, isActive: true, isFeatured: true },
  { name: 'Electronics', slug: 'electronics', icon: 'laptop-outline', color: '#1a3a52', backgroundColor: '#dfebf7', maxCashback: 15, sortOrder: 2, isActive: true, isFeatured: true },
  { name: 'Food & Grocery', slug: 'food', icon: 'fast-food-outline', color: '#D4A07A', backgroundColor: '#faf1e0', maxCashback: 10, sortOrder: 3, isActive: true, isFeatured: false },
  { name: 'Travel', slug: 'travel', icon: 'airplane-outline', color: '#1a3a52', backgroundColor: '#dfebf7', maxCashback: 12, sortOrder: 4, isActive: true, isFeatured: true },
  { name: 'Beauty', slug: 'beauty', icon: 'sparkles-outline', color: '#E8B896', backgroundColor: '#FFF0E6', maxCashback: 18, sortOrder: 5, isActive: true, isFeatured: false },
  { name: 'Shopping', slug: 'shopping', icon: 'cart-outline', color: '#1a3a52', backgroundColor: '#dfebf7', maxCashback: 15, sortOrder: 6, isActive: true, isFeatured: false },
  { name: 'Entertainment', slug: 'entertainment', icon: 'game-controller-outline', color: '#D4A07A', backgroundColor: '#faf1e0', maxCashback: 8, sortOrder: 7, isActive: true, isFeatured: false },
];

async function main() {
  console.log('═══════════════════════════════════════════════');
  console.log('  Cash Store Data Check & Seed Script');
  console.log('═══════════════════════════════════════════════\n');

  // Connect
  console.log(`Connecting to MongoDB (${DB_NAME})...`);
  await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
  console.log('✅ Connected\n');

  const db = mongoose.connection.db;

  // ─── Check MallCategories ─────────────────────────
  console.log('─── MallCategories ───────────────────────────');
  const categoriesCol = db.collection('mallcategories');
  const totalCategories = await categoriesCol.countDocuments();
  const activeCategories = await categoriesCol.countDocuments({ isActive: true });
  const featuredCategories = await categoriesCol.countDocuments({ isFeatured: true });

  console.log(`  Total:    ${totalCategories}`);
  console.log(`  Active:   ${activeCategories}`);
  console.log(`  Featured: ${featuredCategories}`);

  if (totalCategories > 0) {
    const cats = await categoriesCol.find().sort({ sortOrder: 1 }).toArray();
    console.log('\n  Category List:');
    for (const cat of cats) {
      console.log(`    ${cat.isActive ? '✅' : '❌'} [${cat.sortOrder || '-'}] ${cat.name} (${cat.slug}) - ${cat.brandCount || 0} brands, max ${cat.maxCashback || 0}%`);
    }
  }

  // ─── Check MallBrands ─────────────────────────────
  console.log('\n─── MallBrands ───────────────────────────────');
  const brandsCol = db.collection('mallbrands');
  const totalBrands = await brandsCol.countDocuments();
  const activeBrands = await brandsCol.countDocuments({ isActive: true });
  const featuredBrands = await brandsCol.countDocuments({ isFeatured: true });
  const brandsWithoutCategory = await brandsCol.countDocuments({
    $or: [{ mallCategory: null }, { mallCategory: { $exists: false } }]
  });

  console.log(`  Total:              ${totalBrands}`);
  console.log(`  Active:             ${activeBrands}`);
  console.log(`  Featured:           ${featuredBrands}`);
  console.log(`  Without category:   ${brandsWithoutCategory}`);

  // Brands per category
  if (totalBrands > 0 && totalCategories > 0) {
    console.log('\n  Brands per Category:');
    const cats = await categoriesCol.find().sort({ sortOrder: 1 }).toArray();
    for (const cat of cats) {
      const count = await brandsCol.countDocuments({ mallCategory: cat._id, isActive: true });
      const mismatch = count !== (cat.brandCount || 0) ? ` ⚠️  DB says ${cat.brandCount || 0}` : '';
      console.log(`    ${cat.name}: ${count} active brands${mismatch}`);
    }
  }

  // Top brands by cashback
  if (totalBrands > 0) {
    console.log('\n  Top 5 Brands by Cashback:');
    const topBrands = await brandsCol.find({ isActive: true })
      .sort({ 'cashback.percentage': -1 })
      .limit(5)
      .toArray();
    for (const b of topBrands) {
      console.log(`    ${b.name} - ${b.cashback?.percentage || 0}% cashback (${b.tier || 'standard'})`);
    }
  }

  // ─── Seed Categories if Empty ─────────────────────
  if (totalCategories === 0) {
    console.log('\n═══════════════════════════════════════════════');
    console.log('  No categories found! Seeding defaults...');
    console.log('═══════════════════════════════════════════════\n');

    const now = new Date();
    const docsToInsert = DEFAULT_CATEGORIES.map(cat => ({
      ...cat,
      brandCount: 0,
      description: '',
      createdAt: now,
      updatedAt: now,
    }));

    const result = await categoriesCol.insertMany(docsToInsert);
    console.log(`  ✅ Seeded ${result.insertedCount} categories:`);
    for (const cat of DEFAULT_CATEGORIES) {
      console.log(`     - ${cat.name} (${cat.slug})`);
    }
  }

  // ─── Fix brandCount Sync ──────────────────────────
  if (totalCategories > 0 && totalBrands > 0) {
    console.log('\n─── Fixing brandCount Sync ───────────────────');
    const cats = await categoriesCol.find().toArray();
    let fixed = 0;
    for (const cat of cats) {
      const actualCount = await brandsCol.countDocuments({ mallCategory: cat._id, isActive: true });
      if (actualCount !== (cat.brandCount || 0)) {
        await categoriesCol.updateOne(
          { _id: cat._id },
          { $set: { brandCount: actualCount, updatedAt: new Date() } }
        );
        console.log(`  Fixed ${cat.name}: ${cat.brandCount || 0} → ${actualCount}`);
        fixed++;
      }
    }
    if (fixed === 0) {
      console.log('  ✅ All brandCounts are in sync');
    } else {
      console.log(`  ✅ Fixed ${fixed} categories`);
    }
  }

  // ─── Summary ──────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════');
  console.log('  Summary');
  console.log('═══════════════════════════════════════════════');
  console.log(`  Categories: ${totalCategories || DEFAULT_CATEGORIES.length} (${activeCategories || DEFAULT_CATEGORIES.length} active)`);
  console.log(`  Brands:     ${totalBrands} (${activeBrands} active)`);
  if (brandsWithoutCategory > 0) {
    console.log(`  ⚠️  ${brandsWithoutCategory} brands have no category assigned`);
  }
  console.log('');

  await mongoose.disconnect();
  console.log('Disconnected. Done.\n');
}

main().catch(err => {
  console.error('Error:', err);
  mongoose.disconnect();
  process.exit(1);
});
