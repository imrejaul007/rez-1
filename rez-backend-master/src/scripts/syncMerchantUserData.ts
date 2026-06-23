#!/usr/bin/env ts-node

/**
 * Merchant-User Data Sync Script
 * 
 * This script syncs data between merchant-side and user-side:
 * 1. Creates stores for all merchants that don't have stores yet
 * 2. Creates user-side products for all merchant products
 * 
 * Usage:
 * - npm run sync:all - Full sync of merchants and products
 * - npm run sync:merchants - Sync merchants to stores only
 * - npm run sync:products - Sync merchant products to user products only
 * - npm run sync:status - Show sync status
 */

import mongoose from 'mongoose';
import { MerchantUserSyncService } from '../services/MerchantUserSyncService';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rezapp';

async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error);
    process.exit(1);
  }
}

async function showSyncStatus() {
  const status = await MerchantUserSyncService.getSyncStatus();
  if (!status) {
    console.error('❌ Failed to get sync status');
    return;
  }

  console.log('\n📊 SYNC STATUS REPORT');
  console.log('=====================');
  console.log(`👥 Merchants: ${status.merchants.total}`);
  console.log(`   ├─ With stores: ${status.merchants.withStores}`);
  console.log(`   └─ Without stores: ${status.merchants.withoutStores}`);
  console.log(`\n🏪 Stores: ${status.stores.total}`);
  console.log(`   └─ Synced from merchants: ${status.stores.syncedFromMerchants}`);
  console.log(`\n📦 Products:`);
  console.log(`   ├─ Merchant-side: ${status.products.merchantSide}`);
  console.log(`   ├─ User-side: ${status.products.userSide}`);
  console.log(`   ├─ Synced: ${status.products.synced}`);
  console.log(`   └─ Needs sync: ${status.products.needsSync}`);
  console.log(`\n💚 Sync Health:`);
  console.log(`   ├─ Merchant-Store sync: ${status.syncHealth.merchantStoreSync}%`);
  console.log(`   └─ Product sync: ${status.syncHealth.productSync}%`);
  console.log('=====================\n');
}

async function main() {
  const command = process.argv[2] || 'status';

  await connectDB();

  try {
    switch (command) {
      case 'all':
      case 'full':
        console.log('🚀 Starting full sync...');
        await MerchantUserSyncService.forceFullSync();
        await showSyncStatus();
        break;

      case 'merchants':
      case 'stores':
        console.log('🏪 Syncing merchants to stores...');
        await MerchantUserSyncService.syncAllMerchantsToStores();
        await showSyncStatus();
        break;

      case 'products':
        console.log('📦 Syncing merchant products to user products...');
        await MerchantUserSyncService.syncAllMerchantProductsToUserProducts();
        await showSyncStatus();
        break;

      case 'status':
      default:
        await showSyncStatus();
        break;
    }
  } catch (error) {
    console.error('❌ Sync failed:', error);
    process.exit(1);
  }

  await mongoose.disconnect();
  console.log('✅ Disconnected from MongoDB');
  process.exit(0);
}

// Handle uncaught errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled Promise Rejection:', error);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

if (require.main === module) {
  main();
}

export { main as syncMerchantUserData };