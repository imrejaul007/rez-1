/**
 * Script to fix missing price data for products
 * Adds price information to products that don't have it
 */

const mongoose = require('mongoose');
const { Product } = require('../dist/models/Product');
const { Store } = require('../dist/models/Store');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rez-app';
const DB_NAME = process.env.DB_NAME || 'test';

// Price templates by category type
const priceTemplates = {
  food: {
    min: 99,
    max: 499,
    currency: '₹',
    discountRange: [5, 25]
  },
  jewelry: {
    min: 199,
    max: 2999,
    currency: '₹',
    discountRange: [10, 30]
  },
  fashion: {
    min: 299,
    max: 1999,
    currency: '₹',
    discountRange: [15, 40]
  },
  electronics: {
    min: 999,
    max: 49999,
    currency: '₹',
    discountRange: [5, 20]
  },
  default: {
    min: 199,
    max: 999,
    currency: '₹',
    discountRange: [10, 25]
  }
};

// Generate random price within range
function generatePrice(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Determine category type based on product name/category
function getCategoryType(product) {
  const name = product.name.toLowerCase();
  const description = (product.description || '').toLowerCase();

  if (name.includes('chicken') || name.includes('biryani') || name.includes('food') ||
      description.includes('cuisine') || description.includes('restaurant')) {
    return 'food';
  }
  if (name.includes('necklace') || name.includes('jewelry') || name.includes('gold') ||
      name.includes('jewel')) {
    return 'jewelry';
  }
  if (name.includes('shirt') || name.includes('dress') || name.includes('fashion') ||
      name.includes('clothing')) {
    return 'fashion';
  }
  if (name.includes('phone') || name.includes('laptop') || name.includes('electronics') ||
      name.includes('gadget')) {
    return 'electronics';
  }

  return 'default';
}

// Generate price data for a product
function generatePriceData(product) {
  const categoryType = getCategoryType(product);
  const template = priceTemplates[categoryType];

  const current = generatePrice(template.min, template.max);
  const discount = generatePrice(template.discountRange[0], template.discountRange[1]);
  const original = Math.round(current / (1 - discount / 100));

  return {
    current,
    original,
    currency: template.currency,
    discount
  };
}

async function fixProductPrices() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    console.log(`📍 Database: ${DB_NAME}`);
    await mongoose.connect(MONGODB_URI, {
      dbName: DB_NAME
    });
    console.log('✅ Connected to MongoDB');

    // Find products without price data
    console.log('\n🔍 Finding products without price data...');
    const productsWithoutPrice = await Product.find({
      $or: [
        { price: { $exists: false } },
        { 'price.current': { $exists: false } },
        { 'price.current': null },
        { 'price.current': 0 }
      ]
    }).populate('store', 'name slug');

    console.log(`📊 Found ${productsWithoutPrice.length} products without price data\n`);

    if (productsWithoutPrice.length === 0) {
      console.log('✅ All products already have price data!');
      await mongoose.connection.close();
      return;
    }

    // Update each product
    let updated = 0;
    let failed = 0;

    for (const product of productsWithoutPrice) {
      try {
        const priceData = generatePriceData(product);

        console.log(`\n📦 Updating: ${product.name} (${product._id})`);
        console.log(`   Store: ${product.store?.name || 'Unknown'}`);
        console.log(`   Category Type: ${getCategoryType(product)}`);
        console.log(`   New Price: ${priceData.currency}${priceData.current} (${priceData.discount}% OFF from ${priceData.currency}${priceData.original})`);

        await Product.findByIdAndUpdate(
          product._id,
          {
            $set: {
              price: priceData
            }
          },
          { new: true }
        );

        updated++;
        console.log(`   ✅ Updated successfully`);
      } catch (error) {
        failed++;
        console.error(`   ❌ Failed to update: ${error.message}`);
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 Summary:');
    console.log(`   Total products processed: ${productsWithoutPrice.length}`);
    console.log(`   ✅ Successfully updated: ${updated}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log('='.repeat(50));

    // Show sample of updated products
    if (updated > 0) {
      console.log('\n📋 Sample of updated products:');
      const sampleProducts = await Product.find({
        _id: { $in: productsWithoutPrice.slice(0, 5).map(p => p._id) }
      }).populate('store', 'name');

      sampleProducts.forEach((product, index) => {
        console.log(`\n${index + 1}. ${product.name}`);
        console.log(`   Store: ${product.store?.name || 'Unknown'}`);
        console.log(`   Price: ${product.price?.currency}${product.price?.current}`);
        console.log(`   Original: ${product.price?.currency}${product.price?.original}`);
        console.log(`   Discount: ${product.price?.discount}%`);
      });
    }

    console.log('\n✅ Price fix completed!');
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the script
fixProductPrices();
