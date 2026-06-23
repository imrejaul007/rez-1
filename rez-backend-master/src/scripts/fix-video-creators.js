/**
 * Fix Video Creators Script
 * Links videos to existing users in the database
 */

const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI as string;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };

async function fixVideoCreators() {
  console.log('='.repeat(60));
  console.log('FIX VIDEO CREATORS SCRIPT');
  console.log('='.repeat(60));

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;

    // Get all existing users
    const users = await db.collection('users').find({}).toArray();
    console.log(`Found ${users.length} users`);

    if (users.length === 0) {
      console.log('No users found! Cannot fix video creators.');
      return;
    }

    // Get all videos
    const videos = await db.collection('videos').find({}).toArray();
    console.log(`Found ${videos.length} videos to fix`);

    // Update each video with a random existing user
    let updatedCount = 0;
    for (const video of videos) {
      // Pick a random user as creator
      const randomUser = users[Math.floor(Math.random() * users.length)];

      await db.collection('videos').updateOne(
        { _id: video._id },
        { $set: { creator: randomUser._id } }
      );
      updatedCount++;

      if (updatedCount % 20 === 0) {
        console.log(`Updated ${updatedCount}/${videos.length} videos...`);
      }
    }

    console.log('');
    console.log(`Successfully updated ${updatedCount} videos with valid creator IDs`);

    // Verify a sample
    console.log('');
    console.log('Verification - Sample videos:');
    const sampleVideos = await db.collection('videos').aggregate([
      { $limit: 3 },
      { $lookup: {
        from: 'users',
        localField: 'creator',
        foreignField: '_id',
        as: 'creatorData'
      }}
    ]).toArray();

    sampleVideos.forEach(v => {
      const creator = v.creatorData[0];
      console.log(`  - "${v.title}" -> ${creator?.profile?.firstName} ${creator?.profile?.lastName}`);
    });

    console.log('');
    console.log('Done! Restart your backend server to see the changes.');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

fixVideoCreators();
