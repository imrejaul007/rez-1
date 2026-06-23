/**
 * Script to categorize existing products as 'product' or 'service'
 * based on their category names
 */

import mongoose from 'mongoose';
import { Product } from '../src/models/Product';
import '../src/models/Category'; // Import to register the model

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };
const DB_NAME = 'test';

// Categories that represent services
const SERVICE_CATEGORIES = [
  'salon',
  'spa',
  'healthcare',
  'health',
  'fitness',
  'gym',
  'yoga',
  'massage',
  'beauty',
  'salon & spa',
  'medical',
  'dental',
  'therapy',
  'physiotherapy',
  'counseling',
  'consulting',
  'repair',
  'maintenance',
  'cleaning',
  'laundry',
  'tutoring',
  'education',
  'training',
  'photography',
  'event',
  'catering',
  'plumbing',
  'electrical',
  'carpentry',
  'painting',
  'home services',
  'pet care',
  'grooming'
];

// Categories that represent products
const PRODUCT_CATEGORIES = [
  'food',
  'dining',
  'restaurant',
  'cafe',
  'bakery',
  'grocery',
  'electronics',
  'mobile',
  'computer',
  'laptop',
  'fashion',
  'clothing',
  'apparel',
  'footwear',
  'shoes',
  'accessories',
  'jewelry',
  'watches',
  'furniture',
  'home',
  'decor',
  'kitchen',
  'appliances',
  'books',
  'stationery',
  'toys',
  'games',
  'sports',
  'equipment',
  'automotive',
  'parts',
  'tools'
];

function determineProductType(categoryName: string): 'product' | 'service' {
  const lowerName = categoryName.toLowerCase();

  // High priority product categories (checked first)
  const highPriorityProducts = ['food', 'dining', 'restaurant', 'cafe', 'bakery', 'fashion', 'clothing', 'electronics', 'grocery'];
  for (const keyword of highPriorityProducts) {
    if (lowerName.includes(keyword)) {
      return 'product';
    }
  }

  // Then check if it's a service
  for (const serviceKeyword of SERVICE_CATEGORIES) {
    if (lowerName.includes(serviceKeyword)) {
      return 'service';
    }
  }

  // Check if it's a product
  for (const productKeyword of PRODUCT_CATEGORIES) {
    if (lowerName.includes(productKeyword)) {
      return 'product';
    }
  }

  // Default to product
  return 'product';
}

async function categorizeProducts() {
  try {
    await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
    console.log('✅ Connected to MongoDB\n');

    // Get all products
    const products = await Product.find().populate('category');
    console.log(`📦 Found ${products.length} products\n`);

    let productCount = 0;
    let serviceCount = 0;
    let updatedCount = 0;

    for (const product of products) {
      const category = product.category as any;
      const categoryName = category?.name || '';

      const productType = determineProductType(categoryName);

      // Update if different or missing
      if (product.productType !== productType) {
        product.productType = productType;
        await product.save();
        updatedCount++;

        console.log(`✏️  Updated: ${product.name}`);
        console.log(`   Category: ${categoryName}`);
        console.log(`   Type: ${productType}\n`);
      }

      if (productType === 'product') {
        productCount++;
      } else {
        serviceCount++;
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   Total products: ${products.length}`);
    console.log(`   Physical products: ${productCount}`);
    console.log(`   Services: ${serviceCount}`);
    console.log(`   Updated: ${updatedCount}`);
    console.log('\n🎉 Categorization complete!');

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

categorizeProducts();
