const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };
const DB_NAME = 'test';

// Extended category mapping
const CATEGORY_MAPPINGS = [
  // Fashion - Clothing
  { keywords: ['t-shirt', 'tshirt', 'shirt', 'polo', 'top', 'blouse', 'cotton shirt'], categorySlug: 'shirts-tops' },
  { keywords: ['jacket', 'blazer', 'coat', 'hoodie', 'hooded', 'sweater', 'cardigan'], categorySlug: 'jackets-coats' },
  { keywords: ['jeans', 'pants', 'trousers', 'chinos', 'shorts', 'denim jeans'], categorySlug: 'jeans-pants' },
  { keywords: ['dress', 'dresses', 'gown', 'frock', 'silk blouse'], categorySlug: 'dresses' },
  { keywords: ['saree', 'sarees', 'sari', 'lehenga'], categorySlug: 'sarees' },
  { keywords: ['kurta', 'kurtas', 'kurti', 'ethnic', 'traditional'], categorySlug: 'kurtas-ethnic' },

  // Fashion - Accessories
  { keywords: ['bag', 'bags', 'wallet', 'wallets', 'purse', 'handbag', 'backpack', 'clutch', 'tote'], categorySlug: 'bags-wallets' },
  { keywords: ['watch', 'watches', 'smartwatch', 'smart watch'], categorySlug: 'watches' },
  { keywords: ['jewelry', 'jewellery', 'necklace', 'earring', 'ring', 'bracelet', 'pendant', 'gold plated', 'diamond'], categorySlug: 'jewelry' },
  { keywords: ['shoe', 'shoes', 'sneaker', 'sneakers', 'sandal', 'sandals', 'heels', 'boots', 'loafer', 'slipper', 'footwear'], categorySlug: 'footwear' },
  { keywords: ['sunglasses', 'glasses', 'eyewear', 'spectacles', 'trendy sunglasses', 'designer sunglasses'], categorySlug: 'sunglasses-eyewear' },

  // Beauty & Personal Care
  { keywords: ['perfume', 'fragrance', 'cologne', 'deodorant', 'premium perfume'], categorySlug: 'perfumes-fragrances' },
  { keywords: ['makeup', 'lipstick', 'foundation', 'mascara', 'eyeshadow', 'cosmetic'], categorySlug: 'makeup' },
  { keywords: ['skincare', 'moisturizer', 'serum', 'cleanser', 'face wash', 'cream'], categorySlug: 'skincare' },
  { keywords: ['haircare', 'shampoo', 'conditioner', 'hair oil', 'hair serum'], categorySlug: 'haircare' },
  { keywords: ['haircut', 'styling', 'hair color', 'highlights', 'salon', 'beauty parlor'], categorySlug: 'salon-services' },
  { keywords: ['manicure', 'pedicure', 'nail', 'spa', 'massage', 'aromatherapy', 'facial'], categorySlug: 'spa-wellness' },

  // Electronics
  { keywords: ['phone', 'smartphone', 'mobile', 'iphone', 'samsung galaxy', 'pixel', 'oneplus'], categorySlug: 'smartphones' },
  { keywords: ['laptop', 'macbook', 'notebook', 'chromebook'], categorySlug: 'laptops' },
  { keywords: ['tablet', 'ipad'], categorySlug: 'tablets' },
  { keywords: ['headphone', 'headphones', 'earphone', 'earphones', 'earbuds', 'airpods', 'buds', 'wireless earbuds', 'bluetooth earbuds'], categorySlug: 'headphones-earphones' },
  { keywords: ['speaker', 'speakers', 'soundbar', 'bluetooth speaker'], categorySlug: 'speakers' },
  { keywords: ['camera', 'dslr', 'mirrorless', 'gopro', 'webcam'], categorySlug: 'cameras' },
  { keywords: ['tv', 'television', 'smart tv', 'led tv', 'oled'], categorySlug: 'televisions' },
  { keywords: ['gaming', 'playstation', 'xbox', 'nintendo', 'console', 'controller'], categorySlug: 'gaming' },
  { keywords: ['charger', 'power bank', 'portable charger', 'adapter', 'cable', 'usb', 'phone case'], categorySlug: 'mobile-accessories' },

  // Home & Living
  { keywords: ['sofa', 'couch', 'sectional'], categorySlug: 'sofas-couches' },
  { keywords: ['bed', 'mattress', 'pillow', 'bedsheet', 'bedding', 'comforter'], categorySlug: 'bedding' },
  { keywords: ['table', 'desk', 'coffee table', 'dining table'], categorySlug: 'tables' },
  { keywords: ['chair', 'chairs', 'office chair', 'dining chair'], categorySlug: 'chairs' },
  { keywords: ['curtain', 'curtains', 'drapes', 'blinds'], categorySlug: 'curtains-blinds' },
  { keywords: ['lamp', 'light', 'lighting', 'chandelier', 'led light', 'led desk', 'desk lamp'], categorySlug: 'lighting' },
  { keywords: ['decor', 'decoration', 'vase', 'wall art', 'painting', 'frame'], categorySlug: 'home-decor' },
  { keywords: ['kitchen', 'cookware', 'utensil', 'pan', 'pot', 'knife', 'cutting board', 'water bottle', 'bottle'], categorySlug: 'kitchen-dining' },
  { keywords: ['storage', 'organizer', 'shelf', 'cabinet', 'rack', 'storage box'], categorySlug: 'storage-organization' },

  // Food & Dining
  { keywords: ['pizza', 'burger', 'sandwich', 'wrap', 'fries', 'french fries', 'nuggets', 'chicken nuggets'], categorySlug: 'fast-food' },
  { keywords: ['biryani', 'curry', 'dal', 'roti', 'naan', 'tandoori', 'indian cuisine'], categorySlug: 'indian-cuisine' },
  { keywords: ['chinese', 'noodle', 'manchurian', 'fried rice', 'momos'], categorySlug: 'chinese' },
  { keywords: ['dessert', 'cake', 'ice cream', 'pastry', 'sweet', 'chocolate', 'muffin', 'cookies', 'brownie'], categorySlug: 'desserts' },
  { keywords: ['coffee', 'tea', 'chai', 'latte', 'cappuccino', 'beverage', 'smoothie', 'juice', 'drink'], categorySlug: 'beverages' },
  { keywords: ['meal', 'meal box', 'quinoa', 'organic meal', 'healthy meal', 'food court'], categorySlug: 'healthy-food' },

  // Grocery & Essentials
  { keywords: ['fruit', 'fruits', 'apple', 'banana', 'mango', 'orange', 'fresh fruit', 'apples', 'bananas', 'oranges'], categorySlug: 'fruits' },
  { keywords: ['vegetable', 'vegetables', 'potato', 'tomato', 'onion', 'carrot', 'tomatoes', 'potatoes'], categorySlug: 'vegetables' },
  { keywords: ['dairy', 'milk', 'cheese', 'butter', 'yogurt', 'curd', 'paneer'], categorySlug: 'dairy-products' },
  { keywords: ['snack', 'snacks', 'chips', 'biscuit', 'cookies', 'namkeen'], categorySlug: 'snacks' },
  { keywords: ['rice', 'wheat', 'flour', 'atta', 'grain', 'dal', 'pulses', 'basmati', 'sugar', 'jaggery'], categorySlug: 'staples' },
  { keywords: ['organic', 'honey', 'turmeric', 'coconut oil', 'cooking oil', 'oil'], categorySlug: 'organic-products' },

  // Health & Wellness
  { keywords: ['vitamin', 'supplement', 'protein', 'omega', 'calcium'], categorySlug: 'vitamins-supplements' },
  { keywords: ['medicine', 'tablet', 'syrup', 'capsule', 'painkiller', 'cough', 'band-aid', 'first aid'], categorySlug: 'medicines' },
  { keywords: ['fitness', 'dumbbell', 'yoga mat', 'resistance band', 'gym', 'workout'], categorySlug: 'fitness-equipment' },
  { keywords: ['thermometer', 'digital thermometer', 'health checkup', 'checkup', 'consultation', 'vaccination', 'general consultation'], categorySlug: 'health-services' },

  // Sports & Fitness
  { keywords: ['cricket', 'bat', 'ball', 'wicket'], categorySlug: 'cricket' },
  { keywords: ['football', 'soccer'], categorySlug: 'football' },
  { keywords: ['badminton', 'racket', 'shuttlecock'], categorySlug: 'badminton' },
  { keywords: ['running', 'jogging', 'marathon'], categorySlug: 'running' },

  // Books & Stationery
  { keywords: ['book', 'novel', 'fiction', 'non-fiction', 'biography', 'guide', 'handbook', 'thriller', 'mystery', 'programming', 'self-help', 'art of'], categorySlug: 'books' },
  { keywords: ['notebook', 'diary', 'journal', 'stationery', 'pen', 'pencil'], categorySlug: 'stationery' },

  // Gifts & Special
  { keywords: ['gift', 'hamper', 'gift box', 'gift set', 'gift basket', 'bouquet', 'personalized', 'birthday', 'anniversary', 'gourmet gift'], categorySlug: 'gifts' },
  { keywords: ['voucher', 'gift card', 'shopping voucher'], categorySlug: 'gift-cards' },

  // Services & Rentals
  { keywords: ['rental', 'car rental', 'sedan', 'suv', 'hatchback', 'fortuner', 'camry', 'swift', 'creta'], categorySlug: 'car-rentals' },
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

    // Get all products (reset categorySlug first to reprocess all)
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

      // Skip test products
      if (productName.includes('test product') || productName.includes('ioefpofjpo') ||
          productName.includes('hhhhhhhhhhhhhf') || productName.match(/^[a-z0-9]{5,}$/)) {
        skipped++;
        continue;
      }

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

        if (updated <= 15) {
          console.log(`  ✅ "${product.name}" → ${matchedCategorySlug}`);
        }
      } else {
        skipped++;
      }
    }

    console.log(`\n${'='.repeat(50)}`);
    console.log(`📊 RESULTS:`);
    console.log(`  ✅ Updated: ${updated} products`);
    console.log(`  ⏭️ Skipped: ${skipped} products`);

    console.log(`\n📁 PRODUCTS PER CATEGORY:`);
    Object.entries(updatesByCategory)
      .sort((a, b) => b[1] - a[1])
      .forEach(([slug, count]) => {
        console.log(`  ${slug}: ${count} products`);
      });

    // Verification
    console.log(`\n🔍 VERIFICATION:`);
    const verifyCategories = ['bags-wallets', 'lighting', 'smartphones', 'fast-food', 'books', 'gifts'];
    for (const slug of verifyCategories) {
      const cat = await categoriesCollection.findOne({ slug });
      if (cat) {
        const count = await productsCollection.countDocuments({ category: cat._id });
        console.log(`  ${slug}: ${count} products`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

linkProductsToCategories();
