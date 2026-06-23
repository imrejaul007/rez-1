const mongoose = require('mongoose');

async function testAllData() {
  await mongoose.connect(process.env.MONGODB_URI);

  const userId = '68ef4d41061faaf045222506';
  const userObjId = new mongoose.Types.ObjectId(userId);

  console.log('=== Testing All Data for Daily Check-in Page ===\n');

  // 1. Login Streak
  const streak = await mongoose.connection.db.collection('userstreaks').findOne({ user: userObjId, type: 'login' });
  console.log('1. LOGIN STREAK:');
  console.log('   currentStreak:', streak?.currentStreak);
  console.log('   longestStreak:', streak?.longestStreak);
  console.log('   lastActivityDate:', streak?.lastActivityDate);
  console.log('');

  // 2. Daily Check-ins
  const checkIns = await mongoose.connection.db.collection('dailycheckins').find({ userId: userObjId }).sort({ date: -1 }).limit(5).toArray();
  console.log('2. RECENT CHECK-INS (last 5):');
  checkIns.forEach(c => console.log('   -', c.date?.toISOString?.() || c.date, 'streak:', c.streak, 'earned:', c.totalEarned));
  const totalCheckIns = await mongoose.connection.db.collection('dailycheckins').countDocuments({ userId: userObjId });
  console.log('   Total check-in records:', totalCheckIns);

  // Calculate total earned from all check-ins
  const totalEarnedAgg = await mongoose.connection.db.collection('dailycheckins').aggregate([
    { $match: { userId: userObjId } },
    { $group: { _id: null, total: { $sum: '$totalEarned' } } }
  ]).toArray();
  console.log('   Total earned from check-ins:', totalEarnedAgg[0]?.total || 0);
  console.log('');

  // 3. Wallet
  const wallet = await mongoose.connection.db.collection('wallets').findOne({ user: userObjId });
  const rezCoins = wallet?.coins?.find(c => c.type === 'rez');
  console.log('3. WALLET:');
  console.log('   ReZ Coins:', rezCoins?.amount);
  console.log('   Total Earned (wallet):', wallet?.totalEarned);
  console.log('');

  // 4. Affiliate Stats
  const affiliate = await mongoose.connection.db.collection('affiliatestats').findOne({ user: userObjId });
  console.log('4. AFFILIATE STATS:');
  if (affiliate) {
    console.log('   Total Shares:', affiliate.totalShares);
    console.log('   App Downloads:', affiliate.appDownloads);
    console.log('   Purchases:', affiliate.purchases);
    console.log('   Commission Earned:', affiliate.commissionEarned);
  } else {
    console.log('   No affiliate stats found - checking user document...');
    const user = await mongoose.connection.db.collection('users').findOne({ _id: userObjId });
    console.log('   User referral earnings:', user?.referralEarnings || 0);
  }
  console.log('');

  // 5. Promotional Posters
  const posters = await mongoose.connection.db.collection('herobanners').find({
    tags: { $in: ['promotional', 'shareable', 'poster'] }
  }).toArray();
  console.log('5. PROMOTIONAL POSTERS:');
  console.log('   Count:', posters.length);
  posters.forEach(p => console.log('   -', p.title, '| shareBonus:', p.shareBonus));
  console.log('');

  // 6. Share Submissions
  const submissions = await mongoose.connection.db.collection('sharesubmissions').find({ user: userObjId }).toArray();
  console.log('6. SHARE SUBMISSIONS:');
  console.log('   Count:', submissions.length);
  submissions.forEach(s => console.log('   -', s.posterTitle, '| status:', s.status));
  console.log('');

  // 7. Check today's check-in status
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const todayCheckIn = await mongoose.connection.db.collection('dailycheckins').findOne({
    userId: userObjId,
    date: { $gte: today }
  });
  console.log('7. TODAY\'S CHECK-IN STATUS:');
  console.log('   Has checked in today:', !!todayCheckIn);
  if (todayCheckIn) {
    console.log('   Today\'s check-in:', todayCheckIn.date, 'earned:', todayCheckIn.totalEarned);
  }
  console.log('');

  // 8. Streak Bonuses calculation
  console.log('8. STREAK BONUSES STATUS:');
  const currentStreak = streak?.currentStreak || 0;
  const milestones = [
    { days: 7, reward: 50 },
    { days: 14, reward: 100 },
    { days: 30, reward: 250 }
  ];
  milestones.forEach(m => {
    const achieved = currentStreak >= m.days;
    console.log(`   ${m.days}-Day Streak: ${achieved ? '✓ Achieved' : 'Not yet'} - Rs.${m.reward}`);
  });

  await mongoose.disconnect();
  console.log('\n=== Test Complete ===');
}

testAllData().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
