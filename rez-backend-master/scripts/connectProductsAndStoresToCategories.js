const mongoose = require('mongoose');

async function connectData() {
  try {
    // Load environment variables
    require('dotenv').config();
    
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rez-app';
    await mongoose.connect(mongoURI, { dbName: process.env.DB_NAME || 'rez-app' });
    console.log('✅ Connected to MongoDB');

    // Get all categories
    const categories = await mongoose.connection.db.collection('categories').find({}).toArray();
    console.log(`📋 Found ${categories.length} categories`);

    if (categories.length === 0) {
      console.log('⚠️  No categories found. Please run seedCategoriesWithImages.js first');
      return;
    }

    // Create a map of category types to category IDs
    const categoryMap = {
      fashion: categories.find(c => c.slug === 'fashion-beauty')?._id,
      food: categories.find(c => c.slug === 'food-dining')?._id,
      entertainment: categories.find(c => c.slug === 'entertainment')?._id,
      grocery: categories.find(c => c.slug === 'grocery-essentials')?._id,
      electronics: categories.find(c => c.slug === 'electronics')?._id,
      home: categories.find(c => c.slug === 'home-living')?._id,
      health: categories.find(c => c.slug === 'health-wellness')?._id,
      produce: categories.find(c => c.slug === 'fresh-produce')?._id,
      sports: categories.find(c => c.slug === 'sports-fitness')?._id,
      books: categories.find(c => c.slug === 'books-stationery')?._id,
    };

    // Update Products with categories
    const products = await mongoose.connection.db.collection('products').find({}).toArray();
    console.log(`\n🛍️  Processing ${products.length} products...`);

    let productsUpdated = 0;
    for (const product of products) {
      let categoryId;
      
      // Assign category based on product name/type
      const name = product.name?.toLowerCase() || '';
      
      if (name.includes('laptop') || name.includes('phone') || name.includes('electronic')) {
        categoryId = categoryMap.electronics;
      } else if (name.includes('book')) {
        categoryId = categoryMap.books;
      } else if (name.includes('grocery') || name.includes('food')) {
        categoryId = categoryMap.grocery;
      } else if (name.includes('fashion') || name.includes('clothing')) {
        categoryId = categoryMap.fashion;
      } else if (name.includes('home')) {
        categoryId = categoryMap.home;
      } else {
        // Default to grocery for general products
        categoryId = categoryMap.grocery;
      }

      if (categoryId) {
        await mongoose.connection.db.collection('products').updateOne(
          { _id: product._id },
          { $set: { category: categoryId } }
        );
        productsUpdated++;
      }
    }
    console.log(`✅ Updated ${productsUpdated} products with categories`);

    // Update Stores with categories
    const stores = await mongoose.connection.db.collection('stores').find({}).toArray();
    console.log(`\n🏪 Processing ${stores.length} stores...`);

    let storesUpdated = 0;
    for (const store of stores) {
      let categoryId;
      
      // Assign category based on store name/type
      const name = store.name?.toLowerCase() || '';
      
      if (name.includes('restaurant') || name.includes('food') || name.includes('cafe') || name.includes('pizza')) {
        categoryId = categoryMap.food;
      } else if (name.includes('grocery') || name.includes('mart') || name.includes('store')) {
        categoryId = categoryMap.grocery;
      } else if (name.includes('fashion') || name.includes('clothing')) {
        categoryId = categoryMap.fashion;
      } else if (name.includes('electronic')) {
        categoryId = categoryMap.electronics;
      } else {
        // Default to grocery for general stores
        categoryId = categoryMap.grocery;
      }

      if (categoryId) {
        await mongoose.connection.db.collection('stores').updateOne(
          { _id: store._id },
          { $set: { category: categoryId } }
        );
        storesUpdated++;
      }
    }
    console.log(`✅ Updated ${storesUpdated} stores with categories`);

    // Update category counts
    console.log('\n📊 Updating category counts...');
    for (const category of categories) {
      const productCount = await mongoose.connection.db.collection('products').countDocuments({ 
        category: category._id 
      });
      const storeCount = await mongoose.connection.db.collection('stores').countDocuments({ 
        category: category._id 
      });

      await mongoose.connection.db.collection('categories').updateOne(
        { _id: category._id },
        { 
          $set: { 
            productCount: productCount,
            storeCount: storeCount 
          } 
        }
      );
      
      if (productCount > 0 || storeCount > 0) {
        console.log(`   ${category.name}: ${productCount} products, ${storeCount} stores`);
      }
    }

    console.log('\n🎉 Successfully connected products and stores to categories!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Run the script
connectData();

