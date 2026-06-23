import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Order } from '../src/models/Order';
import { User } from '../src/models/User';
import { Product } from '../src/models/Product';
import { Store } from '../src/models/Store';

dotenv.config();

async function seedTestOrders() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rez-app');
    console.log('✅ Connected to MongoDB');

    // Get the test user
    const testUserId = '68ef4d41061faaf045222506';
    const user = await User.findById(testUserId);

    if (!user) {
      console.log('❌ Test user not found!');
      process.exit(1);
    }

    console.log(`✅ Found test user: ${user.email}`);

    // Get some products and stores
    const products = await Product.find().limit(10);
    const stores = await Store.find().limit(5);

    if (products.length === 0 || stores.length === 0) {
      console.log('❌ No products or stores found. Please seed products and stores first.');
      process.exit(1);
    }

    console.log(`✅ Found ${products.length} products and ${stores.length} stores`);

    // Order templates with different statuses
    const orderTemplates = [
      {
        status: 'delivered',
        itemCount: 3,
        daysAgo: 30
      },
      {
        status: 'delivered',
        itemCount: 2,
        daysAgo: 25
      },
      {
        status: 'delivered',
        itemCount: 1,
        daysAgo: 20
      },
      {
        status: 'shipped',
        itemCount: 2,
        daysAgo: 5
      },
      {
        status: 'processing',
        itemCount: 3,
        daysAgo: 3
      },
      {
        status: 'confirmed',
        itemCount: 2,
        daysAgo: 2
      },
      {
        status: 'pending',
        itemCount: 1,
        daysAgo: 1
      },
      {
        status: 'cancelled',
        itemCount: 2,
        daysAgo: 15
      },
      {
        status: 'delivered',
        itemCount: 4,
        daysAgo: 45
      },
      {
        status: 'delivered',
        itemCount: 2,
        daysAgo: 10
      }
    ];

    console.log('🧹 Checking existing orders for test user...');
    const existingCount = await Order.countDocuments({ user: testUserId });
    console.log(`📊 Current orders count: ${existingCount}`);

    console.log('🌱 Seeding test orders...');

    let seededCount = 0;

    for (const template of orderTemplates) {
      // Select random products for this order
      const orderProducts = [];
      let totalAmount = 0;

      for (let i = 0; i < template.itemCount; i++) {
        const product = products[Math.floor(Math.random() * products.length)];
        const quantity = Math.floor(Math.random() * 3) + 1;
        const price = product.pricing?.originalPrice || 999;

        orderProducts.push({
          product: product._id,
          name: product.name,
          quantity,
          price,
          subtotal: price * quantity,
          thumbnail: product.images?.[0] || 'https://picsum.photos/200'
        });

        totalAmount += price * quantity;
      }

      // Select a random store
      const store = stores[Math.floor(Math.random() * stores.length)];

      // Calculate dates based on daysAgo
      const orderDate = new Date(Date.now() - template.daysAgo * 24 * 60 * 60 * 1000);

      // Build status history
      const statusHistory: any[] = [
        {
          status: 'pending',
          timestamp: orderDate,
          note: 'Order placed successfully'
        }
      ];

      // Add subsequent statuses based on current status
      if (['confirmed', 'processing', 'shipped', 'delivered', 'cancelled'].includes(template.status)) {
        statusHistory.push({
          status: 'confirmed',
          timestamp: new Date(orderDate.getTime() + 30 * 60 * 1000),
          note: 'Order confirmed by store'
        });
      }

      if (['processing', 'shipped', 'delivered'].includes(template.status)) {
        statusHistory.push({
          status: 'processing',
          timestamp: new Date(orderDate.getTime() + 2 * 60 * 60 * 1000),
          note: 'Order is being prepared'
        });
      }

      if (['shipped', 'delivered'].includes(template.status)) {
        statusHistory.push({
          status: 'shipped',
          timestamp: new Date(orderDate.getTime() + 24 * 60 * 60 * 1000),
          note: 'Order has been shipped'
        });
      }

      if (template.status === 'delivered') {
        statusHistory.push({
          status: 'delivered',
          timestamp: new Date(orderDate.getTime() + 48 * 60 * 60 * 1000),
          note: 'Order delivered successfully'
        });
      }

      if (template.status === 'cancelled') {
        statusHistory.push({
          status: 'cancelled',
          timestamp: new Date(orderDate.getTime() + 60 * 60 * 1000),
          note: 'Order cancelled by user',
          cancelledBy: 'user'
        });
      }

      // Create order data
      const orderData = {
        user: testUserId,
        orderNumber: `ORD${Date.now()}${seededCount}`,
        products: orderProducts,
        store: {
          storeId: store._id,
          storeName: store.name,
          storeAddress: store.location?.address || 'Store Address'
        },
        pricing: {
          subtotal: totalAmount,
          deliveryFee: template.status === 'cancelled' ? 0 : 50,
          discount: 0,
          tax: Math.round(totalAmount * 0.18),
          total: template.status === 'cancelled' ? totalAmount : totalAmount + 50 + Math.round(totalAmount * 0.18)
        },
        delivery: {
          address: {
            street: '123 Test Street',
            city: 'Delhi',
            state: 'Delhi',
            pincode: '110001',
            country: 'India'
          },
          instructions: 'Please call before delivery',
          method: 'standard' as any,
          estimatedDate: new Date(orderDate.getTime() + 7 * 24 * 60 * 60 * 1000)
        },
        payment: {
          method: ['wallet', 'card', 'upi'][Math.floor(Math.random() * 3)] as any,
          status: template.status === 'cancelled' ? 'refunded' : 'completed',
          transactionId: `TXN${Date.now()}${seededCount}`,
          paidAmount: template.status === 'cancelled' ? 0 : totalAmount + 50 + Math.round(totalAmount * 0.18)
        },
        status: {
          current: template.status as any,
          history: statusHistory
        },
        createdAt: orderDate,
        updatedAt: statusHistory[statusHistory.length - 1].timestamp
      };

      const order = new Order(orderData);
      await order.save();
      console.log(`✅ Created order: ${order.orderNumber} (${template.status}) - ${template.itemCount} items - ₹${orderData.pricing.total}`);
      seededCount++;
    }

    const finalCount = await Order.countDocuments({ user: testUserId });
    console.log(`\n📊 Final orders count for test user: ${finalCount}`);
    console.log(`✅ Successfully seeded ${seededCount} new orders!`);

    // Display all orders
    const allOrders = await Order.find({ user: testUserId })
      .select('orderNumber status products pricing createdAt')
      .sort({ createdAt: -1 });

    console.log('\n📋 All Orders for Test User:');
    allOrders.forEach((order, i) => {
      const current = (order.status as any) || 'unknown';
      const total = (order as any).pricing?.total || 0;
      const itemCount = (order as any).products?.length || 0;
      console.log(`${i + 1}. ${order.orderNumber} | ${current.toString().toUpperCase()} | ${itemCount} items | ₹${total} | ${order.createdAt.toLocaleDateString()}`);
    });

    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error seeding orders:', error);
    process.exit(1);
  }
}

seedTestOrders();
