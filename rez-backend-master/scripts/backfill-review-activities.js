// Backfill activity records for existing reviews
const mongoose = require('mongoose');
require('dotenv').config();

async function backfillReviewActivities() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rez-app');
    console.log('✅ Connected to MongoDB');

    // Import actual models
    const { Review } = require('../dist/models/Review');
    const { Activity } = require('../dist/models/Activity');
    const { Store } = require('../dist/models/Store');

    // Get all active reviews
    const reviews = await Review.find({ isActive: true })
      .populate('store', 'name')
      .lean();

    console.log(`\n⭐ Found ${reviews.length} reviews to process\n`);

    let created = 0;

    for (const review of reviews) {
      // Check if activity already exists for this review
      const existingActivity = await Activity.findOne({
        'relatedEntity.id': review._id,
        type: 'REVIEW'
      });

      if (existingActivity) {
        console.log(`⏭️  Skipping review ${review._id} - activity already exists`);
        continue;
      }

      // Get store name
      let storeName = 'Store';
      if (review.store) {
        if (typeof review.store === 'object' && review.store.name) {
          storeName = review.store.name;
        } else {
          // If not populated, fetch store manually
          const storeId = review.store;
          const store = await Store.findById(storeId).select('name').lean();
          if (store) storeName = store.name;
        }
      }

      // Create review activity
      const activityData = {
        user: review.user,
        type: 'REVIEW',
        title: 'Review Submitted',
        description: `Thank you for your feedback on ${storeName}!`,
        icon: 'star',
        color: '#EC4899',
        relatedEntity: {
          id: review._id,
          type: 'Review'
        },
        metadata: {
          storeName,
          rating: review.rating
        },
        createdAt: review.createdAt,
        updatedAt: review.createdAt
      };

      await Activity.create(activityData);
      console.log(`✅ Created activity for review at ${storeName} (${review.rating}⭐)`);
      created++;
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Total reviews processed: ${reviews.length}`);
    console.log(`   Activities created: ${created}`);
    console.log(`   Already existed: ${reviews.length - created}`);

    await mongoose.disconnect();
    console.log('\n✅ Done');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

backfillReviewActivities();
