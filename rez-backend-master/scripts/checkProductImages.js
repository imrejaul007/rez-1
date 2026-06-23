// Script to check product images
const mongoose = require('mongoose');
require('dotenv').config();

async function checkProductImages() {
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
      pricing: Object,
      inventory: Object
    }));

    // Find MacBook Air M3 product
    const product = await Product.findOne({ name: 'MacBook Air M3' });

    if (!product) {
      console.log('❌ Product "MacBook Air M3" not found in database');

      // List all products to see what's available
      const allProducts = await Product.find({}).select('name images').limit(10);
      console.log('\n📦 Available products in database:');
      allProducts.forEach((p, index) => {
        console.log(`${index + 1}. ${p.name} - Images: ${p.images?.length || 0}`);
      });
    } else {
      console.log('\n✅ Product found!');
      console.log('📋 Product details:');
      console.log('  Name:', product.name);
      console.log('  ID:', product._id);
      console.log('  Images array:', product.images);
      console.log('  Images count:', product.images?.length || 0);

      if (product.images && product.images.length > 0) {
        console.log('\n🖼️ Image URLs:');
        product.images.forEach((img, index) => {
          console.log(`  ${index + 1}. ${img}`);
        });
      } else {
        console.log('\n⚠️ Product has NO images!');
      }

      console.log('\n💰 Pricing:', product.pricing);
      console.log('📦 Inventory:', product.inventory);
    }

    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkProductImages();