import mongoose from 'mongoose';
import { connectDatabase } from '../config/database';
import { User } from '../models/User';
import { Category } from '../models/Category';
import { Store } from '../models/Store';
import { Product } from '../models/Product';
import { Cart } from '../models/Cart';
import { Order } from '../models/Order';
import { Video } from '../models/Video';
import { Project } from '../models/Project';
import { Transaction } from '../models/Transaction';
import { Notification } from '../models/Notification';
import { Review } from '../models/Review';
import { Wishlist } from '../models/Wishlist';

// Store IDs for referencing across models
let userIds: string[] = [];
let categoryIds: string[] = [];
let storeIds: string[] = [];
let productIds: string[] = [];
let orderIds: string[] = [];
let videoIds: string[] = [];
let projectIds: string[] = [];

async function seedUsers() {
  console.log('🔄 Seeding Users...');
  
  const users = [
    {
      phoneNumber: '+919876543210',
      email: 'john.doe@example.com',
      profile: {
        firstName: 'John',
        lastName: 'Doe',
        avatar: 'https://api.dicebear.com/7.x/personas/svg?seed=john',
        dateOfBirth: new Date('1990-05-15'),
        gender: 'male' as 'male',
        location: {
          address: '123 Main St, Delhi',
          city: 'Delhi',
          state: 'Delhi',
          pincode: '110001',
          coordinates: [77.2090, 28.6139]
        }
      },
      preferences: {
        language: 'en',
        notifications: true,
        emailNotifications: true,
        pushNotifications: true,
        smsNotifications: false,
        theme: 'light' as 'light'
      },
      wallet: {
        balance: 2500,
        totalEarned: 5000,
        totalSpent: 2500,
        pendingAmount: 0
      },
      auth: {
        isVerified: true,
        isOnboarded: true,
        loginAttempts: 0
      },
      referral: {
        referralCode: 'JOHN2024',
        referredUsers: [],
        totalReferrals: 5,
        referralEarnings: 500
      },
      role: 'user' as 'user',
      isActive: true
    },
    {
      phoneNumber: '+919876543211',
      email: 'jane.smith@example.com',
      profile: {
        firstName: 'Jane',
        lastName: 'Smith',
        avatar: 'https://api.dicebear.com/7.x/personas/svg?seed=jane',
        dateOfBirth: new Date('1995-08-22'),
        gender: 'female' as 'female',
        location: {
          address: '456 Park Ave, Mumbai',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
          coordinates: [72.8777, 19.0760]
        }
      },
      preferences: {
        language: 'en',
        notifications: true,
        emailNotifications: true,
        pushNotifications: true,
        smsNotifications: true,
        theme: 'light' as 'light'
      },
      wallet: {
        balance: 1800,
        totalEarned: 3500,
        totalSpent: 1700,
        pendingAmount: 200
      },
      auth: {
        isVerified: true,
        isOnboarded: true,
        loginAttempts: 0
      },
      referral: {
        referralCode: 'JANE2024',
        referredUsers: [],
        totalReferrals: 3,
        referralEarnings: 300
      },
      role: 'user' as 'user',
      isActive: true
    },
    {
      phoneNumber: '+919876543212',
      email: 'mike.wilson@example.com',
      profile: {
        name: 'Mike Wilson',
        avatar: 'https://api.dicebear.com/7.x/personas/svg?seed=mike',
        dateOfBirth: new Date('1988-12-10'),
        gender: 'male',
        location: {
          address: '789 Tech Park, Bangalore',
          city: 'Bangalore',
          state: 'Karnataka',
          zipCode: '560001',
          coordinates: [77.5946, 12.9716]
        }
      },
      preferences: {
        categories: ['electronics', 'sports', 'books'],
        notifications: {
          push: true,
          email: false,
          sms: true
        },
        language: 'en',
        currency: 'INR'
      },
      isActive: true,
      isVerified: true,
      onboardingCompleted: true,
      referral: {
        referralCode: 'MIKE2024',
        referredBy: null,
        referralCount: 8
      }
    },
    {
      phoneNumber: '+919876543213',
      email: 'sara.jones@example.com',
      profile: {
        name: 'Sara Jones',
        avatar: 'https://api.dicebear.com/7.x/personas/svg?seed=sara',
        dateOfBirth: new Date('1992-03-18'),
        gender: 'female',
        location: {
          address: '321 Garden St, Chennai',
          city: 'Chennai',
          state: 'Tamil Nadu',
          zipCode: '600001',
          coordinates: [80.2707, 13.0827]
        }
      },
      preferences: {
        categories: ['home', 'books', 'health'],
        notifications: {
          push: true,
          email: true,
          sms: false
        },
        language: 'en',
        currency: 'INR'
      },
      isActive: true,
      isVerified: true,
      onboardingCompleted: true,
      referral: {
        referralCode: 'SARA2024',
        referredBy: null,
        referralCount: 2
      }
    },
    {
      phoneNumber: '+919876543214',
      email: 'alex.brown@example.com',
      profile: {
        name: 'Alex Brown',
        avatar: 'https://api.dicebear.com/7.x/personas/svg?seed=alex',
        dateOfBirth: new Date('1985-07-25'),
        gender: 'male',
        location: {
          address: '555 Business District, Hyderabad',
          city: 'Hyderabad',
          state: 'Telangana',
          zipCode: '500001',
          coordinates: [78.4867, 17.3850]
        }
      },
      preferences: {
        categories: ['electronics', 'automotive', 'sports'],
        notifications: {
          push: false,
          email: true,
          sms: true
        },
        language: 'en',
        currency: 'INR'
      },
      isActive: true,
      isVerified: false,
      onboardingCompleted: true,
      referral: {
        referralCode: 'ALEX2024',
        referredBy: null,
        referralCount: 1
      }
    }
  ];

  const createdUsers = await User.insertMany(users);
  userIds = createdUsers.map(user => user._id?.toString() || '');
  console.log(`✅ Created ${createdUsers.length} users`);
  return createdUsers;
}

async function seedCategories() {
  console.log('🔄 Seeding Categories...');
  
  const categories = [
    {
      name: 'Electronics',
      slug: 'electronics',
      description: 'Latest electronic devices and gadgets',
      image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=500',
      icon: 'device-mobile',
      isActive: true,
      featured: true,
      parentCategory: null,
      attributes: ['brand', 'model', 'warranty', 'color'],
      seoTitle: 'Buy Electronics Online - Best Deals',
      seoDescription: 'Shop the latest electronics with great deals and fast delivery'
    },
    {
      name: 'Fashion',
      slug: 'fashion',
      description: 'Trendy clothing and accessories',
      image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=500',
      icon: 'shirt',
      isActive: true,
      featured: true,
      parentCategory: null,
      attributes: ['size', 'color', 'brand', 'material'],
      seoTitle: 'Fashion Store - Latest Trends',
      seoDescription: 'Discover the latest fashion trends and styles'
    },
    {
      name: 'Food & Beverages',
      slug: 'food-beverages',
      description: 'Fresh food and delicious beverages',
      image: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=500',
      icon: 'coffee',
      isActive: true,
      featured: true,
      parentCategory: null,
      attributes: ['brand', 'weight', 'expiry_date', 'organic'],
      seoTitle: 'Fresh Food & Beverages Online',
      seoDescription: 'Order fresh food and beverages with home delivery'
    },
    {
      name: 'Home & Garden',
      slug: 'home-garden',
      description: 'Everything for your home and garden',
      image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=500',
      icon: 'home',
      isActive: true,
      featured: true,
      parentCategory: null,
      attributes: ['material', 'dimensions', 'color', 'brand'],
      seoTitle: 'Home & Garden Essentials',
      seoDescription: 'Transform your home and garden with our quality products'
    },
    {
      name: 'Sports & Fitness',
      slug: 'sports-fitness',
      description: 'Sports equipment and fitness gear',
      image: 'https://images.unsplash.com/photo-1571019613540-996a8a8a2b6d?w=500',
      icon: 'dumbbell',
      isActive: true,
      featured: true,
      parentCategory: null,
      attributes: ['brand', 'size', 'weight', 'sport_type'],
      seoTitle: 'Sports & Fitness Equipment',
      seoDescription: 'Get fit with our premium sports and fitness equipment'
    },
    {
      name: 'Books',
      slug: 'books',
      description: 'Books across all genres',
      image: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=500',
      icon: 'book',
      isActive: true,
      featured: false,
      parentCategory: null,
      attributes: ['author', 'genre', 'language', 'pages'],
      seoTitle: 'Books Online - All Genres',
      seoDescription: 'Discover books across all genres with great prices'
    }
  ];

  const createdCategories = await Category.insertMany(categories);
  categoryIds = createdCategories.map(cat => cat._id?.toString() || '');
  console.log(`✅ Created ${createdCategories.length} categories`);
  return createdCategories;
}

async function seedStores() {
  console.log('🔄 Seeding Stores...');
  
  const stores = [
    {
      name: 'TechHub Electronics',
      slug: 'techhub-electronics',
      description: 'Your one-stop shop for all electronic needs',
      logo: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=300',
      banner: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800',
      categories: [categoryIds[0]], // Electronics
      location: {
        address: '123 Tech Street, Electronics Market',
        city: 'Delhi',
        state: 'Delhi',
        zipCode: '110001',
        country: 'India',
        coordinates: [77.2090, 28.6139]
      },
      contact: {
        phone: '+91-11-12345678',
        email: 'info@techhub.com',
        website: 'https://techhub.com'
      },
      businessHours: {
        monday: { open: '09:00', close: '21:00', isOpen: true },
        tuesday: { open: '09:00', close: '21:00', isOpen: true },
        wednesday: { open: '09:00', close: '21:00', isOpen: true },
        thursday: { open: '09:00', close: '21:00', isOpen: true },
        friday: { open: '09:00', close: '21:00', isOpen: true },
        saturday: { open: '10:00', close: '22:00', isOpen: true },
        sunday: { open: '11:00', close: '20:00', isOpen: true }
      },
      rating: 4.5,
      reviewCount: 1250,
      isActive: true,
      isVerified: true,
      deliveryOptions: {
        homeDelivery: true,
        pickupAvailable: true,
        freeDeliveryThreshold: 500
      }
    },
    {
      name: 'Fashion Forward',
      slug: 'fashion-forward',
      description: 'Latest fashion trends and styles',
      logo: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=300',
      banner: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800',
      categories: [categoryIds[1]], // Fashion
      location: {
        address: '456 Fashion Avenue, Shopping District',
        city: 'Mumbai',
        state: 'Maharashtra',
        zipCode: '400001',
        country: 'India',
        coordinates: [72.8777, 19.0760]
      },
      contact: {
        phone: '+91-22-87654321',
        email: 'hello@fashionforward.com',
        website: 'https://fashionforward.com'
      },
      businessHours: {
        monday: { open: '10:00', close: '22:00', isOpen: true },
        tuesday: { open: '10:00', close: '22:00', isOpen: true },
        wednesday: { open: '10:00', close: '22:00', isOpen: true },
        thursday: { open: '10:00', close: '22:00', isOpen: true },
        friday: { open: '10:00', close: '23:00', isOpen: true },
        saturday: { open: '10:00', close: '23:00', isOpen: true },
        sunday: { open: '11:00', close: '21:00', isOpen: true }
      },
      rating: 4.2,
      reviewCount: 890,
      isActive: true,
      isVerified: true,
      deliveryOptions: {
        homeDelivery: true,
        pickupAvailable: false,
        freeDeliveryThreshold: 999
      }
    },
    {
      name: 'Fresh Mart',
      slug: 'fresh-mart',
      description: 'Fresh groceries and beverages delivered daily',
      logo: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=300',
      banner: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800',
      categories: [categoryIds[2]], // Food & Beverages
      location: {
        address: '789 Market Road, Fresh District',
        city: 'Bangalore',
        state: 'Karnataka',
        zipCode: '560001',
        country: 'India',
        coordinates: [77.5946, 12.9716]
      },
      contact: {
        phone: '+91-80-11223344',
        email: 'orders@freshmart.com',
        website: 'https://freshmart.com'
      },
      businessHours: {
        monday: { open: '06:00', close: '22:00', isOpen: true },
        tuesday: { open: '06:00', close: '22:00', isOpen: true },
        wednesday: { open: '06:00', close: '22:00', isOpen: true },
        thursday: { open: '06:00', close: '22:00', isOpen: true },
        friday: { open: '06:00', close: '22:00', isOpen: true },
        saturday: { open: '06:00', close: '23:00', isOpen: true },
        sunday: { open: '07:00', close: '21:00', isOpen: true }
      },
      rating: 4.7,
      reviewCount: 2100,
      isActive: true,
      isVerified: true,
      deliveryOptions: {
        homeDelivery: true,
        pickupAvailable: true,
        freeDeliveryThreshold: 200
      }
    },
    {
      name: 'Home Decor Plus',
      slug: 'home-decor-plus',
      description: 'Beautiful home decor and garden essentials',
      logo: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=300',
      banner: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800',
      categories: [categoryIds[3]], // Home & Garden
      location: {
        address: '321 Home Street, Decor District',
        city: 'Chennai',
        state: 'Tamil Nadu',
        zipCode: '600001',
        country: 'India',
        coordinates: [80.2707, 13.0827]
      },
      contact: {
        phone: '+91-44-55667788',
        email: 'info@homedecorplus.com',
        website: 'https://homedecorplus.com'
      },
      businessHours: {
        monday: { open: '09:00', close: '20:00', isOpen: true },
        tuesday: { open: '09:00', close: '20:00', isOpen: true },
        wednesday: { open: '09:00', close: '20:00', isOpen: true },
        thursday: { open: '09:00', close: '20:00', isOpen: true },
        friday: { open: '09:00', close: '20:00', isOpen: true },
        saturday: { open: '10:00', close: '21:00', isOpen: true },
        sunday: { open: '10:00', close: '19:00', isOpen: true }
      },
      rating: 4.3,
      reviewCount: 675,
      isActive: true,
      isVerified: true,
      deliveryOptions: {
        homeDelivery: true,
        pickupAvailable: true,
        freeDeliveryThreshold: 1000
      }
    },
    {
      name: 'SportZone',
      slug: 'sportzone',
      description: 'Premium sports and fitness equipment',
      logo: 'https://images.unsplash.com/photo-1571019613540-996a8a8a2b6d?w=300',
      banner: 'https://images.unsplash.com/photo-1571019613540-996a8a8a2b6d?w=800',
      categories: [categoryIds[4]], // Sports & Fitness
      location: {
        address: '555 Sports Complex, Athletic District',
        city: 'Hyderabad',
        state: 'Telangana',
        zipCode: '500001',
        country: 'India',
        coordinates: [78.4867, 17.3850]
      },
      contact: {
        phone: '+91-40-99887766',
        email: 'sales@sportzone.com',
        website: 'https://sportzone.com'
      },
      businessHours: {
        monday: { open: '08:00', close: '21:00', isOpen: true },
        tuesday: { open: '08:00', close: '21:00', isOpen: true },
        wednesday: { open: '08:00', close: '21:00', isOpen: true },
        thursday: { open: '08:00', close: '21:00', isOpen: true },
        friday: { open: '08:00', close: '21:00', isOpen: true },
        saturday: { open: '08:00', close: '22:00', isOpen: true },
        sunday: { open: '09:00', close: '20:00', isOpen: true }
      },
      rating: 4.6,
      reviewCount: 1450,
      isActive: true,
      isVerified: true,
      deliveryOptions: {
        homeDelivery: true,
        pickupAvailable: true,
        freeDeliveryThreshold: 750
      }
    }
  ];

  const createdStores = await Store.insertMany(stores);
  storeIds = createdStores.map(store => store._id?.toString() || '');
  console.log(`✅ Created ${createdStores.length} stores`);
  return createdStores;
}

async function seedProducts() {
  console.log('🔄 Seeding Products...');
  
  const products = [
    // Electronics Products
    {
      name: 'iPhone 15 Pro',
      slug: 'iphone-15-pro',
      description: 'Latest iPhone with advanced features and excellent camera quality',
      shortDescription: 'Premium smartphone with Pro features',
      sku: 'IPHONE15PRO001',
      category: categoryIds[0], // Electronics
      store: storeIds[0], // TechHub Electronics
      price: 99999,
      compareAtPrice: 109999,
      costPrice: 85000,
      images: [
        {
          url: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=500',
          alt: 'iPhone 15 Pro - Front View',
          isPrimary: true
        },
        {
          url: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=500',
          alt: 'iPhone 15 Pro - Back View',
          isPrimary: false
        }
      ],
      inventory: {
        stock: 50,
        lowStockThreshold: 10,
        trackQuantity: true,
        allowBackorder: false
      },
      variants: [
        { name: 'Color', values: ['Titanium Black', 'Titanium White', 'Titanium Blue'] },
        { name: 'Storage', values: ['128GB', '256GB', '512GB', '1TB'] }
      ],
      attributes: [
        { name: 'Brand', value: 'Apple' },
        { name: 'Screen Size', value: '6.1 inches' },
        { name: 'RAM', value: '8GB' },
        { name: 'Battery', value: '3274mAh' }
      ],
      tags: ['smartphone', 'apple', 'premium', 'camera', 'ios'],
      isFeatured: true,
      isActive: true,
      rating: 4.8,
      reviewCount: 245,
      salesCount: 120,
      cashbackRate: 2.5,
      weight: 187
    },
    {
      name: 'Samsung Galaxy S24 Ultra',
      slug: 'samsung-galaxy-s24-ultra',
      description: 'Flagship Samsung smartphone with S Pen and exceptional display',
      shortDescription: 'Premium Android smartphone with S Pen',
      sku: 'GALAXY24ULTRA001',
      category: categoryIds[0], // Electronics
      store: storeIds[0], // TechHub Electronics
      price: 89999,
      compareAtPrice: 94999,
      costPrice: 75000,
      images: [
        {
          url: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=500',
          alt: 'Samsung Galaxy S24 Ultra',
          isPrimary: true
        }
      ],
      inventory: {
        stock: 35,
        lowStockThreshold: 5,
        trackQuantity: true,
        allowBackorder: false
      },
      variants: [
        { name: 'Color', values: ['Titanium Gray', 'Titanium Black', 'Titanium Violet'] },
        { name: 'Storage', values: ['256GB', '512GB', '1TB'] }
      ],
      attributes: [
        { name: 'Brand', value: 'Samsung' },
        { name: 'Screen Size', value: '6.8 inches' },
        { name: 'RAM', value: '12GB' },
        { name: 'Battery', value: '5000mAh' }
      ],
      tags: ['smartphone', 'samsung', 'android', 's-pen', 'flagship'],
      isFeatured: true,
      isActive: true,
      rating: 4.7,
      reviewCount: 189,
      salesCount: 95,
      cashbackRate: 3.0,
      weight: 232
    },
    // Fashion Products
    {
      name: 'Premium Cotton T-Shirt',
      slug: 'premium-cotton-t-shirt',
      description: 'Comfortable premium cotton t-shirt perfect for everyday wear',
      shortDescription: '100% premium cotton comfortable t-shirt',
      sku: 'TSHIRT001',
      category: categoryIds[1], // Fashion
      store: storeIds[1], // Fashion Forward
      price: 1999,
      compareAtPrice: 2499,
      costPrice: 800,
      images: [
        {
          url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500',
          alt: 'Premium Cotton T-Shirt',
          isPrimary: true
        }
      ],
      inventory: {
        stock: 200,
        lowStockThreshold: 20,
        trackQuantity: true,
        allowBackorder: true
      },
      variants: [
        { name: 'Size', values: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] },
        { name: 'Color', values: ['White', 'Black', 'Navy', 'Gray', 'Red'] }
      ],
      attributes: [
        { name: 'Material', value: '100% Cotton' },
        { name: 'Fit', value: 'Regular' },
        { name: 'Care', value: 'Machine Wash' },
        { name: 'Origin', value: 'India' }
      ],
      tags: ['t-shirt', 'cotton', 'casual', 'comfortable', 'everyday'],
      isFeatured: false,
      isActive: true,
      rating: 4.4,
      reviewCount: 156,
      salesCount: 340,
      cashbackRate: 5.0,
      weight: 200
    },
    // Food & Beverages Products
    {
      name: 'Organic Coffee Beans',
      slug: 'organic-coffee-beans',
      description: 'Premium organic coffee beans sourced from the best plantations',
      shortDescription: 'Premium organic coffee beans - 1kg pack',
      sku: 'COFFEE001',
      category: categoryIds[2], // Food & Beverages
      store: storeIds[2], // Fresh Mart
      price: 899,
      compareAtPrice: 1199,
      costPrice: 600,
      images: [
        {
          url: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=500',
          alt: 'Organic Coffee Beans',
          isPrimary: true
        }
      ],
      inventory: {
        stock: 150,
        lowStockThreshold: 30,
        trackQuantity: true,
        allowBackorder: false
      },
      variants: [
        { name: 'Roast', values: ['Light', 'Medium', 'Dark'] },
        { name: 'Grind', values: ['Whole Bean', 'Ground'] }
      ],
      attributes: [
        { name: 'Weight', value: '1kg' },
        { name: 'Origin', value: 'Ethiopian' },
        { name: 'Certification', value: 'Organic' },
        { name: 'Roast Date', value: 'Fresh' }
      ],
      tags: ['coffee', 'organic', 'premium', 'beans', 'ethiopian'],
      isFeatured: true,
      isActive: true,
      rating: 4.6,
      reviewCount: 89,
      salesCount: 210,
      cashbackRate: 4.0,
      weight: 1000
    },
    // Home & Garden Products
    {
      name: 'Modern Table Lamp',
      slug: 'modern-table-lamp',
      description: 'Elegant modern table lamp perfect for any room decor',
      shortDescription: 'Stylish modern table lamp with LED bulb',
      sku: 'LAMP001',
      category: categoryIds[3], // Home & Garden
      store: storeIds[3], // Home Decor Plus
      price: 3499,
      compareAtPrice: 4299,
      costPrice: 2000,
      images: [
        {
          url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500',
          alt: 'Modern Table Lamp',
          isPrimary: true
        }
      ],
      inventory: {
        stock: 75,
        lowStockThreshold: 10,
        trackQuantity: true,
        allowBackorder: false
      },
      variants: [
        { name: 'Color', values: ['White', 'Black', 'Gold', 'Silver'] },
        { name: 'Height', values: ['45cm', '55cm'] }
      ],
      attributes: [
        { name: 'Material', value: 'Metal & Fabric' },
        { name: 'Bulb Type', value: 'LED' },
        { name: 'Power', value: '15W' },
        { name: 'Warranty', value: '2 Years' }
      ],
      tags: ['lamp', 'lighting', 'modern', 'decor', 'home'],
      isFeatured: false,
      isActive: true,
      rating: 4.3,
      reviewCount: 67,
      salesCount: 85,
      cashbackRate: 3.5,
      weight: 1500
    },
    // Sports & Fitness Products
    {
      name: 'Adjustable Dumbbell Set',
      slug: 'adjustable-dumbbell-set',
      description: 'Professional adjustable dumbbell set perfect for home workouts',
      shortDescription: 'Adjustable dumbbell set - 10kg to 50kg per side',
      sku: 'DUMBBELL001',
      category: categoryIds[4], // Sports & Fitness
      store: storeIds[4], // SportZone
      price: 12999,
      compareAtPrice: 15999,
      costPrice: 9000,
      images: [
        {
          url: 'https://images.unsplash.com/photo-1571019613540-996a8a8a2b6d?w=500',
          alt: 'Adjustable Dumbbell Set',
          isPrimary: true
        }
      ],
      inventory: {
        stock: 25,
        lowStockThreshold: 5,
        trackQuantity: true,
        allowBackorder: false
      },
      variants: [
        { name: 'Weight Range', values: ['10-50kg', '15-60kg'] },
        { name: 'Handle Type', values: ['Standard', 'Ergonomic'] }
      ],
      attributes: [
        { name: 'Material', value: 'Cast Iron' },
        { name: 'Coating', value: 'Rubber' },
        { name: 'Adjustment', value: 'Quick Select' },
        { name: 'Warranty', value: '5 Years' }
      ],
      tags: ['dumbbell', 'fitness', 'home-gym', 'weights', 'adjustable'],
      isFeatured: true,
      isActive: true,
      rating: 4.7,
      reviewCount: 123,
      salesCount: 67,
      cashbackRate: 2.0,
      weight: 25000
    }
  ];

  const createdProducts = await Product.insertMany(products);
  productIds = createdProducts.map(product => product._id?.toString() || '');
  console.log(`✅ Created ${createdProducts.length} products`);
  return createdProducts;
}

async function seedCarts() {
  console.log('🔄 Seeding Carts...');
  
  const carts = [
    {
      userId: userIds[0],
      items: [
        {
          productId: productIds[0], // iPhone 15 Pro
          quantity: 1,
          variant: 'Titanium Black, 256GB',
          price: 99999,
          addedAt: new Date()
        },
        {
          productId: productIds[3], // Organic Coffee Beans
          quantity: 2,
          variant: 'Medium Roast, Ground',
          price: 899,
          addedAt: new Date(Date.now() - 86400000) // 1 day ago
        }
      ],
      totalAmount: 101797,
      coupon: null,
      lastModified: new Date()
    },
    {
      userId: userIds[1],
      items: [
        {
          productId: productIds[2], // Premium Cotton T-Shirt
          quantity: 3,
          variant: 'L, Navy',
          price: 1999,
          addedAt: new Date()
        },
        {
          productId: productIds[4], // Modern Table Lamp
          quantity: 1,
          variant: 'White, 45cm',
          price: 3499,
          addedAt: new Date(Date.now() - 3600000) // 1 hour ago
        }
      ],
      totalAmount: 9496,
      coupon: {
        code: 'SAVE10',
        discount: 949.6,
        type: 'percentage',
        value: 10
      },
      lastModified: new Date()
    },
    {
      userId: userIds[2],
      items: [
        {
          productId: productIds[5], // Adjustable Dumbbell Set
          quantity: 1,
          variant: '10-50kg, Ergonomic',
          price: 12999,
          addedAt: new Date(Date.now() - 7200000) // 2 hours ago
        }
      ],
      totalAmount: 12999,
      coupon: null,
      lastModified: new Date(Date.now() - 7200000)
    }
  ];

  const createdCarts = await Cart.insertMany(carts);
  console.log(`✅ Created ${createdCarts.length} carts`);
  return createdCarts;
}

async function seedOrders() {
  console.log('🔄 Seeding Orders...');
  
  const orders = [
    {
      orderNumber: 'ORD-2025-001',
      userId: userIds[0],
      items: [
        {
          productId: productIds[0], // iPhone 15 Pro
          name: 'iPhone 15 Pro',
          variant: 'Titanium Black, 256GB',
          quantity: 1,
          price: 99999,
          totalPrice: 99999,
          image: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=500'
        }
      ],
      totalAmount: 99999,
      status: 'delivered',
      paymentStatus: 'paid',
      paymentMethod: 'credit_card',
      shippingAddress: {
        name: 'John Doe',
        phone: '+919876543210',
        address: '123 Main St',
        city: 'Delhi',
        state: 'Delhi',
        zipCode: '110001',
        country: 'India'
      },
      billingAddress: {
        name: 'John Doe',
        phone: '+919876543210',
        address: '123 Main St',
        city: 'Delhi',
        state: 'Delhi',
        zipCode: '110001',
        country: 'India'
      },
      tracking: {
        trackingNumber: 'TRK123456789',
        carrier: 'Blue Dart',
        estimatedDelivery: new Date(Date.now() + 86400000),
        events: [
          {
            status: 'order_placed',
            timestamp: new Date(Date.now() - 604800000), // 7 days ago
            location: 'Delhi',
            description: 'Order placed successfully'
          },
          {
            status: 'shipped',
            timestamp: new Date(Date.now() - 518400000), // 6 days ago
            location: 'Delhi Warehouse',
            description: 'Order shipped from warehouse'
          },
          {
            status: 'delivered',
            timestamp: new Date(Date.now() - 432000000), // 5 days ago
            location: 'Delhi - Customer Address',
            description: 'Order delivered successfully'
          }
        ]
      },
      notes: 'Please handle with care - electronic item'
    },
    {
      orderNumber: 'ORD-2025-002',
      userId: userIds[1],
      items: [
        {
          productId: productIds[2], // Premium Cotton T-Shirt
          name: 'Premium Cotton T-Shirt',
          variant: 'L, Navy',
          quantity: 2,
          price: 1999,
          totalPrice: 3998,
          image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500'
        },
        {
          productId: productIds[3], // Organic Coffee Beans
          name: 'Organic Coffee Beans',
          variant: 'Medium Roast, Ground',
          quantity: 1,
          price: 899,
          totalPrice: 899,
          image: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=500'
        }
      ],
      totalAmount: 4897,
      status: 'shipped',
      paymentStatus: 'paid',
      paymentMethod: 'upi',
      shippingAddress: {
        name: 'Jane Smith',
        phone: '+919876543211',
        address: '456 Park Ave',
        city: 'Mumbai',
        state: 'Maharashtra',
        zipCode: '400001',
        country: 'India'
      },
      billingAddress: {
        name: 'Jane Smith',
        phone: '+919876543211',
        address: '456 Park Ave',
        city: 'Mumbai',
        state: 'Maharashtra',
        zipCode: '400001',
        country: 'India'
      },
      tracking: {
        trackingNumber: 'TRK987654321',
        carrier: 'DTDC',
        estimatedDelivery: new Date(Date.now() + 172800000), // 2 days from now
        events: [
          {
            status: 'order_placed',
            timestamp: new Date(Date.now() - 172800000), // 2 days ago
            location: 'Mumbai',
            description: 'Order placed successfully'
          },
          {
            status: 'shipped',
            timestamp: new Date(Date.now() - 86400000), // 1 day ago
            location: 'Mumbai Warehouse',
            description: 'Order shipped from warehouse'
          }
        ]
      }
    },
    {
      orderNumber: 'ORD-2025-003',
      userId: userIds[2],
      items: [
        {
          productId: productIds[5], // Adjustable Dumbbell Set
          name: 'Adjustable Dumbbell Set',
          variant: '10-50kg, Ergonomic',
          quantity: 1,
          price: 12999,
          totalPrice: 12999,
          image: 'https://images.unsplash.com/photo-1571019613540-996a8a8a2b6d?w=500'
        }
      ],
      totalAmount: 12999,
      status: 'pending',
      paymentStatus: 'pending',
      paymentMethod: 'cod',
      shippingAddress: {
        name: 'Mike Wilson',
        phone: '+919876543212',
        address: '789 Tech Park',
        city: 'Bangalore',
        state: 'Karnataka',
        zipCode: '560001',
        country: 'India'
      },
      billingAddress: {
        name: 'Mike Wilson',
        phone: '+919876543212',
        address: '789 Tech Park',
        city: 'Bangalore',
        state: 'Karnataka',
        zipCode: '560001',
        country: 'India'
      },
      tracking: {
        trackingNumber: null,
        carrier: null,
        estimatedDelivery: null,
        events: [
          {
            status: 'order_placed',
            timestamp: new Date(Date.now() - 3600000), // 1 hour ago
            location: 'Bangalore',
            description: 'Order placed successfully'
          }
        ]
      },
      notes: 'Cash on delivery order'
    }
  ];

  const createdOrders = await Order.insertMany(orders);
  orderIds = createdOrders.map(order => order._id?.toString() || '');
  console.log(`✅ Created ${createdOrders.length} orders`);
  return createdOrders;
}

async function seedVideos() {
  console.log('🔄 Seeding Videos...');
  
  const videos = [
    {
      title: 'iPhone 15 Pro Review - Complete Guide',
      description: 'In-depth review of the new iPhone 15 Pro with all features explained',
      url: 'https://example.com/videos/iphone-15-pro-review',
      thumbnail: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=500',
      duration: 680, // 11 minutes 20 seconds
      category: categoryIds[0], // Electronics
      tags: ['iphone', 'review', 'apple', 'smartphone', 'technology'],
      isActive: true,
      isFeatured: true,
      viewCount: 15420,
      likeCount: 1340,
      moderationStatus: 'approved',
      uploadDate: new Date(Date.now() - 604800000), // 7 days ago
      metadata: {
        resolution: '1080p',
        format: 'MP4',
        size: 245760000, // ~245MB
        fps: 30
      }
    },
    {
      title: 'Fashion Trends 2025 - Spring Collection',
      description: 'Latest fashion trends for Spring 2025 - What to wear this season',
      url: 'https://example.com/videos/fashion-trends-2025',
      thumbnail: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=500',
      duration: 480, // 8 minutes
      category: categoryIds[1], // Fashion
      tags: ['fashion', 'trends', '2025', 'spring', 'style'],
      isActive: true,
      isFeatured: true,
      viewCount: 8760,
      likeCount: 892,
      moderationStatus: 'approved',
      uploadDate: new Date(Date.now() - 432000000), // 5 days ago
      metadata: {
        resolution: '4K',
        format: 'MP4',
        size: 512000000, // ~512MB
        fps: 60
      }
    },
    {
      title: 'Home Coffee Brewing Guide',
      description: 'Learn how to brew the perfect coffee at home with our step-by-step guide',
      url: 'https://example.com/videos/coffee-brewing-guide',
      thumbnail: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=500',
      duration: 420, // 7 minutes
      category: categoryIds[2], // Food & Beverages
      tags: ['coffee', 'brewing', 'tutorial', 'home', 'guide'],
      isActive: true,
      isFeatured: false,
      viewCount: 3240,
      likeCount: 456,
      moderationStatus: 'approved',
      uploadDate: new Date(Date.now() - 259200000), // 3 days ago
      metadata: {
        resolution: '1080p',
        format: 'MP4',
        size: 156000000, // ~156MB
        fps: 30
      }
    },
    {
      title: 'Home Workout Routine - Beginner Friendly',
      description: 'Complete home workout routine perfect for beginners - No equipment needed',
      url: 'https://example.com/videos/home-workout-beginner',
      thumbnail: 'https://images.unsplash.com/photo-1571019613540-996a8a8a2b6d?w=500',
      duration: 1800, // 30 minutes
      category: categoryIds[4], // Sports & Fitness
      tags: ['workout', 'fitness', 'home', 'beginner', 'exercise'],
      isActive: true,
      isFeatured: true,
      viewCount: 12500,
      likeCount: 1890,
      moderationStatus: 'approved',
      uploadDate: new Date(Date.now() - 86400000), // 1 day ago
      metadata: {
        resolution: '1080p',
        format: 'MP4',
        size: 420000000, // ~420MB
        fps: 30
      }
    }
  ];

  const createdVideos = await Video.insertMany(videos);
  videoIds = createdVideos.map(video => video._id?.toString() || '');
  console.log(`✅ Created ${createdVideos.length} videos`);
  return createdVideos;
}

async function seedProjects() {
  console.log('🔄 Seeding Projects...');
  
  const projects = [
    {
      title: 'Tech Product Review Campaign',
      description: 'Create engaging video reviews for latest tech products and earn rewards',
      category: 'content_creation',
      difficulty: 'medium',
      estimatedTime: 480, // 8 hours
      reward: {
        type: 'cash',
        amount: 5000,
        currency: 'INR'
      },
      requirements: [
        'Create 5-10 minute video review',
        'Include unboxing and key features',
        'Show real usage scenarios',
        'Provide honest opinions'
      ],
      guidelines: [
        'Use good lighting and audio quality',
        'Follow our content guidelines',
        'Submit raw footage along with edited video',
        'Include product specifications in description'
      ],
      isActive: true,
      isFeatured: true,
      participantCount: 45,
      completionCount: 12,
      startDate: new Date(Date.now() - 1209600000), // 2 weeks ago
      endDate: new Date(Date.now() + 604800000), // 1 week from now
      status: 'active'
    },
    {
      title: 'Fashion Style Challenge',
      description: 'Showcase creative fashion styling with our featured products',
      category: 'social_media',
      difficulty: 'easy',
      estimatedTime: 120, // 2 hours
      reward: {
        type: 'points',
        amount: 1000,
        currency: 'POINTS'
      },
      requirements: [
        'Create Instagram-worthy photos',
        'Use at least 2 featured fashion products',
        'Include styling tips in caption',
        'Use campaign hashtags'
      ],
      guidelines: [
        'Photos should be high resolution',
        'Show multiple outfit combinations',
        'Include before/after styling shots',
        'Tag our official account'
      ],
      isActive: true,
      isFeatured: false,
      participantCount: 128,
      completionCount: 67,
      startDate: new Date(Date.now() - 604800000), // 1 week ago
      endDate: new Date(Date.now() + 1209600000), // 2 weeks from now
      status: 'active'
    },
    {
      title: 'Home Cooking Recipe Series',
      description: 'Create recipe videos using ingredients from our food partners',
      category: 'content_creation',
      difficulty: 'medium',
      estimatedTime: 360, // 6 hours
      reward: {
        type: 'cash',
        amount: 3500,
        currency: 'INR'
      },
      requirements: [
        'Create step-by-step cooking video',
        'Include ingredient list and measurements',
        'Show final plated dish',
        'Provide cooking tips and tricks'
      ],
      guidelines: [
        'Video should be 10-15 minutes long',
        'Include close-up shots of techniques',
        'Provide written recipe in description',
        'Show kitchen setup and preparation'
      ],
      isActive: true,
      isFeatured: true,
      participantCount: 23,
      completionCount: 8,
      startDate: new Date(Date.now() - 432000000), // 5 days ago
      endDate: new Date(Date.now() + 1814400000), // 3 weeks from now
      status: 'active'
    },
    {
      title: 'Fitness Journey Documentation',
      description: 'Document your fitness journey using our sports equipment',
      category: 'lifestyle',
      difficulty: 'hard',
      estimatedTime: 2400, // 40 hours (over multiple weeks)
      reward: {
        type: 'cash',
        amount: 15000,
        currency: 'INR'
      },
      requirements: [
        'Document 4-week fitness journey',
        'Use featured sports products',
        'Create weekly progress videos',
        'Include workout routines and diet plans'
      ],
      guidelines: [
        'Submit weekly progress reports',
        'Include before/during/after photos',
        'Show equipment usage in videos',
        'Provide honest feedback on products used'
      ],
      isActive: true,
      isFeatured: true,
      participantCount: 12,
      completionCount: 2,
      startDate: new Date(Date.now() - 1814400000), // 3 weeks ago
      endDate: new Date(Date.now() + 604800000), // 1 week from now
      status: 'active'
    }
  ];

  const createdProjects = await Project.insertMany(projects);
  projectIds = createdProjects.map(project => project._id?.toString() || '');
  console.log(`✅ Created ${createdProjects.length} projects`);
  return createdProjects;
}

async function seedTransactions() {
  console.log('🔄 Seeding Transactions...');
  
  const transactions = [
    {
      userId: userIds[0],
      orderId: orderIds[0],
      type: 'purchase',
      amount: 99999,
      currency: 'INR',
      status: 'completed',
      paymentMethod: 'credit_card',
      paymentGateway: 'razorpay',
      gatewayTransactionId: 'pay_123456789',
      description: 'Purchase of iPhone 15 Pro',
      metadata: {
        cardLast4: '1234',
        cardBrand: 'visa',
        orderId: orderIds[0]
      },
      processedAt: new Date(Date.now() - 432000000) // 5 days ago
    },
    {
      userId: userIds[0],
      orderId: orderIds[0],
      type: 'cashback',
      amount: 2499.98, // 2.5% of 99999
      currency: 'INR',
      status: 'completed',
      description: 'Cashback for iPhone 15 Pro purchase',
      metadata: {
        cashbackRate: 2.5,
        originalOrderAmount: 99999,
        orderId: orderIds[0]
      },
      processedAt: new Date(Date.now() - 345600000) // 4 days ago (after order delivery)
    },
    {
      userId: userIds[1],
      orderId: orderIds[1],
      type: 'purchase',
      amount: 4897,
      currency: 'INR',
      status: 'completed',
      paymentMethod: 'upi',
      paymentGateway: 'razorpay',
      gatewayTransactionId: 'pay_987654321',
      description: 'Purchase of T-Shirt and Coffee Beans',
      metadata: {
        upiId: 'jane@paytm',
        orderId: orderIds[1]
      },
      processedAt: new Date(Date.now() - 172800000) // 2 days ago
    },
    {
      userId: userIds[1],
      type: 'reward',
      amount: 1000,
      currency: 'POINTS',
      status: 'completed',
      description: 'Reward points for Fashion Style Challenge completion',
      metadata: {
        projectId: projectIds[1],
        projectTitle: 'Fashion Style Challenge',
        achievementType: 'project_completion'
      },
      processedAt: new Date(Date.now() - 86400000) // 1 day ago
    },
    {
      userId: userIds[0],
      type: 'referral',
      amount: 500,
      currency: 'INR',
      status: 'completed',
      description: 'Referral bonus for successful friend signup',
      metadata: {
        referredUserId: userIds[3],
        referredUserName: 'Sara Jones',
        bonusType: 'signup_bonus'
      },
      processedAt: new Date(Date.now() - 259200000) // 3 days ago
    }
  ];

  const createdTransactions = await Transaction.insertMany(transactions);
  console.log(`✅ Created ${createdTransactions.length} transactions`);
  return createdTransactions;
}

async function seedNotifications() {
  console.log('🔄 Seeding Notifications...');
  
  const notifications = [
    {
      userId: userIds[0],
      title: 'Order Delivered Successfully',
      message: 'Your iPhone 15 Pro has been delivered. Thank you for shopping with us!',
      type: 'order',
      priority: 'high',
      isRead: true,
      readAt: new Date(Date.now() - 345600000), // 4 days ago
      data: {
        orderId: orderIds[0],
        orderNumber: 'ORD-2025-001',
        trackingNumber: 'TRK123456789'
      },
      actionUrl: `/orders/${orderIds[0]}`
    },
    {
      userId: userIds[0],
      title: 'Cashback Credited',
      message: 'Congratulations! ₹2,499.98 cashback has been credited to your account.',
      type: 'reward',
      priority: 'medium',
      isRead: true,
      readAt: new Date(Date.now() - 259200000), // 3 days ago
      data: {
        amount: 2499.98,
        currency: 'INR',
        orderId: orderIds[0]
      },
      actionUrl: '/wallet'
    },
    {
      userId: userIds[1],
      title: 'Order Shipped',
      message: 'Great news! Your order is on its way. Track your package for updates.',
      type: 'order',
      priority: 'medium',
      isRead: false,
      data: {
        orderId: orderIds[1],
        orderNumber: 'ORD-2025-002',
        trackingNumber: 'TRK987654321',
        estimatedDelivery: new Date(Date.now() + 172800000)
      },
      actionUrl: `/tracking/${orderIds[1]}`
    },
    {
      userId: userIds[1],
      title: 'Project Reward Earned',
      message: 'Amazing work! You earned 1,000 points for completing Fashion Style Challenge.',
      type: 'reward',
      priority: 'medium',
      isRead: false,
      data: {
        points: 1000,
        projectId: projectIds[1],
        projectTitle: 'Fashion Style Challenge'
      },
      actionUrl: `/projects/${projectIds[1]}`
    },
    {
      userId: userIds[2],
      title: 'Order Confirmation',
      message: 'Your order has been confirmed. We\'ll process it shortly.',
      type: 'order',
      priority: 'high',
      isRead: false,
      data: {
        orderId: orderIds[2],
        orderNumber: 'ORD-2025-003',
        totalAmount: 12999
      },
      actionUrl: `/orders/${orderIds[2]}`
    },
    {
      userId: userIds[0],
      title: 'New Products in Electronics',
      message: 'Check out the latest smartphones and gadgets now available!',
      type: 'promotional',
      priority: 'low',
      isRead: false,
      data: {
        categoryId: categoryIds[0],
        categoryName: 'Electronics'
      },
      actionUrl: '/categories/electronics',
      scheduledAt: new Date(Date.now() - 86400000) // 1 day ago
    },
    {
      userId: userIds[1],
      title: 'Weekend Special Offers',
      message: 'Don\'t miss out! Up to 50% off on fashion items this weekend.',
      type: 'promotional',
      priority: 'medium',
      isRead: false,
      data: {
        discountPercentage: 50,
        categoryId: categoryIds[1],
        validUntil: new Date(Date.now() + 259200000) // 3 days from now
      },
      actionUrl: '/categories/fashion',
      scheduledAt: new Date(Date.now() - 43200000) // 12 hours ago
    },
    {
      userId: userIds[3],
      title: 'Welcome to REZ!',
      message: 'Welcome to REZ! Complete your profile to unlock exclusive rewards.',
      type: 'system',
      priority: 'high',
      isRead: false,
      data: {
        onboardingStep: 'profile_completion',
        referredBy: userIds[0]
      },
      actionUrl: '/profile/edit'
    }
  ];

  const createdNotifications = await Notification.insertMany(notifications);
  console.log(`✅ Created ${createdNotifications.length} notifications`);
  return createdNotifications;
}

async function seedReviews() {
  console.log('🔄 Seeding Reviews...');
  
  const reviews = [
    {
      userId: userIds[0],
      productId: productIds[0], // iPhone 15 Pro
      orderId: orderIds[0],
      rating: 5,
      title: 'Excellent phone with amazing camera',
      comment: 'Absolutely love this phone! The camera quality is outstanding, especially in low light conditions. The build quality feels premium and the battery life is impressive. Highly recommended for anyone looking for a flagship device.',
      images: [
        'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=300',
        'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=300'
      ],
      isVerified: true,
      isRecommended: true,
      likes: 23,
      dislikes: 1,
      moderationStatus: 'approved',
      moderatedAt: new Date(Date.now() - 345600000) // 4 days ago
    },
    {
      userId: userIds[1],
      productId: productIds[2], // Premium Cotton T-Shirt
      orderId: orderIds[1],
      rating: 4,
      title: 'Good quality and comfortable',
      comment: 'Really comfortable t-shirt with good fabric quality. The fit is perfect and it doesn\'t shrink after washing. Only minor issue is that the color is slightly different from the website photos, but still looks good.',
      images: [
        'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=300'
      ],
      isVerified: true,
      isRecommended: true,
      likes: 12,
      dislikes: 0,
      moderationStatus: 'approved',
      moderatedAt: new Date(Date.now() - 86400000) // 1 day ago
    },
    {
      userId: userIds[1],
      productId: productIds[3], // Organic Coffee Beans
      orderId: orderIds[1],
      rating: 5,
      title: 'Best coffee I\'ve had in years!',
      comment: 'These organic coffee beans are absolutely fantastic! The aroma is incredible and the taste is smooth with perfect balance. You can really taste the quality difference. Will definitely order again.',
      images: [],
      isVerified: true,
      isRecommended: true,
      likes: 18,
      dislikes: 0,
      moderationStatus: 'approved',
      moderatedAt: new Date(Date.now() - 86400000) // 1 day ago
    },
    {
      userId: userIds[3],
      productId: productIds[4], // Modern Table Lamp
      rating: 4,
      title: 'Beautiful design, good quality',
      comment: 'The lamp looks exactly like the photos and the quality is good for the price. Installation was easy and the LED bulb is bright enough for reading. The only downside is the cord could be a bit longer.',
      images: [
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300'
      ],
      isVerified: false,
      isRecommended: true,
      likes: 8,
      dislikes: 1,
      moderationStatus: 'approved',
      moderatedAt: new Date(Date.now() - 172800000) // 2 days ago
    },
    {
      userId: userIds[4],
      productId: productIds[5], // Adjustable Dumbbell Set
      rating: 5,
      title: 'Perfect for home gym setup',
      comment: 'Excellent quality dumbbells! The adjustment mechanism is smooth and the weight plates are well-balanced. Perfect for my home gym setup. The rubber coating protects my floors. Worth every penny!',
      images: [
        'https://images.unsplash.com/photo-1571019613540-996a8a8a2b6d?w=300'
      ],
      isVerified: false,
      isRecommended: true,
      likes: 15,
      dislikes: 0,
      moderationStatus: 'approved',
      moderatedAt: new Date(Date.now() - 259200000) // 3 days ago
    },
    {
      userId: userIds[2],
      productId: productIds[1], // Samsung Galaxy S24 Ultra
      rating: 4,
      title: 'Great phone but expensive',
      comment: 'The S24 Ultra is a powerful phone with excellent display and camera. The S Pen is really useful for note-taking. However, it\'s quite expensive and the battery could be better for heavy usage.',
      images: [],
      isVerified: false,
      isRecommended: true,
      likes: 9,
      dislikes: 2,
      moderationStatus: 'approved',
      moderatedAt: new Date(Date.now() - 432000000) // 5 days ago
    }
  ];

  const createdReviews = await Review.insertMany(reviews);
  console.log(`✅ Created ${createdReviews.length} reviews`);
  return createdReviews;
}

async function seedWishlists() {
  console.log('🔄 Seeding Wishlists...');
  
  const wishlists = [
    {
      userId: userIds[0],
      items: [
        {
          productId: productIds[1], // Samsung Galaxy S24 Ultra
          addedAt: new Date(Date.now() - 432000000), // 5 days ago
          priceWhenAdded: 89999,
          notes: 'Waiting for price drop or sale'
        },
        {
          productId: productIds[5], // Adjustable Dumbbell Set
          addedAt: new Date(Date.now() - 259200000), // 3 days ago
          priceWhenAdded: 12999,
          notes: 'For home gym setup'
        }
      ],
      isPublic: false,
      totalItems: 2,
      lastModified: new Date(Date.now() - 259200000)
    },
    {
      userId: userIds[1],
      items: [
        {
          productId: productIds[0], // iPhone 15 Pro
          addedAt: new Date(Date.now() - 604800000), // 7 days ago
          priceWhenAdded: 99999,
          notes: 'Upgrade from current phone'
        },
        {
          productId: productIds[4], // Modern Table Lamp
          addedAt: new Date(Date.now() - 172800000), // 2 days ago
          priceWhenAdded: 3499,
          notes: 'For bedroom'
        },
        {
          productId: productIds[3], // Organic Coffee Beans
          addedAt: new Date(Date.now() - 86400000), // 1 day ago
          priceWhenAdded: 899,
          notes: 'Try different roast type'
        }
      ],
      isPublic: true,
      totalItems: 3,
      lastModified: new Date(Date.now() - 86400000)
    },
    {
      userId: userIds[2],
      items: [
        {
          productId: productIds[2], // Premium Cotton T-Shirt
          addedAt: new Date(Date.now() - 345600000), // 4 days ago
          priceWhenAdded: 1999,
          notes: 'Different colors'
        }
      ],
      isPublic: false,
      totalItems: 1,
      lastModified: new Date(Date.now() - 345600000)
    },
    {
      userId: userIds[3],
      items: [
        {
          productId: productIds[1], // Samsung Galaxy S24 Ultra
          addedAt: new Date(Date.now() - 518400000), // 6 days ago
          priceWhenAdded: 89999,
          notes: 'Considering this vs iPhone'
        },
        {
          productId: productIds[3], // Organic Coffee Beans
          addedAt: new Date(Date.now() - 432000000), // 5 days ago
          priceWhenAdded: 899,
          notes: 'Recommended by friend'
        }
      ],
      isPublic: true,
      totalItems: 2,
      lastModified: new Date(Date.now() - 432000000)
    }
  ];

  const createdWishlists = await Wishlist.insertMany(wishlists);
  console.log(`✅ Created ${createdWishlists.length} wishlists`);
  return createdWishlists;
}

async function clearAllData() {
  console.log('🗑️  Clearing existing data...');
  
  await Promise.all([
    User.deleteMany({}),
    Category.deleteMany({}),
    Store.deleteMany({}),
    Product.deleteMany({}),
    Cart.deleteMany({}),
    Order.deleteMany({}),
    Video.deleteMany({}),
    Project.deleteMany({}),
    Transaction.deleteMany({}),
    Notification.deleteMany({}),
    Review.deleteMany({}),
    Wishlist.deleteMany({})
  ]);
  
  console.log('✅ All existing data cleared');
}

async function main() {
  try {
    console.log('🚀 Starting comprehensive data seeding...');
    console.log('=====================================\n');
    
    // Connect to database
    await connectDatabase();
    console.log('✅ Connected to database\n');
    
    // Clear existing data
    await clearAllData();
    console.log('');
    
    // Seed data in order (maintaining relationships)
    await seedUsers();
    await seedCategories();
    await seedStores();
    await seedProducts();
    await seedCarts();
    await seedOrders();
    await seedVideos();
    await seedProjects();
    await seedTransactions();
    await seedNotifications();
    await seedReviews();
    await seedWishlists();
    
    console.log('\n=====================================');
    console.log('🎉 Data seeding completed successfully!');
    console.log('=====================================');
    console.log('\n📊 Summary:');
    console.log(`👤 Users: ${userIds.length}`);
    console.log(`📂 Categories: ${categoryIds.length}`);
    console.log(`🏪 Stores: ${storeIds.length}`);
    console.log(`📦 Products: ${productIds.length}`);
    console.log(`🛒 Carts: 3`);
    console.log(`📋 Orders: ${orderIds.length}`);
    console.log(`🎥 Videos: ${videoIds.length}`);
    console.log(`📋 Projects: ${projectIds.length}`);
    console.log(`💳 Transactions: 5`);
    console.log(`🔔 Notifications: 8`);
    console.log(`⭐ Reviews: 6`);
    console.log(`💝 Wishlists: 4`);
    console.log('\n✅ All models populated with interconnected dummy data!');
    
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from database');
    process.exit(0);
  }
}

if (require.main === module) {
  main();
}

export { main as seedAllData };