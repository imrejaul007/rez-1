const mongoose = require('mongoose');
require('dotenv').config();

async function fixInventory() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.DB_NAME || 'rez-app' });
    
    const result = await mongoose.connection.db.collection('products').updateMany(
      { 
        name: { $in: ['Premium Burger Combo', 'Artisan Coffee & Pastry', 'Sushi Platter Deluxe', 'Gourmet Pizza Margherita'] }
      },
      { 
        $set: { 'inventory.isAvailable': true } 
      }
    );
    
    console.log('Updated', result.modifiedCount, 'products with inventory.isAvailable = true');
    
    const foodProducts = await mongoose.connection.db.collection('products').find({ 
      name: { $in: ['Premium Burger Combo', 'Artisan Coffee & Pastry', 'Sushi Platter Deluxe', 'Gourmet Pizza Margherita'] }
    }).toArray();
    
    console.log('\nVerification:');
    foodProducts.forEach(p => {
      console.log('  -', p.name, '| isAvailable:', p.inventory.isAvailable);
    });
    
    await mongoose.disconnect();
    console.log('\nAll done!');
  } catch (error) {
    console.error('Error:', error);
  }
}

fixInventory();
