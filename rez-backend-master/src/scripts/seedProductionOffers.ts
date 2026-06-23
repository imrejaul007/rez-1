import mongoose from 'mongoose';
import Offer from '../models/Offer';
import { Store } from '../models/Store';
import { User } from '../models/User';
import { Category } from '../models/Category';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rez-app';
const DB_NAME = process.env.DB_NAME || 'test';

// Connect to database
const connectDB = async () => {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      dbName: DB_NAME,
    });
    console.log(`✅ Connected to database: ${DB_NAME}`);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Seed Production Offers matching the design
const seedProductionOffers = async (): Promise<void> => {
  try {
    console.log('\n📦 Seeding Production Offers...');

    // Get or create admin user
    let adminUser = await User.findOne({ email: 'admin@rez.com' });
    if (!adminUser) {
      adminUser = await User.create({
        name: 'Admin User',
        email: 'admin@rez.com',
        phoneNumber: '+1234567890',
        password: 'hashedpassword', // In production, use proper hashing
        role: 'admin',
      });
      console.log('✅ Created admin user');
    }

    // Get food/restaurant category
    let foodCategory = await Category.findOne({ name: { $regex: /food|restaurant/i } });
    if (!foodCategory) {
      foodCategory = await Category.findOne({});
      if (!foodCategory) {
        console.log('⚠️  No categories found. Please seed categories first.');
        return;
      }
    }

    // Get or find stores (we'll use existing stores or create references)
    const stores = await Store.find().limit(20);
    if (stores.length === 0) {
      console.log('⚠️  No stores found. Please seed stores first.');
      return;
    }

    // Clear existing offers
    await Offer.deleteMany({});
    console.log('🗑️  Cleared existing offers');

    // Production offers matching the design
    const offersData = [
      // Eufloria - Free Delivery
      {
        title: 'Free Delivery on your orders',
        subtitle: 'Free Delivery on your orders',
        description: 'Enjoy free delivery on all your orders from Eufloria. No minimum order value required.',
        image: 'https://images.unsplash.com/photo-1563241521-5eda0e6a4e42?w=400.jpg',
        category: 'food',
        type: 'cashback',
        cashbackPercentage: 8,
        location: {
          type: 'Point',
          coordinates: [48.0840, 29.3375], // Kuwait coordinates
        },
        store: {
          id: stores[0]._id,
          name: 'Eufloria',
          logo: 'https://images.unsplash.com/photo-1563241521-5eda0e6a4e42?w=200.jpg',
          rating: 4.50,
          verified: true,
          operationalInfo: {
            deliveryFee: 0,
            deliveryTime: '45 min',
          },
        } as any,
        validity: {
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          isActive: true,
        },
        engagement: {
          likesCount: 125,
          sharesCount: 45,
          viewsCount: 1200,
        },
        restrictions: {
          minOrderValue: 0, // Free delivery
        },
        metadata: {
          isNew: false,
          isTrending: true,
          priority: 5,
          tags: ['free-delivery', 'food', 'restaurant', '45-min'],
        },
        isFollowerExclusive: false,
        visibleTo: 'all',
        createdBy: adminUser._id,
      },
      // Flondo - 25% off, UNLIMITED
      {
        title: '25% off on your orders',
        subtitle: '25% off on your orders',
        description: 'Get 25% cashback on all orders from Flondo Sweets. Maximum cashback KD 5.',
        image: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=400.jpg',
        category: 'food',
        type: 'cashback',
        cashbackPercentage: 25,
        location: {
          type: 'Point',
          coordinates: [48.0840, 29.3375],
        },
        store: {
          id: stores[1]?._id || stores[0]._id,
          name: 'Flondo',
          logo: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=200.jpg',
          rating: 5.00,
          verified: true,
          operationalInfo: {
            deliveryFee: 0.600,
            deliveryTime: '30 min',
          },
        } as any,
        validity: {
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          isActive: true,
        },
        engagement: {
          likesCount: 200,
          sharesCount: 80,
          viewsCount: 2500,
        },
        restrictions: {
          minOrderValue: 0.600,
          maxDiscountAmount: 5,
        },
        metadata: {
          isNew: false,
          isTrending: true,
          isSpecial: true, // UNLIMITED badge
          priority: 8,
          tags: ['discount', 'sweets', 'unlimited', '30-min'],
        },
        isFollowerExclusive: false,
        visibleTo: 'all',
        createdBy: adminUser._id,
      },
      // Doka Cake - 20% off + Free Delivery
      {
        title: '20% off on orders above KD 1 + Free Delivery',
        subtitle: '20% off on orders above KD 1 + Free Delivery',
        description: 'Get 20% cashback on orders above KD 1 and enjoy free delivery. Perfect for cake lovers!',
        image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400.jpg',
        category: 'food',
        type: 'cashback',
        cashbackPercentage: 20,
        location: {
          type: 'Point',
          coordinates: [48.0840, 29.3375],
        },
        store: {
          id: stores[2]?._id || stores[0]._id,
          name: 'Doka Cake',
          logo: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=200.jpg',
          rating: 5.00,
          verified: true,
          operationalInfo: {
            deliveryFee: 0,
            deliveryTime: '45 min',
          },
        } as any,
        validity: {
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          isActive: true,
        },
        engagement: {
          likesCount: 180,
          sharesCount: 65,
          viewsCount: 1800,
        },
        restrictions: {
          minOrderValue: 1,
        },
        metadata: {
          isNew: false,
          isTrending: true,
          priority: 6,
          tags: ['free-delivery', 'discount', 'cake', 'bakery', '45-min'],
        },
        isFollowerExclusive: false,
        visibleTo: 'all',
        createdBy: adminUser._id,
      },
      // Wid Gifts - Free Delivery
      {
        title: 'Free Delivery on your orders',
        subtitle: 'Free Delivery on your orders',
        description: 'Free delivery on all gift orders from Wid Gifts. Perfect for special occasions.',
        image: 'https://images.unsplash.com/photo-1512389142860-9c449e58a543?w=400.jpg',
        category: 'general',
        type: 'cashback',
        cashbackPercentage: 10,
        location: {
          type: 'Point',
          coordinates: [48.0840, 29.3375],
        },
        store: {
          id: stores[3]?._id || stores[0]._id,
          name: 'Wid Gifts',
          logo: 'https://images.unsplash.com/photo-1512389142860-9c449e58a543?w=200.jpg',
          rating: 4.50,
          verified: true,
          operationalInfo: {
            deliveryFee: 0,
            deliveryTime: '90 min',
          },
        } as any,
        validity: {
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          isActive: true,
        },
        engagement: {
          likesCount: 95,
          sharesCount: 35,
          viewsCount: 900,
        },
        restrictions: {
          minOrderValue: 0,
        },
        metadata: {
          isNew: false,
          isTrending: false,
          priority: 4,
          tags: ['free-delivery', 'gifts', '90-min'],
        },
        isFollowerExclusive: false,
        visibleTo: 'all',
        createdBy: adminUser._id,
      },
      // Quick Kitchen - 20% off, UNLIMITED
      {
        title: '20% off on orders above KD 4',
        subtitle: '20% off on orders above KD 4',
        description: 'Get 20% cashback on orders above KD 4 from Quick Kitchen. Fast delivery guaranteed!',
        image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400.jpg',
        category: 'food',
        type: 'cashback',
        cashbackPercentage: 20,
        location: {
          type: 'Point',
          coordinates: [48.0840, 29.3375],
        },
        store: {
          id: stores[4]?._id || stores[0]._id,
          name: 'Quick Kitchen',
          logo: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=200.jpg',
          rating: 4.50,
          verified: true,
          operationalInfo: {
            deliveryFee: 0.600,
            deliveryTime: '31 min',
          },
        } as any,
        validity: {
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          isActive: true,
        },
        engagement: {
          likesCount: 150,
          sharesCount: 55,
          viewsCount: 1500,
        },
        restrictions: {
          minOrderValue: 4,
          maxDiscountAmount: 10,
        },
        metadata: {
          isNew: false,
          isTrending: true,
          isSpecial: true, // UNLIMITED badge
          priority: 7,
          tags: ['discount', 'food', 'unlimited', 'fast-delivery', '31-min'],
        },
        isFollowerExclusive: false,
        visibleTo: 'all',
        createdBy: adminUser._id,
      },
      // Monaash Time - Free Delivery
      {
        title: 'Free Delivery on your orders',
        subtitle: 'Free Delivery on your orders',
        description: 'Enjoy free delivery on all orders from Monaash Time. Great food, great service!',
        image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400.jpg',
        category: 'food',
        type: 'cashback',
        cashbackPercentage: 12,
        location: {
          type: 'Point',
          coordinates: [48.0840, 29.3375],
        },
        store: {
          id: stores[5]?._id || stores[0]._id,
          name: 'Monaash Time',
          logo: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=200.jpg',
          rating: 4.75,
          verified: true,
          operationalInfo: {
            deliveryFee: 0,
            deliveryTime: '30-45 min',
          },
        } as any,
        validity: {
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          isActive: true,
        },
        engagement: {
          likesCount: 110,
          sharesCount: 40,
          viewsCount: 1100,
        },
        restrictions: {
          minOrderValue: 0,
        },
        metadata: {
          isNew: false,
          isTrending: false,
          priority: 4,
          tags: ['free-delivery', 'food', 'restaurant'],
        },
        isFollowerExclusive: false,
        visibleTo: 'all',
        createdBy: adminUser._id,
      },
      // Additional offers for variety
      {
        title: '50% Cashback on First Order',
        subtitle: '50% Cashback on First Order',
        description: 'Get 50% cashback on your first order. Maximum cashback KD 10.',
        image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400.jpg',
        category: 'food',
        type: 'cashback',
        cashbackPercentage: 50,
        location: {
          type: 'Point',
          coordinates: [48.0840, 29.3375],
        },
        store: {
          id: stores[6]?._id || stores[0]._id,
          name: 'Premium Restaurant',
          logo: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=200.jpg',
          rating: 4.80,
          verified: true,
          operationalInfo: {
            deliveryFee: 5.000,
            deliveryTime: '30-45 min',
          },
        } as any,
        validity: {
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          isActive: true,
        },
        engagement: {
          likesCount: 300,
          sharesCount: 120,
          viewsCount: 3500,
        },
        restrictions: {
          minOrderValue: 5,
          maxDiscountAmount: 10,
          userTypeRestriction: 'new_user',
        },
        metadata: {
          isNew: true,
          isTrending: true,
          featured: true,
          priority: 10,
          tags: ['first-order', 'discount', 'new-user'],
        },
        isFollowerExclusive: false,
        visibleTo: 'all',
        createdBy: adminUser._id,
      },
      {
        title: 'Up to 40% Cashback',
        subtitle: 'Up to 40% Cashback',
        description: 'Get up to 40% cashback on all orders. Maximum cashback KD 8.',
        image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400.jpg',
        category: 'food',
        type: 'cashback',
        cashbackPercentage: 40,
        location: {
          type: 'Point',
          coordinates: [48.0840, 29.3375],
        },
        store: {
          id: stores[7]?._id || stores[0]._id,
          name: 'Food Express',
          logo: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200.jpg',
          rating: 4.60,
          verified: true,
          operationalInfo: {
            deliveryFee: 3.000,
            deliveryTime: '30-45 min',
          },
        } as any,
        validity: {
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          isActive: true,
        },
        engagement: {
          likesCount: 220,
          sharesCount: 85,
          viewsCount: 2200,
        },
        restrictions: {
          minOrderValue: 3,
          maxDiscountAmount: 8,
        },
        metadata: {
          isNew: false,
          isTrending: true,
          priority: 7,
          tags: ['discount', 'food', 'cashback'],
        },
        isFollowerExclusive: false,
        visibleTo: 'all',
        createdBy: adminUser._id,
      },
    ];

    const offers = await Offer.insertMany(offersData);
    console.log(`✅ Created ${offers.length} production offers`);
    
    // Summary
    console.log('\n📊 Offer Summary:');
    console.log(`   - Free Delivery Offers: ${offers.filter(o => o.metadata.tags.includes('free-delivery')).length}`);
    console.log(`   - Discount Offers: ${offers.filter(o => o.cashbackPercentage >= 20).length}`);
    console.log(`   - UNLIMITED Offers: ${offers.filter(o => o.metadata.isSpecial).length}`);
    console.log(`   - Featured Offers: ${offers.filter(o => o.metadata.featured).length}`);
  } catch (error) {
    console.error('❌ Error seeding production offers:', error);
    throw error;
  }
};

// Main seed function
const seedAll = async () => {
  try {
    console.log('🌱 Starting Production Offers Seeding Process...\n');

    await connectDB();
    await seedProductionOffers();

    console.log('\n✨ Seeding completed successfully!');
    console.log('🎉 Production offers are ready!');

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

// Run the seeder
if (require.main === module) {
  seedAll();
}

export { seedProductionOffers, seedAll };

