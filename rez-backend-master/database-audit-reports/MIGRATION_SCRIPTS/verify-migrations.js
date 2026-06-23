/**
 * Migration Verification Script
 *
 * Verifies the results of both migration scripts:
 * 1. FAQs ID standardization
 * 2. Broken category references fix
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };

async function verifyMigrations() {
  console.log('='.repeat(80));
  console.log('Migration Verification Report');
  console.log('='.repeat(80));
  console.log();

  try {
    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    console.log();

    const db = mongoose.connection.db;

    // ========================================================================
    // VERIFICATION 1: FAQs ID Standardization
    // ========================================================================
    console.log('1️⃣  FAQs ID Standardization Verification');
    console.log('-'.repeat(80));

    const faqsCollection = db.collection('faqs');
    const totalFAQs = await faqsCollection.countDocuments();
    const faqsWithDuplicateIds = await faqsCollection.find({
      $or: [
        { id: { $exists: true } },
        { uniqueId: { $exists: true } }
      ]
    }).toArray();

    console.log(`   Total FAQs: ${totalFAQs}`);
    console.log(`   FAQs with duplicate ID fields: ${faqsWithDuplicateIds.length}`);

    if (faqsWithDuplicateIds.length === 0) {
      console.log('   ✅ PASS: All FAQs are standardized (no duplicate id/uniqueId fields)');
    } else {
      console.log('   ❌ FAIL: Some FAQs still have duplicate ID fields');
      console.log('   Problematic FAQs:');
      faqsWithDuplicateIds.forEach(faq => {
        console.log(`      - ${faq._id}: has ${faq.id ? 'id' : ''}${faq.id && faq.uniqueId ? ',' : ''}${faq.uniqueId ? 'uniqueId' : ''}`);
      });
    }
    console.log();

    // ========================================================================
    // VERIFICATION 2: Category References
    // ========================================================================
    console.log('2️⃣  Category References Verification');
    console.log('-'.repeat(80));

    const productsCollection = db.collection('products');
    const categoriesCollection = db.collection('categories');

    const totalProducts = await productsCollection.countDocuments();
    const validCategories = await categoriesCollection.find({}).toArray();
    const validCategoryIds = validCategories.map(c => c._id.toString());

    console.log(`   Total products: ${totalProducts}`);
    console.log(`   Total categories: ${validCategories.length}`);

    const allProducts = await productsCollection.find({
      category: { $exists: true, $ne: null }
    }).toArray();

    const productsWithInvalidCategories = allProducts.filter(p => {
      const categoryId = p.category.toString();
      return !validCategoryIds.includes(categoryId);
    });

    console.log(`   Products with category: ${allProducts.length}`);
    console.log(`   Products with invalid category references: ${productsWithInvalidCategories.length}`);

    if (productsWithInvalidCategories.length === 0) {
      console.log('   ✅ PASS: All product category references are valid');
    } else {
      console.log('   ❌ FAIL: Some products have invalid category references');
      console.log('   Problematic products:');
      productsWithInvalidCategories.forEach(product => {
        console.log(`      - ${product.name || 'Unnamed'} (${product._id}): category ${product.category}`);
      });
    }
    console.log();

    // ========================================================================
    // SUMMARY
    // ========================================================================
    console.log('='.repeat(80));
    console.log('📊 VERIFICATION SUMMARY');
    console.log('='.repeat(80));

    const faqsPassed = faqsWithDuplicateIds.length === 0;
    const categoryPassed = productsWithInvalidCategories.length === 0;

    console.log();
    console.log('FAQs Migration:');
    console.log(`   Status: ${faqsPassed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`   Expected FAQs: 32`);
    console.log(`   Actual FAQs: ${totalFAQs}`);
    console.log(`   Duplicate IDs: ${faqsWithDuplicateIds.length} (should be 0)`);
    console.log();

    console.log('Category References Migration:');
    console.log(`   Status: ${categoryPassed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`   Total Products: ${totalProducts}`);
    console.log(`   Invalid References: ${productsWithInvalidCategories.length} (should be 0)`);
    console.log();

    if (faqsPassed && categoryPassed) {
      console.log('🎉 ALL MIGRATIONS VERIFIED SUCCESSFULLY!');
    } else {
      console.log('⚠️  SOME MIGRATIONS FAILED VERIFICATION');
      if (!faqsPassed) {
        console.log('   - FAQs migration needs attention');
      }
      if (!categoryPassed) {
        console.log('   - Category references migration needs attention');
      }
    }

    console.log();
    console.log('='.repeat(80));

    // Return exit code based on verification
    process.exitCode = (faqsPassed && categoryPassed) ? 0 : 1;

  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    console.error(error);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run verification
verifyMigrations()
  .then(() => {
    process.exit(process.exitCode || 0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
