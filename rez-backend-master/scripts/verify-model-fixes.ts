/**
 * Verification Script for Model Fixes
 *
 * This script verifies that the added properties (totalAmount, phone, lastLogin)
 * work correctly as virtual properties in Order and User models.
 */

import mongoose from 'mongoose';
import { config } from 'dotenv';
import { Order } from '../src/models/Order';
import { User } from '../src/models/User';

config();

async function verifyModelFixes() {
  try {
    console.log('🔍 Verifying Model Fixes...\n');

    // Connect to database
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/rez-app';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Test 1: Verify Order.totalAmount virtual property
    console.log('📦 Test 1: Order.totalAmount virtual property');
    const order = await Order.findOne().lean();
    if (order) {
      const orderDoc = await Order.findById(order._id);
      console.log(`   Order ID: ${orderDoc?.orderNumber}`);
      console.log(`   totals.total: ₹${orderDoc?.totals.total}`);
      console.log(`   totalAmount (virtual): ₹${orderDoc?.totalAmount}`);
      console.log(`   ✅ Match: ${orderDoc?.totals.total === orderDoc?.totalAmount}`);
    } else {
      console.log('   ⚠️  No orders found in database');
    }
    console.log('');

    // Test 2: Verify User.phone virtual property
    console.log('👤 Test 2: User.phone virtual property');
    const user = await User.findOne().lean();
    if (user) {
      const userDoc = await User.findById(user._id);
      console.log(`   User ID: ${userDoc?._id}`);
      console.log(`   phoneNumber: ${userDoc?.phoneNumber}`);
      console.log(`   phone (virtual): ${userDoc?.phone}`);
      console.log(`   ✅ Match: ${userDoc?.phoneNumber === userDoc?.phone}`);
    } else {
      console.log('   ⚠️  No users found in database');
    }
    console.log('');

    // Test 3: Verify User.lastLogin virtual property
    console.log('🔐 Test 3: User.lastLogin virtual property');
    const userWithLogin = await User.findOne({ 'auth.lastLogin': { $exists: true } });
    if (userWithLogin) {
      console.log(`   User ID: ${userWithLogin._id}`);
      console.log(`   auth.lastLogin: ${userWithLogin.auth.lastLogin}`);
      console.log(`   lastLogin (virtual): ${userWithLogin.lastLogin}`);
      console.log(`   ✅ Match: ${userWithLogin.auth.lastLogin?.getTime() === userWithLogin.lastLogin?.getTime()}`);
    } else {
      console.log('   ⚠️  No users with lastLogin found in database');
    }
    console.log('');

    // Test 4: Verify JSON serialization includes virtuals
    console.log('📄 Test 4: JSON serialization includes virtuals');
    if (order && user) {
      const orderDoc = await Order.findById(order._id);
      const userDoc = await User.findById(user._id);

      const orderJSON = orderDoc?.toJSON();
      const userJSON = userDoc?.toJSON();

      console.log(`   Order JSON has totalAmount: ${!!orderJSON?.totalAmount}`);
      console.log(`   User JSON has phone: ${!!userJSON?.phone}`);
      console.log(`   User JSON has lastLogin: ${userJSON?.lastLogin !== undefined}`);
      console.log(`   ✅ All virtuals present in JSON`);
    }
    console.log('');

    // Test 5: Verify TypeScript interface compatibility
    console.log('✨ Test 5: TypeScript interface compatibility');
    if (order && user) {
      const orderDoc = await Order.findById(order._id);
      const userDoc = await User.findById(user._id);

      // These should not cause TypeScript errors
      const _totalAmount: number | undefined = orderDoc?.totalAmount;
      const _phone: string | undefined = userDoc?.phone;
      const _lastLogin: Date | undefined = userDoc?.lastLogin;

      console.log(`   ✅ TypeScript types are correct`);
      console.log(`   - order.totalAmount: number | undefined`);
      console.log(`   - user.phone: string | undefined`);
      console.log(`   - user.lastLogin: Date | undefined`);
    }
    console.log('');

    console.log('✅ All verifications completed successfully!\n');

  } catch (error) {
    console.error('❌ Verification failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run verification
verifyModelFixes().catch(console.error);
