/**
 * Seed Complete Categories Script
 * Creates all 11 main categories and 69+ subcategories in MongoDB
 * Based on category.md and categoryConfig.ts specifications
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI as string;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); }
;
const DB_NAME = process.env.DB_NAME || 'test';

// Complete category hierarchy from category.md and categoryConfig.ts
const CATEGORY_HIERARCHY: Record<string, {
  name: string;
  icon: string;
  primaryColor: string;
  subcategories: Array<{ slug: string; name: string; icon: string }>;
}> = {
  'food-dining': {
    name: 'Food & Dining',
    icon: 'restaurant-outline',
    primaryColor: '#FF6B35',
    subcategories: [
      { slug: 'cafes', name: 'Cafés', icon: 'cafe-outline' },
      { slug: 'qsr-fast-food', name: 'QSR / Fast Food', icon: 'fast-food-outline' },
      { slug: 'family-restaurants', name: 'Family Restaurants', icon: 'people-outline' },
      { slug: 'fine-dining', name: 'Fine Dining', icon: 'wine-outline' },
      { slug: 'ice-cream-dessert', name: 'Ice Cream & Dessert', icon: 'ice-cream-outline' },
      { slug: 'bakery-confectionery', name: 'Bakery & Confectionery', icon: 'nutrition-outline' },
      { slug: 'cloud-kitchens', name: 'Cloud Kitchens', icon: 'cloud-outline' },
      { slug: 'street-food', name: 'Street Food', icon: 'storefront-outline' },
    ],
  },
  'grocery-essentials': {
    name: 'Grocery & Essentials',
    icon: 'basket-outline',
    primaryColor: '#10B981',
    subcategories: [
      { slug: 'supermarkets', name: 'Supermarkets', icon: 'cart-outline' },
      { slug: 'kirana-stores', name: 'Kirana Stores', icon: 'storefront-outline' },
      { slug: 'fresh-vegetables', name: 'Fresh Vegetables', icon: 'leaf-outline' },
      { slug: 'meat-fish', name: 'Meat & Fish', icon: 'fish-outline' },
      { slug: 'dairy', name: 'Dairy', icon: 'water-outline' },
      { slug: 'packaged-goods', name: 'Packaged Goods', icon: 'cube-outline' },
      { slug: 'water-cans', name: 'Water Cans', icon: 'water-outline' },
    ],
  },
  'beauty-wellness': {
    name: 'Beauty & Wellness',
    icon: 'flower-outline',
    primaryColor: '#EC4899',
    subcategories: [
      { slug: 'salons', name: 'Salons', icon: 'cut-outline' },
      { slug: 'spa-massage', name: 'Spa & Massage', icon: 'leaf-outline' },
      { slug: 'beauty-services', name: 'Beauty Services', icon: 'sparkles-outline' },
      { slug: 'cosmetology', name: 'Cosmetology', icon: 'color-palette-outline' },
      { slug: 'dermatology', name: 'Dermatology', icon: 'medical-outline' },
      { slug: 'skincare-cosmetics', name: 'Skincare & Cosmetics', icon: 'flask-outline' },
      { slug: 'nail-studios', name: 'Nail Studios', icon: 'hand-left-outline' },
      { slug: 'grooming-men', name: 'Grooming for Men', icon: 'man-outline' },
    ],
  },
  'healthcare': {
    name: 'Healthcare',
    icon: 'medical-outline',
    primaryColor: '#EF4444',
    subcategories: [
      { slug: 'pharmacy', name: 'Pharmacy', icon: 'medkit-outline' },
      { slug: 'clinics', name: 'Clinics', icon: 'fitness-outline' },
      { slug: 'diagnostics', name: 'Diagnostics', icon: 'pulse-outline' },
      { slug: 'dental', name: 'Dental', icon: 'happy-outline' },
      { slug: 'physiotherapy', name: 'Physiotherapy', icon: 'body-outline' },
      { slug: 'home-nursing', name: 'Home Nursing', icon: 'home-outline' },
      { slug: 'vision-eyewear', name: 'Vision & Eyewear', icon: 'eye-outline' },
    ],
  },
  'fashion': {
    name: 'Fashion',
    icon: 'shirt-outline',
    primaryColor: '#00C06A',
    subcategories: [
      { slug: 'footwear', name: 'Footwear', icon: 'footsteps-outline' },
      { slug: 'bags-accessories', name: 'Bags & Accessories', icon: 'bag-outline' },
      { slug: 'mobile-accessories', name: 'Mobile Accessories', icon: 'headset-outline' },
      { slug: 'watches', name: 'Watches', icon: 'watch-outline' },
      { slug: 'jewelry', name: 'Jewelry', icon: 'diamond-outline' },
      { slug: 'local-brands', name: 'Local Brands', icon: 'storefront-outline' },
    ],
  },
  'fitness-sports': {
    name: 'Fitness & Sports',
    icon: 'fitness-outline',
    primaryColor: '#8B5CF6',
    subcategories: [
      { slug: 'gyms', name: 'Gyms', icon: 'barbell-outline' },
      { slug: 'crossfit', name: 'CrossFit', icon: 'flame-outline' },
      { slug: 'yoga', name: 'Yoga', icon: 'body-outline' },
      { slug: 'zumba', name: 'Zumba', icon: 'musical-notes-outline' },
      { slug: 'martial-arts', name: 'Martial Arts', icon: 'hand-right-outline' },
      { slug: 'sports-academies', name: 'Sports Academies', icon: 'trophy-outline' },
      { slug: 'sportswear', name: 'Sportswear', icon: 'shirt-outline' },
    ],
  },
  'education-learning': {
    name: 'Education & Learning',
    icon: 'school-outline',
    primaryColor: '#3B82F6',
    subcategories: [
      { slug: 'coaching-centers', name: 'Coaching Centers', icon: 'book-outline' },
      { slug: 'skill-development', name: 'Skill Development', icon: 'bulb-outline' },
      { slug: 'music-dance-classes', name: 'Music/Dance Classes', icon: 'musical-notes-outline' },
      { slug: 'art-craft', name: 'Art & Craft', icon: 'color-palette-outline' },
      { slug: 'vocational', name: 'Vocational', icon: 'construct-outline' },
      { slug: 'language-training', name: 'Language Training', icon: 'language-outline' },
    ],
  },
  'home-services': {
    name: 'Home Services',
    icon: 'home-outline',
    primaryColor: '#F59E0B',
    subcategories: [
      { slug: 'ac-repair', name: 'AC Repair', icon: 'snow-outline' },
      { slug: 'plumbing', name: 'Plumbing', icon: 'water-outline' },
      { slug: 'electrical', name: 'Electrical', icon: 'flash-outline' },
      { slug: 'cleaning', name: 'Cleaning', icon: 'sparkles-outline' },
      { slug: 'pest-control', name: 'Pest Control', icon: 'bug-outline' },
      { slug: 'house-shifting', name: 'House Shifting', icon: 'cube-outline' },
      { slug: 'laundry-dry-cleaning', name: 'Laundry & Dry Cleaning', icon: 'shirt-outline' },
      { slug: 'home-tutors', name: 'Home Tutors', icon: 'school-outline' },
    ],
  },
  'travel-experiences': {
    name: 'Travel & Experiences',
    icon: 'airplane-outline',
    primaryColor: '#06B6D4',
    subcategories: [
      { slug: 'hotels', name: 'Hotels', icon: 'bed-outline' },
      { slug: 'intercity-travel', name: 'Intercity Travel', icon: 'bus-outline' },
      { slug: 'taxis', name: 'Taxis', icon: 'car-outline' },
      { slug: 'bike-rentals', name: 'Bike Rentals', icon: 'bicycle-outline' },
      { slug: 'weekend-getaways', name: 'Weekend Getaways', icon: 'sunny-outline' },
      { slug: 'tours', name: 'Tours', icon: 'map-outline' },
      { slug: 'activities', name: 'Activities', icon: 'rocket-outline' },
    ],
  },
  'entertainment': {
    name: 'Entertainment',
    icon: 'film-outline',
    primaryColor: '#A855F7',
    subcategories: [
      { slug: 'movies', name: 'Movies', icon: 'film-outline' },
      { slug: 'live-events', name: 'Live Events', icon: 'mic-outline' },
      { slug: 'festivals', name: 'Festivals', icon: 'balloon-outline' },
      { slug: 'workshops', name: 'Workshops', icon: 'build-outline' },
      { slug: 'amusement-parks', name: 'Amusement Parks', icon: 'happy-outline' },
      { slug: 'gaming-cafes', name: 'Gaming Cafés', icon: 'game-controller-outline' },
      { slug: 'vr-ar-experiences', name: 'VR/AR Experiences', icon: 'glasses-outline' },
    ],
  },
  'financial-lifestyle': {
    name: 'Financial Lifestyle',
    icon: 'wallet-outline',
    primaryColor: '#14B8A6',
    subcategories: [
      { slug: 'bill-payments', name: 'Bill Payments', icon: 'receipt-outline' },
      { slug: 'mobile-recharge', name: 'Mobile Recharge', icon: 'phone-portrait-outline' },
      { slug: 'broadband', name: 'Broadband', icon: 'wifi-outline' },
      { slug: 'cable-ott', name: 'Cable/OTT', icon: 'tv-outline' },
      { slug: 'insurance', name: 'Insurance', icon: 'shield-checkmark-outline' },
      { slug: 'gold-savings', name: 'Gold Savings', icon: 'diamond-outline' },
      { slug: 'donations', name: 'Donations', icon: 'heart-outline' },
    ],
  },
  'electronics': {
    name: 'Electronics',
    icon: 'phone-portrait-outline',
    primaryColor: '#3B82F6',
    subcategories: [
      { slug: 'mobile-phones', name: 'Mobile Phones', icon: 'phone-portrait-outline' },
      { slug: 'laptops', name: 'Laptops', icon: 'laptop-outline' },
      { slug: 'televisions', name: 'Televisions', icon: 'tv-outline' },
      { slug: 'cameras', name: 'Cameras', icon: 'camera-outline' },
      { slug: 'audio-headphones', name: 'Audio & Headphones', icon: 'headset-outline' },
      { slug: 'gaming', name: 'Gaming', icon: 'game-controller-outline' },
      { slug: 'accessories', name: 'Accessories', icon: 'hardware-chip-outline' },
      { slug: 'smartwatches', name: 'Smartwatches', icon: 'watch-outline' },
    ],
  },
};

async function seedCompleteCategories() {
  try {
    console.log('🚀 Starting Complete Category Seeding...');
    console.log(`📡 Connecting to MongoDB...`);

    await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db!;
    const categoriesCollection = db.collection('categories');

    // Track created categories for mapping
    const categoryMapping: Record<string, mongoose.Types.ObjectId> = {};

    // Step 1: Create main categories
    console.log('📦 Creating 12 Main Categories...\n');
    let mainCategoryCount = 0;

    for (const [slug, config] of Object.entries(CATEGORY_HIERARCHY)) {
      // Check if main category already exists (as a top-level category)
      const existingMain = await categoriesCollection.findOne({ slug, parentCategory: null });

      let mainCategoryId: mongoose.Types.ObjectId;

      if (existingMain) {
        // Update existing main category
        await categoriesCollection.updateOne(
          { _id: existingMain._id },
          {
            $set: {
              name: config.name,
              icon: config.icon,
              type: 'going_out',
              metadata: { color: config.primaryColor },
              isActive: true,
              updatedAt: new Date(),
            },
          }
        );
        mainCategoryId = existingMain._id as mongoose.Types.ObjectId;
        console.log(`   ✏️ Updated: ${config.name} (${slug})`);
      } else {
        // Check if slug exists as a subcategory (e.g., 'electronics' under 'fashion')
        const existingAsSub = await categoriesCollection.findOne({ slug });

        if (existingAsSub) {
          // Promote existing subcategory to main category
          await categoriesCollection.updateOne(
            { _id: existingAsSub._id },
            {
              $set: {
                name: config.name,
                icon: config.icon,
                type: 'going_out',
                parentCategory: null,
                metadata: { color: config.primaryColor },
                isActive: true,
                sortOrder: mainCategoryCount,
                updatedAt: new Date(),
              },
            }
          );
          mainCategoryId = existingAsSub._id as mongoose.Types.ObjectId;
          console.log(`   🔄 Promoted to main: ${config.name} (${slug}) — was a subcategory`);
        } else {
          // Insert new
          const result = await categoriesCollection.insertOne({
            name: config.name,
            slug: slug,
            icon: config.icon,
            type: 'going_out',
            parentCategory: null,
            childCategories: [],
            metadata: { color: config.primaryColor },
            isActive: true,
            sortOrder: mainCategoryCount,
            productCount: 0,
            storeCount: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          mainCategoryId = result.insertedId as mongoose.Types.ObjectId;
          console.log(`   ✅ Created: ${config.name} (${slug})`);
        }
      }

      categoryMapping[slug] = mainCategoryId;
      mainCategoryCount++;
    }

    console.log(`\n✅ Main Categories: ${mainCategoryCount}\n`);

    // Step 2: Create subcategories
    console.log('📦 Creating Subcategories...\n');
    let subcategoryCount = 0;
    const childCategoryIds: Record<string, mongoose.Types.ObjectId[]> = {};

    for (const [mainSlug, config] of Object.entries(CATEGORY_HIERARCHY)) {
      const parentId = categoryMapping[mainSlug];
      childCategoryIds[mainSlug] = [];

      console.log(`   ${config.name}:`);

      for (let i = 0; i < config.subcategories.length; i++) {
        const sub = config.subcategories[i];

        // Check if subcategory already exists
        const existingSub = await categoriesCollection.findOne({
          slug: sub.slug,
          parentCategory: parentId
        });

        let subCategoryId: mongoose.Types.ObjectId;

        if (existingSub) {
          // Update existing
          await categoriesCollection.updateOne(
            { _id: existingSub._id },
            {
              $set: {
                name: sub.name,
                icon: sub.icon,
                type: 'going_out',
                isActive: true,
                updatedAt: new Date(),
              },
            }
          );
          subCategoryId = existingSub._id as mongoose.Types.ObjectId;
          console.log(`      ✏️ ${sub.name} (${sub.slug})`);
        } else {
          // Insert new
          const result = await categoriesCollection.insertOne({
            name: sub.name,
            slug: sub.slug,
            icon: sub.icon,
            type: 'going_out',
            parentCategory: parentId,
            childCategories: [],
            metadata: { color: config.primaryColor },
            isActive: true,
            sortOrder: i,
            productCount: 0,
            storeCount: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          subCategoryId = result.insertedId as mongoose.Types.ObjectId;
          console.log(`      ✅ ${sub.name} (${sub.slug})`);
        }

        categoryMapping[sub.slug] = subCategoryId;
        childCategoryIds[mainSlug].push(subCategoryId);
        subcategoryCount++;
      }
    }

    // Step 3: Update main categories with childCategories references
    console.log('\n📦 Updating Parent-Child References...');
    for (const [mainSlug, childIds] of Object.entries(childCategoryIds)) {
      await categoriesCollection.updateOne(
        { _id: categoryMapping[mainSlug] },
        { $set: { childCategories: childIds } }
      );
    }

    console.log('\n========================================');
    console.log('📊 SEEDING SUMMARY');
    console.log('========================================');
    console.log(`Main Categories: ${mainCategoryCount}`);
    console.log(`Subcategories: ${subcategoryCount}`);
    console.log(`Total Categories: ${mainCategoryCount + subcategoryCount}`);
    console.log('========================================\n');

    // Verify counts
    const totalInDb = await categoriesCollection.countDocuments({});
    const mainInDb = await categoriesCollection.countDocuments({ parentCategory: null });
    const subInDb = await categoriesCollection.countDocuments({ parentCategory: { $ne: null } });

    console.log('📊 DATABASE VERIFICATION');
    console.log('========================================');
    console.log(`Total in DB: ${totalInDb}`);
    console.log(`Main Categories in DB: ${mainInDb}`);
    console.log(`Subcategories in DB: ${subInDb}`);
    console.log('========================================\n');

    // Export mapping for use by other scripts
    console.log('📋 Category Slug → ObjectId Mapping:');
    console.log('(Save this for reference)\n');

    // Print first few for verification
    const sampleMappings = Object.entries(categoryMapping).slice(0, 10);
    for (const [slug, id] of sampleMappings) {
      console.log(`   ${slug}: ${id}`);
    }
    console.log(`   ... and ${Object.keys(categoryMapping).length - 10} more\n`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

seedCompleteCategories()
  .then(() => {
    console.log('✅ Category seeding completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
