/**
 * Region-Specific Offers Seed Script
 *
 * Seeds offers for Bangalore (INR) and Dubai (AED) regions.
 * Links offers to existing stores in each region.
 *
 * Run: npx ts-node src/scripts/seedRegionOffers.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

import Offer from '../models/Offer';
import { Store } from '../models/Store';
import { User } from '../models/User';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
};

const log = {
  info: (msg: string) => console.log(`${colors.cyan}i ${msg}${colors.reset}`),
  success: (msg: string) => console.log(`${colors.green}✓ ${msg}${colors.reset}`),
  warning: (msg: string) => console.log(`${colors.yellow}⚠ ${msg}${colors.reset}`),
  error: (msg: string) => console.log(`${colors.red}✗ ${msg}${colors.reset}`),
  header: (msg: string) => console.log(`\n${colors.bright}${colors.blue}━━━ ${msg} ━━━${colors.reset}\n`),
  region: (msg: string) => console.log(`${colors.magenta}🌍 ${msg}${colors.reset}`),
};

// Helper functions
const futureDate = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);
const pastDate = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

// Bangalore coordinates
const BANGALORE_CENTER = [77.5946, 12.9716]; // [lng, lat]

// Dubai coordinates
const DUBAI_CENTER = [55.2708, 25.2048]; // [lng, lat]

interface StoreInfo {
  _id: mongoose.Types.ObjectId;
  name: string;
  logo?: string;
  rating?: number;
  location: {
    coordinates: [number, number];
  };
}

// Bangalore Offers Data
const createBangaloreOffers = (stores: StoreInfo[], adminId: mongoose.Types.ObjectId) => {
  return stores.slice(0, 15).flatMap((store, index) => {
    const baseOffers = [
      // Mega Offers
      {
        title: `${store.name} Mega Sale`,
        subtitle: 'Huge discounts this week!',
        description: `Get amazing deals at ${store.name}. Limited time offer with up to 40% cashback on all purchases.`,
        image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=400',
        category: 'mega' as const,
        type: 'cashback' as const,
        cashbackPercentage: 25 + (index % 20),
        originalPrice: 2000 + (index * 100),
        discountedPrice: 1500 + (index * 50),
        location: {
          type: 'Point' as const,
          coordinates: store.location.coordinates,
        },
        store: {
          id: store._id,
          name: store.name,
          logo: store.logo || 'https://via.placeholder.com/100',
          rating: store.rating || 4.2,
          verified: true,
        },
        validity: {
          startDate: pastDate(1),
          endDate: futureDate(30),
          isActive: true,
        },
        engagement: { likesCount: 50 + index * 10, sharesCount: 20 + index * 5, viewsCount: 200 + index * 50 },
        restrictions: {
          minOrderValue: 500,
          maxDiscountAmount: 1000,
          applicableOn: ['both'],
          userTypeRestriction: 'all' as const,
        },
        metadata: {
          isNew: index < 3,
          isTrending: index % 3 === 0,
          isBestSeller: index % 4 === 0,
          isSpecial: false,
          priority: 10 - (index % 5),
          tags: ['mega', 'sale', 'bangalore', 'limited'],
          featured: index < 5,
        },
        isFollowerExclusive: false,
        visibleTo: 'all' as const,
        isFreeDelivery: index % 2 === 0,
        deliveryFee: index % 2 === 0 ? 0 : 40,
        deliveryTime: '30-45 min',
        redemptionCount: 0,
        createdBy: adminId,
      },
      // Food Offers
      {
        title: `${store.name} Food Fest`,
        subtitle: 'Delicious deals await!',
        description: `Enjoy mouth-watering food offers at ${store.name}. Extra cashback on your favorite dishes.`,
        image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400',
        category: 'food' as const,
        type: 'cashback' as const,
        cashbackPercentage: 15 + (index % 15),
        originalPrice: 800 + (index * 50),
        discountedPrice: 600 + (index * 30),
        location: {
          type: 'Point' as const,
          coordinates: store.location.coordinates,
        },
        store: {
          id: store._id,
          name: store.name,
          logo: store.logo || 'https://via.placeholder.com/100',
          rating: store.rating || 4.0,
          verified: true,
        },
        validity: {
          startDate: pastDate(1),
          endDate: futureDate(14),
          isActive: true,
        },
        engagement: { likesCount: 30 + index * 5, sharesCount: 10 + index * 2, viewsCount: 100 + index * 20 },
        restrictions: {
          minOrderValue: 300,
          maxDiscountAmount: 500,
          applicableOn: ['both'],
          userTypeRestriction: 'all' as const,
        },
        metadata: {
          isNew: index % 2 === 0,
          isTrending: index % 2 === 1,
          isBestSeller: false,
          isSpecial: false,
          priority: 8 - (index % 4),
          tags: ['food', 'dining', 'bangalore', 'cashback'],
          featured: index < 3,
        },
        isFollowerExclusive: false,
        visibleTo: 'all' as const,
        isFreeDelivery: true,
        deliveryFee: 0,
        deliveryTime: '25-35 min',
        redemptionCount: 0,
        createdBy: adminId,
      },
      // Fashion Offers
      {
        title: `${store.name} Style Sale`,
        subtitle: 'Fashion at its best!',
        description: `Upgrade your wardrobe with exclusive fashion offers at ${store.name}.`,
        image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400',
        category: 'fashion' as const,
        type: 'discount' as const,
        cashbackPercentage: 20 + (index % 10),
        originalPrice: 3000 + (index * 200),
        discountedPrice: 2100 + (index * 100),
        location: {
          type: 'Point' as const,
          coordinates: store.location.coordinates,
        },
        store: {
          id: store._id,
          name: store.name,
          logo: store.logo || 'https://via.placeholder.com/100',
          rating: store.rating || 4.3,
          verified: true,
        },
        validity: {
          startDate: pastDate(1),
          endDate: futureDate(21),
          isActive: true,
        },
        engagement: { likesCount: 80 + index * 15, sharesCount: 40 + index * 8, viewsCount: 300 + index * 60 },
        restrictions: {
          minOrderValue: 1000,
          maxDiscountAmount: 1500,
          applicableOn: ['both'],
          userTypeRestriction: 'all' as const,
        },
        metadata: {
          isNew: false,
          isTrending: true,
          isBestSeller: index % 3 === 0,
          isSpecial: false,
          priority: 9 - (index % 5),
          tags: ['fashion', 'style', 'bangalore', 'clothing'],
          featured: index < 4,
        },
        isFollowerExclusive: false,
        visibleTo: 'all' as const,
        isFreeDelivery: false,
        deliveryFee: 50,
        deliveryTime: '2-3 days',
        redemptionCount: 0,
        createdBy: adminId,
      },
    ];
    return baseOffers;
  });
};

// Dubai Offers Data
const createDubaiOffers = (stores: StoreInfo[], adminId: mongoose.Types.ObjectId) => {
  return stores.slice(0, 15).flatMap((store, index) => {
    const baseOffers = [
      // Mega Offers
      {
        title: `${store.name} Grand Sale`,
        subtitle: 'Exclusive UAE deals!',
        description: `Experience luxury shopping at ${store.name}. Premium cashback offers for Dubai residents.`,
        image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=400',
        category: 'mega' as const,
        type: 'cashback' as const,
        cashbackPercentage: 30 + (index % 15),
        originalPrice: 500 + (index * 50), // AED
        discountedPrice: 350 + (index * 30),
        location: {
          type: 'Point' as const,
          coordinates: store.location.coordinates,
        },
        store: {
          id: store._id,
          name: store.name,
          logo: store.logo || 'https://via.placeholder.com/100',
          rating: store.rating || 4.5,
          verified: true,
        },
        validity: {
          startDate: pastDate(1),
          endDate: futureDate(30),
          isActive: true,
        },
        engagement: { likesCount: 70 + index * 12, sharesCount: 35 + index * 6, viewsCount: 250 + index * 55 },
        restrictions: {
          minOrderValue: 100, // AED
          maxDiscountAmount: 300, // AED
          applicableOn: ['both'],
          userTypeRestriction: 'all' as const,
        },
        metadata: {
          isNew: index < 4,
          isTrending: index % 2 === 0,
          isBestSeller: index % 3 === 0,
          isSpecial: true,
          priority: 10 - (index % 5),
          tags: ['mega', 'dubai', 'uae', 'premium'],
          featured: index < 6,
        },
        isFollowerExclusive: false,
        visibleTo: 'all' as const,
        isFreeDelivery: index % 3 === 0,
        deliveryFee: index % 3 === 0 ? 0 : 15,
        deliveryTime: '45-60 min',
        redemptionCount: 0,
        createdBy: adminId,
      },
      // Electronics Offers
      {
        title: `${store.name} Tech Deals`,
        subtitle: 'Latest gadgets, best prices!',
        description: `Get the latest electronics with amazing cashback at ${store.name}. Dubai exclusive!`,
        image: 'https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=400',
        category: 'electronics' as const,
        type: 'discount' as const,
        cashbackPercentage: 15 + (index % 20),
        originalPrice: 2000 + (index * 100), // AED
        discountedPrice: 1600 + (index * 70),
        location: {
          type: 'Point' as const,
          coordinates: store.location.coordinates,
        },
        store: {
          id: store._id,
          name: store.name,
          logo: store.logo || 'https://via.placeholder.com/100',
          rating: store.rating || 4.4,
          verified: true,
        },
        validity: {
          startDate: pastDate(1),
          endDate: futureDate(21),
          isActive: true,
        },
        engagement: { likesCount: 90 + index * 18, sharesCount: 45 + index * 9, viewsCount: 400 + index * 80 },
        restrictions: {
          minOrderValue: 500, // AED
          maxDiscountAmount: 800, // AED
          applicableOn: ['both'],
          userTypeRestriction: 'all' as const,
        },
        metadata: {
          isNew: index % 3 === 0,
          isTrending: true,
          isBestSeller: index % 2 === 0,
          isSpecial: false,
          priority: 9 - (index % 4),
          tags: ['electronics', 'tech', 'dubai', 'gadgets'],
          featured: index < 5,
        },
        isFollowerExclusive: false,
        visibleTo: 'all' as const,
        isFreeDelivery: true,
        deliveryFee: 0,
        deliveryTime: 'Same day',
        redemptionCount: 0,
        createdBy: adminId,
      },
      // Beauty & Wellness Offers
      {
        title: `${store.name} Spa & Beauty`,
        subtitle: 'Pamper yourself!',
        description: `Luxury spa and beauty treatments at ${store.name}. Premium wellness experience in Dubai.`,
        image: 'https://images.unsplash.com/photo-1540555700478-4be289fbec6d?w=400',
        category: 'beauty' as const,
        type: 'voucher' as const,
        cashbackPercentage: 25 + (index % 10),
        originalPrice: 800 + (index * 50), // AED
        discountedPrice: 560 + (index * 30),
        location: {
          type: 'Point' as const,
          coordinates: store.location.coordinates,
        },
        store: {
          id: store._id,
          name: store.name,
          logo: store.logo || 'https://via.placeholder.com/100',
          rating: store.rating || 4.6,
          verified: true,
        },
        validity: {
          startDate: pastDate(1),
          endDate: futureDate(45),
          isActive: true,
        },
        engagement: { likesCount: 60 + index * 10, sharesCount: 30 + index * 5, viewsCount: 200 + index * 40 },
        restrictions: {
          minOrderValue: 200, // AED
          maxDiscountAmount: 400, // AED
          applicableOn: ['offline'],
          userTypeRestriction: 'all' as const,
        },
        metadata: {
          isNew: false,
          isTrending: index % 2 === 1,
          isBestSeller: false,
          isSpecial: true,
          priority: 8 - (index % 3),
          tags: ['beauty', 'spa', 'wellness', 'dubai', 'luxury'],
          featured: index < 3,
        },
        isFollowerExclusive: false,
        visibleTo: 'all' as const,
        isFreeDelivery: false,
        deliveryFee: 0,
        deliveryTime: 'By appointment',
        redemptionCount: 0,
        createdBy: adminId,
      },
    ];
    return baseOffers;
  });
};

async function connectDB() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/rez';
    await mongoose.connect(mongoUri);
    log.success('Connected to MongoDB');
  } catch (error) {
    log.error(`MongoDB connection error: ${error}`);
    process.exit(1);
  }
}

async function getOrCreateAdmin(): Promise<mongoose.Types.ObjectId> {
  let admin = await User.findOne({ email: 'admin@rez.com' });
  if (!admin) {
    // Try to find any existing admin user
    admin = await User.findOne({ isAdmin: true });
  }
  if (!admin) {
    // Try to find any user to use as createdBy
    admin = await User.findOne({});
  }
  if (!admin) {
    admin = await User.create({
      name: 'Admin User',
      email: 'admin@rez.com',
      phoneNumber: '+919999999999',
      isAdmin: true,
      isVerified: true,
    });
    log.info('Created admin user');
  }
  return admin._id as mongoose.Types.ObjectId;
}

async function seedOffers() {
  log.header('Seeding Region-Specific Offers');

  try {
    // Get admin user
    const adminId = await getOrCreateAdmin();

    // Get Bangalore stores
    log.region('Fetching Bangalore stores...');
    const bangaloreStores = await Store.find({
      isActive: true,
      $or: [
        { 'location.city': { $regex: /bangalore|bengaluru/i } },
        { 'address.city': { $regex: /bangalore|bengaluru/i } },
      ],
    }).select('_id name logo rating location').lean() as unknown as StoreInfo[];
    log.info(`Found ${bangaloreStores.length} stores in Bangalore`);

    // Get Dubai stores
    log.region('Fetching Dubai stores...');
    const dubaiStores = await Store.find({
      isActive: true,
      $or: [
        { 'location.city': { $regex: /dubai/i } },
        { 'address.city': { $regex: /dubai/i } },
      ],
    }).select('_id name logo rating location').lean() as unknown as StoreInfo[];
    log.info(`Found ${dubaiStores.length} stores in Dubai`);

    if (bangaloreStores.length === 0 && dubaiStores.length === 0) {
      log.warning('No stores found! Please seed stores first.');
      log.info('Run: npx ts-node src/seeds/exploreSeeds.ts');
      log.info('Run: npx ts-node src/seeds/dubaiStoreSeeds.ts');
      return;
    }

    // Clear existing offers (optional - comment out to keep existing)
    const existingCount = await Offer.countDocuments();
    if (existingCount > 0) {
      log.warning(`Found ${existingCount} existing offers. Clearing...`);
      await Offer.deleteMany({});
      log.success('Cleared existing offers');
    }

    // Create Bangalore offers
    let bangaloreOffersCount = 0;
    if (bangaloreStores.length > 0) {
      log.region('Creating Bangalore offers...');
      const bangaloreOffers = createBangaloreOffers(bangaloreStores, adminId);
      await Offer.insertMany(bangaloreOffers);
      bangaloreOffersCount = bangaloreOffers.length;
      log.success(`Created ${bangaloreOffersCount} offers for Bangalore`);
    }

    // Create Dubai offers
    let dubaiOffersCount = 0;
    if (dubaiStores.length > 0) {
      log.region('Creating Dubai offers...');
      const dubaiOffers = createDubaiOffers(dubaiStores, adminId);
      await Offer.insertMany(dubaiOffers);
      dubaiOffersCount = dubaiOffers.length;
      log.success(`Created ${dubaiOffersCount} offers for Dubai`);
    }

    // Summary
    log.header('Seeding Summary');
    console.log('┌────────────────────────┬───────────┬────────────┐');
    console.log('│ Region                 │ Stores    │ Offers     │');
    console.log('├────────────────────────┼───────────┼────────────┤');
    console.log(`│ Bangalore (INR)        │ ${String(bangaloreStores.length).padStart(9)} │ ${String(bangaloreOffersCount).padStart(10)} │`);
    console.log(`│ Dubai (AED)            │ ${String(dubaiStores.length).padStart(9)} │ ${String(dubaiOffersCount).padStart(10)} │`);
    console.log('├────────────────────────┼───────────┼────────────┤');
    console.log(`│ Total                  │ ${String(bangaloreStores.length + dubaiStores.length).padStart(9)} │ ${String(bangaloreOffersCount + dubaiOffersCount).padStart(10)} │`);
    console.log('└────────────────────────┴───────────┴────────────┘');

    // Verify by category
    log.header('Offers by Category');
    const categoryDistribution = await Offer.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    categoryDistribution.forEach((cat) => {
      console.log(`  ${cat._id}: ${cat.count} offers`);
    });

  } catch (error: any) {
    log.error(`Error seeding offers: ${error.message}`);
    console.error(error);
  }
}

async function main() {
  await connectDB();
  await seedOffers();
  await mongoose.disconnect();
  log.success('Disconnected from MongoDB');
  process.exit(0);
}

main();
