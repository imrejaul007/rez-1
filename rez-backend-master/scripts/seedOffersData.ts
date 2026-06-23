import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Import models
import Offer from '../src/models/Offer';
import OfferCategory from '../src/models/OfferCategory';
import HeroBanner from '../src/models/HeroBanner';
import { Store } from '../src/models/Store';
import { User } from '../src/models/User';

dotenv.config();

// Sample data
const sampleStores = [
  {
    name: "TechMart Electronics",
    slug: "techmart-electronics",
    logo: "https://picsum.photos/200/200.jpg",
    rating: 4.5,
    verified: true,
    location: {
      address: "Connaught Place, New Delhi",
      city: "New Delhi",
      state: "Delhi",
      pincode: "110001",
      coordinates: [77.2090, 28.6139] // Delhi coordinates
    },
    contactInfo: {
      phone: "+91-11-2345-6789",
      email: "info@techmart.com"
    }
  },
  {
    name: "Fashion Hub",
    slug: "fashion-hub",
    logo: "https://picsum.photos/200/201.jpg",
    rating: 4.2,
    verified: true,
    location: {
      address: "Karol Bagh, New Delhi",
      city: "New Delhi",
      state: "Delhi",
      pincode: "110005",
      coordinates: [77.2295, 28.6129] // Delhi coordinates
    },
    contactInfo: {
      phone: "+91-11-2345-6790",
      email: "info@fashionhub.com"
    }
  },
  {
    name: "Foodie Paradise",
    slug: "foodie-paradise",
    logo: "https://picsum.photos/200/202.jpg",
    rating: 4.7,
    verified: true,
    location: {
      address: "CP Market, New Delhi",
      city: "New Delhi",
      state: "Delhi",
      pincode: "110001",
      coordinates: [77.2190, 28.6149] // Delhi coordinates
    },
    contactInfo: {
      phone: "+91-11-2345-6791",
      email: "info@foodieparadise.com"
    }
  },
  {
    name: "BookWorld",
    slug: "bookworld",
    logo: "https://picsum.photos/200/203.jpg",
    rating: 4.3,
    verified: true,
    location: {
      address: "Daryaganj, New Delhi",
      city: "New Delhi",
      state: "Delhi",
      pincode: "110002",
      coordinates: [77.1990, 28.6139] // Delhi coordinates
    },
    contactInfo: {
      phone: "+91-11-2345-6792",
      email: "info@bookworld.com"
    }
  },
  {
    name: "Sports Central",
    slug: "sports-central",
    logo: "https://picsum.photos/200/204.jpg",
    rating: 4.4,
    verified: true,
    location: {
      address: "Lajpat Nagar, New Delhi",
      city: "New Delhi",
      state: "Delhi",
      pincode: "110024",
      coordinates: [77.2090, 28.6039] // Delhi coordinates
    },
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
    icon: "smartphone",
    color: "#3B82F6",
    priority: 1,
    description: "Latest gadgets and electronics",
    tags: ["electronics", "gadgets", "tech"]
  },
  {
    name: "Fashion",
    slug: "fashion",
    icon: "shirt",
    color: "#EC4899",
    priority: 2,
    description: "Trendy clothing and accessories",
    tags: ["fashion", "clothing", "style"]
  },
  {
    name: "Food & Dining",
    slug: "food-dining",
    icon: "utensils",
    color: "#F59E0B",
    priority: 3,
    description: "Delicious food and dining experiences",
    tags: ["food", "dining", "restaurant"]
  },
  {
    name: "Books",
    slug: "books",
    icon: "book",
    color: "#8B5CF6",
    priority: 4,
    description: "Books and educational materials",
    tags: ["books", "education", "reading"]
  },
  {
    name: "Sports",
    slug: "sports",
    icon: "football",
    color: "#10B981",
    priority: 5,
    description: "Sports equipment and fitness",
    tags: ["sports", "fitness", "equipment"]
  }
];

const sampleOffers = [
  // Mega Offers
  {
    title: "Mega Electronics Sale",
    subtitle: "Up to 70% off on all electronics",
    description: "Get amazing discounts on smartphones, laptops, and gadgets. Limited time offer!",
    image: "https://picsum.photos/400/300.jpg",
    category: "mega" as const,
    type: "cashback" as const,
    cashbackPercentage: 25,
    originalPrice: 50000,
    discountedPrice: 37500,
    location: {
      type: "Point" as const,
      coordinates: [77.2090, 28.6139]
    },
    store: {
      name: "TechMart Electronics",
      logo: "https://picsum.photos/200/200.jpg",
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
    image: "https://picsum.photos/400/301.jpg",
    category: "student" as const,
    type: "discount" as const,
    cashbackPercentage: 50,
    originalPrice: 2000,
    discountedPrice: 1000,
    location: {
      type: "Point" as const,
      coordinates: [77.2295, 28.6129]
    },
    store: {
      name: "Fashion Hub",
      logo: "https://picsum.photos/200/201.jpg",
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
      userTypeRestriction: "student" as const,
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
    image: "https://picsum.photos/400/302.jpg",
    category: "new_arrival" as const,
    type: "combo" as const,
    cashbackPercentage: 30,
    originalPrice: 800,
    discountedPrice: 560,
    location: {
      type: "Point" as const,
      coordinates: [77.2190, 28.6149]
    },
    store: {
      name: "Foodie Paradise",
      logo: "https://picsum.photos/200/202.jpg",
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
    image: "https://picsum.photos/400/303.jpg",
    category: "trending" as const,
    type: "cashback" as const,
    cashbackPercentage: 20,
    originalPrice: 500,
    discountedPrice: 400,
    location: {
      type: "Point" as const,
      coordinates: [77.1990, 28.6139]
    },
    store: {
      name: "BookWorld",
      logo: "https://picsum.photos/200/203.jpg",
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
    image: "https://picsum.photos/400/304.jpg",
    category: "general" as const,
    type: "discount" as const,
    cashbackPercentage: 35,
    originalPrice: 3000,
    discountedPrice: 1950,
    location: {
      type: "Point" as const,
      coordinates: [77.2090, 28.6039]
    },
    store: {
      name: "Sports Central",
      logo: "https://picsum.photos/200/204.jpg",
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
    image: "https://picsum.photos/800/400.jpg",
    ctaText: "Explore Offers",
    ctaAction: "navigate",
    ctaUrl: "/offers",
    backgroundColor: "#3B82F6",
    validFrom: new Date(),
    validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
    validity: {
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
      isActive: true
    },
    metadata: {
      page: "offers" as const,
      position: "top" as const,
      priority: 1
    },
    targetAudience: {
      locations: ["Delhi", "Mumbai", "Bangalore"],
      categories: ["electronics", "fashion", "food"],
      userTypes: ["all" as const]
    }
  },
  {
    title: "Student Special",
    subtitle: "Exclusive deals for students",
    description: "Get special discounts and offers just for students. Show your student ID and save more!",
    image: "https://picsum.photos/800/401.jpg",
    ctaText: "View Student Offers",
    ctaAction: "navigate",
    ctaUrl: "/offers/students",
    backgroundColor: "#EC4899",
    validFrom: new Date(),
    validUntil: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 6 months from now
    validity: {
      startDate: new Date(),
      endDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 6 months from now
      isActive: true
    },
    metadata: {
      page: "offers" as const,
      position: "middle" as const,
      priority: 2
    },
    targetAudience: {
      locations: ["Delhi", "Mumbai", "Bangalore", "Chennai", "Kolkata"],
      categories: ["fashion", "books", "electronics"],
      userTypes: ["student" as const]
    }
  }
];

async function connectToDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/test');
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
  await User.deleteMany({});
  console.log('✅ Existing data cleared');
}

async function createAdminUser() {
  console.log('👤 Creating admin user...');
  const adminUser = new User({
    name: "Admin User",
    email: "admin@offers.com",
    phoneNumber: "+91-9999999999",
    role: "admin",
    isVerified: true,
    profile: {
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop",
      bio: "System administrator for offers management"
    }
  });
  
  await adminUser.save();
  console.log('✅ Admin user created');
  return adminUser;
}

async function seedStores(categories: any[]) {
  console.log('🏪 Seeding stores...');
  
  // Add category references to stores
  const storesWithCategories = sampleStores.map((store, index) => ({
    ...store,
    category: categories[index % categories.length]._id
  }));
  
  const stores = await Store.insertMany(storesWithCategories);
  console.log(`✅ Created ${stores.length} stores`);
  return stores;
}

async function seedCategories(adminUser: any) {
  console.log('📂 Seeding offer categories...');
  
  // Add createdBy field to categories
  const categoriesWithUser = sampleCategories.map(category => ({
    ...category,
    createdBy: adminUser._id
  }));
  
  const categories = await OfferCategory.insertMany(categoriesWithUser);
  console.log(`✅ Created ${categories.length} offer categories`);
  return categories;
}

async function seedOffers(stores: any[], adminUser: any) {
  console.log('🎁 Seeding offers...');
  
  // Update offers with store IDs and createdBy
  const offersWithStoreIds = sampleOffers.map((offer, index) => ({
    ...offer,
    createdBy: adminUser._id,
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

async function seedHeroBanners(adminUser: any) {
  console.log('🎯 Seeding hero banners...');
  
  // Add createdBy field to banners
  const bannersWithUser = sampleHeroBanners.map(banner => ({
    ...banner,
    createdBy: adminUser._id
  }));
  
  const banners = await HeroBanner.insertMany(bannersWithUser);
  console.log(`✅ Created ${banners.length} hero banners`);
  return banners;
}

async function seedData() {
  try {
    await connectToDatabase();
    await clearExistingData();
    
    const adminUser = await createAdminUser();
    const categories = await seedCategories(adminUser);
    const stores = await seedStores(categories);
    const offers = await seedOffers(stores, adminUser);
    const banners = await seedHeroBanners(adminUser);
    
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

export { seedData };
