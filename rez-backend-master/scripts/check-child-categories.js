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

  // Check parent categories and their childCategories field
  const parents = allCats.filter(c => !c.parentCategory);
  const children = allCats.filter(c => c.parentCategory);

  console.log('=== CHILD CATEGORIES CHECK ===\n');
  console.log('Parent categories: ' + parents.length);
  console.log('Child categories: ' + children.length);

  // Check if parent categories have childCategories populated
  let parentsWithChildren = 0;
  let parentsWithEmptyChildren = 0;

  parents.forEach(p => {
    if (p.childCategories && p.childCategories.length > 0) {
      parentsWithChildren++;
    } else {
      parentsWithEmptyChildren++;
    }
  });

  console.log('\nParents with childCategories array: ' + parentsWithChildren);
  console.log('Parents with empty/no childCategories: ' + parentsWithEmptyChildren);

  // Sample: Check "Fashion" or first parent category
  const sampleParent = parents.find(p => p.name && p.name.toLowerCase().includes('fashion')) || parents[0];
  if (sampleParent) {
    console.log('\n--- Sample Parent: ' + sampleParent.name + ' ---');
    console.log('childCategories field:', sampleParent.childCategories);

    // Find actual children of this parent from parentCategory references
    const actualChildren = children.filter(c =>
      c.parentCategory && c.parentCategory.toString() === sampleParent._id.toString()
    );
    console.log('Actual children (from parentCategory): ' + actualChildren.length);
    actualChildren.slice(0, 5).forEach(c => console.log('  - ' + c.name));
  }

  // FIX: Update parent categories to have childCategories array populated
  console.log('\n=== FIXING childCategories arrays ===\n');

  let fixed = 0;
  for (const parent of parents) {
    // Find all children that have this parent
    const parentChildren = children.filter(c =>
      c.parentCategory && c.parentCategory.toString() === parent._id.toString()
    );

    const childIds = parentChildren.map(c => c._id);

    // Update the parent with correct childCategories
    if (childIds.length > 0) {
      await categories.updateOne(
        { _id: parent._id },
        { $set: { childCategories: childIds } }
      );
      console.log(parent.name + ': set ' + childIds.length + ' children');
      fixed++;
    }
  }

  console.log('\nFixed ' + fixed + ' parent categories');

  // Verify fix
  const verifyParent = await categories.findOne({ name: { $regex: /fashion/i } });
  if (verifyParent) {
    console.log('\n--- Verification: ' + verifyParent.name + ' ---');
    console.log('childCategories now has ' + (verifyParent.childCategories?.length || 0) + ' items');
  }

  await mongoose.disconnect();
}

run().catch(console.error);
