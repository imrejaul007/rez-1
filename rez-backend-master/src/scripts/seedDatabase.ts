import mongoose from 'mongoose';
import { Category } from '../models/Category';
import { Product } from '../models/Product';
import { Store } from '../models/Store';
import { User } from '../models/User';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rez-app';

// Sample categories data
const categoriesData = [
  {
    name: 'Fashion & Beauty',
    slug: 'fashion-beauty',
    description: 'Trendy fashion items and beauty products',
    icon: '👗',
    type: 'going_out',
    metadata: {
      color: '#FF6B6B',
      featured: true,
      tags: ['fashion', 'beauty', 'trending']
    },
    sortOrder: 1
  },
  {
    name: 'Food & Dining',
    slug: 'food-dining',
    description: 'Restaurants, cafes, and food delivery',
    icon: '🍕',
    type: 'going_out',
    metadata: {
      color: '#4ECDC4',
      featured: true,
      tags: ['food', 'restaurant', 'delivery']
    },
    sortOrder: 2
  },
  {
    name: 'Entertainment',
    slug: 'entertainment',
    description: 'Movies, events, and entertainment venues',
    icon: '🎬',
    type: 'going_out',
    metadata: {
      color: '#45B7D1',
      featured: true,
      tags: ['movies', 'events', 'fun']
    },
    sortOrder: 3
  },
  {
    name: 'Grocery & Essentials',
    slug: 'grocery-essentials',
    description: 'Daily essentials and grocery items',
    icon: '🛒',
    type: 'home_delivery',
    metadata: {
      color: '#96CEB4',
      featured: true,
      tags: ['grocery', 'essentials', 'daily']
    },
    sortOrder: 4
  },
  {
    name: 'Electronics',
    slug: 'electronics',
    description: 'Mobile phones, gadgets, and electronics',
    icon: '📱',
    type: 'home_delivery',
    metadata: {
      color: '#FFEAA7',
      featured: false,
      tags: ['electronics', 'gadgets', 'mobile']
    },
    sortOrder: 5
  }
];

// Sample stores data
const storesData = [
  {
    name: 'Fashion Central',
    slug: 'fashion-central',
    description: 'Your one-stop shop for trendy fashion items',
    logo: 'https://example.com/fashion-store-logo.jpg',
    images: ['https://example.com/fashion-store.jpg'],
    contact: {
      phone: '+919876543200',
      email: 'contact@fashioncentral.com',
      website: 'https://fashioncentral.com'
    },
    location: {
      address: '123 Fashion Street',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      country: 'India',
      coordinates: [72.8777, 19.0760]
    },
    timing: {
      monday: { open: '09:00', close: '21:00', isOpen: true },
      tuesday: { open: '09:00', close: '21:00', isOpen: true },
      wednesday: { open: '09:00', close: '21:00', isOpen: true },
      thursday: { open: '09:00', close: '21:00', isOpen: true },
      friday: { open: '09:00', close: '21:00', isOpen: true },
      saturday: { open: '09:00', close: '22:00', isOpen: true },
      sunday: { open: '10:00', close: '20:00', isOpen: true }
    },
    ratings: {
      average: 4.3,
      count: 89,
      distribution: { 5: 45, 4: 25, 3: 12, 2: 5, 1: 2 }
    },
    isActive: true,
    isVerified: true
  },
  {
    name: 'Pizza Corner',
    slug: 'pizza-corner',
    description: 'Authentic Italian pizzas and more',
    logo: 'https://example.com/pizza-store-logo.jpg',
    images: ['https://example.com/pizza-store.jpg'],
    contact: {
      phone: '+919876543201',
      email: 'orders@pizzacorner.com',
      website: 'https://pizzacorner.com'
    },
    location: {
      address: '456 Food Avenue',
      city: 'Delhi',
      state: 'Delhi',
      pincode: '110001',
      country: 'India',
      coordinates: [77.2090, 28.6139]
    },
    timing: {
      monday: { open: '11:00', close: '23:00', isOpen: true },
      tuesday: { open: '11:00', close: '23:00', isOpen: true },
      wednesday: { open: '11:00', close: '23:00', isOpen: true },
      thursday: { open: '11:00', close: '23:00', isOpen: true },
      friday: { open: '11:00', close: '24:00', isOpen: true },
      saturday: { open: '11:00', close: '24:00', isOpen: true },
      sunday: { open: '12:00', close: '23:00', isOpen: true }
    },
    ratings: {
      average: 4.6,
      count: 156,
      distribution: { 5: 98, 4: 35, 3: 15, 2: 6, 1: 2 }
    },
    isActive: true,
    isVerified: true
  }
];

// Sample products data (updated with required fields)
const productsData = [
  {
    name: 'Trendy Summer Dress',
    slug: 'trendy-summer-dress',
    description: 'Beautiful summer dress perfect for casual outings',
    sku: 'DRESS-001',
    images: [
      'https://example.com/dress1.jpg',
      'https://example.com/dress2.jpg'
    ],
    pricing: {
      original: 2999,
      selling: 1999,
      discount: 33,
      currency: 'INR'
    },
    inventory: {
      stock: 50,
      isAvailable: true,
      lowStockThreshold: 5,
      unlimited: false
    },
    ratings: {
      average: 4.5,
      count: 128,
      distribution: { 5: 80, 4: 30, 3: 15, 2: 2, 1: 1 }
    },
    specifications: [
      { key: 'Material', value: 'Cotton Blend' },
      { key: 'Care', value: 'Machine Washable' }
    ],
    tags: ['summer', 'dress', 'casual', 'trending'],
    seo: {
      title: 'Trendy Summer Dress - Fashion Central',
      description: 'Beautiful summer dress perfect for casual outings'
    },
    analytics: {
      views: 245,
      clicks: 89,
      conversions: 23,
      revenue: 45770
    },
    isActive: true,
    isFeatured: true,
    isDigital: false
  },
  {
    name: 'Margherita Pizza',
    slug: 'margherita-pizza',
    description: 'Classic margherita pizza with fresh basil and mozzarella',
    sku: 'PIZZA-001',
    images: ['https://example.com/pizza1.jpg'],
    pricing: {
      original: 350,
      selling: 299,
      discount: 15,
      currency: 'INR'
    },
    inventory: {
      stock: 1000,
      isAvailable: true,
      unlimited: true
    },
    ratings: {
      average: 4.7,
      count: 256,
      distribution: { 5: 200, 4: 40, 3: 10, 2: 4, 1: 2 }
    },
    specifications: [
      { key: 'Size', value: 'Medium (8 inch)' },
      { key: 'Ingredients', value: 'Fresh basil, mozzarella, tomato sauce' }
    ],
    tags: ['pizza', 'italian', 'vegetarian', 'popular'],
    seo: {
      title: 'Margherita Pizza - Pizza Corner',
      description: 'Classic margherita pizza with fresh basil and mozzarella'
    },
    analytics: {
      views: 456,
      clicks: 234,
      conversions: 89,
      revenue: 26611
    },
    isActive: true,
    isFeatured: true,
    isDigital: false
  }
];

// Sample users data (for testing)
const usersData = [
  {
    phoneNumber: '+919876543210',
    email: 'john.doe@example.com',
    profile: {
      firstName: 'John',
      lastName: 'Doe',
      avatar: 'https://example.com/avatar1.jpg',
      bio: 'Love exploring new places and trying different cuisines'
    },
    auth: {
      isVerified: true,
      isOnboarded: true
    },
    wallet: {
      balance: 1500,
      totalEarned: 2000,
      totalSpent: 500,
      pendingAmount: 0
    },
    preferences: {
      language: 'en',
      theme: 'light',
      emailNotifications: true,
      pushNotifications: true,
      smsNotifications: false
    }
  },
  {
    phoneNumber: '+919876543211',
    email: 'jane.smith@example.com',
    profile: {
      firstName: 'Jane',
      lastName: 'Smith',
      avatar: 'https://example.com/avatar2.jpg',
      bio: 'Fashion enthusiast and tech lover'
    },
    auth: {
      isVerified: true,
      isOnboarded: true
    },
    wallet: {
      balance: 2500,
      totalEarned: 3000,
      totalSpent: 500,
      pendingAmount: 100
    },
    preferences: {
      language: 'en',
      theme: 'dark',
      emailNotifications: true,
      pushNotifications: true,
      smsNotifications: true
    }
  }
];

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');
    
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data (optional - comment out to preserve existing data)
    console.log('🧹 Clearing existing data...');
    await Category.deleteMany({});
    await Store.deleteMany({});
    await Product.deleteMany({});
    // await User.deleteMany({}); // Uncomment if you want to clear users

    // Seed categories
    console.log('📂 Seeding categories...');
    const createdCategories = await Category.insertMany(categoriesData);
    console.log(`✅ Created ${createdCategories.length} categories`);

    // Seed stores with category references
    console.log('🏪 Seeding stores...');
    const fashionCategory = createdCategories.find(cat => cat.slug === 'fashion-beauty');
    const foodCategory = createdCategories.find(cat => cat.slug === 'food-dining');

    if (fashionCategory) {
      (storesData[0] as any).category = fashionCategory._id;
    }
    if (foodCategory) {
      (storesData[1] as any).category = foodCategory._id;
    }

    const createdStores = await Store.insertMany(storesData);
    console.log(`✅ Created ${createdStores.length} stores`);

    // Seed products with category and store references
    console.log('📦 Seeding products...');
    const fashionStore = createdStores.find(store => store.slug === 'fashion-central');
    const pizzaStore = createdStores.find(store => store.slug === 'pizza-corner');

    if (fashionCategory && fashionStore) {
      (productsData[0] as any).category = fashionCategory._id;
      (productsData[0] as any).store = fashionStore._id;
    }
    if (foodCategory && pizzaStore) {
      (productsData[1] as any).category = foodCategory._id;
      (productsData[1] as any).store = pizzaStore._id;
    }

    const createdProducts = await Product.insertMany(productsData);
    console.log(`✅ Created ${createdProducts.length} products`);

    // Seed users (optional)
    console.log('👥 Seeding users...');
    const existingUsers = await User.find({});
    if (existingUsers.length === 0) {
      const createdUsers = await User.insertMany(usersData);
      console.log(`✅ Created ${createdUsers.length} users`);
    } else {
      console.log(`ℹ️  ${existingUsers.length} users already exist, skipping user seeding`);
    }

    console.log('🎉 Database seeding completed successfully!');
    
    // Display summary
    const categoryCount = await Category.countDocuments();
    const storeCount = await Store.countDocuments();
    const productCount = await Product.countDocuments();
    const userCount = await User.countDocuments();
    
    console.log('\n📊 Database Summary:');
    console.log(`   Categories: ${categoryCount}`);
    console.log(`   Stores: ${storeCount}`);
    console.log(`   Products: ${productCount}`);
    console.log(`   Users: ${userCount}`);
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase();
}

export default seedDatabase;