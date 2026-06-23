/**
 * Dubai Region Seeds Runner
 *
 * This script seeds all the data needed for the Dubai region:
 * - Dubai stores (Carrefour, LuLu, Sharaf DG, etc.)
 * - Dubai products with AED pricing
 *
 * Run with: npx ts-node src/seeds/runDubaiSeeds.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import the seed function
import { seedDubaiStores } from './dubaiStoreSeeds';

async function main() {
  console.log('🚀 Starting Dubai Region Seeds...\n');

  try {
    // Connect to MongoDB
    const mongoUri =
      process.env.MONGODB_URI ||
      'mongodb://localhost:27017/rez-app';

    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Seed Dubai stores and products
    await seedDubaiStores();

    // Print summary
    console.log('\n📊 Seeding Summary:');

    // Import Store and Product models to count
    const { Store } = await import('../models/Store');
    const { Product } = await import('../models/Product');

    const dubaiStoreCount = await Store.countDocuments({ 'location.city': 'Dubai' });
    const dubaiProductCount = await Product.countDocuments({
      store: { $in: await Store.find({ 'location.city': 'Dubai' }).distinct('_id') }
    });

    console.log(`- Dubai Stores: ${dubaiStoreCount}`);
    console.log(`- Dubai Products: ${dubaiProductCount}`);

    console.log('\n✅ Dubai region seeds completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n📡 Disconnected from MongoDB');
  }
}

// Run the seeder
main();
