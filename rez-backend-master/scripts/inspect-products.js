/**
 * Script to inspect product structure
 */

const mongoose = require('mongoose');
const { Product } = require('../dist/models/Product');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rez-app';
const DB_NAME = process.env.DB_NAME || 'test';

async function inspectProducts() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
    console.log('✅ Connected to MongoDB\n');

    const productIds = [
      '690b1c7a7e68386ede9b8e76', // Butter Chicken
      '6905afbd5f8c7aa14aa299e8', // Gold Plated Necklace
      '690b1c7a7e68386ede9b8e79'  // Biryani Deluxe
    ];

    for (const productId of productIds) {
      const product = await Product.findById(productId).lean();

      if (product) {
        console.log(`\n📦 Product: ${product.name}`);
        console.log(`   ID: ${productId}`);
        console.log(`   All fields: ${Object.keys(product).join(', ')}`);
        console.log(`   Has 'price' field: ${product.hasOwnProperty('price')}`);
        console.log(`   Has 'pricing' field: ${product.hasOwnProperty('pricing')}`);

        if (product.pricing) {
          console.log(`   ✅ Found 'pricing' field:`, JSON.stringify(product.pricing, null, 2));
        }
        if (product.price) {
          console.log(`   ✅ Found 'price' field:`, JSON.stringify(product.price, null, 2));
        }
      } else {
        console.log(`❌ Product ${productId} not found`);
      }
    }

    await mongoose.connection.close();
    console.log('\n🔌 MongoDB connection closed');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

inspectProducts();
