/**
 * Migration Script: Populate serviceCapabilities from existing Store fields
 *
 * Migrates existing Store documents to populate the new `serviceCapabilities`
 * field based on existing fields (operationalInfo, bookingConfig, bookingType,
 * hasStorePickup, location.deliveryRadius).
 *
 * This script is idempotent -- safe to re-run. It uses $set operations that
 * overwrite the target fields with the same derived values each time.
 *
 * Run: npx ts-node src/scripts/migrateServiceCapabilities.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Import the Store model
import { Store } from '../models/Store';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rez-app';
const DB_NAME = process.env.DB_NAME || 'rez-app';

// Console colors
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
  success: (msg: string) => console.log(`${colors.green}v ${msg}${colors.reset}`),
  warning: (msg: string) => console.log(`${colors.yellow}! ${msg}${colors.reset}`),
  error: (msg: string) => console.log(`${colors.red}x ${msg}${colors.reset}`),
  header: (msg: string) => console.log(`\n${colors.bright}${colors.blue}--- ${msg} ---${colors.reset}\n`),
  section: (msg: string) => console.log(`\n${colors.magenta}> ${msg}${colors.reset}`),
};

async function connectDB(): Promise<void> {
  const maskedUri = MONGODB_URI.replace(/\/\/.*@/, '//***@');
  log.info(`Connecting to MongoDB: ${maskedUri}`);
  await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
  log.success('Connected to MongoDB');
}

async function migrateServiceCapabilities(): Promise<void> {
  log.header('Migrating serviceCapabilities for existing Stores');

  const totalStores = await Store.countDocuments({});
  log.info(`Total stores in database: ${totalStores}`);

  // ---------------------------------------------------------------
  // 1. HOME DELIVERY
  //    enabled = true if store has deliveryTime OR deliveryFee defined OR minimumOrder
  //    Also copy related fields into serviceCapabilities.homeDelivery.*
  // ---------------------------------------------------------------
  log.section('Step 1: Home Delivery');

  // Find stores that qualify for home delivery.
  // A store qualifies if it has deliveryTime OR deliveryFee is not undefined OR minimumOrder exists.
  // Note: deliveryFee has a schema default of 0, so we check for existence of the field OR > 0.
  // deliveryTime has a default of '30-45 mins', and minimumOrder defaults to 0.
  // Since these fields have defaults, virtually all stores could match.
  // We follow the spec exactly: deliveryTime exists OR deliveryFee !== undefined OR minimumOrder exists.
  // Because of schema defaults, we use a practical heuristic: these fields are always set by default,
  // so we check for stores that have meaningful delivery info:
  //   - deliveryTime is truthy (non-empty string)
  //   - OR deliveryFee is defined (exists in the document -- includes 0)
  //   - OR minimumOrder is defined
  const homeDeliveryFilter = {
    $or: [
      { 'operationalInfo.deliveryTime': { $exists: true, $nin: [null, ''] } },
      { 'operationalInfo.deliveryFee': { $exists: true, $ne: null } },
      { 'operationalInfo.minimumOrder': { $exists: true, $ne: null } },
    ],
  };

  // We need to read each store's fields and build the update individually since
  // the $set values depend on existing field values. Using bulkWrite for efficiency.
  const homeDeliveryStores = await Store.find(homeDeliveryFilter)
    .select('operationalInfo location.deliveryRadius')
    .lean();

  log.info(`Found ${homeDeliveryStores.length} stores qualifying for homeDelivery`);

  if (homeDeliveryStores.length > 0) {
    const bulkOps = homeDeliveryStores.map((store: any) => {
      const setFields: Record<string, any> = {
        'serviceCapabilities.homeDelivery.enabled': true,
      };

      if (store.location?.deliveryRadius != null) {
        setFields['serviceCapabilities.homeDelivery.deliveryRadius'] = store.location.deliveryRadius;
      }
      if (store.operationalInfo?.minimumOrder != null) {
        setFields['serviceCapabilities.homeDelivery.minOrder'] = store.operationalInfo.minimumOrder;
      }
      if (store.operationalInfo?.deliveryFee != null) {
        setFields['serviceCapabilities.homeDelivery.deliveryFee'] = store.operationalInfo.deliveryFee;
      }
      if (store.operationalInfo?.freeDeliveryAbove != null) {
        setFields['serviceCapabilities.homeDelivery.freeDeliveryAbove'] = store.operationalInfo.freeDeliveryAbove;
      }
      if (store.operationalInfo?.deliveryTime != null) {
        setFields['serviceCapabilities.homeDelivery.estimatedTime'] = store.operationalInfo.deliveryTime;
      }

      return {
        updateOne: {
          filter: { _id: store._id },
          update: { $set: setFields },
        },
      };
    });

    const homeResult = await Store.bulkWrite(bulkOps);
    log.success(`Home Delivery: ${homeResult.modifiedCount} stores updated`);
  }

  // ---------------------------------------------------------------
  // 2. TABLE BOOKING
  //    enabled = true if bookingConfig.enabled === true
  // ---------------------------------------------------------------
  log.section('Step 2: Table Booking');

  const tableBookingResult = await Store.updateMany(
    { 'bookingConfig.enabled': true },
    { $set: { 'serviceCapabilities.tableBooking.enabled': true } }
  );
  log.success(`Table Booking: ${tableBookingResult.modifiedCount} stores updated`);

  // ---------------------------------------------------------------
  // 3. DINE IN
  //    enabled = true if bookingType is RESTAURANT or HYBRID
  // ---------------------------------------------------------------
  log.section('Step 3: Dine In');

  const dineInResult = await Store.updateMany(
    { bookingType: { $in: ['RESTAURANT', 'HYBRID'] } },
    { $set: { 'serviceCapabilities.dineIn.enabled': true } }
  );
  log.success(`Dine In: ${dineInResult.modifiedCount} stores updated`);

  // ---------------------------------------------------------------
  // 4. STORE PICKUP
  //    enabled = true if hasStorePickup === true
  // ---------------------------------------------------------------
  log.section('Step 4: Store Pickup');

  const storePickupResult = await Store.updateMany(
    { hasStorePickup: true },
    { $set: { 'serviceCapabilities.storePickup.enabled': true } }
  );
  log.success(`Store Pickup: ${storePickupResult.modifiedCount} stores updated`);

  // ---------------------------------------------------------------
  // 5. DRIVE THRU
  //    stays false for all (new feature, no existing data)
  // ---------------------------------------------------------------
  log.section('Step 5: Drive Thru');
  log.info('Drive Thru: No migration needed (new feature, no existing data). Stays false for all stores.');

  // ---------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------
  log.header('Migration Summary');

  const capCounts = {
    homeDelivery: await Store.countDocuments({ 'serviceCapabilities.homeDelivery.enabled': true }),
    tableBooking: await Store.countDocuments({ 'serviceCapabilities.tableBooking.enabled': true }),
    dineIn: await Store.countDocuments({ 'serviceCapabilities.dineIn.enabled': true }),
    storePickup: await Store.countDocuments({ 'serviceCapabilities.storePickup.enabled': true }),
    driveThru: await Store.countDocuments({ 'serviceCapabilities.driveThru.enabled': true }),
  };

  console.log('\n+-------------------------------+--------------+');
  console.log('| Capability                    | Stores       |');
  console.log('+-------------------------------+--------------+');
  console.log(`| Home Delivery                 | ${String(capCounts.homeDelivery).padStart(12)} |`);
  console.log(`| Table Booking                 | ${String(capCounts.tableBooking).padStart(12)} |`);
  console.log(`| Dine In                       | ${String(capCounts.dineIn).padStart(12)} |`);
  console.log(`| Store Pickup                  | ${String(capCounts.storePickup).padStart(12)} |`);
  console.log(`| Drive Thru                    | ${String(capCounts.driveThru).padStart(12)} |`);
  console.log('+-------------------------------+--------------+');
  console.log(`| Total Stores                  | ${String(totalStores).padStart(12)} |`);
  console.log('+-------------------------------+--------------+\n');
}

async function main(): Promise<void> {
  const startTime = Date.now();

  try {
    log.header('Service Capabilities Migration');
    log.info('This script populates serviceCapabilities from existing Store fields.');
    log.info('It is idempotent -- safe to re-run.\n');

    await connectDB();
    await migrateServiceCapabilities();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    log.success(`Migration completed in ${duration}s`);

  } catch (error: any) {
    log.error(`Migration failed: ${error.message}`);
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

export { migrateServiceCapabilities };
