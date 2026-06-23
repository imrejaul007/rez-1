import mongoose from 'mongoose';
import { connectDatabase } from '../config/database';
import { Order } from '../models/Order';
import { User } from '../models/User';
import { Product } from '../models/Product';
import { Store } from '../models/Store';

async function seedOrders() {
  try {
    console.log('🚀 Starting Order seeding...');
    
    // Connect to database
    await connectDatabase();
    console.log('✅ Connected to database');
    
    // Get existing data to create relationships
    const users = await User.find({}).limit(5);
    const products = await Product.find({}).limit(10);
    const stores = await Store.find({}).limit(5);
    
    if (users.length === 0 || products.length === 0 || stores.length === 0) {
      console.log('❌ Please run basic seeding first (users, products, stores)');
      process.exit(1);
    }
    
    console.log(`Found ${users.length} users, ${products.length} products, ${stores.length} stores`);
    
    // Clear existing orders
    await Order.deleteMany({});
    console.log('🗑️  Cleared existing orders');
    
    // Generate order number
    const generateOrderNumber = () => {
      const timestamp = Date.now().toString().slice(-6);
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      return `ORD${timestamp}${random}`;
    };
    
    // Create sample orders
    const orders = [
      {
        orderNumber: generateOrderNumber(),
        user: users[0]._id,
        items: [
          {
            product: products[0]._id,
            store: stores[0]._id,
            name: 'iPhone 15 Pro',
            image: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=500',
            quantity: 1,
            variant: {
              type: 'color',
              value: 'Titanium Black'
            },
            price: 99999,
            originalPrice: 109999,
            discount: 10000,
            subtotal: 99999
          }
        ],
        totals: {
          subtotal: 99999,
          tax: 10000,
          delivery: 0,
          discount: 10000,
          cashback: 2500,
          total: 99999,
          paidAmount: 99999
        },
        payment: {
          method: 'card',
          status: 'paid',
          transactionId: 'txn_' + Math.random().toString(36).substr(2, 12),
          paymentGateway: 'razorpay',
          paidAt: new Date(Date.now() - 432000000) // 5 days ago
        },
        delivery: {
          method: 'standard',
          status: 'delivered',
          address: {
            name: 'John Doe',
            phone: '+919876543210',
            email: 'john.doe@example.com',
            addressLine1: '123 Main Street',
            addressLine2: 'Apartment 4B',
            city: 'Delhi',
            state: 'Delhi',
            pincode: '110001',
            country: 'India',
            coordinates: [77.2090, 28.6139],
            landmark: 'Near Metro Station',
            addressType: 'home'
          },
          estimatedTime: new Date(Date.now() - 259200000), // 3 days ago
          actualTime: new Date(Date.now() - 345600000), // 4 days ago
          dispatchedAt: new Date(Date.now() - 388800000), // 4.5 days ago
          deliveredAt: new Date(Date.now() - 345600000), // 4 days ago
          trackingId: 'TRK' + Math.random().toString(36).substr(2, 10).toUpperCase(),
          deliveryPartner: 'Blue Dart',
          deliveryFee: 0,
          instructions: 'Please call before delivery',
          deliveryOTP: '1234',
          attempts: [
            {
              attemptNumber: 1,
              attemptedAt: new Date(Date.now() - 345600000),
              status: 'successful'
            }
          ]
        },
        status: 'delivered',
        timeline: [
          {
            status: 'placed',
            message: 'Order placed successfully',
            timestamp: new Date(Date.now() - 432000000), // 5 days ago
            updatedBy: 'system'
          },
          {
            status: 'confirmed',
            message: 'Order confirmed by merchant',
            timestamp: new Date(Date.now() - 420000000), // 4.8 days ago
            updatedBy: 'merchant'
          },
          {
            status: 'preparing',
            message: 'Order is being prepared',
            timestamp: new Date(Date.now() - 410000000), // 4.7 days ago
            updatedBy: 'merchant'
          },
          {
            status: 'dispatched',
            message: 'Order dispatched for delivery',
            timestamp: new Date(Date.now() - 388800000), // 4.5 days ago
            updatedBy: 'system'
          },
          {
            status: 'delivered',
            message: 'Order delivered successfully',
            timestamp: new Date(Date.now() - 345600000), // 4 days ago
            updatedBy: 'delivery_partner'
          }
        ],
        analytics: {
          source: 'app',
          campaign: 'new_year_sale',
          deviceInfo: {
            platform: 'ios',
            version: '17.2',
            userAgent: 'REZ/1.0 iOS'
          }
        },
        notifications: {
          smsEnabled: true,
          emailEnabled: true,
          pushEnabled: true
        },
        feedback: {
          rating: 5,
          comment: 'Excellent service and fast delivery!',
          submittedAt: new Date(Date.now() - 259200000), // 3 days ago
          helpful: 12
        }
      },
      {
        orderNumber: generateOrderNumber(),
        user: users[1]._id,
        items: [
          {
            product: products[1]._id,
            store: stores[1]._id,
            name: 'Premium Cotton T-Shirt',
            image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500',
            quantity: 2,
            variant: {
              type: 'size',
              value: 'L'
            },
            price: 1999,
            originalPrice: 2499,
            discount: 500,
            subtotal: 3998
          }
        ],
        totals: {
          subtotal: 3998,
          tax: 400,
          delivery: 50,
          discount: 1000,
          cashback: 200,
          total: 3448,
          paidAmount: 3448
        },
        payment: {
          method: 'upi',
          status: 'paid',
          transactionId: 'upi_' + Math.random().toString(36).substr(2, 12),
          paymentGateway: 'phonepe',
          paidAt: new Date(Date.now() - 172800000) // 2 days ago
        },
        delivery: {
          method: 'express',
          status: 'out_for_delivery',
          address: {
            name: 'Jane Smith',
            phone: '+919876543211',
            email: 'jane.smith@example.com',
            addressLine1: '456 Park Avenue',
            city: 'Mumbai',
            state: 'Maharashtra',
            pincode: '400001',
            country: 'India',
            coordinates: [72.8777, 19.0760],
            addressType: 'home'
          },
          estimatedTime: new Date(Date.now() + 14400000), // 4 hours from now
          dispatchedAt: new Date(Date.now() - 86400000), // 1 day ago
          trackingId: 'TRK' + Math.random().toString(36).substr(2, 10).toUpperCase(),
          deliveryPartner: 'DTDC',
          deliveryFee: 50,
          instructions: 'Ring the bell twice',
          deliveryOTP: '5678'
        },
        status: 'preparing',
        timeline: [
          {
            status: 'placed',
            message: 'Order placed successfully',
            timestamp: new Date(Date.now() - 172800000), // 2 days ago
            updatedBy: 'system'
          },
          {
            status: 'confirmed',
            message: 'Order confirmed and payment received',
            timestamp: new Date(Date.now() - 169200000), // 1.9 days ago
            updatedBy: 'system'
          },
          {
            status: 'preparing',
            message: 'Items being prepared for dispatch',
            timestamp: new Date(Date.now() - 126000000), // 1.5 days ago
            updatedBy: 'merchant'
          },
          {
            status: 'dispatched',
            message: 'Order dispatched',
            timestamp: new Date(Date.now() - 86400000), // 1 day ago
            updatedBy: 'system'
          },
          {
            status: 'out_for_delivery',
            message: 'Order out for delivery',
            timestamp: new Date(Date.now() - 10800000), // 3 hours ago
            updatedBy: 'delivery_partner'
          }
        ],
        analytics: {
          source: 'web',
          deviceInfo: {
            platform: 'web',
            version: '1.0',
            userAgent: 'Mozilla/5.0 Chrome/91.0'
          }
        },
        notifications: {
          smsEnabled: true,
          emailEnabled: true,
          pushEnabled: false
        }
      },
      {
        orderNumber: generateOrderNumber(),
        user: users[0]._id,
        items: [
          {
            product: products[0]._id,
            store: stores[0]._id,
            name: 'iPhone 15 Pro',
            image: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=500',
            quantity: 1,
            price: 99999,
            subtotal: 99999
          }
        ],
        totals: {
          subtotal: 99999,
          tax: 10000,
          delivery: 0,
          discount: 0,
          cashback: 2500,
          total: 109999,
          paidAmount: 0
        },
        payment: {
          method: 'cod',
          status: 'pending'
        },
        delivery: {
          method: 'standard',
          status: 'pending',
          address: {
            name: 'John Doe',
            phone: '+919876543210',
            addressLine1: '123 Main Street',
            city: 'Delhi',
            state: 'Delhi',
            pincode: '110001',
            country: 'India',
            addressType: 'home'
          },
          estimatedTime: new Date(Date.now() + 172800000), // 2 days from now
          deliveryFee: 0,
          instructions: 'Cash on delivery order'
        },
        status: 'placed',
        timeline: [
          {
            status: 'placed',
            message: 'Order placed with cash on delivery',
            timestamp: new Date(Date.now() - 3600000), // 1 hour ago
            updatedBy: 'system'
          }
        ],
        analytics: {
          source: 'app',
          deviceInfo: {
            platform: 'android',
            version: '14',
            userAgent: 'REZ/1.0 Android'
          }
        },
        notifications: {
          smsEnabled: true,
          emailEnabled: true,
          pushEnabled: true
        }
      }
    ];
    
    const createdOrders = await Order.insertMany(orders);
    console.log(`✅ Created ${createdOrders.length} orders`);
    
    // Display summary
    console.log('\n📊 Order Summary:');
    for (let i = 0; i < createdOrders.length; i++) {
      const order = createdOrders[i];
      const user = users.find(u => u._id?.toString() === order.user?.toString());
      console.log(`  ${order.orderNumber}: ${user?.profile?.firstName || 'Unknown'} - ${order.status} - ₹${order.totals.total}`);
    }
    
    console.log('\n🎉 Order seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding orders:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from database');
    process.exit(0);
  }
}

if (require.main === module) {
  seedOrders();
}

export { seedOrders };