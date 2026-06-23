const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Offer = require('../src/models/Offer').default;
const OfferCategory = require('../src/models/OfferCategory').default;
const HeroBanner = require('../src/models/HeroBanner').default;
const Store = require('../src/models/Store').default;
const User = require('../src/models/User').default;

// Sample data
const sampleStores = [
  {
    name: "TechMart Electronics",
    slug: "techmart-electronics",
    logo: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=200&h=200&fit=crop",
    rating: 4.5,
    verified: true,
    location: {
      type: "Point",
      coordinates: [77.2090, 28.6139] // Delhi coordinates
    },
    address: "Connaught Place, New Delhi",
    contactInfo: {
      phone: "+91-11-2345-6789",
      email: "info@techmart.com"
    }
  },
  {
    name: "Fashion Hub",
    slug: "fashion-hub",
    logo: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=200&h=200&fit=crop",
    rating: 4.2,
    verified: true,
    location: {
      type: "Point",
      coordinates: [77.2295, 28.6129] // Delhi coordinates
    },
    address: "Karol Bagh, New Delhi",
    contactInfo: {
      phone: "+91-11-2345-6790",
      email: "info@fashionhub.com"
    }
  },
  {
    name: "Foodie Paradise",
    slug: "foodie-paradise",
    logo: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200&h=200&fit=crop",
    rating: 4.7,
    verified: true,
    location: {
      type: "Point",
      coordinates: [77.2190, 28.6149] // Delhi coordinates
    },
    address: "CP Market, New Delhi",
    contactInfo: {
      phone: "+91-11-2345-6791",
      email: "info@foodieparadise.com"
    }
  },
  {
    name: "BookWorld",
    slug: "bookworld",
    logo: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=200&h=200&fit=crop",
    rating: 4.3,
    verified: true,
    location: {
      type: "Point",
      coordinates: [77.1990, 28.6139] // Delhi coordinates
    },
    address: "Daryaganj, New Delhi",
    contactInfo: {
      phone: "+91-11-2345-6792",
      email: "info@bookworld.com"
    }
  },
  {
    name: "Sports Central",
    slug: "sports-central",
    logo: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=200&h=200&fit=crop",
    rating: 4.4,
    verified: true,
    location: {
      type: "Point",
      coordinates: [77.2090, 28.6039] // Delhi coordinates
    },
    address: "Lajpat Nagar, New Delhi",
    contactInfo: {
      phone: "+91-11-2345-6793",
      email: "info@sportscentral.com"
    }
  }
];

const sampleCategories = [
  {
    name: "Electronics",
    slug: "electronics",
    icon: "📱",
    color: "#3B82F6",
    priority: 1,
    description: "Latest gadgets and electronics"
  },
  {
    name: "Fashion",
    slug: "fashion",
    icon: "👗",
    color: "#EC4899",
    priority: 2,
    description: "Trendy clothing and accessories"
  },
  {
    name: "Food & Dining",
    slug: "food-dining",
    icon: "🍕",
    color: "#F59E0B",
    priority: 3,
    description: "Delicious food and dining experiences"
  },
  {
    name: "Books",
    slug: "books",
    icon: "📚",
    color: "#8B5CF6",
    priority: 4,
    description: "Books and educational materials"
  },
  {
    name: "Sports",
    slug: "sports",
    icon: "⚽",
    color: "#10B981",
    priority: 5,
    description: "Sports equipment and fitness"
  }
];

const sampleOffers = [
  // Mega Offers
  {
    title: "Mega Electronics Sale",
    subtitle: "Up to 70% off on all electronics",
    description: "Get amazing discounts on smartphones, laptops, and gadgets. Limited time offer!",
    image: "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400&h=300&fit=crop",
    category: "mega",
    type: "cashback",
    cashbackPercentage: 25,
    originalPrice: 50000,
    discountedPrice: 37500,
    location: {
      type: "Point",
      coordinates: [77.2090, 28.6139]
    },
    store: {
      name: "TechMart Electronics",
      logo: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=200&h=200&fit=crop",
      rating: 4.5,
      verified: true
    },
    validity: {
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      isActive: true
    },
    engagement: {
      likesCount: 156,
      sharesCount: 23,
      viewsCount: 1205
    },
    restrictions: {
      minOrderValue: 1000,
      maxDiscountAmount: 5000,
      applicableOn: ["online", "offline"],
      usageLimitPerUser: 2,
      usageLimit: 1000
    },
    metadata: {
      isNew: false,
      isTrending: true,
      isBestSeller: false,
      isSpecial: true,
      featured: true,
      priority: 1
    }
  },
  {
    title: "Student Special - Fashion",
    subtitle: "50% off for students",
    description: "Exclusive fashion deals for students. Show your student ID and save big!",
    image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=300&fit=crop",
    category: "student",
    type: "discount",
    cashbackPercentage: 50,
    originalPrice: 2000,
    discountedPrice: 1000,
    location: {
      type: "Point",
      coordinates: [77.2295, 28.6129]
    },
    store: {
      name: "Fashion Hub",
      logo: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=200&h=200&fit=crop",
      rating: 4.2,
      verified: true
    },
    validity: {
      startDate: new Date(),
      endDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
      isActive: true
    },
    engagement: {
      likesCount: 89,
      sharesCount: 15,
      viewsCount: 456
    },
    restrictions: {
      minOrderValue: 500,
      maxDiscountAmount: 2000,
      applicableOn: ["offline"],
      userTypeRestriction: "student",
      usageLimitPerUser: 1,
      usageLimit: 500
    },
    metadata: {
      isNew: true,
      isTrending: false,
      isBestSeller: false,
      isSpecial: true,
      featured: false,
      priority: 2
    }
  },
  {
    title: "New Arrival - Food Combo",
    subtitle: "Try our new menu items",
    description: "Experience our latest culinary creations with this special combo offer.",
    image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=300&fit=crop",
    category: "new_arrival",
    type: "combo",
    cashbackPercentage: 30,
    originalPrice: 800,
    discountedPrice: 560,
    location: {
      type: "Point",
      coordinates: [77.2190, 28.6149]
    },
    store: {
      name: "Foodie Paradise",
      logo: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200&h=200&fit=crop",
      rating: 4.7,
      verified: true
    },
    validity: {
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      isActive: true
    },
    engagement: {
      likesCount: 67,
      sharesCount: 12,
      viewsCount: 234
    },
    restrictions: {
      minOrderValue: 300,
      maxDiscountAmount: 500,
      applicableOn: ["online", "offline"],
      usageLimitPerUser: 3,
      usageLimit: 200
    },
    metadata: {
      isNew: true,
      isTrending: false,
      isBestSeller: false,
      isSpecial: false,
      featured: false,
      priority: 3
    }
  },
  {
    title: "Trending Book Collection",
    subtitle: "Bestsellers at discounted prices",
    description: "Get the latest bestsellers and trending books at amazing prices.",
    image: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=300&fit=crop",
    category: "trending",
    type: "cashback",
    cashbackPercentage: 20,
    originalPrice: 500,
    discountedPrice: 400,
    location: {
      type: "Point",
      coordinates: [77.1990, 28.6139]
    },
    store: {
      name: "BookWorld",
      logo: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=200&h=200&fit=crop",
      rating: 4.3,
      verified: true
    },
    validity: {
      startDate: new Date(),
      endDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000), // 20 days from now
      isActive: true
    },
    engagement: {
      likesCount: 134,
      sharesCount: 28,
      viewsCount: 678
    },
    restrictions: {
      minOrderValue: 200,
      maxDiscountAmount: 300,
      applicableOn: ["online", "offline"],
      usageLimitPerUser: 5,
      usageLimit: 300
    },
    metadata: {
      isNew: false,
      isTrending: true,
      isBestSeller: true,
      isSpecial: false,
      featured: true,
      priority: 4
    }
  },
  {
    title: "Sports Equipment Sale",
    subtitle: "Get fit with our sports gear",
    description: "Everything you need for your fitness journey at unbeatable prices.",
    image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop",
    category: "general",
    type: "discount",
    cashbackPercentage: 35,
    originalPrice: 3000,
    discountedPrice: 1950,
    location: {
      type: "Point",
      coordinates: [77.2090, 28.6039]
    },
    store: {
      name: "Sports Central",
      logo: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=200&h=200&fit=crop",
      rating: 4.4,
      verified: true
    },
    validity: {
      startDate: new Date(),
      endDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000), // 25 days from now
      isActive: true
    },
    engagement: {
      likesCount: 98,
      sharesCount: 19,
      viewsCount: 345
    },
    restrictions: {
      minOrderValue: 800,
      maxDiscountAmount: 1500,
      applicableOn: ["online", "offline"],
      usageLimitPerUser: 2,
      usageLimit: 150
    },
    metadata: {
      isNew: false,
      isTrending: true,
      isBestSeller: false,
      isSpecial: true,
      featured: false,
      priority: 5
    }
  }
];

const sampleHeroBanners = [
  {
    title: "Welcome to Offers",
    subtitle: "Discover amazing deals and save big!",
    description: "Find the best offers from your favorite stores and brands. Limited time deals waiting for you!",
    image: "https://images.unsplash.com/photo-1607082349566-187342175e2f?w=800&h=400&fit=crop",
    ctaText: "Explore Offers",
    ctaAction: {
      type: "navigate",
      target: "/offers"
    },
    backgroundColor: "#3B82F6",
    validity: {
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
      isActive: true
    },
    metadata: {
      page: "offers",
      position: "top",
      priority: 1
    },
    targetAudience: {
      locations: ["Delhi", "Mumbai", "Bangalore"],
      categories: ["electronics", "fashion", "food"],
      userTypes: ["all"]
    }
  },
  {
    title: "Student Special",
    subtitle: "Exclusive deals for students",
    description: "Get special discounts and offers just for students. Show your student ID and save more!",
    image: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&h=400&fit=crop",
    ctaText: "View Student Offers",
    ctaAction: {
      type: "navigate",
      target: "/offers/students"
    },
    backgroundColor: "#EC4899",
    validity: {
      startDate: new Date(),
      endDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 6 months from now
      isActive: true
    },
    metadata: {
      page: "offers",
      position: "middle",
      priority: 2
    },
    targetAudience: {
      locations: ["Delhi", "Mumbai", "Bangalore", "Chennai", "Kolkata"],
      categories: ["fashion", "books", "electronics"],
      userTypes: ["student"]
    }
  }
];

async function connectToDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/test', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

async function clearExistingData() {
  console.log('🧹 Clearing existing data...');
  await Offer.deleteMany({});
  await OfferCategory.deleteMany({});
  await HeroBanner.deleteMany({});
  await Store.deleteMany({});
  console.log('✅ Existing data cleared');
}

async function seedStores() {
  console.log('🏪 Seeding stores...');
  const stores = await Store.insertMany(sampleStores);
  console.log(`✅ Created ${stores.length} stores`);
  return stores;
}

async function seedCategories() {
  console.log('📂 Seeding offer categories...');
  const categories = await OfferCategory.insertMany(sampleCategories);
  console.log(`✅ Created ${categories.length} offer categories`);
  return categories;
}

async function seedOffers(stores) {
  console.log('🎁 Seeding offers...');
  
  // Update offers with store IDs
  const offersWithStoreIds = sampleOffers.map((offer, index) => ({
    ...offer,
    store: {
      id: stores[index % stores.length]._id,
      name: offer.store.name,
      logo: offer.store.logo,
      rating: offer.store.rating,
      verified: offer.store.verified
    }
  }));
  
  const offers = await Offer.insertMany(offersWithStoreIds);
  console.log(`✅ Created ${offers.length} offers`);
  return offers;
}

async function seedHeroBanners() {
  console.log('🎯 Seeding hero banners...');
  const banners = await HeroBanner.insertMany(sampleHeroBanners);
  console.log(`✅ Created ${banners.length} hero banners`);
  return banners;
}

async function seedData() {
  try {
    await connectToDatabase();
    await clearExistingData();
    
    const stores = await seedStores();
    const categories = await seedCategories();
    const offers = await seedOffers(stores);
    const banners = await seedHeroBanners();
    
    console.log('\n🎉 Database seeding completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - Stores: ${stores.length}`);
    console.log(`   - Categories: ${categories.length}`);
    console.log(`   - Offers: ${offers.length}`);
    console.log(`   - Hero Banners: ${banners.length}`);
    
    console.log('\n🔗 Sample data includes:');
    console.log('   - Mega offers with high cashback');
    console.log('   - Student-specific offers');
    console.log('   - New arrival offers');
    console.log('   - Trending offers');
    console.log('   - Hero banners for offers page');
    console.log('   - Interconnected store and category data');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the seeding
if (require.main === module) {
  seedData();
}

module.exports = { seedData };
