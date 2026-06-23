const mongoose = require('mongoose');
require('dotenv').config();

async function checkInventory() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.DB_NAME || 'rez-app' });
    
    const foodProducts = await mongoose.connection.db.collection('products').find({ 
      name: { $in: ['Premium Burger Combo', 'Artisan Coffee & Pastry', 'Sushi Platter Deluxe', 'Gourmet Pizza Margherita'] }
    }).toArray();
    
    console.log('Food Products Inventory Status:');
    foodProducts.forEach(p => {
      console.log('  -', p.name);
      console.log('    isActive:', p.isActive);
      console.log('    inventory.isAvailable:', p.inventory?.isAvailable);
      console.log('    inventory.stock:', p.inventory?.stock);
      console.log('');
    });
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkInventory();
