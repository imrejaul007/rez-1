/**
 * Seed Script for Campaigns (Exciting Deals Section)
 * Seeds campaign data for homepage Exciting Deals section
 *
 * Run: npx ts-node src/scripts/seedCampaigns.ts
 * Clear & Seed: npx ts-node src/scripts/seedCampaigns.ts --clear
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Import models
import Campaign from '../models/Campaign';
import { Store } from '../models/Store';

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

// Connect to database
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

// Clear existing campaigns
async function clearData() {
  if (!shouldClear) {
    log.info('Skipping data clear (use --clear to clear existing data)');
    return;
  }

  log.header('Clearing existing campaigns');

  try {
    const deleted = await Campaign.deleteMany({});
    log.success(`Deleted ${deleted.deletedCount} campaigns`);
  } catch (error: any) {
    log.error(`Error clearing data: ${error.message}`);
  }
}

// Seed campaigns
async function seedCampaigns(): Promise<number> {
  log.header('Seeding Campaigns');

  // Get some stores for storeId references
  const stores = await Store.find({ isActive: true }).limit(10).select('_id name slug').lean();
  const storeMap = new Map(stores.map(s => [s.slug || s.name.toLowerCase(), s._id]));

  // Bangalore (India) region campaigns
  const bangaloreCampaigns = [
    {
      campaignId: 'super-cashback-weekend-bangalore',
      title: 'Super Cashback Weekend',
      subtitle: 'Up to 50% cashback',
      description: 'Get amazing cashback on all purchases this weekend. Limited time offer!',
      badge: '50%',
      badgeBg: '#FFFFFF',
      badgeColor: '#0B2240',
      gradientColors: ['rgba(16, 185, 129, 0.2)', 'rgba(20, 184, 166, 0.1)'],
      type: 'cashback' as const,
      region: 'bangalore' as const,
      deals: [
        {
          store: 'Electronics Hub',
          storeId: storeMap.get('electronics-hub') || storeMap.values().next().value,
          cashback: '40%',
          image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400&h=300&fit=crop',
        },
        {
          store: 'Fashion Central',
          storeId: storeMap.get('fashion-central') || storeMap.values().next().value,
          cashback: '50%',
          image: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=400&h=300&fit=crop',
        },
        {
          store: 'Home Decor',
          storeId: storeMap.get('home-decor') || storeMap.values().next().value,
          cashback: '35%',
          image: 'https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=400&h=300&fit=crop',
        },
      ],
      startTime: new Date(),
      endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      isActive: true,
      priority: 100,
      eligibleCategories: ['electronics', 'fashion', 'home', 'beauty'],
      terms: [
        'Minimum order value: ₹500',
        'Cashback credited within 24 hours',
        'Valid only on weekends',
      ],
    },
    {
      campaignId: 'triple-coin-day-bangalore',
      title: 'Triple Coin Day',
      subtitle: '3X coins on all spends',
      description: 'Earn triple the coins on every purchase today!',
      badge: '3X',
      badgeBg: '#FFFFFF',
      badgeColor: '#0B2240',
      gradientColors: ['rgba(245, 158, 11, 0.2)', 'rgba(249, 115, 22, 0.1)'],
      type: 'coins' as const,
      region: 'bangalore' as const,
      deals: [
        {
          store: 'Grocery Mart',
          storeId: storeMap.get('grocery-mart') || storeMap.values().next().value,
          coins: '3000',
          image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=300&fit=crop',
        },
        {
          store: 'Beauty Palace',
          storeId: storeMap.get('beauty-palace') || storeMap.values().next().value,
          coins: '2500',
          image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&h=300&fit=crop',
        },
        {
          store: 'Fitness Zone',
          storeId: storeMap.get('fitness-zone') || storeMap.values().next().value,
          coins: '1800',
          image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=300&fit=crop',
        },
      ],
      startTime: new Date(),
      endTime: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      isActive: true,
      priority: 90,
    },
    {
      campaignId: 'mega-bank-offers-bangalore',
      title: 'Mega Bank Offers',
      subtitle: 'HDFC, ICICI, SBI, Axis',
      description: 'Exclusive Indian bank offers with amazing discounts',
      badge: 'BANKS',
      badgeBg: '#0B2240',
      badgeColor: '#FFFFFF',
      gradientColors: ['rgba(59, 130, 246, 0.2)', 'rgba(99, 102, 241, 0.1)'],
      type: 'bank' as const,
      region: 'bangalore' as const,
      deals: [
        {
          store: 'HDFC Exclusive',
          cashback: '₹5000 off',
          image: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=400&h=300&fit=crop',
        },
        {
          store: 'ICICI Bonanza',
          cashback: '₹3000 off',
          image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=400&h=300&fit=crop',
        },
        {
          store: 'SBI Specials',
          cashback: '20% cashback',
          image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=300&fit=crop',
        },
      ],
      startTime: new Date(),
      endTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      isActive: true,
      priority: 85,
    },
    {
      campaignId: 'upload-bill-bonanza-bangalore',
      title: 'Upload Bill Bonanza',
      subtitle: 'Extra ₹100 on every bill',
      description: 'Upload your offline purchase bills and earn extra rewards',
      badge: '+₹100',
      badgeBg: '#FFFFFF',
      badgeColor: '#8B5CF6',
      gradientColors: ['rgba(139, 92, 246, 0.2)', 'rgba(236, 72, 153, 0.1)'],
      type: 'bill' as const,
      region: 'bangalore' as const,
      deals: [
        {
          store: 'Any Restaurant',
          bonus: '+₹100 coins',
          image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop',
        },
        {
          store: 'Any Salon',
          bonus: '+₹150 coins',
          image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&h=300&fit=crop',
        },
        {
          store: 'Any Store',
          bonus: '+₹100 coins',
          image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=300&fit=crop',
        },
      ],
      startTime: new Date(),
      endTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      isActive: true,
      priority: 80,
    },
    {
      campaignId: 'new-user-bonanza-bangalore',
      title: 'New User Bonanza',
      subtitle: 'First purchase rewards',
      description: 'Special rewards for new users on their first purchase',
      badge: 'NEW',
      badgeBg: '#06B6D4',
      badgeColor: '#FFFFFF',
      gradientColors: ['rgba(34, 197, 94, 0.2)', 'rgba(16, 185, 129, 0.1)'],
      type: 'new-user' as const,
      region: 'bangalore' as const,
      deals: [
        {
          store: 'First Order',
          bonus: '₹500 off',
          image: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=400&h=300&fit=crop',
        },
        {
          store: 'First Visit',
          bonus: '1000 coins',
          image: 'https://images.unsplash.com/photo-1555529902-5261145633bf?w=400&h=300&fit=crop',
        },
        {
          store: 'Sign Up Bonus',
          bonus: '₹300 cashback',
          image: 'https://images.unsplash.com/photo-1607082349566-187342175e2f?w=400&h=300&fit=crop',
        },
      ],
      startTime: new Date(),
      endTime: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      isActive: true,
      priority: 70,
    },
  ];

  // Dubai (UAE) region campaigns
  const dubaiCampaigns = [
    {
      campaignId: 'super-cashback-weekend-dubai',
      title: 'Super Cashback Weekend',
      subtitle: 'Up to 50% cashback',
      description: 'Get amazing cashback on all purchases this weekend. Limited time offer!',
      badge: '50%',
      badgeBg: '#FFFFFF',
      badgeColor: '#0B2240',
      gradientColors: ['rgba(16, 185, 129, 0.2)', 'rgba(20, 184, 166, 0.1)'],
      type: 'cashback' as const,
      region: 'dubai' as const,
      deals: [
        {
          store: 'Sharaf DG',
          cashback: '40%',
          image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400&h=300&fit=crop',
        },
        {
          store: 'Dubai Mall Fashion',
          cashback: '50%',
          image: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=400&h=300&fit=crop',
        },
        {
          store: 'Home Centre',
          cashback: '35%',
          image: 'https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=400&h=300&fit=crop',
        },
      ],
      startTime: new Date(),
      endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      isActive: true,
      priority: 100,
      eligibleCategories: ['electronics', 'fashion', 'home', 'beauty'],
      terms: [
        'Minimum order value: AED 100',
        'Cashback credited within 24 hours',
        'Valid only on weekends',
      ],
    },
    {
      campaignId: 'triple-coin-day-dubai',
      title: 'Triple Coin Day',
      subtitle: '3X coins on all spends',
      description: 'Earn triple the coins on every purchase today!',
      badge: '3X',
      badgeBg: '#FFFFFF',
      badgeColor: '#0B2240',
      gradientColors: ['rgba(245, 158, 11, 0.2)', 'rgba(249, 115, 22, 0.1)'],
      type: 'coins' as const,
      region: 'dubai' as const,
      deals: [
        {
          store: 'Carrefour',
          coins: '3000',
          image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=300&fit=crop',
        },
        {
          store: 'Sephora',
          coins: '2500',
          image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&h=300&fit=crop',
        },
        {
          store: 'Fitness First',
          coins: '1800',
          image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=300&fit=crop',
        },
      ],
      startTime: new Date(),
      endTime: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      isActive: true,
      priority: 90,
    },
    {
      campaignId: 'mega-bank-offers-dubai',
      title: 'Mega Bank Offers',
      subtitle: 'Emirates NBD, FAB, Mashreq',
      description: 'Exclusive UAE bank offers with amazing discounts',
      badge: 'BANKS',
      badgeBg: '#0B2240',
      badgeColor: '#FFFFFF',
      gradientColors: ['rgba(59, 130, 246, 0.2)', 'rgba(99, 102, 241, 0.1)'],
      type: 'bank' as const,
      region: 'dubai' as const,
      deals: [
        {
          store: 'Emirates NBD',
          cashback: 'AED 500 off',
          image: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=400&h=300&fit=crop',
        },
        {
          store: 'FAB Rewards',
          cashback: 'AED 300 off',
          image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=400&h=300&fit=crop',
        },
        {
          store: 'Mashreq Specials',
          cashback: '20% cashback',
          image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=300&fit=crop',
        },
      ],
      startTime: new Date(),
      endTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      isActive: true,
      priority: 85,
    },
    {
      campaignId: 'upload-bill-bonanza-dubai',
      title: 'Upload Bill Bonanza',
      subtitle: 'Extra 10 AED on every bill',
      description: 'Upload your offline purchase bills and earn extra rewards',
      badge: '+10 AED',
      badgeBg: '#FFFFFF',
      badgeColor: '#8B5CF6',
      gradientColors: ['rgba(139, 92, 246, 0.2)', 'rgba(236, 72, 153, 0.1)'],
      type: 'bill' as const,
      region: 'dubai' as const,
      deals: [
        {
          store: 'Any Restaurant',
          bonus: '+100 coins',
          image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop',
        },
        {
          store: 'Any Salon',
          bonus: '+150 coins',
          image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&h=300&fit=crop',
        },
        {
          store: 'Any Store',
          bonus: '+100 coins',
          image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=300&fit=crop',
        },
      ],
      startTime: new Date(),
      endTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      isActive: true,
      priority: 80,
    },
    {
      campaignId: 'new-user-bonanza-dubai',
      title: 'New User Bonanza',
      subtitle: 'First purchase rewards',
      description: 'Special rewards for new users on their first purchase',
      badge: 'NEW',
      badgeBg: '#06B6D4',
      badgeColor: '#FFFFFF',
      gradientColors: ['rgba(34, 197, 94, 0.2)', 'rgba(16, 185, 129, 0.1)'],
      type: 'new-user' as const,
      region: 'dubai' as const,
      deals: [
        {
          store: 'First Order',
          bonus: 'AED 50 off',
          image: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=400&h=300&fit=crop',
        },
        {
          store: 'First Visit',
          bonus: '1000 coins',
          image: 'https://images.unsplash.com/photo-1555529902-5261145633bf?w=400&h=300&fit=crop',
        },
        {
          store: 'Sign Up Bonus',
          bonus: 'AED 30 cashback',
          image: 'https://images.unsplash.com/photo-1607082349566-187342175e2f?w=400&h=300&fit=crop',
        },
      ],
      startTime: new Date(),
      endTime: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      isActive: true,
      priority: 70,
    },
  ];

  // Global campaigns (available in all regions)
  const globalCampaigns = [
    {
      campaignId: 'flash-coin-drops',
      title: 'Flash Coin Drops',
      subtitle: 'Limited time only',
      description: 'Flash coin drops happening now! Grab them before they expire.',
      badge: 'LIVE',
      badgeBg: '#FFFFFF',
      badgeColor: '#EC4899',
      gradientColors: ['rgba(239, 68, 68, 0.2)', 'rgba(249, 115, 22, 0.1)'],
      type: 'drop' as const,
      region: 'all' as const,
      deals: [
        {
          store: 'Nike Store',
          drop: '500 coins',
          endsIn: '2h',
          image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=300&fit=crop',
        },
        {
          store: 'Starbucks',
          drop: '300 coins',
          endsIn: '4h',
          image: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400&h=300&fit=crop',
        },
        {
          store: 'Zara',
          drop: '400 coins',
          endsIn: '6h',
          image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400&h=300&fit=crop',
        },
      ],
      startTime: new Date(),
      endTime: new Date(Date.now() + 12 * 60 * 60 * 1000),
      isActive: true,
      priority: 75,
    },
  ];

  // Combine all campaigns
  const campaigns = [...bangaloreCampaigns, ...dubaiCampaigns, ...globalCampaigns];

  let createdCount = 0;
  for (const campaignData of campaigns) {
    try {
      const campaign = await Campaign.findOneAndUpdate(
        { campaignId: campaignData.campaignId },
        campaignData,
        { upsert: true, new: true }
      );
      createdCount++;
      log.success(`Created/Updated campaign: ${campaignData.title}`);
    } catch (error: any) {
      log.error(`Error creating campaign ${campaignData.title}: ${error.message}`);
    }
  }

  return createdCount;
}

// Main function
async function main(): Promise<void> {
  const startTime = Date.now();

  try {
    log.header('Campaigns Seeder');
    log.info(`Mode: ${shouldClear ? 'Clear & Seed' : 'Seed Only'}`);

    // Connect to database
    await connectDB();

    // Clear existing data if --clear flag is passed
    await clearData();

    log.header('Seeding data');

    // Seed campaigns
    const campaignsCount = await seedCampaigns();
    log.success(`Seeded ${campaignsCount} campaigns`);

    // Summary
    log.header('Seeding Complete');
    console.log('\nSummary:');
    console.log('┌────────────────────────────┬───────┐');
    console.log('│ Collection                 │ Count │');
    console.log('├────────────────────────────┼───────┤');
    console.log(`│ Campaigns                  │ ${String(campaignsCount).padStart(5)} │`);
    console.log('└────────────────────────────┴───────┘');

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    log.success(`\nTotal documents seeded: ${campaignsCount}`);
    log.success(`Duration: ${duration}s`);

  } catch (error: any) {
    log.error(`Seeding failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    log.success('Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export default main;
