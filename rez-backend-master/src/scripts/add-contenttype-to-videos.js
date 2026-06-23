// SECURITY: hard-coded MongoDB credentials replaced with env-var reference.
// Set MONGODB_URI in your environment before running this script.

/**
 * Migration Script: Add contentType to existing videos
 * This script updates all videos in the database to have the contentType field
 * based on the video category
 */

const mongoose = require('mongoose');

async function addContentType() {
  try {
    console.log('🔧 Starting contentType migration...\n');

    await mongoose.connect('process.env.MONGODB_URI');
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const videosCollection = db.collection('videos');

    // Get all videos
    const totalVideos = await videosCollection.countDocuments();
    console.log(`📊 Total videos to update: ${totalVideos}\n`);

    // Define contentType distribution (35% merchant, 65% UGC)
    const merchantCount = Math.floor(totalVideos * 0.35);
    const ugcCount = totalVideos - merchantCount;

    console.log(`📝 Target distribution:`);
    console.log(`  Merchant videos: ${merchantCount} (35%)`);
    console.log(`  UGC videos: ${ugcCount} (65%)\n`);

    // Get all videos
    const videos = await videosCollection.find({}).toArray();

    // Shuffle videos for random distribution
    const shuffled = videos.sort(() => Math.random() - 0.5);

    const bulkOps = [];

    // Assign merchant to first 35%
    for (let i = 0; i < merchantCount; i++) {
      bulkOps.push({
        updateOne: {
          filter: { _id: shuffled[i]._id },
          update: { $set: { contentType: 'merchant' } }
        }
      });
    }

    // Assign UGC to remaining 65%
    for (let i = merchantCount; i < totalVideos; i++) {
      // Article category videos should be article_video
      const contentType = shuffled[i].category === 'article' ? 'article_video' : 'ugc';
      bulkOps.push({
        updateOne: {
          filter: { _id: shuffled[i]._id },
          update: { $set: { contentType } }
        }
      });
    }

    // Execute bulk update
    if (bulkOps.length > 0) {
      const result = await videosCollection.bulkWrite(bulkOps);
      console.log(`✅ Updated ${result.modifiedCount} videos\n`);
    }

    // Verify distribution
    const distribution = await videosCollection.aggregate([
      { $group: { _id: '$contentType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();

    console.log('📊 Final ContentType Distribution:');
    distribution.forEach(item => {
      console.log(`  ${item._id}: ${item.count} videos`);
    });

    // Verify by category
    console.log('\n📂 Videos by Category with ContentType:');
    const categoryDist = await videosCollection.aggregate([
      { $group: { _id: { category: '$category', contentType: '$contentType' }, count: { $sum: 1 } } },
      { $sort: { '_id.category': 1, '_id.contentType': 1 } }
    ]).toArray();

    categoryDist.forEach(item => {
      console.log(`  ${item._id.category} (${item._id.contentType}): ${item.count} videos`);
    });

    console.log('\n✅ ContentType migration completed successfully!\n');

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

addContentType();
