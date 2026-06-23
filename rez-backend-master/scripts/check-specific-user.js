/**
 * Check Specific User Details
 * Get full details of user with Premium subscriptions
 */

const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };
const DB_NAME = 'test';

async function checkUser() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      dbName: DB_NAME,
    });
    console.log('✅ Connected to MongoDB!\n');

    // Find user by ID
    const userId = '68ef4d41061faaf045222506';
    console.log('🔍 Searching for user:', userId);

    const user = await mongoose.connection.db.collection('users').findOne({
      _id: new mongoose.Types.ObjectId(userId)
    });

    if (!user) {
      console.log('❌ User not found');
    } else {
      console.log('✅ User found! Full document:\n');
      console.log(JSON.stringify(user, null, 2));
    }

    // Get all subscriptions for this user
    console.log('\n---\n');
    console.log('📊 All subscriptions for this user:');

    const subscriptions = await mongoose.connection.db.collection('subscriptions').find({
      user: new mongoose.Types.ObjectId(userId)
    }).sort({ createdAt: -1 }).toArray();

    console.log(`Found ${subscriptions.length} subscription(s):\n`);
    subscriptions.forEach((sub, index) => {
      console.log(`${index + 1}. Subscription ID: ${sub._id}`);
      console.log({
        tier: sub.tier,
        price: sub.price,
        status: sub.status,
        billingCycle: sub.billingCycle,
        createdAt: sub.createdAt,
        updatedAt: sub.updatedAt,
      });
      console.log('');
    });

    // Test the backend query
    console.log('\n---\n');
    console.log('🧪 Testing backend query (what API will return):');
    const activeSubscription = await mongoose.connection.db.collection('subscriptions').findOne({
      user: new mongoose.Types.ObjectId(userId),
      status: { $in: ['active', 'trial', 'grace_period'] }
    }, {
      sort: { createdAt: -1 }
    });

    if (activeSubscription) {
      console.log('✅ Backend will return this subscription:\n');
      console.log({
        id: activeSubscription._id,
        tier: activeSubscription.tier,
        price: activeSubscription.price,
        status: activeSubscription.status,
        billingCycle: activeSubscription.billingCycle,
        createdAt: activeSubscription.createdAt,
      });

      if (activeSubscription.tier === 'premium' && activeSubscription.price === 99) {
        console.log('\n🎉 PERFECT! Backend is returning Premium subscription with ₹99!');
      }
    }

    console.log('\n📊 Analysis Complete!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

checkUser();
