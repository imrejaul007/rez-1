const mongoose = require('mongoose');
require('dotenv').config();

async function checkSKUs() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.DB_NAME || 'rez-app' });
    
    const products = await mongoose.connection.db.collection('products').find({}, { projection: { name: 1, sku: 1, 'inventory.sku': 1 } }).toArray();
    console.log('Products SKU Status:');
    products.forEach(p => {
      console.log('  -', p.name, '| sku:', p.sku, '| inventory.sku:', p.inventory?.sku);
    });

    // Drop the unique index on sku if it exists
    try {
      await mongoose.connection.db.collection('products').dropIndex('sku_1');
      console.log('\nDropped unique index on sku field');
    } catch (e) {
      console.log('\nNo sku_1 index to drop');
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkSKUs();
