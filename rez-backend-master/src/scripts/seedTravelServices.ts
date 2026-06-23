/**
 * Seed Script for Travel Services
 * Seeds: Travel Categories, Stores (Travel Providers), and Travel Services
 * Categories: Flights, Hotels, Trains, Bus, Cab, Packages
 *
 * Run: npx ts-node src/scripts/seedTravelServices.ts
 * Clear & Seed: npx ts-node src/scripts/seedTravelServices.ts --clear
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Import models
import { ServiceCategory } from '../models/ServiceCategory';
import { Store } from '../models/Store';
import { Product } from '../models/Product';
import { Category } from '../models/Category';
import { Merchant } from '../models/Merchant';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
};

const log = {
  info: (msg: string) => console.log(`${colors.cyan}ℹ ${msg}${colors.reset}`),
  success: (msg: string) => console.log(`${colors.green}✓ ${msg}${colors.reset}`),
  warning: (msg: string) => console.log(`${colors.yellow}⚠ ${msg}${colors.reset}`),
  error: (msg: string) => console.log(`${colors.red}✗ ${msg}${colors.reset}`),
  header: (msg: string) => console.log(`\n${colors.bright}${colors.blue}━━━ ${msg} ━━━${colors.reset}\n`),
};

// Check for --clear flag
const shouldClear = process.argv.includes('--clear');

// Connect to database
async function connectDB() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/rez';
    await mongoose.connect(mongoUri);
    log.success('Connected to MongoDB');
  } catch (error) {
    log.error(`MongoDB connection error: ${error}`);
    process.exit(1);
  }
}

// Clear existing travel services data
async function clearData() {
  if (!shouldClear) {
    log.info('Skipping data clear (use --clear to clear existing data)');
    return;
  }

  log.header('Clearing existing data');

  try {
    // Find travel services category
    const travelCategory = await ServiceCategory.findOne({ slug: 'travel' });
    if (travelCategory) {
      // Get all child categories
      const childCategories = await ServiceCategory.find({
        parentCategory: travelCategory._id
      });

      const categoryIds = [travelCategory._id, ...childCategories.map(c => c._id)];

      // Delete services
      const deletedServices = await Product.deleteMany({
        productType: 'service',
        serviceCategory: { $in: categoryIds }
      });
      log.success(`Deleted ${deletedServices.deletedCount} travel services`);

      // Delete child categories (keep parent)
      const deletedCategories = await ServiceCategory.deleteMany({
        parentCategory: travelCategory._id
      });
      log.success(`Deleted ${deletedCategories.deletedCount} travel categories`);
    }
  } catch (error: any) {
    log.error(`Error clearing data: ${error.message}`);
  }
}

// Seed travel service categories
async function seedTravelCategories(): Promise<any[]> {
  log.header('Seeding Travel Service Categories');

  // Get or create parent "Travel" category
  let travelCategory = await ServiceCategory.findOne({ slug: 'travel' });
  if (!travelCategory) {
    travelCategory = await ServiceCategory.create({
      name: 'Travel',
      slug: 'travel',
      description: 'Book trips, save big',
      icon: '✈️',
      iconType: 'emoji',
      cashbackPercentage: 15,
      isActive: true,
      sortOrder: 1,
      serviceCount: 0,
      metadata: {
        color: '#3B82F6',
        tags: ['flights', 'hotels', 'trains', 'bus', 'cab', 'packages']
      }
    });
    log.success('Created Travel parent category');
  }

  const categories = [
    {
      name: 'Flights',
      slug: 'flights',
      description: 'Domestic & International flights',
      icon: '✈️',
      color: '#3B82F6',
      cashback: 15,
      sortOrder: 1
    },
    {
      name: 'Hotels',
      slug: 'hotels',
      description: 'Luxury to Budget hotels',
      icon: '🏨',
      color: '#EC4899',
      cashback: 25,
      sortOrder: 2
    },
    {
      name: 'Trains',
      slug: 'trains',
      description: 'IRCTC train bookings',
      icon: '🚂',
      color: '#22C55E',
      cashback: 10,
      sortOrder: 3
    },
    {
      name: 'Bus',
      slug: 'bus',
      description: 'Intercity bus bookings',
      icon: '🚌',
      color: '#F97316',
      cashback: 15,
      sortOrder: 4
    },
    {
      name: 'Cab',
      slug: 'cab',
      description: 'Intercity cab bookings',
      icon: '🚕',
      color: '#EAB308',
      cashback: 20,
      sortOrder: 5
    },
    {
      name: 'Packages',
      slug: 'packages',
      description: 'Tour packages and holiday deals',
      icon: '🎒',
      color: '#8B5CF6',
      cashback: 22,
      sortOrder: 6
    }
  ];

  const createdCategories = [];
  for (const catData of categories) {
    let category = await ServiceCategory.findOne({ slug: catData.slug });
    if (!category) {
      category = await ServiceCategory.create({
        name: catData.name,
        slug: catData.slug,
        description: catData.description,
        icon: catData.icon,
        iconType: 'emoji',
        cashbackPercentage: catData.cashback,
        isActive: true,
        sortOrder: catData.sortOrder,
        parentCategory: travelCategory._id,
        serviceCount: 0,
        metadata: {
          color: catData.color,
          tags: [catData.slug]
        }
      });
      log.success(`Created category: ${catData.name}`);
    } else {
      log.info(`Category already exists: ${catData.name}`);
    }
    createdCategories.push(category);
  }

  return createdCategories;
}

// Seed travel provider stores
async function seedTravelStores(categories: any[]): Promise<any[]> {
  log.header('Seeding Travel Provider Stores');

  // Try to find an existing merchant
  let merchant = await Merchant.findOne({ email: 'travel@rez.com' });
  if (!merchant) {
    merchant = await Merchant.findOne({ isActive: true });
    if (!merchant) {
      log.warning('No merchant found. Creating stores without merchantId.');
    } else {
      log.info(`Using existing merchant: ${merchant.businessName}`);
    }
  } else {
    log.info('Using existing travel merchant');
  }

  const stores = [
    {
      name: 'SkyWings Airlines',
      slug: 'skywings-airlines',
      description: 'Domestic and international flight bookings',
      category: categories.find(c => c.slug === 'flights'),
      location: {
        address: 'Airport Road, Mumbai',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400099',
        coordinates: [72.8777, 19.0760],
        deliveryRadius: 0 // Online service
      },
      contact: {
        phone: '+919876543210',
        email: 'bookings@skywings.com',
        whatsapp: '+919876543210'
      }
    },
    {
      name: 'Grand Hotels & Resorts',
      slug: 'grand-hotels-resorts',
      description: 'Premium hotel bookings worldwide',
      category: categories.find(c => c.slug === 'hotels'),
      location: {
        address: 'Hotel Street, Delhi',
        city: 'Delhi',
        state: 'Delhi',
        pincode: '110001',
        coordinates: [77.2090, 28.6139],
        deliveryRadius: 0
      },
      contact: {
        phone: '+919876543211',
        email: 'reservations@grandhotels.com',
        whatsapp: '+919876543211'
      }
    },
    {
      name: 'RailConnect',
      slug: 'railconnect',
      description: 'IRCTC train ticket bookings',
      category: categories.find(c => c.slug === 'trains'),
      location: {
        address: 'Railway Station Area, Bangalore',
        city: 'Bangalore',
        state: 'Karnataka',
        pincode: '560001',
        coordinates: [77.5946, 12.9716],
        deliveryRadius: 0
      },
      contact: {
        phone: '+919876543212',
        email: 'bookings@railconnect.com',
        whatsapp: '+919876543212'
      }
    },
    {
      name: 'RoadRunner Bus',
      slug: 'roadrunner-bus',
      description: 'Intercity bus ticket bookings',
      category: categories.find(c => c.slug === 'bus'),
      location: {
        address: 'Bus Terminal, Pune',
        city: 'Pune',
        state: 'Maharashtra',
        pincode: '411001',
        coordinates: [73.8567, 18.5204],
        deliveryRadius: 0
      },
      contact: {
        phone: '+919876543213',
        email: 'bookings@roadrunner.com',
        whatsapp: '+919876543213'
      }
    },
    {
      name: 'CityRide Cabs',
      slug: 'cityride-cabs',
      description: 'Intercity and airport transfer cabs',
      category: categories.find(c => c.slug === 'cab'),
      location: {
        address: 'Taxi Stand, Hyderabad',
        city: 'Hyderabad',
        state: 'Telangana',
        pincode: '500001',
        coordinates: [78.4867, 17.3850],
        deliveryRadius: 0
      },
      contact: {
        phone: '+919876543214',
        email: 'bookings@cityride.com',
        whatsapp: '+919876543214'
      }
    },
    {
      name: 'Wanderlust Tours',
      slug: 'wanderlust-tours',
      description: 'Tour packages and holiday deals',
      category: categories.find(c => c.slug === 'packages'),
      location: {
        address: 'Travel Agency Street, Goa',
        city: 'Goa',
        state: 'Goa',
        pincode: '403001',
        coordinates: [73.8278, 15.2993],
        deliveryRadius: 0
      },
      contact: {
        phone: '+919876543215',
        email: 'packages@wanderlust.com',
        whatsapp: '+919876543215'
      }
    }
  ];

  const createdStores = [];
  for (const storeData of stores) {
    let store = await Store.findOne({ slug: storeData.slug });
    if (!store) {
      // Get general category for store
      const generalCategory = await Category.findOne({ slug: 'travel-experiences' }) ||
        await Category.findOne({ slug: 'general' });

      const storeCreateData: any = {
        name: storeData.name,
        slug: storeData.slug,
        description: storeData.description,
        category: generalCategory?._id,
        location: storeData.location,
        contact: storeData.contact,
        logo: `https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=400`,
        images: [
          'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=400',
          'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=400'
        ],
        ratings: {
          average: 4.5 + Math.random() * 0.5,
          count: Math.floor(Math.random() * 100) + 50,
          distribution: { 5: 40, 4: 30, 3: 20, 2: 5, 1: 5 }
        },
        offers: {
          cashback: storeData.category?.cashbackPercentage || 15,
          isPartner: true,
          partnerLevel: 'gold'
        },
        operationalInfo: {
          hours: {
            monday: { open: '09:00', close: '20:00' },
            tuesday: { open: '09:00', close: '20:00' },
            wednesday: { open: '09:00', close: '20:00' },
            thursday: { open: '09:00', close: '20:00' },
            friday: { open: '09:00', close: '20:00' },
            saturday: { open: '09:00', close: '20:00' },
            sunday: { open: '10:00', close: '18:00' }
          },
          deliveryTime: 'Instant',
          acceptsWalletPayment: true,
          paymentMethods: ['upi', 'card', 'wallet']
        },
        isActive: true,
        isVerified: true
      };

      // Add merchantId only if merchant exists
      if (merchant) {
        storeCreateData.merchantId = merchant._id;
      }

      store = await Store.create(storeCreateData);
      log.success(`Created store: ${storeData.name}`);
    } else {
      log.info(`Store already exists: ${storeData.name}`);
    }
    createdStores.push(store);
  }

  return createdStores;
}

// Seed travel services
async function seedTravelServices(categories: any[], stores: any[]): Promise<number> {
  log.header('Seeding Travel Services');

  const services = [
    // Flights
    {
      name: 'Delhi to Mumbai Flight',
      slug: 'delhi-mumbai-flight',
      description: 'Direct flight from Delhi to Mumbai. All airlines available. Best prices guaranteed.',
      category: categories.find(c => c.slug === 'flights'),
      store: stores.find(s => s.slug === 'skywings-airlines'),
      price: 2499,
      originalPrice: 2999,
      images: ['https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=400'],
      serviceDetails: {
        duration: 120, // 2 hours flight
        serviceType: 'online',
        maxBookingsPerSlot: 50,
        requiresAddress: false,
        requiresPaymentUpfront: true,
        serviceArea: { radius: 0 }
      },
      cashback: 15
    },
    {
      name: 'Bangalore to Goa Flight',
      slug: 'bangalore-goa-flight',
      description: 'Scenic flight from Bangalore to Goa. Perfect for weekend getaways.',
      category: categories.find(c => c.slug === 'flights'),
      store: stores.find(s => s.slug === 'skywings-airlines'),
      price: 1999,
      originalPrice: 2499,
      images: ['https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=400'],
      serviceDetails: {
        duration: 90,
        serviceType: 'online',
        maxBookingsPerSlot: 50,
        requiresAddress: false,
        requiresPaymentUpfront: true,
        serviceArea: { radius: 0 }
      },
      cashback: 18
    },
    {
      name: 'Delhi to Dubai Flight',
      slug: 'delhi-dubai-flight',
      description: 'International flight from Delhi to Dubai. Multiple airlines, best deals.',
      category: categories.find(c => c.slug === 'flights'),
      store: stores.find(s => s.slug === 'skywings-airlines'),
      price: 15999,
      originalPrice: 19999,
      images: ['https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=400'],
      serviceDetails: {
        duration: 240,
        serviceType: 'online',
        maxBookingsPerSlot: 30,
        requiresAddress: false,
        requiresPaymentUpfront: true,
        serviceArea: { radius: 0 }
      },
      cashback: 20
    },
    // Hotels
    {
      name: 'Taj Mahal Palace Hotel',
      slug: 'taj-mahal-palace-hotel',
      description: '5-star luxury hotel in Mumbai. World-class amenities and service.',
      category: categories.find(c => c.slug === 'hotels'),
      store: stores.find(s => s.slug === 'grand-hotels-resorts'),
      price: 12999,
      originalPrice: 16999,
      images: ['https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400'],
      serviceDetails: {
        duration: 480, // Max allowed (8 hours) - represents overnight stay
        serviceType: 'store',
        maxBookingsPerSlot: 20,
        requiresAddress: false,
        requiresPaymentUpfront: true,
        serviceArea: { radius: 0 }
      },
      cashback: 25
    },
    {
      name: 'ITC Grand Hotel',
      slug: 'itc-grand-hotel',
      description: 'Premium 5-star hotel with excellent location and facilities.',
      category: categories.find(c => c.slug === 'hotels'),
      store: stores.find(s => s.slug === 'grand-hotels-resorts'),
      price: 8999,
      originalPrice: 11999,
      images: ['https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=400'],
      serviceDetails: {
        duration: 480, // Max allowed (8 hours) - represents overnight stay
        serviceType: 'store',
        maxBookingsPerSlot: 25,
        requiresAddress: false,
        requiresPaymentUpfront: true,
        serviceArea: { radius: 0 }
      },
      cashback: 22
    },
    {
      name: 'OYO Budget Hotel',
      slug: 'oyo-budget-hotel',
      description: 'Affordable budget hotel with clean rooms and basic amenities.',
      category: categories.find(c => c.slug === 'hotels'),
      store: stores.find(s => s.slug === 'grand-hotels-resorts'),
      price: 999,
      originalPrice: 1499,
      images: ['https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400'],
      serviceDetails: {
        duration: 480, // Max allowed (8 hours) - represents overnight stay
        serviceType: 'store',
        maxBookingsPerSlot: 50,
        requiresAddress: false,
        requiresPaymentUpfront: false,
        serviceArea: { radius: 0 }
      },
      cashback: 30
    },
    // Trains
    {
      name: 'Rajdhani Express Booking',
      slug: 'rajdhani-express-booking',
      description: 'Premium train booking on Rajdhani Express. AC coaches, meals included.',
      category: categories.find(c => c.slug === 'trains'),
      store: stores.find(s => s.slug === 'railconnect'),
      price: 1999,
      originalPrice: 2299,
      images: ['https://images.unsplash.com/photo-1474487548417-781cb71495f3?w=400'],
      serviceDetails: {
        duration: 480, // Max allowed (8 hours) - represents overnight journey
        serviceType: 'online',
        maxBookingsPerSlot: 100,
        requiresAddress: false,
        requiresPaymentUpfront: true,
        serviceArea: { radius: 0 }
      },
      cashback: 10
    },
    {
      name: 'Shatabdi Express Booking',
      slug: 'shatabdi-express-booking',
      description: 'Day train booking on Shatabdi Express. Fast and comfortable.',
      category: categories.find(c => c.slug === 'trains'),
      store: stores.find(s => s.slug === 'railconnect'),
      price: 899,
      originalPrice: 1099,
      images: ['https://images.unsplash.com/photo-1474487548417-781cb71495f3?w=400'],
      serviceDetails: {
        duration: 480, // 8 hours
        serviceType: 'online',
        maxBookingsPerSlot: 150,
        requiresAddress: false,
        requiresPaymentUpfront: true,
        serviceArea: { radius: 0 }
      },
      cashback: 12
    },
    // Bus
    {
      name: 'Volvo AC Sleeper Bus',
      slug: 'volvo-ac-sleeper-bus',
      description: 'Luxury Volvo AC sleeper bus for intercity travel. Comfortable journey with reclining seats.',
      category: categories.find(c => c.slug === 'bus'),
      store: stores.find(s => s.slug === 'roadrunner-bus'),
      price: 999,
      originalPrice: 1299,
      images: ['https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=400'],
      serviceDetails: {
        duration: 480, // 8 hours
        serviceType: 'online',
        maxBookingsPerSlot: 40,
        requiresAddress: false,
        requiresPaymentUpfront: true,
        serviceArea: { radius: 0 }
      },
      cashback: 15
    },
    {
      name: 'Economy Seater Bus',
      slug: 'economy-seater-bus',
      description: 'Affordable economy seater bus for budget travelers. Clean and comfortable.',
      category: categories.find(c => c.slug === 'bus'),
      store: stores.find(s => s.slug === 'roadrunner-bus'),
      price: 499,
      originalPrice: 699,
      images: ['https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=400'],
      serviceDetails: {
        duration: 360, // 6 hours
        serviceType: 'online',
        maxBookingsPerSlot: 50,
        requiresAddress: false,
        requiresPaymentUpfront: true,
        serviceArea: { radius: 0 }
      },
      cashback: 10
    },
    {
      name: 'Delhi to Jaipur AC Bus',
      slug: 'delhi-jaipur-ac-bus',
      description: 'Premium AC bus service from Delhi to Jaipur. Fast and comfortable journey.',
      category: categories.find(c => c.slug === 'bus'),
      store: stores.find(s => s.slug === 'roadrunner-bus'),
      price: 799,
      originalPrice: 999,
      images: ['https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=400'],
      serviceDetails: {
        duration: 300, // 5 hours
        serviceType: 'online',
        maxBookingsPerSlot: 45,
        requiresAddress: false,
        requiresPaymentUpfront: true,
        serviceArea: { radius: 0 }
      },
      cashback: 12
    },
    {
      name: 'Bangalore to Mumbai Sleeper Bus',
      slug: 'bangalore-mumbai-sleeper-bus',
      description: 'Overnight sleeper bus from Bangalore to Mumbai. Perfect for long journeys.',
      category: categories.find(c => c.slug === 'bus'),
      store: stores.find(s => s.slug === 'roadrunner-bus'),
      price: 1299,
      originalPrice: 1599,
      images: ['https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=400'],
      serviceDetails: {
        duration: 600, // 10 hours
        serviceType: 'online',
        maxBookingsPerSlot: 35,
        requiresAddress: false,
        requiresPaymentUpfront: true,
        serviceArea: { radius: 0 }
      },
      cashback: 18
    },
    {
      name: 'Semi Sleeper AC Bus',
      slug: 'semi-sleeper-ac-bus',
      description: 'Comfortable semi-sleeper AC bus with reclining seats. Great value for money.',
      category: categories.find(c => c.slug === 'bus'),
      store: stores.find(s => s.slug === 'roadrunner-bus'),
      price: 699,
      originalPrice: 899,
      images: ['https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=400'],
      serviceDetails: {
        duration: 420, // 7 hours
        serviceType: 'online',
        maxBookingsPerSlot: 42,
        requiresAddress: false,
        requiresPaymentUpfront: true,
        serviceArea: { radius: 0 }
      },
      cashback: 14
    },
    // Cab
    {
      name: 'Outstation Cab Booking',
      slug: 'outstation-cab-booking',
      description: 'Intercity cab booking. Comfortable AC cars for long distance travel.',
      category: categories.find(c => c.slug === 'cab'),
      store: stores.find(s => s.slug === 'cityride-cabs'),
      price: 12, // per km
      originalPrice: 15,
      images: ['https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=400'],
      serviceDetails: {
        duration: 480, // 8 hours
        serviceType: 'online',
        maxBookingsPerSlot: 10,
        requiresAddress: true,
        requiresPaymentUpfront: false,
        serviceArea: { radius: 500 } // 500 km
      },
      cashback: 20
    },
    {
      name: 'Airport Transfer Cab',
      slug: 'airport-transfer-cab',
      description: 'Reliable airport transfer service. On-time pickup and drop.',
      category: categories.find(c => c.slug === 'cab'),
      store: stores.find(s => s.slug === 'cityride-cabs'),
      price: 799,
      originalPrice: 999,
      images: ['https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=400'],
      serviceDetails: {
        duration: 60,
        serviceType: 'home',
        maxBookingsPerSlot: 20,
        requiresAddress: true,
        requiresPaymentUpfront: false,
        serviceArea: { radius: 50 }
      },
      cashback: 15
    },
    // Packages
    {
      name: 'Goa 3N/4D Package',
      slug: 'goa-3n-4d-package',
      description: 'Complete Goa tour package. 3 nights, 4 days. Hotel, meals, sightseeing included.',
      category: categories.find(c => c.slug === 'packages'),
      store: stores.find(s => s.slug === 'wanderlust-tours'),
      price: 9999,
      originalPrice: 13999,
      images: ['https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=400'],
      serviceDetails: {
        duration: 480, // Max allowed (8 hours) - represents multi-day package
        serviceType: 'store',
        maxBookingsPerSlot: 10,
        requiresAddress: false,
        requiresPaymentUpfront: true,
        serviceArea: { radius: 0 }
      },
      cashback: 25
    },
    {
      name: 'Kerala 5N/6D Package',
      slug: 'kerala-5n-6d-package',
      description: 'Beautiful Kerala backwaters tour. 5 nights, 6 days. All inclusive.',
      category: categories.find(c => c.slug === 'packages'),
      store: stores.find(s => s.slug === 'wanderlust-tours'),
      price: 14999,
      originalPrice: 19999,
      images: ['https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=400'],
      serviceDetails: {
        duration: 480, // Max allowed (8 hours) - represents multi-day package
        serviceType: 'store',
        maxBookingsPerSlot: 8,
        requiresAddress: false,
        requiresPaymentUpfront: true,
        serviceArea: { radius: 0 }
      },
      cashback: 22
    },
    {
      name: 'Rajasthan 7N/8D Package',
      slug: 'rajasthan-7n-8d-package',
      description: 'Heritage Rajasthan tour. 7 nights, 8 days. Visit palaces, forts, and deserts.',
      category: categories.find(c => c.slug === 'packages'),
      store: stores.find(s => s.slug === 'wanderlust-tours'),
      price: 19999,
      originalPrice: 25999,
      images: ['https://images.unsplash.com/photo-1477587458883-47145ed94245?w=400'],
      serviceDetails: {
        duration: 480, // Max allowed (8 hours) - represents multi-day package
        serviceType: 'store',
        maxBookingsPerSlot: 5,
        requiresAddress: false,
        requiresPaymentUpfront: true,
        serviceArea: { radius: 0 }
      },
      cashback: 20
    }
  ];

  // Get general category for products
  const generalCategory = await Category.findOne({ slug: 'travel-experiences' }) ||
    await Category.findOne({ slug: 'general' });

  if (!generalCategory) {
    log.error('General category not found. Please seed categories first.');
    return 0;
  }

  let createdCount = 0;
  for (const serviceData of services) {
    if (!serviceData.category || !serviceData.store) continue;

    let service = await Product.findOne({ slug: serviceData.slug });
    if (!service) {
      // Generate SKU
      const sku = `TRV-${serviceData.slug.toUpperCase().replace(/-/g, '')}-${Date.now()}`;

      service = await Product.create({
        name: serviceData.name,
        slug: serviceData.slug,
        description: serviceData.description,
        shortDescription: serviceData.description.substring(0, 150),
        productType: 'service',
        category: generalCategory._id,
        store: serviceData.store._id,
        merchantId: serviceData.store.merchantId || undefined,
        sku,
        images: serviceData.images,
        pricing: {
          original: serviceData.originalPrice,
          selling: serviceData.price,
          discount: Math.round(((serviceData.originalPrice - serviceData.price) / serviceData.originalPrice) * 100),
          currency: 'INR'
        },
        inventory: {
          stock: 999,
          isAvailable: true,
          unlimited: true
        },
        ratings: {
          average: 4.5 + Math.random() * 0.5,
          count: Math.floor(Math.random() * 50) + 20,
          distribution: { 5: 40, 4: 30, 3: 20, 2: 5, 1: 5 }
        },
        specifications: [
          { key: 'Service Type', value: 'Travel Service' },
          { key: 'Duration', value: `${serviceData.serviceDetails.duration} minutes` },
          { key: 'Booking Type', value: serviceData.serviceDetails.serviceType === 'online' ? 'Online' : 'On-site' }
        ],
        tags: [serviceData.category.slug, 'travel', 'verified'],
        seo: {
          title: `${serviceData.name} - Book Now`,
          description: serviceData.description,
          keywords: [serviceData.name, serviceData.category.name, 'travel', 'booking']
        },
        analytics: {
          views: Math.floor(Math.random() * 500) + 100,
          purchases: Math.floor(Math.random() * 100) + 20,
          conversions: 0.15,
          wishlistAdds: Math.floor(Math.random() * 50) + 10,
          shareCount: Math.floor(Math.random() * 30) + 5,
          returnRate: 0.02,
          avgRating: 4.5 + Math.random() * 0.5
        },
        cashback: {
          percentage: serviceData.cashback,
          isActive: true
        },
        serviceDetails: serviceData.serviceDetails,
        serviceCategory: serviceData.category._id,
        isActive: true,
        isFeatured: Math.random() > 0.5,
        isDigital: false
      });

      // Update category service count
      await ServiceCategory.findByIdAndUpdate(serviceData.category._id, {
        $inc: { serviceCount: 1 }
      });

      createdCount++;
      log.success(`Created service: ${serviceData.name}`);
    } else {
      log.info(`Service already exists: ${serviceData.name}`);
    }
  }

  return createdCount;
}

// Main function
async function main(): Promise<void> {
  const startTime = Date.now();

  try {
    log.header('Travel Services Seeder');
    log.info(`Mode: ${shouldClear ? 'Clear & Seed' : 'Seed Only'}`);

    // Connect to database
    await connectDB();

    // Clear existing data if --clear flag is passed
    await clearData();

    log.header('Seeding data');

    // Seed categories
    const categories = await seedTravelCategories();
    log.success(`Seeded ${categories.length} travel categories`);

    // Seed stores
    const stores = await seedTravelStores(categories);
    log.success(`Seeded ${stores.length} travel provider stores`);

    // Seed services
    const servicesCount = await seedTravelServices(categories, stores);
    log.success(`Seeded ${servicesCount} travel services`);

    // Summary
    log.header('Seeding Complete');
    console.log('\nSummary:');
    console.log('┌────────────────────────────┬───────┐');
    console.log('│ Collection                 │ Count │');
    console.log('├────────────────────────────┼───────┤');
    console.log(`│ Travel Categories          │ ${String(categories.length).padStart(5)} │`);
    console.log(`│ Travel Provider Stores     │ ${String(stores.length).padStart(5)} │`);
    console.log(`│ Travel Services            │ ${String(servicesCount).padStart(5)} │`);
    console.log('└────────────────────────────┴───────┘');

    const total = categories.length + stores.length + servicesCount;
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    log.success(`\nTotal documents seeded: ${total}`);
    log.success(`Duration: ${duration}s`);

  } catch (error: any) {
    log.error(`Seeding failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    log.success('Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export default main;
