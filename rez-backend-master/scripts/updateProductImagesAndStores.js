// Script to update product images and store connections using environment variables
const mongoose = require('mongoose');
require('dotenv').config();

// Product images mapping based on categories and keywords
const productImageMapping = {
  // Tech & Electronics
  'laptop': process.env.PRODUCT_IMAGES_TECH || 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&q=80',
  'macbook': process.env.PRODUCT_IMAGES_TECH || 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&q=80',
  'phone': process.env.PRODUCT_IMAGES_TECH || 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&q=80',
  'iphone': process.env.PRODUCT_IMAGES_TECH || 'https://images.unsplash.com/photo-1592286927505-b0c6d8e56063?w=800&q=80',
  'tablet': process.env.PRODUCT_IMAGES_TECH || 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800&q=80',
  'ipad': process.env.PRODUCT_IMAGES_TECH || 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800&q=80',
  'watch': process.env.PRODUCT_IMAGES_TECH || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80',
  'airpods': process.env.PRODUCT_IMAGES_TECH || 'https://images.unsplash.com/photo-1606841837239-c5a1a4a07af7?w=800&q=80',
  'headphones': process.env.PRODUCT_IMAGES_TECH || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80',
  'speaker': process.env.PRODUCT_IMAGES_TECH || 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800&q=80',
  'camera': process.env.PRODUCT_IMAGES_TECH || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&q=80',
  'computer': process.env.PRODUCT_IMAGES_TECH || 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&q=80',
  'electronic': process.env.PRODUCT_IMAGES_TECH || 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&q=80',

  // Fashion & Clothing
  'shirt': process.env.PRODUCT_IMAGES_FASHION || 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=80',
  'tshirt': process.env.PRODUCT_IMAGES_FASHION || 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=80',
  'jeans': process.env.PRODUCT_IMAGES_FASHION || 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=800&q=80',
  'pants': process.env.PRODUCT_IMAGES_FASHION || 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=800&q=80',
  'dress': process.env.PRODUCT_IMAGES_FASHION || 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=800&q=80',
  'shoes': process.env.PRODUCT_IMAGES_FASHION || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80',
  'sneakers': process.env.PRODUCT_IMAGES_FASHION || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80',
  'jacket': process.env.PRODUCT_IMAGES_FASHION || 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&q=80',
  'fashion': process.env.PRODUCT_IMAGES_FASHION || 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=80',
  'clothing': process.env.PRODUCT_IMAGES_FASHION || 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=80',

  // Food & Dining
  'pizza': process.env.PRODUCT_IMAGES_FOOD || 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=800&q=80',
  'burger': process.env.PRODUCT_IMAGES_FOOD || 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80',
  'pasta': process.env.PRODUCT_IMAGES_FOOD || 'https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5?w=800&q=80',
  'sandwich': process.env.PRODUCT_IMAGES_FOOD || 'https://images.unsplash.com/photo-1539252554453-80ab65ce3586?w=800&q=80',
  'salad': process.env.PRODUCT_IMAGES_FOOD || 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80',
  'coffee': process.env.PRODUCT_IMAGES_FOOD || 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80',
  'tea': process.env.PRODUCT_IMAGES_FOOD || 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800&q=80',
  'food': process.env.PRODUCT_IMAGES_FOOD || 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=800&q=80',
  'dining': process.env.PRODUCT_IMAGES_FOOD || 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=800&q=80',
  'restaurant': process.env.PRODUCT_IMAGES_FOOD || 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=800&q=80',

  // Books & Education
  'book': process.env.PRODUCT_IMAGES_BOOKS || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800&q=80',
  'notebook': process.env.PRODUCT_IMAGES_BOOKS || 'https://images.unsplash.com/photo-1517842645767-c639042777db?w=800&q=80',
  'education': process.env.PRODUCT_IMAGES_BOOKS || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800&q=80',
  'learning': process.env.PRODUCT_IMAGES_BOOKS || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800&q=80',

  // Home & Kitchen
  'furniture': process.env.PRODUCT_IMAGES_HOME || 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80',
  'chair': process.env.PRODUCT_IMAGES_HOME || 'https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=800&q=80',
  'table': process.env.PRODUCT_IMAGES_HOME || 'https://images.unsplash.com/photo-1530018607912-eff2daa1bac4?w=800&q=80',
  'lamp': process.env.PRODUCT_IMAGES_HOME || 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800&q=80',
  'mug': process.env.PRODUCT_IMAGES_HOME || 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=800&q=80',
  'cup': process.env.PRODUCT_IMAGES_HOME || 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=800&q=80',
  'home': process.env.PRODUCT_IMAGES_HOME || 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80',
  'kitchen': process.env.PRODUCT_IMAGES_HOME || 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80',

  // Sports & Fitness
  'sport': process.env.PRODUCT_IMAGES_SPORTS || 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80',
  'fitness': process.env.PRODUCT_IMAGES_SPORTS || 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80',
  'gym': process.env.PRODUCT_IMAGES_SPORTS || 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80',
  'basketball': process.env.PRODUCT_IMAGES_SPORTS || 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&q=80',
  'football': process.env.PRODUCT_IMAGES_SPORTS || 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=800&q=80',

  // Default fallback
  'default': process.env.PRODUCT_IMAGES_DEFAULT || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80'
};

// Store assignment mapping
const storeAssignments = {
  'Electronics': 'TechHub',
  'Technology': 'TechHub',
  'Fashion': 'FashionForward',
  'Clothing': 'FashionForward',
  'Books': 'BookWorld',
  'Education': 'BookWorld',
  'Home & Kitchen': 'HomeEssentials',
  'Home': 'HomeEssentials',
  'Kitchen': 'HomeEssentials',
  'Sports': 'FitnessZone',
  'Fitness': 'FitnessZone',
  'Food & Dining': 'Premium Restaurant',
  'Food': 'Premium Restaurant',
  'Dining': 'Premium Restaurant',
  'Restaurant': 'Premium Restaurant'
};

function getImageForProduct(productName, categoryName = '') {
  const name = (productName + ' ' + categoryName).toLowerCase();

  // Check if product name contains any keyword
  for (const [keyword, imageUrl] of Object.entries(productImageMapping)) {
    if (name.includes(keyword)) {
      return imageUrl;
    }
  }

  // Return default image if no match found
  return productImageMapping.default;
}

function getStoreForCategory(categoryName) {
  return storeAssignments[categoryName] || 'Premium Restaurant';
}

async function updateProductImagesAndStores() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
if (!mongoUri) { console.error('MONGODB_URI or MONGO_URI not set'); process.exit(1); };
    const dbName = 'test';

    await mongoose.connect(mongoUri, {
      dbName: dbName
    });
    console.log('✅ Connected to MongoDB:', dbName);

    // Get models
    const Product = mongoose.model('Product', new mongoose.Schema({
      name: String,
      images: [String],
      description: String,
      category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
      store: { type: mongoose.Schema.Types.ObjectId, ref: 'Store' },
      pricing: Object,
      inventory: Object
    }));

    const Store = mongoose.model('Store', new mongoose.Schema({
      name: String,
      category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
      isActive: Boolean
    }));

    const Category = mongoose.model('Category', new mongoose.Schema({
      name: String
    }));

    // Get all stores for mapping
    console.log('🏪 Getting all stores...');
    const stores = await Store.find({ isActive: true });
    console.log(`📦 Found ${stores.length} active stores`);

    const storeMap = {};
    stores.forEach(store => {
      console.log(`  - ${store.name} (${store._id})`);
      storeMap[store.name] = store._id;
    });

    // Get all products
    console.log('\n📦 Getting all products...');
    const products = await Product.find({}).populate('category');
    console.log(`📦 Found ${products.length} products`);

    if (products.length === 0) {
      console.log('⚠️  No products to update');
      await mongoose.connection.close();
      process.exit(0);
    }

    let updatedImagesCount = 0;
    let updatedStoresCount = 0;
    let skippedImagesCount = 0;
    let skippedStoresCount = 0;

    console.log('\n🔄 Processing products...\n');

    for (const product of products) {
      console.log(`\n🔄 Processing: "${product.name}"`);
      
      let needsUpdate = false;
      const updateData = {};

      // Check and update images
      if (!product.images || product.images.length === 0 || 
          product.images[0].includes('example.com') || 
          product.images[0].includes('placeholder')) {
        
        const categoryName = product.category?.name || '';
        const imageUrl = getImageForProduct(product.name, categoryName);
        
        updateData.images = [imageUrl];
        needsUpdate = true;
        updatedImagesCount++;
        
        console.log(`  📸 Adding image: ${imageUrl.substring(0, 60)}...`);
      } else {
        skippedImagesCount++;
        console.log(`  ⏭️  Skipping image - already has valid image`);
      }

      // Check and update store assignment
      if (!product.store) {
        const categoryName = product.category?.name || '';
        const storeName = getStoreForCategory(categoryName);
        const storeId = storeMap[storeName];
        
        if (storeId) {
          updateData.store = storeId;
          needsUpdate = true;
          updatedStoresCount++;
          console.log(`  🏪 Assigning to store: ${storeName} (${storeId})`);
        } else {
          console.log(`  ⚠️  Store "${storeName}" not found for category "${categoryName}"`);
        }
      } else {
        skippedStoresCount++;
        console.log(`  ⏭️  Skipping store - already assigned`);
      }

      // Update product if needed
      if (needsUpdate) {
        await Product.updateOne(
          { _id: product._id },
          { $set: updateData }
        );
        console.log(`  ✅ Updated successfully`);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('📊 SUMMARY:');
    console.log('='.repeat(80));
    console.log(`📦 Total products processed: ${products.length}`);
    console.log(`📸 Images updated: ${updatedImagesCount}`);
    console.log(`📸 Images skipped: ${skippedImagesCount}`);
    console.log(`🏪 Stores assigned: ${updatedStoresCount}`);
    console.log(`🏪 Stores skipped: ${skippedStoresCount}`);
    console.log('='.repeat(80));

    // Verify some products
    console.log('\n🔍 VERIFICATION - Sample products:');
    const verifyProducts = await Product.find({}).populate('category store').limit(5);
    verifyProducts.forEach((p, index) => {
      console.log(`\n  ${index + 1}. ${p.name}`);
      console.log(`     Category: ${p.category?.name || 'N/A'}`);
      console.log(`     Store: ${p.store?.name || 'N/A'}`);
      console.log(`     Images: ${p.images?.length || 0}`);
      if (p.images && p.images.length > 0) {
        console.log(`     Image URL: ${p.images[0].substring(0, 80)}...`);
      }
    });

    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    console.log('🎉 Product images and store assignments updated successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the update
updateProductImagesAndStores();
