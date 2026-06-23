/**
 * Fix Images for Seeded Stores & Products
 * Uses reliable image URLs that will actually load
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI as string;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };

// The subcategories that were seeded
const SEEDED_SUBCATEGORIES = [
  'street-food', 'meat-fish', 'packaged-goods', 'beauty-services', 'cosmetology',
  'skincare-cosmetics', 'nail-studios', 'grooming-men', 'dental', 'vision-eyewear',
  'bags-accessories', 'watches', 'yoga', 'zumba', 'martial-arts', 'sports-academies',
  'sportswear', 'music-dance-classes', 'art-craft', 'vocational', 'language-training',
  'plumbing', 'electrical', 'cleaning', 'house-shifting', 'home-tutors',
  'intercity-travel', 'taxis', 'weekend-getaways', 'tours', 'activities',
  'movies', 'live-events', 'festivals', 'workshops', 'bill-payments',
  'mobile-recharge', 'cable-ott', 'insurance', 'donations'
];

// Category images using Lorem Picsum with specific seeds for consistency
const CATEGORY_IMAGES: Record<string, { logo: number; banner: number; products: number[] }> = {
  'street-food': { logo: 292, banner: 312, products: [429, 431, 433, 435] },
  'meat-fish': { logo: 225, banner: 139, products: [225, 139, 180, 184] },
  'packaged-goods': { logo: 36, banner: 42, products: [36, 42, 48, 63] },
  'beauty-services': { logo: 64, banner: 177, products: [64, 177, 191, 219] },
  'cosmetology': { logo: 64, banner: 177, products: [64, 191, 219, 177] },
  'skincare-cosmetics': { logo: 191, banner: 219, products: [191, 219, 177, 64] },
  'nail-studios': { logo: 191, banner: 177, products: [191, 177, 219, 64] },
  'grooming-men': { logo: 334, banner: 342, products: [334, 342, 349, 357] },
  'dental': { logo: 250, banner: 275, products: [250, 275, 280, 285] },
  'vision-eyewear': { logo: 3, banner: 60, products: [3, 60, 82, 119] },
  'bags-accessories': { logo: 137, banner: 145, products: [137, 145, 171, 182] },
  'watches': { logo: 175, banner: 179, products: [175, 179, 190, 196] },
  'yoga': { logo: 305, banner: 348, products: [305, 348, 399, 400] },
  'zumba': { logo: 342, banner: 366, products: [342, 366, 375, 380] },
  'martial-arts': { logo: 342, banner: 348, products: [342, 348, 358, 362] },
  'sports-academies': { logo: 31, banner: 77, products: [31, 77, 83, 106] },
  'sportswear': { logo: 77, banner: 83, products: [77, 83, 106, 116] },
  'music-dance-classes': { logo: 145, banner: 164, products: [145, 164, 185, 210] },
  'art-craft': { logo: 102, banner: 137, products: [102, 137, 175, 200] },
  'vocational': { logo: 0, banner: 1, products: [0, 1, 2, 3] },
  'language-training': { logo: 24, banner: 46, products: [24, 46, 68, 90] },
  'plumbing': { logo: 156, banner: 178, products: [156, 178, 199, 217] },
  'electrical': { logo: 128, banner: 149, products: [128, 149, 170, 188] },
  'cleaning': { logo: 210, banner: 235, products: [210, 235, 260, 280] },
  'house-shifting': { logo: 256, banner: 277, products: [256, 277, 298, 315] },
  'home-tutors': { logo: 20, banner: 42, products: [20, 42, 65, 88] },
  'intercity-travel': { logo: 57, banner: 79, products: [57, 79, 101, 123] },
  'taxis': { logo: 133, banner: 155, products: [133, 155, 177, 199] },
  'weekend-getaways': { logo: 15, banner: 28, products: [15, 28, 45, 62] },
  'tours': { logo: 100, banner: 122, products: [100, 122, 144, 166] },
  'activities': { logo: 352, banner: 374, products: [352, 374, 396, 418] },
  'movies': { logo: 335, banner: 356, products: [335, 356, 377, 398] },
  'live-events': { logo: 325, banner: 346, products: [325, 346, 367, 388] },
  'festivals': { logo: 308, banner: 329, products: [308, 329, 350, 371] },
  'workshops': { logo: 110, banner: 132, products: [110, 132, 154, 176] },
  'bill-payments': { logo: 180, banner: 201, products: [180, 201, 222, 243] },
  'mobile-recharge': { logo: 160, banner: 181, products: [160, 181, 202, 223] },
  'cable-ott': { logo: 335, banner: 356, products: [335, 356, 377, 398] },
  'insurance': { logo: 265, banner: 286, products: [265, 286, 307, 328] },
  'donations': { logo: 433, banner: 454, products: [433, 454, 475, 496] }
};

async function fixSeededImages() {
  console.log('🖼️ Fixing images for seeded stores & products...\n');

  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB\n');

  const db = mongoose.connection.db!;

  let storesUpdated = 0;
  let productsUpdated = 0;

  // Find all stores from seeded subcategories
  const stores = await db.collection('stores').find({
    subcategorySlug: { $in: SEEDED_SUBCATEGORIES }
  }).toArray();

  console.log(`📦 Found ${stores.length} stores to update\n`);

  for (const store of stores) {
    const subcatSlug = store.subcategorySlug;
    const images = CATEGORY_IMAGES[subcatSlug] || { logo: 100, banner: 200, products: [300, 301, 302, 303] };

    // Update store logo and banner with Lorem Picsum (reliable)
    await db.collection('stores').updateOne(
      { _id: store._id },
      {
        $set: {
          logo: `https://picsum.photos/seed/${subcatSlug}-logo/200/200`,
          banner: `https://picsum.photos/seed/${subcatSlug}-banner/800/400`
        }
      }
    );
    storesUpdated++;
    console.log(`  ✅ Updated store: ${store.name}`);

    // Find and update products for this store
    const products = await db.collection('products').find({ store: store._id }).toArray();

    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      const productSeed = `${subcatSlug}-${product.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}`;

      await db.collection('products').updateOne(
        { _id: product._id },
        {
          $set: {
            images: [`https://picsum.photos/seed/${productSeed}/400/400`]
          }
        }
      );
      productsUpdated++;
    }
    console.log(`    📸 Updated ${products.length} product images`);
  }

  console.log('\n' + '='.repeat(50));
  console.log('🎉 Image fix complete!');
  console.log(`   📦 Stores updated: ${storesUpdated}`);
  console.log(`   🏷️ Products updated: ${productsUpdated}`);
  console.log('='.repeat(50));

  await mongoose.disconnect();
  console.log('\n✅ Done!');
}

fixSeededImages().catch(console.error);
