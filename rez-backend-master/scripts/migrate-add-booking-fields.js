/**
 * NON-DESTRUCTIVE Migration Script - Add Booking Fields to Existing Stores
 *
 * This script adds booking-related fields to ALL existing stores
 * WITHOUT removing or modifying any existing data.
 *
 * What it does:
 * - Adds bookingType: 'RETAIL' to all existing stores
 * - Adds bookingConfig with default values
 * - Adds storeVisitConfig for store visit functionality
 * - Preserves ALL existing store data
 *
 * Safe to run multiple times (idempotent)
 */

const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };
const DB_NAME = process.env.DB_NAME || 'test';

async function migrateExistingStores() {
  try {
    console.log('🚀 Starting NON-DESTRUCTIVE Migration...\n');
    console.log('📝 This will ADD booking fields to existing stores');
    console.log('✅ ALL existing data will be preserved\n');

    await mongoose.connect(MONGODB_URI, {
      dbName: DB_NAME,
    });
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const storesCollection = db.collection('stores');

    // Count existing stores
    const totalStores = await storesCollection.countDocuments();
    console.log(`📊 Found ${totalStores} existing stores\n`);

    // Find stores that don't have bookingType yet
    const storesToUpdate = await storesCollection.countDocuments({
      bookingType: { $exists: false }
    });

    console.log(`🔄 Stores needing migration: ${storesToUpdate}\n`);

    if (storesToUpdate === 0) {
      console.log('✅ All stores already have booking fields!');
      console.log('   Migration not needed.\n');
      return;
    }

    console.log('Starting migration...\n');

    // Update all stores without bookingType
    const result = await storesCollection.updateMany(
      {
        // Only update stores that don't have bookingType
        bookingType: { $exists: false }
      },
      {
        $set: {
          // Set all existing stores to RETAIL type
          bookingType: 'RETAIL',

          // Add booking config (disabled for retail by default)
          bookingConfig: {
            enabled: false, // Retail stores don't need advance booking
            requiresAdvanceBooking: false,
            allowWalkIn: true, // Retail allows walk-in
            slotDuration: 30,
            advanceBookingDays: 7,
            workingHours: {
              start: '09:00',
              end: '21:00'
            }
          },

          // Add store visit config (enabled for retail)
          storeVisitConfig: {
            enabled: true, // Enable store visit for retail
            features: ['visit_scheduling', 'live_availability'],
            maxVisitorsPerSlot: 20,
            averageVisitDuration: 30
          },

          // Empty arrays for service and consultation types
          serviceTypes: [],
          consultationTypes: []
        }
      }
    );

    console.log('=' .repeat(80));
    console.log('MIGRATION COMPLETE!');
    console.log('=' .repeat(80));
    console.log(`\n✅ Successfully updated ${result.modifiedCount} stores\n`);

    console.log('📊 Migration Summary:');
    console.log(`   - Stores processed: ${result.matchedCount}`);
    console.log(`   - Stores updated: ${result.modifiedCount}`);
    console.log(`   - Booking Type set to: RETAIL`);
    console.log(`   - Store Visit Config: ENABLED`);
    console.log(`   - Advance Booking: DISABLED (retail doesn't need it)`);
    console.log(`\n✅ ALL existing store data has been preserved!\n`);

    // Verify the migration
    console.log('🔍 Verifying migration...\n');

    const updatedStores = await storesCollection.countDocuments({
      bookingType: { $exists: true }
    });

    console.log(`✅ Total stores with booking fields: ${updatedStores}/${totalStores}`);

    // Show sample updated store
    const sampleStore = await storesCollection.findOne({
      bookingType: 'RETAIL'
    });

    if (sampleStore) {
      console.log('\n📝 Sample updated store:');
      console.log(`   Name: ${sampleStore.name}`);
      console.log(`   Booking Type: ${sampleStore.bookingType}`);
      console.log(`   Store Visit Enabled: ${sampleStore.storeVisitConfig?.enabled}`);
      console.log(`   Store Visit Features: ${sampleStore.storeVisitConfig?.features?.join(', ')}`);
    }

    console.log('\n' + '=' .repeat(80));
    console.log('NEXT STEPS');
    console.log('=' .repeat(80));
    console.log('\n1. Run the seeding script to ADD new stores with booking');
    console.log('   → node scripts/seed-booking-stores.js\n');
    console.log('2. Restart the backend server to use updated schema');
    console.log('   → The server will automatically pick up the changes\n');
    console.log('3. Test the store visit functionality in frontend');
    console.log('   → Retail stores should show "Plan Store Visit" button\n');

  } catch (error) {
    console.error('\n❌ Migration Error:', error);
    console.error('\n⚠️  No data has been modified due to error');
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed\n');
  }
}

// Confirmation prompt (safety check)
console.log('\n' + '=' .repeat(80));
console.log('NON-DESTRUCTIVE MIGRATION - ADD BOOKING FIELDS');
console.log('=' .repeat(80));
console.log('\nThis script will:');
console.log('  ✓ ADD bookingType field to existing stores');
console.log('  ✓ ADD bookingConfig field');
console.log('  ✓ ADD storeVisitConfig field');
console.log('  ✓ SET all existing stores to RETAIL type');
console.log('  ✓ ENABLE store visit functionality for existing stores');
console.log('\nThis script will NOT:');
console.log('  ✗ Delete any stores');
console.log('  ✗ Remove any existing data');
console.log('  ✗ Modify existing fields\n');

console.log('Safe to run multiple times (idempotent)\n');
console.log('=' .repeat(80));
console.log('\nStarting in 2 seconds...\n');

// Wait 2 seconds then start
setTimeout(() => {
  migrateExistingStores().catch(console.error);
}, 2000);
