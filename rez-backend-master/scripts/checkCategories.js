const mongoose = require('mongoose');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };
const DB_NAME = 'test';

async function checkCategories() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
    console.log('Connected to MongoDB!\n');

    const db = mongoose.connection.db;

    // Check all collections
    const collections = await db.listCollections().toArray();
    console.log('=== Collections in database ===');
    collections.forEach(col => console.log(`- ${col.name}`));
    console.log('');

    // Check categories collection
    const categoriesCollection = db.collection('categories');
    const totalCategories = await categoriesCollection.countDocuments();
    console.log(`=== Total Categories: ${totalCategories} ===\n`);

    // Get category types distribution
    const typeDistribution = await categoriesCollection.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();

    console.log('=== Categories by Type ===');
    typeDistribution.forEach(t => console.log(`${t._id || 'null'}: ${t.count}`));
    console.log('');

    // Get sample categories for each type
    const types = ['going_out', 'home_delivery', 'general', 'earn', 'play'];

    for (const type of types) {
      const samples = await categoriesCollection.find({ type })
        .limit(5)
        .project({ name: 1, slug: 1, type: 1, icon: 1, isActive: 1 })
        .toArray();

      if (samples.length > 0) {
        console.log(`\n=== Sample ${type} Categories (${samples.length}) ===`);
        samples.forEach(cat => {
          console.log(`- ${cat.name} (${cat.slug}) | icon: ${cat.icon || 'none'} | active: ${cat.isActive}`);
        });
      }
    }

    // Check if there are categories without type
    const noType = await categoriesCollection.find({ type: { $exists: false } }).limit(5).toArray();
    if (noType.length > 0) {
      console.log(`\n=== Categories without type ===`);
      noType.forEach(cat => console.log(`- ${cat.name} (${cat.slug})`));
    }

    // Get first 20 categories to see structure
    console.log('\n=== First 20 Categories (all fields) ===');
    const allCategories = await categoriesCollection.find({}).limit(20).toArray();
    allCategories.forEach((cat, i) => {
      console.log(`${i + 1}. ${cat.name}`);
      console.log(`   slug: ${cat.slug}`);
      console.log(`   type: ${cat.type}`);
      console.log(`   icon: ${cat.icon || 'none'}`);
      console.log(`   image: ${cat.image || 'none'}`);
      console.log(`   isActive: ${cat.isActive}`);
      console.log(`   metadata: ${JSON.stringify(cat.metadata || {})}`);
      console.log('');
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

checkCategories();
