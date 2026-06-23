const mongoose = require('mongoose');
require('dotenv').config();

async function checkData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.DB_NAME || 'rez-app' });
    console.log('✅ Connected to MongoDB\n');

    // Count total products
    const productCount = await mongoose.connection.db.collection('products').countDocuments();
    console.log('📦 Total Products:', productCount);

    // Get sample products with their categories
    const products = await mongoose.connection.db.collection('products').find().limit(5).toArray();
    console.log('\n📋 Sample Products:');
    products.forEach(p => {
      console.log('  -', p.name, '| Category:', p.category, '| Type:', typeof p.category);
    });

    // Count categories
    const categoryCount = await mongoose.connection.db.collection('categories').countDocuments();
    console.log('\n🏷️  Total Categories:', categoryCount);

    // Get going_out categories
    const goingOutCats = await mongoose.connection.db.collection('categories').find({ type: 'going_out' }).toArray();
    console.log('\n🎯 Going Out Categories:');
    goingOutCats.forEach(c => {
      console.log('  -', c.name, '| ID:', c._id.toString(), '| Product Count:', c.productCount);
    });

    // Count products by category type
    const productsByType = await mongoose.connection.db.collection('products').aggregate([
      {
        $lookup: {
          from: 'categories',
          localField: 'category',
          foreignField: '_id',
          as: 'categoryInfo'
        }
      },
      {
        $unwind: { path: '$categoryInfo', preserveNullAndEmptyArrays: true }
      },
      {
        $group: {
          _id: '$categoryInfo.type',
          count: { $sum: 1 }
        }
      }
    ]).toArray();

    console.log('\n📊 Products by Category Type:');
    productsByType.forEach(t => {
      console.log('  -', t._id || 'No Type', ':', t.count);
    });

    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkData();

