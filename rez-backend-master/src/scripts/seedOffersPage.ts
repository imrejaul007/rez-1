/**
 * Seed Offers Page Data
 *
 * This script seeds all data required for the offers page
 * Run: npm run seed:offers-page
 * Clear & Seed: npm run seed:offers-page -- --clear
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Import models
import HotspotArea from '../models/HotspotArea';
import DoubleCashbackCampaign from '../models/DoubleCashbackCampaign';
import CoinDrop from '../models/CoinDrop';
import UploadBillStore from '../models/UploadBillStore';
import BankOffer from '../models/BankOffer';
import ExclusiveZone from '../models/ExclusiveZone';
import SpecialProfile from '../models/SpecialProfile';
import LoyaltyMilestone from '../models/LoyaltyMilestone';
import Offer from '../models/Offer';

// Import seed data
import {
  hotspotSeeds,
  doubleCashbackSeeds,
  coinDropSeeds,
  uploadBillStoreSeeds,
  bankOfferSeeds,
  exclusiveZoneSeeds,
  specialProfileSeeds,
  loyaltyMilestoneSeeds,
  offerSeeds,
} from '../seeds/offersPageSeeds';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
};

const log = {
  info: (msg: string) => console.log(`${colors.cyan}ℹ ${msg}${colors.reset}`),
  success: (msg: string) => console.log(`${colors.green}✓ ${msg}${colors.reset}`),
  warning: (msg: string) => console.log(`${colors.yellow}⚠ ${msg}${colors.reset}`),
  error: (msg: string) => console.log(`${colors.red}✗ ${msg}${colors.reset}`),
  header: (msg: string) => console.log(`\n${colors.bright}${colors.blue}━━━ ${msg} ━━━${colors.reset}\n`),
};

// Check for --clear flag
const shouldClear = process.argv.includes('--clear');

async function connectDB(): Promise<void> {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/rez';

  log.info(`Connecting to MongoDB: ${mongoUri.replace(/\/\/.*@/, '//***@')}`);

  await mongoose.connect(mongoUri);
  log.success('Connected to MongoDB');
}

async function clearData(): Promise<void> {
  if (!shouldClear) return;

  log.header('Clearing existing data');

  const models = [
    { name: 'HotspotArea', model: HotspotArea },
    { name: 'DoubleCashbackCampaign', model: DoubleCashbackCampaign },
    { name: 'CoinDrop', model: CoinDrop },
    { name: 'UploadBillStore', model: UploadBillStore },
    { name: 'BankOffer', model: BankOffer },
    { name: 'ExclusiveZone', model: ExclusiveZone },
    { name: 'SpecialProfile', model: SpecialProfile },
    { name: 'LoyaltyMilestone', model: LoyaltyMilestone },
  ];

  for (const { name, model } of models) {
    const result = await (model as any).deleteMany({});
    log.info(`Deleted ${result.deletedCount} ${name} documents`);
  }

  // Clear offers with specific tags OR exclusiveZone (our seeded ones)
  const offerResult = await Offer.deleteMany({
    $or: [
      { 'metadata.tags': { $in: ['flash-sale', 'bogo', 'clearance', 'exclusive', 'student', 'corporate', 'women', 'defence', 'healthcare', 'senior'] } },
      { exclusiveZone: { $exists: true, $ne: null } },
    ],
  });
  log.info(`Deleted ${offerResult.deletedCount} seeded Offer documents`);

  log.success('Data cleared successfully');
}

async function seedHotspots(): Promise<number> {
  log.info('Seeding Hotspot Areas...');
  const result = await HotspotArea.insertMany(hotspotSeeds);
  log.success(`Seeded ${result.length} Hotspot Areas`);
  return result.length;
}

async function seedDoubleCashback(): Promise<number> {
  log.info('Seeding Double Cashback Campaigns...');
  const result = await DoubleCashbackCampaign.insertMany(doubleCashbackSeeds);
  log.success(`Seeded ${result.length} Double Cashback Campaigns`);
  return result.length;
}

async function seedCoinDrops(): Promise<number> {
  log.info('Seeding Coin Drops...');
  const result = await CoinDrop.insertMany(coinDropSeeds);
  log.success(`Seeded ${result.length} Coin Drops`);
  return result.length;
}

async function seedUploadBillStores(): Promise<number> {
  log.info('Seeding Upload Bill Stores...');
  const result = await UploadBillStore.insertMany(uploadBillStoreSeeds);
  log.success(`Seeded ${result.length} Upload Bill Stores`);
  return result.length;
}

async function seedBankOffers(): Promise<number> {
  log.info('Seeding Bank Offers...');
  const result = await BankOffer.insertMany(bankOfferSeeds);
  log.success(`Seeded ${result.length} Bank Offers`);
  return result.length;
}

async function seedExclusiveZones(): Promise<number> {
  log.info('Seeding Exclusive Zones...');
  const result = await ExclusiveZone.insertMany(exclusiveZoneSeeds);
  log.success(`Seeded ${result.length} Exclusive Zones`);
  return result.length;
}

async function seedSpecialProfiles(): Promise<number> {
  log.info('Seeding Special Profiles...');
  const result = await SpecialProfile.insertMany(specialProfileSeeds);
  log.success(`Seeded ${result.length} Special Profiles`);
  return result.length;
}

async function seedLoyaltyMilestones(): Promise<number> {
  log.info('Seeding Loyalty Milestones...');
  const result = await LoyaltyMilestone.insertMany(loyaltyMilestoneSeeds);
  log.success(`Seeded ${result.length} Loyalty Milestones`);
  return result.length;
}

async function seedOffers(): Promise<number> {
  log.info('Seeding Offers (Lightning, BOGO, Sale, Exclusive)...');
  const result = await Offer.insertMany(offerSeeds as any);
  log.success(`Seeded ${result.length} Offers`);
  return result.length;
}

async function main(): Promise<void> {
  const startTime = Date.now();

  try {
    log.header('Offers Page Seeder');
    log.info(`Mode: ${shouldClear ? 'Clear & Seed' : 'Seed Only'}`);

    // Connect to database
    await connectDB();

    // Clear existing data if --clear flag is passed
    await clearData();

    log.header('Seeding data');

    // Run all seeders
    const counts = {
      hotspots: await seedHotspots(),
      doubleCashback: await seedDoubleCashback(),
      coinDrops: await seedCoinDrops(),
      uploadBillStores: await seedUploadBillStores(),
      bankOffers: await seedBankOffers(),
      exclusiveZones: await seedExclusiveZones(),
      specialProfiles: await seedSpecialProfiles(),
      loyaltyMilestones: await seedLoyaltyMilestones(),
      offers: await seedOffers(),
    };

    // Summary
    log.header('Seeding Complete');
    console.log('\nSummary:');
    console.log('┌────────────────────────────┬───────┐');
    console.log('│ Collection                 │ Count │');
    console.log('├────────────────────────────┼───────┤');
    Object.entries(counts).forEach(([key, count]) => {
      const name = key.replace(/([A-Z])/g, ' $1').trim();
      console.log(`│ ${name.padEnd(26)} │ ${String(count).padStart(5)} │`);
    });
    console.log('└────────────────────────────┴───────┘');

    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    log.success(`\nTotal documents seeded: ${total}`);
    log.success(`Duration: ${duration}s`);

  } catch (error) {
    log.error(`Seeding failed: ${error instanceof Error ? error.message : String(error)}`);
    console.error(error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    log.info('Disconnected from MongoDB');
  }
}

// Run the seeder
main().catch(console.error);
