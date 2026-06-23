const mongoose = require('mongoose');
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };
const DB_NAME = 'test';

async function run() {
  await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
  const db = mongoose.connection.db;
  const categories = db.collection('categories');

  console.log('=== FIXING childCategories to ObjectIds ===\n');

  // Get all parent categories that have childCategories
  const parentsWithChildren = await categories.find({
    childCategories: { $exists: true, $ne: [] }
  }).toArray();

  console.log('Found', parentsWithChildren.length, 'categories with childCategories');

  let fixed = 0;

  for (const parent of parentsWithChildren) {
    if (!parent.childCategories || parent.childCategories.length === 0) continue;

    // Check if first element is a string (needs fixing) or ObjectId (already OK)
    const firstChild = parent.childCategories[0];
    const needsFix = typeof firstChild === 'string';

    if (needsFix) {
      // Convert string IDs to ObjectIds
      const objectIds = parent.childCategories.map(id => {
        if (typeof id === 'string') {
          return new mongoose.Types.ObjectId(id);
        }
        return id;
      });

      await categories.updateOne(
        { _id: parent._id },
        { $set: { childCategories: objectIds } }
      );

      console.log(`Fixed: ${parent.name} - converted ${objectIds.length} IDs to ObjectIds`);
      fixed++;
    } else {
      console.log(`OK: ${parent.name} - already has ObjectIds`);
    }
  }

  console.log('\nFixed', fixed, 'categories');

  // Verify by testing Fashion category
  const fashion = await categories.findOne({ slug: 'fashion' });
  console.log('\n=== Verification: Fashion childCategories ===');
  console.log('Type of first element:', typeof fashion.childCategories?.[0]);
  console.log('Is ObjectId:', fashion.childCategories?.[0] instanceof mongoose.Types.ObjectId);

  await mongoose.disconnect();
}

run().catch(console.error);
