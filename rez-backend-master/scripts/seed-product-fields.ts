/**
 * Product Fields Seeder Script
 *
 * This script checks and seeds the new product fields:
 * - cashback configuration
 * - deliveryInfo
 * - analytics (todayPurchases, todayViews)
 * - bundleProducts
 * - frequentlyBoughtWith
 */

import mongoose from 'mongoose';
import { Product } from '../src/models/Product';
import { Category } from '../src/models/Category';
import { Store } from '../src/models/Store';

// MongoDB connection from environment
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };
const DB_NAME = 'test';

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI, {
      dbName: DB_NAME
    });
    console.log(`${colors.green}✅ Connected to MongoDB${colors.reset}`);
    console.log(`${colors.cyan}📍 Database: ${DB_NAME}${colors.reset}\n`);
  } catch (error) {
    console.error(`${colors.red}❌ MongoDB connection failed:${colors.reset}`, error);
    process.exit(1);
  }
}

async function checkExistingProducts() {
  console.log(`${colors.bright}${colors.blue}═══════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bright}📊 CHECKING EXISTING PRODUCTS${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}═══════════════════════════════════════════════════${colors.reset}\n`);

  const totalProducts = await Product.countDocuments();
  console.log(`${colors.cyan}Total products in database: ${colors.bright}${totalProducts}${colors.reset}`);

  // Check products with new fields
  const withCashback = await Product.countDocuments({ 'cashback.percentage': { $exists: true } });
  const withDeliveryInfo = await Product.countDocuments({ 'deliveryInfo.estimatedDays': { $exists: true } });
  const withTodayAnalytics = await Product.countDocuments({ 'analytics.todayPurchases': { $exists: true } });
  const withBundles = await Product.countDocuments({ bundleProducts: { $exists: true, $ne: [] } });
  const withFrequentlyBought = await Product.countDocuments({ frequentlyBoughtWith: { $exists: true, $ne: [] } });

  console.log(`\n${colors.yellow}Field Status:${colors.reset}`);
  console.log(`  Cashback configured:     ${withCashback}/${totalProducts} ${withCashback === totalProducts ? '✅' : '⚠️'}`);
  console.log(`  Delivery info set:       ${withDeliveryInfo}/${totalProducts} ${withDeliveryInfo === totalProducts ? '✅' : '⚠️'}`);
  console.log(`  Today analytics:         ${withTodayAnalytics}/${totalProducts} ${withTodayAnalytics === totalProducts ? '✅' : '⚠️'}`);
  console.log(`  Bundle products:         ${withBundles}/${totalProducts}`);
  console.log(`  Frequently bought with:  ${withFrequentlyBought}/${totalProducts}`);

  const needsUpdate = withCashback < totalProducts ||
                      withDeliveryInfo < totalProducts ||
                      withTodayAnalytics < totalProducts;

  return {
    totalProducts,
    withCashback,
    withDeliveryInfo,
    withTodayAnalytics,
    needsUpdate
  };
}

async function seedProductFields() {
  console.log(`\n${colors.bright}${colors.green}═══════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bright}🌱 SEEDING NEW PRODUCT FIELDS${colors.reset}`);
  console.log(`${colors.bright}${colors.green}═══════════════════════════════════════════════════${colors.reset}\n`);

  let updatedCount = 0;
  let errorCount = 0;

  try {
    const products = await Product.find()
      .populate('category', 'name')
      .populate('store', 'name location');

    for (const product of products) {
      let hasUpdates = false;

      // Add cashback if missing
      if (!product.cashback || !product.cashback.percentage) {
        // Dynamic cashback based on price
        const price = product.pricing?.selling || 0;
        let percentage = 5; // Default 5%

        if (price > 1000) percentage = 10;
        if (price > 5000) percentage = 15;
        if (price < 100) percentage = 3;

        const maxCashback = Math.max(Math.min(percentage * price / 100, 1000), 10); // Cap at 1000, min 10
        product.cashback = {
          percentage,
          maxAmount: maxCashback,
          minPurchase: price < 100 ? 0 : 100,
          validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
          terms: `Get ${percentage}% cashback on this product. Maximum cashback ₹${Math.floor(maxCashback)}.`
        };
        hasUpdates = true;
        console.log(`${colors.green}  ✓ Added cashback (${percentage}%) to: ${product.name}${colors.reset}`);
      }

      // Add delivery info if missing
      if (!product.deliveryInfo || !product.deliveryInfo.estimatedDays) {
        const categoryName = (product.category as any)?.name?.toLowerCase() || '';
        const stock = product.inventory?.stock || 0;

        let estimatedDays = '2-3 days';
        let expressAvailable = false;
        let expressTime = '4-6 hours';

        // Category-based delivery times
        if (categoryName.includes('food') || categoryName.includes('grocery')) {
          estimatedDays = 'Same day';
          expressAvailable = true;
          expressTime = 'Under 30min';
        } else if (categoryName.includes('fashion') || categoryName.includes('clothing')) {
          estimatedDays = '1-2 days';
          expressAvailable = true;
          expressTime = '2-4 hours';
        } else if (categoryName.includes('electronics')) {
          estimatedDays = stock > 10 ? '1-2 days' : '3-4 days';
          expressAvailable = stock > 10;
        } else if (categoryName.includes('furniture')) {
          estimatedDays = '5-7 days';
          expressAvailable = false;
        }

        // Stock-based adjustments
        if (stock === 0) {
          estimatedDays = '7-10 days'; // Out of stock - longer wait
        } else if (stock < 5) {
          estimatedDays = '4-5 days'; // Low stock
        }

        product.deliveryInfo = {
          estimatedDays,
          freeShippingThreshold: product.pricing?.selling > 1000 ? 0 : 499,
          expressAvailable,
          standardDeliveryTime: estimatedDays,
          expressDeliveryTime: expressTime,
          deliveryPartner: expressAvailable ? 'Express Logistics' : 'Standard Shipping'
        };
        hasUpdates = true;
        console.log(`${colors.blue}  ✓ Added delivery info (${estimatedDays}) to: ${product.name}${colors.reset}`);
      }

      // Add today's analytics if missing
      if (product.analytics && (!product.analytics.todayPurchases || !product.analytics.lastResetDate)) {
        // Generate realistic numbers based on product popularity
        const rating = product.ratings?.average || 0;
        const price = product.pricing?.selling || 0;

        // Higher rated and reasonably priced items sell more
        let basePurchases = Math.floor(rating * 10);
        if (price < 500) basePurchases *= 2;
        if (price > 5000) basePurchases = Math.floor(basePurchases / 2);

        product.analytics.todayPurchases = basePurchases + Math.floor(Math.random() * 50);
        product.analytics.todayViews = product.analytics.todayPurchases * (5 + Math.floor(Math.random() * 10));
        product.analytics.lastResetDate = new Date();
        hasUpdates = true;
        console.log(`${colors.magenta}  ✓ Added today's analytics (${product.analytics.todayPurchases} sales) to: ${product.name}${colors.reset}`);
      }

      // Add bundle products (for some products)
      if (!product.bundleProducts || product.bundleProducts.length === 0) {
        // 30% chance to have bundle products
        if (Math.random() < 0.3) {
          // Find related products from same category
          const relatedProducts = await Product.find({
            category: product.category,
            _id: { $ne: product._id },
            isActive: true
          }).limit(2).select('_id');

          if (relatedProducts.length > 0) {
            product.bundleProducts = relatedProducts.map(p => p._id);
            hasUpdates = true;
            console.log(`${colors.cyan}  ✓ Added ${relatedProducts.length} bundle products to: ${product.name}${colors.reset}`);
          }
        }
      }

      // Add frequently bought together (for popular products)
      if (!product.frequentlyBoughtWith || product.frequentlyBoughtWith.length === 0) {
        // For products with good ratings
        if (product.ratings?.average > 3.5) {
          const frequentProducts = await Product.find({
            category: product.category,
            _id: { $ne: product._id },
            'ratings.average': { $gte: 3 }
          }).limit(3).select('_id');

          if (frequentProducts.length > 0) {
            product.frequentlyBoughtWith = frequentProducts.map(p => ({
              productId: p._id,
              purchaseCount: Math.floor(Math.random() * 100) + 10,
              lastUpdated: new Date()
            }));
            hasUpdates = true;
            console.log(`${colors.yellow}  ✓ Added ${frequentProducts.length} frequently bought items to: ${product.name}${colors.reset}`);
          }
        }
      }

      // Save if there were updates
      if (hasUpdates) {
        await product.save();
        updatedCount++;
      }
    }

    console.log(`\n${colors.bright}${colors.green}✅ Successfully updated ${updatedCount} products${colors.reset}`);

  } catch (error) {
    console.error(`${colors.red}❌ Error during seeding:${colors.reset}`, error);
    errorCount++;
  }

  return { updatedCount, errorCount };
}

async function createSampleProducts() {
  console.log(`\n${colors.bright}${colors.magenta}═══════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bright}🆕 CREATING SAMPLE PRODUCTS (IF NEEDED)${colors.reset}`);
  console.log(`${colors.bright}${colors.magenta}═══════════════════════════════════════════════════${colors.reset}\n`);

  const productCount = await Product.countDocuments();

  if (productCount > 0) {
    console.log(`${colors.cyan}Database already has ${productCount} products. Skipping sample creation.${colors.reset}`);
    return;
  }

  console.log(`${colors.yellow}No products found. Creating sample products...${colors.reset}`);

  // Create sample category and store if needed
  let category = await Category.findOne();
  if (!category) {
    category = await Category.create({
      name: 'Electronics',
      slug: 'electronics',
      description: 'Electronic gadgets and accessories',
      isActive: true
    });
    console.log(`${colors.green}✓ Created sample category: Electronics${colors.reset}`);
  }

  let store = await Store.findOne();
  if (!store) {
    store = await Store.create({
      name: 'TechHub Store',
      slug: 'techhub-store',
      description: 'Your one-stop tech shop',
      logo: 'https://via.placeholder.com/150',
      location: {
        address: '123 Tech Street',
        city: 'Bangalore',
        state: 'Karnataka',
        country: 'India',
        pincode: '560001'
      },
      isActive: true
    });
    console.log(`${colors.green}✓ Created sample store: TechHub Store${colors.reset}`);
  }

  // Sample products with new fields
  const sampleProducts = [
    {
      name: 'Margherita Pizza',
      slug: 'margherita-pizza',
      description: 'Classic margherita pizza with fresh basil and mozzarella',
      category: category._id,
      store: store._id,
      sku: 'PIZZA-001',
      images: ['https://via.placeholder.com/500'],
      pricing: {
        original: 399,
        selling: 299,
        discount: 25,
        currency: 'INR'
      },
      inventory: {
        stock: 50,
        isAvailable: true,
        lowStockThreshold: 10
      },
      ratings: {
        average: 4.7,
        count: 300,
        distribution: { 5: 200, 4: 70, 3: 20, 2: 7, 1: 3 }
      },
      cashback: {
        percentage: 10,
        maxAmount: 30,
        minPurchase: 200
      },
      deliveryInfo: {
        estimatedDays: 'Under 30min',
        freeShippingThreshold: 399,
        expressAvailable: true,
        standardDeliveryTime: '30-45 min',
        expressDeliveryTime: 'Under 30min'
      },
      analytics: {
        views: 1500,
        purchases: 300,
        todayPurchases: 45,
        todayViews: 230,
        lastResetDate: new Date()
      },
      isActive: true,
      isFeatured: true
    },
    {
      name: 'Trendy Summer Dress',
      slug: 'trendy-summer-dress',
      description: 'Light and comfortable summer dress perfect for any occasion',
      category: category._id,
      store: store._id,
      sku: 'DRESS-001',
      images: ['https://via.placeholder.com/500'],
      pricing: {
        original: 2999,
        selling: 1999,
        discount: 33,
        currency: 'INR'
      },
      inventory: {
        stock: 25,
        isAvailable: true,
        lowStockThreshold: 5
      },
      ratings: {
        average: 4.5,
        count: 150,
        distribution: { 5: 90, 4: 40, 3: 15, 2: 3, 1: 2 }
      },
      cashback: {
        percentage: 15,
        maxAmount: 300,
        minPurchase: 1000
      },
      deliveryInfo: {
        estimatedDays: '1-2 days',
        freeShippingThreshold: 999,
        expressAvailable: true,
        standardDeliveryTime: '2-3 days',
        expressDeliveryTime: '1 day'
      },
      analytics: {
        views: 800,
        purchases: 150,
        todayPurchases: 28,
        todayViews: 145,
        lastResetDate: new Date()
      },
      isActive: true,
      isFeatured: true
    },
    {
      name: 'Wireless Bluetooth Headphones',
      slug: 'wireless-bluetooth-headphones',
      description: 'Premium noise-cancelling wireless headphones with 30hr battery',
      category: category._id,
      store: store._id,
      sku: 'HEADPHONE-001',
      images: ['https://via.placeholder.com/500'],
      pricing: {
        original: 5999,
        selling: 3999,
        discount: 33,
        currency: 'INR'
      },
      inventory: {
        stock: 100,
        isAvailable: true,
        lowStockThreshold: 20
      },
      ratings: {
        average: 4.8,
        count: 500,
        distribution: { 5: 400, 4: 70, 3: 20, 2: 7, 1: 3 }
      },
      cashback: {
        percentage: 12,
        maxAmount: 500,
        minPurchase: 2000
      },
      deliveryInfo: {
        estimatedDays: '2-3 days',
        freeShippingThreshold: 2999,
        expressAvailable: true,
        standardDeliveryTime: '3-4 days',
        expressDeliveryTime: '1-2 days'
      },
      analytics: {
        views: 2500,
        purchases: 500,
        todayPurchases: 67,
        todayViews: 420,
        lastResetDate: new Date()
      },
      isActive: true,
      isFeatured: true
    }
  ];

  for (const productData of sampleProducts) {
    const product = await Product.create(productData);
    console.log(`${colors.green}✓ Created product: ${product.name}${colors.reset}`);
  }

  console.log(`\n${colors.bright}${colors.green}✅ Created ${sampleProducts.length} sample products with all new fields${colors.reset}`);
}

async function verifyUpdates() {
  console.log(`\n${colors.bright}${colors.cyan}═══════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bright}🔍 VERIFICATION${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}═══════════════════════════════════════════════════${colors.reset}\n`);

  // Sample a few products to show the updates
  const samples = await Product.find()
    .limit(3)
    .select('name cashback deliveryInfo analytics.todayPurchases analytics.todayViews bundleProducts frequentlyBoughtWith');

  console.log(`${colors.yellow}Sample Products After Update:${colors.reset}\n`);

  for (const product of samples) {
    console.log(`${colors.bright}📦 ${product.name}${colors.reset}`);
    console.log(`   Cashback: ${product.cashback?.percentage || 0}% (Max: ₹${product.cashback?.maxAmount || 0})`);
    console.log(`   Delivery: ${product.deliveryInfo?.estimatedDays || 'Not set'}`);
    console.log(`   Today's Sales: ${product.analytics?.todayPurchases || 0}`);
    console.log(`   Today's Views: ${product.analytics?.todayViews || 0}`);
    console.log(`   Bundle Products: ${product.bundleProducts?.length || 0}`);
    console.log(`   Frequently Bought: ${product.frequentlyBoughtWith?.length || 0}`);
    console.log();
  }
}

async function main() {
  try {
    console.log(`${colors.bright}${colors.magenta}🚀 PRODUCT FIELD SEEDER SCRIPT${colors.reset}`);
    console.log(`${colors.bright}${colors.magenta}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

    // Connect to MongoDB
    await connectDB();

    // Check existing products
    const status = await checkExistingProducts();

    if (status.totalProducts === 0) {
      // No products, create samples
      await createSampleProducts();
      // Re-check status
      await checkExistingProducts();
    }

    if (status.needsUpdate) {
      // Seed the new fields
      const result = await seedProductFields();

      // Verify updates
      await verifyUpdates();

      console.log(`\n${colors.bright}${colors.green}═══════════════════════════════════════════════════${colors.reset}`);
      console.log(`${colors.bright}✨ SEEDING COMPLETE${colors.reset}`);
      console.log(`${colors.bright}${colors.green}═══════════════════════════════════════════════════${colors.reset}`);
      console.log(`${colors.cyan}Products updated: ${result.updatedCount}${colors.reset}`);
      console.log(`${colors.cyan}Errors: ${result.errorCount}${colors.reset}`);
    } else {
      console.log(`\n${colors.green}✅ All products already have the new fields!${colors.reset}`);
      await verifyUpdates();
    }

    // Disconnect
    await mongoose.disconnect();
    console.log(`\n${colors.cyan}📤 Database connection closed${colors.reset}`);
    console.log(`${colors.bright}${colors.green}✅ Script completed successfully!${colors.reset}`);

  } catch (error) {
    console.error(`${colors.red}❌ Fatal Error:${colors.reset}`, error);
    process.exit(1);
  }
}

// Run the seeder
main().catch(console.error);