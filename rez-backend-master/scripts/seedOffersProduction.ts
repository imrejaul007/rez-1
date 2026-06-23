import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Import models
import Offer from '../src/models/Offer';
import OfferCategory from '../src/models/OfferCategory';
import HeroBanner from '../src/models/HeroBanner';
import { Store } from '../src/models/Store';
import { User } from '../src/models/User';
import { Category } from '../src/models/Category';

dotenv.config();

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };
const DB_NAME = process.env.DB_NAME || 'test';

// Delhi coordinates for offers
const DELHI_COORDS = [77.2090, 28.6139];
const LOCATIONS = [
  { name: 'Connaught Place', coords: [77.2090, 28.6139] },
  { name: 'Karol Bagh', coords: [77.2295, 28.6129] },
  { name: 'Lajpat Nagar', coords: [77.2090, 28.6039] },
  { name: 'Nehru Place', coords: [77.2505, 28.5494] },
  { name: 'Saket', coords: [77.2145, 28.5245] },
  { name: 'Rohini', coords: [77.1025, 28.7495] },
  { name: 'Dwarka', coords: [77.0469, 28.5921] },
  { name: 'Noida', coords: [77.3910, 28.5355] },
  { name: 'Gurgaon', coords: [77.0266, 28.4595] },
  { name: 'Faridabad', coords: [77.3178, 28.4089] }
];

async function connectToDatabase() {
  try {
    await mongoose.connect(MONGODB_URI, {
      dbName: DB_NAME
    });
    console.log('✅ Connected to MongoDB');
    console.log(`   Database: ${DB_NAME}`);
    console.log(`   Host: ${MONGODB_URI.includes('localhost') ? 'localhost' : 'MongoDB Atlas'}`);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

async function getOrCreateAdminUser() {
  console.log('\n👤 Getting or creating admin user...');
  
  let adminUser = await User.findOne({ email: 'admin@offers.com' });
  
  if (!adminUser) {
    adminUser = new User({
      name: 'Admin User',
      email: 'admin@offers.com',
      phoneNumber: '+91-9999999999',
      role: 'admin',
      isVerified: true,
      profile: {
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop',
        bio: 'System administrator for offers management'
      }
    });
    
    await adminUser.save();
    console.log('   ✅ Created admin user');
  } else {
    console.log('   ✅ Found existing admin user');
  }
  
  return adminUser;
}

async function getOrCreateStores() {
  console.log('\n🏪 Getting or creating stores...');
  
  let stores = await Store.find().limit(20);
  
  if (stores.length < 5) {
    console.log('   ⚠️  Not enough stores found, creating sample stores...');
    
    const sampleStores = [
      {
        name: 'TechMart Electronics',
        slug: 'techmart-electronics',
        description: 'Latest electronics and gadgets',
        logo: 'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=200',
        rating: 4.5,
        verified: true,
        location: {
          address: 'Connaught Place, New Delhi',
          city: 'New Delhi',
          state: 'Delhi',
          pincode: '110001',
          coordinates: LOCATIONS[0].coords
        },
        contactInfo: {
          phone: '+91-11-2345-6789',
          email: 'info@techmart.com'
        },
        isActive: true
      },
      {
        name: 'Fashion Hub',
        slug: 'fashion-hub',
        description: 'Trendy fashion and accessories',
        logo: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=200',
        rating: 4.3,
        verified: true,
        location: {
          address: 'Karol Bagh, New Delhi',
          city: 'New Delhi',
          state: 'Delhi',
          pincode: '110005',
          coordinates: LOCATIONS[1].coords
        },
        contactInfo: {
          phone: '+91-11-2345-6790',
          email: 'info@fashionhub.com'
        },
        isActive: true
      },
      {
        name: 'Foodie Paradise',
        slug: 'foodie-paradise',
        description: 'Delicious food and dining',
        logo: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200',
        rating: 4.7,
        verified: true,
        location: {
          address: 'Lajpat Nagar, New Delhi',
          city: 'New Delhi',
          state: 'Delhi',
          pincode: '110024',
          coordinates: LOCATIONS[2].coords
        },
        contactInfo: {
          phone: '+91-11-2345-6791',
          email: 'info@foodieparadise.com'
        },
        isActive: true
      },
      {
        name: 'BookWorld',
        slug: 'bookworld',
        description: 'Books and educational materials',
        logo: 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=200',
        rating: 4.4,
        verified: true,
        location: {
          address: 'Nehru Place, New Delhi',
          city: 'New Delhi',
          state: 'Delhi',
          pincode: '110019',
          coordinates: LOCATIONS[3].coords
        },
        contactInfo: {
          phone: '+91-11-2345-6792',
          email: 'info@bookworld.com'
        },
        isActive: true
      },
      {
        name: 'Sports Central',
        slug: 'sports-central',
        description: 'Sports equipment and fitness gear',
        logo: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=200',
        rating: 4.6,
        verified: true,
        location: {
          address: 'Saket, New Delhi',
          city: 'New Delhi',
          state: 'Delhi',
          pincode: '110017',
          coordinates: LOCATIONS[4].coords
        },
        contactInfo: {
          phone: '+91-11-2345-6793',
          email: 'info@sportscentral.com'
        },
        isActive: true
      }
    ];
    
    stores = await Store.insertMany(sampleStores);
    console.log(`   ✅ Created ${stores.length} stores`);
  } else {
    console.log(`   ✅ Found ${stores.length} existing stores`);
  }
  
  return stores;
}

async function seedOfferCategories(adminUser: any) {
  console.log('\n📂 Seeding offer categories...');
  
  await OfferCategory.deleteMany({});
  
  const categories = [
    {
      name: 'Mega Offers',
      slug: 'mega-offers',
      description: 'Biggest deals and discounts',
      icon: 'gift',
      color: '#8B5CF6',
      backgroundColor: '#F3E8FF',
      isActive: true,
      priority: 1,
      metadata: {
        displayOrder: 1,
        isFeatured: true,
        tags: ['mega', 'deals', 'discounts']
      },
      createdBy: adminUser._id
    },
    {
      name: 'Student Offers',
      slug: 'student-offers',
      description: 'Special discounts for students',
      icon: 'graduation-cap',
      color: '#EC4899',
      backgroundColor: '#FCE7F3',
      isActive: true,
      priority: 2,
      metadata: {
        displayOrder: 2,
        isFeatured: true,
        tags: ['student', 'education', 'discount']
      },
      createdBy: adminUser._id
    },
    {
      name: 'Electronics',
      slug: 'electronics',
      description: 'Latest gadgets and electronics',
      icon: 'laptop',
      color: '#3B82F6',
      backgroundColor: '#DBEAFE',
      isActive: true,
      priority: 3,
      metadata: {
        displayOrder: 3,
        isFeatured: true,
        tags: ['electronics', 'gadgets', 'tech']
      },
      createdBy: adminUser._id
    },
    {
      name: 'Fashion',
      slug: 'fashion',
      description: 'Trendy clothing and accessories',
      icon: 'shirt',
      color: '#F59E0B',
      backgroundColor: '#FEF3C7',
      isActive: true,
      priority: 4,
      metadata: {
        displayOrder: 4,
        isFeatured: true,
        tags: ['fashion', 'clothing', 'style']
      },
      createdBy: adminUser._id
    },
    {
      name: 'Food & Dining',
      slug: 'food-dining',
      description: 'Delicious food and dining experiences',
      icon: 'utensils',
      color: '#10B981',
      backgroundColor: '#D1FAE5',
      isActive: true,
      priority: 5,
      metadata: {
        displayOrder: 5,
        isFeatured: true,
        tags: ['food', 'dining', 'restaurant']
      },
      createdBy: adminUser._id
    },
    {
      name: 'General',
      slug: 'general',
      description: 'Miscellaneous offers',
      icon: 'star',
      color: '#6366F1',
      backgroundColor: '#E0E7FF',
      isActive: true,
      priority: 6,
      metadata: {
        displayOrder: 6,
        isFeatured: false,
        tags: ['general', 'misc', 'all']
      },
      createdBy: adminUser._id
    }
  ];
  
  const createdCategories = await OfferCategory.insertMany(categories);
  console.log(`   ✅ Created ${createdCategories.length} offer categories`);
  
  return createdCategories;
}

async function seedOffers(stores: any[], adminUser: any) {
  console.log('\n🎁 Seeding offers...');
  
  await Offer.deleteMany({});
  
  const now = new Date();
  const oneMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const twoWeeks = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const oneWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  
  const offers = [
    // Mega Offers
    {
      title: '🔥 Mega Electronics Sale',
      subtitle: 'Up to 70% off on all electronics',
      description: 'Get amazing discounts on smartphones, laptops, and gadgets. Limited time offer! Don\'t miss out on these incredible deals.',
      image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=800',
      category: 'mega',
      type: 'cashback',
      cashbackPercentage: 25,
      originalPrice: 50000,
      discountedPrice: 37500,
      location: {
        type: 'Point',
        coordinates: LOCATIONS[0].coords
      },
      store: {
        id: stores[0]._id,
        name: stores[0].name,
        logo: stores[0].logo,
        rating: stores[0].rating,
        verified: stores[0].verified
      },
      validity: {
        startDate: now,
        endDate: oneMonth,
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
        applicableOn: ['online', 'offline'],
        userTypeRestriction: 'all',
        usageLimitPerUser: 2,
        usageLimit: 1000
      },
      metadata: {
        isNew: false,
        isTrending: true,
        isBestSeller: false,
        isSpecial: true,
        featured: true,
        priority: 1,
        tags: ['mega', 'electronics', 'sale']
      },
      createdBy: adminUser._id
    },
    {
      title: '💰 Flat 50% Cashback',
      subtitle: 'Maximum cashback ₹500',
      description: 'Get flat 50% cashback on your purchase. Pay with any wallet and get instant cashback.',
      image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800',
      category: 'mega',
      type: 'cashback',
      cashbackPercentage: 50,
      originalPrice: 1999,
      discountedPrice: 999,
      location: {
        type: 'Point',
        coordinates: LOCATIONS[1].coords
      },
      store: {
        id: stores[1]._id,
        name: stores[1].name,
        logo: stores[1].logo,
        rating: stores[1].rating,
        verified: stores[1].verified
      },
      validity: {
        startDate: now,
        endDate: twoWeeks,
        isActive: true
      },
      engagement: {
        likesCount: 234,
        sharesCount: 45,
        viewsCount: 2134
      },
      restrictions: {
        minOrderValue: 500,
        maxDiscountAmount: 500,
        applicableOn: ['online'],
        userTypeRestriction: 'all',
        usageLimitPerUser: 1,
        usageLimit: 500
      },
      metadata: {
        isNew: true,
        isTrending: true,
        isBestSeller: true,
        isSpecial: true,
        featured: true,
        priority: 2,
        tags: ['mega', 'cashback', 'flat']
      },
      createdBy: adminUser._id
    },
    
    // Student Offers
    {
      title: '🎓 Student Special - 50% OFF',
      subtitle: 'Exclusive for students',
      description: 'Show your student ID and get 50% off on fashion items. Valid at all outlets.',
      image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800',
      category: 'student',
      type: 'discount',
      cashbackPercentage: 50,
      originalPrice: 2000,
      discountedPrice: 1000,
      location: {
        type: 'Point',
        coordinates: LOCATIONS[2].coords
      },
      store: {
        id: stores[1]._id,
        name: stores[1].name,
        logo: stores[1].logo,
        rating: stores[1].rating,
        verified: stores[1].verified
      },
      validity: {
        startDate: now,
        endDate: oneMonth,
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
        applicableOn: ['offline'],
        userTypeRestriction: 'student',
        usageLimitPerUser: 1,
        usageLimit: 500
      },
      metadata: {
        isNew: true,
        isTrending: false,
        isBestSeller: false,
        isSpecial: true,
        featured: false,
        priority: 3,
        tags: ['student', 'fashion', 'discount']
      },
      createdBy: adminUser._id
    },
    {
      title: '📚 Books - Student Discount',
      subtitle: '40% off on all books',
      description: 'Special discount for students on educational books and materials.',
      image: 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=800',
      category: 'student',
      type: 'discount',
      cashbackPercentage: 40,
      originalPrice: 500,
      discountedPrice: 300,
      location: {
        type: 'Point',
        coordinates: LOCATIONS[3].coords
      },
      store: {
        id: stores[3]._id,
        name: stores[3].name,
        logo: stores[3].logo,
        rating: stores[3].rating,
        verified: stores[3].verified
      },
      validity: {
        startDate: now,
        endDate: oneMonth,
        isActive: true
      },
      engagement: {
        likesCount: 67,
        sharesCount: 12,
        viewsCount: 345
      },
      restrictions: {
        minOrderValue: 200,
        maxDiscountAmount: 500,
        applicableOn: ['online', 'offline'],
        userTypeRestriction: 'student',
        usageLimitPerUser: 3,
        usageLimit: 300
      },
      metadata: {
        isNew: true,
        isTrending: false,
        isBestSeller: false,
        isSpecial: true,
        featured: false,
        priority: 4,
        tags: ['student', 'books', 'education']
      },
      createdBy: adminUser._id
    },
    
    // New Arrivals
    {
      title: '🆕 New Arrival - Food Combo',
      subtitle: 'Try our new menu items',
      description: 'Experience our latest culinary creations with this special combo offer.',
      image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800',
      category: 'new_arrival',
      type: 'combo',
      cashbackPercentage: 30,
      originalPrice: 800,
      discountedPrice: 560,
      location: {
        type: 'Point',
        coordinates: LOCATIONS[2].coords
      },
      store: {
        id: stores[2]._id,
        name: stores[2].name,
        logo: stores[2].logo,
        rating: stores[2].rating,
        verified: stores[2].verified
      },
      validity: {
        startDate: now,
        endDate: oneWeek,
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
        applicableOn: ['online', 'offline'],
        userTypeRestriction: 'all',
        usageLimitPerUser: 3,
        usageLimit: 200
      },
      metadata: {
        isNew: true,
        isTrending: false,
        isBestSeller: false,
        isSpecial: false,
        featured: false,
        priority: 5,
        tags: ['new', 'food', 'combo']
      },
      createdBy: adminUser._id
    },
    
    // Trending Offers
    {
      title: '📈 Trending - Fitness Gear',
      subtitle: 'Get fit with our sports equipment',
      description: 'Everything you need for your fitness journey at unbeatable prices.',
      image: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800',
      category: 'trending',
      type: 'discount',
      cashbackPercentage: 35,
      originalPrice: 3000,
      discountedPrice: 1950,
      location: {
        type: 'Point',
        coordinates: LOCATIONS[4].coords
      },
      store: {
        id: stores[4]._id,
        name: stores[4].name,
        logo: stores[4].logo,
        rating: stores[4].rating,
        verified: stores[4].verified
      },
      validity: {
        startDate: now,
        endDate: twoWeeks,
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
        applicableOn: ['online', 'offline'],
        userTypeRestriction: 'all',
        usageLimitPerUser: 2,
        usageLimit: 150
      },
      metadata: {
        isNew: false,
        isTrending: true,
        isBestSeller: false,
        isSpecial: true,
        featured: false,
        priority: 6,
        tags: ['trending', 'fitness', 'sports']
      },
      createdBy: adminUser._id
    }
  ];
  
  // Add more offers for variety
  for (let i = 0; i < 10; i++) {
    const store = stores[i % stores.length];
    const location = LOCATIONS[i % LOCATIONS.length];
    const categories = ['mega', 'trending', 'new_arrival', 'food', 'fashion', 'electronics', 'general'];
    const category = categories[i % categories.length];
    
    offers.push({
      title: `${category.toUpperCase()} Deal ${i + 1}`,
      subtitle: `Special offer ${i + 1}`,
      description: `Amazing deal on various products. Limited time offer. Get up to ${20 + i * 5}% off.`,
      image: `https://images.unsplash.com/photo-${1580000000000 + i * 1000000}?w=800`,
      category: category as any,
      type: ['cashback', 'discount', 'voucher', 'combo'][i % 4] as any,
      cashbackPercentage: 20 + i * 5,
      originalPrice: 1000 + i * 500,
      discountedPrice: 800 + i * 400,
      location: {
        type: 'Point',
        coordinates: location.coords
      },
      store: {
        id: store._id,
        name: store.name,
        logo: store.logo,
        rating: store.rating,
        verified: store.verified
      },
      validity: {
        startDate: now,
        endDate: new Date(now.getTime() + (7 + i) * 24 * 60 * 60 * 1000),
        isActive: true
      },
      engagement: {
        likesCount: 20 + i * 10,
        sharesCount: 5 + i * 2,
        viewsCount: 100 + i * 50
      },
      restrictions: {
        minOrderValue: 200 + i * 100,
        maxDiscountAmount: 500 + i * 100,
        applicableOn: ['online', 'offline'],
        userTypeRestriction: 'all',
        usageLimitPerUser: 1 + (i % 3),
        usageLimit: 100 + i * 50
      },
      metadata: {
        isNew: i % 3 === 0,
        isTrending: i % 2 === 0,
        isBestSeller: i % 4 === 0,
        isSpecial: i % 5 === 0,
        featured: i % 6 === 0,
        priority: 10 + i,
        tags: [category, 'deal', 'offer']
      },
      createdBy: adminUser._id
    });
  }
  
  const createdOffers = await Offer.insertMany(offers);
  console.log(`   ✅ Created ${createdOffers.length} offers`);
  
  return createdOffers;
}

async function seedHeroBanners(adminUser: any) {
  console.log('\n🎯 Seeding hero banners...');
  
  await HeroBanner.deleteMany({});
  
  const now = new Date();
  const oneYear = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
  
  const banners = [
    {
      title: 'Welcome to Mega Offers',
      subtitle: 'Discover amazing deals and save big!',
      description: 'Find the best offers from your favorite stores and brands. Limited time deals waiting for you!',
      image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200',
      ctaText: 'Explore Offers',
      ctaAction: 'navigate',
      ctaUrl: '/offers',
      backgroundColor: '#8B5CF6',
      textColor: '#FFFFFF',
      isActive: true,
      priority: 1,
      validFrom: now,
      validUntil: oneYear,
      targetAudience: {
        userTypes: ['all'],
        locations: ['Delhi', 'Mumbai', 'Bangalore'],
        categories: ['electronics', 'fashion', 'food']
      },
      analytics: {
        views: 0,
        clicks: 0,
        conversions: 0
      },
      metadata: {
        page: 'offers',
        position: 'top',
        size: 'full',
        tags: ['mega', 'offers', 'welcome']
      },
      createdBy: adminUser._id
    },
    {
      title: 'Student Special Deals',
      subtitle: 'Exclusive discounts for students',
      description: 'Get special discounts and offers just for students. Show your student ID and save more!',
      image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1200',
      ctaText: 'View Student Offers',
      ctaAction: 'navigate',
      ctaUrl: '/offers/students',
      backgroundColor: '#EC4899',
      textColor: '#FFFFFF',
      isActive: true,
      priority: 2,
      validFrom: now,
      validUntil: new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000),
      targetAudience: {
        userTypes: ['student'],
        locations: ['Delhi', 'Mumbai', 'Bangalore', 'Chennai', 'Kolkata'],
        categories: ['fashion', 'books', 'electronics']
      },
      analytics: {
        views: 0,
        clicks: 0,
        conversions: 0
      },
      metadata: {
        page: 'offers',
        position: 'middle',
        size: 'large',
        tags: ['student', 'discount', 'education']
      },
      createdBy: adminUser._id
    }
  ];
  
  const createdBanners = await HeroBanner.insertMany(banners);
  console.log(`   ✅ Created ${createdBanners.length} hero banners`);
  
  return createdBanners;
}

async function verifySeededData() {
  console.log('\n🔍 Verifying seeded data...');
  
  const offerCount = await Offer.countDocuments();
  const categoryCount = await OfferCategory.countDocuments();
  const bannerCount = await HeroBanner.countDocuments();
  const storeCount = await Store.countDocuments();
  
  console.log('   📊 Summary:');
  console.log(`      - Offers: ${offerCount}`);
  console.log(`      - Categories: ${categoryCount}`);
  console.log(`      - Hero Banners: ${bannerCount}`);
  console.log(`      - Stores: ${storeCount}`);
  
  // Test geospatial query
  console.log('\n   🌍 Testing location-based query...');
  const nearbyOffers = await Offer.find({
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: DELHI_COORDS
        },
        $maxDistance: 10000 // 10km
      }
    }
  }).limit(5);
  
  console.log(`      ✅ Found ${nearbyOffers.length} nearby offers`);
  
  // Test category filtering
  console.log('\n   🏷️  Testing category filtering...');
  const megaOffers = await Offer.countDocuments({ category: 'mega' });
  const studentOffers = await Offer.countDocuments({ category: 'student' });
  const trendingOffers = await Offer.countDocuments({ category: 'trending' });
  
  console.log(`      - Mega: ${megaOffers}`);
  console.log(`      - Student: ${studentOffers}`);
  console.log(`      - Trending: ${trendingOffers}`);
  
  return {
    offers: offerCount,
    categories: categoryCount,
    banners: bannerCount,
    stores: storeCount
  };
}

async function main() {
  try {
    console.log('🌱 Starting Offers Production Seeding...\n');
    console.log('========================================\n');
    
    await connectToDatabase();
    
    const adminUser = await getOrCreateAdminUser();
    const stores = await getOrCreateStores();
    const categories = await seedOfferCategories(adminUser);
    const offers = await seedOffers(stores, adminUser);
    const banners = await seedHeroBanners(adminUser);
    
    const stats = await verifySeededData();
    
    console.log('\n========================================');
    console.log('✨ Seeding completed successfully!\n');
    console.log('📊 Final Summary:');
    console.log(`   ✅ Offers: ${stats.offers}`);
    console.log(`   ✅ Categories: ${stats.categories}`);
    console.log(`   ✅ Hero Banners: ${stats.banners}`);
    console.log(`   ✅ Stores: ${stats.stores}`);
    console.log('\n🎉 Database is ready for production!');
    console.log('========================================\n');
    
    console.log('📝 Next Steps:');
    console.log('   1. Start backend: npm run dev');
    console.log('   2. Test API: curl http://localhost:5001/api/offers/page-data');
    console.log('   3. Start frontend: npm start');
    console.log('   4. Navigate to /offers page\n');
    
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the seeder
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { main as seedOffersProduction };

