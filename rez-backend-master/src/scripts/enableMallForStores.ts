/**
 * Enable Mall for Existing Stores Script
 *
 * Updates existing stores to enable the mall flag (deliveryCategories.mall = true)
 * so they appear in ReZ Mall - the in-app delivery marketplace.
 *
 * ReZ Mall = In-app delivery marketplace where users:
 * - Browse registered stores
 * - Order products through the app
 * - Earn ReZ Coins as rewards
 *
 * Run: npx ts-node src/scripts/enableMallForStores.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Import Store model
import { Store } from '../models/Store';

// Database connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rez';

async function enableMallForStores() {
  try {
    // Connect to MongoDB
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get top 10 active stores (sorted by rating)
    const MAX_STORES = 10;
    const stores = await Store.find({ isActive: true })
      .sort({ 'ratings.average': -1, 'ratings.count': -1 })
      .limit(MAX_STORES);

    console.log(`📦 Found ${stores.length} stores to enable for mall`);

    if (stores.length === 0) {
      console.log('⚠️ No stores found. Please run seedStores.ts first.');
      return;
    }

    // Enable mall for selected stores and set up reward rules
    console.log('🏪 Enabling mall for top 10 stores...');

    let updatedCount = 0;
    let featuredCount = 0;
    let premiumCount = 0;

    for (let i = 0; i < stores.length; i++) {
      const store = stores[i];

      // First 3 stores are featured + premium
      // Next 3 stores are featured
      // Remaining are standard mall stores
      const isPremium = i < 3;
      const isFeatured = i < 6;

      // Calculate coin reward percentage based on store tier
      let baseCashbackPercent = 5; // Default 5%
      if (isPremium) {
        baseCashbackPercent = 10;
      } else if (isFeatured) {
        baseCashbackPercent = 7;
      }

      // Update store
      await Store.findByIdAndUpdate(store._id, {
        $set: {
          'deliveryCategories.mall': true,
          'deliveryCategories.premium': isPremium,
          isFeatured: isFeatured,
          'rewardRules.baseCashbackPercent': baseCashbackPercent,
          'rewardRules.extraRewardThreshold': 500,
          'rewardRules.extraRewardCoins': 50,
          'rewardRules.reviewBonusCoins': 10,
          'rewardRules.minimumAmountForReward': 100,
        }
      });

      console.log(`  ✅ ${store.name} - ${isPremium ? 'Premium' : isFeatured ? 'Featured' : 'Standard'} (${baseCashbackPercent}% coins)`);

      updatedCount++;
      if (isFeatured) featuredCount++;
      if (isPremium) premiumCount++;
    }

    // Summary
    console.log('\n========================================');
    console.log('🎉 Mall enabled for stores!');
    console.log('========================================');
    console.log(`✅ Total stores updated: ${updatedCount}`);
    console.log(`⭐ Featured stores: ${featuredCount}`);
    console.log(`💎 Premium stores: ${premiumCount}`);
    console.log('========================================');
    console.log('\n📱 ReZ Mall will now show these stores.');
    console.log('   Users can browse, order, and earn ReZ Coins!');
    console.log('========================================\n');

  } catch (error) {
    console.error('❌ Error enabling mall for stores:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
enableMallForStores()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
