const mongoose = require('mongoose');
require('dotenv').config();

async function assignProducts() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.DB_NAME || 'rez-app' });
    console.log('✅ Connected to MongoDB\n');

    // Get going_out categories
    const categories = await mongoose.connection.db.collection('categories').find({ type: 'going_out' }).toArray();
    console.log('🎯 Found Going Out Categories:');
    categories.forEach(c => console.log('  -', c.name, '| ID:', c._id.toString()));

    // Get all products
    const products = await mongoose.connection.db.collection('products').find().toArray();
    console.log('\n📦 Found', products.length, 'products\n');

    const ObjectId = mongoose.Types.ObjectId;

    // Map products to going_out categories based on product names/types
    const fashionCategory = categories.find(c => c.slug === 'fashion-beauty');
    const foodCategory = categories.find(c => c.slug === 'food-dining');
    const entertainmentCategory = categories.find(c => c.slug === 'entertainment');

    let updated = 0;

    for (const product of products) {
      let newCategoryId = null;

      const name = product.name.toLowerCase();

      // Fashion & Beauty: clothing, shirts, shoes, accessories
      if (name.includes('shirt') || name.includes('shoes') || name.includes('fashion') || 
          name.includes('clothing') || name.includes('apparel') || name.includes('watch') ||
          name.includes('bag') || name.includes('accessory')) {
        newCategoryId = fashionCategory._id;
      }
      // Food & Dining: food items, snacks, beverages
      else if (name.includes('coffee') || name.includes('pizza') || name.includes('burger') ||
               name.includes('food') || name.includes('meal') || name.includes('snack') ||
               name.includes('restaurant')) {
        newCategoryId = foodCategory._id;
      }
      // Entertainment: electronics, headphones, speakers, gadgets
      else if (name.includes('headphone') || name.includes('speaker') || name.includes('music') ||
               name.includes('game') || name.includes('entertainment') || name.includes('sony') ||
               name.includes('iphone') || name.includes('samsung') || name.includes('macbook') ||
               name.includes('laptop') || name.includes('phone')) {
        newCategoryId = entertainmentCategory._id;
      }

      if (newCategoryId) {
        await mongoose.connection.db.collection('products').updateOne(
          { _id: product._id },
          { $set: { category: newCategoryId } }
        );
        console.log('✅ Updated', product.name, '→', categories.find(c => c._id.equals(newCategoryId)).name);
        updated++;
      }
    }

    console.log('\n📊 Updated', updated, 'products\n');

    // Now update category product counts
    for (const category of categories) {
      const count = await mongoose.connection.db.collection('products').countDocuments({ category: category._id });
      
      await mongoose.connection.db.collection('categories').updateOne(
        { _id: category._id },
        { $set: { productCount: count } }
      );
      
      console.log('🔢 Updated', category.name, 'product count:', count);
    }

    await mongoose.disconnect();
    console.log('\n✨ All done! Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

assignProducts();

