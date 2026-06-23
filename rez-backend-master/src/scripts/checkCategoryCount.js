// SECURITY: hard-coded MongoDB credentials replaced with env-var reference.
// Set MONGODB_URI in your environment before running this script.

const mongoose = require('mongoose');

async function checkCategories() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect('process.env.MONGODB_URI');
    console.log('✅ Connected!\n');

    const db = mongoose.connection.db;
    const collection = db.collection('categories');

    const totalCount = await collection.countDocuments();
    const parentCount = await collection.countDocuments({ parentCategory: null });
    const subcategoryCount = await collection.countDocuments({ parentCategory: { $ne: null } });

    console.log('📊 Category Statistics:');
    console.log('   📁 Parent Categories:', parentCount);
    console.log('   📂 Subcategories:', subcategoryCount);
    console.log('   📦 Total:', totalCount);

    // List all parent categories
    const parents = await collection.find({ parentCategory: null }).project({ name: 1, slug: 1, type: 1 }).toArray();
    console.log('\n📋 Parent Categories (' + parents.length + '):');
    parents.forEach((cat, i) => console.log('   ' + (i+1) + '. ' + cat.name + ' (' + cat.slug + ')'));

    // List subcategories grouped by parent
    const subcats = await collection.aggregate([
      { $match: { parentCategory: { $ne: null } } },
      { $lookup: { from: 'categories', localField: 'parentCategory', foreignField: '_id', as: 'parent' } },
      { $unwind: '$parent' },
      { $group: { _id: '$parent.name', subcategories: { $push: '$name' }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]).toArray();

    console.log('\n📂 Subcategories by Parent:');
    subcats.forEach(group => {
      console.log('   ' + group._id + ' (' + group.count + '): ' + group.subcategories.join(', '));
    });

    await mongoose.disconnect();
    console.log('\n✅ Disconnected');
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

checkCategories();
