// Check orders for specific user
const mongoose = require('mongoose');
require('dotenv').config();

async function checkUserOrders() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rez-app');
    console.log('✅ Connected to MongoDB');

    const Order = mongoose.model('Order', new mongoose.Schema({}, { strict: false }));

    // Get all users with orders
    const users = await Order.distinct('user');

    console.log(`\n👥 Found ${users.length} users with orders\n`);

    for (const userId of users) {
      const userOrders = await Order.find({ user: userId })
        .select('orderNumber status totalPrice createdAt')
        .sort({ createdAt: -1 })
        .lean();

      console.log(`\n👤 User: ${userId}`);
      console.log(`   Total Orders: ${userOrders.length}`);

      // Count by status
      const statusCounts = {};
      userOrders.forEach(order => {
        statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
      });

      console.log('   Orders by status:');
      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`     - ${status}: ${count}`);
      });

      // Exclude pending_payment
      const nonPending = userOrders.filter(o => o.status !== 'pending_payment').length;
      console.log(`   📊 Count (excluding pending_payment): ${nonPending}`);

      // Show what tracking page would show
      const activeStatuses = ['placed', 'pending', 'confirmed', 'preparing', 'processing', 'ready', 'dispatched', 'shipped', 'out_for_delivery'];
      const deliveredStatuses = ['delivered', 'cancelled', 'refunded'];

      const active = userOrders.filter(o => activeStatuses.includes(o.status)).length;
      const delivered = userOrders.filter(o => deliveredStatuses.includes(o.status)).length;

      console.log(`   📱 Tracking page would show:`);
      console.log(`     - Active: ${active}`);
      console.log(`     - Delivered: ${delivered}`);
    }

    await mongoose.disconnect();
    console.log('\n✅ Done');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkUserOrders();
