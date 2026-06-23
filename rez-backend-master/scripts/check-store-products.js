/**
 * Script to check products for a specific store
 */

const mongoose = require('mongoose');
const { Product } = require('../dist/models/Product');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rez-app';
const DB_NAME = process.env.DB_NAME || 'test';

async function checkStoreProducts() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
    console.log('✅ Connected to MongoDB\n');

    const storeId = '69059ef3cdd7a84b808a74e0'; // Royal Jewels Palace
    console.log(`🔍 Checking products for store: ${storeId}\n`);

    // Count total products for this store
    const count = await Product.countDocuments({ store: storeId });
    console.log(`📊 Total products for this store: ${count}\n`);

    if (count === 0) {
      console.log('❌ No products found for this store!');
      console.log('\n💡 Suggestions:');
      console.log('  1. Check if the store ID is correct');
      console.log('  2. Seed products for this store using seeding script');
      console.log('  3. Check if products have different store ID format');

      // Check if there are any products in the database at all
      const totalProducts = await Product.countDocuments();
      console.log(`\n📦 Total products in database: ${totalProducts}`);

      if (totalProducts > 0) {
        // Show a sample product's store ID format
        const sampleProduct = await Product.findOne().lean();
        console.log(`\n🔍 Sample product store ID: ${sampleProduct.store}`);
        console.log(`   Type: ${typeof sampleProduct.store}`);
      }
    } else {
      // Fetch first 5 products
      const products = await Product.find({ store: storeId })
        .limit(5)
        .lean();

      console.log('✅ Found products:\n');
      products.forEach((product, index) => {
        console.log(`  Product ${index + 1}:`);
        console.log(`    Name: ${product.name}`);
        console.log(`    ID: ${product._id}`);
        console.log(`    Has pricing: ${!!product.pricing}`);
        console.log(`    Has price: ${!!product.price}`);
        console.log(`    Has images: ${product.images?.length || 0}`);
        console.log('');
      });
    }

    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

checkStoreProducts();
