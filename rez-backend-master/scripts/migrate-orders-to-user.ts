import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Import models
import { User, Order } from '../src/models';

const TARGET_PHONE_NUMBER = '+918210224305';

async function migrateOrdersToUser() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    const dbName = process.env.DB_NAME || 'test';

    if (!mongoUri) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri, {
      dbName,
    });
    console.log('✅ Connected to MongoDB');

    // Step 1: Find the user with the target phone number
    console.log(`\n📱 Finding user with phone number: ${TARGET_PHONE_NUMBER}...`);
    const targetUser = await User.findOne({ phoneNumber: TARGET_PHONE_NUMBER }).lean();

    if (!targetUser) {
      throw new Error(`User with phone number ${TARGET_PHONE_NUMBER} not found`);
    }

    console.log(`✅ Found user: ${targetUser._id}`);
    console.log(`   Name: ${targetUser.profile?.firstName || ''} ${targetUser.profile?.lastName || ''}`);
    console.log(`   Email: ${targetUser.profile?.email || 'N/A'}`);
    console.log(`   Phone: ${targetUser.phoneNumber}`);

    // Step 2: Find all orders without a user (user is null, missing, or points to non-existent user)
    console.log('\n📦 Finding orders without users...');
    
    // First, find orders with null or missing user
    const ordersWithNullUser = await Order.find({
      $or: [
        { user: null },
        { user: { $exists: false } }
      ]
    }).lean();

    // Also find orders where user doesn't exist in User collection
    const allOrders = await Order.find({}).populate('user').lean();
    const ordersWithInvalidUser = allOrders.filter((order: any) => !order.user);

    // Combine both sets (remove duplicates by _id)
    const allOrderIds = new Set([
      ...ordersWithNullUser.map((o: any) => o._id.toString()),
      ...ordersWithInvalidUser.map((o: any) => o._id.toString())
    ]);

    const ordersWithoutUser = await Order.find({
      _id: { $in: Array.from(allOrderIds).map(id => new mongoose.Types.ObjectId(id)) }
    }).lean();

    console.log(`✅ Found ${ordersWithoutUser.length} orders without users`);

    if (ordersWithoutUser.length === 0) {
      console.log('✅ All orders already have users assigned. Migration complete!');
      await mongoose.disconnect();
      return;
    }

    // Step 3: Update orders to link them to the target user
    console.log(`\n🔗 Linking ${ordersWithoutUser.length} orders to user ${targetUser._id}...`);
    
    const orderIds = ordersWithoutUser.map(order => order._id);
    const updateResult = await Order.updateMany(
      { _id: { $in: orderIds } },
      { $set: { user: targetUser._id } }
    );

    console.log(`✅ Updated ${updateResult.modifiedCount} orders`);

    // Step 4: Verification
    console.log('\n🔍 Verifying migration...');
    const remainingOrdersWithoutUser = await Order.countDocuments({
      $or: [
        { user: null },
        { user: { $exists: false } }
      ]
    });

    const ordersWithTargetUser = await Order.countDocuments({
      user: targetUser._id
    });

    console.log(`\n📊 Migration Summary:`);
    console.log(`   Orders linked to user: ${ordersWithTargetUser}`);
    console.log(`   Orders still without user: ${remainingOrdersWithoutUser}`);
    console.log(`   Target user ID: ${targetUser._id}`);

    if (remainingOrdersWithoutUser === 0) {
      console.log('\n✅ Migration completed successfully! All orders are now linked to users.');
    } else {
      console.log(`\n⚠️  Warning: ${remainingOrdersWithoutUser} orders still don't have users assigned.`);
    }

    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the migration
migrateOrdersToUser();

