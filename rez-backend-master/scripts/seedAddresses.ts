// Seed script for addresses
// Run with: npx ts-node scripts/seedAddresses.ts

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { Address, IAddress } from '../src/models/Address';
import { User } from '../src/models/User';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const sampleAddresses = [
  {
    type: 'HOME',
    title: 'Home',
    addressLine1: '123 Elm Street',
    addressLine2: 'Apt 4B',
    city: 'New York',
    state: 'NY',
    postalCode: '10001',
    country: 'USA',
    coordinates: {
      latitude: 40.7589,
      longitude: -73.9851
    },
    isDefault: true,
    instructions: 'Ring doorbell twice, leave at door if no answer'
  },
  {
    type: 'OFFICE',
    title: 'Office',
    addressLine1: '456 Business Ave',
    addressLine2: 'Suite 200',
    city: 'New York',
    state: 'NY',
    postalCode: '10002',
    country: 'USA',
    coordinates: {
      latitude: 40.7128,
      longitude: -74.0060
    },
    isDefault: false,
    instructions: 'Deliver to reception desk, ask for John Doe'
  },
  {
    type: 'OTHER',
    title: "Mom's House",
    addressLine1: '789 Oak Lane',
    addressLine2: '',
    city: 'Brooklyn',
    state: 'NY',
    postalCode: '11201',
    country: 'USA',
    coordinates: {
      latitude: 40.6782,
      longitude: -73.9442
    },
    isDefault: false,
    instructions: 'Call upon arrival, gate code is 1234'
  },
  {
    type: 'HOME',
    title: 'Weekend House',
    addressLine1: '321 Lake View Dr',
    addressLine2: '',
    city: 'Upstate',
    state: 'NY',
    postalCode: '12345',
    country: 'USA',
    coordinates: {
      latitude: 42.6526,
      longitude: -73.7562
    },
    isDefault: false,
    instructions: 'Leave by the garage door'
  }
];

async function seedAddresses() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI not found in environment variables');
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✓ Connected to MongoDB');

    // Find the first user to associate addresses with
    const user = await User.findOne();
    if (!user) {
      console.error('✗ No users found in database. Please create a user first.');
      process.exit(1);
    }

    console.log(`✓ Found user: ${user.email}`);

    // Check existing addresses
    const existingCount = await Address.countDocuments({ user: user._id });
    console.log(`Current addresses for user: ${existingCount}`);

    if (existingCount > 0) {
      console.log('\n⚠ User already has addresses. Do you want to:');
      console.log('1. Keep existing and add new ones');
      console.log('2. Delete all and create fresh');
      console.log('\nUsing option 2 (delete all) for clean seed...\n');

      await Address.deleteMany({ user: user._id });
      console.log('✓ Deleted existing addresses');
    }

    // Create addresses
    const addressesToCreate = sampleAddresses.map(addr => ({
      ...addr,
      user: user._id
    }));

    const createdAddresses = await Address.insertMany(addressesToCreate);
    console.log(`\n✓ Successfully created ${createdAddresses.length} addresses`);

    // Display summary
    console.log('\n📍 Seeded Addresses:');
    createdAddresses.forEach((addr: any, index: number) => {
      console.log(`${index + 1}. ${addr.type} - ${addr.title}`);
      console.log(`   ${addr.addressLine1}${addr.addressLine2 ? ', ' + addr.addressLine2 : ''}`);
      console.log(`   ${addr.city}, ${addr.state} ${addr.postalCode}`);
      console.log(`   Default: ${addr.isDefault ? 'Yes' : 'No'}`);
      if (addr.instructions) {
        console.log(`   📝 ${addr.instructions}`);
      }
      console.log('');
    });

    console.log('✓ Address seeding completed successfully!');
  } catch (error) {
    console.error('✗ Error seeding addresses:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('✓ Disconnected from MongoDB');
  }
}

// Run the seed function
seedAddresses();
