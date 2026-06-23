/**
 * Bangalore Dummy Store Seeds
 * Inserts 5 real-neighbourhood stores across Bangalore so that the
 * serviceability check (/stores/nearby) returns results and the consumer
 * app stays on the Near U tab.
 *
 * Run:  npx ts-node -r tsconfig-paths/register src/seeds/bangaloreStoreSeed.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { Store } from '../models/Store';
import { Category } from '../models/Category';
import { logger } from '../config/logger';

// SEC fix: see bangaloreFullSeed.ts for context on the removed literal.
const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) {
  throw new Error(
    '[bangaloreStoreSeed] MONGODB_URI env var is required. Set it before running the seed; no literal fallback.',
  );
}

// 5 neighbourhoods × [longitude, latitude]
const STORES = [
  {
    name: 'The BTM Brew House',
    slug: 'the-btm-brew-house-bangalore',
    description: 'Artisan coffee, fresh sandwiches and all-day breakfast in the heart of BTM Layout.',
    neighbourhood: 'BTM Layout',
    address: '14th Cross, BTM Layout 2nd Stage, BTM Layout, Bengaluru',
    pincode: '560076',
    coordinates: [77.6101, 12.9165] as [number, number], // [lng, lat]
    categorySlug: 'cafes',
    tags: ['coffee', 'breakfast', 'cafe', 'btm'],
    cashback: 8,
  },
  {
    name: 'Koramangala Fresh Mart',
    slug: 'koramangala-fresh-mart-bangalore',
    description: 'Premium grocery & organic produce store serving Koramangala and surrounding areas.',
    neighbourhood: 'Koramangala',
    address: '80 Feet Road, 6th Block, Koramangala, Bengaluru',
    pincode: '560095',
    coordinates: [77.6245, 12.9352] as [number, number],
    categorySlug: 'grocery',
    tags: ['grocery', 'organic', 'supermarket', 'koramangala'],
    cashback: 5,
  },
  {
    name: 'Indiranagar Style Studio',
    slug: 'indiranagar-style-studio-bangalore',
    description: 'Trendy fashion boutique and grooming salon on 100 Feet Road, Indiranagar.',
    neighbourhood: 'Indiranagar',
    address: '100 Feet Road, HAL 2nd Stage, Indiranagar, Bengaluru',
    pincode: '560038',
    coordinates: [77.6408, 12.9784] as [number, number],
    categorySlug: 'fashion',
    tags: ['fashion', 'grooming', 'salon', 'indiranagar'],
    cashback: 10,
  },
  {
    name: 'Malleshwaram Mane Meals',
    slug: 'malleshwaram-mane-meals-bangalore',
    description: 'Authentic Karnataka home-style meals, tiffin and sweets. A Malleshwaram institution since 2009.',
    neighbourhood: 'Malleshwaram',
    address: '8th Cross, Margosa Road, Malleshwaram, Bengaluru',
    pincode: '560003',
    coordinates: [77.5713, 13.0033] as [number, number],
    categorySlug: 'restaurants',
    tags: ['south-indian', 'home-meals', 'tiffin', 'malleshwaram'],
    cashback: 7,
  },
  {
    name: 'HSR Wellness Hub',
    slug: 'hsr-wellness-hub-bangalore',
    description: 'Yoga studio, physiotherapy, and nutrition counselling under one roof in HSR Layout.',
    neighbourhood: 'HSR Layout',
    address: 'Sector 2, HSR Layout, Bengaluru',
    pincode: '560102',
    coordinates: [77.6376, 12.9116] as [number, number],
    categorySlug: 'wellness',
    tags: ['yoga', 'fitness', 'wellness', 'physio', 'hsr'],
    cashback: 12,
  },
];

// Category slug fallback mapping — tries these slugs in order
const CATEGORY_FALLBACK_ORDER = [
  'cafes',
  'coffee-shops',
  'grocery',
  'supermarkets',
  'food-grocery',
  'fashion',
  'clothing',
  'restaurants',
  'food',
  'food-beverages',
  'wellness',
  'health-wellness',
  'fitness',
];

async function findOrCreateCategory(preferredSlug: string): Promise<mongoose.Types.ObjectId> {
  // Try preferred slug first
  let cat = await Category.findOne({ slug: preferredSlug }).lean();
  if (cat) return cat._id as mongoose.Types.ObjectId;

  // Try any existing category
  for (const slug of CATEGORY_FALLBACK_ORDER) {
    cat = await Category.findOne({ slug }).lean();
    if (cat) return cat._id as mongoose.Types.ObjectId;
  }

  // None found — create a minimal placeholder
  const placeholder = await Category.findOneAndUpdate(
    { slug: 'general' },
    {
      slug: 'general',
      name: 'General',
      isActive: true,
    },
    { upsert: true, new: true },
  );
  return placeholder._id as mongoose.Types.ObjectId;
}

const defaultHours = {
  monday: { open: '09:00', close: '21:00' },
  tuesday: { open: '09:00', close: '21:00' },
  wednesday: { open: '09:00', close: '21:00' },
  thursday: { open: '09:00', close: '21:00' },
  friday: { open: '09:00', close: '22:00' },
  saturday: { open: '10:00', close: '22:00' },
  sunday: { open: '10:00', close: '20:00' },
};

async function seed() {
  logger.info('📡 Connecting to MongoDB…');
  await mongoose.connect(MONGO_URI as string);
  logger.info('✅ Connected\n');

  let created = 0;
  let skipped = 0;

  for (const s of STORES) {
    const exists = await Store.findOne({ slug: s.slug }).lean();
    if (exists) {
      logger.info(`⏭️  Skipped (already exists): ${s.name}`);
      skipped++;
      continue;
    }

    const categoryId = await findOrCreateCategory(s.categorySlug);

    await Store.create({
      name: s.name,
      slug: s.slug,
      description: s.description,
      logo: `https://picsum.photos/seed/${s.slug}/200/200`,
      image: `https://picsum.photos/seed/${s.slug}-banner/800/400`,
      category: categoryId,
      location: {
        address: s.address,
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: s.pincode,
        coordinates: s.coordinates,
        deliveryRadius: 5,
        landmark: s.neighbourhood,
      },
      contact: {
        phone: '+919876543210',
        email: `hello@${s.slug}.com`,
      },
      ratings: {
        average: 4.2,
        count: 38,
        distribution: { 5: 18, 4: 12, 3: 5, 2: 2, 1: 1 },
      },
      offers: {
        cashback: s.cashback,
        minOrderAmount: 200,
        maxCashback: 150,
        isPartner: true,
        partnerLevel: 'silver',
      },
      operationalInfo: {
        hours: defaultHours,
        deliveryTime: '30-45 mins',
        minimumOrder: 200,
        deliveryFee: 30,
        freeDeliveryAbove: 500,
        acceptsWalletPayment: true,
        paymentMethods: ['upi', 'card', 'wallet', 'cash'],
      },
      deliveryCategories: {
        fastDelivery: true,
        budgetFriendly: false,
        ninetyNineStore: false,
        premium: false,
        organic: false,
        alliance: false,
        lowestPrice: false,
        mall: false,
        cashStore: false,
      },
      analytics: {
        totalOrders: 0,
        totalRevenue: 0,
        avgOrderValue: 0,
        repeatCustomers: 0,
        followersCount: 0,
      },
      tags: s.tags,
      isActive: true,
      isFeatured: false,
      isVerified: true,
    });

    logger.info(`✅ Created: ${s.name} — ${s.neighbourhood} [${s.coordinates}]`);
    created++;
  }

  logger.info(`\n📊 Done — ${created} created, ${skipped} skipped`);
  await mongoose.disconnect();
  logger.info('🔌 Disconnected');
}

seed().catch((err) => {
  logger.error('❌ Seed failed:', err);
  process.exit(1);
});
