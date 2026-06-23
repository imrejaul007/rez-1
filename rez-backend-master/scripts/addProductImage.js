// Script to add image to MacBook Air M3 product
const mongoose = require('mongoose');
require('dotenv').config();

async function addProductImage() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/rez-user-backend';
    const dbName = process.env.DB_NAME || 'test';

    await mongoose.connect(mongoUri, {
      dbName: dbName
    });
    console.log('✅ Connected to MongoDB:', dbName);

    // Get Product model
    const Product = mongoose.model('Product', new mongoose.Schema({
      name: String,
      images: [String],
      pricing: Object,
      inventory: Object
    }));

    // MacBook Air M3 image URL (using Unsplash)
    const imageUrl = 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&q=80';

    // Update the product with image
    const result = await Product.updateOne(
      { name: 'MacBook Air M3' },
      {
        $set: {
          images: [imageUrl]
        }
      }
    );

    console.log('\n📝 Update result:');
    console.log('  Matched:', result.matchedCount);
    console.log('  Modified:', result.modifiedCount);

    if (result.matchedCount === 0) {
      console.log('\n❌ Product not found!');
    } else if (result.modifiedCount === 0) {
      console.log('\n⚠️ Product found but not modified (maybe already has this image)');
    } else {
      console.log('\n✅ Product image added successfully!');
    }

    // Verify the update
    const product = await Product.findOne({ name: 'MacBook Air M3' });
    console.log('\n🔍 Verification:');
    console.log('  Product name:', product.name);
    console.log('  Images count:', product.images?.length || 0);
    if (product.images && product.images.length > 0) {
      console.log('  Image URL:', product.images[0]);
    }

    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

addProductImage();