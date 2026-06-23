const mongoose = require('mongoose');

async function fixPosters() {
  await mongoose.connect(process.env.MONGODB_URI);

  console.log('=== Fixing Promotional Posters ===\n');

  // Delete old posters with wrong schema
  const deleteResult = await mongoose.connection.db.collection('herobanners').deleteMany({
    tags: { $in: ['promotional', 'shareable', 'poster'] }
  });
  console.log('Deleted old posters:', deleteResult.deletedCount);

  // Create posters with correct schema
  const now = new Date();
  const oneYearFromNow = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

  const posters = [
    {
      title: 'Shop & Save Big',
      subtitle: 'Get up to 50% cashback on your first order',
      description: 'Get up to 50% cashback on your first order',
      image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800',
      backgroundColor: '#FF6B6B',
      textColor: '#FFFFFF',
      isActive: true,
      priority: 1,
      validFrom: new Date('2024-01-01'),
      validUntil: oneYearFromNow,
      metadata: {
        tags: ['promotional', 'shareable', 'poster'],
        shareBonus: 25
      },
      createdAt: now,
      updatedAt: now
    },
    {
      title: 'Refer & Earn',
      subtitle: 'Invite friends, earn Rs.100 per download',
      description: 'Invite friends, earn Rs.100 per download',
      image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800',
      backgroundColor: '#4FACFE',
      textColor: '#FFFFFF',
      isActive: true,
      priority: 2,
      validFrom: new Date('2024-01-01'),
      validUntil: oneYearFromNow,
      metadata: {
        tags: ['promotional', 'shareable', 'poster'],
        shareBonus: 30
      },
      createdAt: now,
      updatedAt: now
    },
    {
      title: 'Daily Deals',
      subtitle: 'New offers every day - Don\'t miss out!',
      description: 'New offers every day - Don\'t miss out!',
      image: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=800',
      backgroundColor: '#A855F7',
      textColor: '#FFFFFF',
      isActive: true,
      priority: 3,
      validFrom: new Date('2024-01-01'),
      validUntil: oneYearFromNow,
      metadata: {
        tags: ['promotional', 'shareable', 'poster'],
        shareBonus: 20
      },
      createdAt: now,
      updatedAt: now
    },
    {
      title: 'Flash Sale',
      subtitle: 'Limited time - Extra 20% off everything',
      description: 'Limited time - Extra 20% off everything',
      image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800',
      backgroundColor: '#F59E0B',
      textColor: '#FFFFFF',
      isActive: true,
      priority: 4,
      validFrom: new Date('2024-01-01'),
      validUntil: oneYearFromNow,
      metadata: {
        tags: ['promotional', 'shareable', 'poster'],
        shareBonus: 35
      },
      createdAt: now,
      updatedAt: now
    }
  ];

  const insertResult = await mongoose.connection.db.collection('herobanners').insertMany(posters);
  console.log('Created posters with correct schema:', insertResult.insertedCount);

  // Verify
  const count = await mongoose.connection.db.collection('herobanners').countDocuments({
    isActive: true,
    validFrom: { $lte: now },
    validUntil: { $gte: now },
    'metadata.tags': { $in: ['promotional', 'shareable', 'poster'] }
  });
  console.log('Verifiable promotional posters:', count);

  await mongoose.disconnect();
  console.log('\n=== Done ===');
}

fixPosters().catch(console.error);
