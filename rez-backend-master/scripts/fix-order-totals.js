// Fix Order Totals - Migration Script
// Updates orders where total is 0 by recalculating from subtotal + tax + delivery - discount

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME;

async function fixOrderTotals() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      dbName: DB_NAME,
    });
    console.log('✅ Connected to MongoDB');

    // Access Order collection directly
    const Order = mongoose.connection.collection('orders');

    // Find all orders with total = 0
    const ordersWithZeroTotal = await Order.find({
      'totals.total': 0,
      'totals.subtotal': { $gt: 0 }
    }).toArray();

    console.log(`\n📊 Found ${ordersWithZeroTotal.length} orders with total = 0 but subtotal > 0\n`);

    if (ordersWithZeroTotal.length === 0) {
      console.log('✅ No orders need fixing');
      await mongoose.disconnect();
      return;
    }

    let updated = 0;
    let failed = 0;

    for (const order of ordersWithZeroTotal) {
      try {
        const { subtotal, tax, delivery, discount } = order.totals;
        const calculatedTotal = (subtotal || 0) + (tax || 0) + (delivery || 0) - (discount || 0);

        console.log(`📦 Order: ${order.orderNumber}`);
        console.log(`   Current total: ₹${order.totals.total}`);
        console.log(`   Subtotal: ₹${subtotal}`);
        console.log(`   Tax: ₹${tax}`);
        console.log(`   Delivery: ₹${delivery}`);
        console.log(`   Discount: ₹${discount}`);
        console.log(`   Calculated total: ₹${calculatedTotal}`);

        // Update the order using updateOne
        await Order.updateOne(
          { _id: order._id },
          { $set: { 'totals.total': calculatedTotal } }
        );

        console.log(`   ✅ Updated to ₹${calculatedTotal}\n`);
        updated++;
      } catch (error) {
        console.error(`   ❌ Failed to update order ${order.orderNumber}:`, error.message);
        failed++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Successfully updated: ${updated} orders`);
    console.log(`❌ Failed: ${failed} orders`);
    console.log(`📦 Total processed: ${ordersWithZeroTotal.length} orders`);
    console.log('='.repeat(60));

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    console.log('✅ Migration complete!\n');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the migration
fixOrderTotals();
