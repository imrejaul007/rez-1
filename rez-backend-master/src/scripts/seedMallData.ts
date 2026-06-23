/**
 * Seed Mall Data Script
 *
 * Seeds the database with initial mall categories, collections, brands, offers, and banners.
 * Run: npx ts-node src/scripts/seedMallData.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Import models
import { MallCategory } from '../models/MallCategory';
import { MallCollection } from '../models/MallCollection';
import { MallBrand } from '../models/MallBrand';
import { MallOffer } from '../models/MallOffer';
import { MallBanner } from '../models/MallBanner';

// Database connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rez';

// ==================== SEED DATA ====================

// Categories
const categoriesData = [
  {
    name: 'Fashion',
    slug: 'fashion',
    icon: 'shirt',
    color: '#FF6B9D',
    backgroundColor: '#FFF0F5',
    maxCashback: 15,
    sortOrder: 1,
    description: 'Clothing, footwear, and accessories'
  },
  {
    name: 'Beauty',
    slug: 'beauty',
    icon: 'sparkles',
    color: '#F472B6',
    backgroundColor: '#FDF2F8',
    maxCashback: 12,
    sortOrder: 2,
    description: 'Skincare, makeup, and wellness products'
  },
  {
    name: 'Electronics',
    slug: 'electronics',
    icon: 'phone-portrait',
    color: '#3B82F6',
    backgroundColor: '#EFF6FF',
    maxCashback: 10,
    sortOrder: 3,
    description: 'Gadgets, appliances, and tech accessories'
  },
  {
    name: 'Home',
    slug: 'home',
    icon: 'home',
    color: '#10B981',
    backgroundColor: '#ECFDF5',
    maxCashback: 18,
    sortOrder: 4,
    description: 'Furniture, decor, and home essentials'
  },
  {
    name: 'Lifestyle',
    slug: 'lifestyle',
    icon: 'heart',
    color: '#8B5CF6',
    backgroundColor: '#F5F3FF',
    maxCashback: 14,
    sortOrder: 5,
    description: 'Sports, travel, and lifestyle products'
  },
  {
    name: 'Wellness',
    slug: 'wellness',
    icon: 'fitness',
    color: '#06B6D4',
    backgroundColor: '#ECFEFF',
    maxCashback: 16,
    sortOrder: 6,
    description: 'Health, fitness, and personal care'
  },
  {
    name: 'Luxury',
    slug: 'luxury',
    icon: 'diamond',
    color: '#FFD700',
    backgroundColor: '#0B2240',
    maxCashback: 8,
    sortOrder: 7,
    description: 'Premium and luxury brands'
  }
];

// Collections
const collectionsData = [
  {
    name: 'Daily Essentials',
    slug: 'daily-essentials',
    image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400',
    type: 'curated',
    sortOrder: 1,
    description: 'Everyday needs at your fingertips'
  },
  {
    name: 'Trending Now',
    slug: 'trending-now',
    image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400',
    type: 'trending',
    sortOrder: 2,
    description: "What's hot this season"
  },
  {
    name: 'Premium Picks',
    slug: 'premium-picks',
    image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400',
    type: 'curated',
    sortOrder: 3,
    description: 'Quality products, premium brands'
  },
  {
    name: 'Made for You',
    slug: 'made-for-you',
    image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=400',
    type: 'personalized',
    sortOrder: 4,
    description: 'Personalized recommendations'
  },
  {
    name: 'Festive Specials',
    slug: 'festive-specials',
    image: 'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=400',
    type: 'seasonal',
    sortOrder: 5,
    description: 'Celebrate with exclusive offers'
  }
];

// Brands with category references (will be updated with actual ObjectIds)
const brandsData = [
  // Fashion Brands
  {
    name: 'Myntra',
    slug: 'myntra',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Myntra_logo.png/200px-Myntra_logo.png',
    description: "India's largest fashion e-commerce platform",
    tier: 'premium',
    cashback: { percentage: 15, maxAmount: 500 },
    ratings: { average: 4.5, count: 2500, successRate: 97 },
    categorySlug: 'fashion',
    badges: ['verified', 'trending'],
    isFeatured: true,
    externalUrl: 'https://www.myntra.com',
    tags: ['fashion', 'clothing', 'shoes', 'accessories']
  },
  {
    name: 'AJIO',
    slug: 'ajio',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/Ajio_logo.svg/200px-Ajio_logo.svg.png',
    description: 'Reliance Retail fashion destination',
    tier: 'premium',
    cashback: { percentage: 12, maxAmount: 400 },
    ratings: { average: 4.3, count: 1800, successRate: 95 },
    categorySlug: 'fashion',
    badges: ['exclusive', 'verified'],
    isFeatured: true,
    externalUrl: 'https://www.ajio.com',
    tags: ['fashion', 'ethnic', 'western', 'brands']
  },
  {
    name: 'H&M',
    slug: 'hm',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/H%26M-Logo.svg/200px-H%26M-Logo.svg.png',
    description: 'Global fashion retailer',
    tier: 'premium',
    cashback: { percentage: 8, maxAmount: 300 },
    ratings: { average: 4.4, count: 1200, successRate: 96 },
    categorySlug: 'fashion',
    badges: ['premium', 'verified'],
    isFeatured: true,
    externalUrl: 'https://www2.hm.com/en_in',
    tags: ['fashion', 'international', 'trendy']
  },
  {
    name: 'Zara',
    slug: 'zara',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fd/Zara_Logo.svg/200px-Zara_Logo.svg.png',
    description: 'Spanish fashion retailer',
    tier: 'exclusive',
    cashback: { percentage: 10, maxAmount: 500 },
    ratings: { average: 4.6, count: 900, successRate: 98 },
    categorySlug: 'fashion',
    badges: ['exclusive', 'premium'],
    isFeatured: true,
    externalUrl: 'https://www.zara.com/in',
    tags: ['fashion', 'luxury', 'international']
  },
  {
    name: 'Levi\'s',
    slug: 'levis',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/Levi%27s_logo.svg/200px-Levi%27s_logo.svg.png',
    description: 'Iconic American denim brand',
    tier: 'premium',
    cashback: { percentage: 10, maxAmount: 350 },
    ratings: { average: 4.5, count: 1500, successRate: 97 },
    categorySlug: 'fashion',
    badges: ['verified', 'top-rated'],
    externalUrl: 'https://www.levi.in',
    tags: ['denim', 'jeans', 'fashion']
  },
  {
    name: 'Max Fashion',
    slug: 'max-fashion',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/Max_Fashion_logo.svg/200px-Max_Fashion_logo.svg.png',
    description: 'Affordable fashion for the whole family',
    tier: 'standard',
    cashback: { percentage: 15, maxAmount: 200 },
    ratings: { average: 4.2, count: 2000, successRate: 94 },
    categorySlug: 'fashion',
    badges: ['verified'],
    externalUrl: 'https://www.maxfashion.in',
    tags: ['affordable', 'family', 'fashion']
  },

  // Beauty Brands
  {
    name: 'Nykaa',
    slug: 'nykaa',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Nykaa_logo.svg/200px-Nykaa_logo.svg.png',
    description: "India's leading beauty platform",
    tier: 'premium',
    cashback: { percentage: 10, maxAmount: 400 },
    ratings: { average: 4.7, count: 3000, successRate: 98 },
    categorySlug: 'beauty',
    badges: ['verified', 'top-rated', 'trending'],
    isFeatured: true,
    externalUrl: 'https://www.nykaa.com',
    tags: ['beauty', 'makeup', 'skincare', 'wellness']
  },
  {
    name: 'Purplle',
    slug: 'purplle',
    logo: 'https://cdn.purplle.com/static/logo/purplle-logo.png',
    description: 'Online beauty shopping destination',
    tier: 'standard',
    cashback: { percentage: 12, maxAmount: 300 },
    ratings: { average: 4.3, count: 1500, successRate: 95 },
    categorySlug: 'beauty',
    badges: ['verified'],
    externalUrl: 'https://www.purplle.com',
    tags: ['beauty', 'cosmetics', 'affordable']
  },
  {
    name: 'SUGAR Cosmetics',
    slug: 'sugar-cosmetics',
    logo: 'https://www.sugarcosmetics.com/cdn/shop/files/sugar-logo.png',
    description: 'Made for every Indian woman',
    tier: 'premium',
    cashback: { percentage: 15, maxAmount: 350 },
    ratings: { average: 4.5, count: 1800, successRate: 96 },
    categorySlug: 'beauty',
    badges: ['exclusive', 'verified'],
    isFeatured: true,
    isNewArrival: true,
    newUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    externalUrl: 'https://www.sugarcosmetics.com',
    tags: ['makeup', 'lipstick', 'indian brand']
  },
  {
    name: 'Mamaearth',
    slug: 'mamaearth',
    logo: 'https://images.mamaearth.in/mamaearth-logo.png',
    description: 'Toxin-free beauty and baby care',
    tier: 'premium',
    cashback: { percentage: 10, maxAmount: 250 },
    ratings: { average: 4.4, count: 2200, successRate: 95 },
    categorySlug: 'beauty',
    badges: ['verified', 'trending'],
    externalUrl: 'https://mamaearth.in',
    tags: ['organic', 'natural', 'skincare']
  },
  {
    name: 'Forest Essentials',
    slug: 'forest-essentials',
    logo: 'https://www.forestessentialsindia.com/media/logo.png',
    description: 'Luxurious Ayurveda',
    tier: 'luxury',
    cashback: { percentage: 8, maxAmount: 500 },
    ratings: { average: 4.8, count: 500, successRate: 99 },
    categorySlug: 'beauty',
    badges: ['premium', 'verified'],
    isLuxury: true,
    externalUrl: 'https://www.forestessentialsindia.com',
    tags: ['luxury', 'ayurveda', 'premium']
  },

  // Electronics Brands
  {
    name: 'Croma',
    slug: 'croma',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/Croma_logo.png/200px-Croma_logo.png',
    description: 'Tata electronics retail chain',
    tier: 'premium',
    cashback: { percentage: 5, maxAmount: 2000 },
    ratings: { average: 4.3, count: 1800, successRate: 96 },
    categorySlug: 'electronics',
    badges: ['verified', 'top-rated'],
    isFeatured: true,
    externalUrl: 'https://www.croma.com',
    tags: ['electronics', 'appliances', 'gadgets']
  },
  {
    name: 'boAt',
    slug: 'boat',
    logo: 'https://www.boat-lifestyle.com/cdn/shop/files/boAt_logo.png',
    description: "India's #1 audio brand",
    tier: 'standard',
    cashback: { percentage: 12, maxAmount: 300 },
    ratings: { average: 4.4, count: 5000, successRate: 94 },
    categorySlug: 'electronics',
    badges: ['verified', 'trending'],
    isFeatured: true,
    externalUrl: 'https://www.boat-lifestyle.com',
    tags: ['audio', 'headphones', 'earbuds']
  },
  {
    name: 'Noise',
    slug: 'noise',
    logo: 'https://www.gonoise.com/cdn/shop/files/Noise_Logo.png',
    description: 'Smart wearables and audio',
    tier: 'standard',
    cashback: { percentage: 10, maxAmount: 250 },
    ratings: { average: 4.2, count: 3000, successRate: 93 },
    categorySlug: 'electronics',
    badges: ['verified'],
    isNewArrival: true,
    newUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    externalUrl: 'https://www.gonoise.com',
    tags: ['smartwatch', 'wearables', 'audio']
  },

  // Home Brands
  {
    name: 'IKEA',
    slug: 'ikea',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Ikea_logo.svg/200px-Ikea_logo.svg.png',
    description: 'Swedish home furnishing retailer',
    tier: 'premium',
    cashback: { percentage: 8, maxAmount: 1000 },
    ratings: { average: 4.5, count: 1200, successRate: 97 },
    categorySlug: 'home',
    badges: ['premium', 'verified'],
    isFeatured: true,
    externalUrl: 'https://www.ikea.com/in',
    tags: ['furniture', 'home', 'decor']
  },
  {
    name: 'Pepperfry',
    slug: 'pepperfry',
    logo: 'https://www.pepperfry.com/images/pepperfry-logo.svg',
    description: "India's largest furniture marketplace",
    tier: 'premium',
    cashback: { percentage: 10, maxAmount: 1500 },
    ratings: { average: 4.3, count: 2000, successRate: 94 },
    categorySlug: 'home',
    badges: ['verified', 'top-rated'],
    externalUrl: 'https://www.pepperfry.com',
    tags: ['furniture', 'home decor', 'online']
  },
  {
    name: 'Urban Ladder',
    slug: 'urban-ladder',
    logo: 'https://www.urbanladder.com/images/ul-logo.svg',
    description: 'Premium furniture and home decor',
    tier: 'premium',
    cashback: { percentage: 12, maxAmount: 2000 },
    ratings: { average: 4.4, count: 1500, successRate: 95 },
    categorySlug: 'home',
    badges: ['premium', 'verified'],
    externalUrl: 'https://www.urbanladder.com',
    tags: ['furniture', 'premium', 'home']
  },

  // Lifestyle Brands
  {
    name: 'Decathlon',
    slug: 'decathlon',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Decathlon_Logo.png/200px-Decathlon_Logo.png',
    description: 'Sports for all',
    tier: 'standard',
    cashback: { percentage: 8, maxAmount: 400 },
    ratings: { average: 4.6, count: 3500, successRate: 97 },
    categorySlug: 'lifestyle',
    badges: ['verified', 'top-rated'],
    isFeatured: true,
    externalUrl: 'https://www.decathlon.in',
    tags: ['sports', 'fitness', 'outdoor']
  },
  {
    name: 'The Souled Store',
    slug: 'the-souled-store',
    logo: 'https://www.thesouledstore.com/static/images/tss-logo.png',
    description: 'Pop culture merchandise',
    tier: 'standard',
    cashback: { percentage: 12, maxAmount: 200 },
    ratings: { average: 4.4, count: 2800, successRate: 95 },
    categorySlug: 'lifestyle',
    badges: ['verified', 'trending'],
    isFeatured: true,
    isNewArrival: true,
    newUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    externalUrl: 'https://www.thesouledstore.com',
    tags: ['pop culture', 'tshirts', 'fandom']
  },
  {
    name: 'Bewakoof',
    slug: 'bewakoof',
    logo: 'https://www.bewakoof.com/images/logo.png',
    description: 'Fun and quirky fashion',
    tier: 'standard',
    cashback: { percentage: 15, maxAmount: 150 },
    ratings: { average: 4.2, count: 4000, successRate: 93 },
    categorySlug: 'lifestyle',
    badges: ['verified'],
    externalUrl: 'https://www.bewakoof.com',
    tags: ['casual', 'quirky', 'affordable']
  },

  // Wellness Brands
  {
    name: '1mg',
    slug: '1mg',
    logo: 'https://1mg.com/images/1mg-logo.png',
    description: "India's leading health platform",
    tier: 'premium',
    cashback: { percentage: 10, maxAmount: 200 },
    ratings: { average: 4.5, count: 5000, successRate: 98 },
    categorySlug: 'wellness',
    badges: ['verified', 'top-rated'],
    isFeatured: true,
    externalUrl: 'https://www.1mg.com',
    tags: ['pharmacy', 'health', 'medicines']
  },
  {
    name: 'PharmEasy',
    slug: 'pharmeasy',
    logo: 'https://assets.pharmeasy.in/apothecary/images/logo.svg',
    description: 'Reliable healthcare platform',
    tier: 'premium',
    cashback: { percentage: 8, maxAmount: 150 },
    ratings: { average: 4.4, count: 4500, successRate: 97 },
    categorySlug: 'wellness',
    badges: ['verified'],
    externalUrl: 'https://pharmeasy.in',
    tags: ['pharmacy', 'healthcare', 'medicines']
  },
  {
    name: 'Healthkart',
    slug: 'healthkart',
    logo: 'https://www.healthkart.com/images/hk-logo.svg',
    description: 'Health and nutrition supplements',
    tier: 'standard',
    cashback: { percentage: 12, maxAmount: 300 },
    ratings: { average: 4.3, count: 3000, successRate: 95 },
    categorySlug: 'wellness',
    badges: ['verified', 'trending'],
    externalUrl: 'https://www.healthkart.com',
    tags: ['supplements', 'protein', 'vitamins']
  },
  {
    name: 'Cult.fit',
    slug: 'cultfit',
    logo: 'https://www.cult.fit/images/cult-logo.png',
    description: 'Fitness and wellness platform',
    tier: 'premium',
    cashback: { percentage: 10, maxAmount: 250 },
    ratings: { average: 4.6, count: 2000, successRate: 96 },
    categorySlug: 'wellness',
    badges: ['premium', 'verified'],
    isNewArrival: true,
    newUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    externalUrl: 'https://www.cult.fit',
    tags: ['fitness', 'gym', 'health']
  },

  // Luxury Brands
  {
    name: 'Tata CLiQ Luxury',
    slug: 'tata-cliq-luxury',
    logo: 'https://www.tatacliq.com/images/cliq-luxury-logo.png',
    description: 'Premium luxury shopping destination',
    tier: 'luxury',
    cashback: { percentage: 5, maxAmount: 5000 },
    ratings: { average: 4.8, count: 300, successRate: 99 },
    categorySlug: 'luxury',
    badges: ['premium', 'verified', 'exclusive'],
    isFeatured: true,
    isLuxury: true,
    externalUrl: 'https://luxury.tatacliq.com',
    tags: ['luxury', 'premium', 'fashion']
  },
  {
    name: 'The Collective',
    slug: 'the-collective',
    logo: 'https://www.thecollective.in/images/tc-logo.png',
    description: 'International luxury fashion',
    tier: 'luxury',
    cashback: { percentage: 6, maxAmount: 3000 },
    ratings: { average: 4.7, count: 200, successRate: 98 },
    categorySlug: 'luxury',
    badges: ['premium', 'exclusive'],
    isLuxury: true,
    externalUrl: 'https://www.thecollective.in',
    tags: ['luxury', 'international', 'fashion']
  }
];

// Banners
const bannersData = [
  {
    title: 'Extra ReZ Coins on Mall Brands',
    subtitle: 'Earn up to 20% cashback + bonus coins',
    badge: 'Limited Time',
    image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800',
    backgroundColor: '#00C06A',
    gradientColors: ['#00C06A', '#059669', '#047857'],
    textColor: '#FFFFFF',
    ctaText: 'Shop Now',
    ctaAction: 'navigate',
    position: 'hero',
    priority: 10,
    validFrom: new Date(),
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  },
  {
    title: 'Premium Brands, Exclusive Offers',
    subtitle: 'Discover curated collections',
    badge: 'Exclusive',
    image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800',
    backgroundColor: '#8B5CF6',
    gradientColors: ['#8B5CF6', '#7C3AED', '#6D28D9'],
    textColor: '#FFFFFF',
    ctaText: 'Explore',
    ctaAction: 'navigate',
    position: 'hero',
    priority: 8,
    validFrom: new Date(),
    validUntil: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
  },
  {
    title: 'Fashion Sale',
    subtitle: 'Up to 50% off on top brands',
    badge: 'Sale',
    image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800',
    backgroundColor: '#F472B6',
    gradientColors: ['#F472B6', '#EC4899', '#DB2777'],
    textColor: '#FFFFFF',
    ctaText: 'Shop Fashion',
    ctaAction: 'category',
    position: 'hero',
    priority: 6,
    validFrom: new Date(),
    validUntil: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
  }
];

// ==================== SEED FUNCTION ====================

async function seedMallData() {
  try {
    // Connect to MongoDB
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    console.log('🗑️ Clearing existing mall data...');
    await Promise.all([
      MallCategory.deleteMany({}),
      MallCollection.deleteMany({}),
      MallBrand.deleteMany({}),
      MallOffer.deleteMany({}),
      MallBanner.deleteMany({})
    ]);
    console.log('✅ Existing data cleared');

    // Seed categories
    console.log('📂 Seeding categories...');
    const categories = await MallCategory.insertMany(categoriesData);
    const categoryMap = new Map(categories.map(c => [c.slug, c._id]));
    console.log(`✅ Created ${categories.length} categories`);

    // Seed collections
    console.log('📚 Seeding collections...');
    const collections = await MallCollection.insertMany(collectionsData);
    const collectionMap = new Map(collections.map(c => [c.slug, c._id]));
    console.log(`✅ Created ${collections.length} collections`);

    // Seed brands with category references
    console.log('🏪 Seeding brands...');
    const brandsWithRefs = brandsData.map(brand => ({
      ...brand,
      mallCategory: categoryMap.get(brand.categorySlug),
      collections: brand.tier === 'premium' || brand.tier === 'exclusive'
        ? [collectionMap.get('premium-picks')]
        : brand.tier === 'luxury'
          ? [collectionMap.get('premium-picks')]
          : [collectionMap.get('daily-essentials')],
      ratings: {
        ...brand.ratings,
        distribution: {
          5: Math.floor(brand.ratings.count * 0.6),
          4: Math.floor(brand.ratings.count * 0.25),
          3: Math.floor(brand.ratings.count * 0.1),
          2: Math.floor(brand.ratings.count * 0.03),
          1: Math.floor(brand.ratings.count * 0.02)
        }
      }
    }));
    // Remove categorySlug before inserting
    const cleanBrands = brandsWithRefs.map(({ categorySlug, ...rest }) => rest);
    const brands = await MallBrand.insertMany(cleanBrands);
    const brandMap = new Map(brands.map(b => [b.slug, b._id]));
    console.log(`✅ Created ${brands.length} brands`);

    // Update category brand counts
    console.log('📊 Updating category brand counts...');
    for (const category of categories) {
      const count = await MallBrand.countDocuments({ mallCategory: category._id, isActive: true });
      await MallCategory.findByIdAndUpdate(category._id, { brandCount: count });
    }
    console.log('✅ Category brand counts updated');

    // Seed offers
    console.log('🎁 Seeding offers...');
    const offersData = [
      {
        title: 'H&M Fashion Sale',
        subtitle: 'Get 40% off + Extra 500 ReZ Coins',
        image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=600',
        brand: brandMap.get('hm'),
        offerType: 'combo',
        value: 40,
        valueType: 'percentage',
        extraCoins: 500,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isMallExclusive: true,
        badge: 'mall-exclusive',
        priority: 10
      },
      {
        title: 'Nykaa Beauty Fest',
        subtitle: 'Up to 50% off on premium brands',
        image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600',
        brand: brandMap.get('nykaa'),
        offerType: 'discount',
        value: 50,
        valueType: 'percentage',
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        isMallExclusive: true,
        badge: 'limited-time',
        priority: 9
      },
      {
        title: 'boAt Audio Days',
        subtitle: 'Flat ₹500 off on all products',
        image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600',
        brand: brandMap.get('boat'),
        offerType: 'discount',
        value: 500,
        valueType: 'fixed',
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        isMallExclusive: false,
        badge: 'flash-sale',
        priority: 8
      },
      {
        title: 'IKEA Home Makeover',
        subtitle: '15% cashback on all purchases',
        image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600',
        brand: brandMap.get('ikea'),
        offerType: 'cashback',
        value: 15,
        valueType: 'percentage',
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
        isMallExclusive: true,
        badge: 'mall-exclusive',
        priority: 7
      },
      {
        title: 'Decathlon Sports Sale',
        subtitle: 'Buy 2 Get 1 Free',
        image: 'https://images.unsplash.com/photo-1461896836934- voices-of-spring?w=600',
        brand: brandMap.get('decathlon'),
        offerType: 'combo',
        value: 33,
        valueType: 'percentage',
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        isMallExclusive: false,
        badge: 'best-deal',
        priority: 6
      }
    ];
    const offers = await MallOffer.insertMany(offersData);
    console.log(`✅ Created ${offers.length} offers`);

    // Seed banners
    console.log('🖼️ Seeding banners...');
    const banners = await MallBanner.insertMany(bannersData);
    console.log(`✅ Created ${banners.length} banners`);

    // Summary
    console.log('\n========================================');
    console.log('🎉 Mall data seeding completed!');
    console.log('========================================');
    console.log(`📂 Categories: ${categories.length}`);
    console.log(`📚 Collections: ${collections.length}`);
    console.log(`🏪 Brands: ${brands.length}`);
    console.log(`🎁 Offers: ${offers.length}`);
    console.log(`🖼️ Banners: ${banners.length}`);
    console.log('========================================\n');

  } catch (error) {
    console.error('❌ Error seeding mall data:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the seed function
seedMallData()
  .then(() => {
    console.log('✅ Seeding script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seeding script failed:', error);
    process.exit(1);
  });
