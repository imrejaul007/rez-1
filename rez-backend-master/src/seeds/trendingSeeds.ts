// SECURITY: hard-coded MongoDB credentials replaced with env-var reference.
// Set MONGODB_URI in your environment before running this script.

/**
 * Trending Seeds - Comprehensive seed data for Trending Near You section
 * Run with: npx ts-node src/seeds/trendingSeeds.ts
 *
 * This seeds:
 * - 12 trending stores with video URLs
 * - 80+ orders distributed across stores for trending calculation
 * - Products for each store (required for orders)
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Import models
import { Category } from '../models/Category';
import { Store } from '../models/Store';
import { Product } from '../models/Product';
import { Order } from '../models/Order';
import { User } from '../models/User';

// Placeholder video URLs from free sources (for development/testing)
const VIDEO_URLS = {
  food: [
    'https://assets.mixkit.co/videos/preview/mixkit-chef-preparing-a-plate-with-vegetables-43129-large.mp4',
    'https://assets.mixkit.co/videos/preview/mixkit-woman-eating-a-slice-of-pizza-42756-large.mp4',
    'https://assets.mixkit.co/videos/preview/mixkit-fresh-ingredients-for-cooking-4646-large.mp4',
  ],
  salon: [
    'https://assets.mixkit.co/videos/preview/mixkit-young-woman-receiving-a-facial-treatment-42357-large.mp4',
    'https://assets.mixkit.co/videos/preview/mixkit-woman-getting-a-relaxing-facial-27283-large.mp4',
  ],
  grocery: [
    'https://assets.mixkit.co/videos/preview/mixkit-women-shopping-in-a-supermarket-4844-large.mp4',
    'https://assets.mixkit.co/videos/preview/mixkit-organic-vegetables-at-a-farmers-market-4815-large.mp4',
  ],
  electronics: [
    'https://assets.mixkit.co/videos/preview/mixkit-hands-holding-a-smartphone-4693-large.mp4',
    'https://assets.mixkit.co/videos/preview/mixkit-woman-using-laptop-at-home-4793-large.mp4',
  ],
  fashion: [
    'https://assets.mixkit.co/videos/preview/mixkit-women-walking-between-clothing-racks-39880-large.mp4',
    'https://assets.mixkit.co/videos/preview/mixkit-model-posing-with-shopping-bags-39843-large.mp4',
  ],
  cafe: [
    'https://assets.mixkit.co/videos/preview/mixkit-barista-preparing-coffee-4797-large.mp4',
    'https://assets.mixkit.co/videos/preview/mixkit-serving-a-cup-of-coffee-on-a-table-4781-large.mp4',
  ],
};

// Thumbnail URLs (static images)
const THUMBNAIL_URLS = {
  food: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400',
  salon: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400',
  grocery: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400',
  electronics: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400',
  fashion: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400',
  cafe: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400',
};

// ==========================================
// TRENDING STORE SEEDS (12 stores)
// ==========================================
const trendingStoreSeeds = [
  // FOOD DELIVERY - 3 stores
  {
    name: 'KFC',
    slug: 'kfc-trending',
    description: "Finger lickin' good chicken - crispy, juicy, and delicious",
    logo: 'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=200',
    banner: ['https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=800'],
    videos: [{
      url: VIDEO_URLS.food[0],
      thumbnail: THUMBNAIL_URLS.food,
      title: 'KFC Kitchen Fresh',
      duration: 12,
      uploadedAt: new Date(),
    }],
    categorySlug: 'food-delivery',
    tags: ['chicken', 'fast-food', 'fried-chicken', 'delivery', 'trending'],
    isActive: true,
    isFeatured: true,
    isVerified: true,
    location: {
      address: 'MG Road',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560001',
      coordinates: [77.5946, 12.9716],
    },
    contact: { phone: '+919876543210', email: 'support@kfc.in' },
    ratings: { average: 4.5, count: 2340, distribution: { 5: 1200, 4: 700, 3: 300, 2: 100, 1: 40 } },
    offers: { cashback: 18, minOrderAmount: 300, isPartner: true, partnerLevel: 'gold' },
    analytics: { totalOrders: 8900, totalRevenue: 4450000, avgOrderValue: 500, repeatCustomers: 4200, followersCount: 5600, views: 15000 },
    rewardRules: { baseCashbackPercent: 18, reviewBonusCoins: 50, socialShareBonusCoins: 25, minimumAmountForReward: 200 },
    orderCount: 25, // High orders for trending
  },
  {
    name: "Domino's Pizza",
    slug: 'dominos-trending',
    description: "World's favorite pizza delivery - hot and fresh",
    logo: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=200',
    banner: ['https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800'],
    videos: [{
      url: VIDEO_URLS.food[1],
      thumbnail: THUMBNAIL_URLS.food,
      title: "Domino's Fresh Pizza",
      duration: 10,
      uploadedAt: new Date(),
    }],
    categorySlug: 'food-delivery',
    tags: ['pizza', 'fast-food', 'delivery', 'italian', 'trending'],
    isActive: true,
    isFeatured: true,
    isVerified: true,
    location: {
      address: 'Koramangala 5th Block',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560034',
      coordinates: [77.6101, 12.9352],
    },
    contact: { phone: '+919876543211', email: 'support@dominos.in' },
    ratings: { average: 4.4, count: 1890, distribution: { 5: 900, 4: 600, 3: 250, 2: 100, 1: 40 } },
    offers: { cashback: 15, minOrderAmount: 250, isPartner: true, partnerLevel: 'platinum' },
    analytics: { totalOrders: 6500, totalRevenue: 3250000, avgOrderValue: 500, repeatCustomers: 3100, followersCount: 4200, views: 12000 },
    rewardRules: { baseCashbackPercent: 15, reviewBonusCoins: 40, socialShareBonusCoins: 20, minimumAmountForReward: 200 },
    orderCount: 20,
  },
  {
    name: 'Burger King',
    slug: 'burger-king-trending',
    description: 'Have it your way - flame-grilled burgers',
    logo: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=200',
    banner: ['https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800'],
    videos: [{
      url: VIDEO_URLS.food[2],
      thumbnail: THUMBNAIL_URLS.food,
      title: 'Burger King Fresh Grilled',
      duration: 8,
      uploadedAt: new Date(),
    }],
    categorySlug: 'food-delivery',
    tags: ['burger', 'fast-food', 'delivery', 'american', 'trending'],
    isActive: true,
    isFeatured: true,
    isVerified: true,
    location: {
      address: 'Indiranagar',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560038',
      coordinates: [77.6411, 12.9719],
    },
    contact: { phone: '+919876543212' },
    ratings: { average: 4.3, count: 1560, distribution: { 5: 700, 4: 500, 3: 250, 2: 80, 1: 30 } },
    offers: { cashback: 12, minOrderAmount: 200, isPartner: true, partnerLevel: 'gold' },
    analytics: { totalOrders: 5200, totalRevenue: 2600000, avgOrderValue: 500, repeatCustomers: 2500, followersCount: 3100, views: 9000 },
    rewardRules: { baseCashbackPercent: 12, reviewBonusCoins: 35, socialShareBonusCoins: 18, minimumAmountForReward: 150 },
    orderCount: 15,
  },

  // SALON & SPA - 2 stores
  {
    name: 'Lakme Salon',
    slug: 'lakme-salon-trending',
    description: 'Premium beauty and salon services - look your best',
    logo: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=200',
    banner: ['https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800'],
    videos: [{
      url: VIDEO_URLS.salon[0],
      thumbnail: THUMBNAIL_URLS.salon,
      title: 'Lakme Beauty Experience',
      duration: 15,
      uploadedAt: new Date(),
    }],
    categorySlug: 'salon-spa',
    tags: ['beauty', 'salon', 'spa', 'makeup', 'haircut', 'trending'],
    isActive: true,
    isFeatured: true,
    isVerified: true,
    location: {
      address: 'Phoenix Marketcity',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560048',
      coordinates: [77.6411, 12.9972],
    },
    contact: { phone: '+919876543213', email: 'booking@lakme.in' },
    ratings: { average: 4.7, count: 890, distribution: { 5: 600, 4: 200, 3: 60, 2: 20, 1: 10 } },
    offers: { cashback: 25, minOrderAmount: 500, isPartner: true, partnerLevel: 'platinum' },
    analytics: { totalOrders: 2100, totalRevenue: 2100000, avgOrderValue: 1000, repeatCustomers: 1200, followersCount: 2800, views: 7500 },
    rewardRules: { baseCashbackPercent: 25, reviewBonusCoins: 75, socialShareBonusCoins: 40, minimumAmountForReward: 400 },
    orderCount: 18,
  },
  {
    name: 'Naturals Salon',
    slug: 'naturals-salon-trending',
    description: 'Organic beauty care with natural products',
    logo: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=200',
    banner: ['https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800'],
    videos: [{
      url: VIDEO_URLS.salon[1],
      thumbnail: THUMBNAIL_URLS.salon,
      title: 'Naturals Spa Treatment',
      duration: 12,
      uploadedAt: new Date(),
    }],
    categorySlug: 'salon-spa',
    tags: ['beauty', 'salon', 'organic', 'natural', 'trending'],
    isActive: true,
    isFeatured: false,
    isVerified: true,
    location: {
      address: 'Jayanagar 4th Block',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560041',
      coordinates: [77.5837, 12.9251],
    },
    contact: { phone: '+919876543214' },
    ratings: { average: 4.5, count: 670, distribution: { 5: 400, 4: 180, 3: 60, 2: 20, 1: 10 } },
    offers: { cashback: 20, minOrderAmount: 400, isPartner: true, partnerLevel: 'gold' },
    analytics: { totalOrders: 1500, totalRevenue: 1200000, avgOrderValue: 800, repeatCustomers: 900, followersCount: 1800, views: 5000 },
    rewardRules: { baseCashbackPercent: 20, reviewBonusCoins: 60, socialShareBonusCoins: 30, minimumAmountForReward: 350 },
    orderCount: 12,
  },

  // GROCERY - 2 stores
  {
    name: 'BigBasket',
    slug: 'bigbasket-trending',
    description: 'Online grocery shopping - fresh produce delivered',
    logo: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200',
    banner: ['https://images.unsplash.com/photo-1542838132-92c53300491e?w=800'],
    videos: [{
      url: VIDEO_URLS.grocery[0],
      thumbnail: THUMBNAIL_URLS.grocery,
      title: 'BigBasket Fresh Delivery',
      duration: 10,
      uploadedAt: new Date(),
    }],
    categorySlug: 'grocery',
    tags: ['grocery', 'essentials', 'organic', 'fresh', 'trending'],
    isActive: true,
    isFeatured: true,
    isVerified: true,
    location: {
      address: 'HSR Layout',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560102',
      coordinates: [77.6245, 12.9352],
    },
    contact: { phone: '+919876543215', email: 'support@bigbasket.com' },
    ratings: { average: 4.2, count: 3400, distribution: { 5: 1500, 4: 1200, 3: 450, 2: 180, 1: 70 } },
    offers: { cashback: 10, minOrderAmount: 500, isPartner: true, partnerLevel: 'gold' },
    analytics: { totalOrders: 12000, totalRevenue: 6000000, avgOrderValue: 500, repeatCustomers: 7000, followersCount: 8500, views: 20000 },
    rewardRules: { baseCashbackPercent: 10, reviewBonusCoins: 30, socialShareBonusCoins: 15, minimumAmountForReward: 300 },
    orderCount: 22,
  },
  {
    name: 'FreshMart',
    slug: 'freshmart-trending',
    description: 'Farm fresh vegetables and fruits daily',
    logo: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=200',
    banner: ['https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800'],
    videos: [{
      url: VIDEO_URLS.grocery[1],
      thumbnail: THUMBNAIL_URLS.grocery,
      title: 'FreshMart Organic Produce',
      duration: 8,
      uploadedAt: new Date(),
    }],
    categorySlug: 'grocery',
    tags: ['grocery', 'fresh', 'vegetables', 'fruits', 'trending'],
    isActive: true,
    isFeatured: false,
    isVerified: true,
    location: {
      address: 'Whitefield',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560066',
      coordinates: [77.7506, 12.9698],
    },
    contact: { phone: '+919876543216' },
    ratings: { average: 4.4, count: 1200, distribution: { 5: 600, 4: 400, 3: 150, 2: 40, 1: 10 } },
    offers: { cashback: 8, minOrderAmount: 300, isPartner: true, partnerLevel: 'silver' },
    analytics: { totalOrders: 4500, totalRevenue: 1800000, avgOrderValue: 400, repeatCustomers: 2800, followersCount: 3200, views: 8000 },
    rewardRules: { baseCashbackPercent: 8, reviewBonusCoins: 25, socialShareBonusCoins: 12, minimumAmountForReward: 250 },
    orderCount: 10,
  },

  // ELECTRONICS - 2 stores
  {
    name: 'Croma',
    slug: 'croma-trending',
    description: 'Electronics and gadgets - latest technology',
    logo: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=200',
    banner: ['https://images.unsplash.com/photo-1498049794561-7780e7231661?w=800'],
    videos: [{
      url: VIDEO_URLS.electronics[0],
      thumbnail: THUMBNAIL_URLS.electronics,
      title: 'Croma Tech Store',
      duration: 12,
      uploadedAt: new Date(),
    }],
    categorySlug: 'electronics',
    tags: ['electronics', 'gadgets', 'mobile', 'laptop', 'trending'],
    isActive: true,
    isFeatured: true,
    isVerified: true,
    location: {
      address: 'Forum Mall',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560034',
      coordinates: [77.6101, 12.9352],
    },
    contact: { phone: '+919876543217', email: 'support@croma.com' },
    ratings: { average: 4.1, count: 1800, distribution: { 5: 700, 4: 600, 3: 300, 2: 150, 1: 50 } },
    offers: { cashback: 12, minOrderAmount: 1000, isPartner: true, partnerLevel: 'gold' },
    analytics: { totalOrders: 3200, totalRevenue: 9600000, avgOrderValue: 3000, repeatCustomers: 1500, followersCount: 4500, views: 11000 },
    rewardRules: { baseCashbackPercent: 12, reviewBonusCoins: 100, socialShareBonusCoins: 50, minimumAmountForReward: 800 },
    orderCount: 14,
  },
  {
    name: 'Reliance Digital',
    slug: 'reliance-digital-trending',
    description: 'Digital electronics superstore',
    logo: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=200',
    banner: ['https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=800'],
    videos: [{
      url: VIDEO_URLS.electronics[1],
      thumbnail: THUMBNAIL_URLS.electronics,
      title: 'Reliance Digital Store',
      duration: 10,
      uploadedAt: new Date(),
    }],
    categorySlug: 'electronics',
    tags: ['electronics', 'appliances', 'tv', 'mobile', 'trending'],
    isActive: true,
    isFeatured: false,
    isVerified: true,
    location: {
      address: 'Brigade Road',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560001',
      coordinates: [77.5833, 12.9716],
    },
    contact: { phone: '+919876543218' },
    ratings: { average: 4.0, count: 1400, distribution: { 5: 500, 4: 500, 3: 280, 2: 80, 1: 40 } },
    offers: { cashback: 10, minOrderAmount: 800, isPartner: true, partnerLevel: 'silver' },
    analytics: { totalOrders: 2800, totalRevenue: 7000000, avgOrderValue: 2500, repeatCustomers: 1200, followersCount: 3800, views: 9500 },
    rewardRules: { baseCashbackPercent: 10, reviewBonusCoins: 80, socialShareBonusCoins: 40, minimumAmountForReward: 600 },
    orderCount: 11,
  },

  // CAFE - 2 stores
  {
    name: 'Starbucks',
    slug: 'starbucks-trending',
    description: 'Premium coffee experience',
    logo: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=200',
    banner: ['https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=800'],
    videos: [{
      url: VIDEO_URLS.cafe[0],
      thumbnail: THUMBNAIL_URLS.cafe,
      title: 'Starbucks Coffee Art',
      duration: 10,
      uploadedAt: new Date(),
    }],
    categorySlug: 'cafes',
    tags: ['coffee', 'cafe', 'premium', 'beverages', 'trending'],
    isActive: true,
    isFeatured: true,
    isVerified: true,
    location: {
      address: 'UB City Mall',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560001',
      coordinates: [77.5946, 12.9716],
    },
    contact: { phone: '+919876543219', email: 'support@starbucks.in' },
    ratings: { average: 4.6, count: 1100, distribution: { 5: 700, 4: 280, 3: 80, 2: 30, 1: 10 } },
    offers: { cashback: 20, minOrderAmount: 200, isPartner: true, partnerLevel: 'platinum' },
    analytics: { totalOrders: 4800, totalRevenue: 2400000, avgOrderValue: 500, repeatCustomers: 2800, followersCount: 5200, views: 13000 },
    rewardRules: { baseCashbackPercent: 20, reviewBonusCoins: 45, socialShareBonusCoins: 22, minimumAmountForReward: 150 },
    orderCount: 19,
  },
  {
    name: 'Cafe Coffee Day',
    slug: 'ccd-trending',
    description: 'A lot can happen over coffee',
    logo: 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=200',
    banner: ['https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=800'],
    videos: [{
      url: VIDEO_URLS.cafe[1],
      thumbnail: THUMBNAIL_URLS.cafe,
      title: 'CCD Coffee Moments',
      duration: 8,
      uploadedAt: new Date(),
    }],
    categorySlug: 'cafes',
    tags: ['coffee', 'cafe', 'snacks', 'beverages', 'trending'],
    isActive: true,
    isFeatured: false,
    isVerified: true,
    location: {
      address: 'MG Road',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560001',
      coordinates: [77.5946, 12.9716],
    },
    contact: { phone: '+919876543220' },
    ratings: { average: 4.3, count: 980, distribution: { 5: 450, 4: 350, 3: 130, 2: 40, 1: 10 } },
    offers: { cashback: 15, minOrderAmount: 150, isPartner: true, partnerLevel: 'gold' },
    analytics: { totalOrders: 3900, totalRevenue: 1560000, avgOrderValue: 400, repeatCustomers: 2400, followersCount: 4100, views: 10500 },
    rewardRules: { baseCashbackPercent: 15, reviewBonusCoins: 35, socialShareBonusCoins: 18, minimumAmountForReward: 120 },
    orderCount: 16,
  },
];

// ==========================================
// HELPER FUNCTIONS
// ==========================================

// Generate random date within last N days
function randomDateWithinDays(days: number): Date {
  const now = new Date();
  const randomDaysAgo = Math.floor(Math.random() * days);
  const randomHours = Math.floor(Math.random() * 24);
  const randomMinutes = Math.floor(Math.random() * 60);

  const date = new Date(now);
  date.setDate(date.getDate() - randomDaysAgo);
  date.setHours(randomHours, randomMinutes, 0, 0);

  return date;
}

// Generate order number
function generateOrderNumber(): string {
  const prefix = 'REZ';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}${timestamp}${random}`;
}

// ==========================================
// MAIN SEED FUNCTION
// ==========================================
async function runTrendingSeeds() {
  console.log('🔥 Starting Trending Seeds...\n');

  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI ||
      (process.env.MONGODB_URI || process.env.MONGO_URI) as string;
if (!mongoUri) { console.error('MONGODB_URI or MONGO_URI not set'); process.exit(1); };

    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Get or create seed user
    let seedUser = await User.findOne({ email: 'seed-user@rez.app' });
    if (!seedUser) {
      seedUser = await User.create({
        name: 'Seed User',
        email: 'seed-user@rez.app',
        phoneNumber: '+919999900001',
        isVerified: true,
      });
      console.log('✅ Created seed user\n');
    }

    // Get category map
    const categoryMap: Record<string, any> = {};
    const categories = await Category.find({});
    categories.forEach(cat => {
      categoryMap[cat.slug] = cat._id;
    });

    console.log('📊 Found', Object.keys(categoryMap).length, 'categories\n');

    // Track created stores for order creation
    const createdStores: any[] = [];
    const createdProducts: any[] = [];

    // Seed Stores with videos
    console.log('🏪 Seeding Trending Stores...');
    for (const storeData of trendingStoreSeeds) {
      const { categorySlug, orderCount, ...storeFields } = storeData;

      // Get category ID
      const categoryId = categoryMap[categorySlug] || categoryMap['food-delivery'];

      // Check if store already exists
      let store = await Store.findOne({ slug: storeData.slug });

      if (store) {
        // Update existing store with video
        store = await Store.findOneAndUpdate(
          { slug: storeData.slug },
          {
            ...storeFields,
            category: categoryId,
            videos: storeData.videos,
          },
          { new: true }
        );
        console.log(`   📝 Updated: ${storeData.name}`);
      } else {
        // Create new store
        store = await Store.create({
          ...storeFields,
          category: categoryId,
        });
        console.log(`   ✅ Created: ${storeData.name}`);
      }

      if (!store) {
        console.log(`   ⚠️ Failed to create/update store: ${storeData.name}`);
        continue;
      }

      createdStores.push({ store, orderCount });

      // Create a product for this store (needed for orders)
      let product = await Product.findOne({ store: store._id });
      if (!product) {
        const productSlug = `${storeData.slug}-special-${Date.now()}`;
        const sellingPrice = 300 + Math.floor(Math.random() * 500);
        const originalPrice = sellingPrice + Math.floor(Math.random() * 200);

        product = await Product.create({
          name: `${storeData.name} Special`,
          slug: productSlug,
          description: `Popular item from ${storeData.name}`,
          sku: `SKU-${storeData.slug.toUpperCase()}-${Date.now()}`,
          images: [storeData.banner?.[0] || storeData.logo],
          category: categoryId,
          store: store._id,
          type: 'product',
          pricing: {
            original: originalPrice,
            selling: sellingPrice,
            currency: 'INR',
          },
          inventory: {
            stock: 1000,
            lowStockThreshold: 10,
            trackInventory: true,
          },
          isActive: true,
          isFeatured: true,
        });
        console.log(`   📦 Created product for: ${storeData.name}`);
      }
      createdProducts.push({ product, store, orderCount });
    }
    console.log(`   📊 Total stores: ${trendingStoreSeeds.length}\n`);

    // Seed Orders for trending calculation
    console.log('📝 Seeding Orders for trending calculation...');
    let totalOrders = 0;

    for (const { product, store, orderCount } of createdProducts) {
      // Create orders for this store within last 7 days
      for (let i = 0; i < orderCount; i++) {
        const orderDate = randomDateWithinDays(7);
        const quantity = 1 + Math.floor(Math.random() * 3);
        const price = (product as any).pricing?.selling || 400;
        const subtotal = price * quantity;
        const tax = Math.round(subtotal * 0.05);
        const delivery = 30;
        const total = subtotal + tax + delivery;

        // Valid Order statuses: 'placed' | 'confirmed' | 'preparing' | 'ready' | 'dispatched' | 'delivered' | 'cancelled' | 'returned' | 'refunded'
        const orderStatuses = ['delivered', 'confirmed', 'preparing', 'ready', 'dispatched'];
        const randomStatus = orderStatuses[Math.floor(Math.random() * orderStatuses.length)];

        await Order.create({
          orderNumber: generateOrderNumber(),
          user: seedUser._id,
          items: [{
            product: product._id,
            store: store._id,
            name: product.name,
            image: product.images?.[0] || '',
            itemType: 'product',
            quantity,
            price,
            subtotal,
          }],
          totals: {
            subtotal,
            tax,
            delivery,
            discount: 0,
            cashback: Math.round(subtotal * 0.1),
            total,
            paidAmount: total,
          },
          payment: {
            method: 'upi',
            status: 'paid',
            paidAt: orderDate,
          },
          delivery: {
            method: 'standard',
            status: randomStatus === 'delivered' ? 'delivered' : 'pending',
            address: {
              name: 'Seed User',
              phone: '+919999900001',
              addressLine1: '123 Test Street',
              city: 'Bangalore',
              state: 'Karnataka',
              pincode: '560001',
              country: 'India',
            },
            deliveryFee: delivery,
          },
          timeline: [{
            status: 'placed',
            message: 'Order placed successfully',
            timestamp: orderDate,
          }],
          status: randomStatus,
          createdAt: orderDate,
          updatedAt: orderDate,
        });

        totalOrders++;
      }
      console.log(`   ✅ Created ${orderCount} orders for: ${store.name}`);
    }

    console.log(`\n   📊 Total orders created: ${totalOrders}\n`);

    // Print summary
    console.log('🎉 Trending seeds completed successfully!');
    console.log('━'.repeat(50));
    console.log('📊 SUMMARY');
    console.log('━'.repeat(50));
    console.log(`   Trending Stores:    ${trendingStoreSeeds.length}`);
    console.log(`   Products Created:   ${createdProducts.length}`);
    console.log(`   Orders Created:     ${totalOrders}`);
    console.log('━'.repeat(50));
    console.log('\n📌 Next steps:');
    console.log('   1. Restart the backend server');
    console.log('   2. Clear Redis cache (if needed)');
    console.log('   3. Test /stores/trending endpoint');
    console.log('   4. Verify videos show in frontend');

  } catch (error) {
    console.error('❌ Error running trending seeds:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n📡 Disconnected from MongoDB');
  }
}

// Run seeds if executed directly
if (require.main === module) {
  runTrendingSeeds()
    .then(() => {
      console.log('\n✅ Trending seeding complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Trending seeding failed:', error);
      process.exit(1);
    });
}

export { runTrendingSeeds, trendingStoreSeeds };
