import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { MallBrand } from '../models/MallBrand';
import { MallCategory } from '../models/MallCategory';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rez-app';

// Categories to seed
const CATEGORIES_DATA = [
  {
    name: 'Fashion',
    slug: 'fashion',
    icon: 'shirt-outline',
    color: '#EC4899',
    backgroundColor: '#FDF2F8',
    maxCashback: 15,
    sortOrder: 1,
    isFeatured: true,
  },
  {
    name: 'Electronics',
    slug: 'electronics',
    icon: 'phone-portrait-outline',
    color: '#3B82F6',
    backgroundColor: '#EFF6FF',
    maxCashback: 10,
    sortOrder: 2,
    isFeatured: true,
  },
  {
    name: 'Food & Beverages',
    slug: 'food-beverages',
    icon: 'fast-food-outline',
    color: '#F97316',
    backgroundColor: '#FFF7ED',
    maxCashback: 20,
    sortOrder: 3,
    isFeatured: true,
  },
];

// Brands to seed (matching frontend dummy data)
const BRANDS_DATA = [
  {
    name: 'Nike',
    slug: 'nike',
    description: 'Just Do It - Global sportswear and athletic footwear leader',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Logo_NIKE.svg/1200px-Logo_NIKE.svg.png',
    tier: 'premium' as const,
    cashback: {
      percentage: 8,
      maxAmount: 2000,
      minPurchase: 1500,
    },
    badges: ['verified', 'trending'],
    categorySlug: 'fashion',
    tags: ['sportswear', 'shoes', 'athletic', 'sneakers'],
    externalUrl: 'https://www.nike.com/in',
  },
  {
    name: 'Apple',
    slug: 'apple',
    description: 'Think Different - Premium technology products and services',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Apple_logo_black.svg/800px-Apple_logo_black.svg.png',
    tier: 'luxury' as const,
    cashback: {
      percentage: 3,
      maxAmount: 10000,
      minPurchase: 10000,
    },
    badges: ['exclusive', 'premium', 'verified'],
    categorySlug: 'electronics',
    tags: ['electronics', 'technology', 'premium', 'iphone', 'macbook'],
    externalUrl: 'https://www.apple.com/in',
  },
  {
    name: 'Starbucks',
    slug: 'starbucks',
    description: 'Inspiring and nurturing the human spirit - one cup at a time',
    logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/d/d3/Starbucks_Corporation_Logo_2011.svg/1200px-Starbucks_Corporation_Logo_2011.svg.png',
    tier: 'standard' as const,
    cashback: {
      percentage: 10,
      maxAmount: 200,
      minPurchase: 200,
    },
    badges: ['trending', 'verified'],
    categorySlug: 'food-beverages',
    tags: ['coffee', 'beverages', 'cafe', 'drinks'],
    externalUrl: 'https://www.starbucks.in',
  },
  {
    name: 'Zara',
    slug: 'zara',
    description: 'Fast fashion for the modern world - Latest trends at affordable prices',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fd/Zara_Logo.svg/1200px-Zara_Logo.svg.png',
    tier: 'premium' as const,
    cashback: {
      percentage: 12,
      maxAmount: 1500,
      minPurchase: 1000,
    },
    badges: ['new', 'trending'],
    categorySlug: 'fashion',
    tags: ['fashion', 'clothing', 'apparel', 'trendy'],
    externalUrl: 'https://www.zara.com/in',
  },
  {
    name: 'Samsung',
    slug: 'samsung',
    description: 'Inspire the world, create the future - Innovation for everyone',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/Samsung_Logo.svg/1280px-Samsung_Logo.svg.png',
    tier: 'premium' as const,
    cashback: {
      percentage: 5,
      maxAmount: 15000,
      minPurchase: 5000,
    },
    badges: ['verified', 'top-rated'],
    categorySlug: 'electronics',
    tags: ['electronics', 'technology', 'mobile', 'tv', 'appliances'],
    externalUrl: 'https://www.samsung.com/in',
  },
  {
    name: 'Dominos',
    slug: 'dominos',
    description: 'Hot fresh pizza delivered to your door in 30 minutes',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/Dominos_pizza_logo.svg/1200px-Dominos_pizza_logo.svg.png',
    tier: 'standard' as const,
    cashback: {
      percentage: 15,
      maxAmount: 150,
      minPurchase: 300,
    },
    badges: ['trending'],
    categorySlug: 'food-beverages',
    tags: ['pizza', 'food', 'delivery', 'fast-food'],
    externalUrl: 'https://www.dominos.co.in',
  },
];

// Gradient colors based on tier
const TIER_GRADIENTS: Record<string, [string, string]> = {
  luxury: ['#1a1a2e', '#16213e'],
  exclusive: ['#4a0072', '#8e2de2'],
  premium: ['#DBEAFE', '#E9D5FF'],
  standard: ['#D1FAE5', '#FED7AA'],
};

/**
 * Check and seed MallCategories and MallBrands
 */
async function seedMallBrands() {
  try {
    console.log('========================================');
    console.log('   MallBrand & MallCategory Seeder');
    console.log('========================================\n');

    console.log(`Connecting to MongoDB: ${MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB\n');

    // Step 1: Check MallCategory collection
    console.log('--- Step 1: Checking MallCategory Collection ---');
    const existingCategories = await MallCategory.countDocuments();
    console.log(`Found ${existingCategories} existing categories`);

    const categoryMap: Record<string, mongoose.Types.ObjectId> = {};

    if (existingCategories === 0) {
      console.log('No categories found. Seeding categories...\n');

      for (const categoryData of CATEGORIES_DATA) {
        const category = await MallCategory.create({
          ...categoryData,
          isActive: true,
          brandCount: 0,
        });
        categoryMap[categoryData.slug] = category._id;
        console.log(`  Created category: ${categoryData.name} (${category._id})`);
      }

      console.log(`\nSeeded ${CATEGORIES_DATA.length} categories`);
    } else {
      console.log('Categories already exist. Fetching existing categories...\n');

      const categories = await MallCategory.find({});
      for (const cat of categories) {
        categoryMap[cat.slug] = cat._id;
        console.log(`  Found category: ${cat.name} (${cat._id})`);
      }

      // Check if we need to add missing categories
      for (const categoryData of CATEGORIES_DATA) {
        if (!categoryMap[categoryData.slug]) {
          const category = await MallCategory.create({
            ...categoryData,
            isActive: true,
            brandCount: 0,
          });
          categoryMap[categoryData.slug] = category._id;
          console.log(`  Created missing category: ${categoryData.name} (${category._id})`);
        }
      }
    }

    // Step 2: Check MallBrand collection
    console.log('\n--- Step 2: Checking MallBrand Collection ---');
    const existingBrands = await MallBrand.countDocuments();
    console.log(`Found ${existingBrands} existing brands`);

    if (existingBrands === 0) {
      console.log('No brands found. Seeding brands...\n');

      for (const brandData of BRANDS_DATA) {
        const categoryId = categoryMap[brandData.categorySlug];

        if (!categoryId) {
          console.log(`  Skipping ${brandData.name}: Category '${brandData.categorySlug}' not found`);
          continue;
        }

        const brand = await MallBrand.create({
          name: brandData.name,
          slug: brandData.slug,
          description: brandData.description,
          logo: brandData.logo,
          banner: [],
          tier: brandData.tier,
          cashback: brandData.cashback,
          mallCategory: categoryId,
          badges: brandData.badges,
          externalUrl: brandData.externalUrl,
          tags: brandData.tags,
          isActive: true,
          isFeatured: true,
          isLuxury: brandData.tier === 'luxury',
          isNewArrival: brandData.badges.includes('new'),
          ratings: {
            average: 4.0 + Math.random() * 0.8,
            count: Math.floor(100 + Math.random() * 500),
            successRate: 95 + Math.random() * 5,
            distribution: { 5: 60, 4: 25, 3: 10, 2: 3, 1: 2 },
          },
          analytics: {
            views: 0,
            clicks: 0,
            purchases: 0,
            totalCashbackGiven: 0,
            conversionRate: 0,
          },
        });

        console.log(`  Created brand: ${brandData.name} (${brand._id}) - ${brandData.tier}`);
      }

      console.log(`\nSeeded ${BRANDS_DATA.length} brands`);
    } else {
      console.log('Brands already exist. Checking for missing brands...\n');

      const existingBrandSlugs = await MallBrand.distinct('slug');

      for (const brandData of BRANDS_DATA) {
        if (!existingBrandSlugs.includes(brandData.slug)) {
          const categoryId = categoryMap[brandData.categorySlug];

          if (!categoryId) {
            console.log(`  Skipping ${brandData.name}: Category '${brandData.categorySlug}' not found`);
            continue;
          }

          const brand = await MallBrand.create({
            name: brandData.name,
            slug: brandData.slug,
            description: brandData.description,
            logo: brandData.logo,
            banner: [],
            tier: brandData.tier,
            cashback: brandData.cashback,
            mallCategory: categoryId,
            badges: brandData.badges,
            externalUrl: brandData.externalUrl,
            tags: brandData.tags,
            isActive: true,
            isFeatured: true,
            isLuxury: brandData.tier === 'luxury',
            isNewArrival: brandData.badges.includes('new'),
            ratings: {
              average: 4.0 + Math.random() * 0.8,
              count: Math.floor(100 + Math.random() * 500),
              successRate: 95 + Math.random() * 5,
              distribution: { 5: 60, 4: 25, 3: 10, 2: 3, 1: 2 },
            },
            analytics: {
              views: 0,
              clicks: 0,
              purchases: 0,
              totalCashbackGiven: 0,
              conversionRate: 0,
            },
          });

          console.log(`  Created missing brand: ${brandData.name} (${brand._id})`);
        } else {
          console.log(`  Brand exists: ${brandData.name}`);
        }
      }
    }

    // Step 3: Update category brand counts
    console.log('\n--- Step 3: Updating Category Brand Counts ---');
    for (const [slug, categoryId] of Object.entries(categoryMap)) {
      const brandCount = await MallBrand.countDocuments({
        mallCategory: categoryId,
        isActive: true,
      });
      await MallCategory.findByIdAndUpdate(categoryId, { brandCount });
      console.log(`  ${slug}: ${brandCount} brands`);
    }

    // Step 4: Summary
    console.log('\n========================================');
    console.log('           SEEDING COMPLETE');
    console.log('========================================');

    const finalCategoryCount = await MallCategory.countDocuments();
    const finalBrandCount = await MallBrand.countDocuments();
    const featuredBrandCount = await MallBrand.countDocuments({ isFeatured: true, isActive: true });

    console.log(`\nFinal counts:`);
    console.log(`  - Categories: ${finalCategoryCount}`);
    console.log(`  - Total Brands: ${finalBrandCount}`);
    console.log(`  - Featured Brands: ${featuredBrandCount}`);

    // Show featured brands
    console.log('\nFeatured brands for Brand Partnerships:');
    const featuredBrands = await MallBrand.find({ isFeatured: true, isActive: true })
      .populate('mallCategory', 'name')
      .select('name tier cashback.percentage');

    featuredBrands.forEach((brand: any) => {
      console.log(`  - ${brand.name} (${brand.tier}) - ${brand.cashback.percentage}% cashback`);
    });

    console.log('\n');
  } catch (error) {
    console.error('Error during seeding:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the seed function
seedMallBrands();
