// Check orders for current user
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };

async function checkOrders() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const userId = new mongoose.Types.ObjectId('68c145d5f016515d8eb31c0c');

    const orders = await db.collection('orders').find({ user: userId }).toArray();

    console.log('\n📦 Orders found:', orders.length);

    orders.forEach((order, i) => {
      console.log(`\nOrder ${i + 1}:`);
      console.log('  ID:', order._id);
      console.log('  Order Number:', order.orderNumber);
      console.log('  Status:', order.status);
      console.log('  Items count:', order.items?.length || 0);
      console.log('  Has items array:', !!order.items);

      if (order.items && order.items.length > 0) {
        console.log('  First item:', {
          product: order.items[0].product,
          name: order.items[0].name,
          hasProduct: !!order.items[0].product
        });
      }
    });

    console.log('\n🔍 Checking if items have product references...');

    for (const order of orders) {
      if (order.items && order.items.length > 0) {
        for (const item of order.items) {
          if (item.product) {
            const product = await db.collection('products').findOne({ _id: item.product });
            console.log('Product found for item:', !!product, 'Product ID:', item.product);
          }
        }
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

checkOrders();
