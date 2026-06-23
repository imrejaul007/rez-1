/**
 * Database Verification Script
 * Checks if videos are properly linked to products in the database
 *
 * Run with: node scripts/verify-video-product-links.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rez-app';

async function verifyVideoProductLinks() {
  console.log('🔍 Starting Video-Product Link Verification...\n');

  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;

    // 1. Check total videos count
    console.log('📊 STEP 1: Counting Videos');
    console.log('='.repeat(50));
    const totalVideos = await db.collection('videos').countDocuments();
    console.log(`Total videos in database: ${totalVideos}`);

    // 2. Check videos with products
    console.log('\n📊 STEP 2: Checking Videos with Products');
    console.log('='.repeat(50));
    const videosWithProducts = await db.collection('videos').countDocuments({
      products: { $exists: true, $ne: [] }
    });
    console.log(`Videos with products array: ${videosWithProducts}`);
    console.log(`Videos without products: ${totalVideos - videosWithProducts}`);
    console.log(`Percentage with products: ${((videosWithProducts / totalVideos) * 100).toFixed(2)}%`);

    // 3. Check videos by contentType
    console.log('\n📊 STEP 3: Videos by Content Type');
    console.log('='.repeat(50));
    const contentTypes = await db.collection('videos').aggregate([
      { $group: { _id: '$contentType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();

    contentTypes.forEach(type => {
      console.log(`${type._id || 'undefined'}: ${type.count} videos`);
    });

    // 4. Sample videos with products
    console.log('\n📊 STEP 4: Sample Videos with Products');
    console.log('='.repeat(50));
    const sampleVideos = await db.collection('videos').aggregate([
      { $match: { products: { $ne: [] } } },
      {
        $project: {
          title: 1,
          contentType: 1,
          category: 1,
          productsCount: { $size: '$products' }
        }
      },
      { $limit: 5 }
    ]).toArray();

    if (sampleVideos.length > 0) {
      sampleVideos.forEach((video, index) => {
        console.log(`\n${index + 1}. Video ID: ${video._id}`);
        console.log(`   Title: ${video.title || 'No title'}`);
        console.log(`   Content Type: ${video.contentType || 'undefined'}`);
        console.log(`   Category: ${video.category || 'undefined'}`);
        console.log(`   Products Count: ${video.productsCount}`);
      });
    } else {
      console.log('⚠️  No videos with products found!');
    }

    // 5. Verify product references
    console.log('\n📊 STEP 5: Verifying Product References');
    console.log('='.repeat(50));

    const videosWithProductIds = await db.collection('videos').aggregate([
      { $match: { products: { $ne: [] } } },
      { $unwind: '$products' },
      {
        $group: {
          _id: null,
          uniqueProducts: { $addToSet: '$products' },
          totalProductReferences: { $sum: 1 }
        }
      }
    ]).toArray();

    if (videosWithProductIds.length > 0) {
      const stats = videosWithProductIds[0];
      console.log(`Total product references in videos: ${stats.totalProductReferences}`);
      console.log(`Unique products referenced: ${stats.uniqueProducts.length}`);

      // Check if these products exist
      const existingProducts = await db.collection('products').countDocuments({
        _id: { $in: stats.uniqueProducts }
      });
      console.log(`Products found in database: ${existingProducts}`);
      console.log(`Missing products: ${stats.uniqueProducts.length - existingProducts}`);

      if (existingProducts === 0) {
        console.log('❌ CRITICAL: No products found! Videos reference products that don\'t exist.');
      } else if (existingProducts < stats.uniqueProducts.length) {
        console.log('⚠️  WARNING: Some products are missing from the database.');
      } else {
        console.log('✅ All referenced products exist in database!');
      }
    } else {
      console.log('⚠️  No product references found in videos.');
    }

    // 6. Check product data structure
    console.log('\n📊 STEP 6: Checking Product Data Structure');
    console.log('='.repeat(50));

    const sampleProduct = await db.collection('products').findOne({});
    if (sampleProduct) {
      console.log('Sample product structure:');
      console.log(`- Has name: ${!!sampleProduct.name}`);
      console.log(`- Has images: ${!!sampleProduct.images && sampleProduct.images.length > 0}`);
      console.log(`- Has pricing object: ${!!sampleProduct.pricing}`);
      if (sampleProduct.pricing) {
        console.log(`  - Has pricing.original: ${!!sampleProduct.pricing.original}`);
        console.log(`  - Has pricing.selling: ${!!sampleProduct.pricing.selling}`);
      }
      console.log(`- Has inventory object: ${!!sampleProduct.inventory}`);
      if (sampleProduct.inventory) {
        console.log(`  - Has inventory.stock: ${sampleProduct.inventory.stock !== undefined}`);
        console.log(`  - Has inventory.isAvailable: ${sampleProduct.inventory.isAvailable !== undefined}`);
      }
      console.log(`- Has store reference: ${!!sampleProduct.store}`);
    } else {
      console.log('❌ No products found in database!');
    }

    // 7. Check videos by category (for play page)
    console.log('\n📊 STEP 7: Videos by Category (Play Page Categories)');
    console.log('='.repeat(50));

    const playCategories = ['trending_me', 'trending_her', 'waist', 'article', 'featured'];

    for (const category of playCategories) {
      const count = await db.collection('videos').countDocuments({
        category: category,
        isPublished: true
      });
      const withProducts = await db.collection('videos').countDocuments({
        category: category,
        isPublished: true,
        products: { $ne: [] }
      });
      console.log(`${category}: ${count} videos (${withProducts} with products)`);
    }

    // 8. Summary and Recommendations
    console.log('\n' + '='.repeat(50));
    console.log('📋 SUMMARY & RECOMMENDATIONS');
    console.log('='.repeat(50));

    if (totalVideos === 0) {
      console.log('❌ CRITICAL: No videos in database! Need to seed video data.');
    } else if (videosWithProducts === 0) {
      console.log('❌ CRITICAL: No videos have products linked! Need to:');
      console.log('   1. Add products to database');
      console.log('   2. Link products to videos in video documents');
      console.log('   3. Update video.products array with product ObjectIds');
    } else if (videosWithProducts < totalVideos * 0.5) {
      console.log('⚠️  WARNING: Less than 50% of videos have products.');
      console.log('   Consider linking more products to videos for better UX.');
    } else {
      console.log('✅ Good! Videos have products linked.');
    }

    console.log('\n✅ Verification complete!\n');

  } catch (error) {
    console.error('❌ Error during verification:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the verification
verifyVideoProductLinks();
