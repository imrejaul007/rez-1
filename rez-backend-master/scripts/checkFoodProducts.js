const mongoose = require('mongoose');
require('dotenv').config();

async function checkProducts() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.DB_NAME || 'rez-app' });
    
    const allProducts = await mongoose.connection.db.collection('products').find({}).toArray();
    console.log('Total products in DB:', allProducts.length);
    
    const foodCategory = await mongoose.connection.db.collection('categories').findOne({ slug: 'food-dining' });
    console.log('\nFood Category ID:', foodCategory._id.toString());
    
    const foodProducts = await mongoose.connection.db.collection('products').find({ 
      category: foodCategory._id 
    }).toArray();
    
    console.log('\nFood & Dining products:');
    foodProducts.forEach(p => {
      console.log('  -', p.name, '| isActive:', p.isActive, '| type:', p.type);
    });
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkProducts();
