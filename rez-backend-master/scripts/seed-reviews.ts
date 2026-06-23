/**
 * Seed script to create sample reviews for stores
 * This populates the reviews collection with realistic test data
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const MONGODB_URI = process.env.MONGODB_URI || '';
const DB_NAME = process.env.DB_NAME || 'test';

// Review Schema (matching backend model)
const reviewSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  store: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  title: { type: String, maxlength: 100 },
  comment: { type: String, required: true, minlength: 10, maxlength: 1000 },
  images: [{ type: String }],
  helpful: { type: Number, default: 0 },
  verified: { type: Boolean, default: true },
  isActive: { type: Boolean, default: true },
  moderationStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved' },
  userName: { type: String }, // Store user name for display
  metadata: {
    cashbackEarned: { type: Number },
    orderNumber: { type: String },
    purchaseDate: { type: Date }
  }
}, { timestamps: true });

// Sample review data
const sampleReviews = [
  {
    rating: 5,
    title: 'Amazing quality!',
    comment: 'Amazing quality and fast delivery. The product exceeded my expectations. Definitely worth every penny! Will order again for sure.',
    userName: 'Rahul Sharma',
    cashbackEarned: 85
  },
  {
    rating: 4,
    title: 'Great experience',
    comment: 'Great product overall. The Lock feature made it super easy to reserve before visiting the store. Customer service was also very helpful and responsive.',
    userName: 'Priya Patel',
    cashbackEarned: 80
  },
  {
    rating: 5,
    title: 'Best deal ever!',
    comment: 'Excellent value for money! The ReZ coins bonus was a nice touch. I saved a lot using the lock feature when prices were about to increase. Highly recommended!',
    userName: 'Amit Kumar',
    cashbackEarned: 120
  },
  {
    rating: 4,
    title: 'Very satisfied',
    comment: 'Very satisfied with my purchase. The delivery was quick and the packaging was secure. Will recommend to friends and family. Great platform!',
    userName: 'Sneha Gupta',
    cashbackEarned: 95
  },
  {
    rating: 5,
    title: 'Fantastic service',
    comment: 'Best deal I found online! The cashback and ReZ coins made it even better. The store quality is top-notch. Will definitely come back for more.',
    userName: 'Vikram Singh',
    cashbackEarned: 110
  },
  {
    rating: 5,
    title: 'Exceeded expectations',
    comment: 'The product quality exceeded my expectations. Fresh and delicious! Love the rewards system on ReZ. Already earned enough coins for my next order.',
    userName: 'Neha Verma',
    cashbackEarned: 75
  },
  {
    rating: 4,
    title: 'Good value',
    comment: 'Good value for the price. The lock feature is genius - I secured my price before it went up. Delivery could be a bit faster but overall very satisfied.',
    userName: 'Rajesh Khanna',
    cashbackEarned: 90
  },
  {
    rating: 5,
    title: 'Perfect!',
    comment: 'Perfect experience from start to finish. Easy to browse, simple checkout, and quick delivery. The cashback was credited instantly. Five stars!',
    userName: 'Anjali Mehta',
    cashbackEarned: 105
  },
  {
    rating: 4,
    title: 'Really impressed',
    comment: 'Really impressed with the quality and service. The price lock feature saved me money when prices increased. ReZ is my go-to app now for local shopping.',
    userName: 'Suresh Iyer',
    cashbackEarned: 88
  },
  {
    rating: 5,
    title: 'Love this store!',
    comment: 'Love this store! Great variety, competitive prices, and the loyalty rewards are fantastic. Earned so many ReZ coins on my purchases. Highly recommend!',
    userName: 'Pooja Desai',
    cashbackEarned: 130
  }
];

async function seedReviews() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
    console.log('✅ Connected to MongoDB');

    // Get models
    const Store = mongoose.model('Store', new mongoose.Schema({}, { strict: false }), 'stores');
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }), 'users');

    let Review;
    try {
      Review = mongoose.model('Review');
    } catch {
      Review = mongoose.model('Review', reviewSchema, 'reviews');
    }

    // Fetch stores - get all active stores
    console.log('\n📦 Fetching stores...');
    const stores = await Store.find({ isActive: true }).limit(200).lean();

    if (stores.length === 0) {
      console.log('❌ No stores found');
      return;
    }

    console.log(`✅ Found ${stores.length} stores`);

    // Get a test user
    const testUser = await User.findOne().lean();
    if (!testUser) {
      console.log('❌ No users found');
      return;
    }

    console.log(`✅ Using user: ${testUser._id}`);

    // Create reviews for each store
    const reviewsToCreate: any[] = [];
    let totalReviews = 0;

    for (const store of stores) {
      const storeDoc = store as any;
      const storeId = storeDoc._id;

      // Create 5-10 random reviews per store
      const numReviews = 5 + Math.floor(Math.random() * 6);
      const shuffledReviews = [...sampleReviews].sort(() => Math.random() - 0.5);

      for (let i = 0; i < numReviews; i++) {
        const reviewTemplate = shuffledReviews[i % shuffledReviews.length];

        // Random date in last 60 days
        const daysAgo = Math.floor(Math.random() * 60);
        const reviewDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

        // Create a unique fake user ID for each review to avoid duplicate key error
        const fakeUserId = new mongoose.Types.ObjectId();

        reviewsToCreate.push({
          user: fakeUserId,
          store: storeId,
          rating: reviewTemplate.rating,
          title: reviewTemplate.title,
          comment: reviewTemplate.comment,
          images: [],
          helpful: Math.floor(Math.random() * 50),
          verified: true,
          isActive: true,
          moderationStatus: 'approved',
          userName: reviewTemplate.userName, // Store username for display
          metadata: {
            cashbackEarned: reviewTemplate.cashbackEarned,
            purchaseDate: new Date(reviewDate.getTime() - 2 * 24 * 60 * 60 * 1000) // 2 days before review
          },
          createdAt: reviewDate,
          updatedAt: reviewDate
        });

        totalReviews++;
      }
    }

    console.log(`\n📝 Creating ${reviewsToCreate.length} reviews...`);

    // Clear existing reviews first (optional)
    await Review.deleteMany({});
    console.log('🗑️  Cleared existing reviews');

    // Insert reviews
    const result = await Review.insertMany(reviewsToCreate);
    console.log(`✅ Created ${result.length} reviews successfully`);

    // Print summary
    console.log('\n📊 Review Summary:');
    const reviewsByStore = new Map<string, number>();
    reviewsToCreate.forEach(r => {
      const key = r.store.toString();
      reviewsByStore.set(key, (reviewsByStore.get(key) || 0) + 1);
    });

    let storeIndex = 0;
    for (const store of stores) {
      const storeDoc = store as any;
      const count = reviewsByStore.get(storeDoc._id.toString()) || 0;
      console.log(`  Store ${++storeIndex} (${storeDoc.name || storeDoc._id}): ${count} reviews`);
    }

    console.log('\n✅ Seeding completed! Reviews are now available via API.');

  } catch (error) {
    console.error('❌ Error seeding reviews:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the script
seedReviews();
