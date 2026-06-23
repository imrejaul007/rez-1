/**
 * Fix Broken Category References Migration Script
 *
 * Purpose: Fix products that reference non-existent categories
 *
 * Problem: 7 products reference category IDs that don't exist in the categories collection
 * Solution: Either remove the invalid reference or link to "Uncategorized" category
 *
 * Expected Changes:
 * - Up to 7 products will be updated
 * - Invalid category references will be removed or set to "Uncategorized"
 * - Total products count: remains the same
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };

async function fixBrokenCategoryReferences() {
  console.log('='.repeat(80));
  console.log('Fix Broken Category References Migration');
  console.log('='.repeat(80));
  console.log();

  try {
    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    console.log();

    const db = mongoose.connection.db;
    const productsCollection = db.collection('products');
    const categoriesCollection = db.collection('categories');

    // Step 1: Get all valid category IDs
    console.log('📊 Fetching valid categories...');
    const validCategories = await categoriesCollection.find({}).toArray();
    const validCategoryIds = validCategories.map(c => c._id.toString());
    console.log(`   - Total categories: ${validCategories.length}`);
    console.log();

    // Step 2: Find "Uncategorized" category or create it
    let uncategorizedCategory = validCategories.find(c =>
      c.name && c.name.toLowerCase() === 'uncategorized'
    );

    if (!uncategorizedCategory) {
      console.log('📦 Creating "Uncategorized" category...');
      const result = await categoriesCollection.insertOne({
        name: 'Uncategorized',
        slug: 'uncategorized',
        description: 'Products without a valid category',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      uncategorizedCategory = { _id: result.insertedId, name: 'Uncategorized' };
      validCategoryIds.push(result.insertedId.toString());
      console.log(`   ✅ Created category with ID: ${result.insertedId}`);
    } else {
      console.log(`   ✅ "Uncategorized" category found: ${uncategorizedCategory._id}`);
    }
    console.log();

    // Step 3: Count total products
    const totalProducts = await productsCollection.countDocuments();
    console.log(`📦 Total products in database: ${totalProducts}`);
    console.log();

    // Step 4: Find products with invalid category references
    const allProducts = await productsCollection.find({ category: { $exists: true, $ne: null } }).toArray();
    const productsWithInvalidCategories = allProducts.filter(p => {
      const categoryId = p.category.toString();
      return !validCategoryIds.includes(categoryId);
    });

    console.log(`🔍 Products with invalid category references: ${productsWithInvalidCategories.length}`);
    console.log();

    if (productsWithInvalidCategories.length === 0) {
      console.log('✨ No products need fixing. All category references are valid.');
      return;
    }

    // Step 5: Display products that will be fixed
    console.log('📋 Products to be fixed:');
    productsWithInvalidCategories.forEach((product, index) => {
      console.log(`   ${index + 1}. ${product.name || 'Unnamed Product'}`);
      console.log(`      - Current category ID: ${product.category}`);
      console.log(`      - Product ID: ${product._id}`);
    });
    console.log();

    // Step 6: Perform migration
    console.log('🔄 Starting migration...');
    const invalidCategoryIds = productsWithInvalidCategories.map(p => p.category);

    const result = await productsCollection.updateMany(
      { category: { $in: invalidCategoryIds } },
      { $set: { category: uncategorizedCategory._id } }
    );

    console.log(`✅ Migration completed!`);
    console.log(`   - Matched: ${result.matchedCount} products`);
    console.log(`   - Modified: ${result.modifiedCount} products`);
    console.log(`   - New category: ${uncategorizedCategory.name} (${uncategorizedCategory._id})`);
    console.log();

    // Step 7: Verify migration
    console.log('🔎 Verifying migration...');
    const allProductsAfter = await productsCollection.find({ category: { $exists: true, $ne: null } }).toArray();
    const remainingInvalid = allProductsAfter.filter(p => {
      const categoryId = p.category.toString();
      return !validCategoryIds.includes(categoryId);
    });

    const finalProductCount = await productsCollection.countDocuments();

    console.log(`   - Products with invalid categories remaining: ${remainingInvalid.length}`);
    console.log(`   - Total products after migration: ${finalProductCount}`);
    console.log();

    if (remainingInvalid.length === 0 && finalProductCount === totalProducts) {
      console.log('✨ SUCCESS! All product category references are now valid.');
      console.log('   - No invalid category references remain');
      console.log('   - Total product count unchanged');
    } else {
      console.log('⚠️  WARNING: Verification failed!');
      if (remainingInvalid.length > 0) {
        console.log(`   - ${remainingInvalid.length} products still have invalid categories`);
        console.log('   - Invalid products:');
        remainingInvalid.forEach(p => {
          console.log(`     • ${p.name} (${p._id}) -> category: ${p.category}`);
        });
      }
      if (finalProductCount !== totalProducts) {
        console.log(`   - Product count changed from ${totalProducts} to ${finalProductCount}`);
      }
    }

    // Step 8: Summary of affected products
    console.log();
    console.log('📊 Migration Summary:');
    console.log(`   - Products moved to "Uncategorized": ${result.modifiedCount}`);
    const uncategorizedProducts = await productsCollection.countDocuments({
      category: uncategorizedCategory._id
    });
    console.log(`   - Total products in "Uncategorized": ${uncategorizedProducts}`);

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log();
    console.log('🔌 Database connection closed');
    console.log('='.repeat(80));
  }
}

// Run migration
fixBrokenCategoryReferences()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
