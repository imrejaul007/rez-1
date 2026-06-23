// Quick script to check order statuses in database
const mongoose = require('mongoose');
require('dotenv').config();

async function checkOrders() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rez-app');
    console.log('✅ Connected to MongoDB');

    const Order = mongoose.model('Order', new mongoose.Schema({}, { strict: false }));

    const orders = await Order.find({}).select('orderNumber status totalPrice user createdAt').lean();

    console.log('\n📦 All Orders in Database:');
    console.log('Total Orders:', orders.length);
    console.log('\nOrder Details:');

    orders.forEach((order, index) => {
      console.log(`\n${index + 1}. Order ${order.orderNumber || order._id}`);
      console.log(`   Status: ${order.status}`);
      console.log(`   Total: ₹${order.totalPrice}`);
      console.log(`   User: ${order.user}`);
      console.log(`   Created: ${order.createdAt}`);
    });

    // Count by status
    const statusCounts = {};
    orders.forEach(order => {
      statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
    });

    console.log('\n📊 Orders by Status:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`);
    });

    // Show what would be counted with the filter
    const filteredCount = orders.filter(o => o.status !== 'pending_payment').length;
    console.log(`\n🔢 Orders (excluding pending_payment): ${filteredCount}`);

    await mongoose.disconnect();
    console.log('\n✅ Done');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkOrders();
