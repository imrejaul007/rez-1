const mongoose = require('mongoose');
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };
const DB_NAME = 'test';

async function run() {
  await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
  const db = mongoose.connection.db;
  const categories = db.collection('categories');
  
  // Get parent categories (no parent)
  const parents = await categories.find({
    $or: [{ parentCategory: null }, { parentCategory: { $exists: false } }]
  }).sort({ name: 1 }).toArray();
  
  console.log('=== PARENT CATEGORIES (' + parents.length + ') ===');
  parents.forEach((c, i) => console.log((i+1) + '. ' + c.name + ' (' + c._id + ')'));
  
  // Get all categories count
  const total = await categories.countDocuments();
  console.log('\nTotal categories: ' + total);
  
  // Get child categories sample
  const children = await categories.find({
    parentCategory: { $exists: true, $ne: null }
  }).limit(30).toArray();
  
  console.log('\n=== SAMPLE CHILD CATEGORIES ===');
  children.forEach(c => console.log('  - ' + c.name));
  
  await mongoose.disconnect();
}
run();
