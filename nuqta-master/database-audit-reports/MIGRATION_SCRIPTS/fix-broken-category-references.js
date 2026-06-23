// SECURITY: hard-coded MongoDB credentials replaced with env-var reference.
// Set MONGODB_URI in your environment before running this script.

/**
 * Fix Broken Category References
 *
 * PROBLEM: 7 products reference categories that don't exist
 * SOLUTION: Either create missing categories or update products to valid categories
 *
 * Priority: HIGH
 * Risk: MEDIUM
 * Affected: 7 products
 */

const { MongoClient, ObjectId } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) { console.error('MONGO_URI not set'); process.exit(1); };
const DATABASE_NAME = 'test';

async function analyzeAndFix() {
  const client = new MongoClient(MONGO_URI);

  try {
    console.log('🔌 Connecting to MongoDB...');
    await client.connect();
    const db = client.db(DATABASE_NAME);
    const products = db.collection('products');
    const categories = db.collection('categories');

    // Step 1: Get all valid category IDs
    console.log('\n📊 Analyzing data...');
    const validCategories = await categories.find({}).toArray();
    const validCategoryIds = new Set(validCategories.map(c => c._id.toString()));

    console.log(`Found ${validCategories.length} valid categories`);

    // Step 2: Find products with invalid category references
    const allProducts = await products.find({ category: { $exists: true } }).toArray();
    const orphanedProducts = [];

    for (const product of allProducts) {
      if (product.category && !validCategoryIds.has(product.category.toString())) {
        orphanedProducts.push(product);
      }
    }

    console.log(`\n⚠️  Found ${orphanedProducts.length} products with invalid category references:`);

    // Group by invalid category ID
    const missingCategories = {};
    orphanedProducts.forEach(product => {
      const catId = product.category.toString();
      if (!missingCategories[catId]) {
        missingCategories[catId] = [];
      }
      missingCategories[catId].push(product);
    });

    // Step 3: Display orphaned products
    console.log('\n📋 Orphaned products by missing category:');
    for (const [catId, prods] of Object.entries(missingCategories)) {
      console.log(`\nMissing Category ID: ${catId}`);
      console.log(`Products affected: ${prods.length}`);
      prods.forEach(p => {
        console.log(`  - ${p.name || p.title} (${p._id})`);
      });
    }

    // Step 4: Show available categories
    console.log('\n📂 Available categories:');
    validCategories.forEach(cat => {
      console.log(`  - ${cat.name} (${cat._id})`);
    });

    // Step 5: Suggest fix strategies
    console.log('\n💡 Recommended fix strategies:');
    console.log('1. OPTION A: Create missing categories');
    console.log('2. OPTION B: Reassign products to existing categories');
    console.log('3. OPTION C: Set products to default "Uncategorized" category');

    // Step 6: Implement OPTION C (safest - create "Uncategorized" and reassign)
    console.log('\n🔄 Implementing OPTION C: Create "Uncategorized" category...');

    // Check if "Uncategorized" already exists
    let uncategorized = await categories.findOne({ slug: 'uncategorized' });

    if (!uncategorized) {
      console.log('Creating "Uncategorized" category...');
      const result = await categories.insertOne({
        name: 'Uncategorized',
        slug: 'uncategorized',
        description: 'Products without assigned category',
        icon: '📦',
        isActive: true,
        sortOrder: 999,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      uncategorized = { _id: result.insertedId };
      console.log(`✅ Created category: ${uncategorized._id}`);
    } else {
      console.log(`✅ Using existing "Uncategorized" category: ${uncategorized._id}`);
    }

    // Step 7: Update orphaned products
    if (orphanedProducts.length > 0) {
      console.log(`\n🔄 Updating ${orphanedProducts.length} products...`);

      const productIds = orphanedProducts.map(p => p._id);
      const updateResult = await products.updateMany(
        { _id: { $in: productIds } },
        { $set: { category: uncategorized._id } }
      );

      console.log(`✅ Updated ${updateResult.modifiedCount} products`);
    }

    // Step 8: Verify fix
    console.log('\n🔍 Verifying fix...');
    const stillOrphaned = [];

    const updatedProducts = await products.find({ _id: { $in: orphanedProducts.map(p => p._id) } }).toArray();

    for (const product of updatedProducts) {
      if (product.category && !validCategoryIds.has(product.category.toString()) && product.category.toString() !== uncategorized._id.toString()) {
        stillOrphaned.push(product);
      }
    }

    if (stillOrphaned.length === 0) {
      console.log('✅ Verification passed - all products have valid categories!');
    } else {
      console.log(`⚠️  Warning: ${stillOrphaned.length} products still orphaned`);
    }

    // Step 9: Create backup
    console.log('\n💾 Creating backup...');
    const fs = require('fs');
    const backupPath = `./category-fix-backup-${Date.now()}.json`;
    fs.writeFileSync(backupPath, JSON.stringify({
      orphanedProducts,
      uncategorizedId: uncategorized._id,
      timestamp: new Date().toISOString()
    }, null, 2));
    console.log(`Backup saved to: ${backupPath}`);

    console.log('\n✨ Migration successful!');

    // Return summary
    return {
      totalOrphaned: orphanedProducts.length,
      uncategorizedId: uncategorized._id,
      fixed: updateResult?.modifiedCount || 0
    };

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    await client.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Alternative: Manual category assignment
async function assignCategories(mappings) {
  /**
   * Usage:
   * assignCategories({
   *   '68ee29d08c4fa11015d70340': '68ecdb9f55f086b04de299ef',  // Map missing cat to existing
   *   '68ee29d08c4fa11015d70342': '68ecdb9f55f086b04de299f0'
   * })
   */
  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    const db = client.db(DATABASE_NAME);
    const products = db.collection('products');

    console.log('🔄 Applying manual category mappings...');

    for (const [oldCatId, newCatId] of Object.entries(mappings)) {
      const result = await products.updateMany(
        { category: oldCatId },
        { $set: { category: new ObjectId(newCatId) } }
      );
      console.log(`✅ Mapped ${oldCatId} → ${newCatId}: ${result.modifiedCount} products updated`);
    }

    console.log('✅ Manual mapping complete!');

  } catch (error) {
    console.error('❌ Mapping failed:', error);
    throw error;
  } finally {
    await client.close();
  }
}

// Run
if (require.main === module) {
  analyzeAndFix().catch(console.error);
}

module.exports = { analyzeAndFix, assignCategories };
