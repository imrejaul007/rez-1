/**
 * Set Featured Products Script
 * Marks a selection of products as featured for the "Just for You" section
 * Selects top-rated products from different categories for diversity
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI as string;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); }
;
const DB_NAME = process.env.DB_NAME || 'test';

async function setFeaturedProducts() {
  try {
    console.log('Starting Featured Products Setup...');
    console.log('Connecting to MongoDB...');

    await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
    console.log('Connected to MongoDB\n');

    const db = mongoose.connection.db!;
    const productsCollection = db.collection('products');
    const storesCollection = db.collection('stores');

    // First, reset all products to not featured
    await productsCollection.updateMany({}, { $set: { isFeatured: false } });
    console.log('Reset all products to isFeatured: false\n');

    // Get all stores
    const stores = await storesCollection.find({}).toArray();
    console.log(`Found ${stores.length} stores\n`);

    let totalFeatured = 0;

    // For each store, feature 2-3 of their best products
    for (const store of stores) {
      // Get top-rated products from this store
      const products = await productsCollection
        .find({
          store: store._id,
          isActive: true,
          'inventory.isAvailable': true
        })
        .sort({ 'ratings.average': -1 })
        .limit(3)
        .toArray();

      if (products.length > 0) {
        // Feature 2 products per store (or 1 if only 1 exists)
        const numToFeature = Math.min(2, products.length);
        const productIds = products.slice(0, numToFeature).map(p => p._id);

        await productsCollection.updateMany(
          { _id: { $in: productIds } },
          { $set: { isFeatured: true } }
        );

        totalFeatured += numToFeature;
        console.log(`  Featured ${numToFeature} products from ${store.name}`);
      }
    }

    console.log('\n========================================');
    console.log('FEATURED PRODUCTS SUMMARY');
    console.log('========================================');
    console.log(`Total featured products: ${totalFeatured}`);

    // Verify
    const featuredCount = await productsCollection.countDocuments({ isFeatured: true });
    console.log(`Verified count: ${featuredCount} products with isFeatured=true`);

    // Show sample featured products
    console.log('\nSample featured products:');
    const sampleFeatured = await productsCollection.find({ isFeatured: true }).limit(10).toArray();
    for (const product of sampleFeatured) {
      const store = await storesCollection.findOne({ _id: product.store });
      console.log(`  - ${product.name} (${store?.name || 'Unknown store'}) - Rating: ${product.ratings?.average || 0}`);
    }

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

setFeaturedProducts()
  .then(() => {
    console.log('Featured products setup completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
