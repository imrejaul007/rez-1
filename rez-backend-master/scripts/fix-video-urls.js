/**
 * Fix Video URLs Script
 * Updates all videos with invalid Cloudinary demo URLs to working sample videos
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Working sample videos from Google Cloud Storage
const WORKING_VIDEOS = [
  {
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    thumbnail: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/BigBuckBunny.jpg",
    title: "Big Buck Bunny"
  },
  {
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    thumbnail: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/ElephantsDream.jpg",
    title: "Elephants Dream"
  },
  {
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    thumbnail: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerBlazes.jpg",
    title: "For Bigger Blazes"
  },
  {
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    thumbnail: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerEscapes.jpg",
    title: "For Bigger Escapes"
  },
  {
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    thumbnail: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerFun.jpg",
    title: "For Bigger Fun"
  },
  {
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
    thumbnail: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerJoyrides.jpg",
    title: "For Bigger Joyrides"
  },
  {
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
    thumbnail: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerMeltdowns.jpg",
    title: "For Bigger Meltdowns"
  },
  {
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
    thumbnail: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/Sintel.jpg",
    title: "Sintel"
  },
  {
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4",
    thumbnail: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/SubaruOutbackOnStreetAndDirt.jpg",
    title: "Subaru Outback"
  },
  {
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
    thumbnail: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/TearsOfSteel.jpg",
    title: "Tears of Steel"
  }
];

async function fixVideoUrls() {
  try {
    console.log('🔧 Starting Video URL Fix Script...\n');

    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/rez-app';
    console.log(`📡 Connecting to MongoDB: ${mongoUri.replace(/\/\/.*@/, '//***@')}`);

    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Get the Video model (we'll use the raw collection to avoid model dependencies)
    const db = mongoose.connection.db;
    const videosCollection = db.collection('videos');

    // Find all videos
    const allVideos = await videosCollection.find({}).toArray();
    console.log(`📊 Total videos in database: ${allVideos.length}`);

    // Find videos with invalid URLs (Cloudinary demo, sea-turtle, etc.)
    const invalidVideos = await videosCollection.find({
      $or: [
        { videoUrl: { $regex: /cloudinary\.com\/demo/i } },
        { videoUrl: { $regex: /sea-turtle/i } },
        { videoUrl: { $regex: /\.jpg$/i } }, // Video URLs ending in .jpg
        { videoUrl: { $exists: false } },
        { videoUrl: null },
        { videoUrl: '' }
      ]
    }).toArray();

    console.log(`❌ Videos with invalid URLs: ${invalidVideos.length}\n`);

    if (invalidVideos.length === 0) {
      console.log('✅ No invalid video URLs found! All videos are already valid.');
      await mongoose.connection.close();
      process.exit(0);
    }

    // Display invalid videos
    console.log('📋 Invalid videos:');
    invalidVideos.forEach((video, index) => {
      console.log(`   ${index + 1}. ${video.title || 'Untitled'} - ${video.videoUrl || 'No URL'}`);
    });
    console.log('');

    // Update each video with a working sample video (rotate through the list)
    console.log('🔄 Updating videos...\n');
    let updatedCount = 0;

    for (let i = 0; i < invalidVideos.length; i++) {
      const video = invalidVideos[i];
      const sampleVideo = WORKING_VIDEOS[i % WORKING_VIDEOS.length];

      const result = await videosCollection.updateOne(
        { _id: video._id },
        {
          $set: {
            videoUrl: sampleVideo.url,
            thumbnail: sampleVideo.thumbnail,
            preview: sampleVideo.thumbnail
          }
        }
      );

      if (result.modifiedCount > 0) {
        updatedCount++;
        console.log(`   ✅ [${updatedCount}/${invalidVideos.length}] Updated: ${video.title || 'Untitled'}`);
        console.log(`      Old: ${video.videoUrl || 'No URL'}`);
        console.log(`      New: ${sampleVideo.url}\n`);
      }
    }

    console.log('═══════════════════════════════════════════════════════');
    console.log(`✅ SUCCESS! Updated ${updatedCount} video(s)\n`);

    // Verify the fix
    const remainingInvalid = await videosCollection.find({
      $or: [
        { videoUrl: { $regex: /cloudinary\.com\/demo/i } },
        { videoUrl: { $regex: /sea-turtle/i } },
        { videoUrl: { $regex: /\.jpg$/i } }
      ]
    }).toArray();

    if (remainingInvalid.length === 0) {
      console.log('✅ Verification: All videos now have valid URLs!');
    } else {
      console.log(`⚠️  Warning: ${remainingInvalid.length} videos still have invalid URLs`);
    }

    // Show updated video count
    const totalVideos = await videosCollection.countDocuments();
    console.log(`📊 Total videos in database: ${totalVideos}`);

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
fixVideoUrls();
