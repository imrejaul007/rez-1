// Quick test script to check user statistics
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };

async function testUserStatistics() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;

    // Find the test user
    const user = await db.collection('users').findOne({ phoneNumber: '+919876543210' });

    if (!user) {
      console.log('❌ Test user not found');
      return;
    }

    console.log('\n📊 User Statistics for:', user.profile.firstName, user.profile.lastName);
    console.log('User ID:', user._id);

    // Count orders
    const orderCount = await db.collection('orders').countDocuments({ user: user._id });
    console.log('\n📦 Orders:', orderCount);

    // Count projects with user submissions
    const projectsWithSubmissions = await db.collection('projects').find({
      'submissions.user': user._id
    }).toArray();
    console.log('🎬 Projects (with submissions):', projectsWithSubmissions.length);

    // Count user vouchers by status
    const vouchers = await db.collection('uservouchers').find({ user: user._id }).toArray();
    const activeVouchers = vouchers.filter(v => v.status === 'active').length;
    const usedVouchers = vouchers.filter(v => v.status === 'used').length;
    const expiredVouchers = vouchers.filter(v => v.status === 'expired').length;

    console.log('🎫 Vouchers:');
    console.log('   Total:', vouchers.length);
    console.log('   Active:', activeVouchers);
    console.log('   Used:', usedVouchers);
    console.log('   Expired:', expiredVouchers);

    // Wallet info
    console.log('\n💰 Wallet:');
    console.log('   Balance:', user.wallet.balance);
    console.log('   Total Earned:', user.wallet.totalEarned);
    console.log('   Total Spent:', user.wallet.totalSpent);
    console.log('   Pending:', user.wallet.pendingAmount);

    // Count transactions
    const creditTxns = await db.collection('transactions').countDocuments({
      user: user._id,
      type: 'credit'
    });
    const debitTxns = await db.collection('transactions').countDocuments({
      user: user._id,
      type: 'debit'
    });

    console.log('\n💳 Transactions:');
    console.log('   Credit (Earnings):', creditTxns);
    console.log('   Debit (Spending):', debitTxns);
    console.log('   Total:', creditTxns + debitTxns);

    // Expected icon grid values
    console.log('\n📱 Expected Profile Icon Grid:');
    console.log('   Product:', orderCount);
    console.log('   Service:', projectsWithSubmissions.length);
    console.log('   Voucher:', activeVouchers);
    console.log('   Earns:', user.wallet.totalEarned);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

testUserStatistics();
