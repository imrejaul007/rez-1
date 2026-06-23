/**
 * Explore Page Seeds - Comprehensive seed data for Explore page
 * Run with: npx ts-node src/seeds/exploreSeeds.ts
 *
 * This seeds:
 * - Sample Users (for UGC)
 * - Stores (60+ across Delhi, Mumbai, Bangalore)
 * - Products (100+)
 * - Videos/Reels (50+)
 * - Offers (50+)
 * - Reviews (100+)
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

// Import models
import { Category } from '../models/Category';
import { Store } from '../models/Store';
import { Product } from '../models/Product';
import Offer from '../models/Offer';
import { Video } from '../models/Video';
import { Review } from '../models/Review';
import { User } from '../models/User';

// ==========================================
// CITY COORDINATES
// ==========================================
const CITY_COORDS = {
  delhi: { center: [77.2090, 28.6139], areas: [
    { name: 'Connaught Place', coords: [77.2195, 28.6329] },
    { name: 'Saket', coords: [77.2177, 28.5244] },
    { name: 'Khan Market', coords: [77.2273, 28.6001] },
    { name: 'Lajpat Nagar', coords: [77.2437, 28.5685] },
    { name: 'Greater Kailash', coords: [77.2341, 28.5494] },
    { name: 'Karol Bagh', coords: [77.1903, 28.6519] },
    { name: 'Rajouri Garden', coords: [77.1220, 28.6473] },
    { name: 'Dwarka', coords: [77.0410, 28.5921] },
    { name: 'Pitampura', coords: [77.1427, 28.6969] },
    { name: 'Nehru Place', coords: [77.2509, 28.5491] },
  ]},
  mumbai: { center: [72.8777, 19.0760], areas: [
    { name: 'Bandra West', coords: [72.8296, 19.0596] },
    { name: 'Andheri West', coords: [72.8362, 19.1197] },
    { name: 'Juhu', coords: [72.8296, 19.1075] },
    { name: 'Colaba', coords: [72.8263, 18.9067] },
    { name: 'Lower Parel', coords: [72.8252, 18.9977] },
    { name: 'Powai', coords: [72.9060, 19.1176] },
    { name: 'Worli', coords: [72.8150, 19.0176] },
    { name: 'Malad West', coords: [72.8362, 19.1864] },
    { name: 'Goregaon', coords: [72.8491, 19.1663] },
    { name: 'Fort', coords: [72.8347, 18.9322] },
  ]},
  bangalore: { center: [77.5946, 12.9716], areas: [
    { name: 'Koramangala', coords: [77.6101, 12.9352] },
    { name: 'Indiranagar', coords: [77.6411, 12.9719] },
    { name: 'HSR Layout', coords: [77.6245, 12.9116] },
    { name: 'Whitefield', coords: [77.7499, 12.9698] },
    { name: 'Jayanagar', coords: [77.5826, 12.9307] },
    { name: 'Malleshwaram', coords: [77.5726, 13.0035] },
    { name: 'JP Nagar', coords: [77.5826, 12.8912] },
    { name: 'BTM Layout', coords: [77.6152, 12.9166] },
    { name: 'Electronic City', coords: [77.6700, 12.8395] },
    { name: 'MG Road', coords: [77.6070, 12.9758] },
  ]},
};

// ==========================================
// RELIABLE VIDEO URLs (Google Cloud Storage - 100% uptime)
// ==========================================
const VIDEO_URLS = {
  food: [
    'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    'https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  ],
  coffee: [
    'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
  ],
  fashion: [
    'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
    'https://storage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    'https://storage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4',
  ],
  beauty: [
    'https://storage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    'https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
  ],
  electronics: [
    'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    'https://assets.mixkit.co/videos/preview/mixkit-man-using-smartphone-sitting-in-a-sofa-3095-large.mp4',
  ],
  grocery: [
    'https://assets.mixkit.co/videos/preview/mixkit-women-shopping-in-a-supermarket-4844-large.mp4',
    'https://assets.mixkit.co/videos/preview/mixkit-organic-vegetables-at-a-farmers-market-4815-large.mp4',
    'https://assets.mixkit.co/videos/preview/mixkit-vegetables-and-fruits-on-a-cutting-board-18655-large.mp4',
  ],
  fitness: [
    'https://assets.mixkit.co/videos/preview/mixkit-woman-doing-leg-exercises-in-a-gym-23443-large.mp4',
    'https://assets.mixkit.co/videos/preview/mixkit-man-running-on-a-treadmill-4823-large.mp4',
    'https://assets.mixkit.co/videos/preview/mixkit-woman-training-at-the-gym-4834-large.mp4',
  ],
};

// ==========================================
// THUMBNAIL URLs (Unsplash)
// ==========================================
const THUMBNAIL_URLS = {
  food: [
    'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400',
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400',
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400',
    'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400',
    'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400',
  ],
  coffee: [
    'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400',
    'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400',
    'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400',
  ],
  fashion: [
    'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400',
    'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=400',
    'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=400',
  ],
  beauty: [
    'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400',
    'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400',
    'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=400',
  ],
  electronics: [
    'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400',
    'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400',
    'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400',
  ],
  grocery: [
    'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400',
    'https://images.unsplash.com/photo-1498579150354-977475b7ea0b?w=400',
    'https://images.unsplash.com/photo-1608686207856-001b95cf60ca?w=400',
  ],
  fitness: [
    'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400',
    'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400',
  ],
};

// ==========================================
// SAMPLE USERS FOR UGC
// ==========================================
const sampleUsers = [
  { firstName: 'Priya', lastName: 'Sharma', phone: '9876543201', city: 'Delhi' },
  { firstName: 'Rahul', lastName: 'Kumar', phone: '9876543202', city: 'Mumbai' },
  { firstName: 'Ananya', lastName: 'Reddy', phone: '9876543203', city: 'Bangalore' },
  { firstName: 'Arjun', lastName: 'Singh', phone: '9876543204', city: 'Delhi' },
  { firstName: 'Sneha', lastName: 'Patel', phone: '9876543205', city: 'Mumbai' },
  { firstName: 'Vikram', lastName: 'Rao', phone: '9876543206', city: 'Bangalore' },
  { firstName: 'Kavita', lastName: 'Gupta', phone: '9876543207', city: 'Delhi' },
  { firstName: 'Rohan', lastName: 'Malhotra', phone: '9876543208', city: 'Mumbai' },
  { firstName: 'Meera', lastName: 'Iyer', phone: '9876543209', city: 'Bangalore' },
  { firstName: 'Amit', lastName: 'Desai', phone: '9876543210', city: 'Delhi' },
  { firstName: 'Divya', lastName: 'Nair', phone: '9876543211', city: 'Mumbai' },
  { firstName: 'Karthik', lastName: 'Menon', phone: '9876543212', city: 'Bangalore' },
  { firstName: 'Pooja', lastName: 'Verma', phone: '9876543213', city: 'Delhi' },
  { firstName: 'Sanjay', lastName: 'Joshi', phone: '9876543214', city: 'Mumbai' },
  { firstName: 'Riya', lastName: 'Kapoor', phone: '9876543215', city: 'Bangalore' },
  { firstName: 'Aditya', lastName: 'Bhatt', phone: '9876543216', city: 'Delhi' },
  { firstName: 'Nisha', lastName: 'Shah', phone: '9876543217', city: 'Mumbai' },
  { firstName: 'Varun', lastName: 'Hegde', phone: '9876543218', city: 'Bangalore' },
  { firstName: 'Shruti', lastName: 'Agarwal', phone: '9876543219', city: 'Delhi' },
  { firstName: 'Akash', lastName: 'Choudhary', phone: '9876543220', city: 'Mumbai' },
];

// ==========================================
// STORE DATA BY CITY
// ==========================================
const storeData = {
  delhi: [
    // Food & Restaurants
    { name: 'Haldirams', slug: 'haldirams-connaught-place', category: 'food', description: 'Authentic Indian sweets and namkeen since 1937', tags: ['indian', 'sweets', 'vegetarian', 'halal'], cashback: 15, partnerLevel: 'platinum', area: 0 },
    { name: 'Bikanervala', slug: 'bikanervala-karol-bagh', category: 'food', description: 'Traditional Indian cuisine and sweets', tags: ['indian', 'sweets', 'vegetarian'], cashback: 12, partnerLevel: 'gold', area: 5 },
    { name: 'Dominos Pizza', slug: 'dominos-saket', category: 'food', description: 'Fresh hot pizzas delivered in 30 minutes', tags: ['pizza', 'fast-food', 'delivery'], cashback: 18, partnerLevel: 'gold', area: 1 },
    { name: 'KFC', slug: 'kfc-khan-market', category: 'food', description: "Kentucky Fried Chicken - Finger lickin' good", tags: ['chicken', 'fast-food', 'non-veg'], cashback: 15, partnerLevel: 'gold', area: 2 },
    { name: 'McDonalds', slug: 'mcdonalds-lajpat-nagar', category: 'food', description: 'Global fast food chain', tags: ['burger', 'fast-food', 'quick-bites'], cashback: 10, partnerLevel: 'silver', area: 3 },
    { name: 'Pizza Hut', slug: 'pizza-hut-greater-kailash', category: 'food', description: 'Pan pizzas and pasta', tags: ['pizza', 'italian', 'delivery'], cashback: 15, partnerLevel: 'gold', area: 4 },
    { name: 'Subway', slug: 'subway-rajouri-garden', category: 'food', description: 'Fresh made subs and salads', tags: ['sandwich', 'healthy', 'quick-bites'], cashback: 12, partnerLevel: 'silver', area: 6 },
    { name: 'Burger King', slug: 'burger-king-dwarka', category: 'food', description: 'Flame-grilled burgers', tags: ['burger', 'fast-food', 'non-veg'], cashback: 14, partnerLevel: 'gold', area: 7 },
    // Cafes
    { name: 'Starbucks Reserve', slug: 'starbucks-khan-market', category: 'cafe', description: 'Premium coffee experience', tags: ['coffee', 'cafe', 'premium', 'desserts'], cashback: 20, partnerLevel: 'platinum', area: 2 },
    { name: 'Blue Tokai Coffee', slug: 'blue-tokai-saket', category: 'cafe', description: 'Specialty Indian coffee roasters', tags: ['coffee', 'cafe', 'artisan'], cashback: 18, partnerLevel: 'gold', area: 1 },
    { name: 'Chaayos', slug: 'chaayos-connaught-place', category: 'cafe', description: 'Experiments with chai', tags: ['tea', 'chai', 'snacks', 'indian'], cashback: 15, partnerLevel: 'gold', area: 0 },
    { name: 'Barista', slug: 'barista-lajpat-nagar', category: 'cafe', description: 'Classic coffee house', tags: ['coffee', 'cafe', 'snacks'], cashback: 12, partnerLevel: 'silver', area: 3 },
    // Fashion
    { name: 'Zara', slug: 'zara-select-citywalk', category: 'fashion', description: 'International fashion brand', tags: ['fashion', 'clothing', 'premium', 'international'], cashback: 10, partnerLevel: 'platinum', area: 1 },
    { name: 'H&M', slug: 'hm-connaught-place', category: 'fashion', description: 'Affordable fashion for all', tags: ['fashion', 'clothing', 'affordable'], cashback: 12, partnerLevel: 'gold', area: 0 },
    { name: 'FabIndia', slug: 'fabindia-khan-market', category: 'fashion', description: 'Indian ethnic wear and home products', tags: ['ethnic', 'indian', 'handloom'], cashback: 15, partnerLevel: 'gold', area: 2 },
    { name: 'Pantaloons', slug: 'pantaloons-lajpat-nagar', category: 'fashion', description: 'Family fashion destination', tags: ['fashion', 'family', 'affordable'], cashback: 14, partnerLevel: 'gold', area: 3 },
    // Electronics
    { name: 'Croma', slug: 'croma-select-citywalk', category: 'electronics', description: 'Premium electronics store', tags: ['electronics', 'gadgets', 'appliances'], cashback: 8, partnerLevel: 'gold', area: 1 },
    { name: 'Vijay Sales', slug: 'vijay-sales-lajpat-nagar', category: 'electronics', description: 'Electronics and home appliances', tags: ['electronics', 'appliances', 'affordable'], cashback: 10, partnerLevel: 'silver', area: 3 },
    { name: 'Reliance Digital', slug: 'reliance-digital-pitampura', category: 'electronics', description: 'Digital lifestyle store', tags: ['electronics', 'mobile', 'gadgets'], cashback: 9, partnerLevel: 'gold', area: 8 },
    // Grocery
    { name: 'Big Bazaar', slug: 'big-bazaar-rajouri-garden', category: 'grocery', description: 'Hypermarket chain', tags: ['grocery', 'essentials', 'household'], cashback: 8, partnerLevel: 'gold', area: 6 },
    { name: 'D-Mart', slug: 'dmart-dwarka', category: 'grocery', description: 'Value retail chain', tags: ['grocery', 'value', 'essentials'], cashback: 5, partnerLevel: 'silver', area: 7 },
    { name: 'Natures Basket', slug: 'natures-basket-greater-kailash', category: 'grocery', description: 'Gourmet and organic foods', tags: ['grocery', 'organic', 'premium', 'gourmet'], cashback: 12, partnerLevel: 'gold', area: 4 },
    // Salon & Spa
    { name: 'Lakme Salon', slug: 'lakme-salon-connaught-place', category: 'salon', description: 'Premium beauty services', tags: ['salon', 'beauty', 'spa', 'premium'], cashback: 25, partnerLevel: 'platinum', area: 0 },
    { name: 'VLCC', slug: 'vlcc-saket', category: 'salon', description: 'Wellness and beauty treatments', tags: ['salon', 'wellness', 'slimming'], cashback: 20, partnerLevel: 'gold', area: 1 },
    { name: 'Naturals', slug: 'naturals-lajpat-nagar', category: 'salon', description: 'Unisex beauty salon', tags: ['salon', 'beauty', 'unisex'], cashback: 18, partnerLevel: 'gold', area: 3 },
    // Fitness
    { name: 'Golds Gym', slug: 'golds-gym-nehru-place', category: 'fitness', description: 'Premium fitness center', tags: ['gym', 'fitness', 'premium'], cashback: 15, partnerLevel: 'gold', area: 9 },
    { name: 'Cult.fit', slug: 'cultfit-greater-kailash', category: 'fitness', description: 'Holistic fitness experience', tags: ['gym', 'fitness', 'yoga', 'cult'], cashback: 18, partnerLevel: 'platinum', area: 4 },
  ],
  mumbai: [
    // Food & Restaurants
    { name: 'Theobroma', slug: 'theobroma-bandra', category: 'food', description: 'Artisan bakery and patisserie', tags: ['bakery', 'desserts', 'cafe', 'premium'], cashback: 15, partnerLevel: 'platinum', area: 0 },
    { name: 'Leopold Cafe', slug: 'leopold-cafe-colaba', category: 'food', description: 'Iconic Mumbai cafe since 1871', tags: ['cafe', 'heritage', 'continental'], cashback: 12, partnerLevel: 'gold', area: 3 },
    { name: 'SodaBottleOpenerWala', slug: 'sbopw-lower-parel', category: 'food', description: 'Parsi Iranian cafe', tags: ['parsi', 'iranian', 'cafe', 'unique'], cashback: 18, partnerLevel: 'gold', area: 4 },
    { name: 'Dominos Pizza', slug: 'dominos-andheri', category: 'food', description: 'Fresh hot pizzas delivered', tags: ['pizza', 'fast-food', 'delivery'], cashback: 18, partnerLevel: 'gold', area: 1 },
    { name: 'KFC', slug: 'kfc-bandra', category: 'food', description: 'Finger lickin good chicken', tags: ['chicken', 'fast-food', 'non-veg'], cashback: 15, partnerLevel: 'gold', area: 0 },
    { name: 'McDonalds', slug: 'mcdonalds-powai', category: 'food', description: 'Global fast food', tags: ['burger', 'fast-food', 'quick-bites'], cashback: 10, partnerLevel: 'silver', area: 5 },
    { name: 'Britannia & Co', slug: 'britannia-fort', category: 'food', description: 'Legendary Parsi restaurant', tags: ['parsi', 'heritage', 'non-veg'], cashback: 10, partnerLevel: 'silver', area: 9 },
    { name: 'Bastian', slug: 'bastian-worli', category: 'food', description: 'Seafood and coastal cuisine', tags: ['seafood', 'premium', 'coastal'], cashback: 12, partnerLevel: 'gold', area: 6 },
    // Cafes
    { name: 'Starbucks', slug: 'starbucks-juhu', category: 'cafe', description: 'Premium coffee chain', tags: ['coffee', 'cafe', 'premium'], cashback: 20, partnerLevel: 'platinum', area: 2 },
    { name: 'The Coffee Bean', slug: 'coffee-bean-bandra', category: 'cafe', description: 'International coffee house', tags: ['coffee', 'cafe', 'international'], cashback: 15, partnerLevel: 'gold', area: 0 },
    { name: 'Prithvi Cafe', slug: 'prithvi-cafe-juhu', category: 'cafe', description: 'Iconic theatre cafe', tags: ['cafe', 'cultural', 'heritage'], cashback: 10, partnerLevel: 'silver', area: 2 },
    // Fashion
    { name: 'Zara', slug: 'zara-phoenix-mills', category: 'fashion', description: 'International fashion brand', tags: ['fashion', 'clothing', 'premium'], cashback: 10, partnerLevel: 'platinum', area: 4 },
    { name: 'H&M', slug: 'hm-phoenix-mills', category: 'fashion', description: 'Affordable fashion for all', tags: ['fashion', 'clothing', 'affordable'], cashback: 12, partnerLevel: 'gold', area: 4 },
    { name: 'Lifestyle', slug: 'lifestyle-andheri', category: 'fashion', description: 'Fashion and home decor', tags: ['fashion', 'lifestyle', 'home'], cashback: 14, partnerLevel: 'gold', area: 1 },
    { name: 'Westside', slug: 'westside-malad', category: 'fashion', description: 'Fashion for the family', tags: ['fashion', 'family', 'affordable'], cashback: 12, partnerLevel: 'gold', area: 7 },
    { name: 'Shoppers Stop', slug: 'shoppers-stop-goregaon', category: 'fashion', description: 'Department store chain', tags: ['fashion', 'premium', 'department'], cashback: 15, partnerLevel: 'platinum', area: 8 },
    // Electronics
    { name: 'Croma', slug: 'croma-lower-parel', category: 'electronics', description: 'Premium electronics', tags: ['electronics', 'gadgets', 'appliances'], cashback: 8, partnerLevel: 'gold', area: 4 },
    { name: 'Vijay Sales', slug: 'vijay-sales-malad', category: 'electronics', description: 'Electronics retail', tags: ['electronics', 'appliances', 'affordable'], cashback: 10, partnerLevel: 'silver', area: 7 },
    // Grocery
    { name: 'D-Mart', slug: 'dmart-powai', category: 'grocery', description: 'Value retail chain', tags: ['grocery', 'value', 'essentials'], cashback: 5, partnerLevel: 'silver', area: 5 },
    { name: 'Big Bazaar', slug: 'big-bazaar-goregaon', category: 'grocery', description: 'Hypermarket chain', tags: ['grocery', 'essentials', 'household'], cashback: 8, partnerLevel: 'gold', area: 8 },
    { name: 'Godrej Natures Basket', slug: 'natures-basket-bandra', category: 'grocery', description: 'Premium organic foods', tags: ['grocery', 'organic', 'premium'], cashback: 12, partnerLevel: 'gold', area: 0 },
    // Salon & Spa
    { name: 'Lakme Salon', slug: 'lakme-salon-bandra', category: 'salon', description: 'Premium beauty services', tags: ['salon', 'beauty', 'spa'], cashback: 25, partnerLevel: 'platinum', area: 0 },
    { name: 'Jean-Claude Biguine', slug: 'jcb-juhu', category: 'salon', description: 'French luxury salon', tags: ['salon', 'luxury', 'french'], cashback: 20, partnerLevel: 'platinum', area: 2 },
    { name: 'VLCC', slug: 'vlcc-andheri', category: 'salon', description: 'Wellness treatments', tags: ['salon', 'wellness', 'slimming'], cashback: 20, partnerLevel: 'gold', area: 1 },
    // Fitness
    { name: 'Golds Gym', slug: 'golds-gym-bandra', category: 'fitness', description: 'Premium fitness', tags: ['gym', 'fitness', 'premium'], cashback: 15, partnerLevel: 'gold', area: 0 },
    { name: 'Talwalkars', slug: 'talwalkars-andheri', category: 'fitness', description: 'Fitness chain', tags: ['gym', 'fitness'], cashback: 12, partnerLevel: 'silver', area: 1 },
    { name: 'Cult.fit', slug: 'cultfit-powai', category: 'fitness', description: 'Holistic fitness', tags: ['gym', 'fitness', 'yoga'], cashback: 18, partnerLevel: 'platinum', area: 5 },
  ],
  bangalore: [
    // Food & Restaurants
    { name: 'Third Wave Coffee', slug: 'third-wave-indiranagar', category: 'cafe', description: 'Specialty coffee roasters', tags: ['coffee', 'specialty', 'artisan'], cashback: 18, partnerLevel: 'platinum', area: 1 },
    { name: 'Toit', slug: 'toit-indiranagar', category: 'food', description: 'Brewpub with craft beer', tags: ['brewery', 'pub', 'craft-beer'], cashback: 12, partnerLevel: 'gold', area: 1 },
    { name: 'CTR', slug: 'ctr-malleshwaram', category: 'food', description: 'Legendary dosa joint', tags: ['south-indian', 'dosa', 'heritage', 'vegetarian'], cashback: 8, partnerLevel: 'silver', area: 5 },
    { name: 'Vidyarthi Bhavan', slug: 'vidyarthi-bhavan-jayanagar', category: 'food', description: 'Iconic masala dosa since 1943', tags: ['south-indian', 'dosa', 'heritage', 'vegetarian'], cashback: 8, partnerLevel: 'silver', area: 4 },
    { name: 'Meghana Foods', slug: 'meghana-foods-koramangala', category: 'food', description: 'Andhra style biryani', tags: ['biryani', 'andhra', 'non-veg', 'spicy'], cashback: 15, partnerLevel: 'gold', area: 0 },
    { name: 'Empire Restaurant', slug: 'empire-koramangala', category: 'food', description: 'Late night biryani hub', tags: ['biryani', 'non-veg', 'late-night'], cashback: 12, partnerLevel: 'gold', area: 0 },
    { name: 'Dominos Pizza', slug: 'dominos-whitefield', category: 'food', description: 'Pizza delivery', tags: ['pizza', 'fast-food', 'delivery'], cashback: 18, partnerLevel: 'gold', area: 3 },
    { name: 'KFC', slug: 'kfc-mg-road', category: 'food', description: 'Fried chicken', tags: ['chicken', 'fast-food', 'non-veg'], cashback: 15, partnerLevel: 'gold', area: 9 },
    // Cafes
    { name: 'Dyu Art Cafe', slug: 'dyu-art-cafe-koramangala', category: 'cafe', description: 'Art meets coffee', tags: ['coffee', 'art', 'cultural'], cashback: 15, partnerLevel: 'gold', area: 0 },
    { name: 'Matteo Coffea', slug: 'matteo-coffea-church-street', category: 'cafe', description: 'European style cafe', tags: ['coffee', 'european', 'premium'], cashback: 15, partnerLevel: 'gold', area: 9 },
    { name: 'Starbucks', slug: 'starbucks-ub-city', category: 'cafe', description: 'Premium coffee', tags: ['coffee', 'cafe', 'premium'], cashback: 20, partnerLevel: 'platinum', area: 9 },
    // Fashion
    { name: 'FabIndia', slug: 'fabindia-jayanagar', category: 'fashion', description: 'Indian ethnic wear', tags: ['ethnic', 'indian', 'handloom'], cashback: 15, partnerLevel: 'gold', area: 4 },
    { name: 'Westside', slug: 'westside-koramangala', category: 'fashion', description: 'Fashion destination', tags: ['fashion', 'family', 'affordable'], cashback: 12, partnerLevel: 'gold', area: 0 },
    { name: 'Max Fashion', slug: 'max-fashion-whitefield', category: 'fashion', description: 'Value fashion', tags: ['fashion', 'value', 'family'], cashback: 14, partnerLevel: 'gold', area: 3 },
    { name: 'Reliance Trends', slug: 'reliance-trends-electronic-city', category: 'fashion', description: 'Fashion retail', tags: ['fashion', 'affordable'], cashback: 12, partnerLevel: 'silver', area: 8 },
    // Electronics
    { name: 'Croma', slug: 'croma-koramangala', category: 'electronics', description: 'Premium electronics', tags: ['electronics', 'gadgets', 'appliances'], cashback: 8, partnerLevel: 'gold', area: 0 },
    { name: 'Reliance Digital', slug: 'reliance-digital-indiranagar', category: 'electronics', description: 'Digital store', tags: ['electronics', 'mobile', 'gadgets'], cashback: 9, partnerLevel: 'gold', area: 1 },
    { name: 'Sangeetha Mobiles', slug: 'sangeetha-jayanagar', category: 'electronics', description: 'Mobile retail chain', tags: ['mobile', 'electronics'], cashback: 8, partnerLevel: 'silver', area: 4 },
    // Grocery
    { name: 'BigBasket', slug: 'bigbasket-hsr-layout', category: 'grocery', description: 'Online grocery', tags: ['grocery', 'online', 'delivery'], cashback: 10, partnerLevel: 'gold', area: 2 },
    { name: 'More Supermarket', slug: 'more-koramangala', category: 'grocery', description: 'Neighborhood supermarket', tags: ['grocery', 'essentials'], cashback: 6, partnerLevel: 'silver', area: 0 },
    { name: 'Star Bazaar', slug: 'star-bazaar-whitefield', category: 'grocery', description: 'Hypermarket', tags: ['grocery', 'household', 'essentials'], cashback: 8, partnerLevel: 'gold', area: 3 },
    // Salon & Spa
    { name: 'Lakme Salon', slug: 'lakme-salon-indiranagar', category: 'salon', description: 'Premium beauty', tags: ['salon', 'beauty', 'spa'], cashback: 25, partnerLevel: 'platinum', area: 1 },
    { name: 'Green Trends', slug: 'green-trends-jayanagar', category: 'salon', description: 'Unisex salon', tags: ['salon', 'beauty', 'unisex'], cashback: 18, partnerLevel: 'gold', area: 4 },
    { name: 'Naturals', slug: 'naturals-koramangala', category: 'salon', description: 'Beauty salon', tags: ['salon', 'beauty'], cashback: 18, partnerLevel: 'gold', area: 0 },
    // Fitness
    { name: 'Cult.fit', slug: 'cultfit-hsr-layout', category: 'fitness', description: 'Holistic fitness', tags: ['gym', 'fitness', 'yoga', 'cult'], cashback: 18, partnerLevel: 'platinum', area: 2 },
    { name: 'Golds Gym', slug: 'golds-gym-whitefield', category: 'fitness', description: 'Premium gym', tags: ['gym', 'fitness', 'premium'], cashback: 15, partnerLevel: 'gold', area: 3 },
  ],
};

// ==========================================
// PRODUCTS DATA
// ==========================================
const productData = [
  // Food Products
  { name: 'Margherita Pizza', category: 'food', price: 299, originalPrice: 399, cashback: 15, store: 'dominos' },
  { name: 'Pepperoni Pizza', category: 'food', price: 449, originalPrice: 549, cashback: 15, store: 'dominos' },
  { name: 'Hot Coffee Wings', category: 'food', price: 199, originalPrice: 249, cashback: 18, store: 'kfc' },
  { name: 'Zinger Burger', category: 'food', price: 179, originalPrice: 229, cashback: 18, store: 'kfc' },
  { name: 'McChicken Burger', category: 'food', price: 149, originalPrice: 189, cashback: 10, store: 'mcdonalds' },
  { name: 'McVeggie Meal', category: 'food', price: 199, originalPrice: 249, cashback: 10, store: 'mcdonalds' },
  { name: 'Veg Sub 6 inch', category: 'food', price: 179, originalPrice: 219, cashback: 12, store: 'subway' },
  { name: 'Chicken Teriyaki', category: 'food', price: 249, originalPrice: 299, cashback: 12, store: 'subway' },
  { name: 'Whopper Jr', category: 'food', price: 129, originalPrice: 159, cashback: 14, store: 'burger-king' },
  { name: 'Crispy Chicken', category: 'food', price: 179, originalPrice: 229, cashback: 14, store: 'burger-king' },
  { name: 'Chicken Biryani', category: 'food', price: 299, originalPrice: 349, cashback: 15, store: 'meghana' },
  { name: 'Mutton Biryani', category: 'food', price: 399, originalPrice: 449, cashback: 15, store: 'meghana' },
  { name: 'Masala Dosa', category: 'food', price: 80, originalPrice: 100, cashback: 8, store: 'ctr' },
  { name: 'Benne Masala Dosa', category: 'food', price: 90, originalPrice: 110, cashback: 8, store: 'vidyarthi' },
  { name: 'Kaju Katli 500g', category: 'food', price: 450, originalPrice: 500, cashback: 15, store: 'haldirams' },
  { name: 'Soan Papdi 250g', category: 'food', price: 120, originalPrice: 150, cashback: 15, store: 'haldirams' },
  { name: 'Rasgulla 1kg', category: 'food', price: 280, originalPrice: 320, cashback: 12, store: 'bikanervala' },
  { name: 'Samosa (4 pcs)', category: 'food', price: 80, originalPrice: 100, cashback: 12, store: 'bikanervala' },
  { name: 'Brownie Overload', category: 'food', price: 90, originalPrice: 110, cashback: 15, store: 'theobroma' },
  { name: 'Red Velvet Pastry', category: 'food', price: 150, originalPrice: 180, cashback: 15, store: 'theobroma' },
  // Coffee
  { name: 'Cappuccino Grande', category: 'coffee', price: 295, originalPrice: 350, cashback: 20, store: 'starbucks' },
  { name: 'Caramel Macchiato', category: 'coffee', price: 345, originalPrice: 395, cashback: 20, store: 'starbucks' },
  { name: 'Cold Brew 250ml', category: 'coffee', price: 180, originalPrice: 220, cashback: 18, store: 'blue-tokai' },
  { name: 'Vienna Roast 250g', category: 'coffee', price: 450, originalPrice: 500, cashback: 18, store: 'blue-tokai' },
  { name: 'Masala Chai', category: 'coffee', price: 99, originalPrice: 129, cashback: 15, store: 'chaayos' },
  { name: 'Kulhad Chai', category: 'coffee', price: 79, originalPrice: 99, cashback: 15, store: 'chaayos' },
  { name: 'Filter Coffee', category: 'coffee', price: 120, originalPrice: 150, cashback: 18, store: 'third-wave' },
  { name: 'Pour Over', category: 'coffee', price: 200, originalPrice: 250, cashback: 18, store: 'third-wave' },
  // Fashion
  { name: 'Mens Casual Shirt', category: 'fashion', price: 1499, originalPrice: 1999, cashback: 10, store: 'zara' },
  { name: 'Womens Dress', category: 'fashion', price: 2499, originalPrice: 2999, cashback: 10, store: 'zara' },
  { name: 'Slim Fit Jeans', category: 'fashion', price: 1299, originalPrice: 1699, cashback: 12, store: 'hm' },
  { name: 'Printed T-Shirt', category: 'fashion', price: 599, originalPrice: 799, cashback: 12, store: 'hm' },
  { name: 'Kurta Set', category: 'fashion', price: 2999, originalPrice: 3499, cashback: 15, store: 'fabindia' },
  { name: 'Cotton Saree', category: 'fashion', price: 3499, originalPrice: 3999, cashback: 15, store: 'fabindia' },
  { name: 'Mens Formal Shirt', category: 'fashion', price: 999, originalPrice: 1299, cashback: 14, store: 'pantaloons' },
  { name: 'Womens Kurti', category: 'fashion', price: 799, originalPrice: 999, cashback: 14, store: 'pantaloons' },
  // Electronics
  { name: 'iPhone 15 Pro', category: 'electronics', price: 134900, originalPrice: 139900, cashback: 8, store: 'croma' },
  { name: 'Samsung Galaxy S24', category: 'electronics', price: 79999, originalPrice: 84999, cashback: 8, store: 'croma' },
  { name: 'Sony WH-1000XM5', category: 'electronics', price: 29990, originalPrice: 34990, cashback: 10, store: 'vijay-sales' },
  { name: 'Apple Watch Series 9', category: 'electronics', price: 41900, originalPrice: 44900, cashback: 10, store: 'vijay-sales' },
  { name: 'MacBook Air M3', category: 'electronics', price: 114900, originalPrice: 124900, cashback: 9, store: 'reliance-digital' },
  { name: 'iPad Pro 12.9', category: 'electronics', price: 112900, originalPrice: 119900, cashback: 9, store: 'reliance-digital' },
  // Grocery
  { name: 'Organic Atta 5kg', category: 'grocery', price: 280, originalPrice: 350, cashback: 8, store: 'big-bazaar' },
  { name: 'Basmati Rice 5kg', category: 'grocery', price: 450, originalPrice: 550, cashback: 8, store: 'big-bazaar' },
  { name: 'Tata Salt 1kg', category: 'grocery', price: 25, originalPrice: 30, cashback: 5, store: 'dmart' },
  { name: 'Aashirvaad Atta 10kg', category: 'grocery', price: 480, originalPrice: 550, cashback: 5, store: 'dmart' },
  { name: 'Organic Honey 500g', category: 'grocery', price: 450, originalPrice: 550, cashback: 12, store: 'natures-basket' },
  { name: 'Imported Olive Oil 1L', category: 'grocery', price: 899, originalPrice: 1099, cashback: 12, store: 'natures-basket' },
  { name: 'Fresh Vegetables Box', category: 'grocery', price: 299, originalPrice: 399, cashback: 10, store: 'bigbasket' },
  { name: 'Fruits Basket', category: 'grocery', price: 499, originalPrice: 599, cashback: 10, store: 'bigbasket' },
  // Salon Services
  { name: 'Haircut - Mens', category: 'salon', price: 350, originalPrice: 450, cashback: 25, store: 'lakme' },
  { name: 'Haircut - Womens', category: 'salon', price: 800, originalPrice: 1000, cashback: 25, store: 'lakme' },
  { name: 'Classic Facial', category: 'salon', price: 1500, originalPrice: 2000, cashback: 25, store: 'lakme' },
  { name: 'Keratin Treatment', category: 'salon', price: 5000, originalPrice: 6500, cashback: 25, store: 'lakme' },
  { name: 'Full Body Massage', category: 'salon', price: 2500, originalPrice: 3000, cashback: 20, store: 'vlcc' },
  { name: 'Weight Loss Program', category: 'salon', price: 15000, originalPrice: 20000, cashback: 20, store: 'vlcc' },
  // Fitness
  { name: 'Monthly Membership', category: 'fitness', price: 2500, originalPrice: 3000, cashback: 15, store: 'golds-gym' },
  { name: 'Quarterly Pack', category: 'fitness', price: 6000, originalPrice: 8000, cashback: 15, store: 'golds-gym' },
  { name: 'Cult Pass Pro Monthly', category: 'fitness', price: 2399, originalPrice: 2999, cashback: 18, store: 'cultfit' },
  { name: 'Cult Elite Annual', category: 'fitness', price: 19999, originalPrice: 24999, cashback: 18, store: 'cultfit' },
];

// ==========================================
// VIDEO CONTENT DATA
// ==========================================
const videoTitles = {
  food: [
    'Best Pizza in Town! 40% Cashback',
    'Amazing Biryani - Must Try!',
    'Street Food Heaven - Saved Rs.500',
    'Midnight Cravings Satisfied',
    'Family Dinner Deal - Big Savings',
    'New Menu Launch - 50% Off',
    'Authentic Taste, Great Value',
    'Foodie Paradise - Cashback King',
  ],
  coffee: [
    'Perfect Morning Coffee Spot',
    'Barista Skills on Point!',
    'Best Cold Brew in the City',
    'Cozy Cafe Vibes - 20% Cashback',
    'Filter Coffee Like Never Before',
    'Work From Cafe Goals',
  ],
  fashion: [
    'Shopping Haul - Saved Rs.3000',
    'New Collection Alert!',
    'Festival Shopping Done Right',
    'Style on Budget - Cashback Win',
    'Ethnic Wear Paradise',
    'Trendy Fits Under Rs.2000',
  ],
  beauty: [
    'Pamper Day - Spa Experience',
    'Haircut Transformation',
    'Bridal Package Review',
    'Self Care Sunday - 25% Cashback',
    'Skincare Routine at Salon',
  ],
  electronics: [
    'Unboxing iPhone 15 Pro',
    'Best Deals on Laptops',
    'Smart Watch Review',
    'Tech Shopping - Big Savings',
    'Gadget Haul from Croma',
  ],
  grocery: [
    'Weekly Grocery Shopping',
    'Organic Finds - Health First',
    'Monthly Stock Up - Cashback',
    'Fresh Produce Delivery',
  ],
  fitness: [
    'Gym Tour - Amazing Facilities',
    'My Fitness Journey Begins',
    'Yoga Session Review',
    'Best Gym Membership Deal',
  ],
};

// ==========================================
// MAIN SEED FUNCTION
// ==========================================
async function seedExploreData() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/rez-app';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Get existing categories
    const categories = await Category.find({});
    const categoryMap: Record<string, mongoose.Types.ObjectId> = {};
    categories.forEach(cat => {
      categoryMap[cat.slug] = cat._id as mongoose.Types.ObjectId;
    });

    console.log('Found categories:', Object.keys(categoryMap).length);

    // 1. Create Sample Users
    console.log('\nCreating sample users...');
    const createdUsers: mongoose.Types.ObjectId[] = [];
    const hashedPassword = await bcrypt.hash('Test@123', 10);

    for (const userData of sampleUsers) {
      const existingUser = await User.findOne({ phoneNumber: userData.phone });
      if (existingUser) {
        createdUsers.push(existingUser._id as mongoose.Types.ObjectId);
        continue;
      }

      const user = await User.create({
        phoneNumber: userData.phone,
        password: hashedPassword,
        profile: {
          firstName: userData.firstName,
          lastName: userData.lastName,
          avatar: `https://ui-avatars.com/api/?name=${userData.firstName}+${userData.lastName}&background=random&size=200`,
          location: { city: userData.city },
        },
        wallet: {
          balance: Math.floor(Math.random() * 5000) + 500,
          totalEarned: Math.floor(Math.random() * 10000) + 1000,
        },
        auth: {
          isVerified: true,
          isOnboarded: true,
        },
      });
      createdUsers.push(user._id as mongoose.Types.ObjectId);
    }
    console.log(`Created/Found ${createdUsers.length} users`);

    // 2. Create Stores
    console.log('\nCreating stores...');
    const createdStores: Record<string, mongoose.Types.ObjectId> = {};

    for (const [city, stores] of Object.entries(storeData)) {
      const cityKey = city as keyof typeof CITY_COORDS;
      const cityInfo = CITY_COORDS[cityKey];

      for (const store of stores) {
        const area = cityInfo.areas[store.area] || cityInfo.areas[0];

        // Find category
        let categoryId = categoryMap['food-delivery'];
        if (store.category === 'cafe') categoryId = categoryMap['cafes'] || categoryMap['food-delivery'];
        else if (store.category === 'fashion') categoryId = categoryMap['fashion'];
        else if (store.category === 'electronics') categoryId = categoryMap['electronics'];
        else if (store.category === 'grocery') categoryId = categoryMap['grocery'];
        else if (store.category === 'salon') categoryId = categoryMap['salon-spa'];
        else if (store.category === 'fitness') categoryId = categoryMap['gym-fitness'];

        const existingStore = await Store.findOne({ slug: store.slug });
        if (existingStore) {
          createdStores[store.slug] = existingStore._id as mongoose.Types.ObjectId;
          continue;
        }

        const logoCategory = store.category === 'cafe' ? 'coffee' : store.category;
        const logos = THUMBNAIL_URLS[logoCategory as keyof typeof THUMBNAIL_URLS] || THUMBNAIL_URLS.food;
        const videos = VIDEO_URLS[logoCategory as keyof typeof VIDEO_URLS] || VIDEO_URLS.food;

        const newStore = await Store.create({
          name: store.name,
          slug: store.slug,
          description: store.description,
          logo: logos[Math.floor(Math.random() * logos.length)],
          banner: [logos[Math.floor(Math.random() * logos.length)]],
          videos: [{
            url: videos[Math.floor(Math.random() * videos.length)],
            thumbnail: logos[Math.floor(Math.random() * logos.length)],
            title: `${store.name} Experience`,
            duration: Math.floor(Math.random() * 20) + 10,
            uploadedAt: new Date(),
          }],
          category: categoryId,
          tags: store.tags,
          isActive: true,
          isFeatured: Math.random() > 0.5,
          isVerified: true,
          isTrending: Math.random() > 0.7,
          location: {
            address: area.name,
            city: city.charAt(0).toUpperCase() + city.slice(1),
            state: city === 'bangalore' ? 'Karnataka' : city === 'mumbai' ? 'Maharashtra' : 'Delhi',
            pincode: `${Math.floor(Math.random() * 90000) + 100000}`,
            coordinates: [
              area.coords[0] + (Math.random() - 0.5) * 0.01,
              area.coords[1] + (Math.random() - 0.5) * 0.01,
            ],
            deliveryRadius: 10,
          },
          contact: {
            phone: `+91${Math.floor(Math.random() * 9000000000) + 1000000000}`,
            email: `contact@${store.slug.split('-')[0]}.com`,
          },
          ratings: {
            average: Math.round((Math.random() * 1 + 4) * 10) / 10,
            count: Math.floor(Math.random() * 3000) + 200,
            distribution: {
              5: Math.floor(Math.random() * 1000) + 100,
              4: Math.floor(Math.random() * 500) + 50,
              3: Math.floor(Math.random() * 200) + 20,
              2: Math.floor(Math.random() * 50) + 5,
              1: Math.floor(Math.random() * 20) + 2,
            },
          },
          offers: {
            cashback: store.cashback,
            minOrderAmount: Math.floor(Math.random() * 300) + 100,
            isPartner: true,
            partnerLevel: store.partnerLevel as 'bronze' | 'silver' | 'gold' | 'platinum',
          },
          operationalInfo: {
            hours: {
              monday: { open: '09:00', close: '22:00' },
              tuesday: { open: '09:00', close: '22:00' },
              wednesday: { open: '09:00', close: '22:00' },
              thursday: { open: '09:00', close: '22:00' },
              friday: { open: '09:00', close: '23:00' },
              saturday: { open: '09:00', close: '23:00' },
              sunday: { open: '10:00', close: '22:00' },
            },
            deliveryTime: `${Math.floor(Math.random() * 20) + 20}-${Math.floor(Math.random() * 20) + 40} mins`,
            minimumOrder: Math.floor(Math.random() * 200) + 100,
            deliveryFee: Math.floor(Math.random() * 30) + 10,
            freeDeliveryAbove: Math.floor(Math.random() * 300) + 300,
            acceptsWalletPayment: true,
            paymentMethods: ['upi', 'card', 'wallet', 'cash'],
          },
          deliveryCategories: {
            fastDelivery: Math.random() > 0.5,
            budgetFriendly: Math.random() > 0.6,
            premium: store.partnerLevel === 'platinum',
            organic: store.tags.includes('organic'),
            mall: Math.random() > 0.7,
            cashStore: Math.random() > 0.6,
          },
          analytics: {
            totalOrders: Math.floor(Math.random() * 10000) + 500,
            totalRevenue: Math.floor(Math.random() * 5000000) + 100000,
            avgOrderValue: Math.floor(Math.random() * 500) + 200,
            repeatCustomers: Math.floor(Math.random() * 2000) + 100,
            followersCount: Math.floor(Math.random() * 5000) + 500,
          },
          paymentSettings: {
            acceptUPI: true,
            acceptCards: true,
            acceptPayLater: Math.random() > 0.5,
            acceptRezCoins: true,
            acceptPromoCoins: true,
            acceptPayBill: true,
            maxCoinRedemptionPercent: 50,
            allowHybridPayment: true,
            allowOffers: true,
            allowCashback: true,
          },
          rewardRules: {
            baseCashbackPercent: store.cashback,
            reviewBonusCoins: Math.floor(Math.random() * 50) + 20,
            socialShareBonusCoins: Math.floor(Math.random() * 30) + 10,
            minimumAmountForReward: Math.floor(Math.random() * 100) + 50,
          },
        });

        createdStores[store.slug] = newStore._id as mongoose.Types.ObjectId;
      }
    }
    console.log(`Created/Found ${Object.keys(createdStores).length} stores`);

    // 3. Create Products
    console.log('\nCreating products...');
    let productsCreated = 0;

    for (const product of productData) {
      // Find matching store
      const storeSlug = Object.keys(createdStores).find(slug =>
        slug.toLowerCase().includes(product.store.toLowerCase())
      );

      if (!storeSlug) continue;

      const productSlug = `${product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')}-${storeSlug}`;

      const existingProduct = await Product.findOne({ slug: productSlug });
      if (existingProduct) {
        productsCreated++;
        continue;
      }

      // Find category
      let categoryId = categoryMap['food-delivery'];
      if (product.category === 'coffee') categoryId = categoryMap['cafes'] || categoryMap['food-delivery'];
      else if (product.category === 'fashion') categoryId = categoryMap['fashion'];
      else if (product.category === 'electronics') categoryId = categoryMap['electronics'];
      else if (product.category === 'grocery') categoryId = categoryMap['grocery'];
      else if (product.category === 'salon') categoryId = categoryMap['salon-spa'];
      else if (product.category === 'fitness') categoryId = categoryMap['gym-fitness'];

      const thumbnails = THUMBNAIL_URLS[product.category as keyof typeof THUMBNAIL_URLS] || THUMBNAIL_URLS.food;

      await Product.create({
        name: product.name,
        slug: productSlug,
        description: `Premium quality ${product.name} from our store`,
        sku: `SKU-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        images: [thumbnails[Math.floor(Math.random() * thumbnails.length)]],
        category: categoryId,
        store: createdStores[storeSlug],
        brand: storeSlug.split('-')[0].charAt(0).toUpperCase() + storeSlug.split('-')[0].slice(1),
        pricing: {
          original: product.originalPrice,
          selling: product.price,
          currency: 'INR',
          discount: Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100),
        },
        cashback: {
          percentage: product.cashback,
          maxAmount: Math.floor(product.price * 0.2),
        },
        inventory: {
          stock: Math.floor(Math.random() * 100) + 20,
          isAvailable: true,
          lowStockThreshold: 10,
        },
        ratings: {
          average: Math.round((Math.random() * 1 + 4) * 10) / 10,
          count: Math.floor(Math.random() * 500) + 50,
          distribution: {
            5: Math.floor(Math.random() * 200) + 20,
            4: Math.floor(Math.random() * 100) + 10,
            3: Math.floor(Math.random() * 30) + 5,
            2: Math.floor(Math.random() * 10) + 1,
            1: Math.floor(Math.random() * 5) + 1,
          },
        },
        tags: [product.category, 'trending', 'cashback'],
        isActive: true,
        isFeatured: Math.random() > 0.5,
        isHotDeal: Math.random() > 0.6,
        isTrending: Math.random() > 0.7,
        analytics: {
          views: Math.floor(Math.random() * 10000) + 500,
          purchases: Math.floor(Math.random() * 500) + 50,
          wishlistAdds: Math.floor(Math.random() * 200) + 20,
          shareCount: Math.floor(Math.random() * 100) + 10,
        },
      });
      productsCreated++;
    }
    console.log(`Created ${productsCreated} products`);

    // 4. Create Videos/Reels
    console.log('\nCreating videos/reels...');
    let videosCreated = 0;
    const storeIds = Object.values(createdStores);

    for (const [category, titles] of Object.entries(videoTitles)) {
      const videoUrls = VIDEO_URLS[category as keyof typeof VIDEO_URLS] || VIDEO_URLS.food;
      const thumbnails = THUMBNAIL_URLS[category as keyof typeof THUMBNAIL_URLS] || THUMBNAIL_URLS.food;

      for (const title of titles) {
        const creatorId = createdUsers[Math.floor(Math.random() * createdUsers.length)];
        const storeId = storeIds[Math.floor(Math.random() * storeIds.length)];

        const videoSlug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`;

        const existingVideo = await Video.findOne({ title: title });
        if (existingVideo) {
          videosCreated++;
          continue;
        }

        await Video.create({
          title: title,
          description: `Check out this amazing ${category} experience! Great deals and cashback available. #ReZ #Cashback #${category.charAt(0).toUpperCase() + category.slice(1)}`,
          creator: creatorId,
          contentType: Math.random() > 0.3 ? 'ugc' : 'merchant',
          videoUrl: videoUrls[Math.floor(Math.random() * videoUrls.length)],
          thumbnail: thumbnails[Math.floor(Math.random() * thumbnails.length)],
          category: Math.random() > 0.5 ? 'trending_me' : 'review',
          tags: [category, 'cashback', 'deals', 'savings'],
          hashtags: [`#${category}`, '#ReZDeals', '#Cashback', '#MustTry'],
          stores: [storeId],
          products: [],
          engagement: {
            views: Math.floor(Math.random() * 50000) + 1000,
            likes: createdUsers.slice(0, Math.floor(Math.random() * 10) + 5),
            shares: Math.floor(Math.random() * 500) + 50,
            comments: Math.floor(Math.random() * 100) + 10,
            saves: Math.floor(Math.random() * 200) + 20,
            reports: 0,
          },
          metadata: {
            duration: Math.floor(Math.random() * 45) + 15,
            resolution: '1080p',
            format: 'mp4',
            aspectRatio: '9:16',
            fps: 30,
          },
          processing: {
            status: 'completed',
            processedAt: new Date(),
          },
          analytics: {
            totalViews: Math.floor(Math.random() * 50000) + 1000,
            uniqueViews: Math.floor(Math.random() * 30000) + 500,
            avgWatchTime: Math.floor(Math.random() * 30) + 10,
            completionRate: Math.floor(Math.random() * 40) + 40,
            engagementRate: Math.floor(Math.random() * 15) + 5,
            shareRate: Math.floor(Math.random() * 5) + 1,
            likeRate: Math.floor(Math.random() * 10) + 3,
            likes: Math.floor(Math.random() * 2000) + 100,
            comments: Math.floor(Math.random() * 100) + 10,
            shares: Math.floor(Math.random() * 500) + 50,
            engagement: Math.floor(Math.random() * 3000) + 200,
            viewsByHour: {},
            viewsByDate: {},
          },
          likedBy: createdUsers.slice(0, Math.floor(Math.random() * 10) + 5),
          bookmarkedBy: createdUsers.slice(0, Math.floor(Math.random() * 5) + 2),
          comments: [
            {
              user: createdUsers[Math.floor(Math.random() * createdUsers.length)],
              content: 'Amazing experience! Got great cashback',
              timestamp: new Date(Date.now() - Math.random() * 86400000 * 7),
              likes: createdUsers.slice(0, Math.floor(Math.random() * 3)),
            },
            {
              user: createdUsers[Math.floor(Math.random() * createdUsers.length)],
              content: 'Love the deals here!',
              timestamp: new Date(Date.now() - Math.random() * 86400000 * 5),
              likes: createdUsers.slice(0, Math.floor(Math.random() * 2)),
            },
          ],
          isPublished: true,
          isFeatured: Math.random() > 0.7,
          isApproved: true,
          isTrending: Math.random() > 0.6,
          moderationStatus: 'approved',
          privacy: 'public',
          allowComments: true,
          allowSharing: true,
          publishedAt: new Date(Date.now() - Math.random() * 86400000 * 30),
        });
        videosCreated++;
      }
    }
    console.log(`Created ${videosCreated} videos`);

    // 5. Create Offers
    console.log('\nCreating offers...');
    let offersCreated = 0;
    const offerTitles = [
      'Flash Sale - 50% Cashback',
      'Weekend Special Deal',
      'New User Offer - Extra 20%',
      'Flat Rs.200 Off',
      'Buy 1 Get 1 Free',
      'Festive Bonanza',
      'Student Special',
      'Family Pack Deal',
      'Lunch Special',
      'Dinner Delight',
      'Coffee Hour Deal',
      'Fashion Friday',
      'Electronics Mega Sale',
      'Grocery Saver',
      'Salon Day Special',
      'Fitness First Offer',
      'Quick Delivery Bonus',
      'Premium Member Exclusive',
      'App Only Deal',
      'Referral Reward',
    ];

    for (const title of offerTitles) {
      const storeSlug = Object.keys(createdStores)[Math.floor(Math.random() * Object.keys(createdStores).length)];
      const storeId = createdStores[storeSlug];

      const store = await Store.findById(storeId);
      if (!store) continue;

      const existingOffer = await Offer.findOne({ title: title, 'store.id': storeId });
      if (existingOffer) {
        offersCreated++;
        continue;
      }

      const categories = ['food', 'fashion', 'electronics', 'general', 'mega', 'trending', 'new_arrival'] as const;
      const types = ['cashback', 'discount', 'voucher', 'combo'] as const;

      await Offer.create({
        title: title,
        subtitle: `Save big at ${store.name}`,
        description: `Limited time offer! Get amazing cashback and discounts at ${store.name}. Don't miss out on this exclusive deal.`,
        image: THUMBNAIL_URLS.food[Math.floor(Math.random() * THUMBNAIL_URLS.food.length)],
        category: categories[Math.floor(Math.random() * categories.length)],
        type: types[Math.floor(Math.random() * types.length)],
        cashbackPercentage: Math.floor(Math.random() * 30) + 10,
        originalPrice: Math.floor(Math.random() * 1000) + 200,
        discountedPrice: Math.floor(Math.random() * 500) + 100,
        location: {
          type: 'Point',
          coordinates: store.location?.coordinates || [77.5946, 12.9716],
        },
        store: {
          id: storeId,
          name: store.name,
          logo: store.logo,
          rating: store.ratings?.average,
          verified: store.isVerified,
        },
        validity: {
          startDate: new Date(),
          endDate: new Date(Date.now() + (Math.random() * 7 + 1) * 24 * 60 * 60 * 1000),
          isActive: true,
        },
        engagement: {
          likesCount: Math.floor(Math.random() * 500) + 50,
          sharesCount: Math.floor(Math.random() * 100) + 10,
          viewsCount: Math.floor(Math.random() * 5000) + 500,
        },
        restrictions: {
          minOrderValue: Math.floor(Math.random() * 200) + 100,
          maxDiscountAmount: Math.floor(Math.random() * 500) + 100,
        },
        metadata: {
          isNew: Math.random() > 0.7,
          isTrending: Math.random() > 0.6,
          isBestSeller: Math.random() > 0.8,
          isSpecial: Math.random() > 0.7,
          priority: Math.floor(Math.random() * 100),
          tags: ['cashback', 'deals', 'savings'],
          featured: Math.random() > 0.7,
        },
        isFollowerExclusive: Math.random() > 0.8,
        visibleTo: 'all',
        isFreeDelivery: Math.random() > 0.6,
        redemptionCount: Math.floor(Math.random() * 200) + 20,
        createdBy: createdUsers[Math.floor(Math.random() * createdUsers.length)],
      });
      offersCreated++;
    }
    console.log(`Created ${offersCreated} offers`);

    // 6. Create Reviews
    console.log('\nCreating reviews...');
    let reviewsCreated = 0;

    const reviewComments = [
      'Amazing experience! Got great cashback. Will definitely come back.',
      'Love the deals here. The service was excellent.',
      'Great value for money. Highly recommended!',
      'Quick delivery and good quality. Saved Rs.500!',
      'Perfect for families. Kids loved it too.',
      'Premium quality at affordable prices. 5 stars!',
      'The cashback was credited instantly. Very happy!',
      'Best place in the city. Never disappoints.',
      'Friendly staff and great ambiance. Must visit!',
      'Exceeded my expectations. Will recommend to friends.',
    ];

    for (const storeSlug of Object.keys(createdStores)) {
      const storeId = createdStores[storeSlug];
      const reviewCount = Math.floor(Math.random() * 5) + 3;

      for (let i = 0; i < reviewCount; i++) {
        const userId = createdUsers[Math.floor(Math.random() * createdUsers.length)];

        const existingReview = await Review.findOne({ store: storeId, user: userId });
        if (existingReview) {
          reviewsCreated++;
          continue;
        }

        await Review.create({
          store: storeId,
          user: userId,
          rating: Math.floor(Math.random() * 2) + 4,
          title: `Great experience at this store`,
          comment: reviewComments[Math.floor(Math.random() * reviewComments.length)],
          images: [],
          helpful: Math.floor(Math.random() * 50) + 5,
          verified: Math.random() > 0.3,
          isActive: true,
          moderationStatus: 'approved',
        });
        reviewsCreated++;
      }
    }
    console.log(`Created ${reviewsCreated} reviews`);

    console.log('\n========================================');
    console.log('EXPLORE SEEDS COMPLETED SUCCESSFULLY!');
    console.log('========================================');
    console.log(`Users: ${createdUsers.length}`);
    console.log(`Stores: ${Object.keys(createdStores).length}`);
    console.log(`Products: ${productsCreated}`);
    console.log(`Videos: ${videosCreated}`);
    console.log(`Offers: ${offersCreated}`);
    console.log(`Reviews: ${reviewsCreated}`);
    console.log('========================================\n');

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);

  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
}

// Run seed
seedExploreData();
