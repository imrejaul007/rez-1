/**
 * Script to check product data in MongoDB
 * This script queries the database to see what fields are actually present
 */

import mongoose from 'mongoose';
import { Product } from '../src/models/Product';
import '../src/models/Store'; // Register Store model
import '../src/models/Category'; // Register Category model

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };
const DB_NAME = 'test';

async function checkProductData() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      dbName: DB_NAME,
    });
    console.log('✅ Connected to MongoDB\n');

    // Find products with "pizza" in the name
    console.log('🔍 Searching for products with "pizza" in name...');
    const pizzaProducts = await Product.find({
      name: { $regex: 'pizza', $options: 'i' }
    })
    .populate('store', 'name logo location contact ratings operationalInfo')
    .populate('category', 'name slug type')
    .limit(5)
    .lean();

    console.log(`\n📦 Found ${pizzaProducts.length} pizza products:\n`);

    for (const product of pizzaProducts) {
      console.log('═══════════════════════════════════════════════════════════');
      console.log(`📌 Product: ${product.name}`);
      console.log('═══════════════════════════════════════════════════════════');
      console.log('\n📝 Basic Info:');
      console.log('  Name:', product.name);
      console.log('  Description:', product.description?.substring(0, 80) + '...' || 'N/A');
      console.log('  SKU:', product.sku);
      console.log('  Product Type:', product.productType || 'NOT SET');

      console.log('\n💰 Pricing:');
      console.log('  Selling Price:', product.pricing?.selling || 'N/A');
      console.log('  Original Price:', product.pricing?.original || 'N/A');
      console.log('  Discount:', product.pricing?.discount ? `${product.pricing.discount}%` : 'N/A');
      console.log('  Currency:', product.pricing?.currency || 'N/A');

      console.log('\n⭐ Ratings:');
      console.log('  Average:', product.ratings?.average || 0);
      console.log('  Count:', product.ratings?.count || 0);
      console.log('  Distribution:', product.ratings?.distribution || 'N/A');

      console.log('\n📦 Inventory:');
      console.log('  Stock:', product.inventory?.stock || 0);
      console.log('  Available:', product.inventory?.isAvailable || false);
      console.log('  Low Stock Threshold:', product.inventory?.lowStockThreshold || 'N/A');

      console.log('\n🚚 Delivery Info:');
      console.log('  Estimated Days:', product.deliveryInfo?.estimatedDays || 'NOT SET');
      console.log('  Standard Delivery:', product.deliveryInfo?.standardDeliveryTime || 'NOT SET');
      console.log('  Express Available:', product.deliveryInfo?.expressAvailable || false);
      console.log('  Express Delivery:', product.deliveryInfo?.expressDeliveryTime || 'NOT SET');

      console.log('\n💸 Cashback:');
      console.log('  Percentage:', product.cashback?.percentage ? `${product.cashback.percentage}%` : 'NOT SET');
      console.log('  Max Amount:', product.cashback?.maxAmount || 'NOT SET');
      console.log('  Min Purchase:', product.cashback?.minPurchase || 'NOT SET');

      console.log('\n📊 Analytics:');
      console.log('  Total Views:', product.analytics?.views || 0);
      console.log('  Total Purchases:', product.analytics?.purchases || 0);
      console.log('  Today Purchases:', product.analytics?.todayPurchases || 0);
      console.log('  Today Views:', product.analytics?.todayViews || 0);
      console.log('  Wishlist Adds:', product.analytics?.wishlistAdds || 0);

      console.log('\n🏪 Store Info:');
      const store = product.store as any;
      if (store) {
        console.log('  Store Name:', store.name || 'N/A');
        console.log('  Location Address:', store.location?.address || 'NOT SET');
        console.log('  Location City:', store.location?.city || 'NOT SET');
        console.log('  Location State:', store.location?.state || 'NOT SET');
        console.log('  Coordinates:', store.location?.coordinates || 'NOT SET');
        console.log('  Delivery Time:', store.operationalInfo?.deliveryTime || 'NOT SET');
        console.log('  Store Ratings:', store.ratings?.average || 0);
        console.log('  Store Review Count:', store.ratings?.count || 0);
      } else {
        console.log('  ⚠️ Store data not populated or missing');
      }

      console.log('\n🏷️ Category:');
      const category = product.category as any;
      if (category) {
        console.log('  Name:', category.name || 'N/A');
        console.log('  Slug:', category.slug || 'N/A');
        console.log('  Type:', category.type || 'N/A');
      } else {
        console.log('  ⚠️ Category data not populated or missing');
      }

      console.log('\n📷 Images:');
      console.log('  Count:', product.images?.length || 0);
      if (product.images && product.images.length > 0) {
        console.log('  First Image:', product.images[0].substring(0, 80) + '...');
      }

      console.log('\n');
    }

    // Check if there are any products at all
    const totalProducts = await Product.countDocuments();
    console.log(`\n📊 Total products in database: ${totalProducts}`);

    // Sample a few products to see their structure
    console.log('\n🔍 Sampling first 3 products from database...\n');
    const sampleProducts = await Product.find()
      .limit(3)
      .lean();

    sampleProducts.forEach((prod: any, idx: number) => {
      console.log(`${idx + 1}. ${prod.name} (${prod.sku})`);
      console.log(`   Type: ${prod.productType || 'NOT SET'}`);
      console.log(`   Price: ₹${prod.pricing?.selling || 'N/A'}`);
      console.log(`   Rating: ${prod.ratings?.average || 0} (${prod.ratings?.count || 0} reviews)`);
      console.log(`   Stock: ${prod.inventory?.stock || 0}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error occurred:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

checkProductData();
