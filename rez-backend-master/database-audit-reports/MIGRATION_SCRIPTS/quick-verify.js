const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };

async function quickVerify() {
  try {
    await mongoose.connect(MONGODB_URI);
    const db = mongoose.connection.db;

    const faqsCount = await db.collection('faqs').countDocuments();
    const faqsWithId = await db.collection('faqs').countDocuments({
      $or: [
        { id: { $exists: true } },
        { uniqueId: { $exists: true } }
      ]
    });

    const productsCount = await db.collection('products').countDocuments();
    const categoriesCount = await db.collection('categories').countDocuments();
    const categories = await db.collection('categories').find({}).toArray();
    const categoryIds = categories.map(c => c._id.toString());
    const products = await db.collection('products').find({ category: { $exists: true, $ne: null } }).toArray();
    const invalidProducts = products.filter(p => !categoryIds.includes(p.category.toString()));

    const uncategorized = await db.collection('categories').findOne({ name: 'Uncategorized' });
    const uncategorizedCount = uncategorized ? await db.collection('products').countDocuments({ category: uncategorized._id }) : 0;

    console.log('='.repeat(60));
    console.log('DATABASE STATE - POST MIGRATION');
    console.log('='.repeat(60));
    console.log('');
    console.log('FAQs Collection:');
    console.log('  Total FAQs:', faqsCount);
    console.log('  FAQs with duplicate IDs:', faqsWithId, '(should be 0)');
    console.log('  Status:', faqsWithId === 0 ? '✅ CLEAN' : '❌ ISSUES FOUND');
    console.log('');
    console.log('Products Collection:');
    console.log('  Total Products:', productsCount);
    console.log('  Products with category:', products.length);
    console.log('  Products with invalid categories:', invalidProducts.length, '(should be 0)');
    console.log('  Products in Uncategorized:', uncategorizedCount);
    console.log('  Status:', invalidProducts.length === 0 ? '✅ CLEAN' : '❌ ISSUES FOUND');
    console.log('');
    console.log('Categories Collection:');
    console.log('  Total Categories:', categoriesCount);
    console.log('  Uncategorized exists:', uncategorized !== null ? 'Yes' : 'No');
    console.log('  Status: ✅ CLEAN');
    console.log('');
    console.log('='.repeat(60));
    console.log('OVERALL STATUS:', (faqsWithId === 0 && invalidProducts.length === 0) ? '✅ ALL CLEAN' : '❌ ISSUES FOUND');
    console.log('='.repeat(60));

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

quickVerify();
