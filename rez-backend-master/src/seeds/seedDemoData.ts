// SEED-ONLY SCRIPT — Run once to populate demo/test data in development or staging.
// Do NOT run in production unless you intend to insert demo records.
// Usage: npx ts-node src/seeds/seedDemoData.ts

/**
 * seedDemoData.ts
 *
 * Comprehensive demo seed — populates ALL key collections with realistic
 * Bangalore data so the app looks alive and full for demo/launch.
 *
 * Collections seeded:
 *   • Category     — ensures core slugs exist
 *   • Store        — 20+ real Bangalore stores
 *   • Offer        — 30+ offers across all categories
 *   • FlashSale    — 5 active time-limited deals
 *   • BonusCampaign — 5 active bonus-zone campaigns
 *   • LockPriceDeal — 10 prepaid lock deals
 *   • TrialOffer   — 15 TRY offers
 *   • VoucherBrand — 10 voucher brands
 *   • HeroBanner   — 3 homepage banners
 *
 * Safe to re-run — every collection uses upsert / findOneAndUpdate
 * so no duplicates are ever created.
 *
 * Run standalone:
 *   npx ts-node src/seeds/seedDemoData.ts
 *
 * Or call runSeedDemoData() programmatically from cronJobs.ts.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { Store } from '../models/Store';
import { Category } from '../models/Category';
import Offer from '../models/Offer';
import FlashSale from '../models/FlashSale';
import BonusCampaign from '../models/BonusCampaign';
import { LockPriceDeal } from '../models/LockPriceDeal';
import { TrialOffer } from '../models/TrialOffer';
import { VoucherBrand } from '../models/Voucher';
import HeroBanner from '../models/HeroBanner';
import { MerchantUser } from '../models/MerchantUser';
import { logger } from '../config/logger';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Returns NOW + `hours` hours as a Date */
const hoursFromNow = (hours: number): Date => new Date(Date.now() + hours * 60 * 60 * 1000);

/** Returns NOW + `days` days as a Date */
const daysFromNow = (days: number): Date => new Date(Date.now() + days * 24 * 60 * 60 * 1000);

/** Slug-safe string */
const toSlug = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');

/** Standard Bangalore operating hours */
const defaultHours = {
  monday: { open: '09:00', close: '21:00' },
  tuesday: { open: '09:00', close: '21:00' },
  wednesday: { open: '09:00', close: '21:00' },
  thursday: { open: '09:00', close: '21:00' },
  friday: { open: '09:00', close: '22:00' },
  saturday: { open: '10:00', close: '22:00' },
  sunday: { open: '10:00', close: '21:00' },
};

/** Lookup or create a Category by slug. Falls back to 'general'. */
async function getOrCreateCategory(slug: string): Promise<mongoose.Types.ObjectId> {
  const existing = await Category.findOne({ slug }).lean();
  if (existing) return existing._id as mongoose.Types.ObjectId;

  // Try common fallbacks
  const fallbacks = [
    'food',
    'food-beverages',
    'restaurants',
    'cafes',
    'fashion',
    'grocery',
    'wellness',
    'fitness',
    'beauty',
    'entertainment',
    'electronics',
    'general',
  ];
  for (const fb of fallbacks) {
    const cat = await Category.findOne({ slug: fb }).lean();
    if (cat) return cat._id as mongoose.Types.ObjectId;
  }

  // Create minimal placeholder
  const placeholder = await Category.findOneAndUpdate(
    { slug: 'general' },
    { slug: 'general', name: 'General', type: 'general', isActive: true, sortOrder: 99 },
    { upsert: true, new: true },
  );
  return placeholder._id as mongoose.Types.ObjectId;
}

/** Get or create a placeholder MerchantUser ObjectId for seed data. */
async function getSeedMerchantId(): Promise<mongoose.Types.ObjectId> {
  const existing = await MerchantUser.findOne({ email: 'seed-demo@rez.app' }).lean();
  if (existing) return existing._id as mongoose.Types.ObjectId;

  const created = await MerchantUser.create({
    merchantId: new mongoose.Types.ObjectId(),
    email: 'seed-demo@rez.app',
    password: 'seed-placeholder-not-for-login',
    name: 'REZ Demo Merchant',
    role: 'owner',
    permissions: [],
    status: 'active',
    invitedBy: new mongoose.Types.ObjectId(),
    invitedAt: new Date(),
    failedLoginAttempts: 0,
    pushTokens: [],
  });
  return created._id as mongoose.Types.ObjectId;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. CATEGORIES — ensure core slugs exist
// ─────────────────────────────────────────────────────────────────────────────

const CORE_CATEGORIES = [
  { slug: 'restaurants', name: 'Restaurants', type: 'going_out' as const, icon: '🍽️', sortOrder: 1 },
  { slug: 'cafes', name: 'Cafes', type: 'going_out' as const, icon: '☕', sortOrder: 2 },
  { slug: 'salon-beauty', name: 'Salon & Beauty', type: 'going_out' as const, icon: '💇', sortOrder: 3 },
  { slug: 'fitness', name: 'Fitness & Gym', type: 'going_out' as const, icon: '💪', sortOrder: 4 },
  { slug: 'entertainment', name: 'Entertainment', type: 'going_out' as const, icon: '🎭', sortOrder: 5 },
  { slug: 'grocery', name: 'Grocery', type: 'home_delivery' as const, icon: '🛒', sortOrder: 6 },
  { slug: 'electronics', name: 'Electronics', type: 'going_out' as const, icon: '📱', sortOrder: 7 },
  { slug: 'fashion', name: 'Fashion', type: 'going_out' as const, icon: '👗', sortOrder: 8 },
  { slug: 'desserts', name: 'Desserts', type: 'going_out' as const, icon: '🍰', sortOrder: 9 },
  { slug: 'wellness', name: 'Wellness & Spa', type: 'going_out' as const, icon: '🧘', sortOrder: 10 },
];

async function seedCategories(): Promise<void> {
  logger.info('[SeedDemo] Seeding core categories…');

  // OPTIMIZATION: Use bulkWrite instead of sequential findOneAndUpdate
  // Before: 10 sequential DB calls (one per category)
  // After: 1 bulk operation
  const bulkOps = CORE_CATEGORIES.map(cat => ({
    updateOne: {
      filter: { slug: cat.slug },
      update: {
        $setOnInsert: {
          name: cat.name,
          slug: cat.slug,
          type: cat.type,
          icon: cat.icon,
          isActive: true,
          sortOrder: cat.sortOrder,
          metadata: {},
          productCount: 0,
          storeCount: 0,
          isBestDiscount: false,
          isBestSeller: false,
          maxCashback: 20,
        },
      },
      upsert: true,
    },
  }));

  await (Category as any).bulkWrite(bulkOps as any[], { ordered: false });
  logger.info(`[SeedDemo] ${CORE_CATEGORIES.length} categories ensured (bulkWrite)`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. STORES — 20 realistic Bangalore stores
// ─────────────────────────────────────────────────────────────────────────────

interface StoreSeedDef {
  name: string;
  slug: string;
  description: string;
  neighbourhood: string;
  address: string;
  pincode: string;
  coordinates: [number, number]; // [lng, lat]
  categorySlug: string;
  tags: string[];
  cashback: number;
  rating: number;
  ratingCount: number;
  isFeatured: boolean;
  bannerKeyword: string; // for unsplash query
}

const STORE_DEFS: StoreSeedDef[] = [
  // ─── Cafes ───
  {
    name: 'Third Wave Coffee',
    slug: 'third-wave-coffee-indiranagar',
    description: 'Specialty single-origin pour-overs and cold brews on 100 Feet Road.',
    neighbourhood: 'Indiranagar',
    address: '68, 100 Feet Road, Indiranagar, Bengaluru',
    pincode: '560038',
    coordinates: [77.6408, 12.9784],
    categorySlug: 'cafes',
    tags: ['coffee', 'specialty', 'cafe', 'near-u', 'indiranagar'],
    cashback: 10,
    rating: 4.5,
    ratingCount: 312,
    isFeatured: true,
    bannerKeyword: 'specialty-coffee',
  },
  {
    name: 'Blue Tokai Coffee Roasters',
    slug: 'blue-tokai-koramangala',
    description: 'Bangalore-founded micro-roastery serving direct-trade Indian beans.',
    neighbourhood: 'Koramangala',
    address: '11th Main, 4th Block, Koramangala, Bengaluru',
    pincode: '560034',
    coordinates: [77.6245, 12.9352],
    categorySlug: 'cafes',
    tags: ['coffee', 'roastery', 'cafe', 'near-u', 'koramangala'],
    cashback: 8,
    rating: 4.6,
    ratingCount: 478,
    isFeatured: true,
    bannerKeyword: 'coffee-roastery',
  },
  {
    name: 'Starbucks Reserve',
    slug: 'starbucks-reserve-whitefield',
    description: 'Premium Reserve experience with handcrafted beverages and small-batch beans.',
    neighbourhood: 'Whitefield',
    address: 'VR Bengaluru Mall, Whitefield Main Road, Bengaluru',
    pincode: '560066',
    coordinates: [77.7499, 12.9698],
    categorySlug: 'cafes',
    tags: ['coffee', 'premium', 'cafe', 'near-u', 'whitefield'],
    cashback: 12,
    rating: 4.3,
    ratingCount: 521,
    isFeatured: false,
    bannerKeyword: 'starbucks',
  },
  // ─── Salon & Beauty ───
  {
    name: 'Naturals Salon',
    slug: 'naturals-salon-jayanagar',
    description: "South India's most trusted salon chain. Hair, skin & nail services.",
    neighbourhood: 'Jayanagar',
    address: '4th Block, Jayanagar, Bengaluru',
    pincode: '560041',
    coordinates: [77.5933, 12.9249],
    categorySlug: 'salon-beauty',
    tags: ['salon', 'haircut', 'beauty', 'near-u', 'jayanagar'],
    cashback: 15,
    rating: 4.2,
    ratingCount: 887,
    isFeatured: true,
    bannerKeyword: 'hair-salon',
  },
  {
    name: 'Lakme Salon',
    slug: 'lakme-salon-btm-layout',
    description: "India's premier beauty salon by Lakme. Facials, hair colour & bridal packages.",
    neighbourhood: 'BTM Layout',
    address: '2nd Stage, BTM Layout, Bengaluru',
    pincode: '560076',
    coordinates: [77.6101, 12.9165],
    categorySlug: 'salon-beauty',
    tags: ['salon', 'beauty', 'facial', 'near-u', 'btm'],
    cashback: 20,
    rating: 4.4,
    ratingCount: 654,
    isFeatured: false,
    bannerKeyword: 'beauty-salon',
  },
  {
    name: 'Toni & Guy',
    slug: 'toni-and-guy-hsr-layout',
    description: 'International award-winning salon. Expert cuts, colour & styling.',
    neighbourhood: 'HSR Layout',
    address: '27th Main Road, Sector 2, HSR Layout, Bengaluru',
    pincode: '560102',
    coordinates: [77.6376, 12.9116],
    categorySlug: 'salon-beauty',
    tags: ['salon', 'premium', 'haircut', 'near-u', 'hsr'],
    cashback: 18,
    rating: 4.7,
    ratingCount: 342,
    isFeatured: true,
    bannerKeyword: 'premium-salon',
  },
  // ─── Fitness & Gym ───
  {
    name: 'Cult.fit',
    slug: 'cult-fit-koramangala',
    description: 'Group fitness classes — HIIT, Boxing, Yoga and more. Book in-app.',
    neighbourhood: 'Koramangala',
    address: '8th Block, Koramangala, Bengaluru',
    pincode: '560095',
    coordinates: [77.6272, 12.929],
    categorySlug: 'fitness',
    tags: ['gym', 'fitness', 'yoga', 'near-u', 'koramangala'],
    cashback: 12,
    rating: 4.5,
    ratingCount: 1243,
    isFeatured: true,
    bannerKeyword: 'fitness-gym',
  },
  {
    name: "Gold's Gym",
    slug: 'golds-gym-indiranagar',
    description: 'World-renowned gym brand with state-of-the-art equipment and certified trainers.',
    neighbourhood: 'Indiranagar',
    address: 'CMH Road, Indiranagar, Bengaluru',
    pincode: '560038',
    coordinates: [77.6449, 12.9735],
    categorySlug: 'fitness',
    tags: ['gym', 'fitness', 'weights', 'near-u', 'indiranagar'],
    cashback: 10,
    rating: 4.3,
    ratingCount: 762,
    isFeatured: false,
    bannerKeyword: 'gym-workout',
  },
  {
    name: 'Anytime Fitness',
    slug: 'anytime-fitness-jp-nagar',
    description: '24/7 gym access with global reciprocal access to 4,500+ clubs worldwide.',
    neighbourhood: 'JP Nagar',
    address: 'JP Nagar 6th Phase, Bengaluru',
    pincode: '560078',
    coordinates: [77.5905, 12.8953],
    categorySlug: 'fitness',
    tags: ['gym', '24-7', 'fitness', 'near-u', 'jp-nagar'],
    cashback: 8,
    rating: 4.2,
    ratingCount: 421,
    isFeatured: false,
    bannerKeyword: 'modern-gym',
  },
  // ─── Entertainment ───
  {
    name: 'PVR Cinemas',
    slug: 'pvr-cinemas-forum-mall',
    description: 'Premium multiplex with IMAX & 4DX screens at Forum Mall, Koramangala.',
    neighbourhood: 'Koramangala',
    address: 'Forum Mall, 21, Hosur Road, Koramangala, Bengaluru',
    pincode: '560029',
    coordinates: [77.614, 12.9263],
    categorySlug: 'entertainment',
    tags: ['movies', 'cinema', 'imax', 'near-u', 'koramangala'],
    cashback: 15,
    rating: 4.4,
    ratingCount: 2341,
    isFeatured: true,
    bannerKeyword: 'cinema-theatre',
  },
  {
    name: 'Smaaash Entertainment',
    slug: 'smaaash-entertainment-whitefield',
    description: 'Gaming arena with VR, bowling, cricket simulators and F&B. Perfect for groups.',
    neighbourhood: 'Whitefield',
    address: 'Phoenix Marketcity, Whitefield, Bengaluru',
    pincode: '560066',
    coordinates: [77.7481, 12.968],
    categorySlug: 'entertainment',
    tags: ['gaming', 'vr', 'bowling', 'near-u', 'whitefield'],
    cashback: 10,
    rating: 4.1,
    ratingCount: 876,
    isFeatured: false,
    bannerKeyword: 'gaming-entertainment',
  },
  {
    name: 'Amoeba Bowling & Games',
    slug: 'amoeba-bowling-commercial-street',
    description: "Bangalore's iconic bowling alley on Commercial Street. Pool, gaming & snacks.",
    neighbourhood: 'Commercial Street',
    address: 'Commercial Street, Shivajinagar, Bengaluru',
    pincode: '560001',
    coordinates: [77.6088, 12.9839],
    categorySlug: 'entertainment',
    tags: ['bowling', 'games', 'entertainment', 'near-u'],
    cashback: 12,
    rating: 4.0,
    ratingCount: 543,
    isFeatured: false,
    bannerKeyword: 'bowling-alley',
  },
  // ─── Electronics ───
  {
    name: 'Croma',
    slug: 'croma-malleshwaram',
    description: "India's largest electronics retailer. Phones, laptops, appliances & accessories.",
    neighbourhood: 'Malleshwaram',
    address: 'Sampige Road, Malleshwaram, Bengaluru',
    pincode: '560003',
    coordinates: [77.5713, 13.0033],
    categorySlug: 'electronics',
    tags: ['electronics', 'phones', 'laptops', 'near-u', 'malleshwaram'],
    cashback: 5,
    rating: 4.1,
    ratingCount: 1021,
    isFeatured: false,
    bannerKeyword: 'electronics-store',
  },
  {
    name: 'Reliance Digital',
    slug: 'reliance-digital-hsr-layout',
    description: 'Latest smartphones, TVs, and gadgets with EMI options and exchange offers.',
    neighbourhood: 'HSR Layout',
    address: '27th Main, Sector 1, HSR Layout, Bengaluru',
    pincode: '560102',
    coordinates: [77.6398, 12.9145],
    categorySlug: 'electronics',
    tags: ['electronics', 'mobile', 'appliances', 'near-u', 'hsr'],
    cashback: 7,
    rating: 4.0,
    ratingCount: 874,
    isFeatured: false,
    bannerKeyword: 'digital-electronics',
  },
  // ─── Grocery ───
  {
    name: 'BigBasket Pickup Store',
    slug: 'bigbasket-pickup-btm',
    description: 'Quick-pickup grocery store. Order online and collect in under 30 minutes.',
    neighbourhood: 'BTM Layout',
    address: '3rd Cross, BTM Layout 1st Stage, Bengaluru',
    pincode: '560076',
    coordinates: [77.6082, 12.9182],
    categorySlug: 'grocery',
    tags: ['grocery', 'online', 'pickup', 'near-u', 'btm'],
    cashback: 10,
    rating: 4.3,
    ratingCount: 654,
    isFeatured: false,
    bannerKeyword: 'grocery-store',
  },
  {
    name: 'More Supermarket',
    slug: 'more-supermarket-jp-nagar',
    description: "Aditya Birla group's supermarket chain. Fresh produce, packaged goods & household.",
    neighbourhood: 'JP Nagar',
    address: 'JP Nagar 3rd Phase, Bengaluru',
    pincode: '560078',
    coordinates: [77.5875, 12.9012],
    categorySlug: 'grocery',
    tags: ['grocery', 'supermarket', 'fresh', 'near-u', 'jp-nagar'],
    cashback: 8,
    rating: 4.0,
    ratingCount: 432,
    isFeatured: false,
    bannerKeyword: 'supermarket',
  },
  // ─── Fashion ───
  {
    name: 'H&M',
    slug: 'hm-forum-mall-koramangala',
    description: 'Global fashion giant. Trendy and affordable clothing for men, women & kids.',
    neighbourhood: 'Koramangala',
    address: 'Forum Mall, 21, Hosur Road, Koramangala, Bengaluru',
    pincode: '560029',
    coordinates: [77.613, 12.926],
    categorySlug: 'fashion',
    tags: ['fashion', 'clothing', 'international', 'near-u', 'koramangala'],
    cashback: 10,
    rating: 4.2,
    ratingCount: 1523,
    isFeatured: true,
    bannerKeyword: 'fashion-store',
  },
  {
    name: 'Zara',
    slug: 'zara-ub-city',
    description: "Inditex group's flagship fast-fashion brand. New collections every week.",
    neighbourhood: 'UB City',
    address: 'UB City Mall, Vittal Mallya Road, Bengaluru',
    pincode: '560001',
    coordinates: [77.5969, 12.972],
    categorySlug: 'fashion',
    tags: ['fashion', 'premium', 'clothing', 'near-u'],
    cashback: 8,
    rating: 4.4,
    ratingCount: 2103,
    isFeatured: true,
    bannerKeyword: 'zara-fashion',
  },
  // ─── Desserts ───
  {
    name: 'Theobroma',
    slug: 'theobroma-indiranagar',
    description: 'Mumbai-born patisserie loved for brownies, cakes and chilled cheesecakes.',
    neighbourhood: 'Indiranagar',
    address: '100 Feet Road, Indiranagar, Bengaluru',
    pincode: '560038',
    coordinates: [77.6416, 12.9793],
    categorySlug: 'desserts',
    tags: ['dessert', 'bakery', 'cake', 'near-u', 'indiranagar'],
    cashback: 12,
    rating: 4.6,
    ratingCount: 934,
    isFeatured: true,
    bannerKeyword: 'bakery-dessert',
  },
  {
    name: 'Amul Parlour',
    slug: 'amul-parlour-malleshwaram',
    description: "Amul's official ice cream & dairy parlour. Scoops, shakes and kulfis.",
    neighbourhood: 'Malleshwaram',
    address: '15th Cross, Sampige Road, Malleshwaram, Bengaluru',
    pincode: '560003',
    coordinates: [77.5721, 13.0025],
    categorySlug: 'desserts',
    tags: ['ice-cream', 'dairy', 'dessert', 'near-u', 'malleshwaram'],
    cashback: 6,
    rating: 4.1,
    ratingCount: 376,
    isFeatured: false,
    bannerKeyword: 'ice-cream-parlour',
  },
  // ─── Wellness ───
  {
    name: 'O2 Spa',
    slug: 'o2-spa-whitefield',
    description: "India's most trusted spa chain. Swedish massage, aromatherapy & body wraps.",
    neighbourhood: 'Whitefield',
    address: 'Phoenix Marketcity, Whitefield Main Road, Bengaluru',
    pincode: '560066',
    coordinates: [77.7465, 12.967],
    categorySlug: 'wellness',
    tags: ['spa', 'massage', 'wellness', 'near-u', 'whitefield'],
    cashback: 15,
    rating: 4.5,
    ratingCount: 589,
    isFeatured: true,
    bannerKeyword: 'spa-wellness',
  },
  {
    name: 'Kaya Skin Clinic',
    slug: 'kaya-skin-clinic-koramangala',
    description: 'Advanced dermatology & skin care. Laser treatments, facials & anti-ageing.',
    neighbourhood: 'Koramangala',
    address: '5th Block, Koramangala, Bengaluru',
    pincode: '560095',
    coordinates: [77.6255, 12.9372],
    categorySlug: 'wellness',
    tags: ['skin', 'dermatology', 'facial', 'near-u', 'koramangala'],
    cashback: 18,
    rating: 4.4,
    ratingCount: 723,
    isFeatured: false,
    bannerKeyword: 'skin-clinic',
  },
];

async function seedStores(): Promise<Record<string, mongoose.Types.ObjectId>> {
  logger.info('[SeedDemo] Seeding stores…');

  // OPTIMIZATION: Resolve all category IDs upfront in parallel before bulk operations
  // Before: 1 DB call per store (sequential) + category lookups
  // After: 1 bulk operation for stores (category lookups batched)
  const uniqueCategorySlugs = Array.from(new Set(STORE_DEFS.map(s => s.categorySlug)));
  const categoryIdMap: Record<string, mongoose.Types.ObjectId> = {};

  // Batch resolve category IDs
  await Promise.all(
    uniqueCategorySlugs.map(async (slug) => {
      categoryIdMap[slug] = await getOrCreateCategory(slug);
    })
  );

  // Build bulk operations
  const bulkOps = STORE_DEFS.map(s => {
    const imgBase = `https://images.unsplash.com/photo-1${(Math.abs(s.slug.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % 9_000_000) + 500_000_000}?w=800&auto=format&fit=crop`;
    const logoBase = `https://images.unsplash.com/photo-1${(Math.abs(s.slug.split('').reduce((a, c) => a + c.charCodeAt(0), 1)) % 9_000_000) + 500_000_000}?w=200&auto=format&fit=crop`;

    const distribution5 = Math.round(s.ratingCount * 0.5);
    const distribution4 = Math.round(s.ratingCount * 0.25);
    const distribution3 = Math.round(s.ratingCount * 0.12);
    const distribution2 = Math.round(s.ratingCount * 0.08);
    const distribution1 = s.ratingCount - distribution5 - distribution4 - distribution3 - distribution2;

    return {
      updateOne: {
        filter: { slug: s.slug },
        update: {
          $setOnInsert: {
            name: s.name,
            slug: s.slug,
            description: s.description,
            logo: logoBase,
            image: imgBase,
            banner: [
              `https://images.unsplash.com/search/photos/${encodeURIComponent(s.bannerKeyword)}?w=1200&auto=format&fit=crop`,
            ],
            category: categoryIdMap[s.categorySlug],
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
              phone: '+918022334455',
              email: `hello@${s.slug}.rez.app`,
            },
            ratings: {
              average: s.rating,
              count: s.ratingCount,
              distribution: {
                5: distribution5,
                4: distribution4,
                3: distribution3,
                2: distribution2,
                1: distribution1,
              },
            },
            offers: {
              cashback: s.cashback,
              minOrderAmount: 100,
              maxCashback: s.cashback * 20,
              isPartner: true,
              partnerLevel: s.cashback >= 15 ? 'gold' : s.cashback >= 10 ? 'silver' : 'bronze',
            },
            operationalInfo: {
              hours: defaultHours,
              deliveryTime: '30-45 mins',
              minimumOrder: 150,
              deliveryFee: 30,
              freeDeliveryAbove: 500,
              acceptsWalletPayment: true,
              paymentMethods: ['upi', 'card', 'wallet', 'cash'],
            },
            deliveryCategories: {
              fastDelivery: true,
              budgetFriendly: false,
              ninetyNineStore: false,
              premium: s.isFeatured,
              organic: false,
              alliance: false,
              lowestPrice: false,
              mall: false,
              cashStore: false,
            },
            analytics: {
              totalOrders: Math.round(s.ratingCount * 2.5),
              totalRevenue: Math.round(s.ratingCount * 2.5 * 450),
              avgOrderValue: 450,
              repeatCustomers: Math.round(s.ratingCount * 0.6),
              followersCount: Math.round(s.ratingCount * 1.8),
            },
            tags: s.tags,
            isActive: true,
            isFeatured: s.isFeatured,
            isVerified: true,
          },
        },
        upsert: true,
      },
    };
  });

  // Use type assertion to bypass strict Mongoose typings for bulkWrite operations
  await (Store as any).bulkWrite(bulkOps as any[], { ordered: false });

  // Build storeIdMap for downstream functions by querying the stores we just created
  const storeIdMap: Record<string, mongoose.Types.ObjectId> = {};
  const storedStores = await Store.find({ slug: { $in: STORE_DEFS.map(s => s.slug) } }).lean();
  for (const store of storedStores) {
    storeIdMap[store.slug as string] = store._id as mongoose.Types.ObjectId;
  }

  logger.info(`[SeedDemo] ${STORE_DEFS.length} stores ensured (bulkWrite)`);
  return storeIdMap;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. OFFERS — 30+ across all categories
// ─────────────────────────────────────────────────────────────────────────────

interface OfferDef {
  title: string;
  subtitle: string;
  description: string;
  category: IOffer_Category;
  type: IOffer_Type;
  cashbackPercentage: number;
  storeSlug: string;
  storeName: string;
  coordinates: [number, number];
  imageUrl: string;
  tags: string[];
  minOrderValue?: number;
  bogoType?: string;
  isFreeDelivery?: boolean;
}

// Re-declare narrow types matching the Offer schema enums
type IOffer_Category =
  | 'mega'
  | 'student'
  | 'new_arrival'
  | 'trending'
  | 'food'
  | 'fashion'
  | 'electronics'
  | 'general'
  | 'entertainment'
  | 'beauty'
  | 'wellness';
type IOffer_Type = 'cashback' | 'discount' | 'voucher' | 'combo' | 'special' | 'walk_in';

const OFFER_DEFS: OfferDef[] = [
  // FOOD
  {
    title: '15% Cashback at Chai Point',
    subtitle: 'Your daily chai just got cheaper',
    description: 'Earn 15% cashback on all orders at Chai Point. Min order ₹100. Valid at all Bangalore outlets.',
    category: 'food',
    type: 'cashback',
    cashbackPercentage: 15,
    storeSlug: 'third-wave-coffee-indiranagar',
    storeName: 'Chai Point',
    coordinates: [77.619, 12.963],
    imageUrl: 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=800&auto=format',
    tags: ['chai', 'beverages', 'cashback', 'near-u'],
    minOrderValue: 100,
  },
  {
    title: 'Flat ₹100 Off on Orders ₹500+ at Meghana Foods',
    subtitle: 'South Indian feast for less',
    description: 'Get ₹100 flat off when you spend ₹500 or more at Meghana Foods. Valid on dine-in and takeaway.',
    category: 'food',
    type: 'discount',
    cashbackPercentage: 20,
    storeSlug: 'third-wave-coffee-indiranagar',
    storeName: 'Meghana Foods',
    coordinates: [77.6054, 12.9716],
    imageUrl: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800&auto=format',
    tags: ['biryani', 'south-indian', 'discount', 'near-u'],
    minOrderValue: 500,
  },
  {
    title: 'Buy 2 Get 1 Free at Dominos',
    subtitle: 'Pizza party, sorted!',
    description: 'Buy any 2 medium or large pizzas and get 1 medium pizza absolutely free. Valid Sun–Thu.',
    category: 'food',
    type: 'combo',
    cashbackPercentage: 33,
    storeSlug: 'third-wave-coffee-indiranagar',
    storeName: "Domino's Pizza",
    coordinates: [77.612, 12.952],
    imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&auto=format',
    tags: ['pizza', 'bogo', 'combo', 'near-u'],
    minOrderValue: 400,
  },
  {
    title: '20% Off on Entire Menu at Social',
    subtitle: 'Happy hours all week',
    description: 'Flat 20% off on food and beverages at Social, Koramangala. Show REZ app to redeem.',
    category: 'food',
    type: 'discount',
    cashbackPercentage: 20,
    storeSlug: 'blue-tokai-koramangala',
    storeName: 'Social',
    coordinates: [77.6263, 12.9345],
    imageUrl: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&auto=format',
    tags: ['cafe', 'bar', 'discount', 'near-u'],
    minOrderValue: 300,
  },
  {
    title: 'Free Delivery on Orders ₹300+ at Swiggy Partners',
    subtitle: 'No delivery charges tonight',
    description: 'Get free delivery on all REZ partner restaurant orders above ₹300 on Swiggy.',
    category: 'food',
    type: 'special',
    cashbackPercentage: 0,
    storeSlug: 'blue-tokai-koramangala',
    storeName: 'Swiggy Partners',
    coordinates: [77.62, 12.94],
    imageUrl: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800&auto=format',
    tags: ['delivery', 'free-delivery', 'food', 'near-u'],
    minOrderValue: 300,
    isFreeDelivery: true,
  },
  {
    title: '10% Cashback at Truffles',
    subtitle: 'Great burgers, great savings',
    description: 'Earn 10% cashback on your total bill at Truffles. Min order ₹300. Valid on dine-in.',
    category: 'food',
    type: 'cashback',
    cashbackPercentage: 10,
    storeSlug: 'blue-tokai-koramangala',
    storeName: 'Truffles',
    coordinates: [77.624, 12.936],
    imageUrl: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=800&auto=format',
    tags: ['burger', 'american', 'cashback', 'near-u'],
    minOrderValue: 300,
  },
  // SALON / BEAUTY
  {
    title: 'Free Haircut Trial at Naturals',
    subtitle: 'First visit on us',
    description: 'Walk in for a free haircut on your first visit at Naturals Salon. No booking required.',
    category: 'beauty',
    type: 'special',
    cashbackPercentage: 100,
    storeSlug: 'naturals-salon-jayanagar',
    storeName: 'Naturals Salon',
    coordinates: [77.5933, 12.9249],
    imageUrl: 'https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=800&auto=format',
    tags: ['haircut', 'free-trial', 'salon', 'near-u'],
  },
  {
    title: '20% Off on Facial at Lakme',
    subtitle: 'Glow up, spend less',
    description: 'Enjoy 20% off on all facial treatments at Lakme Salon. Valid Mon–Fri, 10am–6pm.',
    category: 'beauty',
    type: 'discount',
    cashbackPercentage: 20,
    storeSlug: 'lakme-salon-btm-layout',
    storeName: 'Lakme Salon',
    coordinates: [77.6101, 12.9165],
    imageUrl: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&auto=format',
    tags: ['facial', 'salon', 'discount', 'near-u'],
    minOrderValue: 500,
  },
  {
    title: '₹199 Beard Trim at Urban Company',
    subtitle: 'Doorstep grooming, pocket-friendly',
    description: 'Book a professional beard trim service at your doorstep for just ₹199. REZ exclusive.',
    category: 'beauty',
    type: 'special',
    cashbackPercentage: 50,
    storeSlug: 'toni-and-guy-hsr-layout',
    storeName: 'Urban Company',
    coordinates: [77.6376, 12.9116],
    imageUrl: 'https://images.unsplash.com/photo-1621607512022-6aecc4fed814?w=800&auto=format',
    tags: ['grooming', 'beard', 'home-service', 'near-u'],
  },
  {
    title: 'Flat 30% Off at Toni & Guy',
    subtitle: 'Premium styling, great deal',
    description: 'Get 30% off on all styling and colouring services at Toni & Guy. Book via REZ app.',
    category: 'beauty',
    type: 'discount',
    cashbackPercentage: 30,
    storeSlug: 'toni-and-guy-hsr-layout',
    storeName: 'Toni & Guy',
    coordinates: [77.6376, 12.9116],
    imageUrl: 'https://images.unsplash.com/photo-1582095133179-bfd08e2fb6b8?w=800&auto=format',
    tags: ['salon', 'discount', 'styling', 'near-u'],
    minOrderValue: 800,
  },
  // FITNESS
  {
    title: 'Free Trial Class at Cult.fit',
    subtitle: 'Try before you commit',
    description: 'Attend one free group fitness class at any Cult.fit centre. Valid for new users.',
    category: 'wellness',
    type: 'special',
    cashbackPercentage: 100,
    storeSlug: 'cult-fit-koramangala',
    storeName: 'Cult.fit',
    coordinates: [77.6272, 12.929],
    imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&auto=format',
    tags: ['gym', 'fitness', 'free-trial', 'near-u'],
  },
  {
    title: "₹999/Month Membership at Gold's Gym",
    subtitle: 'Limited-time introductory offer',
    description: "Lock in ₹999/month membership at Gold's Gym Indiranagar. Includes all equipment access.",
    category: 'wellness',
    type: 'special',
    cashbackPercentage: 30,
    storeSlug: 'golds-gym-indiranagar',
    storeName: "Gold's Gym",
    coordinates: [77.6449, 12.9735],
    imageUrl: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&auto=format',
    tags: ['gym', 'membership', 'fitness', 'near-u'],
    minOrderValue: 999,
  },
  {
    title: '3 Days Free Yoga at Art of Living',
    subtitle: 'Find your centre',
    description: 'Attend 3 consecutive yoga sessions at Art of Living, Bengaluru for free. Beginners welcome.',
    category: 'wellness',
    type: 'special',
    cashbackPercentage: 100,
    storeSlug: 'anytime-fitness-jp-nagar',
    storeName: 'Art of Living',
    coordinates: [77.5905, 12.8953],
    imageUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&auto=format',
    tags: ['yoga', 'wellness', 'free-trial', 'near-u'],
  },
  // ENTERTAINMENT
  {
    title: 'Buy 2 Get 1 Movie Tickets at PVR',
    subtitle: 'Movie nights got better',
    description: 'Buy 2 movie tickets on PVR app and get 1 free. Use code REZ1 at checkout.',
    category: 'entertainment',
    type: 'combo',
    cashbackPercentage: 33,
    storeSlug: 'pvr-cinemas-forum-mall',
    storeName: 'PVR Cinemas',
    coordinates: [77.614, 12.9263],
    imageUrl: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=800&auto=format',
    tags: ['movies', 'entertainment', 'bogo', 'near-u'],
    minOrderValue: 400,
  },
  {
    title: '₹99/hr Gaming at Smaaash',
    subtitle: 'Game on for less',
    description: 'Play any game for just ₹99/hr at Smaaash Entertainment. Valid on weekdays.',
    category: 'entertainment',
    type: 'special',
    cashbackPercentage: 50,
    storeSlug: 'smaaash-entertainment-whitefield',
    storeName: 'Smaaash Entertainment',
    coordinates: [77.7481, 12.968],
    imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format',
    tags: ['gaming', 'entertainment', 'deal', 'near-u'],
  },
  {
    title: '30% Off Bowling at Amoeba',
    subtitle: 'Strike a deal!',
    description: 'Get 30% off on bowling lanes at Amoeba. Min 2 games. Valid on weekdays.',
    category: 'entertainment',
    type: 'discount',
    cashbackPercentage: 30,
    storeSlug: 'amoeba-bowling-commercial-street',
    storeName: 'Amoeba Bowling',
    coordinates: [77.6088, 12.9839],
    imageUrl: 'https://images.unsplash.com/photo-1553461923-f695b99d918c?w=800&auto=format',
    tags: ['bowling', 'entertainment', 'discount', 'near-u'],
    minOrderValue: 300,
  },
  // GROCERY
  {
    title: '10% Cashback on Groceries at BigBasket',
    subtitle: 'Everyday savings on essentials',
    description: 'Get 10% cashback on your grocery order at BigBasket partner pickup stores. Max ₹100.',
    category: 'general',
    type: 'cashback',
    cashbackPercentage: 10,
    storeSlug: 'bigbasket-pickup-btm',
    storeName: 'BigBasket Pickup',
    coordinates: [77.6082, 12.9182],
    imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&auto=format',
    tags: ['grocery', 'cashback', 'near-u'],
    minOrderValue: 300,
  },
  {
    title: 'Free Delivery on Orders ₹300+ at More',
    subtitle: 'Shop more, save more',
    description: 'Order from More Supermarket and get free home delivery above ₹300. Limited time.',
    category: 'general',
    type: 'special',
    cashbackPercentage: 0,
    storeSlug: 'more-supermarket-jp-nagar',
    storeName: 'More Supermarket',
    coordinates: [77.5875, 12.9012],
    imageUrl: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800&auto=format',
    tags: ['grocery', 'free-delivery', 'near-u'],
    minOrderValue: 300,
    isFreeDelivery: true,
  },
  // ELECTRONICS
  {
    title: '₹500 Off on Mobile Accessories at Croma',
    subtitle: 'Deck out your device',
    description: 'Get ₹500 off on mobile accessories above ₹2,000 at Croma. Covers cases, earphones & more.',
    category: 'electronics',
    type: 'discount',
    cashbackPercentage: 25,
    storeSlug: 'croma-malleshwaram',
    storeName: 'Croma',
    coordinates: [77.5713, 13.0033],
    imageUrl: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=800&auto=format',
    tags: ['electronics', 'accessories', 'discount', 'near-u'],
    minOrderValue: 2000,
  },
  {
    title: 'Exchange Bonus ₹1,000 at Reliance Digital',
    subtitle: 'Upgrade your phone, save big',
    description: 'Extra ₹1,000 exchange bonus on old smartphones when upgrading. Valid on select brands.',
    category: 'electronics',
    type: 'special',
    cashbackPercentage: 10,
    storeSlug: 'reliance-digital-hsr-layout',
    storeName: 'Reliance Digital',
    coordinates: [77.6398, 12.9145],
    imageUrl: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&auto=format',
    tags: ['electronics', 'exchange', 'mobile', 'near-u'],
    minOrderValue: 5000,
  },
  // FASHION
  {
    title: 'Flat 30% Off at H&M',
    subtitle: 'Season-end clearance',
    description: 'Flat 30% off on all items at H&M Forum Mall. Select styles only. While stocks last.',
    category: 'fashion',
    type: 'discount',
    cashbackPercentage: 30,
    storeSlug: 'hm-forum-mall-koramangala',
    storeName: 'H&M',
    coordinates: [77.613, 12.926],
    imageUrl: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=800&auto=format',
    tags: ['fashion', 'clothing', 'discount', 'near-u'],
  },
  {
    title: 'Buy 3 Get 1 Free at Max Fashion',
    subtitle: 'More outfits, same budget',
    description: 'Buy any 3 items at Max Fashion and get the 4th absolutely free. Min purchase ₹1,500.',
    category: 'fashion',
    type: 'combo',
    cashbackPercentage: 25,
    storeSlug: 'hm-forum-mall-koramangala',
    storeName: 'Max Fashion',
    coordinates: [77.6125, 12.9255],
    imageUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&auto=format',
    tags: ['fashion', 'bogo', 'clothing', 'near-u'],
    minOrderValue: 1500,
  },
  {
    title: 'Up to 50% Off at Zara Sale',
    subtitle: 'Premium fashion, half the price',
    description: 'End-of-season sale at Zara UB City. Up to 50% off on selected styles.',
    category: 'fashion',
    type: 'discount',
    cashbackPercentage: 50,
    storeSlug: 'zara-ub-city',
    storeName: 'Zara',
    coordinates: [77.5969, 12.972],
    imageUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&auto=format',
    tags: ['fashion', 'sale', 'premium', 'near-u'],
  },
  // DESSERTS
  {
    title: 'Free Brownie with Any Order at Theobroma',
    subtitle: 'Sweet surprise waiting',
    description: 'Get a free signature brownie with any purchase above ₹250 at Theobroma.',
    category: 'food',
    type: 'combo',
    cashbackPercentage: 15,
    storeSlug: 'theobroma-indiranagar',
    storeName: 'Theobroma',
    coordinates: [77.6416, 12.9793],
    imageUrl: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800&auto=format',
    tags: ['dessert', 'bakery', 'freebie', 'near-u'],
    minOrderValue: 250,
  },
  // WELLNESS / SPA
  {
    title: '25% Off Spa Treatments at O2 Spa',
    subtitle: 'Relax and save',
    description: '25% off on Swedish massage and body treatments at O2 Spa. Valid weekdays, 10am–6pm.',
    category: 'wellness',
    type: 'discount',
    cashbackPercentage: 25,
    storeSlug: 'o2-spa-whitefield',
    storeName: 'O2 Spa',
    coordinates: [77.7465, 12.967],
    imageUrl: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&auto=format',
    tags: ['spa', 'wellness', 'massage', 'near-u'],
    minOrderValue: 800,
  },
  {
    title: 'First Facial Free at Kaya Skin Clinic',
    subtitle: 'Your skin deserves the best',
    description: 'New customers get their first basic facial absolutely free at Kaya Skin Clinic.',
    category: 'wellness',
    type: 'special',
    cashbackPercentage: 100,
    storeSlug: 'kaya-skin-clinic-koramangala',
    storeName: 'Kaya Skin Clinic',
    coordinates: [77.6255, 12.9372],
    imageUrl: 'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?w=800&auto=format',
    tags: ['skin', 'facial', 'free-trial', 'near-u'],
  },
  // MEGA
  {
    title: '50% Cashback Mega Weekend',
    subtitle: 'The biggest cashback event of the year',
    description: 'Get up to 50% cashback across all REZ partner stores this weekend. Max cashback ₹500.',
    category: 'mega',
    type: 'cashback',
    cashbackPercentage: 50,
    storeSlug: 'cult-fit-koramangala',
    storeName: 'All REZ Partners',
    coordinates: [77.62, 12.95],
    imageUrl: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&auto=format',
    tags: ['mega', 'cashback', 'weekend', 'near-u'],
    minOrderValue: 200,
  },
  // TRENDING
  {
    title: 'Double Coins on All Dine-In',
    subtitle: 'Trending this week',
    description: 'Earn 2x REZ coins on every dine-in visit this week at all partner restaurants.',
    category: 'trending',
    type: 'special',
    cashbackPercentage: 0,
    storeSlug: 'blue-tokai-koramangala',
    storeName: 'All Partner Restaurants',
    coordinates: [77.615, 12.935],
    imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format',
    tags: ['coins', 'trending', 'dine-in', 'near-u'],
  },
  // STUDENT
  {
    title: '15% Off for Students at Cult.fit',
    subtitle: 'Valid with college ID',
    description: 'Students get 15% off on all Cult.fit memberships. Show college ID at centre.',
    category: 'student',
    type: 'discount',
    cashbackPercentage: 15,
    storeSlug: 'cult-fit-koramangala',
    storeName: 'Cult.fit',
    coordinates: [77.6272, 12.929],
    imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&auto=format',
    tags: ['student', 'fitness', 'discount', 'near-u'],
  },
  // NEW ARRIVAL
  {
    title: 'New on REZ: Lenskart — 15% Off First Order',
    subtitle: 'Just partnered!',
    description: 'Lenskart just joined REZ! Get 15% off your first eyewear order. Code: REZNEW.',
    category: 'new_arrival',
    type: 'discount',
    cashbackPercentage: 15,
    storeSlug: 'reliance-digital-hsr-layout',
    storeName: 'Lenskart',
    coordinates: [77.6398, 12.9145],
    imageUrl: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800&auto=format',
    tags: ['new', 'eyewear', 'discount', 'near-u'],
  },
];

async function seedOffers(
  storeIdMap: Record<string, mongoose.Types.ObjectId>,
  systemUserId: mongoose.Types.ObjectId,
): Promise<void> {
  logger.info('[SeedDemo] Seeding offers…');

  // OPTIMIZATION: Use bulkWrite instead of sequential findOneAndUpdate
  // Before: 38 sequential DB calls (one per offer)
  // After: 1 bulk operation
  const now = new Date();
  const validEnd = daysFromNow(30);

  const bulkOps = OFFER_DEFS.map(o => {
    const storeId = storeIdMap[o.storeSlug] ?? Object.values(storeIdMap)[0] ?? new mongoose.Types.ObjectId();
    const titleKey = toSlug(o.title).slice(0, 80);

    return {
      updateOne: {
        filter: { title: o.title },
        update: {
          $setOnInsert: {
            title: o.title,
            subtitle: o.subtitle,
            description: o.description,
            image: o.imageUrl,
            category: o.category,
            type: o.type,
            cashbackPercentage: o.cashbackPercentage,
            location: {
              type: 'Point',
              coordinates: o.coordinates,
            },
            store: {
              id: storeId,
              name: o.storeName,
              logo: `https://images.unsplash.com/photo-seed-${titleKey}?w=200&auto=format`,
              rating: 4.3,
              verified: true,
            },
            validity: {
              startDate: now,
              endDate: validEnd,
              isActive: true,
            },
            engagement: {
              likesCount: Math.floor(Math.random() * 400) + 50,
              sharesCount: Math.floor(Math.random() * 150) + 10,
              viewsCount: Math.floor(Math.random() * 2000) + 200,
            },
            restrictions: {
              minOrderValue: o.minOrderValue ?? 0,
              userTypeRestriction: 'all',
              usageLimitPerUser: 3,
              usageLimit: 5000,
            },
            eligibility: {
              rezPlusTiers: ['free', 'premium', 'vip'],
              priveTiers: ['none', 'entry', 'signature', 'elite'],
              requiredZones: [],
              requireAll: false,
            },
            metadata: {
              isNew: o.category === 'new_arrival',
              isTrending: o.category === 'trending',
              isBestSeller: o.cashbackPercentage >= 30,
              isSpecial: o.type === 'special',
              priority: o.category === 'mega' ? 10 : o.category === 'trending' ? 8 : 5,
              tags: o.tags,
              featured: ['mega', 'trending'].includes(o.category),
            },
            isFollowerExclusive: false,
            visibleTo: 'all',
            isFreeDelivery: o.isFreeDelivery ?? false,
            redemptionCount: Math.floor(Math.random() * 800) + 20,
            createdBy: systemUserId,
            adminApproved: true,
          },
        },
        upsert: true,
      },
    };
  });

  await (Offer as any).bulkWrite(bulkOps as any[], { ordered: false });
  logger.info(`[SeedDemo] ${OFFER_DEFS.length} offers ensured (bulkWrite)`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. FLASH SALES — 5 active time-limited deals
// ─────────────────────────────────────────────────────────────────────────────

const FLASH_SALE_DEFS = [
  {
    title: 'Starbucks 40% Cashback — Today Only',
    description: 'Massive 40% cashback on your Starbucks order. This deal expires in 4 hours. Go now!',
    image: 'https://images.unsplash.com/photo-1507133750040-4a8f57021571?w=800&auto=format',
    discountPercentage: 40,
    endHours: 4,
    maxQuantity: 500,
    priority: 10,
  },
  {
    title: 'Flat ₹200 Off on Salon Services',
    description: 'Book any salon service today and get ₹200 flat off. Offer ends tonight at midnight.',
    image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&auto=format',
    discountPercentage: 25,
    endHours: 12,
    maxQuantity: 200,
    priority: 9,
  },
  {
    title: 'Double Coins on All Food Orders',
    description: 'Earn 2x REZ coins on every food order placed in the next 2 hours. Limited window!',
    image: 'https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=800&auto=format',
    discountPercentage: 0,
    endHours: 2,
    maxQuantity: 1000,
    priority: 8,
  },
  {
    title: '₹1 Deals at Select Stores',
    description: "Flash deals at just ₹1 at select stores tonight. Grab them before they're gone at midnight!",
    image: 'https://images.unsplash.com/photo-1607082349566-187342175e2f?w=800&auto=format',
    discountPercentage: 99,
    endHours: 8,
    maxQuantity: 100,
    priority: 10,
  },
  {
    title: 'Free Dessert with Any Meal',
    description: 'Order any meal at partner restaurants and get a free dessert. Next 6 hours only!',
    image: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=800&auto=format',
    discountPercentage: 15,
    endHours: 6,
    maxQuantity: 300,
    priority: 7,
  },
];

async function seedFlashSales(systemUserId: mongoose.Types.ObjectId): Promise<void> {
  logger.info('[SeedDemo] Seeding flash sales…');

  // OPTIMIZATION: Use bulkWrite instead of sequential findOneAndUpdate
  // Before: 5 sequential DB calls (one per flash sale)
  // After: 1 bulk operation
  const now = new Date();

  const bulkOps = FLASH_SALE_DEFS.map(fs => ({
    updateOne: {
      filter: { title: fs.title },
      update: {
        $setOnInsert: {
          title: fs.title,
          description: fs.description,
          image: fs.image,
          banner: fs.image,
          discountPercentage: fs.discountPercentage,
          priority: fs.priority,
          startTime: now,
          endTime: hoursFromNow(fs.endHours),
          maxQuantity: fs.maxQuantity,
          soldQuantity: Math.floor(fs.maxQuantity * 0.35),
          limitPerUser: 2,
          lowStockThreshold: 20,
          products: [],
          enabled: true,
          status: 'active',
          termsAndConditions: [
            'Valid only through REZ app',
            'Cannot be combined with other offers',
            'REZ reserves the right to modify or cancel this offer',
          ],
          minimumPurchase: 150,
          viewCount: Math.floor(Math.random() * 5000) + 500,
          clickCount: Math.floor(Math.random() * 2000) + 200,
          purchaseCount: Math.floor(fs.maxQuantity * 0.35),
          uniqueCustomers: Math.floor(fs.maxQuantity * 0.3),
          notifyOnStart: true,
          notifyOnEndingSoon: true,
          notifyOnLowStock: true,
          notifiedUsers: [],
          createdBy: systemUserId,
        },
      },
      upsert: true,
    },
  }));

  await (FlashSale as any).bulkWrite(bulkOps as any[], { ordered: false });
  logger.info(`[SeedDemo] ${FLASH_SALE_DEFS.length} flash sales ensured (bulkWrite)`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. BONUS CAMPAIGNS — 5 active Bonus Zone campaigns
// ─────────────────────────────────────────────────────────────────────────────

const BONUS_CAMPAIGN_DEFS = [
  {
    slug: 'demo-2x-food-courts-weekend',
    title: '2x Coins at Food Courts This Weekend',
    subtitle: 'Double your earnings every bite',
    description: 'Earn 2x REZ coins at all food court partner stores this Saturday and Sunday.',
    campaignType: 'category_multiplier' as const,
    rewardType: 'multiplier' as const,
    rewardValue: 2,
    icon: '🍔',
    backgroundColor: '#FF6B35',
    badgeText: '2X',
    priority: 10,
    endHours: 72,
  },
  {
    slug: 'demo-5day-streak-bonus',
    title: '5-Day Streak Bonus: ₹50 Extra',
    subtitle: 'Keep visiting, keep winning',
    description: 'Visit any REZ partner store 5 days in a row and earn ₹50 bonus cashback.',
    campaignType: 'first_transaction_bonus' as const,
    rewardType: 'flat' as const,
    rewardValue: 50,
    icon: '🔥',
    backgroundColor: '#E63946',
    badgeText: '₹50',
    priority: 9,
    endHours: 120,
  },
  {
    slug: 'demo-refer-friend-both-100',
    title: 'Refer a Friend: Both Get ₹100',
    subtitle: 'Share the savings, share the love',
    description: 'Refer a friend to REZ. When they make their first purchase, you both get ₹100 cashback!',
    campaignType: 'first_transaction_bonus' as const,
    rewardType: 'flat' as const,
    rewardValue: 100,
    icon: '👥',
    backgroundColor: '#4361EE',
    badgeText: '₹100',
    priority: 8,
    endHours: 720,
  },
  {
    slug: 'demo-lenskart-new-partner',
    title: 'New on REZ: Lenskart — 15% Off',
    subtitle: 'Just partnered — be among the first!',
    description: 'Lenskart just joined REZ! Get 15% cashback on your first Lenskart order.',
    campaignType: 'first_transaction_bonus' as const,
    rewardType: 'percentage' as const,
    rewardValue: 15,
    icon: '👓',
    backgroundColor: '#2EC4B6',
    badgeText: 'NEW',
    priority: 9,
    endHours: 168,
  },
  {
    slug: 'demo-weekend-3x-salon',
    title: 'Weekend Special: 3x Coins on Salon',
    subtitle: 'Pamper yourself, earn big',
    description: 'Earn triple REZ coins on all salon and beauty bookings this weekend.',
    campaignType: 'category_multiplier' as const,
    rewardType: 'multiplier' as const,
    rewardValue: 3,
    icon: '💅',
    backgroundColor: '#7B2D8B',
    badgeText: '3X',
    priority: 8,
    endHours: 72,
  },
];

async function seedBonusCampaigns(systemUserId: mongoose.Types.ObjectId): Promise<void> {
  logger.info('[SeedDemo] Seeding bonus campaigns…');

  // OPTIMIZATION: Use bulkWrite instead of sequential findOneAndUpdate
  // Before: 5 sequential DB calls (one per campaign)
  // After: 1 bulk operation
  const now = new Date();

  const bulkOps = BONUS_CAMPAIGN_DEFS.map(bc => ({
    updateOne: {
      filter: { slug: bc.slug },
      update: {
        $setOnInsert: {
          slug: bc.slug,
          title: bc.title,
          subtitle: bc.subtitle,
          description: bc.description,
          campaignType: bc.campaignType,
          fundingSource: { type: 'platform' },
          eligibility: {
            minSpend: 100,
            userSegments: ['all'],
            regions: ['bangalore'],
          },
          reward: {
            type: bc.rewardType,
            value: bc.rewardValue,
            capPerUser: bc.rewardType === 'flat' ? bc.rewardValue * 3 : 500,
            capPerTransaction: bc.rewardType === 'flat' ? bc.rewardValue : 200,
            totalBudget: 50000,
            consumedBudget: Math.floor(50000 * 0.15),
            coinType: 'rez',
          },
          limits: {
            maxClaimsPerUser: 5,
            maxClaimsPerUserPerDay: 2,
            totalGlobalClaims: 10000,
            currentGlobalClaims: Math.floor(Math.random() * 1500) + 200,
          },
          startTime: now,
          endTime: hoursFromNow(bc.endHours),
          display: {
            icon: bc.icon,
            backgroundColor: bc.backgroundColor,
            badgeText: bc.badgeText,
            featured: bc.priority >= 9,
            priority: bc.priority,
          },
          deepLink: {
            screen: 'BonusZone',
            params: { campaignSlug: bc.slug },
          },
          status: 'active',
          terms: [
            'Valid for REZ app users only',
            'Cannot be combined with other bonus campaigns',
            'REZ reserves the right to change terms at any time',
          ],
          createdBy: systemUserId,
        },
      },
      upsert: true,
    },
  }));

  await (BonusCampaign as any).bulkWrite(bulkOps as any[], { ordered: false });
  logger.info(`[SeedDemo] ${BONUS_CAMPAIGN_DEFS.length} bonus campaigns ensured (bulkWrite)`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. LOCK PRICE DEALS — 10 prepaid buy-now-use-later deals
// ─────────────────────────────────────────────────────────────────────────────

interface LockDealDef {
  title: string;
  description: string;
  image: string;
  storeName: string;
  storeSlug: string;
  originalPrice: number;
  lockedPrice: number;
  depositPercent: number;
}

const LOCK_DEAL_DEFS: LockDealDef[] = [
  {
    title: '₹49 Cafe Pack — worth ₹70',
    description:
      'Lock in a café combo (1 coffee + 1 snack) at any partner café for just ₹49. Pick up anytime in 7 days.',
    image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&auto=format',
    storeName: 'Third Wave Coffee',
    storeSlug: 'third-wave-coffee-indiranagar',
    originalPrice: 70,
    lockedPrice: 49,
    depositPercent: 20,
  },
  {
    title: '₹79 Food Combo — worth ₹120',
    description: 'A full meal combo (main + side + drink) locked at just ₹79. Redeem at partner restaurants.',
    image: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&auto=format',
    storeName: 'Meghana Foods',
    storeSlug: 'third-wave-coffee-indiranagar',
    originalPrice: 120,
    lockedPrice: 79,
    depositPercent: 20,
  },
  {
    title: '₹99 Grooming Pack — worth ₹160',
    description: 'Haircut + beard trim locked at ₹99. Visit any Naturals or partner salon within 7 days.',
    image: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800&auto=format',
    storeName: 'Naturals Salon',
    storeSlug: 'naturals-salon-jayanagar',
    originalPrice: 160,
    lockedPrice: 99,
    depositPercent: 25,
  },
  {
    title: '₹199 Dining Credit — worth ₹300',
    description: 'Lock ₹300 dining credit at partner restaurants for just ₹199. 33% savings guaranteed.',
    image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&auto=format',
    storeName: 'Social',
    storeSlug: 'blue-tokai-koramangala',
    originalPrice: 300,
    lockedPrice: 199,
    depositPercent: 20,
  },
  {
    title: '₹499 Salon Package — worth ₹750',
    description: 'Full salon package (hair + skin + nails) locked at ₹499. Valid at all premium salons.',
    image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&auto=format',
    storeName: 'Toni & Guy',
    storeSlug: 'toni-and-guy-hsr-layout',
    originalPrice: 750,
    lockedPrice: 499,
    depositPercent: 20,
  },
  {
    title: '₹999 Wellness Membership — worth ₹1,400',
    description: 'Month-long gym + yoga access locked at ₹999. Activate within 7 days of purchase.',
    image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&auto=format',
    storeName: 'Cult.fit',
    storeSlug: 'cult-fit-koramangala',
    originalPrice: 1400,
    lockedPrice: 999,
    depositPercent: 15,
  },
  {
    title: '₹1,500 Dining Credit — worth ₹2,100',
    description: 'High-value dining credit at top Bangalore restaurants. Lock now, use whenever.',
    image: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800&auto=format',
    storeName: 'Toit Brewpub',
    storeSlug: 'pvr-cinemas-forum-mall',
    originalPrice: 2100,
    lockedPrice: 1500,
    depositPercent: 20,
  },
  {
    title: '₹1,999 Premium Wellness — worth ₹3,000',
    description: "Spa + gym + yoga premium bundle for the month. Lock at ₹1,999 — that's 33% off.",
    image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&auto=format',
    storeName: 'O2 Spa',
    storeSlug: 'o2-spa-whitefield',
    originalPrice: 3000,
    lockedPrice: 1999,
    depositPercent: 15,
  },
  {
    title: '₹149 Movie + Snacks — worth ₹220',
    description: 'Lock a movie ticket + popcorn combo at PVR for just ₹149. Book your preferred show later.',
    image: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=800&auto=format',
    storeName: 'PVR Cinemas',
    storeSlug: 'pvr-cinemas-forum-mall',
    originalPrice: 220,
    lockedPrice: 149,
    depositPercent: 30,
  },
  {
    title: '₹299 Fashion Voucher — worth ₹450',
    description: 'Lock ₹450 worth of clothing vouchers at H&M / Zara for just ₹299. Redeem within 14 days.',
    image: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=800&auto=format',
    storeName: 'H&M',
    storeSlug: 'hm-forum-mall-koramangala',
    originalPrice: 450,
    lockedPrice: 299,
    depositPercent: 20,
  },
];

async function seedLockPriceDeals(
  storeIdMap: Record<string, mongoose.Types.ObjectId>,
  systemMerchantId: mongoose.Types.ObjectId,
): Promise<void> {
  logger.info('[SeedDemo] Seeding lock price deals…');

  // OPTIMIZATION: Use bulkWrite instead of sequential findOneAndUpdate
  // Before: 10 sequential DB calls (one per lock deal)
  // After: 1 bulk operation
  const bulkOps = LOCK_DEAL_DEFS.map(ld => {
    const storeId = storeIdMap[ld.storeSlug] ?? Object.values(storeIdMap)[0] ?? new mongoose.Types.ObjectId();
    const depositAmount = Math.round(ld.lockedPrice * (ld.depositPercent / 100));
    const balanceAmount = ld.lockedPrice - depositAmount;

    return {
      updateOne: {
        filter: { title: ld.title },
        update: {
          $setOnInsert: {
            title: ld.title,
            description: ld.description,
            image: ld.image,
            store: storeId,
            merchant: systemMerchantId,
            storeName: ld.storeName,
            originalPrice: ld.originalPrice,
            lockedPrice: ld.lockedPrice,
            currency: 'INR',
            depositPercent: ld.depositPercent,
            depositAmount,
            balanceAmount,
            validFrom: new Date(),
            validUntil: daysFromNow(30),
            pickupWindowDays: 7,
            maxLocks: 200,
            currentLocks: Math.floor(Math.random() * 80) + 10,
            totalPickedUp: Math.floor(Math.random() * 50),
            lockReward: { type: 'coins', amount: Math.round(depositAmount * 0.5) },
            pickupReward: { type: 'cashback', amount: Math.round(balanceAmount * 0.05) },
            earningsMultiplier: 1,
            region: 'bangalore',
            terms: [
              'Must be redeemed at the specified partner store',
              'Non-refundable after lock',
              'Valid for 7 days from lock date',
            ],
            isActive: true,
            isFeatured: ld.lockedPrice <= 199,
            priority: ld.lockedPrice <= 199 ? 8 : 5,
            tags: ['prepaid', 'lock-deal', 'bangalore', 'near-u'],
          },
        },
        upsert: true,
      },
    };
  });

  await (LockPriceDeal as any).bulkWrite(bulkOps as any[], { ordered: false });
  logger.info(`[SeedDemo] ${LOCK_DEAL_DEFS.length} lock price deals ensured (bulkWrite)`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. TRIAL OFFERS (TRY) — 15 offers
// ─────────────────────────────────────────────────────────────────────────────

const TRIAL_OFFER_DEFS = [
  {
    title: 'Free Coffee Tasting at Blue Tokai',
    category: 'experience' as const,
    originalPrice: 180,
    commitment: 9 as const,
    coins: 20,
    daily: 10,
  },
  {
    title: 'Free Haircut at Toni & Guy',
    category: 'service' as const,
    originalPrice: 600,
    commitment: 29 as const,
    coins: 50,
    daily: 5,
  },
  {
    title: 'Free Yoga Class at Yoga Bar',
    category: 'experience' as const,
    originalPrice: 350,
    commitment: 19 as const,
    coins: 30,
    daily: 8,
  },
  {
    title: 'Free Dessert at Theobroma',
    category: 'sample_pickup' as const,
    originalPrice: 120,
    commitment: 9 as const,
    coins: 15,
    daily: 15,
  },
  {
    title: 'Free Facial at Kaya Skin Clinic',
    category: 'service' as const,
    originalPrice: 800,
    commitment: 29 as const,
    coins: 60,
    daily: 4,
  },
  {
    title: 'Free Gym Session at Anytime Fitness',
    category: 'experience' as const,
    originalPrice: 300,
    commitment: 19 as const,
    coins: 25,
    daily: 6,
  },
  {
    title: 'Free Spa Treatment at O2 Spa',
    category: 'service' as const,
    originalPrice: 1200,
    commitment: 29 as const,
    coins: 80,
    daily: 3,
  },
  {
    title: 'Free Ice Cream Scoop at Amul Parlour',
    category: 'sample_pickup' as const,
    originalPrice: 80,
    commitment: 9 as const,
    coins: 10,
    daily: 20,
  },
  {
    title: 'Free Brewing Class at Third Wave Coffee',
    category: 'experience' as const,
    originalPrice: 500,
    commitment: 29 as const,
    coins: 40,
    daily: 5,
  },
  {
    title: 'Free Nail Art Trial at Naturals',
    category: 'service' as const,
    originalPrice: 250,
    commitment: 19 as const,
    coins: 20,
    daily: 8,
  },
  {
    title: "Free Protein Shake at Gold's Gym",
    category: 'sample_pickup' as const,
    originalPrice: 150,
    commitment: 9 as const,
    coins: 15,
    daily: 10,
  },
  {
    title: 'Free Movie Screening at PVR',
    category: 'experience' as const,
    originalPrice: 280,
    commitment: 29 as const,
    coins: 25,
    daily: 5,
  },
  {
    title: 'Free Starbucks Frappuccino',
    category: 'sample_pickup' as const,
    originalPrice: 350,
    commitment: 19 as const,
    coins: 30,
    daily: 8,
  },
  {
    title: 'Free Cult.fit Cycling Class',
    category: 'experience' as const,
    originalPrice: 400,
    commitment: 19 as const,
    coins: 35,
    daily: 6,
  },
  {
    title: 'Free Skincare Consultation at Kaya',
    category: 'service' as const,
    originalPrice: 500,
    commitment: 29 as const,
    coins: 40,
    daily: 4,
  },
];

async function seedTrialOffers(systemMerchantId: mongoose.Types.ObjectId): Promise<void> {
  logger.info('[SeedDemo] Seeding trial offers…');

  // OPTIMIZATION: Use bulkWrite instead of sequential findOneAndUpdate
  // Before: 15 sequential DB calls (one per trial offer)
  // After: 1 bulk operation
  const oneWeekFromNow = daysFromNow(7);
  const oneMonthFromNow = daysFromNow(30);

  const bulkOps = TRIAL_OFFER_DEFS.map(t => ({
    updateOne: {
      filter: { title: t.title, merchantId: systemMerchantId },
      update: {
        $setOnInsert: {
          merchantId: systemMerchantId,
          title: t.title,
          category: t.category,
          coinPrice: t.coins * 2,
          commitmentFee: t.commitment,
          originalPrice: t.originalPrice,
          slotConfig: {
            dailySlots: t.daily,
            qrWindowMinutes: 60,
            windowType: 'relative',
          },
          rewardConfig: {
            rezCoins: t.coins,
            brandedCoins: Math.round(t.coins * 0.5),
            brandedCoinLabel: 'REZ Coins',
          },
          upsellLinks: [],
          images: [
            `https://images.unsplash.com/photo-${(Math.abs(t.title.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % 9_000_000) + 500_000_000}?w=800&auto=format`,
          ],
          terms: 'One free trial per user. Valid at designated Bangalore outlets. Show REZ app at counter.',
          status: 'active',
          featuredUntil: oneWeekFromNow,
          campaignBoost: 0,
          freshnessBoostedUntil: oneMonthFromNow,
          totalBookings: Math.floor(Math.random() * 200) + 30,
          totalCompletions: Math.floor(Math.random() * 150) + 20,
          avgRating: parseFloat((3.8 + Math.random() * 1.0).toFixed(1)),
        },
      },
      upsert: true,
    },
  }));

  await (TrialOffer as any).bulkWrite(bulkOps as any[], { ordered: false });
  logger.info(`[SeedDemo] ${TRIAL_OFFER_DEFS.length} trial offers ensured (bulkWrite)`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. VOUCHER BRANDS — 10 brands
// ─────────────────────────────────────────────────────────────────────────────

const VOUCHER_BRAND_DEFS = [
  {
    name: 'REZ Food Voucher',
    description: '₹50 off on any food delivery order via REZ partners',
    category: 'food' as const,
    cashbackRate: 5,
    denominations: [50, 100, 200],
    bg: '#FF6B35',
    color: '#FFFFFF',
  },
  {
    name: 'REZ Salon Voucher',
    description: '₹100 off on salon bookings via REZ',
    category: 'lifestyle' as const,
    cashbackRate: 8,
    denominations: [100, 200, 500],
    bg: '#E63946',
    color: '#FFFFFF',
  },
  {
    name: 'REZ First-Order Bonus',
    description: '₹200 off on your first REZ order',
    category: 'shopping' as const,
    cashbackRate: 10,
    denominations: [200, 300],
    bg: '#4361EE',
    color: '#FFFFFF',
  },
  {
    name: 'REZ Free Delivery Pass',
    description: 'Free delivery on all orders for 7 days',
    category: 'food' as const,
    cashbackRate: 3,
    denominations: [99, 199],
    bg: '#2EC4B6',
    color: '#FFFFFF',
  },
  {
    name: 'REZ Birthday Special',
    description: '₹500 birthday bonus — Happy Birthday from REZ!',
    category: 'lifestyle' as const,
    cashbackRate: 15,
    denominations: [500, 1000],
    bg: '#FFD700',
    color: '#1A1A2E',
  },
  {
    name: 'REZ Electronics Voucher',
    description: '₹500 off on electronics and gadgets at partner stores',
    category: 'electronics' as const,
    cashbackRate: 5,
    denominations: [500, 1000, 2000],
    bg: '#0B2240',
    color: '#FFFFFF',
  },
  {
    name: 'REZ Fashion Voucher',
    description: '₹300 off on fashion and clothing at partner stores',
    category: 'fashion' as const,
    cashbackRate: 8,
    denominations: [300, 500, 1000],
    bg: '#7B2D8B',
    color: '#FFFFFF',
  },
  {
    name: 'REZ Wellness Voucher',
    description: '₹400 off on spa, gym and wellness bookings',
    category: 'health' as const,
    cashbackRate: 10,
    denominations: [400, 800, 1500],
    bg: '#3D9970',
    color: '#FFFFFF',
  },
  {
    name: 'REZ Entertainment Pass',
    description: '₹250 off on movies, gaming and entertainment',
    category: 'entertainment' as const,
    cashbackRate: 7,
    denominations: [250, 500],
    bg: '#E84393',
    color: '#FFFFFF',
  },
  {
    name: 'REZ Premium Cashback',
    description: 'Premium voucher with extra 5% cashback on everything',
    category: 'shopping' as const,
    cashbackRate: 12,
    denominations: [1000, 2000, 5000],
    bg: '#F4A261',
    color: '#1A1A2E',
  },
];

async function seedVoucherBrands(): Promise<void> {
  logger.info('[SeedDemo] Seeding voucher brands…');

  // OPTIMIZATION: Use bulkWrite instead of sequential findOneAndUpdate
  // Before: 10 sequential DB calls (one per voucher brand)
  // After: 1 bulk operation
  const bulkOps = VOUCHER_BRAND_DEFS.map(v => ({
    updateOne: {
      filter: { name: v.name },
      update: {
        $setOnInsert: {
          name: v.name,
          logo: `https://images.unsplash.com/photo-${(Math.abs(v.name.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % 9_000_000) + 500_000_000}?w=200&auto=format`,
          backgroundColor: v.bg,
          logoColor: v.color,
          description: v.description,
          cashbackRate: v.cashbackRate,
          rating: parseFloat((3.8 + Math.random() * 1.0).toFixed(1)),
          ratingCount: Math.floor(Math.random() * 500) + 50,
          category: v.category,
          isNewlyAdded: false,
          isFeatured: v.cashbackRate >= 10,
          isActive: true,
          denominations: v.denominations,
          termsAndConditions: [
            'Valid for single use only',
            'Cannot be combined with other vouchers',
            'Valid at participating REZ partner outlets only',
            'No cash redemption value',
          ],
          purchaseCount: Math.floor(Math.random() * 1000) + 100,
          viewCount: Math.floor(Math.random() * 5000) + 500,
        },
      },
      upsert: true,
    },
  }));

  await (VoucherBrand as any).bulkWrite(bulkOps as any[], { ordered: false });
  logger.info(`[SeedDemo] ${VOUCHER_BRAND_DEFS.length} voucher brands ensured (bulkWrite)`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. HERO BANNERS — 3 homepage banners
// ─────────────────────────────────────────────────────────────────────────────

const HERO_BANNER_DEFS = [
  {
    title: 'New: Try Before You Buy',
    subtitle: 'Experience first, commit later',
    description: 'REZ TRY — book free trials at the best salons, cafés and gyms in Bangalore. No card needed.',
    image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&auto=format',
    ctaText: 'Try Now',
    ctaAction: 'navigate',
    ctaUrl: '/try',
    backgroundColor: '#6C63FF',
    textColor: '#FFFFFF',
    priority: 10,
    tags: ['try', 'free-trial', 'new'],
    page: 'home' as const,
    position: 'top' as const,
    size: 'full' as const,
  },
  {
    title: 'Earn 2x Coins This Weekend',
    subtitle: 'Double your rewards Sat & Sun',
    description: 'Shop, dine and explore at any REZ partner store this weekend and earn twice the coins.',
    image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200&auto=format',
    ctaText: 'View Deals',
    ctaAction: 'navigate',
    ctaUrl: '/offers',
    backgroundColor: '#FF6B35',
    textColor: '#FFFFFF',
    priority: 9,
    tags: ['coins', 'weekend', '2x'],
    page: 'home' as const,
    position: 'top' as const,
    size: 'large' as const,
  },
  {
    title: 'Refer & Earn ₹100',
    subtitle: 'Share REZ, both get rewarded',
    description: 'Invite a friend to REZ. When they make their first purchase, you both instantly get ₹100.',
    image: 'https://images.unsplash.com/photo-1567446537708-ac4aa75c9c28?w=1200&auto=format',
    ctaText: 'Refer Now',
    ctaAction: 'navigate',
    ctaUrl: '/referral',
    backgroundColor: '#4361EE',
    textColor: '#FFFFFF',
    priority: 8,
    tags: ['referral', 'earn', 'invite'],
    page: 'home' as const,
    position: 'middle' as const,
    size: 'large' as const,
  },
];

async function seedHeroBanners(systemUserId: mongoose.Types.ObjectId): Promise<void> {
  logger.info('[SeedDemo] Seeding hero banners…');

  // OPTIMIZATION: Use bulkWrite instead of sequential findOneAndUpdate
  // Before: 3 sequential DB calls (one per banner)
  // After: 1 bulk operation
  const now = new Date();
  const validUntil = daysFromNow(30);

  const bulkOps = HERO_BANNER_DEFS.map(b => ({
    updateOne: {
      filter: { title: b.title },
      update: {
        $setOnInsert: {
          title: b.title,
          subtitle: b.subtitle,
          description: b.description,
          image: b.image,
          ctaText: b.ctaText,
          ctaAction: b.ctaAction,
          ctaUrl: b.ctaUrl,
          backgroundColor: b.backgroundColor,
          textColor: b.textColor,
          isActive: true,
          priority: b.priority,
          validFrom: now,
          validUntil,
          targetAudience: {
            userTypes: ['all'],
            locations: ['Bengaluru'],
          },
          analytics: { views: 0, clicks: 0, conversions: 0 },
          metadata: {
            page: b.page,
            position: b.position,
            size: b.size,
            tags: b.tags,
          },
          createdBy: systemUserId,
        },
      },
      upsert: true,
    },
  }));

  await (HeroBanner as any).bulkWrite(bulkOps as any[], { ordered: false });
  logger.info(`[SeedDemo] ${HERO_BANNER_DEFS.length} hero banners ensured (bulkWrite)`);
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN ORCHESTRATOR
// ─────────────────────────────────────────────────────────────────────────────

export async function runSeedDemoData(): Promise<void> {
  logger.info('');
  logger.info('══════════════════════════════════════════════════════');
  logger.info('[SeedDemo] Starting comprehensive Bangalore demo seed…');
  logger.info('══════════════════════════════════════════════════════');

  try {
    // Resolve a system user ID for `createdBy` fields
    // We use a stable ObjectId seeded from string "demo-system" so it's the same every run
    const systemUserId = new mongoose.Types.ObjectId('6472656d6f73797374656d30'); // "demosystem0" hex

    // Seed or retrieve a placeholder merchant
    const systemMerchantId = await getSeedMerchantId();

    await seedCategories();
    const storeIdMap = await seedStores();
    await seedOffers(storeIdMap, systemUserId);
    await seedFlashSales(systemUserId);
    await seedBonusCampaigns(systemUserId);
    await seedLockPriceDeals(storeIdMap, systemMerchantId);
    await seedTrialOffers(systemMerchantId);
    await seedVoucherBrands();
    await seedHeroBanners(systemUserId);

    logger.info('');
    logger.info('══════════════════════════════════════════════════════');
    logger.info('[SeedDemo] Demo seed complete. Summary:');
    logger.info(`  Categories:    ${CORE_CATEGORIES.length} ensured`);
    logger.info(`  Stores:        ${STORE_DEFS.length} ensured`);
    logger.info(`  Offers:        ${OFFER_DEFS.length} ensured`);
    logger.info(`  Flash Sales:   ${FLASH_SALE_DEFS.length} ensured`);
    logger.info(`  Bonus Camps:   ${BONUS_CAMPAIGN_DEFS.length} ensured`);
    logger.info(`  Lock Deals:    ${LOCK_DEAL_DEFS.length} ensured`);
    logger.info(`  Trial Offers:  ${TRIAL_OFFER_DEFS.length} ensured`);
    logger.info(`  Vouchers:      ${VOUCHER_BRAND_DEFS.length} ensured`);
    logger.info(`  Banners:       ${HERO_BANNER_DEFS.length} ensured`);
    logger.info('══════════════════════════════════════════════════════');
    logger.info('');
  } catch (err) {
    logger.error('[SeedDemo] Seed failed with error:', err);
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Standalone script entry point
// ─────────────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  // SEC fix: removed the literal Atlas URI fallback — see bangaloreFullSeed.ts
  // for context. Seed refuses to run without an explicit env var.
  const mongoUri = process.env.MONGODB_URI ?? process.env.MONGO_URI;

  if (!mongoUri) {
    logger.error('MONGODB_URI or MONGO_URI environment variable is required');
    process.exit(1);
  }

  try {
    logger.info('Connecting to MongoDB…');
    await mongoose.connect(mongoUri);
    logger.info('Connected to MongoDB');

    await runSeedDemoData();

    logger.info('Demo seed completed successfully.');
  } catch (err) {
    logger.error('Seed failed:', err);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    logger.info('Disconnected from MongoDB');
  }
}

if (require.main === module) {
  main();
}

export default runSeedDemoData;
