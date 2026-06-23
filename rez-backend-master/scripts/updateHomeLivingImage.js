const mongoose = require('mongoose');
require('dotenv').config();

async function updateImage() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.DB_NAME || 'rez-app' });
    console.log('Connected to MongoDB');

    const result = await mongoose.connection.db.collection('categories').updateOne(
      { slug: 'home-living' },
      { 
        $set: { 
          image: 'https://images.unsplash.com/photo-1484101403633-562f891dc89a?w=800&q=80',
          bannerImage: 'https://images.unsplash.com/photo-1484101403633-562f891dc89a?w=1200&q=80'
        } 
      }
    );

    console.log('Updated Home & Living image:', result.modifiedCount, 'documents');
    
    const updated = await mongoose.connection.db.collection('categories').findOne({ slug: 'home-living' });
    console.log('New image URL:', updated.image);
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

updateImage();
