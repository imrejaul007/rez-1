/**
 * Store Seeds - Real Indian Brands
 * Used for seeding the offers page with realistic data
 */

import mongoose from 'mongoose';

// Helper to generate placeholder image URLs
const getPlaceholderImage = (category: string, id: number, width = 400, height = 300) =>
  `https://picsum.photos/seed/${category}${id}/${width}/${height}`;

// Store data structure matching the Store model
export interface StoreSeedData {
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
}

// Generate ObjectIds for stores
export const storeIds = {
  // Food Delivery
  swiggy: new mongoose.Types.ObjectId(),
  zomato: new mongoose.Types.ObjectId(),
  dunzo: new mongoose.Types.ObjectId(),

  // QSR (Quick Service Restaurants)
  dominos: new mongoose.Types.ObjectId(),
  pizzaHut: new mongoose.Types.ObjectId(),
  mcdonalds: new mongoose.Types.ObjectId(),
  burgerKing: new mongoose.Types.ObjectId(),
  kfc: new mongoose.Types.ObjectId(),
  subway: new mongoose.Types.ObjectId(),
  wendys: new mongoose.Types.ObjectId(),

  // Indian Food Chains
  haldirams: new mongoose.Types.ObjectId(),
  bikkgane: new mongoose.Types.ObjectId(),
  paradise: new mongoose.Types.ObjectId(),
  saravanaaBhavan: new mongoose.Types.ObjectId(),

  // Cafes
  starbucks: new mongoose.Types.ObjectId(),
  ccd: new mongoose.Types.ObjectId(),
  chaayos: new mongoose.Types.ObjectId(),
  barista: new mongoose.Types.ObjectId(),

  // Grocery
  bigBazaar: new mongoose.Types.ObjectId(),
  dmart: new mongoose.Types.ObjectId(),
  relianceFresh: new mongoose.Types.ObjectId(),
  spencers: new mongoose.Types.ObjectId(),
  more: new mongoose.Types.ObjectId(),

  // Fashion/Shopping
  myntra: new mongoose.Types.ObjectId(),
  ajio: new mongoose.Types.ObjectId(),
  flipkart: new mongoose.Types.ObjectId(),
  amazon: new mongoose.Types.ObjectId(),
  nykaa: new mongoose.Types.ObjectId(),
  meesho: new mongoose.Types.ObjectId(),

  // Electronics
  croma: new mongoose.Types.ObjectId(),
  vijayaSales: new mongoose.Types.ObjectId(),
  reliance: new mongoose.Types.ObjectId(),
};

export const storeSeeds: StoreSeedData[] = [
  // Food Delivery Platforms
  {
    _id: storeIds.swiggy,
    name: 'Swiggy',
    slug: 'swiggy',
    logo: getPlaceholderImage('swiggy', 1, 200, 200),
    category: 'Food Delivery',
    rating: 4.3,
    verified: true,
    description: "India's leading food delivery platform",
    location: {
      type: 'Point',
      coordinates: [77.5946, 12.9716],
      address: 'Swiggy Tower, Outer Ring Road',
      city: 'Bangalore',
      state: 'Karnataka',
      country: 'India',
      pincode: '560103',
    },
  },
  {
    _id: storeIds.zomato,
    name: 'Zomato',
    slug: 'zomato',
    logo: getPlaceholderImage('zomato', 2, 200, 200),
    category: 'Food Delivery',
    rating: 4.2,
    verified: true,
    description: 'Food delivery and restaurant discovery',
    location: {
      type: 'Point',
      coordinates: [77.2090, 28.6139],
      address: 'Zomato HQ, Gurgaon',
      city: 'Gurgaon',
      state: 'Haryana',
      country: 'India',
      pincode: '122002',
    },
  },
  {
    _id: storeIds.dunzo,
    name: 'Dunzo',
    slug: 'dunzo',
    logo: getPlaceholderImage('dunzo', 3, 200, 200),
    category: 'Quick Commerce',
    rating: 4.1,
    verified: true,
    description: 'Quick delivery for everything',
    location: {
      type: 'Point',
      coordinates: [77.6245, 12.9352],
      address: 'Koramangala',
      city: 'Bangalore',
      state: 'Karnataka',
      country: 'India',
      pincode: '560034',
    },
  },

  // QSR - Pizza
  {
    _id: storeIds.dominos,
    name: "Domino's Pizza",
    slug: 'dominos-pizza',
    logo: getPlaceholderImage('dominos', 4, 200, 200),
    category: 'Pizza',
    rating: 4.4,
    verified: true,
    description: "World's favorite pizza delivery",
    location: {
      type: 'Point',
      coordinates: [77.6101, 12.9352],
      address: 'Koramangala 5th Block',
      city: 'Bangalore',
      state: 'Karnataka',
      country: 'India',
      pincode: '560034',
    },
  },
  {
    _id: storeIds.pizzaHut,
    name: 'Pizza Hut',
    slug: 'pizza-hut',
    logo: getPlaceholderImage('pizzahut', 5, 200, 200),
    category: 'Pizza',
    rating: 4.2,
    verified: true,
    description: 'Pan Pizza specialists',
    location: {
      type: 'Point',
      coordinates: [77.6411, 12.9719],
      address: 'Indiranagar',
      city: 'Bangalore',
      state: 'Karnataka',
      country: 'India',
      pincode: '560038',
    },
  },

  // QSR - Burgers
  {
    _id: storeIds.mcdonalds,
    name: "McDonald's",
    slug: 'mcdonalds',
    logo: getPlaceholderImage('mcdonalds', 6, 200, 200),
    category: 'Burgers',
    rating: 4.3,
    verified: true,
    description: "I'm lovin' it",
    location: {
      type: 'Point',
      coordinates: [77.5946, 12.9716],
      address: 'MG Road',
      city: 'Bangalore',
      state: 'Karnataka',
      country: 'India',
      pincode: '560001',
    },
  },
  {
    _id: storeIds.burgerKing,
    name: 'Burger King',
    slug: 'burger-king',
    logo: getPlaceholderImage('burgerking', 7, 200, 200),
    category: 'Burgers',
    rating: 4.2,
    verified: true,
    description: 'Have it your way',
    location: {
      type: 'Point',
      coordinates: [77.6411, 12.9719],
      address: 'Forum Mall, Koramangala',
      city: 'Bangalore',
      state: 'Karnataka',
      country: 'India',
      pincode: '560034',
    },
  },
  {
    _id: storeIds.kfc,
    name: 'KFC',
    slug: 'kfc',
    logo: getPlaceholderImage('kfc', 8, 200, 200),
    category: 'Chicken',
    rating: 4.1,
    verified: true,
    description: "Finger lickin' good",
    location: {
      type: 'Point',
      coordinates: [77.5833, 12.9716],
      address: 'Brigade Road',
      city: 'Bangalore',
      state: 'Karnataka',
      country: 'India',
      pincode: '560001',
    },
  },
  {
    _id: storeIds.subway,
    name: 'Subway',
    slug: 'subway',
    logo: getPlaceholderImage('subway', 9, 200, 200),
    category: 'Sandwiches',
    rating: 4.0,
    verified: true,
    description: 'Eat Fresh',
    location: {
      type: 'Point',
      coordinates: [77.6245, 12.9352],
      address: 'HSR Layout',
      city: 'Bangalore',
      state: 'Karnataka',
      country: 'India',
      pincode: '560102',
    },
  },

  // Cafes
  {
    _id: storeIds.starbucks,
    name: 'Starbucks',
    slug: 'starbucks',
    logo: getPlaceholderImage('starbucks', 10, 200, 200),
    category: 'Cafe',
    rating: 4.5,
    verified: true,
    description: 'Premium coffee experience',
    location: {
      type: 'Point',
      coordinates: [77.6411, 12.9719],
      address: 'UB City Mall',
      city: 'Bangalore',
      state: 'Karnataka',
      country: 'India',
      pincode: '560001',
    },
  },
  {
    _id: storeIds.ccd,
    name: 'Café Coffee Day',
    slug: 'cafe-coffee-day',
    logo: getPlaceholderImage('ccd', 11, 200, 200),
    category: 'Cafe',
    rating: 4.0,
    verified: true,
    description: 'A lot can happen over coffee',
    location: {
      type: 'Point',
      coordinates: [77.5946, 12.9716],
      address: 'MG Road',
      city: 'Bangalore',
      state: 'Karnataka',
      country: 'India',
      pincode: '560001',
    },
  },
  {
    _id: storeIds.chaayos,
    name: 'Chaayos',
    slug: 'chaayos',
    logo: getPlaceholderImage('chaayos', 12, 200, 200),
    category: 'Cafe',
    rating: 4.2,
    verified: true,
    description: 'Meri wali chai',
    location: {
      type: 'Point',
      coordinates: [77.6245, 12.9352],
      address: 'Koramangala',
      city: 'Bangalore',
      state: 'Karnataka',
      country: 'India',
      pincode: '560034',
    },
  },

  // Grocery
  {
    _id: storeIds.bigBazaar,
    name: 'Big Bazaar',
    slug: 'big-bazaar',
    logo: getPlaceholderImage('bigbazaar', 13, 200, 200),
    category: 'Grocery',
    rating: 4.0,
    verified: true,
    description: "India's favourite hypermarket",
    location: {
      type: 'Point',
      coordinates: [77.5946, 12.9716],
      address: 'Phoenix Marketcity',
      city: 'Bangalore',
      state: 'Karnataka',
      country: 'India',
      pincode: '560048',
    },
  },
  {
    _id: storeIds.dmart,
    name: 'DMart',
    slug: 'dmart',
    logo: getPlaceholderImage('dmart', 14, 200, 200),
    category: 'Grocery',
    rating: 4.3,
    verified: true,
    description: 'Daily discounts, daily savings',
    location: {
      type: 'Point',
      coordinates: [77.6101, 12.9352],
      address: 'BTM Layout',
      city: 'Bangalore',
      state: 'Karnataka',
      country: 'India',
      pincode: '560076',
    },
  },
  {
    _id: storeIds.relianceFresh,
    name: 'Reliance Fresh',
    slug: 'reliance-fresh',
    logo: getPlaceholderImage('reliance', 15, 200, 200),
    category: 'Grocery',
    rating: 4.1,
    verified: true,
    description: 'Fresh groceries everyday',
    location: {
      type: 'Point',
      coordinates: [77.6245, 12.9352],
      address: 'Jayanagar',
      city: 'Bangalore',
      state: 'Karnataka',
      country: 'India',
      pincode: '560041',
    },
  },

  // Fashion
  {
    _id: storeIds.myntra,
    name: 'Myntra',
    slug: 'myntra',
    logo: getPlaceholderImage('myntra', 16, 200, 200),
    category: 'Fashion',
    rating: 4.4,
    verified: true,
    description: "India's fashion expert",
    location: {
      type: 'Point',
      coordinates: [77.6411, 12.9719],
      address: 'Embassy Tech Village',
      city: 'Bangalore',
      state: 'Karnataka',
      country: 'India',
      pincode: '560103',
    },
  },
  {
    _id: storeIds.ajio,
    name: 'AJIO',
    slug: 'ajio',
    logo: getPlaceholderImage('ajio', 17, 200, 200),
    category: 'Fashion',
    rating: 4.2,
    verified: true,
    description: 'All about style',
    location: {
      type: 'Point',
      coordinates: [72.8777, 19.0760],
      address: 'Mumbai HQ',
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
      pincode: '400001',
    },
  },
  {
    _id: storeIds.flipkart,
    name: 'Flipkart',
    slug: 'flipkart',
    logo: getPlaceholderImage('flipkart', 18, 200, 200),
    category: 'Shopping',
    rating: 4.3,
    verified: true,
    description: "India's shopping destination",
    location: {
      type: 'Point',
      coordinates: [77.6411, 12.9719],
      address: 'Embassy Tech Village',
      city: 'Bangalore',
      state: 'Karnataka',
      country: 'India',
      pincode: '560103',
    },
  },
  {
    _id: storeIds.amazon,
    name: 'Amazon',
    slug: 'amazon',
    logo: getPlaceholderImage('amazon', 19, 200, 200),
    category: 'Shopping',
    rating: 4.4,
    verified: true,
    description: 'Everything from A to Z',
    location: {
      type: 'Point',
      coordinates: [77.6411, 12.9719],
      address: 'World Trade Center',
      city: 'Bangalore',
      state: 'Karnataka',
      country: 'India',
      pincode: '560001',
    },
  },
  {
    _id: storeIds.nykaa,
    name: 'Nykaa',
    slug: 'nykaa',
    logo: getPlaceholderImage('nykaa', 20, 200, 200),
    category: 'Beauty',
    rating: 4.3,
    verified: true,
    description: 'Beauty for all',
    location: {
      type: 'Point',
      coordinates: [72.8777, 19.0760],
      address: 'Mumbai HQ',
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
      pincode: '400001',
    },
  },

  // Electronics
  {
    _id: storeIds.croma,
    name: 'Croma',
    slug: 'croma',
    logo: getPlaceholderImage('croma', 21, 200, 200),
    category: 'Electronics',
    rating: 4.2,
    verified: true,
    description: 'Tata enterprise electronics store',
    location: {
      type: 'Point',
      coordinates: [77.5946, 12.9716],
      address: 'Phoenix Marketcity',
      city: 'Bangalore',
      state: 'Karnataka',
      country: 'India',
      pincode: '560048',
    },
  },
];

// Helper function to get store info for offers
export const getStoreInfo = (storeId: mongoose.Types.ObjectId) => {
  const store = storeSeeds.find((s) => s._id.equals(storeId));
  if (!store) return null;
  return {
    id: store._id,
    name: store.name,
    logo: store.logo,
    rating: store.rating,
    verified: store.verified,
  };
};

export default storeSeeds;
