/**
 * Script to migrate products to featured categories based on keywords
 * Matches products by name, tags, and existing category to assign them to featured categories
 */

import mongoose from 'mongoose';
import { Product } from '../src/models/Product';
import { Category } from '../src/models/Category';

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };
const DB_NAME = 'test';

// Keywords for each featured category
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'beauty-fashion': [
    'fashion', 'clothing', 'dress', 'shirt', 'pants', 'jeans', 'jacket', 'coat',
    'shoes', 'footwear', 'handbag', 'bag', 'wallet', 'belt', 'accessory', 'accessories',
    'jewelry', 'jewellery', 'watch', 'sunglasses', 'prada', 'gucci', 'zara', 'h&m',
    'nike', 'adidas', 'apparel', 'wear', 'outfit', 'style'
  ],
  'cosmetics': [
    'cosmetic', 'cosmetics', 'makeup', 'make-up', 'lipstick', 'foundation', 'mascara',
    'eyeliner', 'blush', 'powder', 'skincare', 'skin care', 'moisturizer', 'serum',
    'cream', 'lotion', 'cleanser', 'toner', 'sunscreen', 'beauty', 'face', 'facial',
    'rihanna', 'fenty', 'maybelline', 'loreal', 'mac', 'nyx', 'essence'
  ],
  'electronics': [
    'electronics', 'electronic', 'phone', 'smartphone', 'iphone', 'samsung', 'pixel',
    'laptop', 'computer', 'pc', 'tablet', 'ipad', 'tv', 'television', 'smart tv',
    'headphones', 'earbuds', 'airpods', 'speaker', 'camera', 'gadget', 'device',
    'charger', 'cable', 'adapter', 'apple', 'dell', 'hp', 'lenovo', 'asus', 'sony'
  ],
  'rentals': [
    'rental', 'rent', 'lease', 'car rental', 'vehicle', 'automobile', 'house rental',
    'apartment', 'property', 'real estate', 'accommodation', 'room', 'space',
    'equipment rental', 'tool rental', 'bike rental', 'scooter'
  ],
  'travel': [
    'travel', 'trip', 'tour', 'vacation', 'holiday', 'flight', 'airline', 'hotel',
    'booking', 'resort', 'beach', 'destination', 'cruise', 'adventure', 'getaway',
    'airbnb', 'hostel', 'motel', 'lodge', 'package', 'tourism', 'tourist'
  ]
};

function matchesCategory(product: any, keywords: string[]): boolean {
  const productName = (product.name || '').toLowerCase();
  const productTags = (product.tags || []).map((t: string) => t.toLowerCase());
  const productDescription = (product.description || '').toLowerCase();
  const productBrand = (product.brand || '').toLowerCase();

  for (const keyword of keywords) {
    const lowerKeyword = keyword.toLowerCase();

    // Check name
    if (productName.includes(lowerKeyword)) return true;

    // Check tags
    if (productTags.some((tag: string) => tag.includes(lowerKeyword))) return true;

    // Check description
    if (productDescription.includes(lowerKeyword)) return true;

    // Check brand
    if (productBrand.includes(lowerKeyword)) return true;
  }

  return false;
}

async function migrateProducts() {
  try {
    await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
    console.log('Connected to MongoDB\n');

    // Get featured categories
    const featuredCategories = await Category.find({ 'metadata.featured': true, isActive: true });

    if (featuredCategories.length === 0) {
      console.log('No featured categories found. Please run seedFeaturedCategories.ts first.');
      process.exit(1);
    }

    console.log(`Found ${featuredCategories.length} featured categories:\n`);
    featuredCategories.forEach(cat => {
      console.log(`  - ${cat.name} (${cat.slug})`);
    });
    console.log('');

    // Create a map of slug to category ObjectId
    const categoryMap = new Map<string, mongoose.Types.ObjectId>();
    featuredCategories.forEach(cat => {
      categoryMap.set(cat.slug, cat._id as mongoose.Types.ObjectId);
    });

    // Get all products
    const products = await Product.find({}).populate('category');
    console.log(`Found ${products.length} total products\n`);

    const stats: Record<string, number> = {};
    let migratedCount = 0;
    let unchangedCount = 0;

    // Initialize stats
    Object.keys(CATEGORY_KEYWORDS).forEach(slug => {
      stats[slug] = 0;
    });

    for (const product of products) {
      let assigned = false;

      // Check each featured category
      for (const [slug, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
        if (matchesCategory(product, keywords)) {
          const newCategoryId = categoryMap.get(slug);

          if (newCategoryId) {
            const currentCategoryId = product.category?._id?.toString() || product.category?.toString();

            // Only update if category is different
            if (currentCategoryId !== newCategoryId.toString()) {
              try {
                // Use updateOne to avoid validation issues
                await Product.updateOne(
                  { _id: product._id },
                  { $set: { category: newCategoryId } }
                );

                console.log(`[MIGRATE] "${product.name}" -> ${slug}`);
                stats[slug]++;
                migratedCount++;
              } catch (err: any) {
                console.log(`[SKIP] "${product.name}" - validation error`);
              }
            } else {
              unchangedCount++;
            }
            assigned = true;
            break; // Assign to first matching category
          }
        }
      }

      if (!assigned) {
        // Product doesn't match any featured category - keep existing
      }
    }

    // Update product counts for each category
    console.log('\nUpdating category product counts...');
    for (const category of featuredCategories) {
      const count = await Product.countDocuments({ category: category._id, 'inventory.isAvailable': true });
      category.productCount = count;
      await category.save();
      console.log(`  ${category.name}: ${count} products`);
    }

    console.log('\n--- Migration Summary ---');
    console.log(`Total products: ${products.length}`);
    console.log(`Migrated: ${migratedCount}`);
    console.log(`Unchanged: ${unchangedCount}`);
    console.log('\nBy category:');
    Object.entries(stats).forEach(([slug, count]) => {
      console.log(`  ${slug}: ${count} products migrated`);
    });

    console.log('\nMigration complete!');
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

migrateProducts();
