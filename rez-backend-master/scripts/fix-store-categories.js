const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };
const DB_NAME = 'test';

const categoryMappings = [
  { keywords: ['tech', 'electronics', 'laptop', 'phone', 'computer', 'gadget'], categoryName: 'Electronics' },
  { keywords: ['fashion', 'clothing', 'apparel', 'wear', 'dress', 'shirt', 'hub'], categoryName: 'Fashion & Beauty' },
  { keywords: ['food', 'restaurant', 'cafe', 'pizza', 'burger', 'foodie', 'quickbite', 'bite', 'dine', 'kitchen'], categoryName: 'Food & Dining' },
  { keywords: ['grocery', 'mart', 'supermarket', 'rapidmart', 'fresh'], categoryName: 'Grocery & Essentials' },
  { keywords: ['book', 'library'], categoryName: 'Books & Stationery' },
  { keywords: ['sport', 'fitness', 'gym'], categoryName: 'Sports & Fitness' },
  { keywords: ['health', 'pharmacy', 'medical', 'wellness'], categoryName: 'Health & Wellness' },
  { keywords: ['entertainment', 'game', 'movie', 'music'], categoryName: 'Entertainment' },
  { keywords: ['travel', 'tourism', 'hotel'], categoryName: 'Travel & Tourism' },
  { keywords: ['home', 'furniture', 'decor'], categoryName: 'Home & Living' },
  { keywords: ['beauty', 'cosmetic', 'makeup', 'skincare'], categoryName: 'Fashion & Beauty' },
  { keywords: ['mall', 'shopping'], categoryName: 'General' },
];

async function run() {
  await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
  const db = mongoose.connection.db;
  const stores = db.collection('stores');
  const categories = db.collection('categories');

  const allCats = await categories.find({}).toArray();
  const catMap = {};
  allCats.forEach(c => { catMap[c.name] = c._id; });

  const allStores = await stores.find({}).toArray();
  let updated = 0;

  for (const store of allStores) {
    const name = store.name.toLowerCase();
    let newCatName = null;
    
    for (const m of categoryMappings) {
      if (m.keywords.some(k => name.includes(k))) {
        newCatName = m.categoryName;
        break;
      }
    }

    if (newCatName && catMap[newCatName]) {
      const newId = catMap[newCatName];
      if (!store.category || store.category.toString() !== newId.toString()) {
        const oldCat = allCats.find(c => c._id.toString() === (store.category?.toString() || ''));
        console.log(store.name + ': ' + (oldCat?.name || 'none') + ' -> ' + newCatName);
        await stores.updateOne({ _id: store._id }, { $set: { category: newId } });
        updated++;
      }
    }
  }

  console.log('\nUpdated ' + updated + ' stores');
  
  // Show distribution
  const dist = await stores.aggregate([
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]).toArray();
  
  console.log('\nNew distribution:');
  for (const d of dist) {
    const cat = allCats.find(c => c._id.toString() === d._id?.toString());
    console.log('  ' + (cat?.name || 'Unknown') + ': ' + d.count);
  }

  await mongoose.disconnect();
}

run();
