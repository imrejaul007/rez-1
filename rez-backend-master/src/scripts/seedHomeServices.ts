/**
 * Seed Script for Home Services
 * Seeds: Service Categories, Stores (Service Providers), and Services
 *
 * Run: npx ts-node src/scripts/seedHomeServices.ts
 * Clear & Seed: npx ts-node src/scripts/seedHomeServices.ts --clear
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

// Clear existing home services data
async function clearData() {
  if (!shouldClear) {
    log.info('Skipping data clear (use --clear to clear existing data)');
    return;
  }

  log.header('Clearing existing data');

  try {
    // Find home services category
    const homeServicesCategory = await ServiceCategory.findOne({ slug: 'home-services' });
    if (homeServicesCategory) {
      // Get all child categories
      const childCategories = await ServiceCategory.find({
        parentCategory: homeServicesCategory._id
      });

      const categoryIds = [homeServicesCategory._id, ...childCategories.map(c => c._id)];

      // Delete services
      const deletedServices = await Product.deleteMany({
        productType: 'service',
        serviceCategory: { $in: categoryIds }
      });
      log.success(`Deleted ${deletedServices.deletedCount} services`);

      // Delete child categories (keep parent)
      const deletedCategories = await ServiceCategory.deleteMany({
        parentCategory: homeServicesCategory._id
      });
      log.success(`Deleted ${deletedCategories.deletedCount} service categories`);
    }
  } catch (error: any) {
    log.error(`Error clearing data: ${error.message}`);
  }
}

// Seed service categories
async function seedServiceCategories(): Promise<any[]> {
  log.header('Seeding Service Categories');

  // Get or create parent "Home Services" category
  let homeServicesCategory = await ServiceCategory.findOne({ slug: 'home-services' });
  if (!homeServicesCategory) {
    homeServicesCategory = await ServiceCategory.create({
      name: 'Home Services',
      slug: 'home-services',
      description: 'Professional help at home',
      icon: '🏠',
      iconType: 'emoji',
      cashbackPercentage: 15,
      isActive: true,
      sortOrder: 1,
      serviceCount: 0,
      metadata: {
        color: '#3B82F6',
        tags: ['repair', 'cleaning', 'maintenance']
      }
    });
    log.success('Created Home Services parent category');
  }

  const categories = [
    {
      name: 'Repair Services',
      slug: 'repair',
      description: 'AC, Plumbing, Electrical repairs',
      icon: '🔧',
      color: '#F97316',
      cashback: 15,
      sortOrder: 1
    },
    {
      name: 'Cleaning Services',
      slug: 'cleaning',
      description: 'Deep cleaning, pest control',
      icon: '🧹',
      color: '#22C55E',
      cashback: 20,
      sortOrder: 2
    },
    {
      name: 'Painting',
      slug: 'painting',
      description: 'Interior and exterior painting',
      icon: '🎨',
      color: '#EC4899',
      cashback: 22,
      sortOrder: 3
    },
    {
      name: 'Carpentry',
      slug: 'carpentry',
      description: 'Furniture repair and custom work',
      icon: '🪚',
      color: '#8B5CF6',
      cashback: 18,
      sortOrder: 4
    },
    {
      name: 'Plumbing',
      slug: 'plumbing',
      description: 'Tap repair, pipe fitting',
      icon: '🚿',
      color: '#06B6D4',
      cashback: 15,
      sortOrder: 5
    },
    {
      name: 'Electrical',
      slug: 'electrical',
      description: 'Wiring, fan installation',
      icon: '⚡',
      color: '#EAB308',
      cashback: 20,
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
        parentCategory: homeServicesCategory._id,
        serviceCount: 0,
        metadata: {
          color: catData.color,
          tags: [catData.slug]
        }
      });
      log.success(`Created category: ${catData.name}`);
    } else {
      // Update existing category to ensure it's linked to parent
      if (!category.parentCategory || category.parentCategory.toString() !== homeServicesCategory._id.toString()) {
        await ServiceCategory.findByIdAndUpdate(category._id, {
          parentCategory: homeServicesCategory._id,
          sortOrder: catData.sortOrder,
          isActive: true,
        });
        log.success(`Updated category: ${catData.name} (linked to parent)`);
      } else {
        log.info(`Category already exists: ${catData.name}`);
      }
      // Refresh category to get updated data
      category = await ServiceCategory.findById(category._id);
    }
    createdCategories.push(category);
  }

  return createdCategories;
}

// Seed service provider stores
async function seedServiceStores(categories: any[]): Promise<any[]> {
  log.header('Seeding Service Provider Stores');

  // Try to find an existing merchant, or skip merchant creation
  let merchant = await Merchant.findOne({ email: 'services@rez.com' });
  if (!merchant) {
    // Try to find any existing merchant
    merchant = await Merchant.findOne({ isActive: true });
    if (!merchant) {
      log.warning('No merchant found. Creating stores without merchantId.');
    } else {
      log.info(`Using existing merchant: ${merchant.businessName}`);
    }
  } else {
    log.info('Using existing service provider merchant');
  }

  const stores = [
    {
      name: 'QuickFix Repairs',
      slug: 'quickfix-repairs',
      description: 'Expert repair services for AC, plumbing, and electrical',
      category: categories.find(c => c.slug === 'repair'),
      location: {
        address: '123 Service Street',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        coordinates: [72.8777, 19.0760],
        deliveryRadius: 15
      },
      contact: {
        phone: '+919876543201',
        email: 'info@quickfix.com',
        whatsapp: '+919876543201'
      }
    },
    {
      name: 'Sparkle Clean',
      slug: 'sparkle-clean',
      description: 'Professional deep cleaning and pest control services',
      category: categories.find(c => c.slug === 'cleaning'),
      location: {
        address: '456 Clean Avenue',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400002',
        coordinates: [72.8777, 19.0760],
        deliveryRadius: 20
      },
      contact: {
        phone: '+919876543202',
        email: 'info@sparkleclean.com',
        whatsapp: '+919876543202'
      }
    },
    {
      name: 'ColorCraft Painters',
      slug: 'colorcraft-painters',
      description: 'Interior and exterior painting experts',
      category: categories.find(c => c.slug === 'painting'),
      location: {
        address: '789 Paint Road',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400003',
        coordinates: [72.8777, 19.0760],
        deliveryRadius: 25
      },
      contact: {
        phone: '+919876543203',
        email: 'info@colorcraft.com',
        whatsapp: '+919876543203'
      }
    },
    {
      name: 'WoodWorks Carpentry',
      slug: 'woodworks-carpentry',
      description: 'Custom furniture and repair services',
      category: categories.find(c => c.slug === 'carpentry'),
      location: {
        address: '321 Wood Street',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400004',
        coordinates: [72.8777, 19.0760],
        deliveryRadius: 18
      },
      contact: {
        phone: '+919876543204',
        email: 'info@woodworks.com',
        whatsapp: '+919876543204'
      }
    }
  ];

  const createdStores = [];
  for (const storeData of stores) {
    let store = await Store.findOne({ slug: storeData.slug });
    if (!store) {
      // Get general category for store
      const generalCategory = await Category.findOne({ slug: 'home-services' }) ||
        await Category.findOne({ slug: 'general' });

      const storeCreateData: any = {
        name: storeData.name,
        slug: storeData.slug,
        description: storeData.description,
        category: generalCategory?._id,
        location: storeData.location,
        contact: storeData.contact,
        logo: `https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400`,
        images: [
          'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400',
          'https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=400'
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
            monday: { open: '09:00', close: '18:00' },
            tuesday: { open: '09:00', close: '18:00' },
            wednesday: { open: '09:00', close: '18:00' },
            thursday: { open: '09:00', close: '18:00' },
            friday: { open: '09:00', close: '18:00' },
            saturday: { open: '09:00', close: '18:00' },
            sunday: { open: '10:00', close: '16:00' }
          },
          deliveryTime: 'Same Day',
          acceptsWalletPayment: true,
          paymentMethods: ['upi', 'cash', 'card']
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

// Seed services
async function seedServices(categories: any[], stores: any[]): Promise<number> {
  log.header('Seeding Services');

  const services = [
    // Repair Services
    {
      name: 'AC Repair & Service',
      slug: 'ac-repair-service',
      description: 'Professional AC repair, gas filling, and maintenance',
      category: categories.find(c => c.slug === 'repair'),
      store: stores.find(s => s.slug === 'quickfix-repairs'),
      price: 299,
      originalPrice: 399,
      images: ['https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400'],
      serviceDetails: {
        duration: 120,
        serviceType: 'home',
        maxBookingsPerSlot: 3,
        requiresAddress: true,
        requiresPaymentUpfront: false,
        serviceArea: { radius: 15 }
      },
      cashback: 25
    },
    {
      name: 'Washing Machine Repair',
      slug: 'washing-machine-repair',
      description: 'Expert washing machine repair and maintenance',
      category: categories.find(c => c.slug === 'repair'),
      store: stores.find(s => s.slug === 'quickfix-repairs'),
      price: 349,
      originalPrice: 449,
      images: ['https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=400'],
      serviceDetails: {
        duration: 90,
        serviceType: 'home',
        maxBookingsPerSlot: 4,
        requiresAddress: true,
        requiresPaymentUpfront: false,
        serviceArea: { radius: 15 }
      },
      cashback: 20
    },
    {
      name: 'Refrigerator Repair',
      slug: 'refrigerator-repair',
      description: 'Complete refrigerator repair and gas refill',
      category: categories.find(c => c.slug === 'repair'),
      store: stores.find(s => s.slug === 'quickfix-repairs'),
      price: 399,
      originalPrice: 499,
      images: ['https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=400'],
      serviceDetails: {
        duration: 120,
        serviceType: 'home',
        maxBookingsPerSlot: 3,
        requiresAddress: true,
        requiresPaymentUpfront: false,
        serviceArea: { radius: 15 }
      },
      cashback: 22
    },
    // Cleaning Services
    {
      name: 'Deep Home Cleaning',
      slug: 'deep-home-cleaning',
      description: 'Complete deep cleaning for 3BHK apartment',
      category: categories.find(c => c.slug === 'cleaning'),
      store: stores.find(s => s.slug === 'sparkle-clean'),
      price: 999,
      originalPrice: 1299,
      images: ['https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400'],
      serviceDetails: {
        duration: 240,
        serviceType: 'home',
        maxBookingsPerSlot: 2,
        requiresAddress: true,
        requiresPaymentUpfront: false,
        serviceArea: { radius: 20 }
      },
      cashback: 30
    },
    {
      name: 'Sofa Cleaning',
      slug: 'sofa-cleaning',
      description: 'Professional sofa and upholstery cleaning',
      category: categories.find(c => c.slug === 'cleaning'),
      store: stores.find(s => s.slug === 'sparkle-clean'),
      price: 499,
      originalPrice: 699,
      images: ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400'],
      serviceDetails: {
        duration: 120,
        serviceType: 'home',
        maxBookingsPerSlot: 5,
        requiresAddress: true,
        requiresPaymentUpfront: false,
        serviceArea: { radius: 20 }
      },
      cashback: 25
    },
    {
      name: 'Pest Control Service',
      slug: 'pest-control-service',
      description: 'Complete pest control for home and office',
      category: categories.find(c => c.slug === 'cleaning'),
      store: stores.find(s => s.slug === 'sparkle-clean'),
      price: 799,
      originalPrice: 999,
      images: ['https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400'],
      serviceDetails: {
        duration: 90,
        serviceType: 'home',
        maxBookingsPerSlot: 4,
        requiresAddress: true,
        requiresPaymentUpfront: false,
        serviceArea: { radius: 20 }
      },
      cashback: 20
    },
    // Painting Services
    {
      name: 'Interior Wall Painting',
      slug: 'interior-wall-painting',
      description: 'Professional interior wall painting service',
      category: categories.find(c => c.slug === 'painting'),
      store: stores.find(s => s.slug === 'colorcraft-painters'),
      price: 15, // per sqft
      originalPrice: 20,
      images: ['https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=400'],
      serviceDetails: {
        duration: 480,
        serviceType: 'home',
        maxBookingsPerSlot: 1,
        requiresAddress: true,
        requiresPaymentUpfront: true,
        serviceArea: { radius: 25 }
      },
      cashback: 20
    },
    {
      name: 'Exterior Wall Painting',
      slug: 'exterior-wall-painting',
      description: 'Weather-resistant exterior painting',
      category: categories.find(c => c.slug === 'painting'),
      store: stores.find(s => s.slug === 'colorcraft-painters'),
      price: 18, // per sqft
      originalPrice: 25,
      images: ['https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=400'],
      serviceDetails: {
        duration: 480, // Max allowed is 480 minutes (8 hours)
        serviceType: 'home',
        maxBookingsPerSlot: 1,
        requiresAddress: true,
        requiresPaymentUpfront: true,
        serviceArea: { radius: 25 }
      },
      cashback: 18
    },
    // Carpentry Services
    {
      name: 'Furniture Repair',
      slug: 'furniture-repair',
      description: 'Expert furniture repair and restoration',
      category: categories.find(c => c.slug === 'carpentry'),
      store: stores.find(s => s.slug === 'woodworks-carpentry'),
      price: 399,
      originalPrice: 599,
      images: ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400'],
      serviceDetails: {
        duration: 180,
        serviceType: 'home',
        maxBookingsPerSlot: 3,
        requiresAddress: true,
        requiresPaymentUpfront: false,
        serviceArea: { radius: 18 }
      },
      cashback: 22
    },
    {
      name: 'Custom Furniture Making',
      slug: 'custom-furniture-making',
      description: 'Custom furniture design and manufacturing',
      category: categories.find(c => c.slug === 'carpentry'),
      store: stores.find(s => s.slug === 'woodworks-carpentry'),
      price: 2999,
      originalPrice: 3999,
      images: ['https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400'],
      serviceDetails: {
        duration: 480, // Max allowed is 480 minutes (8 hours)
        serviceType: 'home',
        maxBookingsPerSlot: 1,
        requiresAddress: true,
        requiresPaymentUpfront: true,
        serviceArea: { radius: 18 }
      },
      cashback: 15
    },
    // Plumbing Services
    {
      name: 'Tap Repair & Installation',
      slug: 'tap-repair-installation',
      description: 'Tap repair, replacement, and installation',
      category: categories.find(c => c.slug === 'plumbing'),
      store: stores.find(s => s.slug === 'quickfix-repairs'),
      price: 199,
      originalPrice: 299,
      images: ['https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=400'],
      serviceDetails: {
        duration: 60,
        serviceType: 'home',
        maxBookingsPerSlot: 5,
        requiresAddress: true,
        requiresPaymentUpfront: false,
        serviceArea: { radius: 15 }
      },
      cashback: 25
    },
    {
      name: 'Pipe Fitting & Installation',
      slug: 'pipe-fitting-installation',
      description: 'Pipe fitting, repair, and installation services',
      category: categories.find(c => c.slug === 'plumbing'),
      store: stores.find(s => s.slug === 'quickfix-repairs'),
      price: 349,
      originalPrice: 499,
      images: ['https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=400'],
      serviceDetails: {
        duration: 120,
        serviceType: 'home',
        maxBookingsPerSlot: 3,
        requiresAddress: true,
        requiresPaymentUpfront: false,
        serviceArea: { radius: 15 }
      },
      cashback: 20
    },
    // Electrical Services
    {
      name: 'Electrical Wiring',
      slug: 'electrical-wiring',
      description: 'Complete electrical wiring and installation',
      category: categories.find(c => c.slug === 'electrical'),
      store: stores.find(s => s.slug === 'quickfix-repairs'),
      price: 499,
      originalPrice: 699,
      images: ['https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=400'],
      serviceDetails: {
        duration: 180,
        serviceType: 'home',
        maxBookingsPerSlot: 2,
        requiresAddress: true,
        requiresPaymentUpfront: true,
        serviceArea: { radius: 15 }
      },
      cashback: 20
    },
    {
      name: 'Fan Installation',
      slug: 'fan-installation',
      description: 'Ceiling fan installation and repair',
      category: categories.find(c => c.slug === 'electrical'),
      store: stores.find(s => s.slug === 'quickfix-repairs'),
      price: 299,
      originalPrice: 399,
      images: ['https://images.unsplash.com/photo-1563453392212-326f5e854473?w=400'],
      serviceDetails: {
        duration: 90,
        serviceType: 'home',
        maxBookingsPerSlot: 4,
        requiresAddress: true,
        requiresPaymentUpfront: false,
        serviceArea: { radius: 15 }
      },
      cashback: 25
    }
  ];

  // Get general category for products
  const generalCategory = await Category.findOne({ slug: 'home-services' }) ||
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
      const sku = `SVC-${serviceData.slug.toUpperCase().replace(/-/g, '')}-${Date.now()}`;

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
          { key: 'Service Type', value: 'Home Service' },
          { key: 'Duration', value: `${serviceData.serviceDetails.duration} minutes` },
          { key: 'Service Area', value: `${serviceData.serviceDetails.serviceArea.radius} km radius` }
        ],
        tags: [serviceData.category.slug, 'home-service', 'verified'],
        seo: {
          title: `${serviceData.name} - Professional Home Service`,
          description: serviceData.description,
          keywords: [serviceData.name, serviceData.category.name, 'home service']
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
    log.header('Home Services Seeder');
    log.info(`Mode: ${shouldClear ? 'Clear & Seed' : 'Seed Only'}`);

    // Connect to database
    await connectDB();

    // Clear existing data if --clear flag is passed
    await clearData();

    log.header('Seeding data');

    // Seed categories
    const categories = await seedServiceCategories();
    log.success(`Seeded ${categories.length} service categories`);

    // Seed stores
    const stores = await seedServiceStores(categories);
    log.success(`Seeded ${stores.length} service provider stores`);

    // Seed services
    const servicesCount = await seedServices(categories, stores);
    log.success(`Seeded ${servicesCount} services`);

    // Summary
    log.header('Seeding Complete');
    console.log('\nSummary:');
    console.log('┌────────────────────────────┬───────┐');
    console.log('│ Collection                 │ Count │');
    console.log('├────────────────────────────┼───────┤');
    console.log(`│ Service Categories         │ ${String(categories.length).padStart(5)} │`);
    console.log(`│ Service Provider Stores    │ ${String(stores.length).padStart(5)} │`);
    console.log(`│ Services                   │ ${String(servicesCount).padStart(5)} │`);
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
