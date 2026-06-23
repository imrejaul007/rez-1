import mongoose from 'mongoose';
import Offer from '../models/Offer';
import { Store } from '../models/Store';
import { User } from '../models/User';

/**
 * Seed sample offers for exclusive zones
 * These offers will appear in Student, Corporate, Women, etc. zones
 */
export async function seedExclusiveZoneOffers() {
  console.log('Seeding Exclusive Zone Offers...');

  try {
    // Get some active stores to associate offers with
    const stores = await Store.find({ isActive: true }).limit(5).lean();

    if (stores.length === 0) {
      console.log('  No active stores found. Please seed stores first.');
      console.log('  Run: npx ts-node -r dotenv/config src/seeds/storeSeeds.ts');
      return;
    }

    // Get or create a system admin user for createdBy field
    let adminUser = await User.findOne({ role: 'admin' }).lean();
    if (!adminUser) {
      adminUser = await User.findOne({}).lean();
    }
    if (!adminUser) {
      console.log('  No users found. Please seed users first.');
      return;
    }

    // Check if exclusive zone offers already exist
    const existingOffers = await Offer.countDocuments({
      exclusiveZone: { $exists: true, $ne: null }
    });

    if (existingOffers > 0) {
      console.log(`  ${existingOffers} exclusive zone offers already exist, skipping seeding`);
      return;
    }

    const now = new Date();
    const endDate = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days from now

    // Bangalore coordinates (default location)
    const defaultCoordinates: [number, number] = [77.5946, 12.9716];

    // Helper to get store data safely
    const getStore = (index: number) => {
      const store = stores[Math.min(index, stores.length - 1)] as any;
      return {
        id: store._id,
        name: store.name,
        logo: store.logo,
        rating: store.ratings?.average || 4.5,
        verified: store.isVerified || true,
      };
    };

    // Sample offers for each exclusive zone
    const exclusiveZoneOffers = [
      // Student Zone Offers
      {
        title: '20% Off on Study Materials',
        subtitle: 'Books, stationery & supplies',
        description: 'Exclusive discount on books, stationery, and study supplies for verified students',
        image: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400',
        category: 'general' as const,
        type: 'discount' as const,
        cashbackPercentage: 20,
        exclusiveZone: 'student' as const,
        eligibilityRequirement: 'Must be a verified student with .edu email or student ID',
        store: getStore(0),
        location: {
          type: 'Point' as const,
          coordinates: defaultCoordinates,
        },
        validity: {
          startDate: now,
          endDate: endDate,
          isActive: true,
        },
        metadata: {
          priority: 10,
          tags: ['student', 'education', 'discount'],
        },
        createdBy: adminUser._id,
      },
      {
        title: '15% Cashback on Electronics',
        subtitle: 'Laptops, tablets & gadgets',
        description: 'Get cashback on laptops, tablets, and tech gadgets - Student exclusive!',
        image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400',
        category: 'electronics' as const,
        type: 'cashback' as const,
        cashbackPercentage: 15,
        exclusiveZone: 'student' as const,
        eligibilityRequirement: 'Verified students only',
        store: getStore(1),
        location: {
          type: 'Point' as const,
          coordinates: defaultCoordinates,
        },
        validity: {
          startDate: now,
          endDate: endDate,
          isActive: true,
        },
        metadata: {
          priority: 9,
          tags: ['student', 'electronics', 'cashback'],
        },
        createdBy: adminUser._id,
      },
      {
        title: 'Free Delivery on Food Orders',
        subtitle: 'No delivery fee above Rs.199',
        description: 'No delivery fee on orders above Rs.199 for students',
        image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400',
        category: 'food' as const,
        type: 'special' as const,
        cashbackPercentage: 0,
        exclusiveZone: 'student' as const,
        eligibilityRequirement: 'Verified students only',
        isFreeDelivery: true,
        store: {
          id: stores[Math.min(2, stores.length - 1)]._id,
          name: stores[Math.min(2, stores.length - 1)].name,
          logo: stores[Math.min(2, stores.length - 1)].logo,
          rating: 4.3,
          verified: true,
        },
        location: {
          type: 'Point' as const,
          coordinates: defaultCoordinates,
        },
        validity: {
          startDate: now,
          endDate: endDate,
          isActive: true,
        },
        metadata: {
          priority: 8,
          tags: ['student', 'food', 'delivery', 'free'],
        },
        createdBy: adminUser._id,
      },

      // Corporate Zone Offers
      {
        title: '25% Off Business Lunch',
        subtitle: 'Weekday lunch special',
        description: 'Corporate special on weekday lunch meals at partner restaurants',
        image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400',
        category: 'food' as const,
        type: 'discount' as const,
        cashbackPercentage: 25,
        exclusiveZone: 'corporate' as const,
        eligibilityRequirement: 'Must verify with corporate email domain',
        store: {
          id: stores[0]._id,
          name: stores[0].name,
          logo: stores[0].logo,
          rating: 4.6,
          verified: true,
        },
        location: {
          type: 'Point' as const,
          coordinates: defaultCoordinates,
        },
        validity: {
          startDate: now,
          endDate: endDate,
          isActive: true,
        },
        metadata: {
          priority: 10,
          tags: ['corporate', 'food', 'lunch', 'business'],
        },
        createdBy: adminUser._id,
      },
      {
        title: '20% Cashback on Office Supplies',
        subtitle: 'Stock up on essentials',
        description: 'Stock up on office essentials with corporate cashback',
        image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400',
        category: 'general' as const,
        type: 'cashback' as const,
        cashbackPercentage: 20,
        exclusiveZone: 'corporate' as const,
        eligibilityRequirement: 'Verified corporate employees',
        store: {
          id: stores[Math.min(1, stores.length - 1)]._id,
          name: stores[Math.min(1, stores.length - 1)].name,
          logo: stores[Math.min(1, stores.length - 1)].logo,
          rating: 4.4,
          verified: true,
        },
        location: {
          type: 'Point' as const,
          coordinates: defaultCoordinates,
        },
        validity: {
          startDate: now,
          endDate: endDate,
          isActive: true,
        },
        metadata: {
          priority: 9,
          tags: ['corporate', 'office', 'supplies'],
        },
        createdBy: adminUser._id,
      },

      // Women Zone Offers
      {
        title: '30% Off Beauty & Wellness',
        subtitle: 'Beauty products & spa services',
        description: 'Exclusive discounts on beauty products and spa services',
        image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400',
        category: 'beauty' as const,
        type: 'discount' as const,
        cashbackPercentage: 30,
        exclusiveZone: 'women' as const,
        eligibilityRequirement: 'Available for all women users',
        store: {
          id: stores[Math.min(2, stores.length - 1)]._id,
          name: stores[Math.min(2, stores.length - 1)].name,
          logo: stores[Math.min(2, stores.length - 1)].logo,
          rating: 4.7,
          verified: true,
        },
        location: {
          type: 'Point' as const,
          coordinates: defaultCoordinates,
        },
        validity: {
          startDate: now,
          endDate: endDate,
          isActive: true,
        },
        metadata: {
          priority: 10,
          tags: ['women', 'beauty', 'wellness', 'spa'],
        },
        createdBy: adminUser._id,
      },
      {
        title: '15% Cashback on Fashion',
        subtitle: 'Clothing & accessories',
        description: 'Earn cashback on clothing and accessories',
        image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400',
        category: 'fashion' as const,
        type: 'cashback' as const,
        cashbackPercentage: 15,
        exclusiveZone: 'women' as const,
        eligibilityRequirement: 'Available for all women users',
        store: {
          id: stores[Math.min(3, stores.length - 1)]._id,
          name: stores[Math.min(3, stores.length - 1)].name,
          logo: stores[Math.min(3, stores.length - 1)].logo,
          rating: 4.5,
          verified: true,
        },
        location: {
          type: 'Point' as const,
          coordinates: defaultCoordinates,
        },
        validity: {
          startDate: now,
          endDate: endDate,
          isActive: true,
        },
        metadata: {
          priority: 9,
          tags: ['women', 'fashion', 'cashback', 'clothing'],
        },
        createdBy: adminUser._id,
      },
      {
        title: 'Buy 1 Get 1 on Wellness',
        subtitle: 'Yoga, fitness & wellness',
        description: 'Buy one get one free on wellness classes and sessions',
        image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400',
        category: 'wellness' as const,
        type: 'special' as const,
        cashbackPercentage: 0,
        bogoType: 'buy1get1' as const,
        bogoDetails: 'Buy one wellness session, get one free',
        exclusiveZone: 'women' as const,
        eligibilityRequirement: 'Available for all women users',
        store: {
          id: stores[0]._id,
          name: stores[0].name,
          logo: stores[0].logo,
          rating: 4.8,
          verified: true,
        },
        location: {
          type: 'Point' as const,
          coordinates: defaultCoordinates,
        },
        validity: {
          startDate: now,
          endDate: endDate,
          isActive: true,
        },
        metadata: {
          priority: 8,
          tags: ['women', 'wellness', 'yoga', 'fitness', 'bogo'],
        },
        createdBy: adminUser._id,
      },

      // Birthday Zone Offers
      {
        title: 'Birthday Treat - 50% Off',
        subtitle: 'Celebrate your special day',
        description: 'Celebrate your special day with half-price on your order!',
        image: 'https://images.unsplash.com/photo-1558636508-e0db3814bd1d?w=400',
        category: 'food' as const,
        type: 'discount' as const,
        cashbackPercentage: 50,
        exclusiveZone: 'birthday' as const,
        eligibilityRequirement: 'Valid during your birthday month',
        store: {
          id: stores[0]._id,
          name: stores[0].name,
          logo: stores[0].logo,
          rating: 4.6,
          verified: true,
        },
        location: {
          type: 'Point' as const,
          coordinates: defaultCoordinates,
        },
        validity: {
          startDate: now,
          endDate: endDate,
          isActive: true,
        },
        metadata: {
          priority: 10,
          tags: ['birthday', 'celebration', 'discount', 'special'],
        },
        createdBy: adminUser._id,
      },
      {
        title: 'Free Dessert on Birthday',
        subtitle: 'Complimentary treat',
        description: 'Complimentary dessert with any main course during your birthday week',
        image: 'https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=400',
        category: 'food' as const,
        type: 'special' as const,
        cashbackPercentage: 0,
        exclusiveZone: 'birthday' as const,
        eligibilityRequirement: 'Valid during your birthday week',
        store: {
          id: stores[Math.min(1, stores.length - 1)]._id,
          name: stores[Math.min(1, stores.length - 1)].name,
          logo: stores[Math.min(1, stores.length - 1)].logo,
          rating: 4.5,
          verified: true,
        },
        location: {
          type: 'Point' as const,
          coordinates: defaultCoordinates,
        },
        validity: {
          startDate: now,
          endDate: endDate,
          isActive: true,
        },
        metadata: {
          priority: 9,
          tags: ['birthday', 'food', 'free', 'dessert'],
        },
        createdBy: adminUser._id,
      },

      // Senior Citizens Zone Offers
      {
        title: '25% Senior Citizen Discount',
        subtitle: 'Everyday essentials',
        description: 'Special discount for seniors on everyday essentials',
        image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400',
        category: 'general' as const,
        type: 'discount' as const,
        cashbackPercentage: 25,
        exclusiveZone: 'senior' as const,
        eligibilityRequirement: 'Must be 60+ years old with verified age',
        store: {
          id: stores[Math.min(2, stores.length - 1)]._id,
          name: stores[Math.min(2, stores.length - 1)].name,
          logo: stores[Math.min(2, stores.length - 1)].logo,
          rating: 4.4,
          verified: true,
        },
        location: {
          type: 'Point' as const,
          coordinates: defaultCoordinates,
        },
        validity: {
          startDate: now,
          endDate: endDate,
          isActive: true,
        },
        metadata: {
          priority: 10,
          tags: ['senior', 'discount', 'essentials', 'elderly'],
        },
        createdBy: adminUser._id,
      },
      {
        title: '20% Off Healthcare Products',
        subtitle: 'Medicines & wellness',
        description: 'Discounts on medicines, supplements, and healthcare products',
        image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400',
        category: 'wellness' as const,
        type: 'discount' as const,
        cashbackPercentage: 20,
        exclusiveZone: 'senior' as const,
        eligibilityRequirement: 'Must be 60+ years old',
        store: {
          id: stores[0]._id,
          name: stores[0].name,
          logo: stores[0].logo,
          rating: 4.6,
          verified: true,
        },
        location: {
          type: 'Point' as const,
          coordinates: defaultCoordinates,
        },
        validity: {
          startDate: now,
          endDate: endDate,
          isActive: true,
        },
        metadata: {
          priority: 9,
          tags: ['senior', 'healthcare', 'medicine', 'wellness'],
        },
        createdBy: adminUser._id,
      },

      // Defence Zone Offers
      {
        title: '30% Military Discount',
        subtitle: 'Thank you for your service',
        description: 'Thank you for your service! Exclusive discount for defence personnel',
        image: 'https://images.unsplash.com/photo-1579912437766-7896df6d3cd3?w=400',
        category: 'general' as const,
        type: 'discount' as const,
        cashbackPercentage: 30,
        exclusiveZone: 'defence' as const,
        eligibilityRequirement: 'Must be verified defence personnel',
        store: {
          id: stores[Math.min(3, stores.length - 1)]._id,
          name: stores[Math.min(3, stores.length - 1)].name,
          logo: stores[Math.min(3, stores.length - 1)].logo,
          rating: 4.7,
          verified: true,
        },
        location: {
          type: 'Point' as const,
          coordinates: defaultCoordinates,
        },
        validity: {
          startDate: now,
          endDate: endDate,
          isActive: true,
        },
        metadata: {
          priority: 10,
          tags: ['defence', 'military', 'discount', 'armed-forces'],
        },
        createdBy: adminUser._id,
      },
      {
        title: '25% Off Travel & Stay',
        subtitle: 'Hotels & travel bookings',
        description: 'Special discounts on hotels and travel bookings for defence personnel',
        image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400',
        category: 'entertainment' as const,
        type: 'discount' as const,
        cashbackPercentage: 25,
        exclusiveZone: 'defence' as const,
        eligibilityRequirement: 'Must be verified defence personnel',
        store: {
          id: stores[Math.min(4, stores.length - 1)]._id,
          name: stores[Math.min(4, stores.length - 1)].name,
          logo: stores[Math.min(4, stores.length - 1)].logo,
          rating: 4.5,
          verified: true,
        },
        location: {
          type: 'Point' as const,
          coordinates: defaultCoordinates,
        },
        validity: {
          startDate: now,
          endDate: endDate,
          isActive: true,
        },
        metadata: {
          priority: 9,
          tags: ['defence', 'travel', 'hotel', 'booking'],
        },
        createdBy: adminUser._id,
      },

      // First-time User Offers
      {
        title: 'Welcome Offer - 40% Off',
        subtitle: 'First order special',
        description: 'Welcome to Rez! Get 40% off on your first order',
        image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=400',
        category: 'general' as const,
        type: 'discount' as const,
        cashbackPercentage: 40,
        exclusiveZone: 'first-time' as const,
        eligibilityRequirement: 'New users only - first order',
        store: {
          id: stores[0]._id,
          name: stores[0].name,
          logo: stores[0].logo,
          rating: 4.5,
          verified: true,
        },
        location: {
          type: 'Point' as const,
          coordinates: defaultCoordinates,
        },
        validity: {
          startDate: now,
          endDate: endDate,
          isActive: true,
        },
        metadata: {
          priority: 10,
          tags: ['first-time', 'welcome', 'new-user', 'discount'],
          isNew: true,
        },
        createdBy: adminUser._id,
      },
    ];

    await Offer.insertMany(exclusiveZoneOffers);
    console.log(`  Created ${exclusiveZoneOffers.length} exclusive zone offers`);

    // Log breakdown by zone
    const zoneCounts: Record<string, number> = {};
    exclusiveZoneOffers.forEach(o => {
      const zone = o.exclusiveZone || 'unknown';
      zoneCounts[zone] = (zoneCounts[zone] || 0) + 1;
    });
    Object.entries(zoneCounts).forEach(([zone, count]) => {
      console.log(`     - ${zone}: ${count} offers`);
    });

    console.log('Exclusive Zone Offers seeded successfully!');
  } catch (error) {
    console.error('Error seeding Exclusive Zone Offers:', error);
    throw error;
  }
}

/**
 * Clear all exclusive zone offers (for testing)
 */
export async function clearExclusiveZoneOffers() {
  console.log('Clearing Exclusive Zone Offers...');

  const result = await Offer.deleteMany({
    exclusiveZone: { $exists: true, $ne: null }
  });

  console.log(`Deleted ${result.deletedCount} exclusive zone offers`);
}

// Run if called directly
if (require.main === module) {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rez';
  const DB_NAME = process.env.DB_NAME || 'test';

  mongoose
    .connect(MONGODB_URI, { dbName: DB_NAME })
    .then(async () => {
      console.log(`Connected to MongoDB (${DB_NAME})`);
      await seedExclusiveZoneOffers();
      process.exit(0);
    })
    .catch((error) => {
      console.error('MongoDB connection error:', error);
      process.exit(1);
    });
}

export default seedExclusiveZoneOffers;
