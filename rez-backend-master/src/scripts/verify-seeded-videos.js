/**
 * Verification Script for Seeded Videos
 * Checks data integrity and provides statistics
 */

const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI as string;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };
const DB_NAME = 'test';

async function verifyVideos() {
  console.log('='.repeat(80));
  console.log('🔍 VIDEO SEED VERIFICATION SCRIPT');
  console.log('='.repeat(80));
  console.log('');

  try {
    // Connect to database
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      dbName: DB_NAME,
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');
    console.log('');

    const Video = mongoose.model('Video');
    const User = mongoose.model('User');
    const Product = mongoose.model('Product');
    const Store = mongoose.model('Store');

    // 1. Total Count
    console.log('📊 BASIC STATISTICS');
    console.log('-'.repeat(80));

    const totalVideos = await Video.countDocuments();
    console.log(`Total Videos: ${totalVideos}`);

    if (totalVideos === 0) {
      console.log('');
      console.log('⚠️  No videos found! Please run the seed script first:');
      console.log('   node src/scripts/seed-videos.js');
      console.log('');
      process.exit(0);
    }
    console.log('');

    // 2. Category Distribution
    console.log('📂 CATEGORY DISTRIBUTION');
    console.log('-'.repeat(80));

    const categoryStats = await Video.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    categoryStats.forEach(stat => {
      console.log(`${stat._id.padEnd(15)}: ${stat.count.toString().padStart(3)} videos`);
    });
    console.log('');

    // 3. Content Type Distribution
    console.log('🎭 CONTENT TYPE DISTRIBUTION');
    console.log('-'.repeat(80));

    const contentTypeStats = await Video.aggregate([
      { $group: { _id: '$contentType', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    contentTypeStats.forEach(stat => {
      const percentage = ((stat.count / totalVideos) * 100).toFixed(1);
      console.log(`${stat._id.padEnd(15)}: ${stat.count.toString().padStart(3)} videos (${percentage}%)`);
    });
    console.log('');

    // 4. Status Checks
    console.log('✅ STATUS CHECKS');
    console.log('-'.repeat(80));

    const publishedCount = await Video.countDocuments({ isPublished: true });
    const approvedCount = await Video.countDocuments({ isApproved: true });
    const featuredCount = await Video.countDocuments({ isFeatured: true });
    const trendingCount = await Video.countDocuments({ isTrending: true });
    const sponsoredCount = await Video.countDocuments({ isSponsored: true });

    console.log(`Published Videos : ${publishedCount}/${totalVideos} (${((publishedCount/totalVideos)*100).toFixed(1)}%)`);
    console.log(`Approved Videos  : ${approvedCount}/${totalVideos} (${((approvedCount/totalVideos)*100).toFixed(1)}%)`);
    console.log(`Featured Videos  : ${featuredCount}`);
    console.log(`Trending Videos  : ${trendingCount}`);
    console.log(`Sponsored Videos : ${sponsoredCount}`);
    console.log('');

    // 5. Relationship Checks
    console.log('🔗 RELATIONSHIP CHECKS');
    console.log('-'.repeat(80));

    const videosWithProducts = await Video.countDocuments({
      products: { $exists: true, $not: { $size: 0 } }
    });

    const videosWithStores = await Video.countDocuments({
      stores: { $exists: true, $not: { $size: 0 } }
    });

    console.log(`Videos with Products: ${videosWithProducts}/${totalVideos} (${((videosWithProducts/totalVideos)*100).toFixed(1)}%)`);
    console.log(`Videos with Stores  : ${videosWithStores}/${totalVideos} (${((videosWithStores/totalVideos)*100).toFixed(1)}%)`);
    console.log('');

    // 6. Engagement Statistics
    console.log('📈 ENGAGEMENT STATISTICS');
    console.log('-'.repeat(80));

    const engagementStats = await Video.aggregate([
      {
        $group: {
          _id: null,
          totalViews: { $sum: '$engagement.views' },
          totalShares: { $sum: '$engagement.shares' },
          totalComments: { $sum: '$engagement.comments' },
          avgViews: { $avg: '$engagement.views' },
          maxViews: { $max: '$engagement.views' },
          minViews: { $min: '$engagement.views' }
        }
      }
    ]);

    if (engagementStats.length > 0) {
      const stats = engagementStats[0];
      console.log(`Total Views   : ${stats.totalViews.toLocaleString()}`);
      console.log(`Total Shares  : ${stats.totalShares.toLocaleString()}`);
      console.log(`Total Comments: ${stats.totalComments.toLocaleString()}`);
      console.log(`Avg Views/Video: ${Math.round(stats.avgViews).toLocaleString()}`);
      console.log(`Max Views     : ${stats.maxViews.toLocaleString()}`);
      console.log(`Min Views     : ${stats.minViews.toLocaleString()}`);
    }
    console.log('');

    // 7. Data Integrity Checks
    console.log('🔧 DATA INTEGRITY CHECKS');
    console.log('-'.repeat(80));

    // Check for missing required fields
    const missingVideoUrl = await Video.countDocuments({ videoUrl: { $exists: false } });
    const missingThumbnail = await Video.countDocuments({ thumbnail: { $exists: false } });
    const missingCreator = await Video.countDocuments({ creator: { $exists: false } });
    const missingCategory = await Video.countDocuments({ category: { $exists: false } });
    const missingDuration = await Video.countDocuments({ 'metadata.duration': { $exists: false } });

    const hasIntegrityIssues = missingVideoUrl || missingThumbnail || missingCreator ||
                               missingCategory || missingDuration;

    if (hasIntegrityIssues) {
      console.log('⚠️  Found integrity issues:');
      if (missingVideoUrl) console.log(`   - Missing videoUrl: ${missingVideoUrl} videos`);
      if (missingThumbnail) console.log(`   - Missing thumbnail: ${missingThumbnail} videos`);
      if (missingCreator) console.log(`   - Missing creator: ${missingCreator} videos`);
      if (missingCategory) console.log(`   - Missing category: ${missingCategory} videos`);
      if (missingDuration) console.log(`   - Missing duration: ${missingDuration} videos`);
    } else {
      console.log('✅ All videos have required fields');
    }
    console.log('');

    // 8. Check Creator References
    console.log('👤 CREATOR REFERENCE VALIDATION');
    console.log('-'.repeat(80));

    const uniqueCreators = await Video.distinct('creator');
    console.log(`Unique Creators: ${uniqueCreators.length}`);

    // Check if all creators exist
    const validCreators = await User.countDocuments({
      _id: { $in: uniqueCreators }
    });

    if (validCreators === uniqueCreators.length) {
      console.log('✅ All creator references are valid');
    } else {
      console.log(`⚠️  Warning: ${uniqueCreators.length - validCreators} invalid creator references`);
    }
    console.log('');

    // 9. Check Product References
    console.log('🛍️  PRODUCT REFERENCE VALIDATION');
    console.log('-'.repeat(80));

    const allProductIds = await Video.aggregate([
      { $unwind: '$products' },
      { $group: { _id: '$products' } }
    ]);

    if (allProductIds.length > 0) {
      const productIds = allProductIds.map(p => p._id);
      const validProducts = await Product.countDocuments({
        _id: { $in: productIds }
      });

      console.log(`Unique Products Referenced: ${productIds.length}`);
      console.log(`Valid Product References: ${validProducts}/${productIds.length}`);

      if (validProducts === productIds.length) {
        console.log('✅ All product references are valid');
      } else {
        console.log(`⚠️  Warning: ${productIds.length - validProducts} invalid product references`);
      }
    } else {
      console.log('ℹ️  No products linked to videos');
    }
    console.log('');

    // 10. Check Store References
    console.log('🏪 STORE REFERENCE VALIDATION');
    console.log('-'.repeat(80));

    const allStoreIds = await Video.aggregate([
      { $unwind: '$stores' },
      { $group: { _id: '$stores' } }
    ]);

    if (allStoreIds.length > 0) {
      const storeIds = allStoreIds.map(s => s._id);
      const validStores = await Store.countDocuments({
        _id: { $in: storeIds }
      });

      console.log(`Unique Stores Referenced: ${storeIds.length}`);
      console.log(`Valid Store References: ${validStores}/${storeIds.length}`);

      if (validStores === storeIds.length) {
        console.log('✅ All store references are valid');
      } else {
        console.log(`⚠️  Warning: ${storeIds.length - validStores} invalid store references`);
      }
    } else {
      console.log('ℹ️  No stores linked to videos');
    }
    console.log('');

    // 11. Top 10 Videos by Views
    console.log('🏆 TOP 10 VIDEOS BY VIEWS');
    console.log('-'.repeat(80));

    const topVideos = await Video.find()
      .sort({ 'engagement.views': -1 })
      .limit(10)
      .populate('creator', 'profile.firstName profile.lastName')
      .select('title category engagement.views contentType');

    topVideos.forEach((video, index) => {
      const creatorName = video.creator?.profile?.firstName || 'Unknown';
      console.log(`${(index + 1).toString().padStart(2)}. ${video.title.substring(0, 50).padEnd(50)} | ${video.engagement.views.toLocaleString().padStart(7)} views | ${video.category}`);
    });
    console.log('');

    // 12. Cloudinary URL Check
    console.log('☁️  CLOUDINARY INTEGRATION CHECK');
    console.log('-'.repeat(80));

    const cloudinaryVideos = await Video.countDocuments({
      videoUrl: { $regex: /cloudinary\.com/ }
    });

    const cloudinaryThumbnails = await Video.countDocuments({
      thumbnail: { $regex: /cloudinary\.com/ }
    });

    console.log(`Videos with Cloudinary URLs: ${cloudinaryVideos}/${totalVideos} (${((cloudinaryVideos/totalVideos)*100).toFixed(1)}%)`);
    console.log(`Thumbnails with Cloudinary URLs: ${cloudinaryThumbnails}/${totalVideos} (${((cloudinaryThumbnails/totalVideos)*100).toFixed(1)}%)`);

    if (cloudinaryVideos === totalVideos && cloudinaryThumbnails === totalVideos) {
      console.log('✅ All videos and thumbnails use Cloudinary');
    } else {
      console.log('⚠️  Some videos/thumbnails not using Cloudinary');
    }
    console.log('');

    // 13. Sample Video Data
    console.log('🎬 SAMPLE VIDEO DATA (First 3 Videos)');
    console.log('-'.repeat(80));

    const sampleVideos = await Video.find()
      .limit(3)
      .populate('creator', 'profile.firstName profile.lastName')
      .populate('products', 'name')
      .populate('stores', 'name');

    sampleVideos.forEach((video, index) => {
      console.log(`\n[${index + 1}] ${video.title}`);
      console.log(`    Category: ${video.category}`);
      console.log(`    Content Type: ${video.contentType}`);
      console.log(`    Creator: ${video.creator?.profile?.firstName || 'Unknown'}`);
      console.log(`    Duration: ${Math.floor(video.metadata.duration / 60)}:${(video.metadata.duration % 60).toString().padStart(2, '0')}`);
      console.log(`    Views: ${video.engagement.views.toLocaleString()}`);
      console.log(`    Likes: ${video.engagement.likes.length}`);
      console.log(`    Products: ${video.products.length}`);
      console.log(`    Stores: ${video.stores.length}`);
      console.log(`    Tags: ${video.tags.slice(0, 3).join(', ')}`);
      console.log(`    Video URL: ${video.videoUrl.substring(0, 60)}...`);
    });
    console.log('');

    // 14. Summary and Recommendations
    console.log('='.repeat(80));
    console.log('📝 VERIFICATION SUMMARY');
    console.log('='.repeat(80));
    console.log('');

    const issues = [];
    const warnings = [];
    const successes = [];

    // Check for critical issues
    if (totalVideos === 0) {
      issues.push('No videos found in database');
    } else {
      successes.push(`${totalVideos} videos successfully seeded`);
    }

    if (totalVideos < 125) {
      warnings.push(`Video count (${totalVideos}) is below target (125-175)`);
    } else if (totalVideos > 175) {
      warnings.push(`Video count (${totalVideos}) exceeds target (125-175)`);
    } else {
      successes.push(`Video count (${totalVideos}) is within target range`);
    }

    if (publishedCount < totalVideos) {
      warnings.push(`${totalVideos - publishedCount} videos are not published`);
    } else {
      successes.push('All videos are published');
    }

    if (videosWithProducts < totalVideos * 0.4) {
      warnings.push('Less than 40% of videos have products linked');
    } else {
      successes.push(`${((videosWithProducts/totalVideos)*100).toFixed(1)}% of videos have products`);
    }

    if (cloudinaryVideos < totalVideos) {
      warnings.push(`${totalVideos - cloudinaryVideos} videos not using Cloudinary`);
    } else {
      successes.push('All videos use Cloudinary integration');
    }

    // Print results
    if (successes.length > 0) {
      console.log('✅ SUCCESSES:');
      successes.forEach(s => console.log(`   - ${s}`));
      console.log('');
    }

    if (warnings.length > 0) {
      console.log('⚠️  WARNINGS:');
      warnings.forEach(w => console.log(`   - ${w}`));
      console.log('');
    }

    if (issues.length > 0) {
      console.log('❌ CRITICAL ISSUES:');
      issues.forEach(i => console.log(`   - ${i}`));
      console.log('');
    }

    // Overall status
    if (issues.length === 0 && warnings.length === 0) {
      console.log('🎉 OVERALL STATUS: EXCELLENT');
      console.log('   All checks passed! Videos are production-ready.');
    } else if (issues.length === 0) {
      console.log('✅ OVERALL STATUS: GOOD');
      console.log('   Videos are ready with minor warnings.');
    } else {
      console.log('⚠️  OVERALL STATUS: NEEDS ATTENTION');
      console.log('   Please address the issues above.');
    }

    console.log('');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('');
    console.error('❌ ERROR:', error.message);
    console.error('');
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from database');
  }
}

// Run verification
if (require.main === module) {
  verifyVideos()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Verification failed:', error);
      process.exit(1);
    });
}

module.exports = { verifyVideos };
