/**
 * Update Dubai Store and Product Data
 * Adds region tags, updates featured flags, and ensures proper visibility
 *
 * Run with: npx ts-node src/seeds/updateDubaiData.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import { Store } from '../models/Store';
import { Product } from '../models/Product';

async function updateDubaiData() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/rez-app';
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB\n');

    // Update Dubai Stores
    console.log('=== Updating Dubai Stores ===\n');

    const dubaiStoresUpdate = await Store.updateMany(
      { 'location.city': 'Dubai' },
      {
        $set: {
          isFeatured: true,
          isActive: true,
          isVerified: true,
        },
        $addToSet: {
          tags: { $each: ['dubai', 'uae', 'middle-east'] }
        }
      }
    );
    console.log(`Updated ${dubaiStoresUpdate.modifiedCount} Dubai stores (isFeatured, tags)`);

    // Get Dubai store IDs for product update
    const dubaiStores = await Store.find({ 'location.city': 'Dubai' }).select('_id name').lean();
    const dubaiStoreIds = dubaiStores.map(s => s._id);
    console.log(`Found ${dubaiStores.length} Dubai stores:`);
    dubaiStores.forEach(s => console.log(`  - ${s.name}`));

    // Update Dubai Products
    console.log('\n=== Updating Dubai Products ===\n');

    const dubaiProductsUpdate = await Product.updateMany(
      { store: { $in: dubaiStoreIds } },
      {
        $set: {
          isFeatured: true,
          isActive: true,
          adminApproved: true,
          'inventory.isAvailable': true,
        },
        $addToSet: {
          tags: { $each: ['dubai', 'uae'] }
        }
      }
    );
    console.log(`Updated ${dubaiProductsUpdate.modifiedCount} Dubai products (isFeatured, tags)`);

    // Also update createdAt to recent date for new arrivals section
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 5); // 5 days ago

    const dubaiProductsDateUpdate = await Product.updateMany(
      {
        store: { $in: dubaiStoreIds },
        createdAt: { $lt: recentDate }
      },
      {
        $set: {
          createdAt: new Date() // Set to now so they appear in new arrivals
        }
      }
    );
    console.log(`Updated ${dubaiProductsDateUpdate.modifiedCount} Dubai products (createdAt for new arrivals)`);

    // Verify updates
    console.log('\n=== Verification ===\n');

    const featuredDubaiStores = await Store.countDocuments({
      'location.city': 'Dubai',
      isFeatured: true
    });
    console.log(`Featured Dubai stores: ${featuredDubaiStores}`);

    const featuredDubaiProducts = await Product.countDocuments({
      store: { $in: dubaiStoreIds },
      isFeatured: true
    });
    console.log(`Featured Dubai products: ${featuredDubaiProducts}`);

    const dubaiProductsWithTags = await Product.find({
      store: { $in: dubaiStoreIds }
    }).select('name tags pricing.currency').lean();

    console.log('\nDubai products with tags:');
    dubaiProductsWithTags.forEach((p: any) => {
      console.log(`  - ${p.name} (${p.pricing?.currency}) - Tags: ${p.tags?.join(', ')}`);
    });

    const dubaiStoresWithTags = await Store.find({
      'location.city': 'Dubai'
    }).select('name tags isFeatured').lean();

    console.log('\nDubai stores with tags:');
    dubaiStoresWithTags.forEach((s: any) => {
      console.log(`  - ${s.name} (Featured: ${s.isFeatured}) - Tags: ${s.tags?.join(', ')}`);
    });

    console.log('\n=== Update Complete ===');
    console.log('\nDubai stores and products are now:');
    console.log('  - Marked as featured (will show in homepage sections)');
    console.log('  - Tagged with "dubai", "uae", "middle-east"');
    console.log('  - Have recent createdAt (will show in new arrivals)');

  } catch (error) {
    console.error('Error updating Dubai data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

updateDubaiData();
