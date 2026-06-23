/**
 * Seed Sample Outlets Script
 *
 * This script creates sample outlets for testing the OutletsPage feature.
 *
 * Usage:
 *   npx ts-node scripts/seedOutlets.ts <storeId>
 *
 * Example:
 *   npx ts-node scripts/seedOutlets.ts 68e24b6d4381285a768357db
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Import Outlet model
import Outlet from '../src/models/Outlet';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rez-app';

// Sample outlet data templates
const outletTemplates = [
  {
    name: 'Main Branch',
    address: '123 Main Street, New York, NY 10001, USA',
    location: {
      type: 'Point' as const,
      coordinates: [-73.935242, 40.730610] // NYC coordinates
    },
    phone: '+1-212-555-0101',
    email: 'main@store.com',
    openingHours: [
      { day: 'Monday', open: '09:00', close: '21:00', isClosed: false },
      { day: 'Tuesday', open: '09:00', close: '21:00', isClosed: false },
      { day: 'Wednesday', open: '09:00', close: '21:00', isClosed: false },
      { day: 'Thursday', open: '09:00', close: '21:00', isClosed: false },
      { day: 'Friday', open: '09:00', close: '22:00', isClosed: false },
      { day: 'Saturday', open: '10:00', close: '22:00', isClosed: false },
      { day: 'Sunday', open: '10:00', close: '20:00', isClosed: false }
    ],
    isActive: true
  },
  {
    name: 'Downtown Branch',
    address: '456 Broadway Avenue, New York, NY 10002, USA',
    location: {
      type: 'Point' as const,
      coordinates: [-73.988235, 40.722531]
    },
    phone: '+1-212-555-0102',
    email: 'downtown@store.com',
    openingHours: [
      { day: 'Monday', open: '08:00', close: '20:00', isClosed: false },
      { day: 'Tuesday', open: '08:00', close: '20:00', isClosed: false },
      { day: 'Wednesday', open: '08:00', close: '20:00', isClosed: false },
      { day: 'Thursday', open: '08:00', close: '20:00', isClosed: false },
      { day: 'Friday', open: '08:00', close: '21:00', isClosed: false },
      { day: 'Saturday', open: '09:00', close: '21:00', isClosed: false },
      { day: 'Sunday', open: '10:00', close: '19:00', isClosed: false }
    ],
    isActive: true
  },
  {
    name: 'Westside Branch',
    address: '789 West Side Highway, New York, NY 10003, USA',
    location: {
      type: 'Point' as const,
      coordinates: [-74.006392, 40.742054]
    },
    phone: '+1-212-555-0103',
    email: 'westside@store.com',
    openingHours: [
      { day: 'Monday', open: '10:00', close: '20:00', isClosed: false },
      { day: 'Tuesday', open: '10:00', close: '20:00', isClosed: false },
      { day: 'Wednesday', open: '10:00', close: '20:00', isClosed: false },
      { day: 'Thursday', open: '10:00', close: '20:00', isClosed: false },
      { day: 'Friday', open: '10:00', close: '21:00', isClosed: false },
      { day: 'Saturday', open: '11:00', close: '21:00', isClosed: false },
      { day: 'Sunday', open: '11:00', close: '19:00', isClosed: false }
    ],
    isActive: true
  }
];

async function seedOutlets(storeId: string) {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check if outlets already exist for this store
    const existingCount = await Outlet.countDocuments({ store: storeId });

    if (existingCount > 0) {
      console.log(`⚠️  Found ${existingCount} existing outlets for this store.`);
      console.log('   Do you want to delete them and create new ones? (Ctrl+C to cancel)');

      // Wait 3 seconds for user to cancel
      await new Promise(resolve => setTimeout(resolve, 3000));

      console.log('🗑️  Deleting existing outlets...');
      await Outlet.deleteMany({ store: storeId });
      console.log('✅ Deleted existing outlets');
    }

    console.log(`\n📍 Creating ${outletTemplates.length} sample outlets for store: ${storeId}`);

    const outletsToCreate = outletTemplates.map(template => ({
      ...template,
      store: new mongoose.Types.ObjectId(storeId)
    }));

    const createdOutlets = await Outlet.insertMany(outletsToCreate);

    console.log(`✅ Successfully created ${createdOutlets.length} outlets:`);
    createdOutlets.forEach((outlet: any, index: number) => {
      console.log(`   ${index + 1}. ${outlet.name}`);
      console.log(`      📍 ${outlet.address}`);
      console.log(`      📞 ${outlet.phone}`);
      console.log(`      📍 Coordinates: [${outlet.location.coordinates.join(', ')}]`);
    });

    console.log('\n🎉 Seeding completed successfully!');
    console.log(`\n🔗 Test the OutletsPage now:`);
    console.log(`   http://localhost:8081/OutletsPage?storeId=${storeId}&storeName=Pizza%20Corner`);

  } catch (error) {
    console.error('❌ Error seeding outlets:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
    process.exit(0);
  }
}

// Get storeId from command line arguments
const storeId = process.argv[2];

if (!storeId) {
  console.error('❌ Error: Please provide a storeId as an argument');
  console.log('\nUsage:');
  console.log('  npx ts-node scripts/seedOutlets.ts <storeId>');
  console.log('\nExample:');
  console.log('  npx ts-node scripts/seedOutlets.ts 68e24b6d4381285a768357db');
  process.exit(1);
}

// Validate storeId format (MongoDB ObjectId)
if (!mongoose.Types.ObjectId.isValid(storeId)) {
  console.error('❌ Error: Invalid storeId format (must be a valid MongoDB ObjectId)');
  process.exit(1);
}

// Run the seeding function
seedOutlets(storeId);
