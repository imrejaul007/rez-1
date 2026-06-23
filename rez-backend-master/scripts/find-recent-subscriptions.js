/**
 * Find Recent Subscriptions
 * Check for any subscriptions created in the last hour
 */

const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };
const DB_NAME = 'test';

// User Schema (simplified)
const userSchema = new mongoose.Schema({
  phone: String,
  name: String,
  email: String,
}, { collection: 'users', timestamps: true });

// Subscription Schema (simplified)
const subscriptionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  tier: String,
  price: Number,
  status: String,
  billingCycle: String,
  startDate: Date,
  endDate: Date,
  trialEndDate: Date,
}, { collection: 'subscriptions', timestamps: true });

const User = mongoose.model('User', userSchema);
const Subscription = mongoose.model('Subscription', subscriptionSchema);

async function findRecentSubscriptions() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      dbName: DB_NAME,
    });
    console.log('✅ Connected to MongoDB!\n');

    // Find subscriptions created in the last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    console.log('🔍 Searching for subscriptions created after:', oneDayAgo.toISOString());

    const recentSubscriptions = await Subscription.find({
      createdAt: { $gte: oneDayAgo }
    }).sort({ createdAt: -1 }).populate('user');

    if (recentSubscriptions.length === 0) {
      console.log('❌ No subscriptions created in the last 24 hours\n');
    } else {
      console.log(`✅ Found ${recentSubscriptions.length} recent subscription(s):\n`);

      for (const sub of recentSubscriptions) {
        console.log('📊 Subscription:');
        console.log({
          id: sub._id,
          tier: sub.tier,
          price: sub.price,
          status: sub.status,
          billingCycle: sub.billingCycle,
          createdAt: sub.createdAt,
        });

        if (sub.user) {
          console.log('   👤 User:');
          console.log({
            id: sub.user._id,
            name: sub.user.name,
            phone: sub.user.phone,
            email: sub.user.email,
          });
        }
        console.log('');
      }
    }

    // Also show all users with phone numbers
    console.log('\n---\n');
    console.log('🔍 All users with phone numbers:');
    const usersWithPhone = await User.find({ phone: { $exists: true, $ne: null } });

    if (usersWithPhone.length === 0) {
      console.log('❌ No users with phone numbers found\n');
    } else {
      console.log(`✅ Found ${usersWithPhone.length} user(s) with phone numbers:\n`);
      for (const user of usersWithPhone) {
        console.log({
          id: user._id,
          name: user.name,
          phone: user.phone,
          email: user.email,
        });

        // Check if this user has subscriptions
        const userSubs = await Subscription.find({ user: user._id }).sort({ createdAt: -1 });
        if (userSubs.length > 0) {
          console.log(`   📊 Subscriptions (${userSubs.length}):`);
          userSubs.forEach((sub) => {
            console.log(`      ${sub.tier} - ₹${sub.price} - ${sub.status} - ${sub.createdAt}`);
          });
        }
        console.log('');
      }
    }

    // Show all collections in database
    console.log('\n---\n');
    console.log('📂 All collections in database:');
    const collections = await mongoose.connection.db.listCollections().toArray();
    collections.forEach((col) => {
      console.log(`   - ${col.name}`);
    });

    console.log('\n📊 Analysis Complete!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

findRecentSubscriptions();
