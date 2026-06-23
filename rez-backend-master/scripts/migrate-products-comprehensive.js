const mongoose = require('mongoose');
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };
const DB_NAME = 'test';
const MERCHANT_ID = new mongoose.Types.ObjectId('68aaa623d4ae0ab11dc2436f');

// Professional product templates by category
const productTemplates = {
  'Electronics': [
    { name: 'iPhone 15 Pro Max', brand: 'Apple', price: 159900, tags: ['smartphone', 'premium', 'new-arrival'] },
    { name: 'Samsung Galaxy S24 Ultra', brand: 'Samsung', price: 134999, tags: ['smartphone', 'android'] },
    { name: 'MacBook Pro 16"', brand: 'Apple', price: 249900, tags: ['laptop', 'premium'] },
    { name: 'Sony WH-1000XM5 Headphones', brand: 'Sony', price: 29990, tags: ['audio', 'wireless'] },
    { name: 'iPad Pro 12.9"', brand: 'Apple', price: 112900, tags: ['tablet', 'premium'] },
    { name: 'Dell XPS 15 Laptop', brand: 'Dell', price: 189999, tags: ['laptop', 'business'] },
    { name: 'Canon EOS R5 Camera', brand: 'Canon', price: 339990, tags: ['camera', 'professional'] },
    { name: 'LG 65" OLED TV', brand: 'LG', price: 199990, tags: ['tv', 'entertainment'] },
  ],
  'Fashion & Beauty': [
    { name: 'Premium Leather Jacket', brand: 'Zara', price: 8999, tags: ['clothing', 'winter', 'premium'] },
    { name: 'Designer Handbag', brand: 'Coach', price: 24999, tags: ['accessories', 'luxury'] },
    { name: 'Running Shoes Pro', brand: 'Nike', price: 12999, tags: ['footwear', 'sports'] },
    { name: 'Silk Saree Collection', brand: 'Fabindia', price: 15999, tags: ['ethnic', 'traditional'] },
    { name: 'Men\'s Formal Suit', brand: 'Raymond', price: 18999, tags: ['formal', 'business'] },
    { name: 'Skincare Essentials Kit', brand: 'Lakme', price: 2499, tags: ['beauty', 'skincare'] },
  ],
  'Food & Dining': [
    { name: 'Gourmet Pizza Meal', brand: 'Pizza Hut', price: 599, tags: ['fast-food', 'italian'] },
    { name: 'Biryani Family Pack', brand: 'Paradise', price: 799, tags: ['indian', 'rice'] },
    { name: 'Sushi Platter Premium', brand: 'Sushi House', price: 1299, tags: ['japanese', 'seafood'] },
    { name: 'Continental Breakfast', brand: 'Cafe Coffee Day', price: 399, tags: ['breakfast', 'cafe'] },
    { name: 'Butter Chicken Combo', brand: 'Punjab Grill', price: 549, tags: ['indian', 'curry'] },
    { name: 'Fresh Salad Bowl', brand: 'Salad Days', price: 349, tags: ['healthy', 'vegetarian'] },
  ],
  'Home & Living': [
    { name: 'Memory Foam Mattress', brand: 'Sleepwell', price: 25999, tags: ['bedroom', 'comfort'] },
    { name: 'Modular Sofa Set', brand: 'IKEA', price: 45999, tags: ['living-room', 'furniture'] },
    { name: 'Smart LED Light Set', brand: 'Philips', price: 4999, tags: ['lighting', 'smart-home'] },
    { name: 'Kitchen Cookware Set', brand: 'Prestige', price: 6999, tags: ['kitchen', 'cooking'] },
    { name: 'Cotton Bedsheet Set', brand: 'Bombay Dyeing', price: 2999, tags: ['bedroom', 'bedding'] },
    { name: 'Dining Table Set', brand: 'Urban Ladder', price: 35999, tags: ['dining', 'furniture'] },
  ],
  'Health & Wellness': [
    { name: 'Multivitamin Tablets', brand: 'Himalaya', price: 499, tags: ['supplements', 'health'] },
    { name: 'Yoga Mat Premium', brand: 'Decathlon', price: 1299, tags: ['fitness', 'yoga'] },
    { name: 'Digital Blood Pressure Monitor', brand: 'Omron', price: 2499, tags: ['medical', 'monitoring'] },
    { name: 'Protein Powder 1kg', brand: 'MuscleBlaze', price: 1999, tags: ['fitness', 'nutrition'] },
    { name: 'Essential Oil Diffuser', brand: 'Aroma Magic', price: 1499, tags: ['wellness', 'aromatherapy'] },
  ],
  'Grocery & Essentials': [
    { name: 'Organic Rice 5kg', brand: 'India Gate', price: 599, tags: ['staples', 'organic'] },
    { name: 'Cold Pressed Olive Oil', brand: 'Figaro', price: 899, tags: ['cooking-oil', 'healthy'] },
    { name: 'Premium Tea Collection', brand: 'Tata Tea', price: 399, tags: ['beverages', 'tea'] },
    { name: 'Dry Fruits Gift Box', brand: 'Nutraj', price: 1299, tags: ['dry-fruits', 'gift'] },
    { name: 'Organic Honey 500g', brand: 'Dabur', price: 349, tags: ['organic', 'natural'] },
  ],
  'Sports & Fitness': [
    { name: 'Professional Cricket Bat', brand: 'MRF', price: 4999, tags: ['cricket', 'sports'] },
    { name: 'Treadmill Home Pro', brand: 'Lifelong', price: 29999, tags: ['fitness', 'gym'] },
    { name: 'Football Official Size', brand: 'Nivia', price: 999, tags: ['football', 'sports'] },
    { name: 'Dumbbells Set 20kg', brand: 'Kakss', price: 3999, tags: ['gym', 'weights'] },
    { name: 'Badminton Racket Pro', brand: 'Yonex', price: 2999, tags: ['badminton', 'sports'] },
  ],
  'Books & Stationery': [
    { name: 'Bestseller Novel Collection', brand: 'Penguin', price: 799, tags: ['books', 'fiction'] },
    { name: 'Executive Notebook Set', brand: 'Classmate', price: 399, tags: ['stationery', 'office'] },
    { name: 'Art Supplies Kit', brand: 'Camlin', price: 1299, tags: ['art', 'creative'] },
    { name: 'Self-Help Book Bundle', brand: 'Various', price: 999, tags: ['books', 'motivation'] },
  ],
  'Kids & Toys': [
    { name: 'LEGO City Set', brand: 'LEGO', price: 3999, tags: ['toys', 'building'] },
    { name: 'Remote Control Car', brand: 'Hot Wheels', price: 1999, tags: ['toys', 'cars'] },
    { name: 'Educational Tablet for Kids', brand: 'VTech', price: 4999, tags: ['educational', 'tech'] },
    { name: 'Board Games Collection', brand: 'Funskool', price: 899, tags: ['games', 'family'] },
  ],
  'Automotive': [
    { name: 'Car Dashboard Camera', brand: 'Qubo', price: 3999, tags: ['car', 'safety'] },
    { name: 'Premium Car Seat Covers', brand: 'AutoFurnish', price: 2999, tags: ['car', 'accessories'] },
    { name: 'Portable Air Compressor', brand: 'Bergmann', price: 1999, tags: ['car', 'tools'] },
  ],
  'Pet Supplies': [
    { name: 'Premium Dog Food 10kg', brand: 'Pedigree', price: 2499, tags: ['pet', 'dog'] },
    { name: 'Cat Scratching Post', brand: 'PetShop', price: 1999, tags: ['pet', 'cat'] },
    { name: 'Aquarium Starter Kit', brand: 'Aqueon', price: 4999, tags: ['pet', 'fish'] },
  ],
  'Jewellery': [
    { name: 'Gold Plated Necklace Set', brand: 'Tanishq', price: 12999, tags: ['jewellery', 'gold'] },
    { name: 'Silver Anklet Pair', brand: 'Giva', price: 1999, tags: ['jewellery', 'silver'] },
    { name: 'Diamond Earrings', brand: 'CaratLane', price: 24999, tags: ['jewellery', 'diamond'] },
  ],
};

// Reliable Unsplash images by category
const categoryImages = {
  'Electronics': [
    'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1585060544812-6b45742d762f?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop',
  ],
  'Fashion & Beauty': [
    'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1560243563-062bfc001d68?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1558171813-4c088753af8f?w=400&h=400&fit=crop',
  ],
  'Food & Dining': [
    'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=400&fit=crop',
  ],
  'Home & Living': [
    'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1484101403633-562f891dc89a?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=400&h=400&fit=crop',
  ],
  'Health & Wellness': [
    'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=400&h=400&fit=crop',
  ],
  'Grocery & Essentials': [
    'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1553531384-cc64ac80f931?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1608686207856-001b95cf60ca?w=400&h=400&fit=crop',
  ],
  'Sports & Fitness': [
    'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=400&h=400&fit=crop',
  ],
  'Books & Stationery': [
    'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=400&h=400&fit=crop',
  ],
  'Kids & Toys': [
    'https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=400&h=400&fit=crop',
  ],
  'default': [
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop',
  ]
};

function getImageForCategory(categoryName) {
  const images = categoryImages[categoryName] || categoryImages['default'];
  return images[Math.floor(Math.random() * images.length)];
}

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

async function run() {
  await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
  const db = mongoose.connection.db;

  const products = db.collection('products');
  const stores = db.collection('stores');
  const categories = db.collection('categories');

  console.log('=== COMPREHENSIVE PRODUCT MIGRATION ===\n');

  // Step 1: Fix stores merchant field
  console.log('Step 1: Linking all stores to merchant...');
  const storeUpdateResult = await stores.updateMany(
    {},
    { $set: { merchant: MERCHANT_ID } }
  );
  console.log(`Updated ${storeUpdateResult.modifiedCount} stores with merchant ID\n`);

  // Step 2: Get all categories with their subcategories
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

  // Step 3: Get all stores
  const allStores = await stores.find({ isActive: true }).toArray();
  console.log(`Found ${allStores.length} active stores\n`);

  // Step 4: Assign subcategories to existing products
  console.log('Step 2: Assigning subcategories to existing products...');
  let subcategoryUpdated = 0;

  const existingProducts = await products.find({ isDeleted: { $ne: true } }).toArray();

  for (const product of existingProducts) {
    if (!product.subCategory && product.category) {
      const categoryId = product.category.toString();
      const subcategories = childCats.filter(c => c.parentCategory?.toString() === categoryId);

      if (subcategories.length > 0) {
        const randomSubcat = subcategories[Math.floor(Math.random() * subcategories.length)];
        await products.updateOne(
          { _id: product._id },
          { $set: { subCategory: randomSubcat._id } }
        );
        subcategoryUpdated++;
      }
    }
  }
  console.log(`Assigned subcategories to ${subcategoryUpdated} products\n`);

  // Step 5: Find stores without products
  console.log('Step 3: Creating products for stores without products...');
  const storeProductCounts = await products.aggregate([
    { $match: { isDeleted: { $ne: true } } },
    { $group: { _id: '$store', count: { $sum: 1 } } }
  ]).toArray();

  const storesWithProductIds = new Set(storeProductCounts.map(s => s._id?.toString()));
  const storesWithoutProducts = allStores.filter(s => !storesWithProductIds.has(s._id.toString()));

  console.log(`Found ${storesWithoutProducts.length} stores without products`);

  let newProductsCreated = 0;

  for (const store of storesWithoutProducts) {
    // Find the store's category
    const storeCategory = allCategories.find(c => c._id.toString() === store.category?.toString());
    if (!storeCategory) continue;

    const categoryName = storeCategory.name;
    const templates = productTemplates[categoryName] || productTemplates['Electronics'];
    const subcategories = parentToChildren[store.category?.toString()] || [];

    // Create 5-8 products for this store
    const numProducts = Math.floor(Math.random() * 4) + 5;

    for (let i = 0; i < numProducts && i < templates.length; i++) {
      const template = templates[i];
      const subcat = subcategories.length > 0
        ? subcategories[Math.floor(Math.random() * subcategories.length)]
        : null;

      const productData = {
        name: template.name,
        slug: generateSlug(template.name, Date.now().toString().slice(-6) + i),
        description: `High-quality ${template.name} from ${template.brand}. Perfect for your needs.`,
        shortDescription: `Premium ${template.name}`,
        productType: 'product',
        category: store.category,
        subCategory: subcat?._id || null,
        store: store._id,
        merchantId: MERCHANT_ID,
        brand: template.brand,
        sku: generateSKU(),
        images: [getImageForCategory(categoryName)],
        pricing: {
          original: Math.round(template.price * 1.2),
          selling: template.price,
          discount: 20,
          currency: 'INR'
        },
        inventory: {
          stock: Math.floor(Math.random() * 100) + 50,
          isAvailable: true,
          lowStockThreshold: 10,
          unlimited: false
        },
        ratings: {
          average: (Math.random() * 1.5 + 3.5).toFixed(1) * 1,
          count: Math.floor(Math.random() * 500) + 50,
          distribution: { 5: 45, 4: 30, 3: 15, 2: 7, 1: 3 }
        },
        tags: template.tags,
        cashback: {
          percentage: Math.floor(Math.random() * 10) + 5,
          maxAmount: Math.floor(template.price * 0.1),
          isActive: true
        },
        deliveryInfo: {
          estimatedDays: '2-3 days',
          freeShippingThreshold: 500,
          expressAvailable: true,
          standardDeliveryTime: '2-3 days',
          expressDeliveryTime: 'Under 30min'
        },
        isActive: true,
        isFeatured: Math.random() > 0.7,
        isDigital: false,
        visibility: Math.random() > 0.8 ? 'featured' : 'public',
        seo: {
          title: template.name,
          description: `Buy ${template.name} at best prices`,
          keywords: template.tags
        },
        analytics: {
          views: Math.floor(Math.random() * 1000),
          purchases: Math.floor(Math.random() * 100),
          conversions: Math.floor(Math.random() * 50),
          wishlistAdds: Math.floor(Math.random() * 200),
          shareCount: Math.floor(Math.random() * 50),
          returnRate: Math.random() * 5,
          avgRating: (Math.random() * 1.5 + 3.5).toFixed(1) * 1
        },
        specifications: [],
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await products.insertOne(productData);
      newProductsCreated++;
    }

    console.log(`Created ${numProducts} products for store: ${store.name}`);
  }

  console.log(`\nTotal new products created: ${newProductsCreated}\n`);

  // Step 6: Update products for homepage sections
  console.log('Step 4: Updating products for homepage sections...');

  // Mark some products as new arrivals (created in last 7 days simulation)
  const allProductIds = await products.find({ isDeleted: { $ne: true } }).project({ _id: 1 }).toArray();
  const productIdList = allProductIds.map(p => p._id);

  // Shuffle and pick products for different sections
  const shuffled = productIdList.sort(() => Math.random() - 0.5);

  // New Arrivals: 30 products
  const newArrivals = shuffled.slice(0, 30);
  await products.updateMany(
    { _id: { $in: newArrivals } },
    {
      $set: {
        createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        'tags': { $addToSet: 'new-arrival' }
      },
      $addToSet: { tags: 'new-arrival' }
    }
  );
  console.log('Marked 30 products as new arrivals');

  // Just For You: 50 products with high ratings
  const justForYou = shuffled.slice(30, 80);
  await products.updateMany(
    { _id: { $in: justForYou } },
    {
      $set: {
        'ratings.average': (Math.random() * 0.5 + 4.5).toFixed(1) * 1,
        'analytics.views': { $gt: 500 }
      },
      $addToSet: { tags: 'recommended' }
    }
  );
  console.log('Marked 50 products for Just For You section');

  // Featured Products: 40 products
  const featured = shuffled.slice(80, 120);
  await products.updateMany(
    { _id: { $in: featured } },
    {
      $set: {
        isFeatured: true,
        visibility: 'featured'
      },
      $addToSet: { tags: 'featured' }
    }
  );
  console.log('Marked 40 products as featured');

  // Best Sellers: 30 products with high purchases
  const bestSellers = shuffled.slice(120, 150);
  await products.updateMany(
    { _id: { $in: bestSellers } },
    {
      $set: {
        'analytics.purchases': Math.floor(Math.random() * 500) + 200
      },
      $addToSet: { tags: 'best-seller' }
    }
  );
  console.log('Marked 30 products as best sellers');

  // Step 7: Update all products with reliable images
  console.log('\nStep 5: Updating product images...');

  const productsToUpdate = await products.find({
    isDeleted: { $ne: true },
    $or: [
      { images: { $size: 0 } },
      { images: { $elemMatch: { $regex: /placeholder|via\.placeholder/i } } },
      { 'images.0': { $exists: false } }
    ]
  }).toArray();

  let imagesUpdated = 0;
  for (const product of productsToUpdate) {
    const cat = allCategories.find(c => c._id.toString() === product.category?.toString());
    const catName = cat?.name || 'default';
    const newImage = getImageForCategory(catName);

    await products.updateOne(
      { _id: product._id },
      { $set: { images: [newImage] } }
    );
    imagesUpdated++;
  }
  console.log(`Updated images for ${imagesUpdated} products`);

  // Step 8: Ensure merchantId is set on all products
  console.log('\nStep 6: Ensuring merchantId on all products...');
  const merchantUpdate = await products.updateMany(
    { merchantId: { $exists: false } },
    { $set: { merchantId: MERCHANT_ID } }
  );
  console.log(`Updated merchantId on ${merchantUpdate.modifiedCount} products`);

  // Step 9: Ensure all products have proper storeId
  console.log('\nStep 7: Validating store references...');
  const storeIds = new Set(allStores.map(s => s._id.toString()));
  const orphanProducts = await products.find({
    isDeleted: { $ne: true },
    store: { $nin: Array.from(storeIds).map(id => new mongoose.Types.ObjectId(id)) }
  }).toArray();

  if (orphanProducts.length > 0) {
    console.log(`Found ${orphanProducts.length} orphan products, reassigning...`);
    for (const product of orphanProducts) {
      const randomStore = allStores[Math.floor(Math.random() * allStores.length)];
      await products.updateOne(
        { _id: product._id },
        { $set: { store: randomStore._id } }
      );
    }
  } else {
    console.log('All products have valid store references');
  }

  // Final Summary
  console.log('\n=== MIGRATION COMPLETE ===\n');

  const finalStats = {
    totalProducts: await products.countDocuments({ isDeleted: { $ne: true } }),
    activeProducts: await products.countDocuments({ isActive: true, isDeleted: { $ne: true } }),
    featuredProducts: await products.countDocuments({ isFeatured: true, isDeleted: { $ne: true } }),
    productsWithSubcategory: await products.countDocuments({ subCategory: { $ne: null }, isDeleted: { $ne: true } }),
    storesWithProducts: (await products.aggregate([
      { $match: { isDeleted: { $ne: true } } },
      { $group: { _id: '$store' } }
    ]).toArray()).length
  };

  console.log('Total Products:', finalStats.totalProducts);
  console.log('Active Products:', finalStats.activeProducts);
  console.log('Featured Products:', finalStats.featuredProducts);
  console.log('Products with Subcategory:', finalStats.productsWithSubcategory);
  console.log('Stores with Products:', finalStats.storesWithProducts, '/', allStores.length);

  await mongoose.disconnect();
}

run().catch(console.error);
