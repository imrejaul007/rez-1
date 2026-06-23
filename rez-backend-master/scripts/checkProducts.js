const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };
const DB_NAME = 'test';

async function checkProducts() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db(DB_NAME);

    // 1. Get all collections
    console.log('📂 COLLECTIONS IN DATABASE:');
    console.log('='.repeat(50));
    const collections = await db.listCollections().toArray();
    collections.forEach(col => console.log(`  - ${col.name}`));
    console.log('\n');

    // 2. Check products collection
    const productsCollection = db.collection('products');
    const totalProducts = await productsCollection.countDocuments();
    console.log(`📦 TOTAL PRODUCTS: ${totalProducts}\n`);

    // 3. Get sample products to see structure
    console.log('📋 SAMPLE PRODUCTS (first 5):');
    console.log('='.repeat(50));
    const sampleProducts = await productsCollection.find().limit(5).toArray();
    sampleProducts.forEach((product, i) => {
      console.log(`\n${i + 1}. ${product.name || 'Unnamed'}`);
      console.log(`   ID: ${product._id}`);
      console.log(`   Category: ${product.category || 'NOT SET'}`);
      console.log(`   CategoryId: ${product.categoryId || 'NOT SET'}`);
      console.log(`   CategorySlug: ${product.categorySlug || 'NOT SET'}`);
      console.log(`   Price: ${JSON.stringify(product.price) || 'NOT SET'}`);
      console.log(`   Store: ${product.storeId || product.store || 'NOT SET'}`);
    });
    console.log('\n');

    // 4. Check unique categories in products
    console.log('🏷️ UNIQUE CATEGORIES IN PRODUCTS:');
    console.log('='.repeat(50));
    const categoryFields = await productsCollection.aggregate([
      {
        $group: {
          _id: null,
          categories: { $addToSet: '$category' },
          categoryIds: { $addToSet: '$categoryId' },
          categorySlugs: { $addToSet: '$categorySlug' }
        }
      }
    ]).toArray();

    if (categoryFields.length > 0) {
      const cats = categoryFields[0];
      console.log('\nCategory field values:', cats.categories?.filter(Boolean) || []);
      console.log('\nCategoryId field values:', cats.categoryIds?.filter(Boolean) || []);
      console.log('\nCategorySlug field values:', cats.categorySlugs?.filter(Boolean) || []);
    }
    console.log('\n');

    // 5. Check categories collection
    console.log('📁 CATEGORIES COLLECTION:');
    console.log('='.repeat(50));
    const categoriesCollection = db.collection('categories');
    const totalCategories = await categoriesCollection.countDocuments();
    console.log(`Total categories: ${totalCategories}\n`);

    // Get sample categories
    const sampleCategories = await categoriesCollection.find().limit(10).toArray();
    console.log('Sample categories:');
    sampleCategories.forEach((cat, i) => {
      console.log(`  ${i + 1}. ${cat.name} (slug: ${cat.slug}, id: ${cat._id})`);
    });
    console.log('\n');

    // 6. Check products count per category
    console.log('📊 PRODUCTS COUNT BY CATEGORY:');
    console.log('='.repeat(50));
    const productsByCategory = await productsCollection.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]).toArray();

    productsByCategory.forEach(item => {
      console.log(`  ${item._id || 'No Category'}: ${item.count} products`);
    });
    console.log('\n');

    // 7. Check if there's a categorySlug field match
    console.log('🔍 PRODUCTS BY CATEGORY SLUG:');
    console.log('='.repeat(50));
    const productsByCategorySlug = await productsCollection.aggregate([
      {
        $group: {
          _id: '$categorySlug',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]).toArray();

    productsByCategorySlug.forEach(item => {
      console.log(`  ${item._id || 'No CategorySlug'}: ${item.count} products`);
    });
    console.log('\n');

    // 8. Check specific category - bags-wallets
    console.log('🎒 CHECKING "bags-wallets" CATEGORY:');
    console.log('='.repeat(50));

    // Find the category
    const bagsCategory = await categoriesCollection.findOne({ slug: 'bags-wallets' });
    if (bagsCategory) {
      console.log('Category found:', bagsCategory.name, '(ID:', bagsCategory._id, ')');

      // Find products with this category
      const bagsProducts = await productsCollection.find({
        $or: [
          { category: 'bags-wallets' },
          { categorySlug: 'bags-wallets' },
          { category: bagsCategory._id },
          { categoryId: bagsCategory._id },
          { category: bagsCategory.name },
          { 'categories': 'bags-wallets' }
        ]
      }).toArray();

      console.log(`Products found for bags-wallets: ${bagsProducts.length}`);
      if (bagsProducts.length > 0) {
        bagsProducts.slice(0, 3).forEach(p => console.log(`  - ${p.name}`));
      }
    } else {
      console.log('Category "bags-wallets" not found in categories collection');
    }

    // 9. Show all field names in products collection
    console.log('\n📝 PRODUCT SCHEMA (all fields):');
    console.log('='.repeat(50));
    const oneProduct = await productsCollection.findOne();
    if (oneProduct) {
      Object.keys(oneProduct).forEach(key => {
        const value = oneProduct[key];
        const type = Array.isArray(value) ? 'array' : typeof value;
        console.log(`  ${key}: ${type}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

checkProducts();
