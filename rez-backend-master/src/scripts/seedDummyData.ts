/**
 * Seed Dummy Data Script
 * Populates the database with dummy stores, products, and offers
 * for ALL 12 categories and 89 subcategories.
 *
 * Usage:
 *   npx ts-node -r dotenv/config src/scripts/seedDummyData.ts
 *
 * Creates:
 *   - 12 parent categories
 *   - 5 stores per subcategory (~445 total)
 *   - 5 products per store (~2,225 total)
 *   - 3 offers per store (~1,335 total)
 */

import mongoose, { Types } from 'mongoose';
import dotenv from 'dotenv';
import { logger } from '../config/logger';

dotenv.config();

// ─── DB connection ────────────────────────────────────────────────────────────

async function connectDB(): Promise<void> {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/rez-app';
  const dbName = process.env.DB_NAME || 'rez-app';
  await mongoose.connect(uri, { dbName });
  logger.info(`Connected to MongoDB: ${dbName}`);
}

// ─── Category data ────────────────────────────────────────────────────────────

interface SubcategoryDef {
  slug: string;
  name: string;
}

interface CategoryDef {
  slug: string;
  name: string;
  type: 'going_out' | 'home_delivery' | 'earn' | 'play' | 'general';
  subcategories: SubcategoryDef[];
  offerCategory: 'food' | 'fashion' | 'electronics' | 'beauty' | 'wellness' | 'entertainment' | 'general';
  products: string[];
}

const CATEGORIES: CategoryDef[] = [
  {
    slug: 'food-dining',
    name: 'Food & Dining',
    type: 'going_out',
    offerCategory: 'food',
    products: ['Butter Chicken', 'Masala Dosa', 'Paneer Tikka', 'Biryani', 'Filter Coffee'],
    subcategories: [
      { slug: 'cafes', name: 'Cafés' },
      { slug: 'qsr-fast-food', name: 'QSR / Fast Food' },
      { slug: 'family-restaurants', name: 'Family Restaurants' },
      { slug: 'fine-dining', name: 'Fine Dining' },
      { slug: 'ice-cream-dessert', name: 'Ice Cream & Dessert' },
      { slug: 'bakery-confectionery', name: 'Bakery & Confectionery' },
      { slug: 'cloud-kitchens', name: 'Cloud Kitchens' },
      { slug: 'street-food', name: 'Street Food' },
    ],
  },
  {
    slug: 'grocery-essentials',
    name: 'Grocery & Essentials',
    type: 'home_delivery',
    offerCategory: 'general',
    products: ['Basmati Rice 5kg', 'Toor Dal 1kg', 'Fresh Tomatoes', 'Amul Butter', 'Atta 10kg'],
    subcategories: [
      { slug: 'supermarkets', name: 'Supermarkets' },
      { slug: 'kirana-stores', name: 'Kirana Stores' },
      { slug: 'fresh-vegetables', name: 'Fresh Vegetables' },
      { slug: 'meat-fish', name: 'Meat & Fish' },
      { slug: 'dairy', name: 'Dairy' },
      { slug: 'packaged-goods', name: 'Packaged Goods' },
      { slug: 'water-cans', name: 'Water Cans' },
    ],
  },
  {
    slug: 'beauty-wellness',
    name: 'Beauty & Wellness',
    type: 'going_out',
    offerCategory: 'beauty',
    products: ['Haircut', 'Facial', 'Manicure', 'Hair Spa', 'Threading'],
    subcategories: [
      { slug: 'salons', name: 'Salons' },
      { slug: 'spa-massage', name: 'Spa & Massage' },
      { slug: 'beauty-services', name: 'Beauty Services' },
      { slug: 'cosmetology', name: 'Cosmetology' },
      { slug: 'dermatology', name: 'Dermatology' },
      { slug: 'skincare-cosmetics', name: 'Skincare & Cosmetics' },
      { slug: 'nail-studios', name: 'Nail Studios' },
      { slug: 'grooming-men', name: 'Grooming for Men' },
    ],
  },
  {
    slug: 'healthcare',
    name: 'Healthcare',
    type: 'going_out',
    offerCategory: 'wellness',
    products: ['Consultation', 'Blood Test', 'Dental Checkup', 'X-Ray', 'Physio Session'],
    subcategories: [
      { slug: 'pharmacy', name: 'Pharmacy' },
      { slug: 'clinics', name: 'Clinics' },
      { slug: 'diagnostics', name: 'Diagnostics' },
      { slug: 'dental', name: 'Dental' },
      { slug: 'physiotherapy', name: 'Physiotherapy' },
      { slug: 'home-nursing', name: 'Home Nursing' },
      { slug: 'vision-eyewear', name: 'Vision & Eyewear' },
    ],
  },
  {
    slug: 'fashion',
    name: 'Fashion',
    type: 'going_out',
    offerCategory: 'fashion',
    products: ["Men's T-Shirt", "Women's Kurti", 'Sneakers', 'Sunglasses', 'Leather Belt'],
    subcategories: [
      { slug: 'footwear', name: 'Footwear' },
      { slug: 'bags-accessories', name: 'Bags & Accessories' },
      { slug: 'mobile-accessories', name: 'Mobile Accessories' },
      { slug: 'watches', name: 'Watches' },
      { slug: 'jewelry', name: 'Jewelry' },
      { slug: 'local-brands', name: 'Local Brands' },
    ],
  },
  {
    slug: 'fitness-sports',
    name: 'Fitness & Sports',
    type: 'going_out',
    offerCategory: 'wellness',
    products: ['Monthly Membership', 'Personal Training', 'Yoga Class', 'CrossFit Pack', 'Zumba Session'],
    subcategories: [
      { slug: 'gyms', name: 'Gyms' },
      { slug: 'crossfit', name: 'CrossFit' },
      { slug: 'yoga', name: 'Yoga' },
      { slug: 'zumba', name: 'Zumba' },
      { slug: 'martial-arts', name: 'Martial Arts' },
      { slug: 'sports-academies', name: 'Sports Academies' },
      { slug: 'sportswear', name: 'Sportswear' },
    ],
  },
  {
    slug: 'education-learning',
    name: 'Education & Learning',
    type: 'going_out',
    offerCategory: 'general',
    products: ['JEE Coaching', 'Guitar Class', 'Dance Class', 'Art Workshop', 'Language Course'],
    subcategories: [
      { slug: 'coaching-centers', name: 'Coaching Centers' },
      { slug: 'skill-development', name: 'Skill Development' },
      { slug: 'music-dance-classes', name: 'Music/Dance Classes' },
      { slug: 'art-craft', name: 'Art & Craft' },
      { slug: 'vocational', name: 'Vocational' },
      { slug: 'language-training', name: 'Language Training' },
    ],
  },
  {
    slug: 'home-services',
    name: 'Home Services',
    type: 'home_delivery',
    offerCategory: 'general',
    products: ['AC Service', 'Plumbing Fix', 'Deep Cleaning', 'Pest Control', 'Electrical Repair'],
    subcategories: [
      { slug: 'ac-repair', name: 'AC Repair' },
      { slug: 'plumbing', name: 'Plumbing' },
      { slug: 'electrical', name: 'Electrical' },
      { slug: 'cleaning', name: 'Cleaning' },
      { slug: 'pest-control', name: 'Pest Control' },
      { slug: 'house-shifting', name: 'House Shifting' },
      { slug: 'laundry-dry-cleaning', name: 'Laundry & Dry Cleaning' },
      { slug: 'home-tutors', name: 'Home Tutors' },
    ],
  },
  {
    slug: 'travel-experiences',
    name: 'Travel & Experiences',
    type: 'earn',
    offerCategory: 'general',
    products: ['Hotel Night', 'Cab Ride', 'Bike Rental', 'City Tour', 'Weekend Package'],
    subcategories: [
      { slug: 'hotels', name: 'Hotels' },
      { slug: 'intercity-travel', name: 'Intercity Travel' },
      { slug: 'taxis', name: 'Taxis' },
      { slug: 'bike-rentals', name: 'Bike Rentals' },
      { slug: 'weekend-getaways', name: 'Weekend Getaways' },
      { slug: 'tours', name: 'Tours' },
      { slug: 'activities', name: 'Activities' },
    ],
  },
  {
    slug: 'entertainment',
    name: 'Entertainment',
    type: 'going_out',
    offerCategory: 'entertainment',
    products: ['Movie Ticket', 'Event Pass', 'Gaming Session', 'VR Experience', 'Workshop Pass'],
    subcategories: [
      { slug: 'movies', name: 'Movies' },
      { slug: 'live-events', name: 'Live Events' },
      { slug: 'festivals', name: 'Festivals' },
      { slug: 'workshops', name: 'Workshops' },
      { slug: 'amusement-parks', name: 'Amusement Parks' },
      { slug: 'gaming-cafes', name: 'Gaming Cafés' },
      { slug: 'vr-ar-experiences', name: 'VR/AR Experiences' },
    ],
  },
  {
    slug: 'financial-lifestyle',
    name: 'Financial Lifestyle',
    type: 'earn',
    offerCategory: 'general',
    products: ['Mobile Recharge', 'Broadband Bill', 'Insurance Premium', 'Gold 1g', 'Donation'],
    subcategories: [
      { slug: 'bill-payments', name: 'Bill Payments' },
      { slug: 'mobile-recharge', name: 'Mobile Recharge' },
      { slug: 'broadband', name: 'Broadband' },
      { slug: 'cable-ott', name: 'Cable/OTT' },
      { slug: 'insurance', name: 'Insurance' },
      { slug: 'gold-savings', name: 'Gold Savings' },
      { slug: 'donations', name: 'Donations' },
    ],
  },
  {
    slug: 'electronics',
    name: 'Electronics',
    type: 'going_out',
    offerCategory: 'electronics',
    products: ['iPhone Case', 'Laptop Bag', 'HDMI Cable', 'Wireless Mouse', 'USB Hub'],
    subcategories: [
      { slug: 'mobile-phones', name: 'Mobile Phones' },
      { slug: 'laptops', name: 'Laptops' },
      { slug: 'televisions', name: 'Televisions' },
      { slug: 'cameras', name: 'Cameras' },
      { slug: 'audio-headphones', name: 'Audio & Headphones' },
      { slug: 'gaming', name: 'Gaming' },
      { slug: 'accessories', name: 'Accessories' },
      { slug: 'smartwatches', name: 'Smartwatches' },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randInt(min: number, max: number): number {
  return Math.floor(rand(min, max + 1));
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

/** Bangalore-centred random coordinates */
function randomCoords(): [number, number] {
  return [
    parseFloat((77.5946 + (Math.random() - 0.5) * 0.1).toFixed(6)),
    parseFloat((12.9716 + (Math.random() - 0.5) * 0.1).toFixed(6)),
  ];
}

const BANGALORE_AREAS = [
  'Koramangala',
  'Indiranagar',
  'HSR Layout',
  'Whitefield',
  'Jayanagar',
  'JP Nagar',
  'Marathahalli',
  'Electronic City',
  'BTM Layout',
  'Bannerghatta Road',
  'Rajajinagar',
  'Malleshwaram',
  'Yelahanka',
  'Hebbal',
  'Sarjapur Road',
];

const STANDARD_HOURS = {
  monday: { open: '09:00', close: '22:00', closed: false },
  tuesday: { open: '09:00', close: '22:00', closed: false },
  wednesday: { open: '09:00', close: '22:00', closed: false },
  thursday: { open: '09:00', close: '22:00', closed: false },
  friday: { open: '09:00', close: '22:00', closed: false },
  saturday: { open: '09:00', close: '23:00', closed: false },
  sunday: { open: '10:00', close: '22:00', closed: false },
};

// ─── Mongoose models (raw, bypassing full model imports to avoid side effects) ─

// We import the models here so Mongoose registers them before we use them.
// This also ensures schema validators run correctly.

async function loadModels() {
  // Dynamic imports so ts-node resolves correctly relative to this file location
  const { Category } = await import('../models/Category');
  const { Store } = await import('../models/Store');
  const { Product } = await import('../models/Product');
  const Offer = (await import('../models/Offer')).default;
  return { Category, Store, Product, Offer };
}

// ─── Seed logic ───────────────────────────────────────────────────────────────

async function seedCategories(Category: any): Promise<Map<string, Types.ObjectId>> {
  logger.info('\n[1/4] Seeding categories...');
  const categoryIdMap = new Map<string, Types.ObjectId>();

  for (const catDef of CATEGORIES) {
    // Upsert parent category
    let parent = await Category.findOne({ slug: catDef.slug });
    if (!parent) {
      parent = await Category.create({
        name: catDef.name,
        slug: catDef.slug,
        type: catDef.type,
        isActive: true,
        sortOrder: CATEGORIES.indexOf(catDef),
        metadata: {
          color: '#1a3a52',
          tags: [catDef.slug],
          featured: true,
        },
        productCount: 0,
        storeCount: 0,
        isBestDiscount: false,
        isBestSeller: false,
        maxCashback: 20,
      });
      logger.info(`  Created parent category: ${catDef.name}`);
    } else {
      logger.info(`  Found parent category: ${catDef.name}`);
    }

    categoryIdMap.set(catDef.slug, parent._id);

    // Upsert subcategories
    for (const subDef of catDef.subcategories) {
      let sub = await Category.findOne({ slug: subDef.slug });
      if (!sub) {
        sub = await Category.create({
          name: subDef.name,
          slug: subDef.slug,
          type: catDef.type,
          parentCategory: parent._id,
          isActive: true,
          sortOrder: catDef.subcategories.indexOf(subDef),
          metadata: {
            color: '#1a3a52',
            tags: [subDef.slug],
          },
          productCount: 0,
          storeCount: 0,
          isBestDiscount: false,
          isBestSeller: false,
          maxCashback: 15,
        });
      }
      categoryIdMap.set(subDef.slug, sub._id);
    }
  }

  const total = await Category.countDocuments();
  logger.info(`  Categories in DB: ${total}`);
  return categoryIdMap;
}

// ─── Stores ───────────────────────────────────────────────────────────────────

interface StoreRecord {
  _id: Types.ObjectId;
  name: string;
  logo: string;
  rating: number;
  coords: [number, number];
  categorySlug: string;
  offerCategory: string;
  categoryId: Types.ObjectId;
}

async function seedStores(Store: any, categoryIdMap: Map<string, Types.ObjectId>): Promise<StoreRecord[]> {
  logger.info('\n[2/4] Seeding stores...');

  const allStoreRecords: StoreRecord[] = [];
  const batchSize = 100;
  let batch: any[] = [];
  let totalCreated = 0;

  for (const catDef of CATEGORIES) {
    const parentCatId = categoryIdMap.get(catDef.slug)!;

    for (const subDef of catDef.subcategories) {
      const subCatId = categoryIdMap.get(subDef.slug)!;

      for (let i = 1; i <= 5; i++) {
        const storeName = `${subDef.name} Store ${i}`;
        const baseSlug = slugify(`${subDef.name} Store ${i}`);
        // Make slug globally unique by appending subcategory prefix
        const storeSlug = `${subDef.slug}-store-${i}`;
        const area = BANGALORE_AREAS[randInt(0, BANGALORE_AREAS.length - 1)];
        const coords = randomCoords();
        const rating = parseFloat((3.5 + Math.random() * 1.5).toFixed(1));

        // Check if already exists
        const existing = await Store.findOne({ slug: storeSlug });
        if (existing) {
          allStoreRecords.push({
            _id: existing._id,
            name: existing.name,
            logo: existing.logo || '',
            rating,
            coords,
            categorySlug: catDef.slug,
            offerCategory: catDef.offerCategory,
            categoryId: parentCatId,
          });
          continue;
        }

        const logo = `https://ui-avatars.com/api/?name=${encodeURIComponent(storeName)}&background=1a3a52&color=FFC857&size=128`;

        const storeDoc = {
          name: storeName,
          slug: storeSlug,
          description: `Best ${subDef.name} in Bangalore. Serving quality products and services in ${area}.`,
          logo,
          image: logo,
          category: parentCatId,
          subCategories: [subCatId],
          location: {
            address: `${randInt(1, 500)}, ${area}, Bangalore`,
            city: 'Bangalore',
            state: 'Karnataka',
            pincode: `56000${randInt(1, 9)}`,
            coordinates: coords,
            deliveryRadius: 5,
          },
          contact: {
            phone: `+91${randInt(7000000000, 9999999999)}`,
            email: `${storeSlug}@example.com`,
          },
          ratings: {
            average: rating,
            count: randInt(10, 500),
            distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
          },
          offers: {
            isPartner: true,
            cashback: randInt(5, 20),
            partnerLevel: ['bronze', 'silver', 'gold'][randInt(0, 2)] as 'bronze' | 'silver' | 'gold',
          },
          operationalInfo: {
            hours: STANDARD_HOURS,
            deliveryTime: '30-45 mins',
            minimumOrder: randInt(0, 200),
            deliveryFee: randInt(0, 50),
            acceptsWalletPayment: true,
            paymentMethods: ['upi', 'card', 'wallet', 'cash'],
          },
          deliveryCategories: {
            fastDelivery: Math.random() > 0.6,
            budgetFriendly: Math.random() > 0.5,
            ninetyNineStore: false,
            premium: Math.random() > 0.7,
            organic: false,
            alliance: false,
            lowestPrice: false,
            mall: false,
            cashStore: false,
          },
          analytics: {
            totalOrders: randInt(0, 2000),
            totalRevenue: randInt(0, 500000),
            avgOrderValue: randInt(100, 1000),
            repeatCustomers: randInt(0, 500),
            followersCount: randInt(0, 1000),
          },
          tags: [subDef.slug, catDef.slug, 'bangalore', area.toLowerCase().replace(/\s/g, '-')],
          isActive: true,
          isFeatured: Math.random() > 0.8,
          isVerified: true,
          adminApproved: true,
        };

        // Store the record info for later use (products/offers)
        const newId = new Types.ObjectId();
        (storeDoc as any)._id = newId;

        batch.push(storeDoc);
        allStoreRecords.push({
          _id: newId,
          name: storeName,
          logo,
          rating,
          coords,
          categorySlug: catDef.slug,
          offerCategory: catDef.offerCategory,
          categoryId: parentCatId,
        });

        if (batch.length >= batchSize) {
          await Store.insertMany(batch, { ordered: false });
          totalCreated += batch.length;
          logger.info(`  Inserted ${totalCreated} stores so far...`);
          batch = [];
        }
      }
    }
  }

  // Flush remaining
  if (batch.length > 0) {
    await Store.insertMany(batch, { ordered: false });
    totalCreated += batch.length;
  }

  const total = await Store.countDocuments();
  logger.info(`  Total stores in DB: ${total} (inserted this run: ${totalCreated})`);
  return allStoreRecords;
}

// ─── Products ─────────────────────────────────────────────────────────────────

async function seedProducts(
  Product: any,
  storeRecords: StoreRecord[],
  categoryIdMap: Map<string, Types.ObjectId>,
): Promise<void> {
  logger.info('\n[3/4] Seeding products...');

  // Build category → product names map
  const productNamesMap: Record<string, string[]> = {};
  for (const catDef of CATEGORIES) {
    productNamesMap[catDef.slug] = catDef.products;
  }

  // Determine which store IDs already have products (to skip re-seeding)
  const existingStoreIdsWithProducts: Set<string> = new Set();
  const existingProducts = await Product.find({}, { store: 1 }).lean();
  for (const p of existingProducts) {
    existingStoreIdsWithProducts.add(p.store.toString());
  }

  const batchSize = 200;
  let batch: any[] = [];
  let totalCreated = 0;
  const slugSet = new Set<string>();

  // Load existing slugs to avoid duplicates
  const existingSlugs = await Product.find({}, { slug: 1 }).lean();
  for (const p of existingSlugs) {
    slugSet.add(p.slug);
  }

  for (const storeRecord of storeRecords) {
    if (existingStoreIdsWithProducts.has(storeRecord._id.toString())) {
      continue; // Already has products
    }

    const catId = storeRecord.categoryId;
    const productNames = productNamesMap[storeRecord.categorySlug] || [
      'Product A',
      'Product B',
      'Product C',
      'Product D',
      'Product E',
    ];

    for (let i = 0; i < 5; i++) {
      const productName = productNames[i % productNames.length];
      const basePrice = randInt(50, 2000);
      const sellingPrice = parseFloat((basePrice * rand(0.7, 1.0)).toFixed(2));
      const discountPct = parseFloat((((basePrice - sellingPrice) / basePrice) * 100).toFixed(1));

      // Create a unique slug
      let rawSlug = slugify(`${productName} ${storeRecord._id.toString().slice(-4)} ${i}`);
      let productSlug = rawSlug;
      let attempt = 0;
      while (slugSet.has(productSlug)) {
        attempt++;
        productSlug = `${rawSlug}-${attempt}`;
      }
      slugSet.add(productSlug);

      const skuBase = `SKU-${storeRecord._id.toString().slice(-6).toUpperCase()}-${i}`;

      const productDoc = {
        name: productName,
        slug: productSlug,
        description: `Delicious ${productName} from ${storeRecord.name}. Fresh and made to order.`,
        shortDescription: `${productName} by ${storeRecord.name}`,
        productType: 'product' as const,
        category: catId,
        store: storeRecord._id,
        sku: skuBase,
        images: [`https://placehold.co/300x200?text=${encodeURIComponent(productName)}`],
        pricing: {
          original: basePrice,
          selling: sellingPrice,
          discount: discountPct,
          currency: 'INR',
        },
        inventory: {
          stock: 100,
          isAvailable: true,
          unlimited: false,
          reservedStock: 0,
          lowStockThreshold: 5,
          allowBackorder: false,
        },
        ratings: {
          average: parseFloat((3 + Math.random() * 2).toFixed(1)),
          count: randInt(0, 200),
          distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        },
        specifications: [],
        tags: [storeRecord.categorySlug, 'bangalore'],
        seo: {},
        analytics: {
          views: randInt(0, 1000),
          purchases: randInt(0, 200),
          conversions: 0,
          wishlistAdds: 0,
          shareCount: 0,
          returnRate: 0,
          avgRating: 0,
        },
        isActive: true,
        isFeatured: false,
        isDigital: false,
        isDeleted: false,
        adminApproved: true,
      };

      batch.push(productDoc);

      if (batch.length >= batchSize) {
        await Product.insertMany(batch, { ordered: false });
        totalCreated += batch.length;
        logger.info(`  Inserted ${totalCreated} products so far...`);
        batch = [];
      }
    }
  }

  if (batch.length > 0) {
    await Product.insertMany(batch, { ordered: false });
    totalCreated += batch.length;
  }

  const total = await Product.countDocuments();
  logger.info(`  Total products in DB: ${total} (inserted this run: ${totalCreated})`);
}

// ─── Offers ───────────────────────────────────────────────────────────────────

async function seedOffers(Offer: any, storeRecords: StoreRecord[]): Promise<void> {
  logger.info('\n[4/4] Seeding offers...');

  // Determine stores that already have offers
  const storesWithOffers: Set<string> = new Set();
  const existingOffers = await Offer.find({}, { 'store.id': 1 }).lean();
  for (const o of existingOffers) {
    if (o.store?.id) {
      storesWithOffers.add(o.store.id.toString());
    }
  }

  const now = new Date();
  const endDate = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days

  // We need a system createdBy user id — use a placeholder ObjectId
  const systemUserId = new Types.ObjectId('000000000000000000000001');

  const batchSize = 150;
  let batch: any[] = [];
  let totalCreated = 0;

  for (const storeRecord of storeRecords) {
    if (storesWithOffers.has(storeRecord._id.toString())) {
      continue;
    }

    const coords = storeRecord.coords;
    const baseImage = `https://ui-avatars.com/api/?name=${encodeURIComponent(storeRecord.name)}&background=1a3a52&color=FFC857&size=300`;

    // Offer 1: Discount
    batch.push({
      title: `${randInt(10, 30)}% Off on All Items`,
      subtitle: 'Limited time offer',
      description: `Get ${randInt(10, 30)}% discount on all items at ${storeRecord.name}`,
      image: baseImage,
      category: storeRecord.offerCategory,
      type: 'discount',
      cashbackPercentage: randInt(10, 30),
      originalPrice: randInt(200, 2000),
      discountedPrice: randInt(100, 1800),
      location: {
        type: 'Point' as const,
        coordinates: coords,
      },
      store: {
        id: storeRecord._id,
        name: storeRecord.name,
        logo: storeRecord.logo,
        rating: storeRecord.rating,
        verified: true,
      },
      validity: {
        startDate: now,
        endDate,
        isActive: true,
      },
      engagement: {
        likesCount: randInt(0, 200),
        sharesCount: randInt(0, 50),
        viewsCount: randInt(10, 1000),
      },
      restrictions: {
        minOrderValue: randInt(0, 300),
        userTypeRestriction: 'all',
        applicableOn: ['both'],
      },
      eligibility: {
        rezPlusTiers: ['free', 'premium', 'vip'],
        priveTiers: ['none', 'entry', 'signature', 'elite'],
        requiredZones: [],
        requireAll: false,
      },
      metadata: {
        isNew: true,
        isTrending: Math.random() > 0.7,
        isBestSeller: false,
        isSpecial: false,
        priority: randInt(0, 10),
        tags: [storeRecord.categorySlug, 'discount', 'bangalore'],
        featured: Math.random() > 0.8,
        flashSale: { isActive: false },
      },
      isFollowerExclusive: false,
      visibleTo: 'all',
      isFreeDelivery: false,
      deliveryFee: 0,
      redemptionCount: randInt(0, 100),
      adminApproved: true,
      isSuspended: false,
      createdBy: systemUserId,
    });

    // Offer 2: Cashback
    batch.push({
      title: `Flat ₹${randInt(30, 100)} Cashback`,
      subtitle: 'Use REZ Pay & earn cashback',
      description: `Get flat cashback on your next visit to ${storeRecord.name}`,
      image: baseImage,
      category: storeRecord.offerCategory,
      type: 'cashback',
      cashbackPercentage: 0,
      originalPrice: randInt(200, 1500),
      discountedPrice: randInt(150, 1400),
      location: {
        type: 'Point' as const,
        coordinates: coords,
      },
      store: {
        id: storeRecord._id,
        name: storeRecord.name,
        logo: storeRecord.logo,
        rating: storeRecord.rating,
        verified: true,
      },
      validity: {
        startDate: now,
        endDate,
        isActive: true,
      },
      engagement: {
        likesCount: randInt(0, 150),
        sharesCount: randInt(0, 30),
        viewsCount: randInt(10, 800),
      },
      restrictions: {
        minOrderValue: randInt(100, 500),
        maxDiscountAmount: randInt(50, 200),
        userTypeRestriction: 'all',
        applicableOn: ['both'],
      },
      eligibility: {
        rezPlusTiers: ['free', 'premium', 'vip'],
        priveTiers: ['none', 'entry', 'signature', 'elite'],
        requiredZones: [],
        requireAll: false,
      },
      metadata: {
        isNew: false,
        isTrending: false,
        isBestSeller: true,
        isSpecial: false,
        priority: randInt(0, 8),
        tags: [storeRecord.categorySlug, 'cashback', 'bangalore'],
        featured: false,
        flashSale: { isActive: false },
      },
      isFollowerExclusive: false,
      visibleTo: 'all',
      isFreeDelivery: false,
      deliveryFee: 0,
      redemptionCount: randInt(0, 80),
      adminApproved: true,
      isSuspended: false,
      createdBy: systemUserId,
    });

    // Offer 3: Voucher / BOGO
    batch.push({
      title: 'Buy 1 Get 1 Free',
      subtitle: 'Exclusive deal for REZ users',
      description: `Buy any item and get one free at ${storeRecord.name}. Valid on select products.`,
      image: baseImage,
      category: storeRecord.offerCategory,
      type: 'voucher',
      cashbackPercentage: 0,
      originalPrice: randInt(100, 1000),
      discountedPrice: randInt(50, 900),
      location: {
        type: 'Point' as const,
        coordinates: coords,
      },
      store: {
        id: storeRecord._id,
        name: storeRecord.name,
        logo: storeRecord.logo,
        rating: storeRecord.rating,
        verified: true,
      },
      validity: {
        startDate: now,
        endDate,
        isActive: true,
      },
      engagement: {
        likesCount: randInt(0, 300),
        sharesCount: randInt(0, 80),
        viewsCount: randInt(20, 1500),
      },
      restrictions: {
        minOrderValue: 0,
        userTypeRestriction: 'all',
        applicableOn: ['both'],
      },
      eligibility: {
        rezPlusTiers: ['free', 'premium', 'vip'],
        priveTiers: ['none', 'entry', 'signature', 'elite'],
        requiredZones: [],
        requireAll: false,
      },
      metadata: {
        isNew: false,
        isTrending: true,
        isBestSeller: false,
        isSpecial: true,
        priority: randInt(5, 15),
        tags: [storeRecord.categorySlug, 'bogo', 'voucher', 'bangalore'],
        featured: Math.random() > 0.7,
        flashSale: { isActive: false },
      },
      isFollowerExclusive: false,
      visibleTo: 'all',
      bogoType: 'buy1get1',
      bogoDetails: 'Buy any 1 item, get 1 of equal or lesser value free',
      isFreeDelivery: false,
      deliveryFee: 0,
      redemptionCount: randInt(0, 150),
      adminApproved: true,
      isSuspended: false,
      createdBy: systemUserId,
    });

    if (batch.length >= batchSize) {
      await Offer.insertMany(batch, { ordered: false });
      totalCreated += batch.length;
      logger.info(`  Inserted ${totalCreated} offers so far...`);
      batch = [];
    }
  }

  if (batch.length > 0) {
    await Offer.insertMany(batch, { ordered: false });
    totalCreated += batch.length;
  }

  const total = await Offer.countDocuments();
  logger.info(`  Total offers in DB: ${total} (inserted this run: ${totalCreated})`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  logger.info('=== REZ Dummy Data Seed Script ===');
  logger.info(`Target: 12 categories, 89 subcategories`);
  logger.info(`Expected: ~445 stores, ~2,225 products, ~1,335 offers\n`);

  await connectDB();

  const { Category, Store, Product, Offer } = await loadModels();

  // Guard: skip if already well-populated
  const existingStoreCount = await Store.countDocuments();
  if (existingStoreCount > 100) {
    logger.info(`\nDatabase already has ${existingStoreCount} stores.`);
    logger.info('Proceeding with incremental seed (skipping existing records)...\n');
  }

  // Step 1: Categories
  const categoryIdMap = await seedCategories(Category);

  // Step 2: Stores
  const storeRecords = await seedStores(Store, categoryIdMap);

  // Step 3: Products
  await seedProducts(Product, storeRecords, categoryIdMap);

  // Step 4: Offers
  await seedOffers(Offer, storeRecords);

  // Summary
  logger.info('\n=== Seed Complete ===');
  const [cats, stores, products, offers] = await Promise.all([
    Category.countDocuments(),
    Store.countDocuments(),
    Product.countDocuments(),
    Offer.countDocuments(),
  ]);

  logger.info(`Categories : ${cats}`);
  logger.info(`Stores     : ${stores}`);
  logger.info(`Products   : ${products}`);
  logger.info(`Offers     : ${offers}`);
  logger.info('=====================\n');

  await mongoose.disconnect();
  logger.info('Disconnected from MongoDB. Done.');
}

main().catch((err) => {
  logger.error('Seed script failed:', err);
  mongoose.disconnect().finally(() => process.exit(1));
});
