const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };
const DB_NAME = 'test';

async function verifyUGCData() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db(DB_NAME);
    const storeId = new ObjectId('6937bc52bbdcc28f8cc26e63'); // Starbucks

    // Query that matches what the API does
    const query = {
      isPublished: true,
      stores: storeId,
      $or: [
        { contentType: 'ugc', isApproved: true, moderationStatus: 'approved' },
        { contentType: 'merchant' }
      ]
    };

    console.log('\n=== Verifying UGC Data for Starbucks ===');
    console.log('Query:', JSON.stringify(query, null, 2));

    const videos = await db.collection('videos').find(query).toArray();
    console.log(`\nFound ${videos.length} videos matching the API query`);

    if (videos.length > 0) {
      console.log('\nSample video:');
      const sample = videos[0];
      console.log({
        _id: sample._id,
        title: sample.title,
        contentType: sample.contentType,
        isPublished: sample.isPublished,
        isApproved: sample.isApproved,
        moderationStatus: sample.moderationStatus,
        stores: sample.stores,
        thumbnail: sample.thumbnail?.substring(0, 50) + '...'
      });
    }

    // Also check total videos in collection
    const totalVideos = await db.collection('videos').countDocuments();
    console.log(`\nTotal videos in database: ${totalVideos}`);

    // Check videos linked to any store
    const videosWithStores = await db.collection('videos').countDocuments({
      stores: { $exists: true, $ne: [] }
    });
    console.log(`Videos with store links: ${videosWithStores}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    console.log('\nDisconnected from MongoDB');
  }
}

verifyUGCData();
