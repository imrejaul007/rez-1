/**
 * Add More Stores with Diverse Data
 *
 * This script ADDS new stores (doesn't modify existing ones)
 * with proper delivery categories, varied locations, and complete data
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };
const DB_NAME = process.env.DB_NAME || 'test';

// Import Store model
const StoreSchema = new mongoose.Schema({
  name: String,
  slug: String,
  description: String,
  logo: String,
  banner: String,
  videos: [{
    url: String,
    thumbnail: String,
    title: String,
    duration: Number,
    uploadedAt: Date
  }],
  category: mongoose.Schema.Types.ObjectId,
  location: {
    address: String,
    city: String,
    state: String,
    pincode: String,
    coordinates: [Number],
    deliveryRadius: Number,
    landmark: String
  },
  contact: {
    phone: String,
    email: String,
    website: String,
    whatsapp: String
  },
  ratings: {
    average: Number,
    count: Number,
    distribution: {
      5: Number,
      4: Number,
      3: Number,
      2: Number,
      1: Number
    }
  },
  offers: {
    cashback: Number,
    minOrderAmount: Number,
    maxCashback: Number,
    isPartner: Boolean,
    partnerLevel: String
  },
  operationalInfo: {
    hours: mongoose.Schema.Types.Mixed,
    deliveryTime: String,
    minimumOrder: Number,
    deliveryFee: Number,
    freeDeliveryAbove: Number,
    acceptsWalletPayment: Boolean,
    paymentMethods: [String]
  },
  deliveryCategories: {
    fastDelivery: Boolean,
    budgetFriendly: Boolean,
    ninetyNineStore: Boolean,
    premium: Boolean,
    organic: Boolean,
    alliance: Boolean,
    lowestPrice: Boolean,
    mall: Boolean,
    cashStore: Boolean
  },
  analytics: {
    totalOrders: Number,
    totalRevenue: Number,
    avgOrderValue: Number,
    repeatCustomers: Number
  },
  tags: [String],
  isActive: Boolean,
  isFeatured: Boolean,
  isVerified: Boolean,
  merchantId: mongoose.Schema.Types.ObjectId
}, { timestamps: true });

const Store = mongoose.model('Store', StoreSchema);

// Helper function to generate slug
function generateSlug(name) {
  return name.toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .trim();
}

// Diverse store data - 25 new stores
const NEW_STORES = [
  // ========== FAST DELIVERY STORES (6 stores) ==========
  {
    name: "QuickBite Express",
    description: "Lightning-fast food delivery in under 15 minutes. Fresh, hot meals delivered to your doorstep faster than you can blink!",
    category: "Food & Groceries",
    location: {
      address: "MG Road, Bengaluru",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560001",
      coordinates: [77.6033, 12.9716],
      deliveryRadius: 5,
      landmark: "Near Cubbon Park Metro"
    },
    deliveryCategories: {
      fastDelivery: true,
      budgetFriendly: true,
      organic: false,
      premium: false,
      alliance: true,
      lowestPrice: false,
      mall: false,
      cashStore: false,
      ninetyNineStore: false
    },
    operationalInfo: {
      deliveryTime: "10-15 mins",
      minimumOrder: 99,
      deliveryFee: 20,
      freeDeliveryAbove: 299
    },
    offers: {
      cashback: 12,
      minOrderAmount: 99,
      maxCashback: 75,
      partnerLevel: "silver"
    },
    ratings: { average: 4.6, count: 2340 }
  },
  {
    name: "RapidMart Groceries",
    description: "Get your daily essentials delivered in 20 minutes. Fresh groceries, household items, and more!",
    category: "Groceries",
    location: {
      address: "Indiranagar, Bengaluru",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560038",
      coordinates: [77.6408, 12.9784],
      deliveryRadius: 8,
      landmark: "100 Feet Road"
    },
    deliveryCategories: {
      fastDelivery: true,
      budgetFriendly: true,
      organic: true,
      premium: false,
      alliance: true,
      lowestPrice: false,
      mall: false,
      cashStore: false,
      ninetyNineStore: false
    },
    operationalInfo: {
      deliveryTime: "15-20 mins",
      minimumOrder: 199,
      deliveryFee: 25,
      freeDeliveryAbove: 499
    },
    offers: {
      cashback: 8,
      minOrderAmount: 199,
      maxCashback: 60,
      partnerLevel: "bronze"
    },
    ratings: { average: 4.5, count: 1890 }
  },
  {
    name: "FlashPharma Plus",
    description: "Medicines and healthcare products delivered in 15 minutes. Your health, our priority!",
    category: "Health & Wellness",
    location: {
      address: "Koramangala, Bengaluru",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560034",
      coordinates: [77.6309, 12.9352],
      deliveryRadius: 6,
      landmark: "Sony Signal"
    },
    deliveryCategories: {
      fastDelivery: true,
      budgetFriendly: false,
      organic: false,
      premium: false,
      alliance: true,
      lowestPrice: false,
      mall: false,
      cashStore: true,
      ninetyNineStore: false
    },
    operationalInfo: {
      deliveryTime: "12-18 mins",
      minimumOrder: 150,
      deliveryFee: 0,
      freeDeliveryAbove: 0
    },
    offers: {
      cashback: 5,
      minOrderAmount: 150,
      maxCashback: 100,
      partnerLevel: "gold"
    },
    ratings: { average: 4.7, count: 3200 }
  },
  {
    name: "SpeedySnacks Hub",
    description: "Craving something? Get your favorite snacks and beverages in just 10 minutes!",
    category: "Food & Beverages",
    location: {
      address: "HSR Layout, Bengaluru",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560102",
      coordinates: [77.6387, 12.9082],
      deliveryRadius: 4,
      landmark: "27th Main Road"
    },
    deliveryCategories: {
      fastDelivery: true,
      budgetFriendly: true,
      organic: false,
      premium: false,
      alliance: false,
      lowestPrice: false,
      mall: false,
      cashStore: false,
      ninetyNineStore: false
    },
    operationalInfo: {
      deliveryTime: "8-12 mins",
      minimumOrder: 50,
      deliveryFee: 15,
      freeDeliveryAbove: 199
    },
    offers: {
      cashback: 15,
      minOrderAmount: 50,
      maxCashback: 50,
      partnerLevel: "bronze"
    },
    ratings: { average: 4.4, count: 1560 }
  },
  {
    name: "Instant Electronics",
    description: "Tech accessories and gadgets delivered super fast. Chargers, earphones, and more in 25 minutes!",
    category: "Electronics",
    location: {
      address: "Whitefield, Bengaluru",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560066",
      coordinates: [77.7499, 12.9698],
      deliveryRadius: 7,
      landmark: "ITPL Main Road"
    },
    deliveryCategories: {
      fastDelivery: true,
      budgetFriendly: false,
      organic: false,
      premium: false,
      alliance: true,
      lowestPrice: false,
      mall: false,
      cashStore: false,
      ninetyNineStore: false
    },
    operationalInfo: {
      deliveryTime: "20-25 mins",
      minimumOrder: 299,
      deliveryFee: 30,
      freeDeliveryAbove: 799
    },
    offers: {
      cashback: 10,
      minOrderAmount: 299,
      maxCashback: 150,
      partnerLevel: "silver"
    },
    ratings: { average: 4.3, count: 980 }
  },
  {
    name: "ZoomMart 24/7",
    description: "Your 24/7 convenience store with super fast delivery. Always open, always fast!",
    category: "General Store",
    location: {
      address: "Jayanagar, Bengaluru",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560041",
      coordinates: [77.5946, 12.9250],
      deliveryRadius: 5,
      landmark: "4th Block"
    },
    deliveryCategories: {
      fastDelivery: true,
      budgetFriendly: true,
      organic: false,
      premium: false,
      alliance: true,
      lowestPrice: false,
      mall: false,
      cashStore: true,
      ninetyNineStore: false
    },
    operationalInfo: {
      deliveryTime: "15-20 mins",
      minimumOrder: 100,
      deliveryFee: 20,
      freeDeliveryAbove: 399
    },
    offers: {
      cashback: 7,
      minOrderAmount: 100,
      maxCashback: 70,
      partnerLevel: "bronze"
    },
    ratings: { average: 4.5, count: 2100 }
  },

  // ========== BUDGET FRIENDLY STORES (5 stores) ==========
  {
    name: "ValueMart Superstore",
    description: "Best prices guaranteed! Everything under ₹99. Your budget shopping destination!",
    category: "General Store",
    location: {
      address: "Marathahalli, Bengaluru",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560037",
      coordinates: [77.6976, 12.9591],
      deliveryRadius: 10,
      landmark: "Outer Ring Road"
    },
    deliveryCategories: {
      fastDelivery: false,
      budgetFriendly: true,
      organic: false,
      premium: false,
      alliance: true,
      lowestPrice: true,
      mall: false,
      cashStore: true,
      ninetyNineStore: true
    },
    operationalInfo: {
      deliveryTime: "35-45 mins",
      minimumOrder: 99,
      deliveryFee: 25,
      freeDeliveryAbove: 299
    },
    offers: {
      cashback: 10,
      minOrderAmount: 99,
      maxCashback: 50,
      partnerLevel: "bronze"
    },
    ratings: { average: 4.2, count: 1450 }
  },
  {
    name: "PennyWise Bazaar",
    description: "Smart shopping for smart people. Premium quality at budget prices!",
    category: "Shopping",
    location: {
      address: "Rajajinagar, Bengaluru",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560010",
      coordinates: [77.5568, 12.9899],
      deliveryRadius: 8,
      landmark: "Chord Road"
    },
    deliveryCategories: {
      fastDelivery: false,
      budgetFriendly: true,
      organic: false,
      premium: false,
      alliance: false,
      lowestPrice: true,
      mall: false,
      cashStore: true,
      ninetyNineStore: false
    },
    operationalInfo: {
      deliveryTime: "40-50 mins",
      minimumOrder: 149,
      deliveryFee: 30,
      freeDeliveryAbove: 399
    },
    offers: {
      cashback: 8,
      minOrderAmount: 149,
      maxCashback: 60,
      partnerLevel: "bronze"
    },
    ratings: { average: 4.3, count: 1120 }
  },
  {
    name: "One Rupee Wonders",
    description: "Incredible deals starting at just ₹1! Discount heaven for savvy shoppers!",
    category: "Discount Store",
    location: {
      address: "Banashankari, Bengaluru",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560050",
      coordinates: [77.5481, 12.9250],
      deliveryRadius: 12,
      landmark: "BDA Complex"
    },
    deliveryCategories: {
      fastDelivery: false,
      budgetFriendly: true,
      organic: false,
      premium: false,
      alliance: true,
      lowestPrice: true,
      mall: false,
      cashStore: true,
      ninetyNineStore: false
    },
    operationalInfo: {
      deliveryTime: "45-60 mins",
      minimumOrder: 1,
      deliveryFee: 20,
      freeDeliveryAbove: 199
    },
    offers: {
      cashback: 20,
      minOrderAmount: 1,
      maxCashback: 40,
      partnerLevel: "bronze"
    },
    ratings: { average: 4.1, count: 3400 }
  },
  {
    name: "Budget Boutique",
    description: "Fashionable clothing and accessories at unbeatable prices. Style doesn't have to be expensive!",
    category: "Fashion",
    location: {
      address: "Commercial Street, Bengaluru",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560001",
      coordinates: [77.6101, 12.9823],
      deliveryRadius: 6,
      landmark: "MG Road Metro"
    },
    deliveryCategories: {
      fastDelivery: false,
      budgetFriendly: true,
      organic: false,
      premium: false,
      alliance: true,
      lowestPrice: false,
      mall: false,
      cashStore: false,
      ninetyNineStore: false
    },
    operationalInfo: {
      deliveryTime: "30-40 mins",
      minimumOrder: 299,
      deliveryFee: 40,
      freeDeliveryAbove: 799
    },
    offers: {
      cashback: 12,
      minOrderAmount: 299,
      maxCashback: 100,
      partnerLevel: "silver"
    },
    ratings: { average: 4.4, count: 890 }
  },
  {
    name: "EconoBooks & More",
    description: "Affordable books, stationery, and educational supplies. Learn more, spend less!",
    category: "Books & Stationery",
    location: {
      address: "Malleshwaram, Bengaluru",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560003",
      coordinates: [77.5707, 13.0006],
      deliveryRadius: 7,
      landmark: "Sampige Road"
    },
    deliveryCategories: {
      fastDelivery: false,
      budgetFriendly: true,
      organic: false,
      premium: false,
      alliance: false,
      lowestPrice: true,
      mall: false,
      cashStore: true,
      ninetyNineStore: false
    },
    operationalInfo: {
      deliveryTime: "35-45 mins",
      minimumOrder: 199,
      deliveryFee: 25,
      freeDeliveryAbove: 499
    },
    offers: {
      cashback: 10,
      minOrderAmount: 199,
      maxCashback: 75,
      partnerLevel: "bronze"
    },
    ratings: { average: 4.5, count: 670 }
  },

  // ========== PREMIUM/LUXURY STORES (5 stores) ==========
  {
    name: "LuxeLiving Emporium",
    description: "Curated luxury home decor and furnishings. Transform your space into a masterpiece!",
    category: "Home & Decor",
    location: {
      address: "UB City Mall, Bengaluru",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560001",
      coordinates: [77.5946, 12.9716],
      deliveryRadius: 15,
      landmark: "Vittal Mallya Road"
    },
    deliveryCategories: {
      fastDelivery: false,
      budgetFriendly: false,
      organic: false,
      premium: true,
      alliance: true,
      lowestPrice: false,
      mall: true,
      cashStore: false,
      ninetyNineStore: false
    },
    operationalInfo: {
      deliveryTime: "2-3 days",
      minimumOrder: 5000,
      deliveryFee: 200,
      freeDeliveryAbove: 15000
    },
    offers: {
      cashback: 5,
      minOrderAmount: 5000,
      maxCashback: 500,
      partnerLevel: "platinum"
    },
    ratings: { average: 4.8, count: 450 }
  },
  {
    name: "Elite Fashion Studio",
    description: "Designer clothing and haute couture. Where fashion meets perfection!",
    category: "Fashion",
    location: {
      address: "Phoenix Marketcity, Whitefield",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560048",
      coordinates: [77.6975, 12.9975],
      deliveryRadius: 20,
      landmark: "Whitefield Main Road"
    },
    deliveryCategories: {
      fastDelivery: false,
      budgetFriendly: false,
      organic: false,
      premium: true,
      alliance: true,
      lowestPrice: false,
      mall: true,
      cashStore: false,
      ninetyNineStore: false
    },
    operationalInfo: {
      deliveryTime: "1-2 days",
      minimumOrder: 3000,
      deliveryFee: 150,
      freeDeliveryAbove: 10000
    },
    offers: {
      cashback: 8,
      minOrderAmount: 3000,
      maxCashback: 500,
      partnerLevel: "platinum"
    },
    ratings: { average: 4.7, count: 720 }
  },
  {
    name: "Premium Tech Hub",
    description: "Latest flagship smartphones, laptops, and premium gadgets. Technology at its finest!",
    category: "Electronics",
    location: {
      address: "Orion Mall, Bengaluru",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560055",
      coordinates: [77.5568, 13.0104],
      deliveryRadius: 15,
      landmark: "Dr. Rajkumar Road"
    },
    deliveryCategories: {
      fastDelivery: false,
      budgetFriendly: false,
      organic: false,
      premium: true,
      alliance: true,
      lowestPrice: false,
      mall: true,
      cashStore: false,
      ninetyNineStore: false
    },
    operationalInfo: {
      deliveryTime: "Same day",
      minimumOrder: 10000,
      deliveryFee: 0,
      freeDeliveryAbove: 0
    },
    offers: {
      cashback: 3,
      minOrderAmount: 10000,
      maxCashback: 1000,
      partnerLevel: "platinum"
    },
    ratings: { average: 4.6, count: 1200 }
  },
  {
    name: "Royal Jewels Palace",
    description: "Exquisite diamond and gold jewelry. Luxury that lasts generations!",
    category: "Jewelry",
    location: {
      address: "MG Road, Bengaluru",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560001",
      coordinates: [77.6069, 12.9750],
      deliveryRadius: 10,
      landmark: "Trinity Metro"
    },
    deliveryCategories: {
      fastDelivery: false,
      budgetFriendly: false,
      organic: false,
      premium: true,
      alliance: true,
      lowestPrice: false,
      mall: false,
      cashStore: false,
      ninetyNineStore: false
    },
    operationalInfo: {
      deliveryTime: "Same day",
      minimumOrder: 20000,
      deliveryFee: 0,
      freeDeliveryAbove: 0
    },
    offers: {
      cashback: 2,
      minOrderAmount: 20000,
      maxCashback: 2000,
      partnerLevel: "platinum"
    },
    ratings: { average: 4.9, count: 340 }
  },
  {
    name: "Gourmet Delights Premium",
    description: "Imported wines, gourmet cheese, and premium delicacies. Fine dining at home!",
    category: "Food & Beverages",
    location: {
      address: "Lavelle Road, Bengaluru",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560001",
      coordinates: [77.6033, 12.9716],
      deliveryRadius: 12,
      landmark: "Near UB City"
    },
    deliveryCategories: {
      fastDelivery: false,
      budgetFriendly: false,
      organic: true,
      premium: true,
      alliance: true,
      lowestPrice: false,
      mall: false,
      cashStore: false,
      ninetyNineStore: false
    },
    operationalInfo: {
      deliveryTime: "2-4 hours",
      minimumOrder: 2000,
      deliveryFee: 100,
      freeDeliveryAbove: 5000
    },
    offers: {
      cashback: 5,
      minOrderAmount: 2000,
      maxCashback: 300,
      partnerLevel: "gold"
    },
    ratings: { average: 4.7, count: 580 }
  },

  // ========== ORGANIC STORES (3 stores) ==========
  {
    name: "GreenHarvest Organic",
    description: "100% certified organic fruits, vegetables, and groceries. Farm fresh to your table!",
    category: "Organic Groceries",
    location: {
      address: "Sarjapur Road, Bengaluru",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560035",
      coordinates: [77.6906, 12.9075],
      deliveryRadius: 15,
      landmark: "Near Wipro Corporate"
    },
    deliveryCategories: {
      fastDelivery: false,
      budgetFriendly: false,
      organic: true,
      premium: false,
      alliance: true,
      lowestPrice: false,
      mall: false,
      cashStore: false,
      ninetyNineStore: false
    },
    operationalInfo: {
      deliveryTime: "1-2 days",
      minimumOrder: 399,
      deliveryFee: 40,
      freeDeliveryAbove: 999
    },
    offers: {
      cashback: 10,
      minOrderAmount: 399,
      maxCashback: 150,
      partnerLevel: "gold"
    },
    ratings: { average: 4.6, count: 1340 }
  },
  {
    name: "Nature's Basket",
    description: "Organic and natural products for a healthy lifestyle. Chemical-free living starts here!",
    category: "Health & Wellness",
    location: {
      address: "Bellandur, Bengaluru",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560103",
      coordinates: [77.6760, 12.9252],
      deliveryRadius: 12,
      landmark: "Outer Ring Road"
    },
    deliveryCategories: {
      fastDelivery: false,
      budgetFriendly: false,
      organic: true,
      premium: true,
      alliance: true,
      lowestPrice: false,
      mall: false,
      cashStore: false,
      ninetyNineStore: false
    },
    operationalInfo: {
      deliveryTime: "Same day",
      minimumOrder: 499,
      deliveryFee: 50,
      freeDeliveryAbove: 1499
    },
    offers: {
      cashback: 8,
      minOrderAmount: 499,
      maxCashback: 200,
      partnerLevel: "platinum"
    },
    ratings: { average: 4.8, count: 890 }
  },
  {
    name: "EcoLife Organics",
    description: "Sustainable, eco-friendly organic products. Good for you, good for the planet!",
    category: "Organic & Natural",
    location: {
      address: "Electronic City, Bengaluru",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560100",
      coordinates: [77.6648, 12.8456],
      deliveryRadius: 10,
      landmark: "Phase 1"
    },
    deliveryCategories: {
      fastDelivery: false,
      budgetFriendly: false,
      organic: true,
      premium: false,
      alliance: true,
      lowestPrice: false,
      mall: false,
      cashStore: false,
      ninetyNineStore: false
    },
    operationalInfo: {
      deliveryTime: "1-2 days",
      minimumOrder: 349,
      deliveryFee: 35,
      freeDeliveryAbove: 899
    },
    offers: {
      cashback: 12,
      minOrderAmount: 349,
      maxCashback: 120,
      partnerLevel: "silver"
    },
    ratings: { average: 4.5, count: 760 }
  },

  // ========== MALL STORES (3 stores) ==========
  {
    name: "MegaMall Central",
    description: "Your one-stop shopping destination with 200+ brands under one roof!",
    category: "Shopping Mall",
    location: {
      address: "Mantri Square Mall, Bengaluru",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560003",
      coordinates: [77.5707, 13.0067],
      deliveryRadius: 20,
      landmark: "Malleshwaram"
    },
    deliveryCategories: {
      fastDelivery: false,
      budgetFriendly: false,
      organic: false,
      premium: true,
      alliance: true,
      lowestPrice: false,
      mall: true,
      cashStore: false,
      ninetyNineStore: false
    },
    operationalInfo: {
      deliveryTime: "Same day",
      minimumOrder: 999,
      deliveryFee: 100,
      freeDeliveryAbove: 2999
    },
    offers: {
      cashback: 7,
      minOrderAmount: 999,
      maxCashback: 300,
      partnerLevel: "gold"
    },
    ratings: { average: 4.5, count: 2100 }
  },
  {
    name: "ShopperStop Plaza",
    description: "Fashion, lifestyle, and entertainment - all in one place. Shop till you drop!",
    category: "Lifestyle Mall",
    location: {
      address: "Garuda Mall, Bengaluru",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560052",
      coordinates: [77.6012, 12.9341],
      deliveryRadius: 18,
      landmark: "Magrath Road"
    },
    deliveryCategories: {
      fastDelivery: false,
      budgetFriendly: false,
      organic: false,
      premium: true,
      alliance: true,
      lowestPrice: false,
      mall: true,
      cashStore: false,
      ninetyNineStore: false
    },
    operationalInfo: {
      deliveryTime: "Same day",
      minimumOrder: 1499,
      deliveryFee: 120,
      freeDeliveryAbove: 3999
    },
    offers: {
      cashback: 6,
      minOrderAmount: 1499,
      maxCashback: 400,
      partnerLevel: "platinum"
    },
    ratings: { average: 4.6, count: 1850 }
  },
  {
    name: "Grand Galleria",
    description: "Luxury shopping experience with international and Indian designer brands!",
    category: "Premium Mall",
    location: {
      address: "VR Bengaluru, Whitefield",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560066",
      coordinates: [77.7597, 12.9931],
      deliveryRadius: 25,
      landmark: "Whitefield Main Road"
    },
    deliveryCategories: {
      fastDelivery: false,
      budgetFriendly: false,
      organic: false,
      premium: true,
      alliance: true,
      lowestPrice: false,
      mall: true,
      cashStore: false,
      ninetyNineStore: false
    },
    operationalInfo: {
      deliveryTime: "Next day",
      minimumOrder: 2499,
      deliveryFee: 150,
      freeDeliveryAbove: 5999
    },
    offers: {
      cashback: 5,
      minOrderAmount: 2499,
      maxCashback: 500,
      partnerLevel: "platinum"
    },
    ratings: { average: 4.7, count: 1320 }
  },

  // ========== ALLIANCE/PARTNER STORES (3 stores) ==========
  {
    name: "Partner Network Store",
    description: "Part of our exclusive partner network. Trusted quality and service guaranteed!",
    category: "General Retail",
    location: {
      address: "Yelahanka, Bengaluru",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560064",
      coordinates: [77.5946, 13.1007],
      deliveryRadius: 15,
      landmark: "New Town"
    },
    deliveryCategories: {
      fastDelivery: false,
      budgetFriendly: true,
      organic: false,
      premium: false,
      alliance: true,
      lowestPrice: false,
      mall: false,
      cashStore: true,
      ninetyNineStore: false
    },
    operationalInfo: {
      deliveryTime: "30-45 mins",
      minimumOrder: 249,
      deliveryFee: 30,
      freeDeliveryAbove: 599
    },
    offers: {
      cashback: 15,
      minOrderAmount: 249,
      maxCashback: 100,
      partnerLevel: "silver"
    },
    ratings: { average: 4.4, count: 1100 }
  },
  {
    name: "Alliance Supermart",
    description: "Your trusted neighborhood store with alliance benefits and exclusive deals!",
    category: "Supermarket",
    location: {
      address: "RT Nagar, Bengaluru",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560032",
      coordinates: [77.5967, 13.0246],
      deliveryRadius: 10,
      landmark: "Ganganagar"
    },
    deliveryCategories: {
      fastDelivery: false,
      budgetFriendly: true,
      organic: false,
      premium: false,
      alliance: true,
      lowestPrice: false,
      mall: false,
      cashStore: true,
      ninetyNineStore: false
    },
    operationalInfo: {
      deliveryTime: "35-50 mins",
      minimumOrder: 299,
      deliveryFee: 35,
      freeDeliveryAbove: 699
    },
    offers: {
      cashback: 12,
      minOrderAmount: 299,
      maxCashback: 120,
      partnerLevel: "gold"
    },
    ratings: { average: 4.5, count: 1450 }
  },
  {
    name: "Trusted Partners Hub",
    description: "Verified partner store with quality assurance. Shop with confidence!",
    category: "Multi-Brand Store",
    location: {
      address: "Hebbal, Bengaluru",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560024",
      coordinates: [77.5971, 13.0358],
      deliveryRadius: 12,
      landmark: "Hebbal Flyover"
    },
    deliveryCategories: {
      fastDelivery: false,
      budgetFriendly: false,
      organic: false,
      premium: false,
      alliance: true,
      lowestPrice: false,
      mall: false,
      cashStore: false,
      ninetyNineStore: false
    },
    operationalInfo: {
      deliveryTime: "40-60 mins",
      minimumOrder: 399,
      deliveryFee: 40,
      freeDeliveryAbove: 999
    },
    offers: {
      cashback: 10,
      minOrderAmount: 399,
      maxCashback: 150,
      partnerLevel: "silver"
    },
    ratings: { average: 4.3, count: 890 }
  }
];

// Function to add common fields to each store
function enrichStoreData(store) {
  const slug = generateSlug(store.name);

  return {
    ...store,
    slug,
    logo: `https://ui-avatars.com/api/?name=${encodeURIComponent(store.name)}&size=200&background=random`,
    banner: `https://source.unsplash.com/800x400/?${encodeURIComponent(store.category)},store`,

    // Videos
    videos: [
      {
        url: `https://storage.googleapis.com/gtv-videos-bucket/sample/${slug}-tour.mp4`,
        thumbnail: `https://source.unsplash.com/400x300/?${encodeURIComponent(store.category)}`,
        title: `${store.name} - Store Tour`,
        duration: Math.floor(Math.random() * 60) + 20,
        uploadedAt: new Date()
      },
      {
        url: `https://storage.googleapis.com/gtv-videos-bucket/sample/${slug}-products.mp4`,
        thumbnail: `https://source.unsplash.com/400x300/?${encodeURIComponent(store.category)},products`,
        title: `${store.name} - Product Showcase`,
        duration: Math.floor(Math.random() * 45) + 15,
        uploadedAt: new Date()
      }
    ],

    // Contact info
    contact: {
      phone: `+91-${80000 + Math.floor(Math.random() * 10000)}-${10000 + Math.floor(Math.random() * 90000)}`,
      email: `info@${slug}.com`,
      website: `www.${slug}.com`,
      whatsapp: `+91-${90000 + Math.floor(Math.random() * 10000)}-${10000 + Math.floor(Math.random() * 90000)}`
    },

    // Ratings distribution
    ratings: {
      ...store.ratings,
      distribution: {
        5: Math.floor(store.ratings.count * 0.65),
        4: Math.floor(store.ratings.count * 0.20),
        3: Math.floor(store.ratings.count * 0.10),
        2: Math.floor(store.ratings.count * 0.03),
        1: Math.floor(store.ratings.count * 0.02)
      }
    },

    // Offers
    offers: {
      ...store.offers,
      isPartner: true
    },

    // Operational info
    operationalInfo: {
      ...store.operationalInfo,
      hours: {
        monday: { open: '09:00', close: '21:00', closed: false },
        tuesday: { open: '09:00', close: '21:00', closed: false },
        wednesday: { open: '09:00', close: '21:00', closed: false },
        thursday: { open: '09:00', close: '21:00', closed: false },
        friday: { open: '09:00', close: '21:00', closed: false },
        saturday: { open: '09:00', close: '22:00', closed: false },
        sunday: { open: '10:00', close: '22:00', closed: false }
      },
      acceptsWalletPayment: true,
      paymentMethods: ['cash', 'card', 'upi', 'wallet', 'netbanking']
    },

    // Analytics
    analytics: {
      totalOrders: Math.floor(store.ratings.count * 1.5),
      totalRevenue: Math.floor(store.ratings.count * store.operationalInfo.minimumOrder * 2),
      avgOrderValue: store.operationalInfo.minimumOrder * 1.8,
      repeatCustomers: Math.floor(store.ratings.count * 0.35)
    },

    // Tags
    tags: [
      store.category.toLowerCase(),
      store.location.city.toLowerCase(),
      ...(store.deliveryCategories.fastDelivery ? ['fast-delivery', 'quick'] : []),
      ...(store.deliveryCategories.budgetFriendly ? ['budget', 'affordable'] : []),
      ...(store.deliveryCategories.premium ? ['luxury', 'premium'] : []),
      ...(store.deliveryCategories.organic ? ['organic', 'natural'] : [])
    ],

    // Status
    isActive: true,
    isFeatured: Math.random() > 0.7, // 30% are featured
    isVerified: true
  };
}

// Main function
async function addNewStores() {
  try {
    console.log('🚀 Starting to add new stores...\n');

    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI, {
      dbName: DB_NAME,
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('✅ Connected to MongoDB\n');

    // Get existing count
    const existingCount = await Store.countDocuments();
    console.log(`📊 Existing stores: ${existingCount}\n`);

    // Get a sample category ID
    const CategorySchema = new mongoose.Schema({ name: String, slug: String });
    const Category = mongoose.model('Category', CategorySchema);

    let sampleCategory = await Category.findOne();
    if (!sampleCategory) {
      // Create a default category if none exists
      sampleCategory = await Category.create({
        name: 'General',
        slug: 'general'
      });
      console.log('✅ Created default category\n');
    }

    console.log('📝 Adding new stores...\n');

    let addedCount = 0;
    const categoryStats = {};

    for (const storeData of NEW_STORES) {
      const enrichedData = enrichStoreData(storeData);
      enrichedData.category = sampleCategory._id;

      // Check if store already exists
      const exists = await Store.findOne({ slug: enrichedData.slug });

      if (!exists) {
        await Store.create(enrichedData);
        addedCount++;
        console.log(`✅ Added: ${enrichedData.name}`);

        // Track category stats
        Object.keys(enrichedData.deliveryCategories).forEach(cat => {
          if (enrichedData.deliveryCategories[cat]) {
            categoryStats[cat] = (categoryStats[cat] || 0) + 1;
          }
        });
      } else {
        console.log(`⏭️  Skipped (already exists): ${enrichedData.name}`);
      }
    }

    console.log(`\n✅ Successfully added ${addedCount} new stores!\n`);

    // Final stats
    const finalCount = await Store.countDocuments();
    console.log('📊 FINAL DATABASE STATS:');
    console.log(`   Total stores: ${finalCount}`);
    console.log(`   Existing: ${existingCount}`);
    console.log(`   Added: ${addedCount}\n`);

    console.log('📊 DELIVERY CATEGORY DISTRIBUTION (New Stores):');
    Object.keys(categoryStats).sort().forEach(cat => {
      console.log(`   ${cat}: ${categoryStats[cat]} stores`);
    });

    console.log('\n🎉 All done! Your Store Categories page should now work!\n');
    console.log('Next steps:');
    console.log('1. Restart your backend: cd user-backend && npm run dev');
    console.log('2. Restart your frontend: cd frontend && npm start');
    console.log('3. Navigate to /Store and click any category');
    console.log('4. You should see stores! 🎊\n');

  } catch (error) {
    console.error('❌ Error adding stores:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Run the script
addNewStores()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
