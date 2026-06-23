// Check statistics for the currently logged-in user
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };

async function checkLoggedInUser() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;

    // The user from the logs
    const userId = new mongoose.Types.ObjectId('68c145d5f016515d8eb31c0c');

    const user = await db.collection('users').findOne({ _id: userId });

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log('\n📊 Statistics for currently logged-in user:');
    console.log('Name:', user.profile?.firstName || 'N/A', user.profile?.lastName || '');
    console.log('Phone:', user.phoneNumber);
    console.log('User ID:', user._id);

    // Count orders
    const orderCount = await db.collection('orders').countDocuments({ user: userId });
    console.log('\n📦 Orders:', orderCount);

    // Count projects with user submissions
    const projectsWithSubmissions = await db.collection('projects').find({
      'submissions.user': userId
    }).toArray();
    console.log('🎬 Projects (with submissions):', projectsWithSubmissions.length);

    // Count user vouchers
    const vouchers = await db.collection('uservouchers').find({ user: userId }).toArray();
    const activeVouchers = vouchers.filter(v => v.status === 'active').length;

    console.log('🎫 Vouchers:');
    console.log('   Total:', vouchers.length);
    console.log('   Active:', activeVouchers);

    // Wallet info
    console.log('\n💰 Wallet:');
    console.log('   Balance:', user.wallet?.balance || 0);
    console.log('   Total Earned:', user.wallet?.totalEarned || 0);
    console.log('   Total Spent:', user.wallet?.totalSpent || 0);

    console.log('\n📱 What the Profile Icon Grid SHOULD show:');
    console.log('   Product:', orderCount);
    console.log('   Service:', projectsWithSubmissions.length);
    console.log('   Voucher:', activeVouchers);
    console.log('   Earns:', user.wallet?.totalEarned || 0);

    console.log('\n💡 Solution: Either:');
    console.log('   1. Run the seeding script for THIS user');
    console.log('   2. Or login with the test user: +919876543210');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

checkLoggedInUser();
