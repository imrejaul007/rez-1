const mongoose = require('mongoose');
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };
const DB_NAME = 'test';

async function run() {
  await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
  const db = mongoose.connection.db;
  const categories = db.collection('categories');
  
  // Get all categories
  const allCats = await categories.find({}).toArray();
  
  // Build parent map
  const parentMap = {};
  const childrenMap = {};
  
  allCats.forEach(c => {
    if (!c.parentCategory) {
      parentMap[c._id.toString()] = c;
      childrenMap[c._id.toString()] = [];
    }
  });
  
  // Map children to parents
  allCats.forEach(c => {
    if (c.parentCategory) {
      const parentId = c.parentCategory.toString();
      if (childrenMap[parentId]) {
        childrenMap[parentId].push(c);
      }
    }
  });
  
  console.log('=== CATEGORY STRUCTURE (251 total) ===\n');
  console.log('67 Parent Categories + 184 Child Categories\n');
  console.log('─'.repeat(60) + '\n');
  
  let parentCount = 0;
  let childCount = 0;
  
  for (const [parentId, parent] of Object.entries(parentMap)) {
    const children = childrenMap[parentId] || [];
    parentCount++;
    
    console.log('📁 ' + parent.name + ' (' + children.length + ' subcategories)');
    
    if (children.length > 0) {
      children.forEach((child, idx) => {
        childCount++;
        const prefix = idx === children.length - 1 ? '   └── ' : '   ├── ';
        console.log(prefix + child.name);
      });
    }
    console.log('');
  }
  
  console.log('─'.repeat(60));
  console.log('Total Parent Categories: ' + parentCount);
  console.log('Total Child Categories: ' + childCount);
  console.log('Grand Total: ' + (parentCount + childCount));
  
  await mongoose.disconnect();
}
run();
