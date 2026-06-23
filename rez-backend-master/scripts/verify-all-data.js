const mongoose = require('mongoose');

async function verifyAllData() {
  await mongoose.connect(process.env.MONGODB_URI);

  const userId = '68ef4d41061faaf045222506';
  const userObjId = new mongoose.Types.ObjectId(userId);

  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║         COMPREHENSIVE DATA & FUNCTIONALITY CHECK             ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  // 1. DAILY CHECK-IN PAGE
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('1. DAILY CHECK-IN PAGE (/explore/daily-checkin)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const streak = await mongoose.connection.db.collection('userstreaks').findOne({ user: userObjId, type: 'login' });
  console.log('   ✓ Current Streak:', streak?.currentStreak || 0);
  console.log('   ✓ Longest Streak:', streak?.longestStreak || 0);

  const checkInCount = await mongoose.connection.db.collection('dailycheckins').countDocuments({ userId: userObjId });
  const totalEarnedAgg = await mongoose.connection.db.collection('dailycheckins').aggregate([
    { $match: { userId: userObjId } },
    { $group: { _id: null, total: { $sum: '$totalEarned' } } }
  ]).toArray();
  console.log('   ✓ Total Check-ins:', checkInCount);
  console.log('   ✓ Total Earned:', 'Rs.' + (totalEarnedAgg[0]?.total || 0));

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const todayCheckIn = await mongoose.connection.db.collection('dailycheckins').findOne({
    userId: userObjId,
    date: { $gte: today }
  });
  console.log('   ✓ Checked in today:', todayCheckIn ? 'Yes' : 'No (can check in)');

  const affiliate = await mongoose.connection.db.collection('affiliatestats').findOne({ user: userObjId });
  console.log('   ✓ Affiliate Stats:', affiliate ? `${affiliate.totalShares} shares, Rs.${affiliate.commissionEarned} earned` : 'Not found');

  const now = new Date();
  const posters = await mongoose.connection.db.collection('herobanners').countDocuments({
    isActive: true,
    validFrom: { $lte: now },
    validUntil: { $gte: now },
    'metadata.tags': { $in: ['promotional', 'shareable', 'poster'] }
  });
  console.log('   ✓ Promotional Posters:', posters);
  console.log('');

  // 2. EVENTS PAGE
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('2. EVENTS PAGES (/events/*)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const categories = ['movies', 'concerts', 'parks', 'workshops', 'gaming', 'sports'];
  for (const cat of categories) {
    const count = await mongoose.connection.db.collection('events').countDocuments({
      category: cat,
      status: 'published'
    });
    const status = count > 0 ? '✓' : '✗';
    console.log(`   ${status} /events/${cat}: ${count} events`);
  }
  console.log('');

  // 3. GAMIFICATION GAMES
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('3. GAMIFICATION GAMES (/playandearn/*)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Lucky Draw prizes
  const luckyDrawPrizes = await mongoose.connection.db.collection('luckydrawprizes').countDocuments({ isActive: true });
  console.log('   ' + (luckyDrawPrizes > 0 ? '✓' : '✗') + ' Lucky Draw Prizes:', luckyDrawPrizes);

  // Spin wheel prizes
  const spinWheelPrizes = await mongoose.connection.db.collection('spinwheelconfigs').countDocuments({ isActive: true });
  console.log('   ' + (spinWheelPrizes > 0 ? '✓' : '✗') + ' Spin Wheel Configs:', spinWheelPrizes);

  // Quiz questions
  const quizQuestions = await mongoose.connection.db.collection('quizquestions').countDocuments({});
  console.log('   ' + (quizQuestions > 0 ? '✓' : '✗') + ' Quiz Questions:', quizQuestions);

  // Guess price products
  const guessPriceProducts = await mongoose.connection.db.collection('products').countDocuments({ status: 'active' });
  console.log('   ' + (guessPriceProducts > 0 ? '✓' : '✗') + ' Products (for Guess Price):', guessPriceProducts);
  console.log('');

  // 4. WALLET
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('4. WALLET DATA');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const wallet = await mongoose.connection.db.collection('wallets').findOne({ user: userObjId });
  if (wallet) {
    const rezCoins = wallet.coins?.find(c => c.type === 'rez');
    console.log('   ✓ ReZ Coins:', rezCoins?.amount || 0);
    console.log('   ✓ Total Earned:', wallet.totalEarned || 0);
  } else {
    console.log('   ✗ Wallet not found');
  }
  console.log('');

  // 5. CHALLENGES & ACHIEVEMENTS
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('5. CHALLENGES & ACHIEVEMENTS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const challenges = await mongoose.connection.db.collection('challenges').countDocuments({ isActive: true });
  console.log('   ' + (challenges > 0 ? '✓' : '✗') + ' Active Challenges:', challenges);

  const achievements = await mongoose.connection.db.collection('achievements').countDocuments({});
  console.log('   ' + (achievements > 0 ? '✓' : '✗') + ' Achievements:', achievements);
  console.log('');

  // SUMMARY
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║                         SUMMARY                              ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  const issues = [];
  if (!streak || streak.currentStreak === 0) issues.push('Streak data missing');
  if (checkInCount === 0) issues.push('No check-in records');
  if (posters === 0) issues.push('No promotional posters');
  if (luckyDrawPrizes === 0) issues.push('No lucky draw prizes');
  if (spinWheelPrizes === 0) issues.push('No spin wheel config');
  if (quizQuestions === 0) issues.push('No quiz questions');
  if (guessPriceProducts === 0) issues.push('No products for guess price');

  if (issues.length === 0) {
    console.log('\n   ✅ ALL DATA VERIFIED - Everything looks good!\n');
  } else {
    console.log('\n   ⚠️  ISSUES FOUND:');
    issues.forEach(issue => console.log('      - ' + issue));
    console.log('');
  }

  await mongoose.disconnect();
}

verifyAllData().catch(console.error);
