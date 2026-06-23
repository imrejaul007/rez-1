/**
 * FAQs ID Standardization Migration Script
 *
 * Purpose: Remove duplicate id/uniqueId fields from FAQs collection
 *
 * Problem: 32 FAQs have redundant 'id' and 'uniqueId' fields in addition to MongoDB's '_id'
 * Solution:
 * 1. Drop indexes on 'id' and 'uniqueId' fields
 * 2. Remove the duplicate fields
 * 3. Keep only the MongoDB '_id' field
 *
 * Expected Changes:
 * - 32 FAQs will be updated
 * - Fields removed: 'id', 'uniqueId'
 * - Indexes dropped: 'id_1', 'uniqueId_1' (if they exist)
 * - Total FAQs count: remains 32
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };

async function migrateFAQs() {
  console.log('='.repeat(80));
  console.log('FAQs ID Standardization Migration');
  console.log('='.repeat(80));
  console.log();

  try {
    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    console.log();

    const db = mongoose.connection.db;
    const faqsCollection = db.collection('faqs');

    // Step 1: Count total FAQs
    const totalFAQs = await faqsCollection.countDocuments();
    console.log(`📊 Total FAQs in database: ${totalFAQs}`);
    console.log();

    // Step 2: Check existing indexes
    console.log('🔍 Checking existing indexes...');
    const indexes = await faqsCollection.indexes();
    console.log('   Current indexes:');
    indexes.forEach(index => {
      console.log(`      - ${index.name}: ${JSON.stringify(index.key)}`);
    });
    console.log();

    // Step 3: Drop problematic indexes
    console.log('🗑️  Dropping indexes on id and uniqueId fields...');
    const indexesToDrop = ['id_1', 'uniqueId_1'];
    for (const indexName of indexesToDrop) {
      try {
        const indexExists = indexes.find(idx => idx.name === indexName);
        if (indexExists) {
          await faqsCollection.dropIndex(indexName);
          console.log(`   ✅ Dropped index: ${indexName}`);
        } else {
          console.log(`   ℹ️  Index does not exist: ${indexName}`);
        }
      } catch (error) {
        if (error.code === 27 || error.message.includes('index not found')) {
          console.log(`   ℹ️  Index does not exist: ${indexName}`);
        } else {
          throw error;
        }
      }
    }
    console.log();

    // Step 4: Find FAQs with duplicate id/uniqueId fields
    const faqsWithDuplicateIds = await faqsCollection.find({
      $or: [
        { id: { $exists: true } },
        { uniqueId: { $exists: true } }
      ]
    }).toArray();

    console.log(`🔍 FAQs with duplicate ID fields: ${faqsWithDuplicateIds.length}`);
    console.log();

    if (faqsWithDuplicateIds.length === 0) {
      console.log('✨ No FAQs need migration. All FAQs are already standardized.');
      return;
    }

    // Step 5: Display sample before migration
    console.log('📋 Sample FAQ before migration:');
    const sample = faqsWithDuplicateIds[0];
    console.log(JSON.stringify({
      _id: sample._id,
      id: sample.id,
      uniqueId: sample.uniqueId,
      question: sample.question?.substring(0, 50) + '...',
      hasOtherFields: Object.keys(sample).filter(k => !['_id', 'id', 'uniqueId', 'question', 'answer'].includes(k)).length > 0
    }, null, 2));
    console.log();

    // Step 6: Perform migration
    console.log('🔄 Starting migration...');
    const result = await faqsCollection.updateMany(
      {
        $or: [
          { id: { $exists: true } },
          { uniqueId: { $exists: true } }
        ]
      },
      {
        $unset: {
          id: "",
          uniqueId: ""
        }
      }
    );

    console.log(`✅ Migration completed!`);
    console.log(`   - Matched: ${result.matchedCount} FAQs`);
    console.log(`   - Modified: ${result.modifiedCount} FAQs`);
    console.log();

    // Step 7: Verify migration
    console.log('🔎 Verifying migration...');
    const remainingDuplicates = await faqsCollection.countDocuments({
      $or: [
        { id: { $exists: true } },
        { uniqueId: { $exists: true } }
      ]
    });

    const finalCount = await faqsCollection.countDocuments();

    console.log(`   - FAQs with duplicate IDs remaining: ${remainingDuplicates}`);
    console.log(`   - Total FAQs after migration: ${finalCount}`);
    console.log();

    if (remainingDuplicates === 0 && finalCount === totalFAQs) {
      console.log('✨ SUCCESS! All FAQs have been standardized.');
      console.log('   - No duplicate ID fields remain');
      console.log('   - Total count unchanged');
    } else {
      console.log('⚠️  WARNING: Verification failed!');
      if (remainingDuplicates > 0) {
        console.log(`   - ${remainingDuplicates} FAQs still have duplicate IDs`);
      }
      if (finalCount !== totalFAQs) {
        console.log(`   - FAQ count changed from ${totalFAQs} to ${finalCount}`);
      }
    }

    // Step 8: Display sample after migration
    console.log();
    console.log('📋 Sample FAQ after migration:');
    const updatedSample = await faqsCollection.findOne({ _id: sample._id });
    console.log(JSON.stringify({
      _id: updatedSample._id,
      question: updatedSample.question?.substring(0, 50) + '...',
      answer: updatedSample.answer?.substring(0, 50) + '...',
      hasIdField: 'id' in updatedSample,
      hasUniqueIdField: 'uniqueId' in updatedSample
    }, null, 2));

    // Step 9: Display new indexes
    console.log();
    console.log('📊 Final indexes:');
    const finalIndexes = await faqsCollection.indexes();
    finalIndexes.forEach(index => {
      console.log(`   - ${index.name}: ${JSON.stringify(index.key)}`);
    });

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
migrateFAQs()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
