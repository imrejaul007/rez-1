/**
 * Deep debug script to understand why mongoose seed isn't working
 */

const { MongoClient } = require('mongodb');
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };
const DB_NAME = 'test';

const CATEGORY_SLUGS = [
  'food-dining',
  'fashion',
  'beauty-wellness',
  'grocery-essentials',
  'healthcare',
  'fitness-sports',
  'education-learning',
  'home-services',
  'travel-experiences',
  'entertainment',
  'financial-lifestyle',
];

async function debugWithMongoDriver() {
  console.log('\n=== Testing with MongoDB Driver ===\n');
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db(DB_NAME);

    // List all databases
    const adminDb = client.db().admin();
    const databases = await adminDb.listDatabases();
    console.log('Available databases:', databases.databases.map(d => d.name).join(', '));

    // Check categories in test database
    const categories = await db.collection('categories').find({ slug: { $in: CATEGORY_SLUGS } }).toArray();
    console.log(`\nFound ${categories.length} categories in '${DB_NAME}' database`);

    for (const cat of categories) {
      console.log(`- ${cat.slug} (${cat._id}): vibes=${cat.vibes?.length || 0}`);
    }

    // Update all categories using MongoDB driver
    console.log('\n=== Updating all categories with MongoDB driver ===\n');

    const testData = {
      vibes: [{ id: 'test', name: 'Test', icon: '🧪', color: '#FF0000', description: 'Test' }],
      occasions: [{ id: 'test', name: 'Test', icon: '🎉', color: '#00FF00', tag: null, discount: 10 }],
      trendingHashtags: [{ id: 'test', tag: '#Test', count: 100, color: '#0000FF', trending: true }]
    };

    for (const cat of categories) {
      const result = await db.collection('categories').updateOne(
        { _id: cat._id },
        { $set: testData }
      );
      console.log(`Updated ${cat.slug}: matched=${result.matchedCount}, modified=${result.modifiedCount}`);
    }

    // Verify updates
    console.log('\n=== Verification ===\n');
    const updatedCategories = await db.collection('categories').find({ slug: { $in: CATEGORY_SLUGS } }).toArray();
    for (const cat of updatedCategories) {
      console.log(`- ${cat.slug}: vibes=${cat.vibes?.length || 0}, occasions=${cat.occasions?.length || 0}, hashtags=${cat.trendingHashtags?.length || 0}`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

async function debugWithMongoose() {
  console.log('\n=== Testing with Mongoose ===\n');

  try {
    await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
    console.log(`Connected to MongoDB via Mongoose (db: ${mongoose.connection.db.databaseName})`);

    // Check what collections exist
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name).join(', '));

    // Try to find categories directly
    const categories = await mongoose.connection.db.collection('categories').find({ slug: { $in: CATEGORY_SLUGS } }).toArray();
    console.log(`\nFound ${categories.length} categories via mongoose.connection.db.collection`);

    for (const cat of categories) {
      console.log(`- ${cat.slug}: vibes=${cat.vibes?.length || 0}`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

async function main() {
  await debugWithMongoDriver();
  await debugWithMongoose();
}

main();
