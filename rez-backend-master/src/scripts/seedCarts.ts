import mongoose from 'mongoose';
import { connectDatabase } from '../config/database';
import { Cart } from '../models/Cart';
import { User } from '../models/User';
import { Product } from '../models/Product';
import { Store } from '../models/Store';

async function seedCarts() {
  try {
    console.log('🚀 Starting Cart seeding...');
    
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
    
    // Clear existing carts
    await Cart.deleteMany({});
    console.log('🗑️  Cleared existing carts');
    
    // Create sample carts
    const carts = [
      {
        user: users[0]._id,
        items: [
          {
            product: products[0]._id,
            store: stores[0]._id,
            quantity: 1,
            variant: {
              type: 'color',
              value: 'Black'
            },
            price: 99999,
            originalPrice: 109999,
            discount: 10000,
            addedAt: new Date(Date.now() - 86400000), // 1 day ago
            notes: 'Gift for anniversary'
          },
          {
            product: products[1]._id,
            store: stores[1]._id,
            quantity: 2,
            variant: {
              type: 'size',
              value: 'L'
            },
            price: 1999,
            originalPrice: 2499,
            discount: 500,
            addedAt: new Date(Date.now() - 3600000), // 1 hour ago
          }
        ],
        totals: {
          subtotal: 103997,
          tax: 10400,
          delivery: 0,
          discount: 10500,
          cashback: 2600,
          total: 103897,
          savings: 10500
        },
        coupon: {
          code: 'WELCOME10',
          discountType: 'percentage',
          discountValue: 10,
          appliedAmount: 10400,
          appliedAt: new Date(Date.now() - 1800000) // 30 min ago
        },
      },
      {
        user: users[1]._id,
        items: [
          {
            product: products[1]._id,
            store: stores[1]._id,
            quantity: 3,
            variant: {
              type: 'size',
              value: 'M'
            },
            price: 1999,
            originalPrice: 2499,
            discount: 500,
            addedAt: new Date(Date.now() - 7200000), // 2 hours ago
          },
          {
            product: products[0]._id,
            store: stores[0]._id,
            quantity: 1,
            price: 99999,
            addedAt: new Date(Date.now() - 1800000), // 30 min ago
            notes: 'Checking if this fits my needs'
          }
        ],
        totals: {
          subtotal: 105996,
          tax: 10600,
          delivery: 99,
          discount: 1500,
          cashback: 2650,
          total: 115195,
          savings: 1500
        },
      }
    ];
    
    // If we have more users, create a cart with just wishlist items moved to cart
    if (users.length > 2 && products.length > 2) {
      carts.push({
        user: users[2]._id,
        items: [
          {
            product: products[2] ? products[2]._id : products[0]._id,
            store: stores[2] ? stores[2]._id : stores[0]._id,
            quantity: 1,
            price: 3499,
            addedAt: new Date(Date.now() - 600000), // 10 min ago
            notes: 'Moved from wishlist'
          }
        ],
        totals: {
          subtotal: 3499,
          tax: 350,
          delivery: 50,
          discount: 0,
          cashback: 175,
          total: 3899,
          savings: 0
        },
      });
    }
    
    const createdCarts = await Cart.insertMany(carts);
    console.log(`✅ Created ${createdCarts.length} carts`);
    
    // Display summary
    console.log('\n📊 Cart Summary:');
    for (let i = 0; i < createdCarts.length; i++) {
      const cart = createdCarts[i];
      const user = users.find(u => u._id?.toString() === cart.user?.toString());
      console.log(`  Cart ${i + 1}: ${user?.profile?.firstName || 'Unknown'} - ${cart.items.length} items - ₹${cart.totals.total}`);
    }
    
    console.log('\n🎉 Cart seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding carts:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from database');
    process.exit(0);
  }
}

if (require.main === module) {
  seedCarts();
}

export { seedCarts };