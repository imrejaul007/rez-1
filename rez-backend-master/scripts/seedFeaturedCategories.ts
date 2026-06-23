/**
 * Script to seed featured categories for homepage sections
 * Creates categories if they don't exist and marks them as featured
 */

import mongoose from 'mongoose';
import { Category } from '../src/models/Category';

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };
const DB_NAME = 'test';

// Featured categories for homepage sections
const FEATURED_CATEGORIES = [
  {
    name: 'Beauty & Fashion',
    slug: 'beauty-fashion',
    description: 'Discover amazing deals on beauty products and fashion items',
    type: 'home_delivery' as const,
    icon: 'shopping-bag',
    metadata: {
      color: '#E91E63',
      featured: true,
      tags: ['beauty', 'fashion', 'clothing', 'accessories', 'cosmetics'],
      seoTitle: 'Beauty & Fashion Deals',
      seoDescription: 'Get cashback on beauty and fashion products'
    },
    sortOrder: 1
  },
  {
    name: 'Cosmetics',
    slug: 'cosmetics',
    description: 'Premium cosmetics and skincare products with great cashback',
    type: 'home_delivery' as const,
    icon: 'sparkles',
    metadata: {
      color: '#9C27B0',
      featured: true,
      tags: ['cosmetics', 'skincare', 'makeup', 'beauty'],
      seoTitle: 'Cosmetics Deals',
      seoDescription: 'Cashback on cosmetics and skincare'
    },
    sortOrder: 2
  },
  {
    name: 'Electronics',
    slug: 'electronics',
    description: 'Latest gadgets and electronics with cashback offers',
    type: 'home_delivery' as const,
    icon: 'device-mobile',
    metadata: {
      color: '#2196F3',
      featured: true,
      tags: ['electronics', 'gadgets', 'phones', 'laptops', 'tv'],
      seoTitle: 'Electronics Deals',
      seoDescription: 'Get cashback on electronics and gadgets'
    },
    sortOrder: 3
  },
  {
    name: 'Rentals',
    slug: 'rentals',
    description: 'Car rentals, house rentals and more with cashback',
    type: 'general' as const,
    icon: 'car',
    metadata: {
      color: '#FF9800',
      featured: true,
      tags: ['rentals', 'car', 'house', 'vehicle', 'property'],
      seoTitle: 'Rental Deals',
      seoDescription: 'Cashback on car and house rentals'
    },
    sortOrder: 4
  },
  {
    name: 'Travel',
    slug: 'travel',
    description: 'Travel bookings, hotels and vacation packages with cashback',
    type: 'going_out' as const,
    icon: 'airplane',
    metadata: {
      color: '#00BCD4',
      featured: true,
      tags: ['travel', 'hotels', 'flights', 'vacation', 'booking'],
      seoTitle: 'Travel Deals',
      seoDescription: 'Get cashback on travel and hotel bookings'
    },
    sortOrder: 5
  }
];

async function seedFeaturedCategories() {
  try {
    await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
    console.log('Connected to MongoDB\n');

    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    for (const categoryData of FEATURED_CATEGORIES) {
      // Check if category exists by slug
      const existingCategory = await Category.findOne({ slug: categoryData.slug });

      if (existingCategory) {
        // Check if already featured
        if (existingCategory.metadata?.featured) {
          console.log(`[SKIP] "${categoryData.name}" already exists and is featured`);
          skippedCount++;
        } else {
          // Update to mark as featured
          existingCategory.metadata = {
            ...existingCategory.metadata,
            ...categoryData.metadata
          };
          existingCategory.sortOrder = categoryData.sortOrder;
          await existingCategory.save();
          console.log(`[UPDATE] "${categoryData.name}" marked as featured`);
          updatedCount++;
        }
      } else {
        // Create new category
        const newCategory = new Category({
          ...categoryData,
          isActive: true,
          productCount: 0,
          storeCount: 0
        });
        await newCategory.save();
        console.log(`[CREATE] "${categoryData.name}" created as featured category`);
        createdCount++;
      }
    }

    console.log('\n--- Summary ---');
    console.log(`Created: ${createdCount}`);
    console.log(`Updated: ${updatedCount}`);
    console.log(`Skipped: ${skippedCount}`);
    console.log(`Total: ${FEATURED_CATEGORIES.length}`);

    // Display current featured categories
    console.log('\n--- Current Featured Categories ---');
    const featuredCategories = await Category.find({ 'metadata.featured': true, isActive: true })
      .sort({ sortOrder: 1 })
      .select('name slug type sortOrder');

    featuredCategories.forEach((cat, index) => {
      console.log(`${index + 1}. ${cat.name} (${cat.slug}) - ${cat.type}`);
    });

    console.log('\nSeeding complete!');
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

seedFeaturedCategories();
