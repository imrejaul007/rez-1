/**
 * Script to update store details to match the 11 category structure
 *
 * This script updates store names, descriptions, tags, logos, banners
 * to be relevant to each of the 11 main categories
 *
 * Run: npx ts-node src/scripts/updateStoreDetails.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI as string;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); }
;
const DB_NAME = process.env.DB_NAME || 'test';

// Store templates for each category
interface StoreTemplate {
  names: string[];
  descriptions: string[];
  tags: string[];
  logo: string;
}

const STORE_TEMPLATES: Record<string, StoreTemplate> = {
  'food-dining': {
    names: [
      'Spice Garden Restaurant', 'The Food Factory', 'Taste of India', 'Royal Kitchen',
      'Cafe Mocha', 'Pizza Paradise', 'Burger Barn', 'Biryani House',
      'Chinese Dragon', 'Pasta Palace', 'Sushi Station', 'Tandoori Nights',
      'The Breakfast Club', 'Dessert Dreams', 'Ice Cream Corner', 'Bakery Bliss',
      'Street Bites', 'Cloud Kitchen Express', 'Family Feast', 'Fine Dine Hub',
      'Grill Masters', 'Wrap & Roll', 'Noodle Bar', 'Curry House',
      'Sweet Tooth Cafe', 'The Coffee Bean', 'Juice Junction', 'Smoothie King',
      'Dosa Darbar', 'Chaat Corner', 'Kebab Kingdom', 'Wok This Way',
      'The Hungry Soul', 'Foodie Paradise', 'Appetite Express', 'Flavors of Home',
      'Urban Bites', 'The Food Court', 'Tasty Treats', 'Delicious Delights',
      'Masala Magic', 'Spicy Affairs'
    ],
    descriptions: [
      'Delicious food served fresh daily with love and care',
      'Experience authentic flavors from around the world',
      'Your favorite meals delivered hot and fresh',
      'Fine dining experience at affordable prices',
      'Best place for family gatherings and celebrations',
      'Quick bites and comfort food for every mood',
      'Fresh ingredients, amazing taste, happy customers',
      'Where every meal becomes a memorable experience'
    ],
    tags: ['food', 'restaurant', 'dining', 'delivery', 'dine-in', 'takeaway', 'cuisine', 'meals'],
    logo: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=200&h=200&fit=crop'
  },

  'grocery-essentials': {
    names: [
      'Fresh Mart', 'Daily Needs Store', 'Grocery Plus', 'Super Bazaar',
      'Kirana King', 'Veggie Fresh', 'Fruit Basket', 'Meat & More',
      'Dairy Delight', 'Provision Palace', 'Quick Mart', 'Value Grocery',
      'Organic Corner', 'Farm Fresh Store', 'Daily Essentials', 'Home Needs',
      'Smart Shopper', 'Budget Mart', 'Family Store', 'Neighborhood Kirana',
      'Fresh Pick', 'Green Grocer', 'The Pantry', 'Staples Store',
      'Quick Stop Grocery', 'Mini Mart', 'Everyday Essentials', 'Fresh & Save',
      'Local Mart', 'Sabzi Mandi', 'Ration Store', 'General Store'
    ],
    descriptions: [
      'Your one-stop shop for all daily essentials',
      'Fresh groceries delivered to your doorstep',
      'Quality products at unbeatable prices',
      'Freshness guaranteed on all produce',
      'Wide variety of groceries and household items',
      'Supporting local farmers with fresh produce',
      'Everything you need under one roof',
      'Daily essentials for your home'
    ],
    tags: ['grocery', 'essentials', 'vegetables', 'fruits', 'daily-needs', 'fresh', 'organic', 'provisions'],
    logo: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&h=200&fit=crop'
  },

  'beauty-wellness': {
    names: [
      'Glow Beauty Salon', 'Style Studio', 'The Spa Retreat', 'Wellness Center',
      'Hair Affair', 'Nail Art Studio', 'Skin Care Clinic', 'Beauty Bliss',
      'Glamour Zone', 'The Makeover Room', 'Serene Spa', 'Body & Soul',
      'Perfect Look Salon', 'Beauty Queen', 'Relax & Rejuvenate', 'The Grooming Lounge',
      'Radiant Skin Studio', 'Hair Masters', 'Beauty Box', 'Zen Wellness',
      'The Beauty Spot', 'Pampering Paradise', 'Luxe Salon', 'Fresh Face Studio',
      'Trim & Style', 'Beauty Barn', 'Gents Grooming', 'Ladies Corner',
      'The Facial Bar', 'Wellness Hub', 'Beauty & Beyond', 'Style Statement'
    ],
    descriptions: [
      'Transform your look with our expert stylists',
      'Relax, rejuvenate, and feel beautiful',
      'Premium beauty services at affordable prices',
      'Your destination for complete wellness',
      'Expert care for your skin and hair',
      'Look good, feel great every day',
      'Professional beauty treatments you deserve',
      'Where beauty meets expertise'
    ],
    tags: ['salon', 'spa', 'beauty', 'wellness', 'hair', 'skin', 'makeup', 'grooming', 'facial', 'massage'],
    logo: 'https://images.unsplash.com/photo-1560750588-73207b1ef5b8?w=200&h=200&fit=crop'
  },

  'healthcare': {
    names: [
      'MediCare Pharmacy', 'Health Plus Clinic', 'City Diagnostics', 'Dental Care Center',
      'PhysioFit Center', 'Home Health Services', 'Vision Care', 'Apollo Pharmacy',
      'Wellness Clinic', 'Family Doctor', 'Quick Meds', 'Lab Express',
      'Smile Dental', 'Ortho Care', 'Eye Care Center', 'Health First',
      'Medical Store', 'Care Pharmacy', 'Health Hub', 'Cure Well Clinic',
      'Life Care Hospital', 'Medico Point', 'Health World', 'Nursing Care',
      'Diagnostic Lab', 'Ayush Clinic', 'Homeo Care', 'Path Lab Plus',
      'Medicine Mart', 'Health Spot', 'Doc on Call', 'Remedy Store'
    ],
    descriptions: [
      'Your trusted healthcare partner',
      'Quality medicines at best prices',
      'Expert doctors, compassionate care',
      'Accurate diagnostics, quick results',
      'Complete dental care for your family',
      'Physiotherapy for faster recovery',
      'Home nursing services you can trust',
      '24/7 healthcare support'
    ],
    tags: ['pharmacy', 'healthcare', 'medical', 'clinic', 'diagnostics', 'dental', 'medicine', 'doctor', 'health'],
    logo: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=200&h=200&fit=crop'
  },

  'fashion': {
    names: [
      'Style Street', 'Fashion Forward', 'Trendy Threads', 'The Wardrobe',
      'Shoe Palace', 'Bag Boutique', 'Watch World', 'Jewel Box',
      'Urban Fashion', 'Classic Clothing', 'Ethnic Wear House', 'Denim Den',
      'The Fashion Hub', 'Style Studio', 'Apparel Avenue', 'Dress Code',
      'Footwear Factory', 'Accessory World', 'Brand Bazaar', 'Fashion Fiesta',
      'Trend Setter', 'Style Icon', 'Clothing Co', 'The Outfit Store',
      'Fashion Point', 'Garment Gallery', 'Look Book', 'Style Mantra',
      'Chic Boutique', 'Men\'s Corner', 'Ladies Fashion', 'Kids Wear'
    ],
    descriptions: [
      'Latest fashion trends at your fingertips',
      'Style that speaks your personality',
      'Quality fashion at affordable prices',
      'Your one-stop fashion destination',
      'Trendy clothes for every occasion',
      'Premium brands, unbeatable style',
      'Fashion for the whole family',
      'Express yourself through fashion'
    ],
    tags: ['fashion', 'clothing', 'apparel', 'shoes', 'bags', 'accessories', 'watches', 'jewelry', 'style'],
    logo: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=200&h=200&fit=crop'
  },

  'fitness-sports': {
    names: [
      'FitZone Gym', 'Power House Fitness', 'Yoga Studio', 'CrossFit Box',
      'Sports Arena', 'Zumba Center', 'Martial Arts Academy', 'Swimming Club',
      'Cricket Academy', 'Football Club', 'Badminton Court', 'Tennis Pro',
      'The Fitness Hub', 'Iron Paradise', 'Flex Gym', 'Body Builders',
      'Sports Gear Shop', 'Athletic Store', 'Gym Equipment', 'Fitness First',
      'Health Club', 'Workout World', 'Strength Studio', 'Cardio King',
      'Sport Zone', 'Active Life', 'Fit Life Gym', 'Champion Sports',
      'Victory Fitness', 'Peak Performance', 'Sports Excellence', 'Fit Nation'
    ],
    descriptions: [
      'Transform your body, transform your life',
      'Professional training for all fitness levels',
      'State-of-the-art equipment and facilities',
      'Expert trainers to guide your journey',
      'Your path to a healthier lifestyle',
      'Sports training for champions',
      'Fitness goals made achievable',
      'Where fitness meets fun'
    ],
    tags: ['gym', 'fitness', 'sports', 'yoga', 'workout', 'training', 'exercise', 'health', 'athletics'],
    logo: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=200&h=200&fit=crop'
  },

  'education-learning': {
    names: [
      'Bright Minds Academy', 'Skill Development Center', 'Music School',
      'Dance Academy', 'Art Studio', 'Language Institute', 'Coding Bootcamp',
      'Tuition Center', 'Career Classes', 'Learning Hub', 'Knowledge Point',
      'Study Circle', 'IIT Coaching', 'NEET Prep', 'Spoken English',
      'Computer Training', 'Vocational Institute', 'Kids Learning Center',
      'Educational Hub', 'Smart Classes', 'Success Academy', 'Future Stars',
      'Talent Academy', 'Creative Arts School', 'The Learning Tree',
      'Skill Academy', 'Excellence Coaching', 'Math Wizards', 'Science Lab',
      'Grammar School', 'Hobby Classes', 'Summer Camp', 'After School'
    ],
    descriptions: [
      'Unlock your potential with expert guidance',
      'Quality education for a bright future',
      'Learn new skills, achieve your dreams',
      'Expert teachers, proven results',
      'Personalized learning for every student',
      'Where knowledge meets creativity',
      'Building tomorrow\'s leaders today',
      'Education that inspires excellence'
    ],
    tags: ['education', 'learning', 'coaching', 'classes', 'training', 'skills', 'academy', 'tuition', 'school'],
    logo: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=200&h=200&fit=crop'
  },

  'home-services': {
    names: [
      'Quick Fix Services', 'Home Repair Pro', 'AC Service Center', 'Plumbing Solutions',
      'Electric Care', 'Clean Home Services', 'Pest Control Plus', 'Packers & Movers',
      'Laundry Express', 'Dry Clean Pro', 'Handyman Hub', 'Home Helpers',
      'Fix It Right', 'Service Master', 'Home Care Pro', 'Repair Experts',
      'Maintenance Plus', 'House Keeping', 'Deep Clean Services', 'Appliance Repair',
      'Carpenter Works', 'Painting Pro', 'Renovation Hub', 'Home Improvement',
      'Service Point', 'Quick Service', 'Home Solutions', 'Care & Repair',
      'Easy Services', 'Home Fix', 'Pro Services', 'Reliable Repairs'
    ],
    descriptions: [
      'Professional home services at your doorstep',
      'Quick, reliable, and affordable repairs',
      'Expert technicians for all your needs',
      'Your home deserves the best care',
      'Trusted services for a happy home',
      'Quality work, guaranteed satisfaction',
      'Making your home maintenance easy',
      'Professional services you can rely on'
    ],
    tags: ['home-services', 'repair', 'plumbing', 'electrical', 'cleaning', 'ac-service', 'pest-control', 'maintenance'],
    logo: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=200&h=200&fit=crop'
  },

  'travel-experiences': {
    names: [
      'Trip Planner', 'Hotel Booking Hub', 'Taxi Service', 'Bike Rentals',
      'Weekend Getaways', 'Tour Operators', 'Adventure Tours', 'Travel Agency',
      'Holiday Packages', 'Resort Booking', 'Car Rentals', 'Flight Booking',
      'Vacation Planners', 'Travel Mate', 'Journey Joy', 'Explore India',
      'Wanderlust Tours', 'Dream Destinations', 'Travel Easy', 'Go Trips',
      'Ride Share', 'City Cabs', 'Airport Transfers', 'Bus Booking',
      'Homestay Hub', 'Guest House', 'Travel Point', 'Trip Advisor Local',
      'Safari Tours', 'Pilgrimage Tours', 'Beach Holidays', 'Hill Station Trips'
    ],
    descriptions: [
      'Your journey begins with us',
      'Unforgettable travel experiences await',
      'Best deals on hotels and flights',
      'Adventure awaits at every destination',
      'Making your travel dreams come true',
      'Explore the world with confidence',
      'Hassle-free travel planning',
      'Creating memories that last forever'
    ],
    tags: ['travel', 'tours', 'hotels', 'taxi', 'rentals', 'booking', 'vacation', 'holiday', 'adventure'],
    logo: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=200&h=200&fit=crop'
  },

  'entertainment': {
    names: [
      'Cinema City', 'Game Zone', 'Event Planners', 'Party Palace',
      'Fun World', 'Amusement Park', 'Gaming Cafe', 'VR Experience',
      'Live Events Hub', 'Concert Hall', 'Comedy Club', 'Music Lounge',
      'Theatre House', 'Movie Magic', 'Play Zone', 'Entertainment Hub',
      'Fun Factory', 'Adventure Land', 'Kids Play Area', 'Family Fun Center',
      'Night Club', 'Karaoke Bar', 'Bowling Alley', 'Escape Room',
      'Sports Bar', 'Arcade Games', 'Laser Tag', 'Go Karting',
      'Trampoline Park', 'Water Park', 'Theme Park', 'Festival Grounds'
    ],
    descriptions: [
      'Entertainment for the whole family',
      'Where fun never stops',
      'Creating memorable experiences',
      'Your destination for excitement',
      'Non-stop entertainment awaits',
      'Fun, games, and endless joy',
      'Making every moment special',
      'The ultimate entertainment experience'
    ],
    tags: ['entertainment', 'movies', 'games', 'events', 'fun', 'party', 'gaming', 'amusement', 'leisure'],
    logo: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=200&h=200&fit=crop'
  },

  'financial-lifestyle': {
    names: [
      'Quick Pay Center', 'Bill Payment Hub', 'Recharge Point', 'Money Services',
      'Insurance Advisor', 'Gold Investment', 'Finance Plus', 'Payment Solutions',
      'Digital Payments', 'Utility Center', 'Service Point', 'Pay Easy',
      'Bill Desk', 'Recharge Zone', 'DTH Services', 'Broadband Center',
      'Banking Point', 'Loan Center', 'Investment Hub', 'Financial Services',
      'Money Mart', 'Pay Point', 'Cash & More', 'Service Center',
      'Quick Services', 'Bill & Pay', 'Recharge Express', 'Utility Hub',
      'Finance Hub', 'Gold Store', 'Insurance Point', 'Savings Center'
    ],
    descriptions: [
      'All your financial services in one place',
      'Quick and secure bill payments',
      'Trusted financial solutions',
      'Making payments simple and fast',
      'Your partner for financial wellness',
      'Secure transactions, peace of mind',
      'Easy payments, happy life',
      'Financial services you can trust'
    ],
    tags: ['finance', 'payments', 'bills', 'recharge', 'insurance', 'banking', 'investment', 'services'],
    logo: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=200&h=200&fit=crop'
  }
};

async function updateStoreDetails() {
  try {
    console.log('🚀 Starting store details update...');
    console.log(`📡 Connecting to MongoDB...`);

    await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
    console.log('✅ Connected to MongoDB\n');

    // Get models
    const Category = mongoose.model('Category', new mongoose.Schema({
      name: String,
      slug: String,
      parentCategory: mongoose.Schema.Types.ObjectId,
      isActive: Boolean
    }));

    const Store = mongoose.model('Store', new mongoose.Schema({
      name: String,
      slug: String,
      description: String,
      logo: String,
      banner: [String],
      category: mongoose.Schema.Types.ObjectId,
      tags: [String],
      isActive: Boolean
    }));

    // Fetch all main categories
    const mainCategories = await Category.find({ parentCategory: { $exists: false } }).lean();
    console.log(`📦 Found ${mainCategories.length} main categories\n`);

    // Create category ID to slug map
    const categoryIdToSlug = new Map<string, string>();
    mainCategories.forEach((cat: any) => {
      categoryIdToSlug.set(cat._id.toString(), cat.slug);
    });

    // Fetch all stores
    const stores = await Store.find({}).lean();
    console.log(`📦 Found ${stores.length} stores to update\n`);

    // Track usage of names per category to avoid duplicates
    const usedNames: Record<string, Set<string>> = {};
    Object.keys(STORE_TEMPLATES).forEach(key => {
      usedNames[key] = new Set();
    });

    // Get random item from array
    const getRandomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

    // Get unique name for category
    const getUniqueName = (categorySlug: string, index: number): string => {
      const template = STORE_TEMPLATES[categorySlug];
      if (!template) return `Store ${index + 1}`;

      // Try to get a unique name
      for (const name of template.names) {
        if (!usedNames[categorySlug].has(name)) {
          usedNames[categorySlug].add(name);
          return name;
        }
      }

      // If all names used, add number suffix
      const baseName = template.names[index % template.names.length];
      return `${baseName} ${Math.floor(index / template.names.length) + 2}`;
    };

    // Update each store
    console.log('========================================');
    console.log('UPDATING STORE DETAILS');
    console.log('========================================\n');

    let updatedCount = 0;
    const categoryStats: Record<string, number> = {};

    for (let i = 0; i < stores.length; i++) {
      const store = stores[i] as any;
      const categorySlug = categoryIdToSlug.get(store.category?.toString());

      if (!categorySlug || !STORE_TEMPLATES[categorySlug]) {
        console.log(`⚠️  Skipping store ${store._id} - no valid category`);
        continue;
      }

      const template = STORE_TEMPLATES[categorySlug];
      const newName = getUniqueName(categorySlug, i);
      const newDescription = getRandomItem(template.descriptions);
      const newTags = [...template.tags, categorySlug, 'bengaluru', 'local'];

      // Create slug from name
      const newSlug = newName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      // Update the store
      await Store.updateOne(
        { _id: store._id },
        {
          $set: {
            name: newName,
            slug: `${newSlug}-${store._id.toString().slice(-6)}`,
            description: newDescription,
            logo: template.logo,
            banner: [template.logo.replace('200', '800')],
            tags: newTags
          }
        }
      );

      categoryStats[categorySlug] = (categoryStats[categorySlug] || 0) + 1;
      updatedCount++;

      console.log(`✅ Updated: ${newName} (${categorySlug})`);
    }

    // Summary
    console.log('\n========================================');
    console.log('📊 UPDATE SUMMARY');
    console.log('========================================');
    console.log(`Total stores updated: ${updatedCount}`);
    console.log('\nStores per category:');
    for (const [category, count] of Object.entries(categoryStats).sort((a, b) => b[1] - a[1])) {
      console.log(`   ${category}: ${count} stores`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

updateStoreDetails()
  .then(() => {
    console.log('✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
