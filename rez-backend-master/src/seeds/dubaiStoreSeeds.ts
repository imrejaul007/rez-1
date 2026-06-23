/**
 * Dubai Store Seeds
 * Used for seeding Dubai region stores with realistic UAE brands
 */

import mongoose from 'mongoose';
import { Store } from '../models/Store';
import { Product } from '../models/Product';
import { Category } from '../models/Category';

// Helper to generate placeholder image URLs
const getPlaceholderImage = (category: string, id: number, width = 400, height = 300) =>
  `https://picsum.photos/seed/dubai-${category}${id}/${width}/${height}`;

// Store data structure matching the Store model
export interface DubaiStoreSeedData {
  _id: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  logo: string;
  category: string;
  rating: number;
  verified: boolean;
  description?: string;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
    address: string;
    city: string;
    state: string;
    country: string;
    pincode: string;
  };
  tags?: string[];
  offers?: {
    cashback: number;
    minOrderAmount: number;
    maxCashback: number;
  };
}

// Generate ObjectIds for Dubai stores
export const dubaiStoreIds = {
  // Supermarkets
  carrefour: new mongoose.Types.ObjectId(),
  lulu: new mongoose.Types.ObjectId(),
  spinneysMarket: new mongoose.Types.ObjectId(),
  unionCoop: new mongoose.Types.ObjectId(),

  // Electronics
  sharafDG: new mongoose.Types.ObjectId(),
  jumboElectronics: new mongoose.Types.ObjectId(),
  emax: new mongoose.Types.ObjectId(),

  // Fashion
  centrepoint: new mongoose.Types.ObjectId(),
  maxFashion: new mongoose.Types.ObjectId(),
  splash: new mongoose.Types.ObjectId(),

  // Food & Restaurants
  shakeshack: new mongoose.Types.ObjectId(),
  texasRoadhouse: new mongoose.Types.ObjectId(),
  pbRChicken: new mongoose.Types.ObjectId(),
  saltBae: new mongoose.Types.ObjectId(),

  // Cafes
  timHortons: new mongoose.Types.ObjectId(),
  paulBakery: new mongoose.Types.ObjectId(),

  // Jewelry
  damasDubai: new mongoose.Types.ObjectId(),
  joyalukkas: new mongoose.Types.ObjectId(),

  // Home & Living
  homeCentre: new mongoose.Types.ObjectId(),
  panEmirates: new mongoose.Types.ObjectId(),
};

// Dubai Mall coordinates
const DUBAI_MALL_COORDS: [number, number] = [55.2796, 25.1972];
const MALL_OF_EMIRATES_COORDS: [number, number] = [55.2006, 25.1181];
const DUBAI_MARINA_COORDS: [number, number] = [55.1410, 25.0805];
const DEIRA_CITY_COORDS: [number, number] = [55.3333, 25.2700];

export const dubaiStoreSeeds: DubaiStoreSeedData[] = [
  // Supermarkets
  {
    _id: dubaiStoreIds.carrefour,
    name: 'Carrefour',
    slug: 'carrefour-dubai',
    logo: getPlaceholderImage('carrefour', 1, 200, 200),
    category: 'Supermarket',
    rating: 4.5,
    verified: true,
    description: 'Your everyday hypermarket for groceries, electronics, and more',
    location: {
      type: 'Point',
      coordinates: DUBAI_MALL_COORDS,
      address: 'Dubai Mall, Financial Centre Road',
      city: 'Dubai',
      state: 'Dubai',
      country: 'United Arab Emirates',
      pincode: '123456',
    },
    tags: ['grocery', 'electronics', 'home', 'hypermarket'],
    offers: {
      cashback: 5,
      minOrderAmount: 100,
      maxCashback: 50,
    },
  },
  {
    _id: dubaiStoreIds.lulu,
    name: 'LuLu Hypermarket',
    slug: 'lulu-hypermarket-dubai',
    logo: getPlaceholderImage('lulu', 1, 200, 200),
    category: 'Supermarket',
    rating: 4.6,
    verified: true,
    description: "UAE's favorite hypermarket chain with everything under one roof",
    location: {
      type: 'Point',
      coordinates: DEIRA_CITY_COORDS,
      address: 'Al Barsha, Sheikh Zayed Road',
      city: 'Dubai',
      state: 'Dubai',
      country: 'United Arab Emirates',
      pincode: '345678',
    },
    tags: ['grocery', 'fresh', 'bakery', 'hypermarket'],
    offers: {
      cashback: 6,
      minOrderAmount: 80,
      maxCashback: 60,
    },
  },
  {
    _id: dubaiStoreIds.spinneysMarket,
    name: 'Spinneys',
    slug: 'spinneys-dubai',
    logo: getPlaceholderImage('spinneys', 1, 200, 200),
    category: 'Supermarket',
    rating: 4.4,
    verified: true,
    description: 'Premium supermarket with quality fresh produce',
    location: {
      type: 'Point',
      coordinates: DUBAI_MARINA_COORDS,
      address: 'Dubai Marina Mall',
      city: 'Dubai',
      state: 'Dubai',
      country: 'United Arab Emirates',
      pincode: '456789',
    },
    tags: ['grocery', 'premium', 'organic', 'fresh'],
    offers: {
      cashback: 4,
      minOrderAmount: 150,
      maxCashback: 40,
    },
  },

  // Electronics
  {
    _id: dubaiStoreIds.sharafDG,
    name: 'Sharaf DG',
    slug: 'sharaf-dg-dubai',
    logo: getPlaceholderImage('sharafdg', 1, 200, 200),
    category: 'Electronics',
    rating: 4.3,
    verified: true,
    description: 'Your electronics destination for the latest gadgets and appliances',
    location: {
      type: 'Point',
      coordinates: DUBAI_MALL_COORDS,
      address: 'Dubai Mall, Ground Floor',
      city: 'Dubai',
      state: 'Dubai',
      country: 'United Arab Emirates',
      pincode: '123456',
    },
    tags: ['electronics', 'gadgets', 'appliances', 'mobile'],
    offers: {
      cashback: 3,
      minOrderAmount: 500,
      maxCashback: 200,
    },
  },
  {
    _id: dubaiStoreIds.jumboElectronics,
    name: 'Jumbo Electronics',
    slug: 'jumbo-electronics-dubai',
    logo: getPlaceholderImage('jumbo', 1, 200, 200),
    category: 'Electronics',
    rating: 4.2,
    verified: true,
    description: 'Leading electronics retailer with the latest tech',
    location: {
      type: 'Point',
      coordinates: MALL_OF_EMIRATES_COORDS,
      address: 'Mall of the Emirates',
      city: 'Dubai',
      state: 'Dubai',
      country: 'United Arab Emirates',
      pincode: '234567',
    },
    tags: ['electronics', 'tech', 'computers', 'gaming'],
    offers: {
      cashback: 4,
      minOrderAmount: 400,
      maxCashback: 150,
    },
  },

  // Fashion
  {
    _id: dubaiStoreIds.centrepoint,
    name: 'Centrepoint',
    slug: 'centrepoint-dubai',
    logo: getPlaceholderImage('centrepoint', 1, 200, 200),
    category: 'Fashion',
    rating: 4.4,
    verified: true,
    description: 'Fashion for the whole family - clothing, shoes, and accessories',
    location: {
      type: 'Point',
      coordinates: DUBAI_MALL_COORDS,
      address: 'Dubai Mall, Level 2',
      city: 'Dubai',
      state: 'Dubai',
      country: 'United Arab Emirates',
      pincode: '123456',
    },
    tags: ['fashion', 'clothing', 'family', 'shoes'],
    offers: {
      cashback: 8,
      minOrderAmount: 200,
      maxCashback: 100,
    },
  },
  {
    _id: dubaiStoreIds.maxFashion,
    name: 'Max Fashion',
    slug: 'max-fashion-dubai',
    logo: getPlaceholderImage('max', 1, 200, 200),
    category: 'Fashion',
    rating: 4.3,
    verified: true,
    description: 'Affordable fashion for everyone',
    location: {
      type: 'Point',
      coordinates: MALL_OF_EMIRATES_COORDS,
      address: 'Mall of the Emirates, Level 1',
      city: 'Dubai',
      state: 'Dubai',
      country: 'United Arab Emirates',
      pincode: '234567',
    },
    tags: ['fashion', 'affordable', 'trendy', 'casual'],
    offers: {
      cashback: 10,
      minOrderAmount: 100,
      maxCashback: 80,
    },
  },

  // Food & Restaurants
  {
    _id: dubaiStoreIds.shakeshack,
    name: 'Shake Shack',
    slug: 'shakeshack-dubai',
    logo: getPlaceholderImage('shakeshack', 1, 200, 200),
    category: 'Restaurant',
    rating: 4.6,
    verified: true,
    description: 'Premium burgers, hot dogs, and frozen custard',
    location: {
      type: 'Point',
      coordinates: DUBAI_MALL_COORDS,
      address: 'Dubai Mall Food Court',
      city: 'Dubai',
      state: 'Dubai',
      country: 'United Arab Emirates',
      pincode: '123456',
    },
    tags: ['burgers', 'american', 'fast-casual', 'shakes'],
    offers: {
      cashback: 15,
      minOrderAmount: 50,
      maxCashback: 30,
    },
  },
  {
    _id: dubaiStoreIds.saltBae,
    name: "Nusr-Et Steakhouse",
    slug: 'nusret-dubai',
    logo: getPlaceholderImage('saltbae', 1, 200, 200),
    category: 'Restaurant',
    rating: 4.5,
    verified: true,
    description: 'Luxury steakhouse by Salt Bae',
    location: {
      type: 'Point',
      coordinates: [55.1892, 25.1054], // Four Seasons
      address: 'Four Seasons Resort, Jumeirah Beach',
      city: 'Dubai',
      state: 'Dubai',
      country: 'United Arab Emirates',
      pincode: '567890',
    },
    tags: ['steakhouse', 'luxury', 'fine-dining', 'premium'],
    offers: {
      cashback: 5,
      minOrderAmount: 500,
      maxCashback: 100,
    },
  },

  // Cafes
  {
    _id: dubaiStoreIds.timHortons,
    name: "Tim Hortons",
    slug: 'tim-hortons-dubai',
    logo: getPlaceholderImage('timhortons', 1, 200, 200),
    category: 'Cafe',
    rating: 4.3,
    verified: true,
    description: 'Canadian coffee and donuts chain',
    location: {
      type: 'Point',
      coordinates: DUBAI_MARINA_COORDS,
      address: 'Dubai Marina Walk',
      city: 'Dubai',
      state: 'Dubai',
      country: 'United Arab Emirates',
      pincode: '456789',
    },
    tags: ['coffee', 'donuts', 'breakfast', 'cafe'],
    offers: {
      cashback: 12,
      minOrderAmount: 30,
      maxCashback: 20,
    },
  },

  // Jewelry
  {
    _id: dubaiStoreIds.damasDubai,
    name: 'Damas Jewellery',
    slug: 'damas-dubai',
    logo: getPlaceholderImage('damas', 1, 200, 200),
    category: 'Jewelry',
    rating: 4.7,
    verified: true,
    description: 'Fine jewelry and watches from the Middle East',
    location: {
      type: 'Point',
      coordinates: DUBAI_MALL_COORDS,
      address: 'Dubai Mall, Gold Souk Extension',
      city: 'Dubai',
      state: 'Dubai',
      country: 'United Arab Emirates',
      pincode: '123456',
    },
    tags: ['jewelry', 'gold', 'diamonds', 'luxury'],
    offers: {
      cashback: 2,
      minOrderAmount: 1000,
      maxCashback: 500,
    },
  },
  {
    _id: dubaiStoreIds.joyalukkas,
    name: 'Joyalukkas',
    slug: 'joyalukkas-dubai',
    logo: getPlaceholderImage('joyalukkas', 1, 200, 200),
    category: 'Jewelry',
    rating: 4.6,
    verified: true,
    description: 'World-class jewelry with exquisite designs',
    location: {
      type: 'Point',
      coordinates: DEIRA_CITY_COORDS,
      address: 'Gold Souk, Deira',
      city: 'Dubai',
      state: 'Dubai',
      country: 'United Arab Emirates',
      pincode: '345678',
    },
    tags: ['jewelry', 'gold', 'traditional', 'wedding'],
    offers: {
      cashback: 3,
      minOrderAmount: 800,
      maxCashback: 400,
    },
  },

  // Home & Living
  {
    _id: dubaiStoreIds.homeCentre,
    name: 'Home Centre',
    slug: 'home-centre-dubai',
    logo: getPlaceholderImage('homecentre', 1, 200, 200),
    category: 'Home & Living',
    rating: 4.4,
    verified: true,
    description: 'Furniture and home decor for every style',
    location: {
      type: 'Point',
      coordinates: MALL_OF_EMIRATES_COORDS,
      address: 'Mall of the Emirates, Level 2',
      city: 'Dubai',
      state: 'Dubai',
      country: 'United Arab Emirates',
      pincode: '234567',
    },
    tags: ['furniture', 'home-decor', 'living', 'bedroom'],
    offers: {
      cashback: 7,
      minOrderAmount: 300,
      maxCashback: 150,
    },
  },
];

// Product seeds for Dubai stores
export interface DubaiProductSeedData {
  name: string;
  slug: string;
  sku: string;
  description: string;
  store: mongoose.Types.ObjectId;
  pricing: {
    original: number;
    selling: number;
    currency: string;
  };
  images: string[];
  tags: string[];
}

export const dubaiProductSeeds: DubaiProductSeedData[] = [
  // Carrefour products
  {
    name: 'Fresh Organic Dates 500g',
    slug: 'organic-dates-500g-dubai',
    sku: 'DXB-DATES-001',
    description: 'Premium quality organic Medjool dates from UAE farms',
    store: dubaiStoreIds.carrefour,
    pricing: { original: 45, selling: 39, currency: 'AED' },
    images: [getPlaceholderImage('dates', 1)],
    tags: ['organic', 'dates', 'snacks'],
  },
  {
    name: 'Arabic Coffee 250g',
    slug: 'arabic-coffee-250g-dubai',
    sku: 'DXB-COFFEE-001',
    description: 'Traditional Arabic coffee with cardamom',
    store: dubaiStoreIds.carrefour,
    pricing: { original: 35, selling: 29, currency: 'AED' },
    images: [getPlaceholderImage('coffee', 1)],
    tags: ['coffee', 'arabic', 'beverages'],
  },

  // Sharaf DG products
  {
    name: 'Samsung Galaxy S24 Ultra',
    slug: 'samsung-s24-ultra-dubai',
    sku: 'DXB-PHONE-001',
    description: 'Latest Samsung flagship with AI features',
    store: dubaiStoreIds.sharafDG,
    pricing: { original: 5499, selling: 4999, currency: 'AED' },
    images: [getPlaceholderImage('phone', 1)],
    tags: ['mobile', 'samsung', 'flagship'],
  },
  {
    name: 'Apple MacBook Pro 14"',
    slug: 'macbook-pro-14-dubai',
    sku: 'DXB-LAPTOP-001',
    description: 'M3 Pro chip, 18GB RAM, 512GB SSD',
    store: dubaiStoreIds.sharafDG,
    pricing: { original: 8999, selling: 8499, currency: 'AED' },
    images: [getPlaceholderImage('laptop', 1)],
    tags: ['laptop', 'apple', 'macbook'],
  },

  // Centrepoint products
  {
    name: 'Designer Abaya Collection',
    slug: 'designer-abaya-dubai',
    sku: 'DXB-FASHION-001',
    description: 'Elegant black abaya with gold embroidery',
    store: dubaiStoreIds.centrepoint,
    pricing: { original: 599, selling: 449, currency: 'AED' },
    images: [getPlaceholderImage('abaya', 1)],
    tags: ['abaya', 'traditional', 'women'],
  },
  {
    name: 'Kandura Set - Premium White',
    slug: 'kandura-premium-dubai',
    sku: 'DXB-FASHION-002',
    description: 'Traditional Emirati kandura with agal and ghutra',
    store: dubaiStoreIds.centrepoint,
    pricing: { original: 399, selling: 349, currency: 'AED' },
    images: [getPlaceholderImage('kandura', 1)],
    tags: ['kandura', 'traditional', 'men'],
  },
];

/**
 * Seed Dubai stores into the database
 */
export async function seedDubaiStores(): Promise<void> {
  console.log('Seeding Dubai stores...');

  try {
    // Get or create a general category for stores
    let generalCategory = await Category.findOne({ slug: 'general' });
    if (!generalCategory) {
      generalCategory = await Category.create({
        name: 'General',
        slug: 'general',
        description: 'General category for stores',
        isActive: true,
      });
    }

    // Seed stores
    for (const storeSeed of dubaiStoreSeeds) {
      const existingStore = await Store.findOne({ slug: storeSeed.slug });

      if (!existingStore) {
        await Store.create({
          _id: storeSeed._id,
          name: storeSeed.name,
          slug: storeSeed.slug,
          description: storeSeed.description,
          logo: storeSeed.logo,
          category: generalCategory._id,
          location: {
            address: storeSeed.location.address,
            city: storeSeed.location.city,
            state: storeSeed.location.state,
            pincode: storeSeed.location.pincode,
            coordinates: storeSeed.location.coordinates,
          },
          contact: {
            phone: '+971-4-1234567',
            email: `${storeSeed.slug}@rez.ae`,
          },
          ratings: {
            average: storeSeed.rating,
            count: Math.floor(Math.random() * 500) + 100,
          },
          tags: storeSeed.tags || [],
          offers: storeSeed.offers
            ? {
                cashback: storeSeed.offers.cashback,
                minOrderAmount: storeSeed.offers.minOrderAmount,
                maxCashback: storeSeed.offers.maxCashback,
                isPartner: true,
              }
            : undefined,
          isActive: true,
          isVerified: storeSeed.verified,
          isFeatured: Math.random() > 0.5,
        });
        console.log(`  Created store: ${storeSeed.name}`);
      } else {
        console.log(`  Store already exists: ${storeSeed.name}`);
      }
    }

    // Seed products
    console.log('Seeding Dubai products...');
    for (const productSeed of dubaiProductSeeds) {
      const existingProduct = await Product.findOne({ slug: productSeed.slug });

      if (!existingProduct) {
        await Product.create({
          name: productSeed.name,
          slug: productSeed.slug,
          sku: productSeed.sku,
          description: productSeed.description,
          store: productSeed.store,
          category: generalCategory._id,
          pricing: {
            original: productSeed.pricing.original,
            selling: productSeed.pricing.selling,
            discount: Math.round(
              ((productSeed.pricing.original - productSeed.pricing.selling) /
                productSeed.pricing.original) *
                100
            ),
            currency: productSeed.pricing.currency,
          },
          images: productSeed.images,
          inventory: {
            stock: Math.floor(Math.random() * 100) + 10,
            isAvailable: true,
            unlimited: false,
          },
          ratings: {
            average: 0,
            count: 0,
            distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
          },
          specifications: [],
          tags: productSeed.tags,
          seo: {},
          analytics: {
            views: 0,
            purchases: 0,
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
        });
        console.log(`  Created product: ${productSeed.name}`);
      } else {
        console.log(`  Product already exists: ${productSeed.name}`);
      }
    }

    console.log('Dubai stores and products seeded successfully!');
  } catch (error) {
    console.error('Error seeding Dubai stores:', error);
    throw error;
  }
}

export default seedDubaiStores;
