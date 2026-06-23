/**
 * Migrate Product Images
 *
 * Replaces broken/expired image URLs (Google thumbnails etc.) with
 * working Unsplash images matched to each product's name/type.
 *
 * Run: npm run migrate:product-images
 */
import mongoose from 'mongoose';
import { connectDatabase } from '../config/database';
import { Product } from '../models/Product';
import dotenv from 'dotenv';

dotenv.config();

// Working Unsplash image URLs mapped to product keywords
const IMAGE_MAP: Record<string, string> = {
  // Ice cream & Desserts
  'almond carnival': 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=600',
  'belgian chocolate scoop': 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=600',
  'tender coconut': 'https://images.unsplash.com/photo-1570197788417-0e82375c9be7?w=600',
  'sitaphal': 'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=600',
  'chocolate truffle cake': 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600',
  'red velvet cupcake': 'https://images.unsplash.com/photo-1614707267537-b85aaf00c4b7?w=600',

  // South Indian
  'masala dosa': 'https://images.unsplash.com/photo-1630383249896-424e482df921?w=600',
  'idli sambar': 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=600',

  // Chinese
  'hakka noodles': 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600',
  'manchurian dry': 'https://images.unsplash.com/photo-1645177628172-a94c1f96e6db?w=600',
  'schezwan fried rice': 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=600',

  // Thali
  'special veg thali': 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600',
  'maharaja thali': 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600',
  'mini thali': 'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=600',

  // Biryani
  'chicken dum biryani': 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600',
  'mutton biryani': 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600',
  'veg biryani': 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=600',

  // Chaat
  'pani puri': 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600',
  'pav bhaji': 'https://images.unsplash.com/photo-1606491956689-2ea866880049?w=600',
  'aloo tikki chaat': 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600',

  // Salads & Healthy
  'greek salad': 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600',
  'quinoa bowl': 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600',
  'fresh fruit bowl': 'https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=600',

  // Pizza
  'margherita pizza': 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600',
  'farmhouse pizza': 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600',
  'peppy paneer pizza': 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600',

  // Coffee & Cafe
  'cappuccino': 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=600',
  'cold coffee': 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=600',
  'croissant': 'https://images.unsplash.com/photo-1555507036-ab1f4038024a?w=600',
};

// Fallback by category keyword
const CATEGORY_FALLBACKS: Record<string, string> = {
  'ice cream': 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=600',
  'dessert': 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600',
  'cake': 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600',
  'cupcake': 'https://images.unsplash.com/photo-1614707267537-b85aaf00c4b7?w=600',
  'biryani': 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600',
  'pizza': 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600',
  'noodle': 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600',
  'dosa': 'https://images.unsplash.com/photo-1630383249896-424e482df921?w=600',
  'coffee': 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=600',
  'salad': 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600',
  'thali': 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600',
  'chaat': 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600',
};

const GENERIC_FOOD_FALLBACK = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600';

function getReplacementImage(productName: string): string {
  const nameLower = productName.toLowerCase();

  // Exact match
  if (IMAGE_MAP[nameLower]) return IMAGE_MAP[nameLower];

  // Category keyword match
  for (const [keyword, url] of Object.entries(CATEGORY_FALLBACKS)) {
    if (nameLower.includes(keyword)) return url;
  }

  return GENERIC_FOOD_FALLBACK;
}

async function migrateProductImages() {
  console.log('🖼️  Product Image Migration');
  console.log('='.repeat(60));
  console.log('');

  try {
    // Find products with broken Google thumbnail URLs
    const brokenProducts = await Product.find({
      'images.0': { $regex: /encrypted-tbn0\.gstatic\.com/ },
    }).lean();

    console.log(`Found ${brokenProducts.length} products with expired Google thumbnail images.\n`);

    if (brokenProducts.length === 0) {
      console.log('✅ No broken images found. All good!');
      return;
    }

    let updated = 0;
    for (const product of brokenProducts) {
      const newImageUrl = getReplacementImage(product.name);

      await Product.updateOne(
        { _id: product._id },
        { $set: { images: [newImageUrl] } },
      );

      console.log(`  ✅ ${product.name} → ${newImageUrl.substring(0, 70)}...`);
      updated++;
    }

    console.log('');
    console.log('─'.repeat(60));
    console.log(`📊 Updated ${updated}/${brokenProducts.length} products with working images.`);
    console.log('─'.repeat(60));
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

if (require.main === module) {
  connectDatabase()
    .then(() => migrateProductImages())
    .then(() => {
      console.log('\n✅ Done.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Connection failed:', error);
      process.exit(1);
    });
}
