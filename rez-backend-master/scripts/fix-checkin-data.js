const mongoose = require('mongoose');

async function fixData() {
  await mongoose.connect(process.env.MONGODB_URI);

  const userId = '68ef4d41061faaf045222506';
  const userObjId = new mongoose.Types.ObjectId(userId);

  console.log('=== Fixing Check-in Data ===\n');

  // 1. Fix currentStreak to match check-in records
  console.log('1. FIXING LOGIN STREAK:');
  const updateResult = await mongoose.connection.db.collection('userstreaks').updateOne(
    { user: userObjId, type: 'login' },
    {
      $set: {
        currentStreak: 41,
        longestStreak: 41,
        totalDays: 41,
        updatedAt: new Date()
      }
    }
  );
  console.log('   Updated:', updateResult.modifiedCount > 0);

  // Verify
  const streak = await mongoose.connection.db.collection('userstreaks').findOne({ user: userObjId, type: 'login' });
  console.log('   New currentStreak:', streak.currentStreak);
  console.log('   New longestStreak:', streak.longestStreak);
  console.log('');

  // 2. Create promotional posters if none exist
  console.log('2. CREATING PROMOTIONAL POSTERS:');
  const existingPosters = await mongoose.connection.db.collection('herobanners').countDocuments({
    tags: { $in: ['promotional', 'shareable', 'poster'] }
  });

  if (existingPosters === 0) {
    const posters = [
      {
        title: 'Shop & Save Big',
        subtitle: 'Get up to 50% cashback on your first order',
        image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800',
        colors: ['#FF6B6B', '#FF8E53'],
        shareBonus: 25,
        tags: ['promotional', 'shareable', 'poster'],
        isActive: true,
        priority: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: 'Refer & Earn',
        subtitle: 'Invite friends, earn Rs.100 per download',
        image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800',
        colors: ['#4FACFE', '#00F2FE'],
        shareBonus: 30,
        tags: ['promotional', 'shareable', 'poster'],
        isActive: true,
        priority: 2,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: 'Daily Deals',
        subtitle: 'New offers every day - Don\'t miss out!',
        image: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=800',
        colors: ['#A855F7', '#EC4899'],
        shareBonus: 20,
        tags: ['promotional', 'shareable', 'poster'],
        isActive: true,
        priority: 3,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: 'Flash Sale',
        subtitle: 'Limited time - Extra 20% off everything',
        image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800',
        colors: ['#F59E0B', '#EF4444'],
        shareBonus: 35,
        tags: ['promotional', 'shareable', 'poster'],
        isActive: true,
        priority: 4,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    const insertResult = await mongoose.connection.db.collection('herobanners').insertMany(posters);
    console.log('   Created', insertResult.insertedCount, 'promotional posters');
  } else {
    console.log('   Posters already exist:', existingPosters);
  }
  console.log('');

  // 3. Remove today's check-in so user can actually check in
  console.log('3. REMOVING TODAY\'S CHECK-IN (so user can check in):');
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const deleteResult = await mongoose.connection.db.collection('dailycheckins').deleteOne({
    userId: userObjId,
    date: today
  });
  console.log('   Removed today\'s check-in:', deleteResult.deletedCount > 0);

  // Update streak to 40 (since we removed today's)
  await mongoose.connection.db.collection('userstreaks').updateOne(
    { user: userObjId, type: 'login' },
    {
      $set: {
        currentStreak: 40,
        longestStreak: 41,
        totalDays: 40,
        lastActivityDate: new Date('2026-01-08T23:59:59.000Z'),
        updatedAt: new Date()
      }
    }
  );
  console.log('   Updated streak to 40 (yesterday\'s)');
  console.log('');

  // 4. Create affiliate stats if not exists
  console.log('4. CHECKING AFFILIATE STATS:');
  const affiliateExists = await mongoose.connection.db.collection('affiliatestats').findOne({ user: userObjId });
  if (!affiliateExists) {
    await mongoose.connection.db.collection('affiliatestats').insertOne({
      user: userObjId,
      totalShares: 2,
      appDownloads: 0,
      purchases: 0,
      commissionEarned: 107,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log('   Created affiliate stats');
  } else {
    console.log('   Affiliate stats already exist');
  }
  console.log('');

  // Final verification
  console.log('=== FINAL STATE ===');
  const finalStreak = await mongoose.connection.db.collection('userstreaks').findOne({ user: userObjId, type: 'login' });
  console.log('Login Streak:', finalStreak.currentStreak, '/ Longest:', finalStreak.longestStreak);

  const checkInCount = await mongoose.connection.db.collection('dailycheckins').countDocuments({ userId: userObjId });
  console.log('Check-in records:', checkInCount);

  const posterCount = await mongoose.connection.db.collection('herobanners').countDocuments({
    tags: { $in: ['promotional', 'shareable', 'poster'] }
  });
  console.log('Promotional posters:', posterCount);

  const todayCheck = await mongoose.connection.db.collection('dailycheckins').findOne({
    userId: userObjId,
    date: { $gte: today }
  });
  console.log('Has checked in today:', !!todayCheck);

  await mongoose.disconnect();
  console.log('\n=== Fix Complete - Refresh the page! ===');
}

fixData().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
