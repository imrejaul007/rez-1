const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };

// Store IDs that need videos
const STORES_WITHOUT_VIDEOS = [
  {
    id: '69049a75e80417f9f8d64ef2',
    name: 'Shopping Mall',
    category: 'Shopping Mall'
  },
  {
    id: '69049a75e80417f9f8d64efd',
    name: 'Entertainment Hub',
    category: 'Entertainment'
  },
  {
    id: '69049a75e80417f9f8d64f04',
    name: 'Travel Express',
    category: 'Travel'
  },
  {
    id: '69158aefde5b745de63c7953',
    name: 'Reliance Trends',
    category: 'Fashion'
  }
];

// Video templates
const videoTemplates = [
  {
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=300&fit=crop',
    duration: 45
  },
  {
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1555421689-491a97ff2040?w=400&h=300&fit=crop',
    duration: 30
  }
];

async function addVideos() {
  try {
    console.log('🔌 Connecting to MongoDB...\n');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const Store = mongoose.model('Store', new mongoose.Schema({}, { strict: false, collection: 'stores' }));

    console.log('📹 Adding videos to stores without videos...\n');
    console.log('='.repeat(80));

    for (const storeInfo of STORES_WITHOUT_VIDEOS) {
      console.log(`\n🏪 Processing: ${storeInfo.name}`);
      console.log(`📍 ID: ${storeInfo.id}`);

      // Create videos for this store
      const videos = [
        {
          title: `${storeInfo.name} - Store Tour`,
          url: videoTemplates[0].url,
          thumbnail: videoTemplates[0].thumbnail,
          duration: videoTemplates[0].duration,
          views: 0,
          description: `Take a virtual tour of ${storeInfo.name}. Discover our amazing products and services.`
        },
        {
          title: `${storeInfo.name} - Product Showcase`,
          url: videoTemplates[1].url,
          thumbnail: videoTemplates[1].thumbnail,
          duration: videoTemplates[1].duration,
          views: 0,
          description: `Explore our latest products and exclusive deals at ${storeInfo.name}.`
        }
      ];

      try {
        const result = await Store.updateOne(
          { _id: new mongoose.Types.ObjectId(storeInfo.id) },
          { $set: { videos: videos } }
        );

        if (result.modifiedCount > 0) {
          console.log(`   ✅ Added ${videos.length} videos`);
          videos.forEach((video, index) => {
            console.log(`      ${index + 1}. ${video.title} (${video.duration}s)`);
          });
        } else {
          console.log(`   ⚠️ Store not found or already has videos`);
        }
      } catch (updateError) {
        console.error(`   ❌ Error updating store:`, updateError.message);
      }

      console.log('-'.repeat(80));
    }

    console.log('\n' + '='.repeat(80));
    console.log('\n✅ Video addition complete!\n');

    // Verify the changes
    console.log('🔍 Verifying changes...\n');

    for (const storeInfo of STORES_WITHOUT_VIDEOS) {
      const store = await Store.findById(storeInfo.id).lean();
      if (store && store.videos) {
        console.log(`✅ ${storeInfo.name}: ${store.videos.length} video(s)`);
      } else {
        console.log(`❌ ${storeInfo.name}: No videos found`);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('\n📊 Summary:');
    console.log(`   Stores processed: ${STORES_WITHOUT_VIDEOS.length}`);
    console.log(`   Videos added per store: 2`);
    console.log(`   Total videos added: ${STORES_WITHOUT_VIDEOS.length * 2}`);

    await mongoose.connection.close();
    console.log('\n✅ Connection closed');
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err);
    process.exit(1);
  }
}

addVideos();
