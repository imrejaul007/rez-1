// Check User Reviews
// Checks if there are any reviews for user Mukul Raj with phone 8210224305

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME;

async function checkUserReviews() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      dbName: DB_NAME,
    });
    console.log('✅ Connected to MongoDB\n');

    const User = mongoose.connection.collection('users');
    const Review = mongoose.connection.collection('reviews');

    // Find user by phone or name
    console.log('👤 Searching for user: Mukul Raj / 8210224305...');
    const user = await User.findOne({
      $or: [
        { 'profile.phone': '8210224305' },
        { 'profile.firstName': 'Mukul' },
        { phone: '8210224305' }
      ]
    });

    if (!user) {
      console.log('❌ User not found in database');
      await mongoose.disconnect();
      return;
    }

    console.log('✅ User found:', {
      _id: user._id,
      name: `${user.profile?.firstName || ''} ${user.profile?.lastName || ''}`.trim(),
      phone: user.profile?.phone || user.phone,
      email: user.profile?.email || user.email
    });

    // Check for reviews by this user
    console.log('\n📝 Checking for reviews...');
    const reviews = await Review.find({ user: user._id }).toArray();

    console.log(`\n📊 Total reviews found: ${reviews.length}\n`);

    if (reviews.length === 0) {
      console.log('ℹ️  No reviews found for this user');
      console.log('\n📝 To create a review:');
      console.log('   1. Go to a store page');
      console.log('   2. Place an order and complete it');
      console.log('   3. Write a review for the store');
    } else {
      console.log('Reviews found:\n');
      reviews.forEach((review, index) => {
        console.log(`${index + 1}. Review ${review._id}`);
        console.log(`   Store: ${review.store}`);
        console.log(`   Rating: ${review.rating}/5 stars`);
        console.log(`   Comment: ${review.comment?.substring(0, 100) || 'No comment'}...`);
        console.log(`   Created: ${review.createdAt}`);
        console.log(`   Is Active: ${review.isActive}`);
        console.log('');
      });
    }

    // Also check all reviews in database
    console.log('\n📊 Checking total reviews in database...');
    const totalReviews = await Review.countDocuments();
    console.log(`Total reviews in database: ${totalReviews}`);

    if (totalReviews > 0) {
      console.log('\nSample reviews (first 3):');
      const sampleReviews = await Review.find().limit(3).toArray();
      sampleReviews.forEach((review, index) => {
        console.log(`\n${index + 1}. Review ${review._id}`);
        console.log(`   User: ${review.user}`);
        console.log(`   Store: ${review.store}`);
        console.log(`   Rating: ${review.rating}/5`);
        console.log(`   Active: ${review.isActive}`);
      });
    }

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the script
checkUserReviews();
