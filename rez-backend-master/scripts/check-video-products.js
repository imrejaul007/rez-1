/**
 * Script to check what product fields are returned for a video
 */

const mongoose = require('mongoose');
const { Video } = require('../dist/models/Video');
const { Product } = require('../dist/models/Product');
const { Store } = require('../dist/models/Store');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rez-app';
const DB_NAME = process.env.DB_NAME || 'test';

async function checkVideoProducts() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
    console.log('✅ Connected to MongoDB\n');

    const videoId = '690f54c92a2881d4531c28c0';
    console.log(`🎬 Checking video: ${videoId}\n`);

    // Get video with populated products
    const video = await Video.findById(videoId)
      .populate({
        path: 'products',
        populate: {
          path: 'store',
          select: 'name slug logo'
        }
      })
      .lean();

    if (!video) {
      console.log('❌ Video not found');
      await mongoose.connection.close();
      return;
    }

    console.log(`✅ Video found: ${video.title}`);
    console.log(`📦 Products count: ${video.products?.length || 0}\n`);

    if (video.products && video.products.length > 0) {
      video.products.forEach((product, index) => {
        console.log(`\n📦 Product ${index + 1}: ${product.name}`);
        console.log(`   ID: ${product._id}`);
        console.log(`   Fields: ${Object.keys(product).join(', ')}`);
        console.log(`   Has 'price' field: ${product.hasOwnProperty('price')}`);
        console.log(`   Has 'pricing' field: ${product.hasOwnProperty('pricing')}`);

        if (product.pricing) {
          console.log(`   ✅ Pricing:`, JSON.stringify(product.pricing, null, 2));
        } else {
          console.log(`   ❌ NO PRICING FIELD`);
        }

        if (product.price) {
          console.log(`   ✅ Price:`, JSON.stringify(product.price, null, 2));
        }

        if (product.images) {
          console.log(`   ✅ Images:`, product.images);
        }
      });
    }

    await mongoose.connection.close();
    console.log('\n🔌 MongoDB connection closed');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkVideoProducts();
