import mongoose from 'mongoose';
import { connectDatabase } from '../config/database';
import { Review } from '../models/Review';
import { User } from '../models/User';
import { Product } from '../models/Product';
import { Order } from '../models/Order';

async function seedReviews() {
  try {
    console.log('🚀 Starting Review seeding...');
    
    // Connect to database
    await connectDatabase();
    console.log('✅ Connected to database');
    
    // Get existing data to create relationships
    const users = await User.find({}).limit(10);
    const products = await Product.find({}).limit(10);
    const orders = await Order.find({}).limit(10);
    
    if (users.length === 0 || products.length === 0) {
      console.log('❌ Please run basic seeding first (users, products)');
      process.exit(1);
    }
    
    console.log(`Found ${users.length} users, ${products.length} products, ${orders.length} orders`);
    
    // Clear existing reviews
    await Review.deleteMany({});
    console.log('🗑️  Cleared existing reviews');
    
    // Create sample reviews
    const reviews = [
      {
        user: users[0]._id,
        targetType: 'Product',
        targetId: products[0]._id,
        rating: 5,
        title: 'Amazing phone with incredible camera!',
        content: 'I have been using this iPhone 15 Pro for two weeks now and I am absolutely blown away by the camera quality. The night mode is incredible and the battery life easily gets me through a full day of heavy usage. The titanium build feels premium and the Action Button is surprisingly useful. Definitely worth the upgrade!',
        pros: ['Excellent camera quality', 'Long battery life', 'Premium build quality'],
        cons: ['Expensive', 'Heavy'],
        media: [
          {
            type: 'image',
            url: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400',
            caption: 'Camera test photo'
          }
        ],
        verification: {
          isVerifiedPurchase: true,
          purchaseDate: new Date(Date.now() - 86400000),
          orderReference: orders.length > 0 ? orders[0]._id : null,
          verificationBadge: 'verified_purchase'
        },
        helpfulness: {
          helpful: [users[1] ? users[1]._id : users[0]._id],
          notHelpful: [],
          totalVotes: 1,
          helpfulnessScore: 100
        },
        moderation: {
          status: 'approved',
          moderatedAt: new Date(Date.now() - 43200000),
          flags: []
        }
      },
      {
        user: users[1] ? users[1]._id : users[0]._id,
        targetType: 'Product',
        targetId: products[1] ? products[1]._id : products[0]._id,
        rating: 4,
        title: 'Great quality t-shirt, fits perfectly',
        content: 'Really happy with this purchase. The cotton feels premium and soft, exactly as described. The fit is true to size and the color matches the website perfectly. Only minor complaint is the price - could be a bit more affordable, but the quality justifies it. Would definitely buy again in different colors.',
        pros: ['Soft cotton material', 'True to size', 'Good color accuracy'],
        cons: ['Slightly expensive'],
        media: [
          {
            type: 'image',
            url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400',
            caption: 'Product photo'
          }
        ],
        verification: {
          isVerifiedPurchase: true,
          purchaseDate: new Date(Date.now() - 172800000),
          orderReference: orders.length > 1 ? orders[1]._id : null,
          verificationBadge: 'verified_purchase'
        },
        helpfulness: {
          helpful: [users[0]._id],
          notHelpful: [],
          totalVotes: 1,
          helpfulnessScore: 100
        },
        moderation: {
          status: 'approved',
          moderatedAt: new Date(Date.now() - 86400000),
          flags: []
        }
      },
      {
        user: users[0]._id,
        targetType: 'Product',
        targetId: products[1] ? products[1]._id : products[0]._id,
        rating: 5,
        title: 'Excellent fabric and comfort',
        content: 'This is my third t-shirt from this brand and they never disappoint. The 100% cotton is so comfortable and breathable. Perfect for everyday wear or working out. The fit is relaxed but not baggy. Highly recommend!',
        pros: ['100% cotton', 'Comfortable', 'Breathable', 'Good fit'],
        cons: [],
        media: [],
        verification: {
          isVerifiedPurchase: true,
          purchaseDate: new Date(Date.now() - 259200000),
          verificationBadge: 'frequent_reviewer'
        },
        helpfulness: {
          helpful: [users[1] ? users[1]._id : users[0]._id],
          notHelpful: [],
          totalVotes: 1,
          helpfulnessScore: 100
        },
        moderation: {
          status: 'approved',
          moderatedAt: new Date(Date.now() - 172800000),
          flags: []
        }
      },
      {
        user: users[1] ? users[1]._id : users[0]._id,
        targetType: 'Product',
        targetId: products[0]._id,
        rating: 4,
        title: 'Good phone but battery could be better',
        content: 'Overall a solid upgrade from my iPhone 13. The cameras are noticeably better and the display is brighter. Performance is snappy as expected. However, I was hoping for better battery life given the hype. It gets me through the day but just barely with my usage patterns. Still a good phone though.',
        pros: ['Better cameras', 'Bright display', 'Fast performance'],
        cons: ['Battery life could be better'],
        media: [],
        verification: {
          isVerifiedPurchase: false,
          verificationBadge: 'none'
        },
        helpfulness: {
          helpful: [users[0]._id],
          notHelpful: [],
          totalVotes: 1,
          helpfulnessScore: 100
        },
        moderation: {
          status: 'approved',
          moderatedAt: new Date(Date.now() - 345600000),
          flags: []
        }
      },
      {
        user: users[0]._id,
        targetType: 'Product',
        targetId: products[0]._id,
        rating: 3,
        title: 'Decent upgrade but overpriced',
        content: 'The phone is good, do not get me wrong. But for the price premium, I expected more significant improvements. The camera is better but not dramatically so. The titanium build is nice but does not feel that much different from stainless steel. Maybe wait for a price drop.',
        pros: ['Titanium build', 'Better camera'],
        cons: ['Overpriced', 'Incremental improvements'],
        media: [],
        verification: {
          isVerifiedPurchase: true,
          purchaseDate: new Date(Date.now() - 432000000),
          verificationBadge: 'verified_purchase'
        },
        helpfulness: {
          helpful: [users[1] ? users[1]._id : users[0]._id],
          notHelpful: [],
          totalVotes: 1,
          helpfulnessScore: 100
        },
        moderation: {
          status: 'approved',
          moderatedAt: new Date(Date.now() - 345600000),
          flags: []
        }
      }
    ];
    
    const createdReviews = await Review.insertMany(reviews);
    console.log(`✅ Created ${createdReviews.length} reviews`);
    
    // Display summary
    console.log('\\n📊 Review Summary:');
    const avgRatings: { [key: string]: { total: number; count: number; reviews: string[] } } = {};
    for (const review of createdReviews) {
      const product = products.find(p => p._id?.toString() === review.targetId?.toString());
      const productName = product?.name || 'Unknown Product';
      
      if (!avgRatings[productName]) {
        avgRatings[productName] = { total: 0, count: 0, reviews: [] };
      }
      avgRatings[productName].total += review.rating;
      avgRatings[productName].count++;
      avgRatings[productName].reviews.push(`${review.rating}★`);
    }
    
    for (const [productName, data] of Object.entries(avgRatings)) {
      const avgRating = (data.total / data.count).toFixed(1);
      console.log(`  ${productName}: ${avgRating}★ avg (${data.count} reviews) [${data.reviews.join(', ')}]`);
    }
    
    console.log('\\n🎉 Review seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding reviews:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from database');
    process.exit(0);
  }
}

if (require.main === module) {
  seedReviews();
}

export { seedReviews };