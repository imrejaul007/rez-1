const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };
const DB_NAME = 'test';

// Sample video URLs (using public test videos)
const sampleVideos = [
  {
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&h=900&fit=crop',
    title: 'Amazing coffee experience!',
    description: 'Best coffee I have ever tasted. The ambiance is perfect! 😍☕',
    tags: ['coffee', 'cafe', 'experience'],
    category: 'review'
  },
  {
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&h=900&fit=crop',
    title: 'Perfect morning coffee',
    description: 'Starting my day with the best brew in town! Highly recommend this place 👌',
    tags: ['morning', 'coffee', 'lifestyle'],
    category: 'featured'
  },
  {
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=600&h=900&fit=crop',
    title: 'Latte art masterpiece',
    description: 'The barista here is an artist! Look at this beautiful latte art 🎨',
    tags: ['latte', 'art', 'barista'],
    category: 'tutorial'
  },
  {
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=600&h=900&fit=crop',
    title: 'Iced coffee on a hot day',
    description: 'Nothing beats an iced coffee on a summer day! This place nails it 🧊',
    tags: ['iced', 'coffee', 'summer'],
    category: 'review'
  },
  {
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1485808191679-5f86510681a2?w=600&h=900&fit=crop',
    title: 'Delicious pastries!',
    description: 'The pastries here are fresh and amazing! Perfect with coffee ☕🥐',
    tags: ['pastries', 'bakery', 'food'],
    category: 'review'
  }
];

// Sample photos for UGC
const samplePhotos = [
  {
    url: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=600&h=900&fit=crop',
    title: 'Cozy corner spot',
    description: 'Found my new favorite spot! Perfect for working 💻',
    tags: ['cozy', 'workspace', 'cafe']
  },
  {
    url: 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=600&h=900&fit=crop',
    title: 'Beautiful interior',
    description: 'The decor here is stunning! 📸',
    tags: ['interior', 'decor', 'aesthetic']
  },
  {
    url: 'https://images.unsplash.com/photo-1512568400610-62da28bc8a13?w=600&h=900&fit=crop',
    title: 'Coffee and croissant',
    description: 'Perfect breakfast combo! 🥐☕',
    tags: ['breakfast', 'coffee', 'croissant']
  }
];

// Mock users for content
const mockUsers = [
  { firstName: 'Sarah', lastName: 'Johnson', avatar: 'https://i.pravatar.cc/150?img=1' },
  { firstName: 'Mike', lastName: 'Chen', avatar: 'https://i.pravatar.cc/150?img=2' },
  { firstName: 'Emma', lastName: 'Williams', avatar: 'https://i.pravatar.cc/150?img=3' },
  { firstName: 'James', lastName: 'Brown', avatar: 'https://i.pravatar.cc/150?img=4' },
  { firstName: 'Lisa', lastName: 'Davis', avatar: 'https://i.pravatar.cc/150?img=5' }
];

async function seedUGCData() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db(DB_NAME);

    // First, find or create users
    console.log('\n=== Finding/Creating Users ===');
    let users = await db.collection('users').find({}).limit(5).toArray();

    if (users.length === 0) {
      console.log('No users found, creating mock users...');
      const userDocs = mockUsers.map((user, index) => ({
        _id: new ObjectId(),
        email: `${user.firstName.toLowerCase()}.${user.lastName.toLowerCase()}@example.com`,
        profile: {
          firstName: user.firstName,
          lastName: user.lastName,
          avatar: user.avatar
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      await db.collection('users').insertMany(userDocs);
      users = userDocs;
      console.log(`Created ${users.length} mock users`);
    } else {
      console.log(`Found ${users.length} existing users`);
    }

    // Get stores that need UGC data
    const storesToSeed = [
      'Starbucks',
      'KFC',
      'McDonald\'s',
      'Domino\'s Pizza',
      'Barbeque Nation',
      'Chianti',
      'Dyu Art Cafe',
      'Empire Restaurant',
      'Corner House',
      'Baskin Robbins'
    ];

    let totalInserted = 0;

    for (const storeName of storesToSeed) {
      const store = await db.collection('stores').findOne({ name: storeName });

      if (!store) {
        console.log(`Store not found: ${storeName}`);
        continue;
      }

      // Check if UGC videos already exist for this store
      const existingCount = await db.collection('videos').countDocuments({
        stores: store._id,
        contentType: 'ugc'
      });

      if (existingCount > 0) {
        console.log(`${storeName} already has ${existingCount} UGC videos, skipping...`);
        continue;
      }

      console.log(`\nSeeding UGC for: ${storeName} (ID: ${store._id})`);

      const videos = [];

      // Add video content
      for (let i = 0; i < 3; i++) {
        const videoData = sampleVideos[i % sampleVideos.length];
        const user = users[i % users.length];

        videos.push({
          _id: new ObjectId(),
          title: `${videoData.title} at ${storeName}`,
          description: videoData.description,
          creator: user._id,
          contentType: 'ugc',
          videoUrl: videoData.url,
          thumbnail: videoData.thumbnail,
          category: videoData.category,
          tags: [...videoData.tags, storeName.toLowerCase().replace(/[^a-z0-9]/g, '')],
          hashtags: videoData.tags.map(t => `#${t}`),
          stores: [store._id],
          products: [],
          engagement: {
            views: Math.floor(Math.random() * 5000) + 500,
            likes: [],
            shares: Math.floor(Math.random() * 100),
            comments: Math.floor(Math.random() * 50),
            saves: Math.floor(Math.random() * 30),
            reports: 0
          },
          metadata: {
            duration: Math.floor(Math.random() * 60) + 15,
            resolution: '1080p',
            format: 'mp4',
            aspectRatio: '9:16',
            fps: 30
          },
          processing: {
            status: 'completed',
            processedAt: new Date()
          },
          analytics: {
            totalViews: Math.floor(Math.random() * 5000) + 500,
            uniqueViews: Math.floor(Math.random() * 3000) + 300,
            avgWatchTime: Math.floor(Math.random() * 30) + 10,
            completionRate: Math.floor(Math.random() * 50) + 30,
            engagementRate: Math.floor(Math.random() * 20) + 5,
            shareRate: Math.floor(Math.random() * 10) + 2,
            likeRate: Math.floor(Math.random() * 15) + 5,
            likes: Math.floor(Math.random() * 500) + 50,
            comments: Math.floor(Math.random() * 50),
            shares: Math.floor(Math.random() * 100),
            engagement: Math.floor(Math.random() * 1000) + 100,
            viewsByHour: {},
            viewsByDate: {},
            deviceBreakdown: {
              mobile: Math.floor(Math.random() * 70) + 20,
              tablet: Math.floor(Math.random() * 20) + 5,
              desktop: Math.floor(Math.random() * 30) + 10
            }
          },
          reports: [],
          reportCount: 0,
          isReported: false,
          isPublished: true,
          isFeatured: i === 0,
          isApproved: true,
          isTrending: i < 2,
          isSponsored: false,
          moderationStatus: 'approved',
          privacy: 'public',
          allowComments: true,
          allowSharing: true,
          publishedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
          likedBy: [],
          bookmarkedBy: [],
          createdAt: new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000),
          updatedAt: new Date()
        });
      }

      // Add photo content (as videos with type photo for display purposes)
      for (let i = 0; i < 2; i++) {
        const photoData = samplePhotos[i % samplePhotos.length];
        const user = users[(i + 3) % users.length];

        videos.push({
          _id: new ObjectId(),
          title: `${photoData.title} at ${storeName}`,
          description: photoData.description,
          creator: user._id,
          contentType: 'ugc',
          videoUrl: photoData.url, // Using image URL as video URL for photos
          thumbnail: photoData.url,
          category: 'review',
          tags: [...photoData.tags, storeName.toLowerCase().replace(/[^a-z0-9]/g, '')],
          hashtags: photoData.tags.map(t => `#${t}`),
          stores: [store._id],
          products: [],
          engagement: {
            views: Math.floor(Math.random() * 3000) + 200,
            likes: [],
            shares: Math.floor(Math.random() * 50),
            comments: Math.floor(Math.random() * 30),
            saves: Math.floor(Math.random() * 20),
            reports: 0
          },
          metadata: {
            duration: 1, // Photos have minimal duration
            resolution: '1080p',
            format: 'jpg',
            aspectRatio: '9:16',
            fps: 1
          },
          processing: {
            status: 'completed',
            processedAt: new Date()
          },
          analytics: {
            totalViews: Math.floor(Math.random() * 3000) + 200,
            uniqueViews: Math.floor(Math.random() * 2000) + 150,
            avgWatchTime: 5,
            completionRate: 90,
            engagementRate: Math.floor(Math.random() * 25) + 5,
            shareRate: Math.floor(Math.random() * 8) + 2,
            likeRate: Math.floor(Math.random() * 20) + 5,
            likes: Math.floor(Math.random() * 300) + 30,
            comments: Math.floor(Math.random() * 30),
            shares: Math.floor(Math.random() * 50),
            engagement: Math.floor(Math.random() * 500) + 50,
            viewsByHour: {},
            viewsByDate: {},
            deviceBreakdown: {
              mobile: Math.floor(Math.random() * 70) + 20,
              tablet: Math.floor(Math.random() * 20) + 5,
              desktop: Math.floor(Math.random() * 30) + 10
            }
          },
          reports: [],
          reportCount: 0,
          isReported: false,
          isPublished: true,
          isFeatured: false,
          isApproved: true,
          isTrending: false,
          isSponsored: false,
          moderationStatus: 'approved',
          privacy: 'public',
          allowComments: true,
          allowSharing: true,
          publishedAt: new Date(Date.now() - Math.random() * 10 * 24 * 60 * 60 * 1000),
          likedBy: [],
          bookmarkedBy: [],
          createdAt: new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000),
          updatedAt: new Date()
        });
      }

      if (videos.length > 0) {
        const result = await db.collection('videos').insertMany(videos);
        console.log(`  Inserted ${result.insertedCount} UGC videos`);
        totalInserted += result.insertedCount;
      }
    }

    console.log(`\n=== Summary ===`);
    console.log(`Total UGC videos inserted: ${totalInserted}`);

    // Verify the data for Starbucks
    const starbucksUGC = await db.collection('videos').find({
      stores: new ObjectId('6937bc52bbdcc28f8cc26e63'),
      contentType: 'ugc'
    }).toArray();

    console.log(`\nStarbucks UGC videos after seeding: ${starbucksUGC.length}`);
    if (starbucksUGC.length > 0) {
      console.log('Sample UGC:', {
        title: starbucksUGC[0].title,
        contentType: starbucksUGC[0].contentType,
        isPublished: starbucksUGC[0].isPublished,
        isApproved: starbucksUGC[0].isApproved
      });
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    console.log('\nDisconnected from MongoDB');
  }
}

seedUGCData();
