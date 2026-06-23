/**
 * Seed Script for Trial Offers (Try Before You Buy)
 * Creates 12 diverse dummy trial offers across all 4 categories
 *
 * Run: npm run seed:trials
 * Or:  npx ts-node src/scripts/seedTrials.ts
 */

import dotenv from 'dotenv';
import path from 'path';
import { connectScriptDb, disconnectDb } from './connectDb';

dotenv.config({ path: path.join(__dirname, '../../.env') });

import { TrialOffer } from '../models/TrialOffer';
import { Merchant } from '../models/Merchant';
import { logger } from '../config/logger';

// ─── Console helpers ────────────────────────────────────────────────────────
const c = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

const log = {
  info: (msg: string) => console.log(`${c.cyan}  [INFO]  ${msg}${c.reset}`),
  success: (msg: string) => console.log(`${c.green}  [OK]    ${msg}${c.reset}`),
  warn: (msg: string) => console.log(`${c.yellow}  [WARN]  ${msg}${c.reset}`),
  error: (msg: string) => console.log(`${c.red}  [ERR]   ${msg}${c.reset}`),
  header: (msg: string) => console.log(`\n${c.bold}${c.cyan}━━━ ${msg} ━━━${c.reset}\n`),
};

// ─── Trial data ──────────────────────────────────────────────────────────────
const STANDARD_TERMS = 'Standard trial terms apply. Product must be returned within 48 hours if not purchased.';

const trialData = [
  // ── Service (3) ──────────────────────────────────────────────────────────
  {
    title: '30-Min Deep Tissue Massage',
    category: 'service' as const,
    coinPrice: 50,
    commitmentFee: 19 as const,
    originalPrice: 1500,
    images: ['https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800'],
    description: 'Professional spa deep tissue massage session',
  },
  {
    title: 'Premium Haircut & Styling',
    category: 'service' as const,
    coinPrice: 30,
    commitmentFee: 9 as const,
    originalPrice: 800,
    images: ['https://images.unsplash.com/photo-1560869713-7d0a29430803?w=800'],
    description: 'Expert salon haircut and styling service',
  },
  {
    title: 'Full Body Skin Analysis',
    category: 'service' as const,
    coinPrice: 40,
    commitmentFee: 19 as const,
    originalPrice: 2000,
    images: ['https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800'],
    description: 'Comprehensive dermatology skin analysis session',
  },

  // ── Sample Pickup (3) ────────────────────────────────────────────────────
  {
    title: 'Organic Protein Bar Pack (3x)',
    category: 'sample_pickup' as const,
    coinPrice: 20,
    commitmentFee: 9 as const,
    originalPrice: 450,
    images: ['https://images.unsplash.com/photo-1622484211896-b0d3e5e1c0a7?w=800'],
    description: 'Health food sample — 3 assorted organic protein bars',
  },
  {
    title: 'Premium Coffee Sampler (5 blends)',
    category: 'sample_pickup' as const,
    coinPrice: 35,
    commitmentFee: 9 as const,
    originalPrice: 600,
    images: ['https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=800'],
    description: 'Five curated single-origin coffee blends to sample',
  },
  {
    title: 'Natural Skincare Mini Kit',
    category: 'sample_pickup' as const,
    coinPrice: 45,
    commitmentFee: 19 as const,
    originalPrice: 1200,
    images: ['https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800'],
    description: 'Beauty sample kit with natural skincare essentials',
  },

  // ── Experience (3) ───────────────────────────────────────────────────────
  {
    title: 'Pottery Workshop (2 hours)',
    category: 'experience' as const,
    coinPrice: 80,
    commitmentFee: 29 as const,
    originalPrice: 2500,
    images: ['https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=800'],
    description: 'Hands-on 2-hour pottery and ceramics art experience',
  },
  {
    title: 'Wine & Cheese Tasting Evening',
    category: 'experience' as const,
    coinPrice: 100,
    commitmentFee: 29 as const,
    originalPrice: 3000,
    images: ['https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800'],
    description: 'Curated evening of premium wine and artisan cheese pairings',
  },
  {
    title: 'Yoga Sunrise Session',
    category: 'experience' as const,
    coinPrice: 25,
    commitmentFee: 9 as const,
    originalPrice: 500,
    images: ['https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800'],
    description: 'Rejuvenating sunrise yoga wellness session',
  },

  // ── D2C Kit (3) ──────────────────────────────────────────────────────────
  {
    title: 'Smart Home Starter Kit',
    category: 'd2c_kit' as const,
    coinPrice: 150,
    commitmentFee: 29 as const,
    originalPrice: 5000,
    images: ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800'],
    description: 'Electronics D2C kit — smart plugs, bulbs, and hub starter set',
  },
  {
    title: 'Gourmet Spice Collection (12 spices)',
    category: 'd2c_kit' as const,
    coinPrice: 60,
    commitmentFee: 19 as const,
    originalPrice: 1800,
    images: ['https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=800'],
    description: 'Curated food D2C kit of 12 artisan gourmet spices',
  },
  {
    title: 'Artisan Jewelry Try-On Box',
    category: 'd2c_kit' as const,
    coinPrice: 90,
    commitmentFee: 29 as const,
    originalPrice: 4000,
    images: ['https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800'],
    description: 'Fashion D2C kit — curated artisan jewelry try-on selection',
  },
];

// ─── Main ─────────────────────────────────────────────────────────────────────
async function seedTrials(): Promise<void> {
  log.header('ReZ TRY — Seed Trial Offers');

  // 1. Connect
  log.info('Connecting to MongoDB...');
  await connectScriptDb();
  log.success('Connected to MongoDB');

  // 2. Find or create a merchant
  let merchant = await Merchant.findOne({}).lean();
  if (!merchant) {
    log.warn('No merchant found — creating a demo merchant...');
    const created = await Merchant.create({
      businessName: 'Rez Demo Store',
      ownerName: 'Demo Merchant',
      email: 'demo@rezapp.com',
      phone: '+919999999999',
      password: '$2b$12$dummyhashnotusedforlogin000000000000000000000000000',
      businessType: 'retail',
      category: 'general',
      status: 'approved',
      isActive: true,
      businessAddress: {
        street: '100 MG Road',
        city: 'Bangalore',
        state: 'Karnataka',
        zipCode: '560001',
        country: 'India',
      },
    });
    merchant = created.toObject() as any;
    log.success(`Created demo merchant: ${merchant!._id}`);
  }
  const merchantId = merchant!._id;
  log.info(
    `Using merchant: ${merchant!._id} (${(merchant as any)?.businessName || (merchant as any)?.name || 'unknown'})`,
  );

  // 3. Create trials
  log.header(`Creating ${trialData.length} Trial Offers`);

  const now = new Date();
  const freshnessDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

  let created = 0;
  let skipped = 0;

  for (const data of trialData) {
    // Check if a trial with this title already exists for this merchant
    const existing = await TrialOffer.findOne({ merchantId, title: data.title });
    if (existing) {
      log.warn(`Skipping "${data.title}" — already exists`);
      skipped++;
      continue;
    }

    const trial = await TrialOffer.create({
      merchantId,
      title: data.title,
      category: data.category,
      coinPrice: data.coinPrice,
      commitmentFee: data.commitmentFee,
      originalPrice: data.originalPrice,
      images: data.images,
      terms: STANDARD_TERMS,
      status: 'active',
      slotConfig: {
        dailySlots: 10,
        qrWindowMinutes: 60,
        windowType: 'relative',
      },
      rewardConfig: {
        rezCoins: Math.floor(data.coinPrice * 0.5),
        brandedCoins: 0,
      },
      upsellLinks: [],
      campaignBoost: 0,
      freshnessBoostedUntil: freshnessDate,
      totalBookings: 0,
      totalCompletions: 0,
      avgRating: 0,
    });

    log.success(
      `[${data.category.padEnd(14)}] "${trial.title}" — ` +
        `${data.coinPrice} coins | ₹${data.commitmentFee} fee | ₹${data.originalPrice} original | ID: ${trial._id}`,
    );
    created++;
  }

  // 4. Summary
  log.header('Summary');
  log.success(`Created : ${created} trial offers`);
  if (skipped > 0) log.warn(`Skipped : ${skipped} (already existed)`);

  const categoryCounts = await TrialOffer.aggregate([
    { $match: { merchantId } },
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);
  log.info('Totals per category for this merchant:');
  for (const { _id, count } of categoryCounts) {
    log.info(`  ${String(_id).padEnd(16)} : ${count}`);
  }

  // 5. Disconnect
  await disconnectDb();
  log.success('Disconnected from MongoDB');
  log.header('Done');
}

seedTrials().catch((err) => {
  log.error(`Seed failed: ${err.message}`);
  logger.error(err);
  disconnectDb().finally(() => process.exit(1));
});
