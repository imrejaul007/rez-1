/**
 * Script to check if product prices were updated correctly
 */

const mongoose = require('mongoose');
const { Product } = require('../dist/models/Product');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rez-app';
const DB_NAME = process.env.DB_NAME || 'test';

async function checkProductPrices() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    console.log(`📍 Database: ${DB_NAME}`);
    await mongoose.connect(MONGODB_URI, {
      dbName: DB_NAME
    });
    console.log('✅ Connected to MongoDB\n');

    // Check the specific products that are showing in the video
    const productIds = [
      '690b1c7a7e68386ede9b8e76', // Butter Chicken
      '6905afbd5f8c7aa14aa299e8', // Gold Plated Necklace
      '690b1c7a7e68386ede9b8e79'  // Biryani Deluxe
    ];

    console.log('🔍 Checking prices for video products:\n');

    for (const productId of productIds) {
      const product = await Product.findById(productId);

      if (product) {
        console.log(`📦 Product: ${product.name} (${productId})`);
        console.log(`   Has price field: ${!!product.price}`);
        if (product.price) {
          console.log(`   Price: ${JSON.stringify(product.price, null, 2)}`);
        } else {
          console.log(`   ❌ NO PRICE DATA`);
        }
        console.log('');
      } else {
        console.log(`❌ Product ${productId} not found\n`);
      }
    }

    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the script
checkProductPrices();
