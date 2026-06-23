const mongoose = require('mongoose');
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };
const DB_NAME = 'test';
const MERCHANT_ID = new mongoose.Types.ObjectId('68aaa623d4ae0ab11dc2436f');

// Product templates by category with proper products
const categoryProducts = {
  'Fashion': [
    { name: 'Premium Cotton T-Shirt', brand: 'Zara', price: 1299, tags: ['clothing', 'casual', 'cotton'] },
    { name: 'Slim Fit Jeans', brand: 'Levis', price: 2499, tags: ['clothing', 'denim', 'casual'] },
    { name: 'Formal Blazer', brand: 'Raymond', price: 5999, tags: ['formal', 'business', 'blazer'] },
    { name: 'Designer Kurta Set', brand: 'Fabindia', price: 3499, tags: ['ethnic', 'traditional', 'kurta'] },
    { name: 'Sports Sneakers', brand: 'Nike', price: 6999, tags: ['footwear', 'sports', 'sneakers'] },
    { name: 'Leather Belt', brand: 'Hidesign', price: 1499, tags: ['accessories', 'leather', 'belt'] },
    { name: 'Silk Saree', brand: 'Kanchipuram', price: 8999, tags: ['ethnic', 'saree', 'silk'] },
    { name: 'Winter Jacket', brand: 'Woodland', price: 4999, tags: ['winter', 'jacket', 'outerwear'] },
  ],
  'Fashion & Beauty': [
    { name: 'Skincare Essentials Kit', brand: 'Lakme', price: 1999, tags: ['beauty', 'skincare', 'kit'] },
    { name: 'Designer Handbag', brand: 'Baggit', price: 3499, tags: ['accessories', 'handbag', 'fashion'] },
    { name: 'Perfume Collection', brand: 'Forest Essentials', price: 2499, tags: ['fragrance', 'perfume'] },
    { name: 'Makeup Palette', brand: 'MAC', price: 3999, tags: ['makeup', 'cosmetics', 'palette'] },
    { name: 'Hair Care Set', brand: 'LOreal', price: 1299, tags: ['haircare', 'shampoo', 'conditioner'] },
    { name: 'Sunglasses Premium', brand: 'Ray-Ban', price: 5999, tags: ['eyewear', 'sunglasses', 'fashion'] },
  ],
  'Electronics': [
    { name: 'iPhone 15 Pro', brand: 'Apple', price: 134900, tags: ['smartphone', 'apple', 'premium'] },
    { name: 'Samsung Galaxy S24', brand: 'Samsung', price: 79999, tags: ['smartphone', 'android', 'samsung'] },
    { name: 'MacBook Air M3', brand: 'Apple', price: 114900, tags: ['laptop', 'apple', 'macbook'] },
    { name: 'Sony WH-1000XM5', brand: 'Sony', price: 29990, tags: ['headphones', 'wireless', 'audio'] },
    { name: 'iPad Pro 12.9"', brand: 'Apple', price: 112900, tags: ['tablet', 'apple', 'ipad'] },
    { name: 'Dell XPS 15', brand: 'Dell', price: 149990, tags: ['laptop', 'dell', 'business'] },
    { name: 'Canon EOS R6', brand: 'Canon', price: 215990, tags: ['camera', 'mirrorless', 'professional'] },
    { name: 'Samsung 55" OLED TV', brand: 'Samsung', price: 129990, tags: ['tv', 'oled', 'entertainment'] },
  ],
  'Food & Dining': [
    { name: 'Gourmet Pizza Combo', brand: 'Dominos', price: 599, tags: ['pizza', 'italian', 'fast-food'] },
    { name: 'Chicken Biryani', brand: 'Paradise', price: 399, tags: ['biryani', 'indian', 'rice'] },
    { name: 'Sushi Platter', brand: 'Sushi King', price: 1299, tags: ['sushi', 'japanese', 'seafood'] },
    { name: 'Butter Chicken Meal', brand: 'Punjab Grill', price: 449, tags: ['curry', 'indian', 'chicken'] },
    { name: 'Veg Thali Special', brand: 'Saravana Bhavan', price: 299, tags: ['thali', 'vegetarian', 'south-indian'] },
    { name: 'Pasta Alfredo', brand: 'Pizza Hut', price: 349, tags: ['pasta', 'italian', 'creamy'] },
  ],
  'Home & Living': [
    { name: 'Memory Foam Mattress', brand: 'Sleepwell', price: 24999, tags: ['mattress', 'bedroom', 'comfort'] },
    { name: 'Sofa Set 3+2', brand: 'Urban Ladder', price: 45999, tags: ['sofa', 'living-room', 'furniture'] },
    { name: 'Dining Table Set', brand: 'IKEA', price: 29999, tags: ['dining', 'table', 'furniture'] },
    { name: 'LED Chandelier', brand: 'Philips', price: 8999, tags: ['lighting', 'chandelier', 'decor'] },
    { name: 'Cotton Bedsheet Set', brand: 'Bombay Dyeing', price: 2499, tags: ['bedding', 'cotton', 'bedroom'] },
    { name: 'Kitchen Cookware Set', brand: 'Prestige', price: 5999, tags: ['kitchen', 'cookware', 'cooking'] },
  ],
  'Health & Wellness': [
    { name: 'Multivitamin Tablets', brand: 'Himalaya', price: 499, tags: ['vitamins', 'supplements', 'health'] },
    { name: 'Protein Powder 2kg', brand: 'MuscleBlaze', price: 2999, tags: ['protein', 'fitness', 'nutrition'] },
    { name: 'Yoga Mat Premium', brand: 'Decathlon', price: 1299, tags: ['yoga', 'fitness', 'mat'] },
    { name: 'Blood Pressure Monitor', brand: 'Omron', price: 2499, tags: ['medical', 'monitor', 'health'] },
    { name: 'Essential Oil Set', brand: 'Aroma Magic', price: 999, tags: ['aromatherapy', 'essential-oil', 'wellness'] },
    { name: 'Fitness Tracker', brand: 'Fitbit', price: 9999, tags: ['fitness', 'tracker', 'wearable'] },
  ],
  'Grocery & Essentials': [
    { name: 'Basmati Rice 5kg', brand: 'India Gate', price: 599, tags: ['rice', 'staples', 'basmati'] },
    { name: 'Olive Oil 1L', brand: 'Figaro', price: 799, tags: ['oil', 'cooking', 'olive'] },
    { name: 'Organic Dal Pack', brand: 'Tata Sampann', price: 349, tags: ['dal', 'organic', 'pulses'] },
    { name: 'Premium Tea 500g', brand: 'Tata Tea', price: 399, tags: ['tea', 'beverage', 'premium'] },
    { name: 'Mixed Dry Fruits 1kg', brand: 'Nutraj', price: 1299, tags: ['dry-fruits', 'nuts', 'healthy'] },
    { name: 'Organic Honey 500g', brand: 'Dabur', price: 349, tags: ['honey', 'organic', 'natural'] },
  ],
  'Sports & Fitness': [
    { name: 'Cricket Bat English Willow', brand: 'MRF', price: 8999, tags: ['cricket', 'bat', 'sports'] },
    { name: 'Treadmill Home Pro', brand: 'Powermax', price: 34999, tags: ['treadmill', 'gym', 'cardio'] },
    { name: 'Football Official Size', brand: 'Nivia', price: 999, tags: ['football', 'soccer', 'sports'] },
    { name: 'Dumbbells Set 20kg', brand: 'Kakss', price: 3999, tags: ['dumbbells', 'weights', 'gym'] },
    { name: 'Badminton Racket Pro', brand: 'Yonex', price: 4999, tags: ['badminton', 'racket', 'sports'] },
    { name: 'Running Shoes', brand: 'Adidas', price: 7999, tags: ['running', 'shoes', 'sports'] },
  ],
  'Books & Stationery': [
    { name: 'Bestseller Fiction Set', brand: 'Penguin', price: 999, tags: ['books', 'fiction', 'reading'] },
    { name: 'Premium Notebook Set', brand: 'Classmate', price: 399, tags: ['notebook', 'stationery', 'writing'] },
    { name: 'Art Supplies Kit', brand: 'Camlin', price: 1499, tags: ['art', 'drawing', 'creative'] },
    { name: 'Self-Help Collection', brand: 'Various', price: 799, tags: ['books', 'self-help', 'motivation'] },
    { name: 'Parker Pen Set', brand: 'Parker', price: 2499, tags: ['pen', 'premium', 'writing'] },
  ],
  'Kids & Toys': [
    { name: 'LEGO City Set', brand: 'LEGO', price: 3999, tags: ['lego', 'building', 'toys'] },
    { name: 'Remote Control Car', brand: 'Hot Wheels', price: 2499, tags: ['rc-car', 'toys', 'vehicle'] },
    { name: 'Educational Tablet', brand: 'VTech', price: 4999, tags: ['educational', 'tablet', 'kids'] },
    { name: 'Board Games Collection', brand: 'Funskool', price: 1299, tags: ['board-games', 'family', 'games'] },
    { name: 'Soft Toy Teddy Bear', brand: 'Dimpy', price: 899, tags: ['soft-toy', 'teddy', 'kids'] },
  ],
  'Automotive': [
    { name: 'Car Dash Camera 4K', brand: 'Qubo', price: 4999, tags: ['dashcam', 'car', 'safety'] },
    { name: 'Premium Seat Covers', brand: 'AutoFurnish', price: 3499, tags: ['seat-covers', 'car', 'interior'] },
    { name: 'Tyre Inflator Portable', brand: 'Bergmann', price: 1999, tags: ['inflator', 'tyre', 'car'] },
    { name: 'Car Vacuum Cleaner', brand: 'Black+Decker', price: 2499, tags: ['vacuum', 'car', 'cleaning'] },
  ],
  'Jewellery': [
    { name: 'Gold Plated Necklace', brand: 'Tanishq', price: 15999, tags: ['necklace', 'gold', 'jewellery'] },
    { name: 'Silver Anklet Pair', brand: 'Giva', price: 2499, tags: ['anklet', 'silver', 'jewellery'] },
    { name: 'Diamond Earrings', brand: 'CaratLane', price: 29999, tags: ['earrings', 'diamond', 'jewellery'] },
    { name: 'Pearl Bracelet', brand: 'Malabar', price: 8999, tags: ['bracelet', 'pearl', 'jewellery'] },
  ],
  'Pet Supplies': [
    { name: 'Dog Food Premium 10kg', brand: 'Pedigree', price: 2999, tags: ['dog-food', 'pet', 'nutrition'] },
    { name: 'Cat Scratching Post', brand: 'PetShop', price: 2499, tags: ['cat', 'scratching-post', 'pet'] },
    { name: 'Aquarium Kit 20L', brand: 'Boyu', price: 3999, tags: ['aquarium', 'fish', 'pet'] },
    { name: 'Pet Grooming Kit', brand: 'Wahl', price: 1999, tags: ['grooming', 'pet', 'care'] },
  ],
};

// Category images
const categoryImages = {
  'Fashion': 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400&h=400&fit=crop',
  'Fashion & Beauty': 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=400&h=400&fit=crop',
  'Electronics': 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400&h=400&fit=crop',
  'Food & Dining': 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&h=400&fit=crop',
  'Home & Living': 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=400&fit=crop',
  'Health & Wellness': 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=400&fit=crop',
  'Grocery & Essentials': 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=400&fit=crop',
  'Sports & Fitness': 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=400&h=400&fit=crop',
  'Books & Stationery': 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=400&h=400&fit=crop',
  'Kids & Toys': 'https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=400&h=400&fit=crop',
  'Automotive': 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=400&h=400&fit=crop',
  'Jewellery': 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&h=400&fit=crop',
  'Pet Supplies': 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&h=400&fit=crop',
};

function generateSKU() {
  return 'SKU-' + Math.random().toString(36).substring(2, 10).toUpperCase();
}

function generateSlug(name, suffix) {
  return name.toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim() + '-' + suffix;
}

function findMatchingCategory(categoryName, templates) {
  // Direct match
  if (templates[categoryName]) return categoryName;

  // Partial match
  const lowerName = categoryName.toLowerCase();
  for (const key of Object.keys(templates)) {
    if (lowerName.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerName)) {
      return key;
    }
  }

  // Keyword matching
  const keywordMap = {
    'fashion': 'Fashion',
    'beauty': 'Fashion & Beauty',
    'cosmetic': 'Fashion & Beauty',
    'makeup': 'Fashion & Beauty',
    'clothing': 'Fashion',
    'apparel': 'Fashion',
    'electronic': 'Electronics',
    'mobile': 'Electronics',
    'laptop': 'Electronics',
    'food': 'Food & Dining',
    'restaurant': 'Food & Dining',
    'dining': 'Food & Dining',
    'home': 'Home & Living',
    'furniture': 'Home & Living',
    'living': 'Home & Living',
    'health': 'Health & Wellness',
    'wellness': 'Health & Wellness',
    'medical': 'Health & Wellness',
    'grocery': 'Grocery & Essentials',
    'essential': 'Grocery & Essentials',
    'supermarket': 'Grocery & Essentials',
    'sport': 'Sports & Fitness',
    'fitness': 'Sports & Fitness',
    'gym': 'Sports & Fitness',
    'book': 'Books & Stationery',
    'stationery': 'Books & Stationery',
    'kid': 'Kids & Toys',
    'toy': 'Kids & Toys',
    'baby': 'Kids & Toys',
    'auto': 'Automotive',
    'car': 'Automotive',
    'vehicle': 'Automotive',
    'jewel': 'Jewellery',
    'gold': 'Jewellery',
    'silver': 'Jewellery',
    'pet': 'Pet Supplies',
    'dog': 'Pet Supplies',
    'cat': 'Pet Supplies',
  };

  for (const [keyword, category] of Object.entries(keywordMap)) {
    if (lowerName.includes(keyword)) {
      return category;
    }
  }

  return null;
}

async function run() {
  await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
  const db = mongoose.connection.db;

  const products = db.collection('products');
  const stores = db.collection('stores');
  const categories = db.collection('categories');

  console.log('=== FIXING ALL STORE PRODUCTS ===\n');

  // Get all categories
  const allCategories = await categories.find({}).toArray();
  const parentCats = allCategories.filter(c => !c.parentCategory);
  const childCats = allCategories.filter(c => c.parentCategory);

  // Build parent-to-children map
  const parentToChildren = {};
  parentCats.forEach(p => {
    parentToChildren[p._id.toString()] = childCats.filter(
      c => c.parentCategory?.toString() === p._id.toString()
    );
  });

  // Get all active stores
  const allStores = await stores.find({ isActive: true }).toArray();
  console.log('Total active stores:', allStores.length);

  let storesFixed = 0;
  let productsCreated = 0;
  let productsDeleted = 0;

  for (const store of allStores) {
    // Get store's category
    const storeCategory = allCategories.find(c => c._id.toString() === store.category?.toString());
    if (!storeCategory) {
      console.log(`⚠️ Store "${store.name}" has no category, skipping`);
      continue;
    }

    const categoryName = storeCategory.name;
    const matchedTemplate = findMatchingCategory(categoryName, categoryProducts);

    if (!matchedTemplate) {
      console.log(`⚠️ No template for category "${categoryName}" (store: ${store.name})`);
      continue;
    }

    // Get subcategories for this store's category
    const subcategories = parentToChildren[store.category?.toString()] || [];

    // Delete existing wrong products for this store
    const existingProducts = await products.find({
      store: store._id,
      isDeleted: { $ne: true }
    }).toArray();

    // Check if products match the category
    const templates = categoryProducts[matchedTemplate];
    const templateNames = templates.map(t => t.name.toLowerCase());

    let needsReplacement = false;
    for (const prod of existingProducts) {
      const prodNameLower = prod.name?.toLowerCase() || '';
      // Check if product seems to match the category
      const matchesCategory = templates.some(t =>
        prodNameLower.includes(t.brand?.toLowerCase()) ||
        t.tags?.some(tag => prodNameLower.includes(tag))
      );
      if (!matchesCategory && existingProducts.length > 0) {
        needsReplacement = true;
        break;
      }
    }

    if (needsReplacement || existingProducts.length === 0) {
      // Delete old products
      if (existingProducts.length > 0) {
        await products.deleteMany({ store: store._id });
        productsDeleted += existingProducts.length;
      }

      // Create new products matching the category
      const numProducts = Math.min(6 + Math.floor(Math.random() * 3), templates.length);

      for (let i = 0; i < numProducts; i++) {
        const template = templates[i];
        const subcat = subcategories.length > 0
          ? subcategories[Math.floor(Math.random() * subcategories.length)]
          : null;

        const baseImage = categoryImages[matchedTemplate] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop';

        const productData = {
          name: template.name,
          slug: generateSlug(template.name, store._id.toString().slice(-6) + i),
          description: `Premium quality ${template.name} from ${template.brand}. Best prices guaranteed.`,
          shortDescription: `${template.brand} - ${template.name}`,
          productType: 'product',
          category: store.category,
          subCategory: subcat?._id || null,
          store: store._id,
          merchantId: MERCHANT_ID,
          brand: template.brand,
          sku: generateSKU(),
          images: [baseImage],
          pricing: {
            original: Math.round(template.price * 1.25),
            selling: template.price,
            discount: 20,
            currency: 'INR'
          },
          inventory: {
            stock: Math.floor(Math.random() * 100) + 20,
            isAvailable: true,
            lowStockThreshold: 10,
            unlimited: false
          },
          ratings: {
            average: parseFloat((Math.random() * 1.5 + 3.5).toFixed(1)),
            count: Math.floor(Math.random() * 500) + 30,
            distribution: { 5: 45, 4: 30, 3: 15, 2: 7, 1: 3 }
          },
          tags: template.tags,
          cashback: {
            percentage: Math.floor(Math.random() * 8) + 3,
            maxAmount: Math.floor(template.price * 0.1),
            isActive: true
          },
          deliveryInfo: {
            estimatedDays: '2-4 days',
            freeShippingThreshold: 499,
            expressAvailable: true,
            standardDeliveryTime: '2-4 days',
            expressDeliveryTime: 'Under 60min'
          },
          isActive: true,
          isFeatured: Math.random() > 0.7,
          isDigital: false,
          visibility: 'public',
          seo: {
            title: template.name,
            description: `Buy ${template.name} online at best prices`,
            keywords: template.tags
          },
          analytics: {
            views: Math.floor(Math.random() * 500) + 50,
            purchases: Math.floor(Math.random() * 50) + 5,
            conversions: Math.floor(Math.random() * 30),
            wishlistAdds: Math.floor(Math.random() * 100),
            shareCount: Math.floor(Math.random() * 20),
            returnRate: Math.random() * 3,
            avgRating: parseFloat((Math.random() * 1.5 + 3.5).toFixed(1))
          },
          specifications: [],
          isDeleted: false,
          createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
          updatedAt: new Date()
        };

        await products.insertOne(productData);
        productsCreated++;
      }

      storesFixed++;
      console.log(`✅ Fixed "${store.name}" (${categoryName}) - ${numProducts} products`);
    } else {
      console.log(`✓ "${store.name}" already has correct products`);
    }
  }

  // Update homepage sections tags
  console.log('\n=== Updating homepage section tags ===');

  const allProductIds = await products.find({ isDeleted: { $ne: true } }).project({ _id: 1 }).toArray();
  const shuffled = allProductIds.map(p => p._id).sort(() => Math.random() - 0.5);

  // New Arrivals
  for (const id of shuffled.slice(0, 40)) {
    await products.updateOne({ _id: id }, {
      $set: { createdAt: new Date(Date.now() - Math.random() * 5 * 24 * 60 * 60 * 1000) },
      $addToSet: { tags: 'new-arrival' }
    });
  }

  // Featured
  for (const id of shuffled.slice(40, 90)) {
    await products.updateOne({ _id: id }, {
      $set: { isFeatured: true, visibility: 'featured' },
      $addToSet: { tags: 'featured' }
    });
  }

  // Best Sellers
  for (const id of shuffled.slice(90, 130)) {
    await products.updateOne({ _id: id }, {
      $set: { 'analytics.purchases': Math.floor(Math.random() * 300) + 150 },
      $addToSet: { tags: 'best-seller' }
    });
  }

  // Recommended
  for (const id of shuffled.slice(130, 180)) {
    await products.updateOne({ _id: id }, {
      $set: { 'ratings.average': parseFloat((Math.random() * 0.5 + 4.5).toFixed(1)) },
      $addToSet: { tags: 'recommended' }
    });
  }

  console.log('Tagged products for homepage sections');

  // Final summary
  console.log('\n=== MIGRATION COMPLETE ===\n');

  const finalStats = {
    storesFixed,
    productsDeleted,
    productsCreated,
    totalProducts: await products.countDocuments({ isDeleted: { $ne: true } }),
    storesWithProducts: (await products.aggregate([
      { $match: { isDeleted: { $ne: true } } },
      { $group: { _id: '$store' } }
    ]).toArray()).length,
    productsWithSubcategory: await products.countDocuments({ subCategory: { $ne: null }, isDeleted: { $ne: true } })
  };

  console.log('Stores fixed:', finalStats.storesFixed);
  console.log('Old products deleted:', finalStats.productsDeleted);
  console.log('New products created:', finalStats.productsCreated);
  console.log('Total products now:', finalStats.totalProducts);
  console.log('Stores with products:', finalStats.storesWithProducts, '/', allStores.length);
  console.log('Products with subcategory:', finalStats.productsWithSubcategory);

  await mongoose.disconnect();
}

run().catch(console.error);
