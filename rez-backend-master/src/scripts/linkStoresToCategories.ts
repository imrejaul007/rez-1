/**
 * Link Stores to Frontend Categories
 *
 * This script:
 * 1. Reads all stores from the database
 * 2. Reads all frontend categories (12 main + ~86 subcategories)
 * 3. Uses keyword matching to determine which frontend category each store belongs to
 * 4. Updates store.category → frontend main category ObjectId
 * 5. Adds relevant frontend subcategory to store.subCategories
 *
 * SAFE: Does NOT delete or modify store data — only updates category/subCategories links.
 *
 * Run: npx ts-node src/scripts/linkStoresToCategories.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || '';
const DB_NAME = process.env.DB_NAME || 'test';

// ============================================================
// FRONTEND CATEGORY CONFIG (mirrors categoryConfig.ts)
// ============================================================
const FRONTEND_CATEGORIES: Record<string, {
  name: string;
  keywords: string[];
  subcategories: { slug: string; name: string; keywords: string[] }[];
}> = {
  'food-dining': {
    name: 'Food & Dining',
    keywords: ['food', 'restaurant', 'cafe', 'dining', 'qsr', 'fast food', 'bakery', 'dessert', 'ice cream', 'cloud kitchen', 'street food', 'confectionery', 'sweet', 'biryani', 'pizza', 'burger', 'chicken', 'shawarma', 'kebab', 'dosa', 'idli', 'thali', 'noodles', 'chinese', 'italian', 'indian', 'north indian', 'south indian', 'mughlai', 'continental', 'sushi', 'japanese', 'korean', 'thai', 'mexican', 'juices', 'smoothie', 'tea', 'coffee', 'snacks', 'chaat', 'paan', 'mithai', 'sweets', 'kitchen', 'eatery', 'dhaba', 'canteen', 'mess', 'tiffin', 'catering', 'grill', 'bbq', 'tandoor', 'rolls', 'wrap', 'sandwich', 'fries', 'momos'],
    subcategories: [
      { slug: 'cafes', name: 'Cafés', keywords: ['cafe', 'coffee', 'tea', 'espresso', 'latte', 'cappuccino', 'brew'] },
      { slug: 'qsr-fast-food', name: 'QSR / Fast Food', keywords: ['qsr', 'fast food', 'burger', 'pizza', 'fried', 'fries', 'quick service', 'takeaway', 'kfc', 'mcdonald', 'domino', 'subway'] },
      { slug: 'family-restaurants', name: 'Family Restaurants', keywords: ['family', 'restaurant', 'dine in', 'multi cuisine', 'thali', 'buffet', 'biryani', 'north indian', 'south indian', 'mughlai', 'chinese', 'continental'] },
      { slug: 'fine-dining', name: 'Fine Dining', keywords: ['fine dining', 'premium', 'luxury', 'gourmet', 'michelin', 'upscale'] },
      { slug: 'ice-cream-dessert', name: 'Ice Cream & Dessert', keywords: ['ice cream', 'dessert', 'gelato', 'sundae', 'waffle', 'pancake', 'frozen', 'kulfi', 'falooda'] },
      { slug: 'bakery-confectionery', name: 'Bakery & Confectionery', keywords: ['bakery', 'cake', 'pastry', 'bread', 'confectionery', 'cookies', 'biscuit', 'sweet', 'mithai', 'sweets'] },
      { slug: 'cloud-kitchens', name: 'Cloud Kitchens', keywords: ['cloud kitchen', 'delivery only', 'ghost kitchen', 'virtual kitchen', 'online kitchen'] },
      { slug: 'street-food', name: 'Street Food', keywords: ['street food', 'chaat', 'pani puri', 'vada pav', 'pav bhaji', 'momos', 'rolls', 'shawarma', 'kebab', 'tikka', 'grill', 'dhaba', 'snacks'] },
    ],
  },
  'grocery-essentials': {
    name: 'Grocery & Essentials',
    keywords: ['grocery', 'supermarket', 'kirana', 'vegetables', 'fruits', 'meat', 'fish', 'dairy', 'packaged', 'water', 'essentials', 'fresh', 'organic', 'provisions', 'general store', 'departmental', 'mini mart', 'mart', 'store'],
    subcategories: [
      { slug: 'supermarkets', name: 'Supermarkets', keywords: ['supermarket', 'hypermarket', 'departmental', 'mini mart', 'mart', 'mega store'] },
      { slug: 'kirana-stores', name: 'Kirana Stores', keywords: ['kirana', 'general store', 'provision', 'neighborhood store', 'corner shop'] },
      { slug: 'fresh-vegetables', name: 'Fresh Vegetables', keywords: ['vegetable', 'veggie', 'fresh', 'sabzi', 'organic vegetables', 'fruits'] },
      { slug: 'meat-fish', name: 'Meat & Fish', keywords: ['meat', 'fish', 'chicken', 'mutton', 'seafood', 'butcher', 'non veg', 'poultry', 'egg'] },
      { slug: 'dairy', name: 'Dairy', keywords: ['dairy', 'milk', 'curd', 'yogurt', 'cheese', 'paneer', 'butter', 'ghee'] },
      { slug: 'packaged-goods', name: 'Packaged Goods', keywords: ['packaged', 'branded', 'fmcg', 'snacks', 'chips', 'beverages', 'soft drinks'] },
      { slug: 'water-cans', name: 'Water Cans', keywords: ['water', 'water can', 'mineral water', 'drinking water', 'purified'] },
    ],
  },
  'beauty-wellness': {
    name: 'Beauty & Wellness',
    keywords: ['beauty', 'salon', 'spa', 'wellness', 'skincare', 'cosmetology', 'dermatology', 'nail', 'grooming', 'massage', 'cosmetics', 'personal care', 'parlour', 'parlor', 'facial', 'hair', 'makeup', 'mehndi', 'henna', 'wax', 'threading'],
    subcategories: [
      { slug: 'salons', name: 'Salons', keywords: ['salon', 'hair', 'haircut', 'hair style', 'barber', 'parlour', 'parlor', 'unisex salon'] },
      { slug: 'spa-massage', name: 'Spa & Massage', keywords: ['spa', 'massage', 'body massage', 'thai massage', 'ayurvedic', 'relaxation'] },
      { slug: 'beauty-services', name: 'Beauty Services', keywords: ['beauty', 'facial', 'wax', 'threading', 'makeup', 'bridal', 'mehndi'] },
      { slug: 'cosmetology', name: 'Cosmetology', keywords: ['cosmetology', 'cosmetic', 'aesthetic', 'laser', 'botox'] },
      { slug: 'dermatology', name: 'Dermatology', keywords: ['dermatology', 'skin', 'derma', 'acne', 'pigmentation'] },
      { slug: 'skincare-cosmetics', name: 'Skincare & Cosmetics', keywords: ['skincare', 'cosmetics', 'cream', 'serum', 'lotion', 'sunscreen', 'makeup products'] },
      { slug: 'nail-studios', name: 'Nail Studios', keywords: ['nail', 'manicure', 'pedicure', 'nail art', 'nail studio'] },
      { slug: 'grooming-men', name: 'Grooming for Men', keywords: ['grooming', 'men grooming', 'barber', 'shave', 'beard', 'men salon', 'gents'] },
    ],
  },
  'healthcare': {
    name: 'Healthcare',
    keywords: ['health', 'pharmacy', 'clinic', 'diagnostic', 'dental', 'physiotherapy', 'nursing', 'eyewear', 'vision', 'medicine', 'doctor', 'hospital', 'medical', 'lab', 'pathology', 'x-ray', 'scan'],
    subcategories: [
      { slug: 'pharmacy', name: 'Pharmacy', keywords: ['pharmacy', 'chemist', 'drugstore', 'medicine', 'medical store'] },
      { slug: 'clinics', name: 'Clinics', keywords: ['clinic', 'doctor', 'physician', 'consultation', 'hospital', 'nursing home'] },
      { slug: 'diagnostics', name: 'Diagnostics', keywords: ['diagnostic', 'lab', 'pathology', 'blood test', 'x-ray', 'scan', 'mri', 'ultrasound'] },
      { slug: 'dental', name: 'Dental', keywords: ['dental', 'dentist', 'tooth', 'teeth', 'orthodontic', 'oral'] },
      { slug: 'physiotherapy', name: 'Physiotherapy', keywords: ['physiotherapy', 'physio', 'rehab', 'rehabilitation', 'physical therapy'] },
      { slug: 'home-nursing', name: 'Home Nursing', keywords: ['nursing', 'home care', 'home nurse', 'attendant', 'caretaker'] },
      { slug: 'vision-eyewear', name: 'Vision & Eyewear', keywords: ['eye', 'eyewear', 'optical', 'glasses', 'lens', 'contact lens', 'vision', 'optician'] },
    ],
  },
  'fashion': {
    name: 'Fashion',
    keywords: ['fashion', 'clothing', 'apparel', 'jacket', 'jeans', 'dress', 'shirt', 'shoe', 'sneaker', 'sunglasses', 'handbag', 'blazer', 'footwear', 'accessories', 'watch', 'jewelry', 'bags', 'ethnic', 'saree', 'kurti', 'lehenga', 'western', 'garment', 'boutique', 'tailor', 'textile'],
    subcategories: [
      { slug: 'footwear', name: 'Footwear', keywords: ['footwear', 'shoe', 'sneaker', 'sandal', 'slipper', 'boot', 'heel', 'chappal'] },
      { slug: 'bags-accessories', name: 'Bags & Accessories', keywords: ['bag', 'handbag', 'purse', 'backpack', 'luggage', 'accessories', 'belt', 'scarf', 'sunglasses'] },
      { slug: 'mobile-accessories', name: 'Mobile Accessories', keywords: ['mobile accessories', 'phone cover', 'case', 'screen guard', 'charger', 'earphone', 'power bank'] },
      { slug: 'watches', name: 'Watches', keywords: ['watch', 'wrist watch', 'smartwatch', 'analog', 'digital watch'] },
      { slug: 'jewelry', name: 'Jewelry', keywords: ['jewelry', 'jewellery', 'gold', 'silver', 'diamond', 'necklace', 'ring', 'bracelet', 'earring', 'pendant'] },
      { slug: 'local-brands', name: 'Local Brands', keywords: ['local brand', 'boutique', 'designer', 'indie', 'handmade', 'artisan'] },
    ],
  },
  'fitness-sports': {
    name: 'Fitness & Sports',
    keywords: ['gym', 'fitness', 'crossfit', 'yoga', 'zumba', 'martial arts', 'sports', 'sportswear', 'academy', 'workout', 'exercise', 'training', 'swimming', 'cricket', 'football', 'badminton', 'tennis'],
    subcategories: [
      { slug: 'gyms', name: 'Gyms', keywords: ['gym', 'fitness center', 'workout', 'weight training', 'bodybuilding'] },
      { slug: 'crossfit', name: 'CrossFit', keywords: ['crossfit', 'hiit', 'functional training', 'boot camp'] },
      { slug: 'yoga', name: 'Yoga', keywords: ['yoga', 'meditation', 'pranayama', 'pilates', 'stretching'] },
      { slug: 'zumba', name: 'Zumba', keywords: ['zumba', 'dance fitness', 'aerobics', 'cardio dance'] },
      { slug: 'martial-arts', name: 'Martial Arts', keywords: ['martial arts', 'karate', 'taekwondo', 'boxing', 'mma', 'kung fu', 'judo', 'self defense'] },
      { slug: 'sports-academies', name: 'Sports Academies', keywords: ['sports academy', 'cricket academy', 'football academy', 'swimming', 'badminton', 'tennis', 'coaching'] },
      { slug: 'sportswear', name: 'Sportswear', keywords: ['sportswear', 'sports gear', 'athletic', 'activewear', 'sports equipment'] },
    ],
  },
  'education-learning': {
    name: 'Education & Learning',
    keywords: ['education', 'coaching', 'skill', 'music', 'dance', 'art', 'craft', 'vocational', 'language', 'training', 'learning', 'class', 'tuition', 'school', 'institute', 'academy', 'course'],
    subcategories: [
      { slug: 'coaching-centers', name: 'Coaching Centers', keywords: ['coaching', 'tuition', 'iit', 'neet', 'competitive', 'entrance', 'exam prep'] },
      { slug: 'skill-development', name: 'Skill Development', keywords: ['skill', 'development', 'computer', 'coding', 'programming', 'digital', 'soft skill'] },
      { slug: 'music-dance-classes', name: 'Music/Dance Classes', keywords: ['music', 'dance', 'singing', 'guitar', 'piano', 'violin', 'classical', 'western dance', 'bharatanatyam'] },
      { slug: 'art-craft', name: 'Art & Craft', keywords: ['art', 'craft', 'painting', 'drawing', 'sketch', 'pottery', 'sculpture'] },
      { slug: 'vocational', name: 'Vocational', keywords: ['vocational', 'diploma', 'certification', 'technical', 'trade'] },
      { slug: 'language-training', name: 'Language Training', keywords: ['language', 'english', 'spoken english', 'ielts', 'toefl', 'french', 'german', 'spanish', 'hindi'] },
    ],
  },
  'home-services': {
    name: 'Home Services',
    keywords: ['home', 'ac repair', 'plumbing', 'electrical', 'cleaning', 'pest control', 'shifting', 'laundry', 'tutor', 'dry cleaning', 'repair', 'maintenance', 'handyman', 'carpenter', 'painter'],
    subcategories: [
      { slug: 'ac-repair', name: 'AC Repair', keywords: ['ac', 'air conditioner', 'ac repair', 'ac service', 'hvac', 'cooling'] },
      { slug: 'plumbing', name: 'Plumbing', keywords: ['plumbing', 'plumber', 'pipe', 'tap', 'leakage', 'drainage'] },
      { slug: 'electrical', name: 'Electrical', keywords: ['electrical', 'electrician', 'wiring', 'switch', 'fan', 'light'] },
      { slug: 'cleaning', name: 'Cleaning', keywords: ['cleaning', 'deep cleaning', 'house cleaning', 'sanitization', 'disinfection'] },
      { slug: 'pest-control', name: 'Pest Control', keywords: ['pest', 'pest control', 'termite', 'cockroach', 'mosquito', 'fumigation'] },
      { slug: 'house-shifting', name: 'House Shifting', keywords: ['shifting', 'movers', 'packers', 'relocation', 'transport', 'moving'] },
      { slug: 'laundry-dry-cleaning', name: 'Laundry & Dry Cleaning', keywords: ['laundry', 'dry cleaning', 'ironing', 'pressing', 'wash', 'steam'] },
      { slug: 'home-tutors', name: 'Home Tutors', keywords: ['home tutor', 'private tutor', 'tutor', 'home teaching'] },
    ],
  },
  'travel-experiences': {
    name: 'Travel & Experiences',
    keywords: ['travel', 'hotel', 'taxi', 'bike rental', 'tour', 'getaway', 'weekend', 'activity', 'intercity', 'airport', 'vacation', 'trip', 'resort', 'booking', 'flight', 'cab'],
    subcategories: [
      { slug: 'hotels', name: 'Hotels', keywords: ['hotel', 'resort', 'lodge', 'inn', 'motel', 'guest house', 'hostel', 'homestay', 'oyo'] },
      { slug: 'intercity-travel', name: 'Intercity Travel', keywords: ['intercity', 'bus', 'train', 'flight', 'long distance', 'outstation'] },
      { slug: 'taxis', name: 'Taxis', keywords: ['taxi', 'cab', 'car rental', 'ride', 'uber', 'ola', 'driver'] },
      { slug: 'bike-rentals', name: 'Bike Rentals', keywords: ['bike rental', 'scooter', 'motorcycle', 'two wheeler', 'rent a bike'] },
      { slug: 'weekend-getaways', name: 'Weekend Getaways', keywords: ['weekend', 'getaway', 'staycation', 'short trip', 'day trip'] },
      { slug: 'tours', name: 'Tours', keywords: ['tour', 'travel package', 'sightseeing', 'guide', 'excursion', 'pilgrimage'] },
      { slug: 'activities', name: 'Activities', keywords: ['activity', 'adventure', 'trekking', 'camping', 'rafting', 'paragliding', 'bungee'] },
    ],
  },
  'entertainment': {
    name: 'Entertainment',
    keywords: ['movie', 'event', 'festival', 'workshop', 'amusement', 'gaming', 'vr', 'ar', 'live', 'concert', 'show', 'fun', 'theatre', 'theater', 'comedy', 'standup', 'nightclub', 'pub', 'bar', 'lounge', 'club'],
    subcategories: [
      { slug: 'movies', name: 'Movies', keywords: ['movie', 'cinema', 'theatre', 'theater', 'multiplex', 'film', 'imax', 'pvr', 'inox'] },
      { slug: 'live-events', name: 'Live Events', keywords: ['live event', 'concert', 'show', 'standup', 'comedy', 'performance', 'music show'] },
      { slug: 'festivals', name: 'Festivals', keywords: ['festival', 'carnival', 'fair', 'mela', 'celebration'] },
      { slug: 'workshops', name: 'Workshops', keywords: ['workshop', 'masterclass', 'seminar', 'interactive session'] },
      { slug: 'amusement-parks', name: 'Amusement Parks', keywords: ['amusement', 'theme park', 'water park', 'fun zone', 'rides'] },
      { slug: 'gaming-cafes', name: 'Gaming Cafés', keywords: ['gaming', 'game cafe', 'esports', 'arcade', 'playstation', 'xbox', 'pc gaming'] },
      { slug: 'vr-ar-experiences', name: 'VR/AR Experiences', keywords: ['vr', 'virtual reality', 'ar', 'augmented reality', 'immersive'] },
    ],
  },
  'financial-lifestyle': {
    name: 'Financial Lifestyle',
    keywords: ['bill', 'recharge', 'broadband', 'cable', 'ott', 'insurance', 'gold', 'savings', 'donation', 'payment', 'finance', 'mobile recharge', 'dth'],
    subcategories: [
      { slug: 'bill-payments', name: 'Bill Payments', keywords: ['bill', 'electricity', 'gas', 'water bill', 'utility', 'payment'] },
      { slug: 'mobile-recharge', name: 'Mobile Recharge', keywords: ['recharge', 'mobile recharge', 'prepaid', 'postpaid', 'data pack'] },
      { slug: 'broadband', name: 'Broadband', keywords: ['broadband', 'internet', 'wifi', 'fiber', 'connection'] },
      { slug: 'cable-ott', name: 'Cable/OTT', keywords: ['cable', 'ott', 'streaming', 'dth', 'dish', 'netflix', 'hotstar'] },
      { slug: 'insurance', name: 'Insurance', keywords: ['insurance', 'life insurance', 'health insurance', 'motor insurance', 'policy'] },
      { slug: 'gold-savings', name: 'Gold Savings', keywords: ['gold', 'savings', 'gold savings', 'digital gold', 'investment'] },
      { slug: 'donations', name: 'Donations', keywords: ['donation', 'charity', 'ngo', 'social cause', 'fund', 'contribute'] },
    ],
  },
  'electronics': {
    name: 'Electronics',
    keywords: ['electronics', 'mobile', 'phone', 'laptop', 'tv', 'gadget', 'computer', 'tablet', 'camera', 'headphone', 'smartwatch', 'speaker', 'appliance', 'led', 'oled', 'printer', 'monitor'],
    subcategories: [
      { slug: 'mobile-phones', name: 'Mobile Phones', keywords: ['mobile', 'phone', 'smartphone', 'iphone', 'samsung', 'android', 'cell phone'] },
      { slug: 'laptops', name: 'Laptops', keywords: ['laptop', 'notebook', 'macbook', 'chromebook', 'ultrabook', 'computer', 'pc', 'desktop'] },
      { slug: 'televisions', name: 'Televisions', keywords: ['television', 'tv', 'led tv', 'smart tv', 'oled', 'lcd'] },
      { slug: 'cameras', name: 'Cameras', keywords: ['camera', 'dslr', 'mirrorless', 'gopro', 'photography', 'lens'] },
      { slug: 'audio-headphones', name: 'Audio & Headphones', keywords: ['audio', 'headphone', 'earphone', 'speaker', 'bluetooth', 'soundbar', 'earbuds', 'airpods'] },
      { slug: 'gaming', name: 'Gaming', keywords: ['gaming', 'console', 'playstation', 'xbox', 'nintendo', 'gaming laptop', 'gaming pc'] },
      { slug: 'accessories', name: 'Accessories', keywords: ['accessories', 'cable', 'adapter', 'hub', 'charger', 'mouse', 'keyboard', 'pendrive', 'hard disk'] },
      { slug: 'smartwatches', name: 'Smartwatches', keywords: ['smartwatch', 'smart watch', 'fitness band', 'apple watch', 'galaxy watch', 'wearable'] },
    ],
  },
};

// ============================================================
// MATCHING LOGIC
// ============================================================

function buildSearchText(store: any): string {
  const parts: string[] = [];
  if (store.name) parts.push(store.name);
  if (store.description) parts.push(store.description);
  if (store.tags && Array.isArray(store.tags)) parts.push(store.tags.join(' '));
  if (store.menuCategories && Array.isArray(store.menuCategories)) parts.push(store.menuCategories.join(' '));
  return parts.join(' ').toLowerCase();
}

function scoreMatch(searchText: string, keywords: string[]): number {
  let score = 0;
  for (const kw of keywords) {
    const kwLower = kw.toLowerCase();
    // Exact word boundary match (more reliable)
    const regex = new RegExp(`\\b${kwLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    const matches = searchText.match(regex);
    if (matches) {
      score += matches.length * (kwLower.length > 4 ? 2 : 1); // longer keywords score higher
    }
  }
  return score;
}

function findBestMainCategory(store: any, categorySlugMap: Record<string, string>): { slug: string; score: number } | null {
  const searchText = buildSearchText(store);

  // Also check current category slug
  const currentCatSlug = categorySlugMap[store.category?.toString()] || '';

  let bestSlug = '';
  let bestScore = 0;

  for (const [slug, config] of Object.entries(FRONTEND_CATEGORIES)) {
    let score = scoreMatch(searchText, config.keywords);

    // Bonus if the store's current category name/slug hints at this frontend category
    if (currentCatSlug) {
      const catNameScore = scoreMatch(currentCatSlug.replace(/-/g, ' '), config.keywords);
      score += catNameScore * 3; // boost for current category match
    }

    if (score > bestScore) {
      bestScore = score;
      bestSlug = slug;
    }
  }

  return bestScore > 0 ? { slug: bestSlug, score: bestScore } : null;
}

function findBestSubcategory(store: any, mainCatSlug: string): { slug: string; score: number } | null {
  const searchText = buildSearchText(store);
  const config = FRONTEND_CATEGORIES[mainCatSlug];
  if (!config) return null;

  let bestSlug = '';
  let bestScore = 0;

  for (const sub of config.subcategories) {
    const score = scoreMatch(searchText, sub.keywords);
    if (score > bestScore) {
      bestScore = score;
      bestSlug = sub.slug;
    }
  }

  return bestScore > 0 ? { slug: bestSlug, score: bestScore } : null;
}

// ============================================================
// MAIN SCRIPT
// ============================================================

async function linkStoresToCategories() {
  try {
    console.log('🚀 Starting Store-Category Linking...');
    console.log(`📡 Connecting to MongoDB...`);

    await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db!;
    const storesCol = db.collection('stores');
    const categoriesCol = db.collection('categories');

    // ---- Step 1: Get all frontend category ObjectIds from DB ----
    console.log('📦 Loading frontend categories from DB...\n');

    const frontendMainSlugs = Object.keys(FRONTEND_CATEGORIES);
    const allFrontendSubSlugs: string[] = [];
    for (const config of Object.values(FRONTEND_CATEGORIES)) {
      for (const sub of config.subcategories) {
        allFrontendSubSlugs.push(sub.slug);
      }
    }

    // Build slug → ObjectId maps
    const mainCatMap: Record<string, mongoose.Types.ObjectId> = {};
    const subCatMap: Record<string, mongoose.Types.ObjectId> = {};

    for (const slug of frontendMainSlugs) {
      const cat = await categoriesCol.findOne({ slug, parentCategory: null });
      if (cat) {
        mainCatMap[slug] = cat._id as mongoose.Types.ObjectId;
      } else {
        console.log(`   ⚠️ Main category '${slug}' not found in DB!`);
      }
    }

    for (const slug of allFrontendSubSlugs) {
      const cat = await categoriesCol.findOne({ slug, parentCategory: { $ne: null } });
      if (cat) {
        subCatMap[slug] = cat._id as mongoose.Types.ObjectId;
      } else {
        // Some subcategories may share slug with main categories, try finding without parent constraint
        const catAny = await categoriesCol.findOne({ slug });
        if (catAny) {
          subCatMap[slug] = catAny._id as mongoose.Types.ObjectId;
        }
      }
    }

    console.log(`   Found ${Object.keys(mainCatMap).length} main categories`);
    console.log(`   Found ${Object.keys(subCatMap).length} subcategories\n`);

    // ---- Step 2: Build ObjectId → slug reverse map for all categories ----
    const allCats = await categoriesCol.find({}).toArray();
    const catIdToSlug: Record<string, string> = {};
    const catIdToName: Record<string, string> = {};
    for (const cat of allCats) {
      catIdToSlug[cat._id.toString()] = cat.slug;
      catIdToName[cat._id.toString()] = cat.name;
    }

    // ---- Step 3: Get all stores ----
    const stores = await storesCol.find({ isActive: true }).toArray();
    console.log(`📊 Found ${stores.length} active stores\n`);

    // ---- Step 4: Analyze and map each store ----
    console.log('========================================');
    console.log('🔍 STORE → CATEGORY MAPPING ANALYSIS');
    console.log('========================================\n');

    const mappings: {
      storeId: any;
      storeName: string;
      currentCat: string;
      currentCatSlug: string;
      newMainCat: string;
      newMainCatSlug: string;
      newSubCat: string | null;
      newSubCatSlug: string | null;
      mainScore: number;
      subScore: number;
      alreadyLinked: boolean;
    }[] = [];

    let alreadyLinkedCount = 0;
    let needsLinkingCount = 0;
    let unmatchedCount = 0;

    for (const store of stores) {
      const currentCatId = store.category?.toString() || '';
      const currentCatSlug = catIdToSlug[currentCatId] || 'unknown';
      const currentCatName = catIdToName[currentCatId] || 'Unknown';

      // Check if already linked to a frontend main category
      const isAlreadyFrontendMain = frontendMainSlugs.includes(currentCatSlug);

      // Find best main category
      const mainMatch = findBestMainCategory(store, catIdToSlug);

      if (!mainMatch) {
        unmatchedCount++;
        mappings.push({
          storeId: store._id,
          storeName: store.name,
          currentCat: currentCatName,
          currentCatSlug,
          newMainCat: '❌ NO MATCH',
          newMainCatSlug: '',
          newSubCat: null,
          newSubCatSlug: null,
          mainScore: 0,
          subScore: 0,
          alreadyLinked: false,
        });
        continue;
      }

      const subMatch = findBestSubcategory(store, mainMatch.slug);

      // Check if already linked to this exact main cat
      const alreadyLinked = isAlreadyFrontendMain && currentCatSlug === mainMatch.slug;

      if (alreadyLinked) {
        alreadyLinkedCount++;
      } else {
        needsLinkingCount++;
      }

      mappings.push({
        storeId: store._id,
        storeName: store.name,
        currentCat: currentCatName,
        currentCatSlug,
        newMainCat: FRONTEND_CATEGORIES[mainMatch.slug].name,
        newMainCatSlug: mainMatch.slug,
        newSubCat: subMatch ? FRONTEND_CATEGORIES[mainMatch.slug].subcategories.find(s => s.slug === subMatch.slug)?.name || null : null,
        newSubCatSlug: subMatch?.slug || null,
        mainScore: mainMatch.score,
        subScore: subMatch?.score || 0,
        alreadyLinked,
      });
    }

    // ---- Step 5: Print Report ----

    // Group by new main category
    const byMainCat: Record<string, typeof mappings> = {};
    for (const m of mappings) {
      const key = m.newMainCatSlug || 'unmatched';
      if (!byMainCat[key]) byMainCat[key] = [];
      byMainCat[key].push(m);
    }

    for (const [mainSlug, storeMappings] of Object.entries(byMainCat)) {
      const catName = FRONTEND_CATEGORIES[mainSlug]?.name || '❌ UNMATCHED';
      console.log(`\n📁 ${catName} (${mainSlug}) — ${storeMappings.length} stores`);
      console.log('─'.repeat(60));

      for (const m of storeMappings) {
        const status = m.alreadyLinked ? '✅' : '🔄';
        const subInfo = m.newSubCatSlug ? ` → sub: ${m.newSubCat} (${m.newSubCatSlug})` : '';
        const currentInfo = m.alreadyLinked ? '' : ` [was: ${m.currentCat} (${m.currentCatSlug})]`;
        console.log(`   ${status} ${m.storeName}${subInfo}${currentInfo} (score: ${m.mainScore}/${m.subScore})`);
      }
    }

    console.log('\n========================================');
    console.log('📊 SUMMARY');
    console.log('========================================');
    console.log(`Total active stores: ${stores.length}`);
    console.log(`Already linked to frontend categories: ${alreadyLinkedCount}`);
    console.log(`Need linking: ${needsLinkingCount}`);
    console.log(`No match found: ${unmatchedCount}`);
    console.log('========================================\n');

    // ---- Step 6: Perform Migration ----
    if (needsLinkingCount === 0 && unmatchedCount === 0) {
      console.log('✅ All stores are already linked! Nothing to do.\n');
    } else {
      console.log('🔄 Performing migration...\n');

      let updatedCount = 0;
      let skippedCount = 0;
      let errorCount = 0;

      for (const m of mappings) {
        if (m.alreadyLinked || !m.newMainCatSlug) {
          skippedCount++;
          continue;
        }

        const mainCatId = mainCatMap[m.newMainCatSlug];
        if (!mainCatId) {
          console.log(`   ⚠️ Skipping "${m.storeName}" — main cat ID not found for ${m.newMainCatSlug}`);
          errorCount++;
          continue;
        }

        const updateFields: any = {
          category: mainCatId,
        };

        // Build subCategories array: keep existing + add new subcategory if matched
        if (m.newSubCatSlug && subCatMap[m.newSubCatSlug]) {
          // Get current subCategories and add the new one (avoid duplicates)
          const currentStore = await storesCol.findOne({ _id: m.storeId });
          const existingSubCats: mongoose.Types.ObjectId[] = currentStore?.subCategories || [];
          const newSubCatId = subCatMap[m.newSubCatSlug];

          const alreadyHasSub = existingSubCats.some(
            (id: any) => id.toString() === newSubCatId.toString()
          );

          if (!alreadyHasSub) {
            updateFields.subCategories = [...existingSubCats, newSubCatId];
          }
        }

        try {
          await storesCol.updateOne(
            { _id: m.storeId },
            { $set: updateFields }
          );
          updatedCount++;
          console.log(`   ✅ Linked: "${m.storeName}" → ${m.newMainCat}${m.newSubCat ? ` > ${m.newSubCat}` : ''}`);
        } catch (err: any) {
          errorCount++;
          console.log(`   ❌ Error linking "${m.storeName}": ${err.message}`);
        }
      }

      console.log('\n========================================');
      console.log('📊 MIGRATION RESULTS');
      console.log('========================================');
      console.log(`Updated: ${updatedCount}`);
      console.log(`Skipped (already linked): ${skippedCount}`);
      console.log(`Errors: ${errorCount}`);
      console.log('========================================\n');
    }

    // ---- Step 7: Post-migration verification ----
    console.log('🔍 POST-MIGRATION VERIFICATION\n');

    for (const [slug, config] of Object.entries(FRONTEND_CATEGORIES)) {
      const mainCatId = mainCatMap[slug];
      if (!mainCatId) continue;

      // Count stores with this main category
      const mainCount = await storesCol.countDocuments({ category: mainCatId, isActive: true });

      // Count stores in subcategories
      const subCounts: string[] = [];
      for (const sub of config.subcategories) {
        const subCatId = subCatMap[sub.slug];
        if (!subCatId) continue;
        const count = await storesCol.countDocuments({
          isActive: true,
          $or: [
            { subCategories: subCatId },
            { category: subCatId }
          ]
        });
        if (count > 0) {
          subCounts.push(`${sub.name}: ${count}`);
        }
      }

      console.log(`📁 ${config.name} (${slug}): ${mainCount} stores`);
      if (subCounts.length > 0) {
        for (const sc of subCounts) {
          console.log(`      └─ ${sc}`);
        }
      }
    }

    console.log('');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    console.log('✅ Done!');
  }
}

linkStoresToCategories();
