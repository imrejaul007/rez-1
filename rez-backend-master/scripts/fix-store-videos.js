/**
 * Fix Store Video URLs Script
 * Updates all stores with broken video URLs to working sample videos
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Working sample videos from Google Cloud Storage (these are reliable and always accessible)
const WORKING_VIDEOS = [
  {
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    thumbnail: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerBlazes.jpg",
    title: "Store Highlights"
  },
  {
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    thumbnail: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerEscapes.jpg",
    title: "Welcome Video"
  },
  {
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    thumbnail: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerFun.jpg",
    title: "Featured Products"
  },
  {
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
    thumbnail: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerJoyrides.jpg",
    title: "Store Tour"
  },
  {
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
    thumbnail: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerMeltdowns.jpg",
    title: "Special Offers"
  },
  {
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4",
    thumbnail: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/SubaruOutbackOnStreetAndDirt.jpg",
    title: "New Arrivals"
  }
];

async function fixStoreVideos() {
  try {
    console.log('🔧 Starting Store Video URL Fix Script...\n');

    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/rez-app';
    console.log(`📡 Connecting to MongoDB: ${mongoUri.replace(/\/\/.*@/, '//***@')}`);

    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const storesCollection = db.collection('stores');

    // Find all stores
    const allStores = await storesCollection.find({}).toArray();
    console.log(`📊 Total stores in database: ${allStores.length}`);

    // Find stores with videos
    const storesWithVideos = await storesCollection.find({
      'videos': { $exists: true, $ne: [], $ne: null }
    }).toArray();

    console.log(`🎬 Stores with videos: ${storesWithVideos.length}\n`);

    if (storesWithVideos.length === 0) {
      console.log('ℹ️  No stores with videos found.');

      // Add videos to first 4 stores
      console.log('\n🔄 Adding videos to first 4 stores...\n');

      const firstFourStores = allStores.slice(0, 4);
      let addedCount = 0;

      for (let i = 0; i < firstFourStores.length; i++) {
        const store = firstFourStores[i];
        const videoData = WORKING_VIDEOS[i % WORKING_VIDEOS.length];

        const result = await storesCollection.updateOne(
          { _id: store._id },
          {
            $set: {
              videos: [{
                url: videoData.url,
                thumbnail: videoData.thumbnail,
                title: `${store.name} - ${videoData.title}`,
                duration: 10,
                uploadedAt: new Date()
              }]
            }
          }
        );

        if (result.modifiedCount > 0) {
          addedCount++;
          console.log(`   ✅ Added video to: ${store.name}`);
          console.log(`      URL: ${videoData.url}\n`);
        }
      }

      console.log(`\n✅ Added videos to ${addedCount} stores!`);
      await mongoose.connection.close();
      process.exit(0);
    }

    // Check for broken URLs (mixkit, cloudinary demo, etc.)
    console.log('📋 Checking for broken video URLs...\n');

    let updatedCount = 0;

    for (let i = 0; i < storesWithVideos.length; i++) {
      const store = storesWithVideos[i];
      let needsUpdate = false;
      const updatedVideos = [];

      for (let j = 0; j < store.videos.length; j++) {
        const video = store.videos[j];
        const url = video.url || '';

        // Check if URL is broken (mixkit, cloudinary demo, or inaccessible)
        const isBroken =
          url.includes('mixkit.co') ||
          url.includes('cloudinary.com/demo') ||
          url.includes('sea-turtle') ||
          url === '' ||
          !url;

        if (isBroken) {
          needsUpdate = true;
          const newVideo = WORKING_VIDEOS[(i + j) % WORKING_VIDEOS.length];
          updatedVideos.push({
            url: newVideo.url,
            thumbnail: newVideo.thumbnail,
            title: video.title || `${store.name} Video`,
            duration: video.duration || 10,
            uploadedAt: video.uploadedAt || new Date()
          });
          console.log(`   ❌ Broken URL found in "${store.name}": ${url}`);
          console.log(`   ✅ Replacing with: ${newVideo.url}\n`);
        } else {
          updatedVideos.push(video);
        }
      }

      if (needsUpdate) {
        const result = await storesCollection.updateOne(
          { _id: store._id },
          { $set: { videos: updatedVideos } }
        );

        if (result.modifiedCount > 0) {
          updatedCount++;
        }
      }
    }

    console.log('═══════════════════════════════════════════════════════');
    console.log(`✅ SUCCESS! Updated ${updatedCount} store(s) with working video URLs\n`);

    // Verify
    const verifyStores = await storesCollection.find({
      'videos.0': { $exists: true }
    }).toArray();

    console.log('📊 Verification - Stores with videos:');
    verifyStores.forEach((store, index) => {
      console.log(`   ${index + 1}. ${store.name}`);
      store.videos.forEach((v, vi) => {
        console.log(`      Video ${vi + 1}: ${v.url}`);
      });
    });

    // Close connection
    await mongoose.connection.close();
    console.log('\n✅ Script completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error occurred:', error.message);
    console.error(error);

    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }

    process.exit(1);
  }
}

// Run the script
fixStoreVideos();
