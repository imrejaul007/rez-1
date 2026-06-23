/**
 * Seed Script: Update Categories Collection
 *
 * This script updates the MongoDB Categories collection to match
 * the hardcoded categoryConfig from the frontend.
 *
 * Run: npx ts-node src/scripts/seedNewCategories.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI as string;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); }
;
const DB_NAME = process.env.DB_NAME || 'test';

// Category Schema (matching the existing Category model)
const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, maxlength: 100 },
  slug: { type: String, required: true, unique: true, lowercase: true },
  description: { type: String, maxlength: 500 },
  icon: { type: String },
  image: { type: String },
  bannerImage: { type: String },
  type: {
    type: String,
    enum: ['going_out', 'home_delivery', 'earn', 'play', 'general'],
    default: 'going_out'
  },
  parentCategory: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  childCategories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
  metadata: {
    color: String,
    tags: [String],
    description: String,
    seoTitle: String,
    seoDescription: String,
    featured: Boolean
  },
  productCount: { type: Number, default: 0 },
  storeCount: { type: Number, default: 0 }
}, { timestamps: true });

const Category = mongoose.model('Category', categorySchema);

// ============================================
// CATEGORY DATA (from categoryConfig.ts)
// ============================================

interface SubcategoryData {
  slug: string;
  name: string;
  icon?: string;
}

interface CategoryData {
  slug: string;
  name: string;
  icon: string;
  primaryColor: string;
  type: 'going_out' | 'home_delivery' | 'general';
  subcategories: SubcategoryData[];
}

const CATEGORIES: CategoryData[] = [
  // 1. FOOD & DINING
  {
    slug: 'food-dining',
    name: 'Food & Dining',
    icon: 'restaurant-outline',
    primaryColor: '#FF6B35',
    type: 'going_out',
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

  // 2. GROCERY & ESSENTIALS
  {
    slug: 'grocery-essentials',
    name: 'Grocery & Essentials',
    icon: 'basket-outline',
    primaryColor: '#10B981',
    type: 'home_delivery',
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

  // 3. BEAUTY, WELLNESS & PERSONAL CARE
  {
    slug: 'beauty-wellness',
    name: 'Beauty & Wellness',
    icon: 'flower-outline',
    primaryColor: '#EC4899',
    type: 'going_out',
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

  // 4. HEALTHCARE
  {
    slug: 'healthcare',
    name: 'Healthcare',
    icon: 'medical-outline',
    primaryColor: '#EF4444',
    type: 'going_out',
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

  // 5. FASHION
  {
    slug: 'fashion',
    name: 'Fashion',
    icon: 'shirt-outline',
    primaryColor: '#00C06A',
    type: 'going_out',
    subcategories: [
      { slug: 'footwear', name: 'Footwear', icon: 'footsteps-outline' },
      { slug: 'bags-accessories', name: 'Bags & Accessories', icon: 'bag-outline' },
      { slug: 'electronics', name: 'Electronics', icon: 'phone-portrait-outline' },
      { slug: 'mobile-accessories', name: 'Mobile Accessories', icon: 'headset-outline' },
      { slug: 'watches', name: 'Watches', icon: 'watch-outline' },
      { slug: 'jewelry', name: 'Jewelry', icon: 'diamond-outline' },
      { slug: 'local-brands', name: 'Local Brands', icon: 'storefront-outline' },
    ],
  },

  // 6. FITNESS & SPORTS
  {
    slug: 'fitness-sports',
    name: 'Fitness & Sports',
    icon: 'fitness-outline',
    primaryColor: '#8B5CF6',
    type: 'going_out',
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

  // 7. EDUCATION & LEARNING
  {
    slug: 'education-learning',
    name: 'Education & Learning',
    icon: 'school-outline',
    primaryColor: '#3B82F6',
    type: 'going_out',
    subcategories: [
      { slug: 'coaching-centers', name: 'Coaching Centers', icon: 'book-outline' },
      { slug: 'skill-development', name: 'Skill Development', icon: 'bulb-outline' },
      { slug: 'music-dance-classes', name: 'Music/Dance Classes', icon: 'musical-notes-outline' },
      { slug: 'art-craft', name: 'Art & Craft', icon: 'color-palette-outline' },
      { slug: 'vocational', name: 'Vocational', icon: 'construct-outline' },
      { slug: 'language-training', name: 'Language Training', icon: 'language-outline' },
    ],
  },

  // 8. HOME SERVICES
  {
    slug: 'home-services',
    name: 'Home Services',
    icon: 'home-outline',
    primaryColor: '#F59E0B',
    type: 'home_delivery',
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

  // 9. TRAVEL & EXPERIENCES
  {
    slug: 'travel-experiences',
    name: 'Travel & Experiences',
    icon: 'airplane-outline',
    primaryColor: '#06B6D4',
    type: 'going_out',
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

  // 10. ENTERTAINMENT
  {
    slug: 'entertainment',
    name: 'Entertainment',
    icon: 'film-outline',
    primaryColor: '#A855F7',
    type: 'going_out',
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

  // 11. FINANCIAL LIFESTYLE
  {
    slug: 'financial-lifestyle',
    name: 'Financial Lifestyle',
    icon: 'wallet-outline',
    primaryColor: '#14B8A6',
    type: 'general',
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
];

// ============================================
// SEED FUNCTION
// ============================================

async function seedCategories() {
  try {
    console.log('🚀 Starting category seed...');
    console.log(`📡 Connecting to MongoDB: ${MONGODB_URI.substring(0, 50)}...`);

    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI, {
      dbName: DB_NAME,
    });
    console.log('✅ Connected to MongoDB');

    // Clear existing categories
    console.log('🗑️  Clearing existing categories...');
    const deleteResult = await Category.deleteMany({});
    console.log(`   Deleted ${deleteResult.deletedCount} categories`);

    // Insert main categories first
    console.log('📦 Creating main categories...');
    const mainCategoryMap = new Map<string, mongoose.Types.ObjectId>();

    for (let i = 0; i < CATEGORIES.length; i++) {
      const cat = CATEGORIES[i];
      const mainCategory = new Category({
        name: cat.name,
        slug: cat.slug,
        icon: cat.icon,
        type: cat.type,
        isActive: true,
        sortOrder: i + 1,
        metadata: {
          color: cat.primaryColor,
          featured: true,
        },
        childCategories: [], // Will be updated after subcategories are created
      });

      const savedMain = await mainCategory.save();
      mainCategoryMap.set(cat.slug, savedMain._id as mongoose.Types.ObjectId);
      console.log(`   ✅ Created: ${cat.name} (${cat.slug})`);
    }

    // Insert subcategories
    console.log('\n📦 Creating subcategories...');
    let totalSubcategories = 0;

    for (const cat of CATEGORIES) {
      const parentId = mainCategoryMap.get(cat.slug);
      if (!parentId) continue;

      const childIds: mongoose.Types.ObjectId[] = [];

      for (let j = 0; j < cat.subcategories.length; j++) {
        const sub = cat.subcategories[j];
        const subcategory = new Category({
          name: sub.name,
          slug: sub.slug,
          icon: sub.icon || cat.icon,
          type: cat.type,
          parentCategory: parentId,
          isActive: true,
          sortOrder: j + 1,
          metadata: {
            color: cat.primaryColor,
          },
        });

        const savedSub = await subcategory.save();
        childIds.push(savedSub._id as mongoose.Types.ObjectId);
        totalSubcategories++;
      }

      // Update parent with child references
      await Category.findByIdAndUpdate(parentId, {
        childCategories: childIds,
      });

      console.log(`   ✅ ${cat.name}: ${cat.subcategories.length} subcategories`);
    }

    // Summary
    console.log('\n========================================');
    console.log('📊 SEED COMPLETE');
    console.log('========================================');
    console.log(`   Main Categories: ${CATEGORIES.length}`);
    console.log(`   Subcategories: ${totalSubcategories}`);
    console.log(`   Total: ${CATEGORIES.length + totalSubcategories}`);
    console.log('========================================\n');

    // Verify by fetching all categories
    const allCategories = await Category.find({}).lean();
    console.log('📋 Verification:');
    console.log(`   Total documents in collection: ${allCategories.length}`);

    // List main categories
    const mainCats = allCategories.filter(c => !c.parentCategory);
    console.log(`   Main categories: ${mainCats.map(c => c.slug).join(', ')}`);

  } catch (error) {
    console.error('❌ Error seeding categories:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the seed
seedCategories()
  .then(() => {
    console.log('✅ Seed completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  });
