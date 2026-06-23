const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };
const DB_NAME = process.env.DB_NAME || 'test';
const JWT_SECRET = process.env.JWT_SECRET || 'your-fallback-secret';

async function testAuth() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;

    // Get all users
    const users = await db.collection('users').find().limit(5).toArray();

    console.log('👥 Available users:\n');
    users.forEach((user, i) => {
      console.log(`${i + 1}. User ID: ${user._id}`);
      console.log(`   Phone: ${user.phoneNumber}`);
      console.log(`   Email: ${user.email || 'N/A'}`);
      console.log(`   Name: ${user.profile?.firstName || 'N/A'} ${user.profile?.lastName || ''}`);
      console.log(`   Active: ${user.isActive}`);
      console.log('');
    });

    // Check transactions for each user
    console.log('💰 Transaction ownership:\n');
    for (const user of users) {
      const userTransactions = await db.collection('transactions')
        .find({ user: user._id })
        .toArray();

      if (userTransactions.length > 0) {
        console.log(`✅ User ${user._id} has ${userTransactions.length} transaction(s)`);
        console.log(`   Phone: ${user.phoneNumber}`);

        // Generate a test token for this user
        const token = jwt.sign(
          { userId: user._id.toString(), role: user.role || 'user' },
          JWT_SECRET,
          { expiresIn: '7d' }
        );

        console.log(`   Test Token: ${token.substring(0, 50)}...`);
        console.log('');
      }
    }

    // Check for user with wallet
    console.log('\n💼 Wallet ownership:\n');
    const wallets = await db.collection('wallets').find().toArray();

    for (const wallet of wallets) {
      const user = await db.collection('users').findOne({ _id: wallet.user });
      if (user) {
        console.log(`✅ Wallet for user: ${user._id}`);
        console.log(`   Phone: ${user.phoneNumber}`);
        console.log(`   Balance: ${wallet.balance?.total || 0}`);
        console.log('');
      }
    }

    await mongoose.disconnect();
    console.log('\n✅ Auth test complete');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testAuth();
