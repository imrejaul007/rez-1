/**
 * Script to update stores to match the store.md file
 * - Update existing stores with new names/details
 * - Remove extra stores
 * - Redistribute products to match store categories
 *
 * Run: npx ts-node src/scripts/updateStoresToMatchMd.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI as string;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); }
;
const DB_NAME = process.env.DB_NAME || 'test';

// Target stores from store.md - organized by main category
interface StoreTemplate {
  name: string;
  description: string;
  categorySlug: string; // Main category slug
  subCategorySlug?: string; // Sub category slug
  tags: string[];
  logo: string;
  address: string;
}

const TARGET_STORES: StoreTemplate[] = [
  // A. FOOD & DINING
  { name: 'Dyu Art Cafe', description: 'Artistic cafe with specialty coffee and creative cuisine', categorySlug: 'food-dining', subCategorySlug: 'cafes', tags: ['cafe', 'art', 'coffee', 'local'], logo: 'https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=400', address: 'Koramangala, Bengaluru' },
  { name: 'Starbucks', description: 'World-famous coffeehouse chain', categorySlug: 'food-dining', subCategorySlug: 'cafes', tags: ['cafe', 'coffee', 'chain', 'premium'], logo: 'https://images.unsplash.com/photo-1453614512568-c4024d13c247?w=400', address: 'Indiranagar, Bengaluru' },
  { name: 'Barbeque Nation', description: 'Popular family restaurant with live grills', categorySlug: 'food-dining', subCategorySlug: 'family-restaurants', tags: ['restaurant', 'bbq', 'family', 'buffet'], logo: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400', address: 'JP Nagar, Bengaluru' },
  { name: 'Chianti', description: 'Fine dining Italian restaurant', categorySlug: 'food-dining', subCategorySlug: 'fine-dining', tags: ['fine-dining', 'italian', 'premium', 'wine'], logo: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400', address: 'UB City, Bengaluru' },
  { name: 'KFC', description: 'Kentucky Fried Chicken - finger lickin good', categorySlug: 'food-dining', subCategorySlug: 'qsr-fast-food', tags: ['fast-food', 'chicken', 'qsr', 'chain'], logo: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=400', address: 'MG Road, Bengaluru' },
  { name: "McDonald's", description: 'World famous burgers and fries', categorySlug: 'food-dining', subCategorySlug: 'qsr-fast-food', tags: ['fast-food', 'burgers', 'qsr', 'chain'], logo: 'https://images.unsplash.com/photo-1619881589316-7d46d2a5e5e4?w=400', address: 'Brigade Road, Bengaluru' },
  { name: "Domino's Pizza", description: 'Pizza delivery experts', categorySlug: 'food-dining', subCategorySlug: 'qsr-fast-food', tags: ['pizza', 'fast-food', 'delivery', 'chain'], logo: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400', address: 'HSR Layout, Bengaluru' },
  { name: 'Empire Restaurant', description: 'Iconic Bengaluru biryani and kebabs', categorySlug: 'food-dining', subCategorySlug: 'family-restaurants', tags: ['biryani', 'kebabs', 'local', 'non-veg'], logo: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400', address: 'Church Street, Bengaluru' },
  { name: 'Corner House', description: 'Bengaluru favorite for ice cream since 1982', categorySlug: 'food-dining', subCategorySlug: 'ice-cream-dessert', tags: ['ice-cream', 'dessert', 'local-favorite', 'iconic'], logo: 'https://images.unsplash.com/photo-1501443762994-82bd5dace89a?w=400', address: 'Residency Road, Bengaluru' },
  { name: 'Baskin Robbins', description: '31 flavors of premium ice cream', categorySlug: 'food-dining', subCategorySlug: 'ice-cream-dessert', tags: ['ice-cream', 'dessert', 'chain', 'premium'], logo: 'https://images.unsplash.com/photo-1557142046-c704a3adf364?w=400', address: 'Jayanagar, Bengaluru' },
  { name: 'Theobroma', description: 'Artisanal bakery and patisserie', categorySlug: 'food-dining', subCategorySlug: 'bakery-confectionery', tags: ['bakery', 'dessert', 'cakes', 'premium'], logo: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400', address: 'Indiranagar, Bengaluru' },
  { name: "Glen's Bakehouse", description: 'European style bakery and cafe', categorySlug: 'food-dining', subCategorySlug: 'bakery-confectionery', tags: ['bakery', 'cafe', 'european', 'cakes'], logo: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400', address: 'Koramangala, Bengaluru' },
  { name: 'Iyengar Bakery', description: 'Traditional South Indian bakery', categorySlug: 'food-dining', subCategorySlug: 'bakery-confectionery', tags: ['bakery', 'traditional', 'south-indian', 'local'], logo: 'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=400', address: 'Basavanagudi, Bengaluru' },
  { name: 'Mojo Pizza', description: 'Cloud kitchen pizza delivery', categorySlug: 'food-dining', subCategorySlug: 'cloud-kitchens', tags: ['cloud-kitchen', 'pizza', 'delivery'], logo: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400', address: 'Delivery Only, Bengaluru' },
  { name: 'Behrouz Biryani', description: 'Royal biryani delivery', categorySlug: 'food-dining', subCategorySlug: 'cloud-kitchens', tags: ['cloud-kitchen', 'biryani', 'delivery', 'premium'], logo: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=400', address: 'Delivery Only, Bengaluru' },
  { name: 'Box8', description: 'Meal box delivery service', categorySlug: 'food-dining', subCategorySlug: 'cloud-kitchens', tags: ['cloud-kitchen', 'meals', 'delivery', 'healthy'], logo: 'https://images.unsplash.com/photo-1536304929831-ee1ca9d44906?w=400', address: 'Delivery Only, Bengaluru' },

  // B. GROCERY & ESSENTIALS
  { name: 'D Mart', description: 'One stop shop for daily needs', categorySlug: 'grocery-essentials', subCategorySlug: 'supermarkets', tags: ['supermarket', 'value', 'grocery', 'chain'], logo: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=400', address: 'Whitefield, Bengaluru' },
  { name: 'Spar Hypermarket', description: 'International hypermarket chain', categorySlug: 'grocery-essentials', subCategorySlug: 'supermarkets', tags: ['supermarket', 'hypermarket', 'international'], logo: 'https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=400', address: 'Forum Mall, Bengaluru' },
  { name: 'Reliance Smart', description: 'Smart shopping destination', categorySlug: 'grocery-essentials', subCategorySlug: 'supermarkets', tags: ['supermarket', 'reliance', 'grocery'], logo: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=400', address: 'Marathahalli, Bengaluru' },
  { name: 'Mahesh Provision Store', description: 'Your neighborhood kirana store', categorySlug: 'grocery-essentials', subCategorySlug: 'kirana-stores', tags: ['kirana', 'local', 'provisions', 'neighborhood'], logo: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=400', address: 'HSR Layout, Bengaluru' },
  { name: 'Om Super Market', description: 'Daily essentials at best prices', categorySlug: 'grocery-essentials', subCategorySlug: 'kirana-stores', tags: ['kirana', 'local', 'essentials'], logo: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=400', address: 'Koramangala, Bengaluru' },
  { name: 'Book My Can', description: 'Water can delivery service', categorySlug: 'grocery-essentials', subCategorySlug: 'water-cans', tags: ['water', 'delivery', 'cans', 'service'], logo: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400', address: 'HSR Layout, Bengaluru' },
  { name: 'Royal Water Supply', description: 'Premium water can delivery', categorySlug: 'grocery-essentials', subCategorySlug: 'water-cans', tags: ['water', 'delivery', 'premium'], logo: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400', address: 'Koramangala, Bengaluru' },
  { name: 'Namdharis Fresh', description: 'Fresh fruits, vegetables and dairy', categorySlug: 'grocery-essentials', subCategorySlug: 'dairy', tags: ['fresh', 'vegetables', 'fruits', 'organic'], logo: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400', address: 'Indiranagar, Bengaluru' },
  { name: 'Nandini Milk Parlor', description: 'Karnataka Milk Federation outlet', categorySlug: 'grocery-essentials', subCategorySlug: 'dairy', tags: ['dairy', 'milk', 'local', 'kmf'], logo: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400', address: 'Multiple Locations, Bengaluru' },

  // C. BEAUTY, WELLNESS & PERSONAL CARE
  { name: 'Naturals Salon', description: 'Premium unisex salon', categorySlug: 'beauty-wellness', subCategorySlug: 'salons', tags: ['salon', 'unisex', 'premium', 'chain'], logo: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400', address: 'Indiranagar, Bengaluru' },
  { name: 'Green Trends Salon', description: 'Trendy affordable salon', categorySlug: 'beauty-wellness', subCategorySlug: 'salons', tags: ['salon', 'affordable', 'chain'], logo: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400', address: 'Jayanagar, Bengaluru' },
  { name: 'Lakme Salon', description: 'Iconic beauty destination', categorySlug: 'beauty-wellness', subCategorySlug: 'salons', tags: ['salon', 'beauty', 'premium', 'iconic'], logo: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400', address: 'Koramangala, Bengaluru' },
  { name: 'YLG Salon', description: 'Waxing and beauty experts', categorySlug: 'beauty-wellness', subCategorySlug: 'beauty-services', tags: ['salon', 'waxing', 'beauty'], logo: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=400', address: 'HSR Layout, Bengaluru' },
  { name: 'Vriddhi Wellness Spa', description: 'Holistic wellness and spa treatments', categorySlug: 'beauty-wellness', subCategorySlug: 'spa-massage', tags: ['spa', 'wellness', 'massage', 'holistic'], logo: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400', address: 'Whitefield, Bengaluru' },
  { name: 'Cutis Hospital', description: 'Specialized dermatology clinic', categorySlug: 'beauty-wellness', subCategorySlug: 'dermatology', tags: ['dermatology', 'skin', 'clinic', 'specialist'], logo: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=400', address: 'Sadashivanagar, Bengaluru' },

  // D. HEALTHCARE
  { name: 'Apollo Pharmacy', description: 'Trusted pharmacy chain', categorySlug: 'healthcare', subCategorySlug: 'pharmacy', tags: ['pharmacy', 'medicine', 'chain', 'trusted'], logo: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400', address: 'Multiple Locations, Bengaluru' },
  { name: 'Wellness Forever', description: 'Health and wellness pharmacy', categorySlug: 'healthcare', subCategorySlug: 'pharmacy', tags: ['pharmacy', 'wellness', 'health'], logo: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=400', address: 'Indiranagar, Bengaluru' },
  { name: 'MedPlus', description: 'Affordable medicines and healthcare', categorySlug: 'healthcare', subCategorySlug: 'pharmacy', tags: ['pharmacy', 'affordable', 'chain'], logo: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400', address: 'Koramangala, Bengaluru' },
  { name: 'Apollo Clinic', description: 'Multi-specialty clinic', categorySlug: 'healthcare', subCategorySlug: 'clinics', tags: ['clinic', 'multi-specialty', 'apollo'], logo: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=400', address: 'Jayanagar, Bengaluru' },
  { name: 'Thyrocare', description: 'Diagnostic lab services', categorySlug: 'healthcare', subCategorySlug: 'diagnostics', tags: ['diagnostics', 'lab', 'tests', 'healthcare'], logo: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=400', address: 'HSR Layout, Bengaluru' },
  { name: 'WeCare Home Nursing', description: 'Professional home nursing services', categorySlug: 'healthcare', subCategorySlug: 'home-nursing', tags: ['nursing', 'home-care', 'healthcare'], logo: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=400', address: 'Bengaluru' },
  { name: 'Relief Physiotherapy', description: 'Expert physiotherapy services', categorySlug: 'healthcare', subCategorySlug: 'physiotherapy', tags: ['physiotherapy', 'rehab', 'healthcare'], logo: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=400', address: 'Indiranagar, Bengaluru' },

  // E. FASHION
  { name: 'Lifestyle', description: 'Fashion and lifestyle store', categorySlug: 'fashion', subCategorySlug: 'local-brands', tags: ['fashion', 'lifestyle', 'clothing', 'chain'], logo: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400', address: 'Phoenix Mall, Bengaluru' },
  { name: 'Central', description: 'Multi-brand fashion destination', categorySlug: 'fashion', subCategorySlug: 'local-brands', tags: ['fashion', 'multi-brand', 'shopping'], logo: 'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=400', address: 'JP Nagar, Bengaluru' },
  { name: 'Bata', description: 'Trusted footwear brand', categorySlug: 'fashion', subCategorySlug: 'footwear', tags: ['footwear', 'shoes', 'trusted', 'chain'], logo: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400', address: 'Commercial Street, Bengaluru' },
  { name: 'Metro Shoes', description: 'Premium footwear collection', categorySlug: 'fashion', subCategorySlug: 'footwear', tags: ['footwear', 'premium', 'shoes'], logo: 'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=400', address: 'Brigade Road, Bengaluru' },
  { name: 'Puma Store', description: 'Sports and lifestyle footwear', categorySlug: 'fashion', subCategorySlug: 'footwear', tags: ['sports', 'footwear', 'lifestyle', 'brand'], logo: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=400', address: 'Orion Mall, Bengaluru' },
  { name: 'Tanishq', description: 'Premium jewelry from Tata', categorySlug: 'fashion', subCategorySlug: 'jewelry', tags: ['jewelry', 'gold', 'premium', 'tata'], logo: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400', address: 'MG Road, Bengaluru' },
  { name: 'CaratLane', description: 'Contemporary jewelry designs', categorySlug: 'fashion', subCategorySlug: 'jewelry', tags: ['jewelry', 'contemporary', 'online'], logo: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400', address: 'Indiranagar, Bengaluru' },

  // F. FITNESS & SPORTS
  { name: 'Cult.fit', description: 'Fitness centers and classes', categorySlug: 'fitness-sports', subCategorySlug: 'gyms', tags: ['fitness', 'gym', 'classes', 'cult'], logo: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400', address: 'Multiple Locations, Bengaluru' },
  { name: "Gold's Gym", description: 'World-famous gym chain', categorySlug: 'fitness-sports', subCategorySlug: 'gyms', tags: ['gym', 'fitness', 'international', 'chain'], logo: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400', address: 'Koramangala, Bengaluru' },
  { name: 'F45 Training', description: 'Functional 45 minute workouts', categorySlug: 'fitness-sports', subCategorySlug: 'crossfit', tags: ['fitness', 'functional', 'training', 'hiit'], logo: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400', address: 'Indiranagar, Bengaluru' },

  // G. EDUCATION & LEARNING
  { name: 'Career Launcher', description: 'Test prep and career coaching', categorySlug: 'education-learning', subCategorySlug: 'coaching-centers', tags: ['coaching', 'test-prep', 'career'], logo: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=400', address: 'Koramangala, Bengaluru' },
  { name: 'TIME Institute', description: 'MBA and competitive exam coaching', categorySlug: 'education-learning', subCategorySlug: 'coaching-centers', tags: ['coaching', 'mba', 'competitive-exams'], logo: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=400', address: 'Jayanagar, Bengaluru' },
  { name: 'Aptech Computer Education', description: 'IT and computer training', categorySlug: 'education-learning', subCategorySlug: 'skill-development', tags: ['computer', 'it', 'training', 'skills'], logo: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400', address: 'BTM Layout, Bengaluru' },
  { name: 'FITA Academy', description: 'IT training and placement', categorySlug: 'education-learning', subCategorySlug: 'vocational', tags: ['it', 'training', 'placement', 'vocational'], logo: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400', address: 'Marathahalli, Bengaluru' },

  // H. HOME SERVICES
  { name: 'Urban Company', description: 'Home services platform', categorySlug: 'home-services', subCategorySlug: 'ac-repair', tags: ['home-services', 'platform', 'repairs'], logo: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400', address: 'Bengaluru' },
  { name: 'HiCare', description: 'Pest control services', categorySlug: 'home-services', subCategorySlug: 'pest-control', tags: ['pest-control', 'hygiene', 'home-services'], logo: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=400', address: 'Bengaluru' },
  { name: 'Dryclean Express', description: 'Professional laundry services', categorySlug: 'home-services', subCategorySlug: 'laundry-dry-cleaning', tags: ['laundry', 'dry-clean', 'service'], logo: 'https://images.unsplash.com/photo-1545173168-9f1947eebb7f?w=400', address: 'HSR Layout, Bengaluru' },

  // I. TRAVEL & EXPERIENCES
  { name: 'Grand Mercure', description: 'Premium hotel stays', categorySlug: 'travel-experiences', subCategorySlug: 'hotels', tags: ['hotel', 'premium', 'stay', 'accor'], logo: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400', address: 'Koramangala, Bengaluru' },
  { name: 'OYO Rooms', description: 'Budget hotel booking', categorySlug: 'travel-experiences', subCategorySlug: 'hotels', tags: ['hotel', 'budget', 'booking', 'chain'], logo: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400', address: 'Multiple Locations, Bengaluru' },
  { name: 'Rapido', description: 'Bike taxi service', categorySlug: 'travel-experiences', subCategorySlug: 'taxis', tags: ['taxi', 'bike', 'transport', 'app'], logo: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400', address: 'Bengaluru' },
  { name: 'Royal Brothers', description: 'Bike and scooter rentals', categorySlug: 'travel-experiences', subCategorySlug: 'bike-rentals', tags: ['bike', 'rental', 'scooter', 'travel'], logo: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400', address: 'Multiple Locations, Bengaluru' },

  // J. ENTERTAINMENT
  { name: 'Fun World', description: 'Amusement park and resort', categorySlug: 'entertainment', subCategorySlug: 'amusement-parks', tags: ['amusement', 'park', 'fun', 'family'], logo: 'https://images.unsplash.com/photo-1513889961551-628c1e5e2ee9?w=400', address: 'Palace Grounds, Bengaluru' },
  { name: 'Timezone', description: 'Gaming and entertainment zone', categorySlug: 'entertainment', subCategorySlug: 'gaming-cafes', tags: ['gaming', 'arcade', 'entertainment'], logo: 'https://images.unsplash.com/photo-1511882150382-421056c89033?w=400', address: 'Phoenix Mall, Bengaluru' },
  { name: 'Mystery Rooms', description: 'Escape room experiences', categorySlug: 'entertainment', subCategorySlug: 'vr-ar-experiences', tags: ['escape-room', 'experience', 'games'], logo: 'https://images.unsplash.com/photo-1533488765986-dfa2a9939acd?w=400', address: 'Koramangala, Bengaluru' },

  // K. FINANCIAL LIFESTYLE
  { name: 'Excitel Broadband', description: 'High-speed internet service', categorySlug: 'financial-lifestyle', subCategorySlug: 'broadband', tags: ['broadband', 'internet', 'isp'], logo: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=400', address: 'Bengaluru' },
  { name: 'ACT Fibernet', description: 'Fiber optic internet provider', categorySlug: 'financial-lifestyle', subCategorySlug: 'broadband', tags: ['broadband', 'fiber', 'internet'], logo: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=400', address: 'Bengaluru' },
  { name: 'Muthoot FinCorp', description: 'Gold loans and financial services', categorySlug: 'financial-lifestyle', subCategorySlug: 'gold-savings', tags: ['gold', 'loan', 'finance'], logo: 'https://images.unsplash.com/photo-1610375461246-83df859d849d?w=400', address: 'Multiple Locations, Bengaluru' },

  // Electronics (under Fashion category as per store.md)
  { name: 'Croma', description: 'Electronics and appliances megastore', categorySlug: 'fashion', subCategorySlug: 'electronics', tags: ['electronics', 'appliances', 'tata'], logo: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=400', address: 'Indiranagar, Bengaluru' },
  { name: 'Reliance Digital', description: 'Digital and electronics store', categorySlug: 'fashion', subCategorySlug: 'electronics', tags: ['electronics', 'digital', 'reliance'], logo: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400', address: 'Koramangala, Bengaluru' },
  { name: 'Aptronix', description: 'Apple authorized reseller', categorySlug: 'fashion', subCategorySlug: 'mobile-accessories', tags: ['apple', 'electronics', 'premium'], logo: 'https://images.unsplash.com/photo-1491933382434-500287f9b54b?w=400', address: 'UB City, Bengaluru' },
  { name: 'Sangeetha Mobiles', description: 'Mobile phones and accessories', categorySlug: 'fashion', subCategorySlug: 'mobile-accessories', tags: ['mobile', 'accessories', 'local'], logo: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400', address: 'SP Road, Bengaluru' },
];

async function updateStoresToMatchMd() {
  try {
    console.log('🚀 Starting store update to match store.md...');
    console.log(`📡 Connecting to MongoDB...`);

    await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db!;

    // Get existing stores to find merchant ID
    const existingStores = await db.collection('stores').find({}).toArray();
    const merchantId = (existingStores[0] as any)?.merchantId;
    console.log(`📦 Found ${existingStores.length} existing stores`);
    console.log(`👤 Merchant ID: ${merchantId}\n`);

    // Get all categories
    const categories = await db.collection('categories').find({}).toArray();
    const categoryMap = new Map<string, any>();
    categories.forEach((cat: any) => {
      categoryMap.set(cat.slug, cat);
    });
    console.log(`📂 Loaded ${categories.length} categories`);

    // Step 1: Delete all existing stores
    console.log('\n========================================');
    console.log('STEP 1: REMOVING EXISTING STORES');
    console.log('========================================\n');

    const deleteResult = await db.collection('stores').deleteMany({});
    console.log(`✅ Deleted ${deleteResult.deletedCount} existing stores`);

    // Step 2: Create new stores from TARGET_STORES
    console.log('\n========================================');
    console.log('STEP 2: CREATING NEW STORES');
    console.log('========================================\n');

    const newStores: any[] = [];
    const categoryStats: Record<string, number> = {};

    for (const template of TARGET_STORES) {
      const mainCategory = categoryMap.get(template.categorySlug);
      const subCategory = template.subCategorySlug ? categoryMap.get(template.subCategorySlug) : null;

      if (!mainCategory) {
        console.log(`⚠️ Category not found: ${template.categorySlug}`);
        continue;
      }

      const uniqueSuffix = Math.random().toString(36).substring(2, 8);
      const slug = `${template.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${uniqueSuffix}`;

      const store = {
        name: template.name,
        slug: slug,
        description: template.description,
        shortDescription: template.description.substring(0, 100),
        category: mainCategory._id,
        subCategory: subCategory?._id,
        merchantId: new mongoose.Types.ObjectId(merchantId),
        logo: template.logo,
        coverImage: template.logo,
        images: [template.logo],
        tags: template.tags,
        address: {
          street: template.address,
          city: 'Bengaluru',
          state: 'Karnataka',
          pincode: '560001',
          country: 'India'
        },
        location: {
          type: 'Point',
          coordinates: [77.5946 + (Math.random() - 0.5) * 0.1, 12.9716 + (Math.random() - 0.5) * 0.1]
        },
        contact: {
          phone: `+91 ${Math.floor(7000000000 + Math.random() * 2999999999)}`,
          email: `${template.name.toLowerCase().replace(/[^a-z0-9]+/g, '')}@store.com`
        },
        businessHours: {
          monday: { open: '09:00', close: '21:00', isOpen: true },
          tuesday: { open: '09:00', close: '21:00', isOpen: true },
          wednesday: { open: '09:00', close: '21:00', isOpen: true },
          thursday: { open: '09:00', close: '21:00', isOpen: true },
          friday: { open: '09:00', close: '21:00', isOpen: true },
          saturday: { open: '09:00', close: '22:00', isOpen: true },
          sunday: { open: '10:00', close: '20:00', isOpen: true }
        },
        ratings: {
          average: 3.5 + Math.random() * 1.5,
          count: Math.floor(50 + Math.random() * 500)
        },
        isActive: true,
        isVerified: true,
        isFeatured: Math.random() > 0.7,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      newStores.push(store);
      categoryStats[template.categorySlug] = (categoryStats[template.categorySlug] || 0) + 1;
    }

    // Insert all stores
    const insertResult = await db.collection('stores').insertMany(newStores);
    console.log(`✅ Created ${insertResult.insertedCount} new stores`);

    console.log('\nStores per category:');
    for (const [cat, count] of Object.entries(categoryStats).sort((a, b) => b[1] - a[1])) {
      console.log(`   ${cat}: ${count} stores`);
    }

    // Step 3: Redistribute products to new stores
    console.log('\n========================================');
    console.log('STEP 3: REDISTRIBUTING PRODUCTS');
    console.log('========================================\n');

    // Get all products
    const products = await db.collection('products').find({ isDeleted: { $ne: true } }).toArray();
    console.log(`📦 Found ${products.length} products to redistribute`);

    // Get new stores
    const createdStores = await db.collection('stores').find({}).toArray();

    // Group stores by category
    const storesByCategory = new Map<string, any[]>();
    for (const store of createdStores) {
      const catId = (store as any).category.toString();
      if (!storesByCategory.has(catId)) {
        storesByCategory.set(catId, []);
      }
      storesByCategory.get(catId)!.push(store);
    }

    let redistributedCount = 0;
    const productCategoryStats: Record<string, number> = {};

    for (const product of products) {
      const p = product as any;
      const productCategoryId = p.category?.toString();

      if (!productCategoryId) continue;

      // Find stores in the same category
      let matchingStores = storesByCategory.get(productCategoryId);

      // If no stores in this category, find stores in parent category
      if (!matchingStores || matchingStores.length === 0) {
        // Get the category to find its parent
        const productCategory = categoryMap.get(productCategoryId) ||
                               categories.find(c => (c as any)._id.toString() === productCategoryId);

        if (productCategory && (productCategory as any).parentCategory) {
          const parentCatId = (productCategory as any).parentCategory.toString();
          matchingStores = storesByCategory.get(parentCatId);
        }

        // If still no match, use food-dining stores as fallback
        if (!matchingStores || matchingStores.length === 0) {
          const foodDiningCat = categoryMap.get('food-dining');
          if (foodDiningCat) {
            matchingStores = storesByCategory.get(foodDiningCat._id.toString());
          }
        }
      }

      if (matchingStores && matchingStores.length > 0) {
        // Pick a random store from matching stores
        const randomStore = matchingStores[Math.floor(Math.random() * matchingStores.length)];

        await db.collection('products').updateOne(
          { _id: p._id },
          { $set: { store: randomStore._id } }
        );

        redistributedCount++;
        productCategoryStats[productCategoryId] = (productCategoryStats[productCategoryId] || 0) + 1;
      }
    }

    console.log(`✅ Redistributed ${redistributedCount} products to new stores`);

    // Summary
    console.log('\n========================================');
    console.log('📊 FINAL SUMMARY');
    console.log('========================================');

    const finalStoreCount = await db.collection('stores').countDocuments({});
    const finalProductCount = await db.collection('products').countDocuments({ isDeleted: { $ne: true } });

    console.log(`Total stores: ${finalStoreCount}`);
    console.log(`Total products: ${finalProductCount}`);

    // Show products per store (sample)
    console.log('\nProducts per store (sample):');
    for (const store of createdStores.slice(0, 15)) {
      const s = store as any;
      const productCount = await db.collection('products').countDocuments({ store: s._id });
      console.log(`   ${s.name}: ${productCount} products`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

updateStoresToMatchMd()
  .then(() => {
    console.log('✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
