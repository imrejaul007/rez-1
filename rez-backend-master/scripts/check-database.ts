import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || '';
const DB_NAME = process.env.DB_NAME || 'test';

async function checkDatabase() {
  try {
    console.log('\n🔍 CHECKING DATABASE STATE\n');
    console.log('='.repeat(60));

    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI, {
      dbName: DB_NAME
    });

    console.log(`\n✅ Connected to database: ${DB_NAME}`);
    console.log(`📊 MongoDB URI: ${MONGODB_URI.substring(0, 30)}...`);

    // Get all collections
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }

    const collections = await db.listCollections().toArray();

    console.log(`\n📚 Total Collections: ${collections.length}\n`);
    console.log('='.repeat(60));

    // Count documents in each collection
    const collectionStats = [];

    for (const collection of collections) {
      const collectionName = collection.name;
      const count = await db.collection(collectionName).countDocuments();

      collectionStats.push({
        name: collectionName,
        count
      });
    }

    // Sort by count descending
    collectionStats.sort((a, b) => b.count - a.count);

    // Display results
    console.log('\n📊 COLLECTION STATISTICS:\n');

    let totalDocuments = 0;
    for (const stat of collectionStats) {
      const emoji = stat.count === 0 ? '❌' : stat.count < 10 ? '⚠️ ' : '✅';
      console.log(`${emoji} ${stat.name.padEnd(30)} | ${stat.count.toString().padStart(6)} documents`);
      totalDocuments += stat.count;
    }

    console.log('\n' + '='.repeat(60));
    console.log(`\n📈 Total Documents Across All Collections: ${totalDocuments}\n`);

    // Sample data from key collections
    const keyCollections = ['users', 'stores', 'products', 'categories', 'orders'];

    console.log('\n🔎 SAMPLE DATA FROM KEY COLLECTIONS:\n');
    console.log('='.repeat(60));

    for (const collName of keyCollections) {
      const exists = collectionStats.find(c => c.name === collName);
      if (exists && exists.count > 0) {
        console.log(`\n📦 ${collName.toUpperCase()} (showing 1 sample):`);
        const sample = await db.collection(collName).findOne();
        if (sample) {
          // Show only key fields
          const keys = Object.keys(sample).slice(0, 8);
          console.log('   Fields:', keys.join(', '));

          // Show _id and a few key fields
          if (sample._id) console.log('   Sample _id:', sample._id);
          if (sample.name) console.log('   Name:', sample.name);
          if (sample.email) console.log('   Email:', sample.email);
          if (sample.phoneNumber) console.log('   Phone:', sample.phoneNumber);
        }
      } else {
        console.log(`\n❌ ${collName.toUpperCase()}: No data`);
      }
    }

    console.log('\n' + '='.repeat(60));

    // Close connection
    await mongoose.connection.close();
    console.log('\n✅ Database check complete\n');

  } catch (error: any) {
    console.error('\n❌ Error checking database:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

checkDatabase();
