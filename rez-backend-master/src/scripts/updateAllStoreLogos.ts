/**
 * Update ALL Store Logos with Real Brand Images
 * Adds proper logo URLs to all stores in the database
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI as string;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };

// Brand-specific logos (using reliable logo URLs)
const BRAND_LOGOS: Record<string, { logo: string; banner: string }> = {
  // Food & Dining
  'starbucks': {
    logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/d/d3/Starbucks_Corporation_Logo_2011.svg/200px-Starbucks_Corporation_Logo_2011.svg.png',
    banner: 'https://images.unsplash.com/photo-1453614512568-c4024d13c247?w=800&h=400&fit=crop'
  },
  'mcdonalds': {
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/McDonald%27s_Golden_Arches.svg/200px-McDonald%27s_Golden_Arches.svg.png',
    banner: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800&h=400&fit=crop'
  },
  'kfc': {
    logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/b/bf/KFC_logo.svg/200px-KFC_logo.svg.png',
    banner: 'https://images.unsplash.com/photo-1626645738196-c2a72c78a4e4?w=800&h=400&fit=crop'
  },
  'dominos': {
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/Dominos_pizza_logo.svg/200px-Dominos_pizza_logo.svg.png',
    banner: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&h=400&fit=crop'
  },
  'pizza hut': {
    logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/d/d2/Pizza_Hut_logo.svg/200px-Pizza_Hut_logo.svg.png',
    banner: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&h=400&fit=crop'
  },
  'subway': {
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Subway_2016_logo.svg/200px-Subway_2016_logo.svg.png',
    banner: 'https://images.unsplash.com/photo-1509722747041-616f39b57569?w=800&h=400&fit=crop'
  },
  'burger king': {
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/Burger_King_logo_%281999%29.svg/200px-Burger_King_logo_%281999%29.svg.png',
    banner: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&h=400&fit=crop'
  },
  'baskin robbins': {
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d8/Baskin-Robbins_logo.svg/200px-Baskin-Robbins_logo.svg.png',
    banner: 'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=800&h=400&fit=crop'
  },
  'corner house': {
    logo: 'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=800&h=400&fit=crop'
  },
  'empire': {
    logo: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&h=400&fit=crop'
  },
  'barbeque nation': {
    logo: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&h=400&fit=crop'
  },
  'chianti': {
    logo: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=400&fit=crop'
  },
  'theobroma': {
    logo: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=800&h=400&fit=crop'
  },
  'glens bakehouse': {
    logo: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&h=400&fit=crop'
  },
  'iyengar bakery': {
    logo: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&h=400&fit=crop'
  },
  'mojo pizza': {
    logo: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&h=400&fit=crop'
  },
  'behrouz biryani': {
    logo: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&h=400&fit=crop'
  },
  'box8': {
    logo: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&h=400&fit=crop'
  },
  'dyu art cafe': {
    logo: 'https://images.unsplash.com/photo-1445116572660-236099ec97a0?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1445116572660-236099ec97a0?w=800&h=400&fit=crop'
  },

  // Grocery
  'd mart': {
    logo: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=800&h=400&fit=crop'
  },
  'spar': {
    logo: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=800&h=400&fit=crop'
  },
  'reliance smart': {
    logo: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=800&h=400&fit=crop'
  },
  'namdharis': {
    logo: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&h=400&fit=crop'
  },
  'nandini': {
    logo: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=800&h=400&fit=crop'
  },

  // Beauty & Wellness
  'naturals salon': {
    logo: 'https://images.unsplash.com/photo-1560750588-73207b1ef5b8?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1560750588-73207b1ef5b8?w=800&h=400&fit=crop'
  },
  'green trends': {
    logo: 'https://images.unsplash.com/photo-1560750588-73207b1ef5b8?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1560750588-73207b1ef5b8?w=800&h=400&fit=crop'
  },
  'lakme salon': {
    logo: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&h=400&fit=crop'
  },
  'ylg salon': {
    logo: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&h=400&fit=crop'
  },

  // Healthcare
  'apollo pharmacy': {
    logo: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=800&h=400&fit=crop'
  },
  'medplus': {
    logo: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=800&h=400&fit=crop'
  },
  'wellness forever': {
    logo: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=800&h=400&fit=crop'
  },
  'apollo clinic': {
    logo: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&h=400&fit=crop'
  },
  'thyrocare': {
    logo: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800&h=400&fit=crop'
  },

  // Fashion & Retail
  'lifestyle': {
    logo: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=800&h=400&fit=crop'
  },
  'central': {
    logo: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=800&h=400&fit=crop'
  },
  'bata': {
    logo: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&h=400&fit=crop'
  },
  'metro shoes': {
    logo: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&h=400&fit=crop'
  },
  'puma': {
    logo: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=800&h=400&fit=crop'
  },
  'tanishq': {
    logo: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800&h=400&fit=crop'
  },
  'caratlane': {
    logo: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800&h=400&fit=crop'
  },

  // Fitness
  'cult.fit': {
    logo: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&h=400&fit=crop'
  },
  'golds gym': {
    logo: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&h=400&fit=crop'
  },
  'f45': {
    logo: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&h=400&fit=crop'
  },

  // Electronics
  'croma': {
    logo: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&h=400&fit=crop'
  },
  'reliance digital': {
    logo: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&h=400&fit=crop'
  },
  'aptronix': {
    logo: 'https://images.unsplash.com/photo-1491933382434-500287f9b54b?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1491933382434-500287f9b54b?w=800&h=400&fit=crop'
  },
  'sangeetha mobiles': {
    logo: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&h=400&fit=crop'
  },

  // Travel & Services
  'urban company': {
    logo: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&h=400&fit=crop'
  },
  'hicare': {
    logo: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&h=400&fit=crop'
  },
  'oyo rooms': {
    logo: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&h=400&fit=crop'
  },
  'grand mercure': {
    logo: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&h=400&fit=crop'
  },
  'rapido': {
    logo: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=800&h=400&fit=crop'
  },
  'royal brothers': {
    logo: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=800&h=400&fit=crop'
  },

  // Entertainment
  'fun world': {
    logo: 'https://images.unsplash.com/photo-1513889961551-628c1e5e2ee9?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1513889961551-628c1e5e2ee9?w=800&h=400&fit=crop'
  },
  'timezone': {
    logo: 'https://images.unsplash.com/photo-1511882150382-421056c89033?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1511882150382-421056c89033?w=800&h=400&fit=crop'
  },
  'mystery rooms': {
    logo: 'https://images.unsplash.com/photo-1511882150382-421056c89033?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1511882150382-421056c89033?w=800&h=400&fit=crop'
  },

  // Financial
  'excitel': {
    logo: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=800&h=400&fit=crop'
  },
  'act fibernet': {
    logo: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=800&h=400&fit=crop'
  },
  'muthoot': {
    logo: 'https://images.unsplash.com/photo-1610375461246-83df859d849d?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1610375461246-83df859d849d?w=800&h=400&fit=crop'
  }
};

// Category-based fallback logos
const CATEGORY_FALLBACK_LOGOS: Record<string, { logo: string; banner: string }> = {
  'food-dining': {
    logo: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&h=400&fit=crop'
  },
  'grocery-essentials': {
    logo: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=800&h=400&fit=crop'
  },
  'beauty-wellness': {
    logo: 'https://images.unsplash.com/photo-1560750588-73207b1ef5b8?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1560750588-73207b1ef5b8?w=800&h=400&fit=crop'
  },
  'healthcare': {
    logo: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=800&h=400&fit=crop'
  },
  'fashion': {
    logo: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=800&h=400&fit=crop'
  },
  'fitness-sports': {
    logo: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&h=400&fit=crop'
  },
  'education-learning': {
    logo: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&h=400&fit=crop'
  },
  'home-services': {
    logo: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&h=400&fit=crop'
  },
  'travel-experiences': {
    logo: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&h=400&fit=crop'
  },
  'entertainment': {
    logo: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&h=400&fit=crop'
  },
  'financial-lifestyle': {
    logo: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&h=400&fit=crop'
  }
};

async function updateAllStoreLogos() {
  console.log('🖼️ Updating ALL store logos with proper images...\n');

  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB\n');

  const db = mongoose.connection.db!;

  // Get all stores
  const stores = await db.collection('stores').find({}).toArray();
  console.log(`📦 Found ${stores.length} stores to update\n`);

  let updated = 0;
  let skipped = 0;

  for (const store of stores) {
    const storeName = store.name.toLowerCase();
    const subcategorySlug = store.subcategorySlug || '';

    // Find matching brand logo
    let logoData: { logo: string; banner: string } | null = null;

    // Check for exact brand match
    for (const [brand, data] of Object.entries(BRAND_LOGOS)) {
      if (storeName.includes(brand) || brand.includes(storeName.split(' ')[0])) {
        logoData = data;
        break;
      }
    }

    // If no brand match, use category fallback
    if (!logoData) {
      // Try to get category from subcategorySlug mapping
      const categoryMapping: Record<string, string> = {
        'cafes': 'food-dining',
        'qsr-fast-food': 'food-dining',
        'family-restaurants': 'food-dining',
        'fine-dining': 'food-dining',
        'ice-cream-dessert': 'food-dining',
        'bakery-confectionery': 'food-dining',
        'cloud-kitchens': 'food-dining',
        'street-food': 'food-dining',
        'supermarkets': 'grocery-essentials',
        'kirana-stores': 'grocery-essentials',
        'fresh-vegetables': 'grocery-essentials',
        'meat-fish': 'grocery-essentials',
        'dairy': 'grocery-essentials',
        'packaged-goods': 'grocery-essentials',
        'water-cans': 'grocery-essentials',
        'salons': 'beauty-wellness',
        'spa-massage': 'beauty-wellness',
        'beauty-services': 'beauty-wellness',
        'cosmetology': 'beauty-wellness',
        'dermatology': 'beauty-wellness',
        'skincare-cosmetics': 'beauty-wellness',
        'nail-studios': 'beauty-wellness',
        'grooming-men': 'beauty-wellness',
        'pharmacy': 'healthcare',
        'clinics': 'healthcare',
        'diagnostics': 'healthcare',
        'dental': 'healthcare',
        'physiotherapy': 'healthcare',
        'home-nursing': 'healthcare',
        'vision-eyewear': 'healthcare',
        'footwear': 'fashion',
        'bags-accessories': 'fashion',
        'electronics': 'fashion',
        'mobile-accessories': 'fashion',
        'watches': 'fashion',
        'jewelry': 'fashion',
        'local-brands': 'fashion',
        'gyms': 'fitness-sports',
        'crossfit': 'fitness-sports',
        'yoga': 'fitness-sports',
        'zumba': 'fitness-sports',
        'martial-arts': 'fitness-sports',
        'sports-academies': 'fitness-sports',
        'sportswear': 'fitness-sports',
        'coaching-centers': 'education-learning',
        'skill-development': 'education-learning',
        'music-dance-classes': 'education-learning',
        'art-craft': 'education-learning',
        'vocational': 'education-learning',
        'language-training': 'education-learning',
        'ac-repair': 'home-services',
        'plumbing': 'home-services',
        'electrical': 'home-services',
        'cleaning': 'home-services',
        'pest-control': 'home-services',
        'house-shifting': 'home-services',
        'laundry-dry-cleaning': 'home-services',
        'home-tutors': 'home-services',
        'hotels': 'travel-experiences',
        'intercity-travel': 'travel-experiences',
        'taxis': 'travel-experiences',
        'bike-rentals': 'travel-experiences',
        'weekend-getaways': 'travel-experiences',
        'tours': 'travel-experiences',
        'activities': 'travel-experiences',
        'movies': 'entertainment',
        'live-events': 'entertainment',
        'festivals': 'entertainment',
        'workshops': 'entertainment',
        'amusement-parks': 'entertainment',
        'gaming-cafes': 'entertainment',
        'vr-ar-experiences': 'entertainment',
        'bill-payments': 'financial-lifestyle',
        'mobile-recharge': 'financial-lifestyle',
        'broadband': 'financial-lifestyle',
        'cable-ott': 'financial-lifestyle',
        'insurance': 'financial-lifestyle',
        'gold-savings': 'financial-lifestyle',
        'donations': 'financial-lifestyle'
      };

      const mainCategory = categoryMapping[subcategorySlug] || 'food-dining';
      logoData = CATEGORY_FALLBACK_LOGOS[mainCategory] || CATEGORY_FALLBACK_LOGOS['food-dining'];
    }

    // Update store with logo
    if (logoData) {
      await db.collection('stores').updateOne(
        { _id: store._id },
        {
          $set: {
            logo: logoData.logo,
            banner: logoData.banner
          }
        }
      );
      updated++;
      console.log(`  ✅ ${store.name}`);
    } else {
      skipped++;
      console.log(`  ⏭️ ${store.name} (no logo found)`);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('🎉 Store logo update complete!');
  console.log(`   ✅ Updated: ${updated}`);
  console.log(`   ⏭️ Skipped: ${skipped}`);
  console.log('='.repeat(50));

  await mongoose.disconnect();
  console.log('\n✅ Done!');
}

updateAllStoreLogos().catch(console.error);
