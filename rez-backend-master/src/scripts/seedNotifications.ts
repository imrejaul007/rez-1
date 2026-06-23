import mongoose from 'mongoose';
import { connectDatabase } from '../config/database';
import { Notification } from '../models/Notification';
import { User } from '../models/User';
import { Order } from '../models/Order';
import { Product } from '../models/Product';

async function seedNotifications() {
  try {
    console.log('🚀 Starting Notification seeding...');
    
    // Connect to database
    await connectDatabase();
    console.log('✅ Connected to database');
    
    // Get existing data to create relationships
    const users = await User.find({}).limit(10);
    const orders = await Order.find({}).limit(10);
    const products = await Product.find({}).limit(10);
    
    if (users.length === 0) {
      console.log('❌ Please run basic seeding first (users)');
      process.exit(1);
    }
    
    console.log(`Found ${users.length} users, ${orders.length} orders, ${products.length} products`);
    
    // Clear existing notifications
    await Notification.deleteMany({});
    console.log('🗑️  Cleared existing notifications');
    
    // Create sample notifications for each user
    const notifications = [];
    
    for (const user of users) {
      // Order-related notifications
      if (orders.length > 0) {
        const userOrders = orders.filter(order => 
          order.user && order.user.toString() === user._id?.toString()
        );
        
        for (const order of userOrders.slice(0, 2)) { // Max 2 orders per user
          // Order confirmation
          notifications.push({
            user: user._id,
            title: 'Order Confirmed! 🎉',
            message: `Your order ${order.orderNumber} has been confirmed and will be processed shortly.`,
            type: 'order',
            priority: 'high',
            channel: 'push',
            status: 'sent',
            data: {
              orderId: order._id,
              orderNumber: order.orderNumber,
              totalAmount: order.totals?.total || 0
            },
            actionButton: {
              text: 'Track Order',
              action: 'navigate',
              actionData: { screen: 'OrderDetails', orderId: order._id }
            },
            isRead: Math.random() > 0.3, // 70% chance of being read
            readAt: Math.random() > 0.3 ? new Date(Date.now() - Math.floor(Math.random() * 86400000)) : null,
            scheduledAt: new Date(Date.now() - Math.floor(Math.random() * 172800000)), // Up to 2 days ago
            sentAt: new Date(Date.now() - Math.floor(Math.random() * 172800000))
          });
          
          // Delivery updates
          if (order.status === 'delivered') {
            notifications.push({
              user: user._id,
              title: 'Order Delivered Successfully! 📦',
              message: `Great news! Your order ${order.orderNumber} has been delivered. We hope you love your purchase!`,
              type: 'delivery',
              priority: 'high',
              channel: 'push',
              status: 'sent',
              data: {
                orderId: order._id,
                orderNumber: order.orderNumber,
                deliveredAt: order.delivery?.deliveredAt
              },
              actionButton: {
                text: 'Rate Product',
                action: 'navigate',
                actionData: { screen: 'ReviewProduct', orderId: order._id }
              },
              isRead: Math.random() > 0.5, // 50% chance of being read
              readAt: Math.random() > 0.5 ? new Date(Date.now() - Math.floor(Math.random() * 43200000)) : null,
              scheduledAt: new Date(Date.now() - Math.floor(Math.random() * 86400000)), // Up to 1 day ago
              sentAt: new Date(Date.now() - Math.floor(Math.random() * 86400000))
            });
          }
        }
      }
      
      // Promotional notifications
      notifications.push({
        user: user._id,
        title: '🔥 Weekend Sale - Up to 50% Off!',
        message: 'Don\'t miss our biggest sale of the month! Grab your favorite items at unbeatable prices.',
        type: 'promotional',
        priority: 'medium',
        channel: 'push',
        status: 'sent',
        data: {
          saleType: 'weekend_sale',
          discountPercentage: 50,
          validUntil: new Date(Date.now() + 172800000), // 2 days from now
          categories: ['electronics', 'fashion']
        },
        actionButton: {
          text: 'Shop Now',
          action: 'navigate',
          actionData: { screen: 'Sale', saleId: 'weekend_sale_2025' }
        },
        isRead: Math.random() > 0.7, // 30% chance of being read
        readAt: Math.random() > 0.7 ? new Date(Date.now() - Math.floor(Math.random() * 21600000)) : null,
        scheduledAt: new Date(Date.now() - Math.floor(Math.random() * 43200000)), // Up to 12 hours ago
        sentAt: new Date(Date.now() - Math.floor(Math.random() * 43200000)),
        campaign: {
          id: 'weekend_sale_2025',
          name: 'Weekend Sale Campaign',
          segmentId: 'active_users'
        }
      });
      
      // Wishlist notifications
      if (products.length > 0) {
        const randomProduct = products[Math.floor(Math.random() * products.length)];
        notifications.push({
          user: user._id,
          title: '💝 Item from your wishlist is on sale!',
          message: `Good news! "${randomProduct.name}" is now available at a special price. Don't let this deal slip away!`,
          type: 'wishlist',
          priority: 'medium',
          channel: 'push',
          status: 'sent',
          data: {
            productId: randomProduct._id,
            productName: randomProduct.name,
            originalPrice: randomProduct.pricing?.original || 2499,
            salePrice: randomProduct.pricing?.selling || 1999,
            discountPercentage: Math.floor(((randomProduct.pricing?.original - randomProduct.pricing?.selling) / randomProduct.pricing?.original) * 100) || 20
          },
          actionButton: {
            text: 'Buy Now',
            action: 'navigate',
            actionData: { screen: 'ProductDetails', productId: randomProduct._id }
          },
          isRead: Math.random() > 0.6, // 40% chance of being read
          readAt: Math.random() > 0.6 ? new Date(Date.now() - Math.floor(Math.random() * 86400000)) : null,
          scheduledAt: new Date(Date.now() - Math.floor(Math.random() * 86400000)),
          sentAt: new Date(Date.now() - Math.floor(Math.random() * 86400000))
        });
      }
      
      // System notifications
      notifications.push({
        user: user._id,
        title: 'Welcome to REZ! 🚀',
        message: 'Thanks for joining us! Explore amazing deals and earn cashback on every purchase.',
        type: 'system',
        priority: 'low',
        channel: 'push',
        status: 'sent',
        data: {
          welcomeBonus: 100,
          currency: 'INR'
        },
        actionButton: {
          text: 'Start Shopping',
          action: 'navigate',
          actionData: { screen: 'Home' }
        },
        isRead: Math.random() > 0.8, // 20% chance of being read
        readAt: Math.random() > 0.8 ? new Date(Date.now() - Math.floor(Math.random() * 259200000)) : null,
        scheduledAt: new Date(Date.now() - Math.floor(Math.random() * 432000000)), // Up to 5 days ago
        sentAt: new Date(Date.now() - Math.floor(Math.random() * 432000000))
      });
      
      // Cashback notifications
      notifications.push({
        user: user._id,
        title: '💰 Cashback Credited!',
        message: `Awesome! ₹${Math.floor(Math.random() * 500) + 50} cashback has been credited to your wallet.`,
        type: 'cashback',
        priority: 'medium',
        channel: 'push',
        status: 'sent',
        data: {
          cashbackAmount: Math.floor(Math.random() * 500) + 50,
          currency: 'INR',
          source: 'purchase_cashback',
          orderId: orders.length > 0 ? orders[Math.floor(Math.random() * orders.length)]._id : null
        },
        actionButton: {
          text: 'View Wallet',
          action: 'navigate',
          actionData: { screen: 'Wallet' }
        },
        isRead: Math.random() > 0.4, // 60% chance of being read
        readAt: Math.random() > 0.4 ? new Date(Date.now() - Math.floor(Math.random() * 43200000)) : null,
        scheduledAt: new Date(Date.now() - Math.floor(Math.random() * 86400000)),
        sentAt: new Date(Date.now() - Math.floor(Math.random() * 86400000))
      });
    }
    
    const createdNotifications = await Notification.insertMany(notifications);
    console.log(`✅ Created ${createdNotifications.length} notifications`);
    
    // Display summary
    console.log('\n📊 Notification Summary:');
    const stats = {
      total: createdNotifications.length,
      read: createdNotifications.filter(n => n.isRead).length,
      unread: createdNotifications.filter(n => !n.isRead).length,
      byType: {} as { [key: string]: number }
    };
    
    createdNotifications.forEach(notification => {
      if (!stats.byType[notification.type]) {
        stats.byType[notification.type] = 0;
      }
      stats.byType[notification.type]++;
    });
    
    console.log(`  Total: ${stats.total} notifications`);
    console.log(`  Read: ${stats.read} | Unread: ${stats.unread}`);
    console.log(`  By Type:`);
    Object.entries(stats.byType).forEach(([type, count]) => {
      console.log(`    ${type}: ${count}`);
    });
    
    // Sample per user
    console.log(`\n📱 Per User (showing first 3 users):`);
    for (let i = 0; i < Math.min(users.length, 3); i++) {
      const user = users[i];
      const userNotifications = createdNotifications.filter(n => 
        n.user?.toString() === user._id?.toString()
      );
      const userName = user.profile?.firstName || 'Unknown';
      const unreadCount = userNotifications.filter(n => !n.isRead).length;
      
      console.log(`  ${userName}: ${userNotifications.length} total, ${unreadCount} unread`);
    }
    
    console.log('\n🎉 Notification seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding notifications:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from database');
    process.exit(0);
  }
}

if (require.main === module) {
  seedNotifications();
}

export { seedNotifications };