/**
 * Financial Services Seeds
 * Seeds financial service categories and products (bills, OTT, recharge, gold, insurance, offers)
 */

import mongoose from 'mongoose';
import { ServiceCategory } from '../models/ServiceCategory';
import { Product } from '../models/Product';
import { Store } from '../models/Store';
import { Category } from '../models/Category';
import { connectDatabase } from '../config/database';

// Financial Service Categories
const financialCategorySeeds = [
  // Parent Categories
  {
    name: 'Bills',
    slug: 'bills',
    description: 'Pay electricity, water, gas & utility bills',
    icon: '📄',
    iconType: 'emoji' as const,
    cashbackPercentage: 3,
    maxCashback: 500,
    sortOrder: 1,
    isActive: true,
    metadata: {
      color: '#3B82F6',
      tags: ['utility', 'bills', 'payment'],
    },
  },
  {
    name: 'OTT Plans',
    slug: 'ott',
    description: 'Netflix, Prime, Disney+ & streaming services',
    icon: '📺',
    iconType: 'emoji' as const,
    cashbackPercentage: 10,
    maxCashback: 500,
    sortOrder: 2,
    isActive: true,
    metadata: {
      color: '#EF4444',
      tags: ['streaming', 'entertainment', 'subscription'],
    },
  },
  {
    name: 'Recharge',
    slug: 'recharge',
    description: 'Mobile, DTH & data recharge',
    icon: '📱',
    iconType: 'emoji' as const,
    cashbackPercentage: 3,
    maxCashback: 200,
    sortOrder: 3,
    isActive: true,
    metadata: {
      color: '#22C55E',
      tags: ['mobile', 'recharge', 'prepaid'],
    },
  },
  {
    name: 'Gold',
    slug: 'gold',
    description: 'Digital gold, Gold SIP & savings',
    icon: '🪙',
    iconType: 'emoji' as const,
    cashbackPercentage: 0.5,
    maxCashback: 1000,
    sortOrder: 4,
    isActive: true,
    metadata: {
      color: '#F59E0B',
      tags: ['investment', 'gold', 'savings'],
    },
  },
  {
    name: 'Insurance',
    slug: 'insurance',
    description: 'Health, life, car & travel insurance',
    icon: '🛡️',
    iconType: 'emoji' as const,
    cashbackPercentage: 10,
    maxCashback: 2000,
    sortOrder: 5,
    isActive: true,
    metadata: {
      color: '#8B5CF6',
      tags: ['insurance', 'protection', 'health'],
    },
  },
  {
    name: 'Offers',
    slug: 'offers',
    description: 'Special promotions & cashback offers',
    icon: '🎁',
    iconType: 'emoji' as const,
    cashbackPercentage: 5,
    maxCashback: 1000,
    sortOrder: 6,
    isActive: true,
    metadata: {
      color: '#EC4899',
      tags: ['offers', 'promotions', 'deals'],
    },
  },
];

// Helper function to generate SKU
function generateSKU(name: string): string {
  const prefix = 'FIN';
  const namePart = name
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .substring(0, 6);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}-${namePart}-${random}`;
}

// Helper function to generate slug
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50);
}

/**
 * Create or get platform store for financial services
 */
async function getOrCreatePlatformStore() {
  let store = await Store.findOne({ slug: 'platform-financial-services' });
  
  if (!store) {
    // Find or create a default category
    let category = await Category.findOne({ slug: 'financial-services' });
    if (!category) {
      category = await Category.findOne({ slug: 'services' });
      if (!category) {
        // Create a default category
        category = await Category.create({
          name: 'Financial Services',
          slug: 'financial-services',
          description: 'Financial services and utilities',
          icon: '💳',
          isActive: true,
        });
      }
    }

    // Create platform store
    store = await Store.create({
      name: 'Platform Financial Services',
      slug: 'platform-financial-services',
      description: 'Platform financial services including bills, recharge, OTT, gold, and insurance',
      category: category._id,
      logo: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400',
      banner: ['https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800'],
      location: {
        address: 'Digital Platform, Online Services',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
      },
      contact: {
        email: 'financial@platform.com',
        phone: '+911800123456',
      },
      isActive: true,
      isFeatured: false,
      isVerified: true,
      storeType: 'online',
      tags: ['financial', 'services', 'platform'],
    });
    console.log('   ✅ Created platform store for financial services');
  }
  
  return store;
}

/**
 * Create financial service products
 */
async function createFinancialServiceProducts(categories: any[], store: any, mainCategory: any) {
  const products = [];

  // Bills Services
  const billsCategory = categories.find(c => c.slug === 'bills');
  if (billsCategory) {
    const billServices = [
      {
        name: 'Electricity Bill Payment',
        description: 'Pay your electricity bills instantly. All major providers supported.',
        shortDescription: 'Pay electricity bills with instant cashback',
        cashbackPercentage: 3,
        maxCashback: 500,
        image: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=400',
        tags: ['electricity', 'utility', 'bills'],
      },
      {
        name: 'Water Bill Payment',
        description: 'Pay your water bills online. Quick and secure payment.',
        shortDescription: 'Pay water bills with cashback',
        cashbackPercentage: 3,
        maxCashback: 300,
        image: 'https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?w=400',
        tags: ['water', 'utility', 'bills'],
      },
      {
        name: 'Gas Bill Payment',
        description: 'Pay your gas bills instantly. LPG and PNG supported.',
        shortDescription: 'Pay gas bills with instant processing',
        cashbackPercentage: 4,
        maxCashback: 400,
        image: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400',
        tags: ['gas', 'lpg', 'utility'],
      },
      {
        name: 'Internet Bill Payment',
        description: 'Pay your internet and broadband bills. All ISPs supported.',
        shortDescription: 'Pay internet bills online',
        cashbackPercentage: 3,
        maxCashback: 500,
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400',
        tags: ['internet', 'broadband', 'isp'],
      },
      {
        name: 'Landline Bill Payment',
        description: 'Pay your landline phone bills. BSNL, Airtel, and more.',
        shortDescription: 'Pay landline bills with cashback',
        cashbackPercentage: 2,
        maxCashback: 200,
        image: 'https://images.unsplash.com/photo-1556656793-08538906a9f8?w=400',
        tags: ['landline', 'phone', 'telecom'],
      },
    ];

    for (const service of billServices) {
      const slug = generateSlug(service.name);
      const existingProduct = await Product.findOne({ slug });
      
      if (!existingProduct) {
        const product = await Product.create({
          name: service.name,
          slug,
          description: service.description,
          shortDescription: service.shortDescription,
          productType: 'service',
          category: mainCategory._id,
          serviceCategory: billsCategory._id,
          store: store._id,
          sku: generateSKU(service.name),
          images: [service.image],
          pricing: {
            original: 0, // User enters amount
            selling: 0,
            currency: 'INR',
          },
          inventory: {
            stock: 999,
            isAvailable: true,
            unlimited: true,
          },
          serviceDetails: {
            serviceType: 'online',
            duration: 15, // Minimum 15 minutes (instant processing)
            requiresAddress: false,
            requiresPaymentUpfront: true,
            serviceCategory: billsCategory._id,
          },
          cashback: {
            percentage: service.cashbackPercentage,
            maxAmount: service.maxCashback,
            isActive: true,
          },
          ratings: {
            average: 4.5,
            count: Math.floor(Math.random() * 100) + 10,
            distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
          },
          tags: service.tags,
          isActive: true,
          isFeatured: true,
          isDigital: true,
        });
        products.push(product);
        console.log(`   ✅ Created: ${service.name}`);
      }
    }
  }

  // OTT Plans
  const ottCategory = categories.find(c => c.slug === 'ott');
  if (ottCategory) {
    const ottServices = [
      {
        name: 'Netflix Subscription',
        description: 'Subscribe to Netflix plans. Premium, Standard, and Basic plans available.',
        shortDescription: 'Netflix subscription with special prices',
        cashbackPercentage: 10,
        maxCashback: 500,
        image: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=400',
        tags: ['netflix', 'streaming', 'entertainment'],
      },
      {
        name: 'Amazon Prime Video',
        description: 'Amazon Prime Video subscription. Movies, TV shows, and exclusive content.',
        shortDescription: 'Prime Video subscription with cashback',
        cashbackPercentage: 8,
        maxCashback: 400,
        image: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=400',
        tags: ['prime', 'amazon', 'streaming'],
      },
      {
        name: 'Disney+ Hotstar',
        description: 'Disney+ Hotstar subscription. Sports, movies, and TV shows.',
        shortDescription: 'Hotstar subscription with special offers',
        cashbackPercentage: 10,
        maxCashback: 500,
        image: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=400',
        tags: ['disney', 'hotstar', 'streaming'],
      },
      {
        name: 'Zee5 Subscription',
        description: 'Zee5 premium subscription. Regional and Hindi content.',
        shortDescription: 'Zee5 subscription with cashback',
        cashbackPercentage: 8,
        maxCashback: 300,
        image: 'https://images.unsplash.com/photo-1523206489230-c012c64b2b48?w=400',
        tags: ['zee5', 'streaming', 'regional'],
      },
      {
        name: 'SonyLIV Subscription',
        description: 'SonyLIV premium subscription. Sports and entertainment.',
        shortDescription: 'SonyLIV subscription with offers',
        cashbackPercentage: 7,
        maxCashback: 350,
        image: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=400',
        tags: ['sonyliv', 'streaming', 'sports'],
      },
    ];

    for (const service of ottServices) {
      const slug = generateSlug(service.name);
      const existingProduct = await Product.findOne({ slug });
      
      if (!existingProduct) {
        const product = await Product.create({
          name: service.name,
          slug,
          description: service.description,
          shortDescription: service.shortDescription,
          productType: 'service',
          category: mainCategory._id,
          serviceCategory: ottCategory._id,
          store: store._id,
          sku: generateSKU(service.name),
          images: [service.image],
          pricing: {
            original: 0, // Plan prices vary
            selling: 0,
            currency: 'INR',
          },
          inventory: {
            stock: 999,
            isAvailable: true,
            unlimited: true,
          },
          serviceDetails: {
            serviceType: 'online',
            duration: 15,
            requiresAddress: false,
            requiresPaymentUpfront: true,
            serviceCategory: ottCategory._id,
          },
          cashback: {
            percentage: service.cashbackPercentage,
            maxAmount: service.maxCashback,
            isActive: true,
          },
          ratings: {
            average: 4.6,
            count: Math.floor(Math.random() * 200) + 20,
            distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
          },
          tags: service.tags,
          isActive: true,
          isFeatured: true,
          isDigital: true,
        });
        products.push(product);
        console.log(`   ✅ Created: ${service.name}`);
      }
    }
  }

  // Recharge Services
  const rechargeCategory = categories.find(c => c.slug === 'recharge');
  if (rechargeCategory) {
    const rechargeServices = [
      {
        name: 'Jio Prepaid Recharge',
        description: 'Recharge your Jio prepaid number. All plans available.',
        shortDescription: 'Jio prepaid recharge with cashback',
        cashbackPercentage: 3,
        maxCashback: 200,
        image: 'https://images.unsplash.com/photo-1523206489230-c012c64b2b48?w=400',
        tags: ['jio', 'prepaid', 'recharge'],
      },
      {
        name: 'Airtel Prepaid Recharge',
        description: 'Recharge your Airtel prepaid number. Instant activation.',
        shortDescription: 'Airtel prepaid recharge with offers',
        cashbackPercentage: 3,
        maxCashback: 200,
        image: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=400',
        tags: ['airtel', 'prepaid', 'recharge'],
      },
      {
        name: 'Vi Prepaid Recharge',
        description: 'Recharge your Vi (Vodafone Idea) prepaid number.',
        shortDescription: 'Vi prepaid recharge with cashback',
        cashbackPercentage: 3,
        maxCashback: 200,
        image: 'https://images.unsplash.com/photo-1556656793-08538906a9f8?w=400',
        tags: ['vi', 'vodafone', 'prepaid'],
      },
      {
        name: 'BSNL Prepaid Recharge',
        description: 'Recharge your BSNL prepaid number. All plans supported.',
        shortDescription: 'BSNL prepaid recharge',
        cashbackPercentage: 2,
        maxCashback: 150,
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400',
        tags: ['bsnl', 'prepaid', 'recharge'],
      },
      {
        name: 'DTH Recharge',
        description: 'Recharge your DTH connection. Tata Sky, Dish TV, and more.',
        shortDescription: 'DTH recharge with cashback',
        cashbackPercentage: 3,
        maxCashback: 200,
        image: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=400',
        tags: ['dth', 'tata-sky', 'dish-tv'],
      },
    ];

    for (const service of rechargeServices) {
      const slug = generateSlug(service.name);
      const existingProduct = await Product.findOne({ slug });
      
      if (!existingProduct) {
        const product = await Product.create({
          name: service.name,
          slug,
          description: service.description,
          shortDescription: service.shortDescription,
          productType: 'service',
          category: mainCategory._id,
          serviceCategory: rechargeCategory._id,
          store: store._id,
          sku: generateSKU(service.name),
          images: [service.image],
          pricing: {
            original: 0,
            selling: 0,
            currency: 'INR',
          },
          inventory: {
            stock: 999,
            isAvailable: true,
            unlimited: true,
          },
          serviceDetails: {
            serviceType: 'online',
            duration: 15,
            requiresAddress: false,
            requiresPaymentUpfront: true,
            serviceCategory: rechargeCategory._id,
          },
          cashback: {
            percentage: service.cashbackPercentage,
            maxAmount: service.maxCashback,
            isActive: true,
          },
          ratings: {
            average: 4.7,
            count: Math.floor(Math.random() * 500) + 50,
            distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
          },
          tags: service.tags,
          isActive: true,
          isFeatured: true,
          isDigital: true,
        });
        products.push(product);
        console.log(`   ✅ Created: ${service.name}`);
      }
    }
  }

  // Gold Services
  const goldCategory = categories.find(c => c.slug === 'gold');
  if (goldCategory) {
    const goldServices = [
      {
        name: 'Digital Gold',
        description: 'Buy 24K pure digital gold. Start with just ₹10. Secure storage.',
        shortDescription: 'Buy digital gold with 24K purity',
        cashbackPercentage: 0.5,
        maxCashback: 1000,
        image: 'https://images.unsplash.com/photo-1610375461246-83df859d849d?w=400',
        tags: ['gold', 'investment', 'digital'],
      },
      {
        name: 'Gold SIP',
        description: 'Systematic Investment Plan for gold. Monthly investments.',
        shortDescription: 'Gold SIP for regular savings',
        cashbackPercentage: 1,
        maxCashback: 1000,
        image: 'https://images.unsplash.com/photo-1624365168968-f283d506c6b6?w=400',
        tags: ['gold', 'sip', 'investment'],
      },
    ];

    for (const service of goldServices) {
      const slug = generateSlug(service.name);
      const existingProduct = await Product.findOne({ slug });
      
      if (!existingProduct) {
        const product = await Product.create({
          name: service.name,
          slug,
          description: service.description,
          shortDescription: service.shortDescription,
          productType: 'service',
          category: mainCategory._id,
          serviceCategory: goldCategory._id,
          store: store._id,
          sku: generateSKU(service.name),
          images: [service.image],
          pricing: {
            original: 0,
            selling: 0,
            currency: 'INR',
          },
          inventory: {
            stock: 999,
            isAvailable: true,
            unlimited: true,
          },
          serviceDetails: {
            serviceType: 'online',
            duration: 15,
            requiresAddress: false,
            requiresPaymentUpfront: true,
            serviceCategory: goldCategory._id,
          },
          cashback: {
            percentage: service.cashbackPercentage,
            maxAmount: service.maxCashback,
            isActive: true,
          },
          ratings: {
            average: 4.8,
            count: Math.floor(Math.random() * 300) + 30,
            distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
          },
          tags: service.tags,
          isActive: true,
          isFeatured: true,
          isDigital: true,
        });
        products.push(product);
        console.log(`   ✅ Created: ${service.name}`);
      }
    }
  }

  // Insurance Services
  const insuranceCategory = categories.find(c => c.slug === 'insurance');
  if (insuranceCategory) {
    const insuranceServices = [
      {
        name: 'Health Insurance',
        description: 'Comprehensive health insurance plans. Family and individual coverage.',
        shortDescription: 'Health insurance with cashback',
        cashbackPercentage: 10,
        maxCashback: 2000,
        image: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=400',
        tags: ['health', 'insurance', 'medical'],
      },
      {
        name: 'Life Insurance',
        description: 'Term life insurance plans. Financial protection for your family.',
        shortDescription: 'Life insurance with special offers',
        cashbackPercentage: 12,
        maxCashback: 2000,
        image: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=400',
        tags: ['life', 'insurance', 'term'],
      },
      {
        name: 'Car Insurance',
        description: 'Comprehensive car insurance. Third-party and own damage coverage.',
        shortDescription: 'Car insurance with cashback',
        cashbackPercentage: 8,
        maxCashback: 1500,
        image: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=400',
        tags: ['car', 'vehicle', 'insurance'],
      },
      {
        name: 'Bike Insurance',
        description: 'Two-wheeler insurance plans. Quick renewal and new policies.',
        shortDescription: 'Bike insurance with offers',
        cashbackPercentage: 8,
        maxCashback: 1000,
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400',
        tags: ['bike', 'two-wheeler', 'insurance'],
      },
    ];

    for (const service of insuranceServices) {
      const slug = generateSlug(service.name);
      const existingProduct = await Product.findOne({ slug });
      
      if (!existingProduct) {
        const product = await Product.create({
          name: service.name,
          slug,
          description: service.description,
          shortDescription: service.shortDescription,
          productType: 'service',
          category: mainCategory._id,
          serviceCategory: insuranceCategory._id,
          store: store._id,
          sku: generateSKU(service.name),
          images: [service.image],
          pricing: {
            original: 0,
            selling: 0,
            currency: 'INR',
          },
          inventory: {
            stock: 999,
            isAvailable: true,
            unlimited: true,
          },
          serviceDetails: {
            serviceType: 'online',
            duration: 15,
            requiresAddress: false,
            requiresPaymentUpfront: true,
            serviceCategory: insuranceCategory._id,
          },
          cashback: {
            percentage: service.cashbackPercentage,
            maxAmount: service.maxCashback,
            isActive: true,
          },
          ratings: {
            average: 4.6,
            count: Math.floor(Math.random() * 200) + 20,
            distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
          },
          tags: service.tags,
          isActive: true,
          isFeatured: true,
          isDigital: true,
        });
        products.push(product);
        console.log(`   ✅ Created: ${service.name}`);
      }
    }
  }

  return products;
}

/**
 * Run financial services seeds
 */
async function runFinancialServicesSeeds() {
  try {
    console.log('🌱 Starting financial services seeds...\n');

    // Get or create platform store
    console.log('🏪 Setting up platform store...');
    const store = await getOrCreatePlatformStore();
    console.log(`   ✅ Store ready: ${store.name}\n`);

    // Get or create main category
    console.log('📁 Setting up main category...');
    let mainCategory = await Category.findOne({ slug: 'financial-services' });
    if (!mainCategory) {
      mainCategory = await Category.create({
        name: 'Financial Services',
        slug: 'financial-services',
        description: 'Financial services including bills, recharge, OTT, gold, and insurance',
        icon: '💳',
        isActive: true,
      });
      console.log('   ✅ Created main category');
    } else {
      console.log('   ✅ Found existing category');
    }
    console.log('');

    // Seed Service Categories
    console.log('📂 Seeding Financial Service Categories...');
    const createdCategories = [];
    for (const categoryData of financialCategorySeeds) {
      const category = await ServiceCategory.findOneAndUpdate(
        { slug: categoryData.slug },
        categoryData,
        { upsert: true, new: true }
      );
      createdCategories.push(category);
      console.log(`   ✅ Category: ${category.name}`);
    }
    console.log(`   📊 Total categories: ${createdCategories.length}\n`);

    // Seed Products
    console.log('💳 Seeding Financial Service Products...');
    const products = await createFinancialServiceProducts(createdCategories, store, mainCategory);
    console.log(`   📊 Total products created: ${products.length}\n`);

    // Update service counts
    console.log('📊 Updating service counts...');
    for (const category of createdCategories) {
      const count = await Product.countDocuments({
        serviceCategory: category._id,
        productType: 'service',
        isActive: true,
      });
      await ServiceCategory.findByIdAndUpdate(category._id, {
        serviceCount: count,
      });
      console.log(`   ✅ ${category.name}: ${count} services`);
    }
    console.log('');

    console.log('🎉 Financial services seeds completed successfully!');
    console.log(`   Total categories: ${createdCategories.length}`);
    console.log(`   Total products: ${products.length}`);

  } catch (error) {
    console.error('❌ Error running financial services seeds:', error);
    throw error;
  }
}

// Run seeds if executed directly
if (require.main === module) {
  connectDatabase()
    .then(() => runFinancialServicesSeeds())
    .then(() => {
      console.log('\n✅ Seeding complete. Disconnecting...');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}

export { runFinancialServicesSeeds, financialCategorySeeds };
