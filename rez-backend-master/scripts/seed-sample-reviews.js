// Seed Sample Reviews
// Creates sample reviews for testing the My Reviews page

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME;

async function seedReviews() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      dbName: DB_NAME,
    });
    console.log('✅ Connected to MongoDB\n');

    const User = mongoose.connection.collection('users');
    const Store = mongoose.connection.collection('stores');
    const Review = mongoose.connection.collection('reviews');

    // Find user Mukul Raj
    console.log('👤 Finding user Mukul Raj...');
    const user = await User.findOne({
      $or: [
        { 'profile.firstName': 'Mukul' },
        { 'profile.phone': '8210224305' }
      ]
    });

    if (!user) {
      console.log('❌ User Mukul Raj not found');
      await mongoose.disconnect();
      return;
    }

    console.log('✅ User found:', user._id);

    // Find some stores to review
    console.log('\n🏪 Finding stores...');
    const stores = await Store.find({}).limit(5).toArray();

    if (stores.length === 0) {
      console.log('❌ No stores found in database');
      console.log('Please seed stores first before creating reviews');
      await mongoose.disconnect();
      return;
    }

    console.log(`✅ Found ${stores.length} stores`);

    // Sample review templates
    const reviewTemplates = [
      {
        rating: 5,
        title: 'Excellent service!',
        comment: 'Amazing experience! The staff was very friendly and the products were top quality. Will definitely come back again. Highly recommend this store to everyone.',
        images: []
      },
      {
        rating: 4,
        title: 'Great products',
        comment: 'Good quality products and reasonable prices. The delivery was fast and packaging was excellent. Minor issue with customer service but overall satisfied.',
        images: []
      },
      {
        rating: 5,
        title: 'Best store in town',
        comment: 'This is by far the best store I have shopped from. The variety is amazing and everything is always in stock. The owner is very helpful and friendly.',
        images: []
      },
      {
        rating: 3,
        title: 'Decent experience',
        comment: 'Average experience. Products are okay but nothing special. Delivery took a bit longer than expected. Would shop here again if they improve their service.',
        images: []
      },
      {
        rating: 5,
        title: 'Highly satisfied',
        comment: 'Absolutely loved shopping here! The products exceeded my expectations. Fast delivery, great packaging, and excellent customer service. Five stars!',
        images: []
      }
    ];

    // Create reviews
    console.log('\n📝 Creating sample reviews...\n');
    const createdReviews = [];

    for (let i = 0; i < Math.min(stores.length, reviewTemplates.length); i++) {
      const store = stores[i];
      const template = reviewTemplates[i];

      const review = {
        user: user._id,
        store: store._id,
        rating: template.rating,
        title: template.title,
        comment: template.comment,
        images: template.images,
        isActive: true,
        isVerifiedPurchase: true,
        helpfulCount: Math.floor(Math.random() * 20),
        unhelpfulCount: Math.floor(Math.random() * 3),
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date within last 30 days
        updatedAt: new Date()
      };

      // Randomly add merchant reply to some reviews
      if (Math.random() > 0.5) {
        review.merchantReply = 'Thank you for your feedback! We appreciate your business and look forward to serving you again.';
        review.merchantReplyDate = new Date();
      }

      const result = await Review.insertOne(review);
      createdReviews.push(result.insertedId);

      console.log(`✅ Created review ${i + 1}/${Math.min(stores.length, reviewTemplates.length)}`);
      console.log(`   Store: ${store.name}`);
      console.log(`   Rating: ${template.rating}/5`);
      console.log(`   Comment: ${template.comment.substring(0, 50)}...`);
      console.log(`   Helpful: ${review.helpfulCount}`);
      console.log(`   Merchant Reply: ${review.merchantReply ? 'Yes' : 'No'}`);
      console.log('');
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Created ${createdReviews.length} reviews for user ${user.profile?.firstName || 'Mukul'}`);
    console.log(`User ID: ${user._id}`);
    console.log(`Reviews:`, createdReviews.map(id => id.toString()).join(', '));
    console.log('='.repeat(60));

    console.log('\n📱 Next steps:');
    console.log('   1. Refresh the My Reviews page in the app');
    console.log('   2. You should now see the reviews displayed');
    console.log('   3. Test pull-to-refresh functionality');
    console.log('   4. Test scrolling and pagination');

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the script
seedReviews();
