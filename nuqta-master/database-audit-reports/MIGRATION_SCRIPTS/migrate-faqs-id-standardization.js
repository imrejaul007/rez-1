// SECURITY: hard-coded MongoDB credentials replaced with env-var reference.
// Set MONGODB_URI in your environment before running this script.

/**
 * FAQs ID Standardization Migration
 *
 * PROBLEM: All 32 FAQ documents have both '_id' and 'id' fields
 * SOLUTION: Remove 'id' field, keep only MongoDB '_id'
 *
 * Priority: HIGH
 * Risk: LOW
 * Affected: 32 documents
 */

const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) { console.error('MONGO_URI not set'); process.exit(1); };
const DATABASE_NAME = 'test';
const COLLECTION_NAME = 'faqs';

async function migrate() {
  const client = new MongoClient(MONGO_URI);

  try {
    console.log('🔌 Connecting to MongoDB...');
    await client.connect();
    const db = client.db(DATABASE_NAME);
    const collection = db.collection(COLLECTION_NAME);

    // Step 1: Count documents with dual IDs
    console.log('\n📊 Analyzing collection...');
    const totalDocs = await collection.countDocuments();
    const docsWithDualIds = await collection.countDocuments({ id: { $exists: true } });

    console.log(`Total documents: ${totalDocs}`);
    console.log(`Documents with 'id' field: ${docsWithDualIds}`);

    if (docsWithDualIds === 0) {
      console.log('✅ No migration needed - all documents are clean!');
      return;
    }

    // Step 2: Show sample before migration
    console.log('\n📝 Sample document BEFORE migration:');
    const sampleBefore = await collection.findOne({ id: { $exists: true } });
    console.log(JSON.stringify(sampleBefore, null, 2));

    // Step 3: Create backup
    console.log('\n💾 Creating backup...');
    const backup = await collection.find({ id: { $exists: true } }).toArray();
    console.log(`Backed up ${backup.length} documents`);

    // Step 4: Confirm migration
    console.log('\n⚠️  MIGRATION WILL:');
    console.log(`   - Remove 'id' field from ${docsWithDualIds} documents`);
    console.log(`   - Keep '_id' field (MongoDB standard)`);
    console.log(`   - This change is IRREVERSIBLE without backup`);

    // In production, you'd want user confirmation here
    // For now, we'll proceed automatically

    // Step 5: Perform migration
    console.log('\n🔄 Performing migration...');
    const result = await collection.updateMany(
      { id: { $exists: true } },
      { $unset: { id: "" } }
    );

    console.log(`✅ Migration complete!`);
    console.log(`   Modified: ${result.modifiedCount} documents`);

    // Step 6: Verify migration
    console.log('\n🔍 Verifying migration...');
    const remainingDualIds = await collection.countDocuments({ id: { $exists: true } });

    if (remainingDualIds === 0) {
      console.log('✅ Verification passed - no documents with dual IDs');
    } else {
      console.log(`⚠️  Warning: ${remainingDualIds} documents still have 'id' field`);
    }

    // Step 7: Show sample after migration
    console.log('\n📝 Sample document AFTER migration:');
    const sampleAfter = await collection.findOne({ _id: sampleBefore._id });
    console.log(JSON.stringify(sampleAfter, null, 2));

    // Step 8: Save backup to file
    const fs = require('fs');
    const backupPath = `./faqs-backup-${Date.now()}.json`;
    fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));
    console.log(`\n💾 Backup saved to: ${backupPath}`);

    console.log('\n✨ Migration successful!');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    await client.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Rollback function
async function rollback(backupFile) {
  const client = new MongoClient(MONGO_URI);

  try {
    console.log('🔄 Starting rollback...');
    await client.connect();
    const db = client.db(DATABASE_NAME);
    const collection = db.collection(COLLECTION_NAME);

    const fs = require('fs');
    const backup = JSON.parse(fs.readFileSync(backupFile, 'utf8'));

    console.log(`📥 Restoring ${backup.length} documents...`);

    for (const doc of backup) {
      await collection.updateOne(
        { _id: doc._id },
        { $set: { id: doc.id } }
      );
    }

    console.log('✅ Rollback complete!');

  } catch (error) {
    console.error('❌ Rollback failed:', error);
    throw error;
  } finally {
    await client.close();
  }
}

// Run migration
if (require.main === module) {
  // Check if rollback is requested
  if (process.argv[2] === 'rollback' && process.argv[3]) {
    rollback(process.argv[3]).catch(console.error);
  } else {
    migrate().catch(console.error);
  }
}

module.exports = { migrate, rollback };
