/**
 * Seed Cashback Data
 * Creates sample cashback transactions for testing
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/User';
import { Order } from '../models/Order';
import { UserCashback } from '../models/UserCashback';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rez-app';

async function seedCashback() {
  try {
    console.log('🌱 Starting Cashback Seed...\n');

    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get users and orders
    console.log('👥 Fetching users and orders...');
    const users = await User.find({}).limit(5);
    const orders = await Order.find({}).limit(10);

    console.log(`✅ Found ${users.length} users and ${orders.length} orders\n`);

    if (users.length === 0) {
      console.log('⚠️  No users found. Please seed users first.');
      process.exit(0);
    }

    // Clear existing cashback
    console.log('🗑️  Clearing existing cashback...');
    await UserCashback.deleteMany({});
    console.log('✅ Cleared existing cashback\n');

    // Create cashback transactions
    console.log('💰 Creating cashback transactions...');
    const cashbackData = [];

    // For each user, create various cashback transactions
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      const userOrders = orders.slice(i * 2, i * 2 + 2); // 2 orders per user

      // 1. Order-based cashback (credited)
      if (userOrders.length > 0) {
        const order = userOrders[0];
        cashbackData.push({
          user: user._id,
          order: order._id,
          amount: Math.round((order.totals?.total || 500) * 0.05), // 5% cashback
          cashbackRate: 5,
          source: 'order',
          status: 'credited',
          earnedDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
          creditedDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
          expiryDate: new Date(Date.now() + 80 * 24 * 60 * 60 * 1000), // 80 days from now
          description: 'Cashback from order',
          metadata: {
            orderAmount: order.totals?.total || 500,
            productCategories: ['Electronics'],
            storeName: 'Sample Store',
          },
          pendingDays: 7,
          isRedeemed: true,
          redeemedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        });
      }

      // 2. Order-based cashback (pending)
      if (userOrders.length > 1) {
        const order = userOrders[1];
        cashbackData.push({
          user: user._id,
          order: order._id,
          amount: Math.round((order.totals?.total || 300) * 0.05),
          cashbackRate: 5,
          source: 'order',
          status: 'pending',
          earnedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
          expiryDate: new Date(Date.now() + 88 * 24 * 60 * 60 * 1000),
          description: 'Cashback from recent order',
          metadata: {
            orderAmount: order.totals?.total || 300,
            productCategories: ['Fashion'],
            storeName: 'Fashion Store',
          },
          pendingDays: 7,
          isRedeemed: false,
        });
      }

      // 3. Referral cashback (credited)
      cashbackData.push({
        user: user._id,
        amount: 50,
        cashbackRate: 0,
        source: 'referral',
        status: 'credited',
        earnedDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        creditedDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
        expiryDate: new Date(Date.now() + 75 * 24 * 60 * 60 * 1000),
        description: 'Referral bonus - Friend joined',
        metadata: {
          orderAmount: 0,
          productCategories: [],
          campaignName: 'Refer a Friend',
        },
        pendingDays: 7,
        isRedeemed: true,
        redeemedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      });

      // 4. Welcome bonus (credited)
      if (i === 0) {
        cashbackData.push({
          user: user._id,
          amount: 100,
          cashbackRate: 0,
          source: 'signup',
          status: 'credited',
          earnedDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          creditedDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          expiryDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
          description: 'Welcome bonus - Thank you for joining REZ!',
          metadata: {
            orderAmount: 0,
            productCategories: [],
            campaignName: 'Welcome Bonus',
          },
          pendingDays: 0,
          isRedeemed: true,
          redeemedAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000),
        });
      }

      // 5. Promotional cashback (pending, expiring soon)
      cashbackData.push({
        user: user._id,
        amount: 25,
        cashbackRate: 0,
        source: 'promotion',
        status: 'pending',
        earnedDate: new Date(Date.now() - 80 * 24 * 60 * 60 * 1000),
        expiryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // Expires in 5 days
        description: 'Festival special cashback',
        metadata: {
          orderAmount: 0,
          productCategories: [],
          campaignName: 'Festival Bonanza',
          bonusMultiplier: 2,
        },
        pendingDays: 7,
        isRedeemed: false,
      });

      // 6. Expired cashback
      if (i % 2 === 0) {
        cashbackData.push({
          user: user._id,
          amount: 15,
          cashbackRate: 5,
          source: 'order',
          status: 'expired',
          earnedDate: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000),
          expiryDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // Expired 5 days ago
          description: 'Cashback from old order (expired)',
          metadata: {
            orderAmount: 200,
            productCategories: ['Home'],
            storeName: 'Home Essentials',
          },
          pendingDays: 7,
          isRedeemed: false,
        });
      }

      // 7. Bonus cashback (credited)
      cashbackData.push({
        user: user._id,
        amount: 75,
        cashbackRate: 0,
        source: 'bonus',
        status: 'credited',
        earnedDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        creditedDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        expiryDate: new Date(Date.now() + 85 * 24 * 60 * 60 * 1000),
        description: 'Loyalty bonus - 10th order milestone',
        metadata: {
          orderAmount: 0,
          productCategories: [],
          campaignName: 'Loyalty Rewards',
          bonusMultiplier: 1.5,
        },
        pendingDays: 4,
        isRedeemed: false,
      });
    }

    await UserCashback.insertMany(cashbackData);
    console.log(`✅ Created ${cashbackData.length} cashback transactions\n`);

    // Verify and show statistics
    const stats = await UserCashback.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
        },
      },
    ]);

    console.log('📊 Cashback Statistics:');
    stats.forEach((stat) => {
      console.log(`   ${stat._id}: ${stat.count} transactions, ₹${stat.totalAmount}`);
    });

    // Show sample
    const sample = await UserCashback.findOne({ status: 'pending' })
      .populate('user', 'email profile.firstName profile.lastName')
      .populate('order', 'orderNumber totals.grandTotal');

    if (sample) {
      console.log('\n📋 Sample Pending Cashback:');
      console.log(`   User: ${(sample.user as any)?.email}`);
      console.log(`   Amount: ₹${sample.amount}`);
      console.log(`   Source: ${sample.source}`);
      console.log(`   Status: ${sample.status}`);
      console.log(`   Description: ${sample.description}`);
      console.log(`   Expires: ${sample.expiryDate.toLocaleDateString()}`);
    }

    console.log('\n✅ Cashback Seed Complete!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding cashback:', error);
    process.exit(1);
  }
}

// Run the seed function
if (require.main === module) {
  seedCashback();
}

export default seedCashback;
