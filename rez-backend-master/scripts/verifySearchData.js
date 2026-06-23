const mongoose = require('mongoose');

async function verifyData() {
  try {
    // Load environment variables
    require('dotenv').config();
    
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rez-app';
    await mongoose.connect(mongoURI, { dbName: process.env.DB_NAME || 'rez-app' });
    console.log('✅ Connected to MongoDB\n');

    // Check Categories
    console.log('📋 CATEGORIES:');
    console.log('═'.repeat(60));
    const categories = await mongoose.connection.db.collection('categories').find({}).toArray();
    console.log(`Total: ${categories.length}\n`);
    
    categories.forEach((cat, index) => {
      console.log(`${index + 1}. ${cat.name}`);
      console.log(`   Slug: ${cat.slug}`);
      console.log(`   Type: ${cat.type}`);
      console.log(`   Featured: ${cat.metadata?.featured ? 'Yes' : 'No'}`);
      console.log(`   Image: ${cat.image ? '✓ ' + cat.image.substring(0, 50) + '...' : '✗ No image'}`);
      console.log(`   Products: ${cat.productCount || 0} | Stores: ${cat.storeCount || 0}`);
      console.log('');
    });

    // Check Products
    console.log('\n🛍️  PRODUCTS:');
    console.log('═'.repeat(60));
    const products = await mongoose.connection.db.collection('products').find({}).limit(5).toArray();
    console.log(`Total: ${await mongoose.connection.db.collection('products').countDocuments()}`);
    console.log(`Showing first 5:\n`);
    
    for (const product of products) {
      const category = await mongoose.connection.db.collection('categories').findOne({ 
        _id: product.category 
      });
      console.log(`• ${product.name}`);
      console.log(`  Category: ${category ? category.name : 'Not assigned'}`);
      console.log(`  Price: ₹${product.pricing?.selling || 0}`);
      console.log(`  Images: ${product.images?.length || 0}`);
      console.log('');
    }

    // Check Stores
    console.log('\n🏪 STORES:');
    console.log('═'.repeat(60));
    const stores = await mongoose.connection.db.collection('stores').find({}).toArray();
    console.log(`Total: ${stores.length}\n`);
    
    for (const store of stores) {
      const category = await mongoose.connection.db.collection('categories').findOne({ 
        _id: store.category 
      });
      console.log(`• ${store.name}`);
      console.log(`  Category: ${category ? category.name : 'Not assigned'}`);
      console.log(`  Location: ${store.location?.city || 'Not set'}`);
      console.log(`  Rating: ${store.ratings?.average || 0}/5`);
      console.log('');
    }

    // Summary
    console.log('\n📊 SUMMARY:');
    console.log('═'.repeat(60));
    const featuredCategories = categories.filter(c => c.metadata?.featured);
    const goingOut = categories.filter(c => c.type === 'going_out');
    const homeDelivery = categories.filter(c => c.type === 'home_delivery');
    const totalProducts = await mongoose.connection.db.collection('products').countDocuments();
    const totalStores = await mongoose.connection.db.collection('stores').countDocuments();
    const productsWithCategory = await mongoose.connection.db.collection('products').countDocuments({ 
      category: { $exists: true, $ne: null } 
    });
    const storesWithCategory = await mongoose.connection.db.collection('stores').countDocuments({ 
      category: { $exists: true, $ne: null } 
    });

    console.log(`Categories: ${categories.length}`);
    console.log(`  - Featured: ${featuredCategories.length}`);
    console.log(`  - Going Out: ${goingOut.length}`);
    console.log(`  - Home Delivery: ${homeDelivery.length}`);
    console.log(`\nProducts: ${totalProducts}`);
    console.log(`  - With Category: ${productsWithCategory}`);
    console.log(`  - Without Category: ${totalProducts - productsWithCategory}`);
    console.log(`\nStores: ${totalStores}`);
    console.log(`  - With Category: ${storesWithCategory}`);
    console.log(`  - Without Category: ${totalStores - storesWithCategory}`);

    console.log('\n✅ VERIFICATION COMPLETE!');
    console.log('\n💡 Your search page should now display:');
    console.log(`   - ${featuredCategories.length} featured categories with images`);
    console.log(`   - ${productsWithCategory} searchable products`);
    console.log(`   - ${storesWithCategory} searchable stores`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

// Run verification
verifyData();

