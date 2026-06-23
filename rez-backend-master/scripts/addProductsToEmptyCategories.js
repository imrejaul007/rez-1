const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };
const DB_NAME = 'test';

// Store and Merchant to link products to
const STORE_ID = new ObjectId('6929362731c5e5649ef7a27b');
const MERCHANT_ID = new ObjectId('68aaa623d4ae0ab11dc2436f');

// Product templates for each category type
const PRODUCT_TEMPLATES = {
  // Fashion
  'belts': [
    { name: 'Classic Leather Belt', price: 899, image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400', brand: 'Fashion Hub' },
    { name: 'Braided Canvas Belt', price: 599, image: 'https://images.unsplash.com/photo-1624222247344-550fb60583dc?w=400', brand: 'Style Co' },
    { name: 'Formal Black Belt', price: 1299, image: 'https://images.unsplash.com/photo-1585856331426-d7a22a98a182?w=400', brand: 'Premium' },
    { name: 'Reversible Belt', price: 999, image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400', brand: 'Dual Style' },
  ],
  'ties-accessories': [
    { name: 'Silk Necktie Blue', price: 799, image: 'https://images.unsplash.com/photo-1589756823695-278bc923f962?w=400', brand: 'Formal Wear' },
    { name: 'Bow Tie Classic', price: 599, image: 'https://images.unsplash.com/photo-1598808503746-f34c53b9323e?w=400', brand: 'Gentleman' },
    { name: 'Pocket Square Set', price: 499, image: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400', brand: 'Accessory King' },
  ],
  'scarves-shawls': [
    { name: 'Wool Scarf Winter', price: 1299, image: 'https://images.unsplash.com/photo-1520903920243-00d872a2d1c9?w=400', brand: 'Winter Wear' },
    { name: 'Silk Shawl Elegant', price: 1999, image: 'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=400', brand: 'Luxury' },
    { name: 'Cotton Stole', price: 699, image: 'https://images.unsplash.com/photo-1520903920243-00d872a2d1c9?w=400', brand: 'Comfort' },
  ],
  'caps-hats': [
    { name: 'Baseball Cap', price: 499, image: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=400', brand: 'Sports Style' },
    { name: 'Fedora Hat', price: 899, image: 'https://images.unsplash.com/photo-1514327605112-b887c0e61c0a?w=400', brand: 'Classic' },
    { name: 'Beanie Winter', price: 399, image: 'https://images.unsplash.com/photo-1576871337622-98d48d1cf531?w=400', brand: 'Cozy' },
  ],
  'socks': [
    { name: 'Cotton Socks Pack', price: 299, image: 'https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=400', brand: 'Comfort Fit' },
    { name: 'Sports Socks Set', price: 399, image: 'https://images.unsplash.com/photo-1631451095765-2c91616fc9e6?w=400', brand: 'Active' },
    { name: 'Formal Dress Socks', price: 249, image: 'https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=400', brand: 'Executive' },
  ],

  // Electronics
  'smart-home': [
    { name: 'Smart LED Bulb', price: 799, image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400', brand: 'Smart Life' },
    { name: 'Smart Plug WiFi', price: 599, image: 'https://images.unsplash.com/photo-1558089687-f282ffcbc126?w=400', brand: 'Home Connect' },
    { name: 'Smart Door Lock', price: 4999, image: 'https://images.unsplash.com/photo-1558002038-1055907df827?w=400', brand: 'Secure Home' },
  ],
  'computer-accessories': [
    { name: 'Wireless Mouse', price: 799, image: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400', brand: 'Tech Gear' },
    { name: 'Mechanical Keyboard', price: 2499, image: 'https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?w=400', brand: 'Gamer Pro' },
    { name: 'USB Hub 4 Port', price: 599, image: 'https://images.unsplash.com/photo-1625723044792-44de16ccb4e9?w=400', brand: 'Connect Plus' },
  ],
  'printers-scanners': [
    { name: 'Inkjet Printer', price: 5999, image: 'https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=400', brand: 'Print Pro' },
    { name: 'Laser Printer', price: 12999, image: 'https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=400', brand: 'Office Master' },
    { name: 'Document Scanner', price: 3999, image: 'https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=400', brand: 'Scan Easy' },
  ],

  // Home & Living
  'rugs-carpets': [
    { name: 'Persian Style Rug', price: 3999, image: 'https://images.unsplash.com/photo-1600166898405-da9535204843?w=400', brand: 'Home Decor' },
    { name: 'Modern Area Rug', price: 2499, image: 'https://images.unsplash.com/photo-1600166898405-da9535204843?w=400', brand: 'Contemporary' },
    { name: 'Shag Carpet', price: 1999, image: 'https://images.unsplash.com/photo-1600166898405-da9535204843?w=400', brand: 'Cozy Home' },
  ],
  'bathroom-accessories': [
    { name: 'Towel Set Premium', price: 999, image: 'https://images.unsplash.com/photo-1620626011761-996317b8d101?w=400', brand: 'Bath Luxury' },
    { name: 'Shower Caddy', price: 599, image: 'https://images.unsplash.com/photo-1620626011761-996317b8d101?w=400', brand: 'Organize It' },
    { name: 'Bath Mat Set', price: 799, image: 'https://images.unsplash.com/photo-1620626011761-996317b8d101?w=400', brand: 'Comfort Step' },
  ],
  'garden-outdoor': [
    { name: 'Garden Tools Set', price: 1499, image: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400', brand: 'Green Thumb' },
    { name: 'Plant Pots Ceramic', price: 899, image: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=400', brand: 'Garden Beauty' },
    { name: 'Outdoor Chair', price: 2999, image: 'https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=400', brand: 'Patio Style' },
  ],

  // Food categories
  'italian': [
    { name: 'Margherita Pizza', price: 299, image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400', brand: 'Italian Kitchen' },
    { name: 'Pasta Alfredo', price: 249, image: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400', brand: 'Pasta House' },
    { name: 'Lasagna Classic', price: 349, image: 'https://images.unsplash.com/photo-1619895092538-128341789043?w=400', brand: 'Mama Mia' },
  ],
  'thai': [
    { name: 'Pad Thai Noodles', price: 279, image: 'https://images.unsplash.com/photo-1559314809-0d155014e29e?w=400', brand: 'Thai Spice' },
    { name: 'Green Curry', price: 299, image: 'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=400', brand: 'Bangkok Kitchen' },
    { name: 'Tom Yum Soup', price: 199, image: 'https://images.unsplash.com/photo-1548943487-a2e4e43b4853?w=400', brand: 'Thai Delight' },
  ],
  'japanese': [
    { name: 'Sushi Platter', price: 599, image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=400', brand: 'Sushi Master' },
    { name: 'Ramen Bowl', price: 349, image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400', brand: 'Noodle House' },
    { name: 'Tempura Set', price: 449, image: 'https://images.unsplash.com/photo-1580822184713-fc5400e7fe10?w=400', brand: 'Japanese Kitchen' },
  ],
  'mexican': [
    { name: 'Tacos Platter', price: 299, image: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400', brand: 'Taco Bell' },
    { name: 'Burrito Bowl', price: 349, image: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=400', brand: 'Mexican Grill' },
    { name: 'Quesadilla', price: 249, image: 'https://images.unsplash.com/photo-1618040996337-56904b7850b9?w=400', brand: 'Casa Mexico' },
  ],
  'bakery': [
    { name: 'Fresh Bread Loaf', price: 99, image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400', brand: 'Daily Bake' },
    { name: 'Croissant Pack', price: 149, image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400', brand: 'French Bakery' },
    { name: 'Cupcake Box', price: 299, image: 'https://images.unsplash.com/photo-1486427944299-d1955d23e34d?w=400', brand: 'Sweet Treats' },
  ],

  // Sports
  'tennis': [
    { name: 'Tennis Racket Pro', price: 2999, image: 'https://images.unsplash.com/photo-1617083934555-ac7d4c10c674?w=400', brand: 'Sport Pro' },
    { name: 'Tennis Balls Pack', price: 499, image: 'https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?w=400', brand: 'Game On' },
    { name: 'Tennis Bag', price: 1499, image: 'https://images.unsplash.com/photo-1617083934555-ac7d4c10c674?w=400', brand: 'Carry Pro' },
  ],
  'swimming': [
    { name: 'Swimming Goggles', price: 599, image: 'https://images.unsplash.com/photo-1560090995-01632a28895b?w=400', brand: 'Aqua Sport' },
    { name: 'Swim Cap', price: 299, image: 'https://images.unsplash.com/photo-1560090995-01632a28895b?w=400', brand: 'Swim Pro' },
    { name: 'Swimming Shorts', price: 799, image: 'https://images.unsplash.com/photo-1560090995-01632a28895b?w=400', brand: 'Beach Style' },
  ],
  'yoga': [
    { name: 'Yoga Mat Premium', price: 1299, image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400', brand: 'Zen Life' },
    { name: 'Yoga Block Set', price: 599, image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400', brand: 'Balance' },
    { name: 'Yoga Strap', price: 299, image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400', brand: 'Stretch Pro' },
  ],
  'cycling': [
    { name: 'Cycling Helmet', price: 1999, image: 'https://images.unsplash.com/photo-1557803175-d8a9cf9f0cd5?w=400', brand: 'Safe Ride' },
    { name: 'Cycling Gloves', price: 599, image: 'https://images.unsplash.com/photo-1557803175-d8a9cf9f0cd5?w=400', brand: 'Grip Pro' },
    { name: 'Bike Lock', price: 799, image: 'https://images.unsplash.com/photo-1557803175-d8a9cf9f0cd5?w=400', brand: 'Secure Bike' },
  ],

  // Baby & Kids
  'baby-care': [
    { name: 'Baby Diapers Pack', price: 799, image: 'https://images.unsplash.com/photo-1584839404042-8bc23752ce9e?w=400', brand: 'Baby Soft' },
    { name: 'Baby Lotion', price: 299, image: 'https://images.unsplash.com/photo-1584839404042-8bc23752ce9e?w=400', brand: 'Gentle Care' },
    { name: 'Baby Wipes', price: 199, image: 'https://images.unsplash.com/photo-1584839404042-8bc23752ce9e?w=400', brand: 'Clean Baby' },
  ],
  'toys-games': [
    { name: 'Building Blocks', price: 599, image: 'https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=400', brand: 'Fun Play' },
    { name: 'Board Game Family', price: 899, image: 'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=400', brand: 'Game Night' },
    { name: 'Soft Toy Bear', price: 499, image: 'https://images.unsplash.com/photo-1530325553241-4f6e7690cf36?w=400', brand: 'Cuddle Friends' },
  ],
  'kids-clothing': [
    { name: 'Kids T-Shirt Pack', price: 599, image: 'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=400', brand: 'Little Stars' },
    { name: 'Kids Jeans', price: 799, image: 'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=400', brand: 'Mini Fashion' },
    { name: 'Kids Dress', price: 899, image: 'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=400', brand: 'Pretty Kids' },
  ],

  // Pet Supplies
  'pet-food': [
    { name: 'Dog Food Premium', price: 999, image: 'https://images.unsplash.com/photo-1568640347023-a616a30bc3bd?w=400', brand: 'Pet Nutrition' },
    { name: 'Cat Food Pack', price: 799, image: 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=400', brand: 'Feline Care' },
    { name: 'Pet Treats', price: 299, image: 'https://images.unsplash.com/photo-1568640347023-a616a30bc3bd?w=400', brand: 'Yummy Pets' },
  ],
  'pet-accessories': [
    { name: 'Dog Collar', price: 399, image: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400', brand: 'Pet Style' },
    { name: 'Cat Bed', price: 899, image: 'https://images.unsplash.com/photo-1545249390-6bdfa286032f?w=400', brand: 'Cozy Pets' },
    { name: 'Pet Leash', price: 299, image: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400', brand: 'Walk Time' },
  ],

  // Auto & Tools
  'car-accessories': [
    { name: 'Car Phone Mount', price: 599, image: 'https://images.unsplash.com/photo-1489824904134-891ab64532f1?w=400', brand: 'Drive Safe' },
    { name: 'Car Seat Cover', price: 1499, image: 'https://images.unsplash.com/photo-1489824904134-891ab64532f1?w=400', brand: 'Auto Comfort' },
    { name: 'Car Charger', price: 399, image: 'https://images.unsplash.com/photo-1489824904134-891ab64532f1?w=400', brand: 'Power Drive' },
  ],
  'tools-hardware': [
    { name: 'Screwdriver Set', price: 799, image: 'https://images.unsplash.com/photo-1580402427914-a6cc60d7c1b8?w=400', brand: 'Tool Master' },
    { name: 'Drill Machine', price: 2999, image: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400', brand: 'Power Tools' },
    { name: 'Tool Box', price: 1499, image: 'https://images.unsplash.com/photo-1580402427914-a6cc60d7c1b8?w=400', brand: 'Organize Pro' },
  ],
};

// Generic products for categories without specific templates
function generateGenericProducts(categoryName, categorySlug) {
  const basePrice = Math.floor(Math.random() * 2000) + 299;
  return [
    {
      name: `Premium ${categoryName} Item`,
      price: basePrice + 500,
      image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400',
      brand: 'Premium Brand'
    },
    {
      name: `${categoryName} Essential`,
      price: basePrice,
      image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400',
      brand: 'Essential Co'
    },
    {
      name: `${categoryName} Value Pack`,
      price: basePrice - 100,
      image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400',
      brand: 'Value Store'
    },
  ];
}

async function addProductsToEmptyCategories() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db(DB_NAME);
    const productsCollection = db.collection('products');
    const categoriesCollection = db.collection('categories');

    // Get all categories
    const categories = await categoriesCollection.find({ isActive: true }).toArray();
    console.log(`📁 Found ${categories.length} active categories\n`);

    let totalAdded = 0;
    let categoriesUpdated = 0;

    for (const category of categories) {
      // Check if category has products
      const productCount = await productsCollection.countDocuments({ category: category._id });

      if (productCount === 0) {
        // Get products for this category
        let products = PRODUCT_TEMPLATES[category.slug];

        if (!products) {
          // Generate generic products
          products = generateGenericProducts(category.name, category.slug);
        }

        console.log(`📦 Adding ${products.length} products to "${category.name}" (${category.slug})...`);

        for (const product of products) {
          const newProduct = {
            name: product.name,
            title: product.name,
            slug: `${product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            sku: `SKU-${category.slug.toUpperCase().slice(0, 4)}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            brand: product.brand,
            description: `High quality ${product.name} from ${product.brand}. Perfect for your ${category.name.toLowerCase()} needs.`,
            image: product.image,
            images: [product.image],
            price: {
              current: product.price,
              original: Math.round(product.price * 1.2),
              currency: '₹',
              discount: 20
            },
            category: category._id,
            categorySlug: category.slug,
            store: STORE_ID,
            merchantId: MERCHANT_ID,
            rating: {
              average: (Math.random() * 2 + 3).toFixed(1),
              count: Math.floor(Math.random() * 100) + 10
            },
            ratings: {
              average: (Math.random() * 2 + 3).toFixed(1),
              count: Math.floor(Math.random() * 100) + 10
            },
            availabilityStatus: 'in_stock',
            tags: [category.name.toLowerCase(), product.brand.toLowerCase(), 'new'],
            isRecommended: Math.random() > 0.5,
            isFeatured: Math.random() > 0.7,
            isNewArrival: true,
            isActive: true,
            type: category.type || 'home_delivery',
            inventory: {
              quantity: Math.floor(Math.random() * 100) + 10,
              lowStockThreshold: 5
            },
            createdAt: new Date(),
            updatedAt: new Date()
          };

          await productsCollection.insertOne(newProduct);
          totalAdded++;
        }

        categoriesUpdated++;
      }
    }

    console.log(`\n${'='.repeat(50)}`);
    console.log(`📊 RESULTS:`);
    console.log(`  ✅ Products added: ${totalAdded}`);
    console.log(`  ✅ Categories updated: ${categoriesUpdated}`);

    // Final verification
    console.log(`\n🔍 VERIFICATION - Categories with products:`);
    const categoriesWithProducts = await productsCollection.aggregate([
      { $group: { _id: '$categorySlug', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]).toArray();

    categoriesWithProducts.forEach(cat => {
      console.log(`  ${cat._id || 'uncategorized'}: ${cat.count} products`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

addProductsToEmptyCategories();
