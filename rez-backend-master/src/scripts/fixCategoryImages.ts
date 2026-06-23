/**
 * Fix Category Images Script
 * Updates all categories with proper image URLs
 *
 * Run with: npx ts-node src/scripts/fixCategoryImages.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

// Category images mapping - using high-quality Unsplash images
const categoryImages: Record<string, { image: string; bannerImage: string }> = {
  'food-dining': {
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop',
    bannerImage: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&h=400&fit=crop'
  },
  'fashion': {
    image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400&h=300&fit=crop',
    bannerImage: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=800&h=400&fit=crop'
  },
  'electronics': {
    image: 'https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=400&h=300&fit=crop',
    bannerImage: 'https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=800&h=400&fit=crop'
  },
  'beauty-wellness': {
    image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&h=300&fit=crop',
    bannerImage: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&h=400&fit=crop'
  },
  'grocery-essentials': {
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=300&fit=crop',
    bannerImage: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&h=400&fit=crop'
  },
  'healthcare': {
    image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop',
    bannerImage: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&h=400&fit=crop'
  },
  'fitness-sports': {
    image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=300&fit=crop',
    bannerImage: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&h=400&fit=crop'
  },
  'home-services': {
    image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=300&fit=crop',
    bannerImage: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&h=400&fit=crop'
  },
  'travel-experiences': {
    image: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400&h=300&fit=crop',
    bannerImage: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&h=400&fit=crop'
  },
  'entertainment': {
    image: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&h=300&fit=crop',
    bannerImage: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&h=400&fit=crop'
  },
  'financial-lifestyle': {
    image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=300&fit=crop',
    bannerImage: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&h=400&fit=crop'
  },
  'education-learning': {
    image: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400&h=300&fit=crop',
    bannerImage: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&h=400&fit=crop'
  }
};

async function fixCategoryImages() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI || '');
  const db = mongoose.connection.db;

  console.log('\nUpdating category images...\n');

  let updated = 0;
  let notFound = 0;

  for (const [slug, images] of Object.entries(categoryImages)) {
    const result = await db!.collection('categories').updateOne(
      { slug },
      {
        $set: {
          image: images.image,
          bannerImage: images.bannerImage
        }
      }
    );

    if (result.matchedCount > 0) {
      console.log(`  Updated: ${slug}`);
      updated++;
    } else {
      console.log(`  Not found: ${slug}`);
      notFound++;
    }
  }

  // Verify the update
  console.log('\nVerifying updates...');
  const categories = await db!.collection('categories').find({
    slug: { $in: Object.keys(categoryImages) }
  }).toArray();

  console.log(`\nCategories with images now: ${categories.filter(c => c.image).length}/${categories.length}`);

  // Show sample
  const sample = categories[0];
  if (sample) {
    console.log(`\nSample: ${sample.name}`);
    console.log(`  image: ${sample.image?.substring(0, 50)}...`);
    console.log(`  bannerImage: ${sample.bannerImage?.substring(0, 50)}...`);
  }

  await mongoose.disconnect();
  console.log(`\nDone! Updated: ${updated}, Not found: ${notFound}`);
}

fixCategoryImages().catch(console.error);
