const mongoose = require('mongoose');
require('dotenv').config();

// Verified working Unsplash images (tested)
const imageUpdates = [
  {
    slug: 'fashion-beauty',
    image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1200&q=80'
  },
  {
    slug: 'food-dining',
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&q=80'
  },
  {
    slug: 'entertainment',
    image: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=800&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=1200&q=80'
  },
  {
    slug: 'grocery-essentials',
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200&q=80'
  },
  {
    slug: 'electronics',
    image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=800&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=1200&q=80'
  },
  {
    slug: 'home-living',
    image: 'https://images.unsplash.com/photo-1484101403633-562f891dc89a?w=800&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1484101403633-562f891dc89a?w=1200&q=80'
  },
  {
    slug: 'health-wellness',
    image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1200&q=80'
  },
  {
    slug: 'fresh-produce',
    image: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=1200&q=80'
  },
  {
    slug: 'sports-fitness',
    image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1200&q=80'
  },
  {
    slug: 'books-stationery',
    image: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=800&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=1200&q=80'
  }
];

async function updateAllImages() {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rez-app';
    await mongoose.connect(mongoURI, { dbName: process.env.DB_NAME || 'rez-app' });
    console.log('✅ Connected to MongoDB\n');

    let updated = 0;
    for (const update of imageUpdates) {
      const result = await mongoose.connection.db.collection('categories').updateOne(
        { slug: update.slug },
        { 
          $set: { 
            image: update.image,
            bannerImage: update.bannerImage
          } 
        }
      );

      if (result.modifiedCount > 0) {
        console.log(`✅ Updated ${update.slug}`);
        updated++;
      } else {
        console.log(`⚠️  ${update.slug} - no changes (already up to date or not found)`);
      }
    }

    console.log(`\n✨ Updated ${updated} category images`);
    
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

updateAllImages();

