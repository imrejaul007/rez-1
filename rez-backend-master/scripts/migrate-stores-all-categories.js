const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };
const DB_NAME = 'test';
const MERCHANT_ID = '68aaa623d4ae0ab11dc2436f';

// Professional store templates mapped to category keywords
const storeData = {
  // Fashion categories
  'fashion': [
    { name: 'Urban Style Co', desc: 'Premium fashion for modern lifestyle', logo: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=200&h=200&fit=crop', banner: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=800&h=400&fit=crop' },
    { name: 'Trendy Threads', desc: 'Latest trends in fashion', logo: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200&h=200&fit=crop', banner: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=800&h=400&fit=crop' },
    { name: 'Style Hub', desc: 'Your fashion destination', logo: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=200&h=200&fit=crop', banner: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&h=400&fit=crop' },
  ],
  'men': [
    { name: 'Gentleman\'s Choice', desc: 'Premium menswear collection', logo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop', banner: 'https://images.unsplash.com/photo-1490578474895-699cd4e2cf59?w=800&h=400&fit=crop' },
    { name: 'Urban Men', desc: 'Modern men\'s fashion', logo: 'https://images.unsplash.com/photo-1617137968427-85924c800a22?w=200&h=200&fit=crop', banner: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=400&fit=crop' },
  ],
  'women': [
    { name: 'Elegance Boutique', desc: 'Elegant fashion for women', logo: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=200&h=200&fit=crop', banner: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=800&h=400&fit=crop' },
    { name: 'Femme Fatale', desc: 'Stylish women\'s fashion', logo: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=200&h=200&fit=crop', banner: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800&h=400&fit=crop' },
  ],
  'kids': [
    { name: 'Little Stars', desc: 'Fashion for little ones', logo: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=200&h=200&fit=crop', banner: 'https://images.unsplash.com/photo-1485546246426-74dc88dec4d9?w=800&h=400&fit=crop' },
    { name: 'Kids Paradise', desc: 'Complete kids fashion', logo: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=200&h=200&fit=crop', banner: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=800&h=400&fit=crop' },
  ],
  'footwear': [
    { name: 'Sole Studio', desc: 'Premium footwear collection', logo: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&h=200&fit=crop', banner: 'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=800&h=400&fit=crop' },
    { name: 'Step Right', desc: 'Walk in style', logo: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=200&h=200&fit=crop', banner: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&h=400&fit=crop' },
  ],
  'accessori': [
    { name: 'Accent Accessories', desc: 'Complete your look', logo: 'https://images.unsplash.com/photo-1583292650898-7d22cd27ca6f?w=200&h=200&fit=crop', banner: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&h=400&fit=crop' },
    { name: 'Style Plus', desc: 'Trendy accessories', logo: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&h=200&fit=crop', banner: 'https://images.unsplash.com/photo-1583292650898-7d22cd27ca6f?w=800&h=400&fit=crop' },
  ],
  // Electronics
  'electronic': [
    { name: 'Tech Galaxy', desc: 'Latest gadgets and electronics', logo: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=200&h=200&fit=crop', banner: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=800&h=400&fit=crop' },
    { name: 'Digital World', desc: 'Your tech destination', logo: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=200&h=200&fit=crop', banner: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&h=400&fit=crop' },
  ],
  'smartphone': [
    { name: 'Mobile Hub', desc: 'Latest smartphones', logo: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=200&h=200&fit=crop', banner: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&h=400&fit=crop' },
  ],
  'headphone': [
    { name: 'Audio Excellence', desc: 'Premium audio gear', logo: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&h=200&fit=crop', banner: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800&h=400&fit=crop' },
  ],
  'television': [
    { name: 'Vision Plus', desc: 'Home entertainment experts', logo: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=200&h=200&fit=crop', banner: 'https://images.unsplash.com/photo-1593784991095-a205069470b6?w=800&h=400&fit=crop' },
  ],
  'speaker': [
    { name: 'Sound Wave', desc: 'Premium speakers', logo: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=200&h=200&fit=crop', banner: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=800&h=400&fit=crop' },
  ],
  'gaming': [
    { name: 'Game Zone', desc: 'Gaming paradise', logo: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=200&h=200&fit=crop', banner: 'https://images.unsplash.com/photo-1511882150382-421056c89033?w=800&h=400&fit=crop' },
  ],
  // Food categories
  'food': [
    { name: 'The Grand Kitchen', desc: 'Fine dining delivered', logo: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200&h=200&fit=crop', banner: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=400&fit=crop' },
    { name: 'Foodie Express', desc: 'Delicious food delivered fast', logo: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=200&h=200&fit=crop', banner: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=400&fit=crop' },
  ],
  'restaurant': [
    { name: 'Royal Dine', desc: 'Premium dining experience', logo: 'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=200&h=200&fit=crop', banner: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=400&fit=crop' },
  ],
  'chinese': [
    { name: 'Dragon Wok', desc: 'Authentic Chinese cuisine', logo: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=200&h=200&fit=crop', banner: 'https://images.unsplash.com/photo-1525755662778-989d0524087e?w=800&h=400&fit=crop' },
  ],
  'dessert': [
    { name: 'Sweet Dreams', desc: 'Heavenly desserts', logo: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=200&h=200&fit=crop', banner: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800&h=400&fit=crop' },
  ],
  'healthy': [
    { name: 'Green Bowl', desc: 'Healthy eating made easy', logo: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=200&h=200&fit=crop', banner: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&h=400&fit=crop' },
  ],
  // Grocery
  'grocery': [
    { name: 'Fresh Mart', desc: 'Fresh groceries daily', logo: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&h=200&fit=crop', banner: 'https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=800&h=400&fit=crop' },
    { name: 'Daily Basket', desc: 'Your daily essentials', logo: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=200&h=200&fit=crop', banner: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&h=400&fit=crop' },
  ],
  'fruit': [
    { name: 'Fruity Fresh', desc: 'Farm fresh fruits', logo: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=200&h=200&fit=crop', banner: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=800&h=400&fit=crop' },
  ],
  'vegetable': [
    { name: 'Green Garden', desc: 'Fresh vegetables', logo: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=200&h=200&fit=crop', banner: 'https://images.unsplash.com/photo-1590779033100-9f60a05a013d?w=800&h=400&fit=crop' },
  ],
  'staple': [
    { name: 'Staples Plus', desc: 'Daily staples', logo: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=200&h=200&fit=crop', banner: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&h=400&fit=crop' },
  ],
  'organic': [
    { name: 'Organic Life', desc: '100% organic products', logo: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&h=200&fit=crop', banner: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800&h=400&fit=crop' },
  ],
  'meat': [
    { name: 'Fresh Cuts', desc: 'Premium quality meats', logo: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=200&h=200&fit=crop', banner: 'https://images.unsplash.com/photo-1551028150-64b9f398f678?w=800&h=400&fit=crop' },
  ],
  // Health & Beauty
  'beauty': [
    { name: 'Glow Studio', desc: 'Beauty essentials', logo: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=200&h=200&fit=crop', banner: 'https://images.unsplash.com/photo-1487412912498-0447578fcca8?w=800&h=400&fit=crop' },
    { name: 'Beauty Bar', desc: 'Your beauty destination', logo: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=200&h=200&fit=crop', banner: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&h=400&fit=crop' },
  ],
  'health': [
    { name: 'Wellness Hub', desc: 'Your health partner', logo: 'https://images.unsplash.com/photo-1505576399279-565b52d4ac71?w=200&h=200&fit=crop', banner: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&h=400&fit=crop' },
    { name: 'Vita Life', desc: 'Health and wellness', logo: 'https://images.unsplash.com/photo-1550572017-edd951aa8f72?w=200&h=200&fit=crop', banner: 'https://images.unsplash.com/photo-1505576399279-565b52d4ac71?w=800&h=400&fit=crop' },
  ],
  'medicine': [
    { name: 'MediCare Plus', desc: 'Pharmacy and healthcare', logo: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=200&h=200&fit=crop', banner: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&h=400&fit=crop' },
  ],
  'salon': [
    { name: 'Style Salon', desc: 'Premium salon services', logo: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=200&h=200&fit=crop', banner: 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=800&h=400&fit=crop' },
  ],
  'spa': [
    { name: 'Zen Spa', desc: 'Relaxation and wellness', logo: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=200&h=200&fit=crop', banner: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&h=400&fit=crop' },
  ],
  'perfume': [
    { name: 'Fragrance House', desc: 'Premium perfumes', logo: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=200&h=200&fit=crop', banner: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=800&h=400&fit=crop' },
  ],
  // Home & Living
  'home': [
    { name: 'Home Elegance', desc: 'Transform your home', logo: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=200&h=200&fit=crop', banner: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&h=400&fit=crop' },
    { name: 'Cozy Living', desc: 'Furniture and decor', logo: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=200&h=200&fit=crop', banner: 'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=800&h=400&fit=crop' },
  ],
  // Books & Stationery
  'book': [
    { name: 'Book Haven', desc: 'Books for everyone', logo: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=200&h=200&fit=crop', banner: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800&h=400&fit=crop' },
    { name: 'Page Turner', desc: 'Your reading destination', logo: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=200&h=200&fit=crop', banner: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=800&h=400&fit=crop' },
  ],
  'stationery': [
    { name: 'Write Right', desc: 'Premium stationery', logo: 'https://images.unsplash.com/photo-1456735190827-d1262f71b8a3?w=200&h=200&fit=crop', banner: 'https://images.unsplash.com/photo-1452457750107-cd084dce177d?w=800&h=400&fit=crop' },
  ],
  // Sports
  'sport': [
    { name: 'Sports Arena', desc: 'Sports equipment', logo: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=200&h=200&fit=crop', banner: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=800&h=400&fit=crop' },
    { name: 'Fit Zone', desc: 'Fitness gear', logo: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=200&h=200&fit=crop', banner: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&h=400&fit=crop' },
  ],
  // Jewelry
  'jewel': [
    { name: 'Gold Palace', desc: 'Fine jewelry', logo: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=200&h=200&fit=crop', banner: 'https://images.unsplash.com/photo-1506630448388-4e683c67ddb0?w=800&h=400&fit=crop' },
    { name: 'Diamond Dreams', desc: 'Exquisite jewelry', logo: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=200&h=200&fit=crop', banner: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800&h=400&fit=crop' },
  ],
  'sunglass': [
    { name: 'Shades Studio', desc: 'Designer sunglasses', logo: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=200&h=200&fit=crop', banner: 'https://images.unsplash.com/photo-1473496169904-658ba7c44d8a?w=800&h=400&fit=crop' },
  ],
  // Entertainment
  'entertainment': [
    { name: 'Fun Factory', desc: 'Entertainment for all', logo: 'https://images.unsplash.com/photo-1511882150382-421056c89033?w=200&h=200&fit=crop', banner: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=400&fit=crop' },
  ],
  // Toys
  'toy': [
    { name: 'Toy World', desc: 'Toys for all ages', logo: 'https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=200&h=200&fit=crop', banner: 'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=800&h=400&fit=crop' },
  ],
  // Automotive
  'auto': [
    { name: 'Auto Zone', desc: 'Car accessories', logo: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=200&h=200&fit=crop', banner: 'https://images.unsplash.com/photo-1489824904134-891ab64532f1?w=800&h=400&fit=crop' },
  ],
  'car': [
    { name: 'Drive Pro', desc: 'Auto parts and accessories', logo: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=200&h=200&fit=crop', banner: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=800&h=400&fit=crop' },
  ],
  // Pet
  'pet': [
    { name: 'Pet Paradise', desc: 'Everything for pets', logo: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=200&h=200&fit=crop', banner: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800&h=400&fit=crop' },
  ],
  // Gift
  'gift': [
    { name: 'Gift Gallery', desc: 'Perfect gifts for all', logo: 'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=200&h=200&fit=crop', banner: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=800&h=400&fit=crop' },
  ],
  // Travel
  'travel': [
    { name: 'Wanderlust', desc: 'Travel essentials', logo: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=200&h=200&fit=crop', banner: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&h=400&fit=crop' },
  ],
  // Fleet Market
  'fleet': [
    { name: 'Fleet Mart', desc: 'Wholesale deals', logo: 'https://images.unsplash.com/photo-1553413077-190dd305871c?w=200&h=200&fit=crop', banner: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&h=400&fit=crop' },
  ],
  // Default
  'default': [
    { name: 'Value Store', desc: 'Quality products', logo: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=200&h=200&fit=crop', banner: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=800&h=400&fit=crop' },
    { name: 'Smart Shop', desc: 'Shop smart', logo: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=200&h=200&fit=crop', banner: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&h=400&fit=crop' },
  ],
};

const cities = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Hyderabad', 'Pune', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Lucknow'];
const states = ['Maharashtra', 'Delhi', 'Karnataka', 'Tamil Nadu', 'Telangana', 'Maharashtra', 'West Bengal', 'Gujarat', 'Rajasthan', 'Uttar Pradesh'];

function getStoreTemplate(categoryName) {
  const lowerName = categoryName.toLowerCase();
  for (const [key, templates] of Object.entries(storeData)) {
    if (lowerName.includes(key)) {
      return templates;
    }
  }
  return storeData['default'];
}

async function migrate() {
  console.log('Starting comprehensive store migration...\n');

  await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
  const db = mongoose.connection.db;
  const stores = db.collection('stores');
  const categories = db.collection('categories');

  // Get ALL parent categories
  const allCats = await categories.find({
    $or: [{ parentCategory: null }, { parentCategory: { $exists: false } }]
  }).toArray();

  console.log('Found ' + allCats.length + ' parent categories');

  // Get all stores
  const allStores = await stores.find({}).toArray();
  console.log('Total stores: ' + allStores.length);

  // Calculate stores per category (at least 2 per category)
  const storesPerCat = Math.max(2, Math.floor(allStores.length / allCats.length));
  console.log('Target: ~' + storesPerCat + ' stores per category\n');

  const templateUsage = {};
  let updated = 0;

  for (let i = 0; i < allStores.length; i++) {
    const store = allStores[i];

    // Distribute evenly across categories
    const catIndex = i % allCats.length;
    const category = allCats[catIndex];

    // Get appropriate template
    const templates = getStoreTemplate(category.name);
    if (!templateUsage[category.name]) templateUsage[category.name] = 0;
    const template = templates[templateUsage[category.name] % templates.length];
    templateUsage[category.name]++;

    // Add number suffix if needed for uniqueness
    const suffix = templateUsage[category.name] > templates.length ?
      ' ' + Math.ceil(templateUsage[category.name] / templates.length) : '';

    const cityIdx = i % cities.length;

    const updateData = {
      name: template.name + suffix,
      description: template.desc,
      logo: template.logo,
      banner: template.banner,
      category: category._id,
      merchantId: new mongoose.Types.ObjectId(MERCHANT_ID),
      isActive: true,
      isVerified: true,
      isFeatured: i < 30,
      'location.city': cities[cityIdx],
      'location.state': states[cityIdx],
      'location.address': (100 + i) + ' Main Road, ' + cities[cityIdx],
      'location.pincode': String(400000 + (i * 7) % 99999),
      'ratings.average': parseFloat((3.5 + Math.random() * 1.5).toFixed(1)),
      'ratings.count': 50 + Math.floor(Math.random() * 300),
      'operationalInfo.deliveryTime': (15 + (i % 4) * 10) + '-' + (25 + (i % 4) * 15) + ' mins',
      'operationalInfo.minimumOrder': 99 + (i % 5) * 50,
      'operationalInfo.deliveryFee': i % 4 === 0 ? 0 : 20 + (i % 3) * 15,
      'operationalInfo.freeDeliveryAbove': 299 + (i % 5) * 100,
      'operationalInfo.acceptsWalletPayment': true,
      'operationalInfo.paymentMethods': ['Cash', 'Card', 'UPI', 'Wallet'],
    };

    await stores.updateOne({ _id: store._id }, { $set: updateData });
    console.log('[' + (i+1) + '] ' + updateData.name + ' -> ' + category.name);
    updated++;
  }

  // Show final distribution
  console.log('\n=== FINAL DISTRIBUTION ===');
  const dist = await stores.aggregate([
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]).toArray();

  const catMap = {};
  allCats.forEach(c => { catMap[c._id.toString()] = c.name; });

  let covered = 0;
  for (const d of dist) {
    const name = catMap[d._id?.toString()] || 'Unknown';
    console.log(name + ': ' + d.count);
    if (d.count > 0) covered++;
  }

  console.log('\nCategories with stores: ' + covered + '/' + allCats.length);
  console.log('Updated ' + updated + ' stores');

  await mongoose.disconnect();
}

migrate();
