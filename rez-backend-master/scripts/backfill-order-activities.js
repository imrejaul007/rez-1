// Backfill activity records for existing orders
const mongoose = require('mongoose');
require('dotenv').config();

async function backfillOrderActivities() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rez-app');
    console.log('✅ Connected to MongoDB');

    // Import actual models
    const { Order } = require('../dist/models/Order');
    const { Activity } = require('../dist/models/Activity');
    const { Store } = require('../dist/models/Store');

    // Get all orders with store populated
    const orders = await Order.find({})
      .populate({
        path: 'items.store',
        select: 'name'
      })
      .lean();

    console.log(`\n📦 Found ${orders.length} orders to process\n`);

    let created = 0;

    for (const order of orders) {
      // Check if activity already exists for this order
      const existingActivity = await Activity.findOne({
        'relatedEntity.id': order._id,
        type: 'ORDER'
      });

      if (existingActivity) {
        console.log(`⏭️  Skipping order ${order.orderNumber} - activity already exists`);
        continue;
      }

      // Get store name from first item
      let storeName = 'Store';
      if (order.items && order.items.length > 0 && order.items[0].store) {
        if (typeof order.items[0].store === 'object' && order.items[0].store.name) {
          storeName = order.items[0].store.name;
        } else {
          // If not populated, fetch store manually
          const storeId = order.items[0].store;
          const store = await Store.findById(storeId).select('name').lean();
          if (store) storeName = store.name;
        }
      }

      // Create activity based on order status
      let activityData;

      if (order.status === 'delivered' || order.status === 'completed') {
        activityData = {
          user: order.user,
          type: 'ORDER',
          title: 'Order Delivered',
          description: `Order from ${storeName} was delivered successfully`,
          icon: 'checkmark-circle',
          color: '#10B981',
          relatedEntity: {
            id: order._id,
            type: 'Order'
          },
          metadata: {
            storeName,
            status: 'delivered',
            orderNumber: order.orderNumber
          },
          createdAt: order.deliveredAt || order.createdAt,
          updatedAt: order.deliveredAt || order.createdAt
        };
      } else if (order.status === 'cancelled') {
        activityData = {
          user: order.user,
          type: 'ORDER',
          title: 'Order Cancelled',
          description: `Cancelled order from ${storeName}`,
          icon: 'checkmark-circle',
          color: '#10B981',
          relatedEntity: {
            id: order._id,
            type: 'Order'
          },
          metadata: {
            storeName,
            status: 'cancelled',
            orderNumber: order.orderNumber
          },
          createdAt: order.cancelledAt || order.createdAt,
          updatedAt: order.cancelledAt || order.createdAt
        };
      } else {
        // For other statuses (placed, dispatched, etc.)
        activityData = {
          user: order.user,
          type: 'ORDER',
          title: 'Order Placed',
          description: `Placed an order at ${storeName}`,
          amount: order.totalPrice,
          icon: 'checkmark-circle',
          color: '#10B981',
          relatedEntity: {
            id: order._id,
            type: 'Order'
          },
          metadata: {
            storeName,
            status: order.status,
            orderNumber: order.orderNumber
          },
          createdAt: order.createdAt,
          updatedAt: order.createdAt
        };
      }

      await Activity.create(activityData);
      console.log(`✅ Created activity for order ${order.orderNumber} (${order.status})`);
      created++;
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Total orders processed: ${orders.length}`);
    console.log(`   Activities created: ${created}`);
    console.log(`   Already existed: ${orders.length - created}`);

    await mongoose.disconnect();
    console.log('\n✅ Done');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

backfillOrderActivities();
