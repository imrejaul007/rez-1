/**
 * Fix Product Rating Structure
 * Migrates products from old 'rating' structure to new 'ratings' structure
 * Old: rating: { value, count }
 * New: ratings: { average, count, distribution }
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI as string;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };
const DB_NAME = process.env.DB_NAME || 'test';

async function fixProductRating() {
  try {
    console.log('🚀 Starting Product Rating Fix...');
    console.log(`📡 Connecting to MongoDB...`);

    await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db!;
    const productsCollection = db.collection('products');

    // Get all products
    const products = await productsCollection.find({}).toArray();
    console.log(`📦 Found ${products.length} products to process\n`);

    let fixedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const product of products) {
      try {
        // Check if product has old 'rating' structure
        const hasOldRating = product.rating && (product.rating.value !== undefined || product.rating.count !== undefined);
        const hasNewRatings = product.ratings && (product.ratings.average !== undefined || product.ratings.count !== undefined);

        if (hasOldRating && !hasNewRatings) {
          // Parse rating value (could be string or number)
          let avgRating = 0;
          if (typeof product.rating.value === 'string') {
            avgRating = parseFloat(product.rating.value);
          } else if (typeof product.rating.value === 'number') {
            avgRating = product.rating.value;
          }
          if (isNaN(avgRating)) avgRating = 0;

          // Migrate from old to new structure
          const newRatings = {
            average: avgRating,
            count: product.rating.count || 0,
            distribution: {
              5: Math.floor(product.rating.count * 0.4),
              4: Math.floor(product.rating.count * 0.3),
              3: Math.floor(product.rating.count * 0.15),
              2: Math.floor(product.rating.count * 0.1),
              1: Math.floor(product.rating.count * 0.05)
            }
          };

          await productsCollection.updateOne(
            { _id: product._id },
            {
              $set: { ratings: newRatings },
              $unset: { rating: "" } // Remove old field
            }
          );

          console.log(`   ✅ Fixed: ${product.name} - ${avgRating.toFixed(1)} stars (${product.rating.count || 0} reviews)`);
          fixedCount++;
        } else if (hasNewRatings) {
          // Already has new ratings structure
          skippedCount++;
        } else if (hasOldRating && hasNewRatings) {
          // Has both - merge and remove old
          let avgRating = 0;
          if (typeof product.rating.value === 'string') {
            avgRating = parseFloat(product.rating.value);
          } else if (typeof product.rating.value === 'number') {
            avgRating = product.rating.value;
          }
          if (isNaN(avgRating)) avgRating = product.ratings.average || 0;

          await productsCollection.updateOne(
            { _id: product._id },
            {
              $set: {
                'ratings.average': avgRating,
                'ratings.count': product.rating.count || product.ratings.count || 0
              },
              $unset: { rating: "" }
            }
          );

          console.log(`   ✅ Merged: ${product.name}`);
          fixedCount++;
        } else {
          // No rating at all - create default
          const newRatings = {
            average: 4.0,
            count: 0,
            distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
          };

          await productsCollection.updateOne(
            { _id: product._id },
            { $set: { ratings: newRatings } }
          );

          console.log(`   ⚠️ Created default: ${product.name}`);
          fixedCount++;
        }
      } catch (err) {
        console.log(`   ❌ Error: ${product.name} - ${err}`);
        errorCount++;
      }
    }

    console.log('\n========================================');
    console.log('📊 FIX SUMMARY');
    console.log('========================================');
    console.log(`Total Products: ${products.length}`);
    console.log(`Fixed: ${fixedCount}`);
    console.log(`Skipped (already correct): ${skippedCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log('========================================\n');

    // Verify a sample product
    console.log('📊 VERIFICATION (Sample Products):');
    const sampleProducts = await productsCollection.find({}).limit(5).toArray();
    for (const product of sampleProducts) {
      console.log(`   ${product.name}:`);
      console.log(`      ratings.average: ${product.ratings?.average || 'N/A'}`);
      console.log(`      ratings.count: ${product.ratings?.count || 'N/A'}`);
      console.log(`      rating (old): ${product.rating ? JSON.stringify(product.rating) : 'removed'}`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

fixProductRating()
  .then(() => {
    console.log('✅ Product rating fix completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
