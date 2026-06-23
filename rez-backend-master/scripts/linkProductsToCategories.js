const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };
const DB_NAME = 'test';

// Category mapping based on product name keywords
const CATEGORY_MAPPINGS = [
  // Fashion sub-categories
  { keywords: ['bag', 'bags', 'wallet', 'wallets', 'purse', 'handbag', 'backpack', 'clutch', 'tote'], categorySlug: 'bags-wallets' },
  { keywords: ['shirt', 't-shirt', 'tshirt', 'polo', 'top', 'blouse'], categorySlug: 'shirts-tops' },
  { keywords: ['jeans', 'pants', 'trousers', 'shorts', 'denim'], categorySlug: 'jeans-pants' },
  { keywords: ['dress', 'dresses', 'gown', 'frock'], categorySlug: 'dresses' },
  { keywords: ['saree', 'sarees', 'sari'], categorySlug: 'sarees' },
  { keywords: ['kurta', 'kurtas', 'kurti', 'ethnic'], categorySlug: 'kurtas-ethnic' },
  { keywords: ['watch', 'watches', 'smartwatch'], categorySlug: 'watches' },
  { keywords: ['jewelry', 'jewellery', 'necklace', 'earring', 'ring', 'bracelet', 'pendant'], categorySlug: 'jewelry' },
  { keywords: ['shoe', 'shoes', 'sneaker', 'sneakers', 'sandal', 'sandals', 'heels', 'boots', 'loafer', 'slipper'], categorySlug: 'footwear' },
  { keywords: ['sunglasses', 'glasses', 'eyewear', 'spectacles'], categorySlug: 'sunglasses-eyewear' },
  { keywords: ['perfume', 'fragrance', 'cologne', 'deodorant'], categorySlug: 'perfumes-fragrances' },
  { keywords: ['makeup', 'lipstick', 'foundation', 'mascara', 'eyeshadow', 'cosmetic'], categorySlug: 'makeup' },
  { keywords: ['skincare', 'moisturizer', 'serum', 'cleanser', 'face wash', 'cream'], categorySlug: 'skincare' },
  { keywords: ['haircare', 'shampoo', 'conditioner', 'hair oil', 'hair serum'], categorySlug: 'haircare' },

  // Electronics sub-categories
  { keywords: ['phone', 'smartphone', 'mobile', 'iphone', 'samsung galaxy', 'pixel', 'oneplus'], categorySlug: 'smartphones' },
  { keywords: ['laptop', 'macbook', 'notebook', 'chromebook'], categorySlug: 'laptops' },
  { keywords: ['tablet', 'ipad'], categorySlug: 'tablets' },
  { keywords: ['headphone', 'headphones', 'earphone', 'earphones', 'earbuds', 'airpods', 'buds'], categorySlug: 'headphones-earphones' },
  { keywords: ['speaker', 'speakers', 'soundbar', 'bluetooth speaker'], categorySlug: 'speakers' },
  { keywords: ['camera', 'dslr', 'mirrorless', 'gopro'], categorySlug: 'cameras' },
  { keywords: ['tv', 'television', 'smart tv', 'led tv', 'oled'], categorySlug: 'televisions' },
  { keywords: ['gaming', 'playstation', 'xbox', 'nintendo', 'console', 'controller'], categorySlug: 'gaming' },
  { keywords: ['charger', 'power bank', 'adapter', 'cable', 'usb'], categorySlug: 'mobile-accessories' },

  // Home & Living sub-categories
  { keywords: ['sofa', 'couch', 'sectional'], categorySlug: 'sofas-couches' },
  { keywords: ['bed', 'mattress', 'pillow', 'bedsheet', 'bedding', 'comforter'], categorySlug: 'bedding' },
  { keywords: ['table', 'desk', 'coffee table', 'dining table'], categorySlug: 'tables' },
  { keywords: ['chair', 'chairs', 'office chair', 'dining chair'], categorySlug: 'chairs' },
  { keywords: ['curtain', 'curtains', 'drapes', 'blinds'], categorySlug: 'curtains-blinds' },
  { keywords: ['lamp', 'light', 'lighting', 'chandelier', 'led light'], categorySlug: 'lighting' },
  { keywords: ['decor', 'decoration', 'vase', 'wall art', 'painting', 'frame'], categorySlug: 'home-decor' },
  { keywords: ['kitchen', 'cookware', 'utensil', 'pan', 'pot', 'knife', 'cutting board'], categorySlug: 'kitchen-dining' },
  { keywords: ['storage', 'organizer', 'shelf', 'cabinet', 'rack'], categorySlug: 'storage-organization' },

  // Food & Dining
  { keywords: ['pizza', 'burger', 'sandwich', 'wrap'], categorySlug: 'fast-food' },
  { keywords: ['biryani', 'curry', 'dal', 'roti', 'naan', 'tandoori', 'indian'], categorySlug: 'indian-cuisine' },
  { keywords: ['chinese', 'noodle', 'manchurian', 'fried rice', 'momos'], categorySlug: 'chinese' },
  { keywords: ['dessert', 'cake', 'ice cream', 'pastry', 'sweet', 'chocolate'], categorySlug: 'desserts' },
  { keywords: ['coffee', 'tea', 'chai', 'latte', 'cappuccino', 'beverage'], categorySlug: 'beverages' },

  // Grocery
  { keywords: ['fruit', 'fruits', 'apple', 'banana', 'mango', 'orange'], categorySlug: 'fruits' },
  { keywords: ['vegetable', 'vegetables', 'potato', 'tomato', 'onion', 'carrot'], categorySlug: 'vegetables' },
  { keywords: ['dairy', 'milk', 'cheese', 'butter', 'yogurt', 'curd', 'paneer'], categorySlug: 'dairy-products' },
  { keywords: ['snack', 'snacks', 'chips', 'biscuit', 'cookies', 'namkeen'], categorySlug: 'snacks' },
  { keywords: ['rice', 'wheat', 'flour', 'atta', 'grain', 'dal', 'pulses'], categorySlug: 'staples' },

  // Health & Wellness
  { keywords: ['vitamin', 'supplement', 'protein', 'omega', 'calcium'], categorySlug: 'vitamins-supplements' },
  { keywords: ['medicine', 'tablet', 'syrup', 'capsule', 'painkiller'], categorySlug: 'medicines' },
  { keywords: ['fitness', 'dumbbell', 'yoga mat', 'resistance band', 'gym'], categorySlug: 'fitness-equipment' },

  // Sports & Fitness
  { keywords: ['cricket', 'bat', 'ball', 'wicket'], categorySlug: 'cricket' },
  { keywords: ['football', 'soccer'], categorySlug: 'football' },
  { keywords: ['badminton', 'racket', 'shuttlecock'], categorySlug: 'badminton' },
  { keywords: ['running', 'jogging', 'marathon'], categorySlug: 'running' },

  // Books
  { keywords: ['book', 'novel', 'fiction', 'non-fiction', 'biography'], categorySlug: 'books' },
  { keywords: ['notebook', 'diary', 'journal', 'stationery', 'pen', 'pencil'], categorySlug: 'stationery' },
];

async function linkProductsToCategories() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db(DB_NAME);
    const productsCollection = db.collection('products');
    const categoriesCollection = db.collection('categories');

    // Get all categories with their slugs
    const categories = await categoriesCollection.find().toArray();
    const categoryMap = new Map();
    categories.forEach(cat => {
      categoryMap.set(cat.slug, cat._id);
    });

    console.log(`📁 Loaded ${categories.length} categories\n`);

    // Get all products
    const products = await productsCollection.find().toArray();
    console.log(`📦 Processing ${products.length} products...\n`);

    let updated = 0;
    let skipped = 0;
    const updatesByCategory = {};

    for (const product of products) {
      const productName = (product.name || product.title || '').toLowerCase();
      const productTags = (product.tags || []).map(t => t.toLowerCase()).join(' ');
      const productDesc = (product.description || '').toLowerCase();
      const searchText = `${productName} ${productTags} ${productDesc}`;

      // Find matching category
      let matchedCategorySlug = null;
      let matchedKeyword = null;

      for (const mapping of CATEGORY_MAPPINGS) {
        for (const keyword of mapping.keywords) {
          if (searchText.includes(keyword.toLowerCase())) {
            matchedCategorySlug = mapping.categorySlug;
            matchedKeyword = keyword;
            break;
          }
        }
        if (matchedCategorySlug) break;
      }

      if (matchedCategorySlug && categoryMap.has(matchedCategorySlug)) {
        const newCategoryId = categoryMap.get(matchedCategorySlug);

        // Update the product
        await productsCollection.updateOne(
          { _id: product._id },
          {
            $set: {
              category: newCategoryId,
              categorySlug: matchedCategorySlug
            }
          }
        );

        updated++;
        updatesByCategory[matchedCategorySlug] = (updatesByCategory[matchedCategorySlug] || 0) + 1;

        if (updated <= 10) {
          console.log(`  ✅ "${product.name}" → ${matchedCategorySlug} (keyword: "${matchedKeyword}")`);
        }
      } else {
        skipped++;
      }
    }

    console.log(`\n${'='.repeat(50)}`);
    console.log(`📊 RESULTS:`);
    console.log(`  ✅ Updated: ${updated} products`);
    console.log(`  ⏭️ Skipped: ${skipped} products (no matching category found)`);

    console.log(`\n📁 PRODUCTS PER CATEGORY:`);
    Object.entries(updatesByCategory)
      .sort((a, b) => b[1] - a[1])
      .forEach(([slug, count]) => {
        console.log(`  ${slug}: ${count} products`);
      });

    // Verify bags-wallets
    console.log(`\n🔍 VERIFICATION - Bags & Wallets:`);
    const bagsCategory = await categoriesCollection.findOne({ slug: 'bags-wallets' });
    if (bagsCategory) {
      const bagsProducts = await productsCollection.find({ category: bagsCategory._id }).toArray();
      console.log(`  Products in bags-wallets: ${bagsProducts.length}`);
      bagsProducts.slice(0, 5).forEach(p => console.log(`    - ${p.name}`));
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

linkProductsToCategories();
