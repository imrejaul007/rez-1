// Script to add images to all products in the database
const mongoose = require('mongoose');
require('dotenv').config();

// Sample product images from Unsplash (high quality, free to use)
const productImages = {
  // Tech products
  'laptop': 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&q=80',
  'macbook': 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&q=80',
  'phone': 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&q=80',
  'iphone': 'https://images.unsplash.com/photo-1592286927505-b0c6d8e56063?w=800&q=80',
  'tablet': 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800&q=80',
  'ipad': 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800&q=80',
  'watch': 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80',
  'airpods': 'https://images.unsplash.com/photo-1606841837239-c5a1a4a07af7?w=800&q=80',
  'headphones': 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80',
  'speaker': 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800&q=80',
  'camera': 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&q=80',

  // Fashion
  'shirt': 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=80',
  'tshirt': 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=80',
  'jeans': 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=800&q=80',
  'pants': 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=800&q=80',
  'dress': 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=800&q=80',
  'shoes': 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80',
  'sneakers': 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80',
  'jacket': 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&q=80',

  // Books & Media
  'book': 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800&q=80',
  'notebook': 'https://images.unsplash.com/photo-1517842645767-c639042777db?w=800&q=80',

  // Home & Kitchen
  'furniture': 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80',
  'chair': 'https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=800&q=80',
  'table': 'https://images.unsplash.com/photo-1530018607912-eff2daa1bac4?w=800&q=80',
  'lamp': 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800&q=80',
  'mug': 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=800&q=80',
  'cup': 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=800&q=80',

  // Default fallback
  'default': 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80'
};

function getImageForProduct(productName) {
  const name = productName.toLowerCase();

  // Check if product name contains any keyword
  for (const [keyword, imageUrl] of Object.entries(productImages)) {
    if (name.includes(keyword)) {
      return imageUrl;
    }
  }

  // Return default image if no match found
  return productImages.default;
}

async function addImagesToAllProducts() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/rez-user-backend';
    const dbName = process.env.DB_NAME || 'test';

    await mongoose.connect(mongoUri, {
      dbName: dbName
    });
    console.log('✅ Connected to MongoDB:', dbName);

    // Get Product model
    const Product = mongoose.model('Product', new mongoose.Schema({
      name: String,
      images: [String],
      description: String,
      category: Object,
      pricing: Object,
      inventory: Object
    }));

    // Get all products
    const products = await Product.find({});
    console.log(`\n📦 Found ${products.length} products in database`);

    if (products.length === 0) {
      console.log('⚠️  No products to update');
      await mongoose.connection.close();
      process.exit(0);
    }

    let updatedCount = 0;
    let skippedCount = 0;

    console.log('\n🔄 Processing products...\n');

    for (const product of products) {
      // Check if product already has images
      if (product.images && product.images.length > 0) {
        console.log(`⏭️  Skipping "${product.name}" - already has ${product.images.length} image(s)`);
        skippedCount++;
        continue;
      }

      // Get appropriate image for this product
      const imageUrl = getImageForProduct(product.name);

      // Update product with image
      await Product.updateOne(
        { _id: product._id },
        {
          $set: {
            images: [imageUrl]
          }
        }
      );

      console.log(`✅ Added image to "${product.name}"`);
      updatedCount++;
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Summary:');
    console.log('  Total products:', products.length);
    console.log('  Updated:', updatedCount);
    console.log('  Skipped (already have images):', skippedCount);
    console.log('='.repeat(60));

    // Verify some products
    console.log('\n🔍 Verification - First 5 products:');
    const verifyProducts = await Product.find({}).limit(5);
    verifyProducts.forEach((p, index) => {
      console.log(`  ${index + 1}. ${p.name}`);
      console.log(`     Images: ${p.images?.length || 0}`);
      if (p.images && p.images.length > 0) {
        console.log(`     URL: ${p.images[0].substring(0, 60)}...`);
      }
    });

    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

addImagesToAllProducts();