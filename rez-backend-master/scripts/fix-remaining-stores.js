const mongoose = require('mongoose');
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };
const DB_NAME = 'test';
const MERCHANT_ID = new mongoose.Types.ObjectId('68aaa623d4ae0ab11dc2436f');

// Additional product templates for missing categories
const additionalTemplates = {
  'Entertainment': [
    { name: 'Movie Ticket Voucher', brand: 'PVR Cinemas', price: 299, tags: ['movie', 'entertainment', 'voucher'] },
    { name: 'Gaming Console PS5', brand: 'Sony', price: 49990, tags: ['gaming', 'console', 'playstation'] },
    { name: 'Netflix Gift Card', brand: 'Netflix', price: 999, tags: ['streaming', 'gift-card', 'entertainment'] },
    { name: 'Board Game Collection', brand: 'Hasbro', price: 1499, tags: ['board-game', 'family', 'entertainment'] },
    { name: 'VR Headset', brand: 'Meta', price: 29999, tags: ['vr', 'gaming', 'entertainment'] },
  ],
  'Fresh Produce': [
    { name: 'Fresh Vegetables Box', brand: 'Farm Fresh', price: 299, tags: ['vegetables', 'organic', 'fresh'] },
    { name: 'Seasonal Fruits Basket', brand: 'Nature Best', price: 499, tags: ['fruits', 'fresh', 'seasonal'] },
    { name: 'Green Leafy Pack', brand: 'Green Farm', price: 149, tags: ['leafy', 'vegetables', 'healthy'] },
    { name: 'Exotic Fruits Mix', brand: 'Exotic Farms', price: 699, tags: ['exotic', 'fruits', 'premium'] },
    { name: 'Fresh Herbs Bundle', brand: 'Herb Garden', price: 199, tags: ['herbs', 'fresh', 'cooking'] },
  ],
  'Footwear': [
    { name: 'Running Shoes Pro', brand: 'Nike', price: 8999, tags: ['running', 'sports', 'shoes'] },
    { name: 'Formal Leather Shoes', brand: 'Clarks', price: 6999, tags: ['formal', 'leather', 'office'] },
    { name: 'Casual Sneakers', brand: 'Adidas', price: 5499, tags: ['casual', 'sneakers', 'everyday'] },
    { name: 'Sports Sandals', brand: 'Woodland', price: 2999, tags: ['sandals', 'outdoor', 'sports'] },
    { name: 'High Heels Designer', brand: 'Bata', price: 3499, tags: ['heels', 'women', 'party'] },
  ],
  'Accessories': [
    { name: 'Leather Wallet Premium', brand: 'Hidesign', price: 2499, tags: ['wallet', 'leather', 'men'] },
    { name: 'Designer Belt', brand: 'Tommy Hilfiger', price: 2999, tags: ['belt', 'fashion', 'leather'] },
    { name: 'Silk Scarf', brand: 'FabIndia', price: 1299, tags: ['scarf', 'silk', 'women'] },
    { name: 'Watch Automatic', brand: 'Titan', price: 12999, tags: ['watch', 'automatic', 'men'] },
    { name: 'Fashion Sunglasses', brand: 'Ray-Ban', price: 7999, tags: ['sunglasses', 'fashion', 'uv'] },
  ],
  'Gift': [
    { name: 'Gift Hamper Premium', brand: 'Archies', price: 1999, tags: ['gift', 'hamper', 'premium'] },
    { name: 'Personalized Photo Frame', brand: 'Presto', price: 799, tags: ['photo', 'personalized', 'gift'] },
    { name: 'Chocolate Gift Box', brand: 'Ferrero', price: 1499, tags: ['chocolate', 'gift', 'premium'] },
    { name: 'Flower Bouquet', brand: 'Ferns N Petals', price: 999, tags: ['flowers', 'bouquet', 'gift'] },
    { name: 'Gift Card Set', brand: 'Amazon', price: 2000, tags: ['gift-card', 'versatile', 'gift'] },
  ],
  'Gifts': [
    { name: 'Luxury Gift Set', brand: 'The Body Shop', price: 2499, tags: ['luxury', 'gift-set', 'beauty'] },
    { name: 'Customized Mug', brand: 'PrintVenue', price: 399, tags: ['mug', 'customized', 'gift'] },
    { name: 'Gift Basket Deluxe', brand: 'Gift Express', price: 2999, tags: ['basket', 'deluxe', 'gift'] },
    { name: 'Crystal Showpiece', brand: 'Swarovski', price: 4999, tags: ['crystal', 'showpiece', 'decor'] },
  ],
  'Organic': [
    { name: 'Organic Rice 5kg', brand: 'Organic India', price: 699, tags: ['rice', 'organic', 'healthy'] },
    { name: 'Organic Dal Pack', brand: 'Tata Organic', price: 399, tags: ['dal', 'organic', 'pulses'] },
    { name: 'Organic Honey', brand: '24 Mantra', price: 449, tags: ['honey', 'organic', 'natural'] },
    { name: 'Organic Ghee 500g', brand: 'Organic Valley', price: 599, tags: ['ghee', 'organic', 'dairy'] },
    { name: 'Organic Tea', brand: 'Organic India', price: 349, tags: ['tea', 'organic', 'herbal'] },
  ],
  'Organic Products': [
    { name: 'Organic Skincare Set', brand: 'Forest Essentials', price: 2999, tags: ['skincare', 'organic', 'natural'] },
    { name: 'Organic Shampoo', brand: 'Khadi', price: 399, tags: ['shampoo', 'organic', 'haircare'] },
    { name: 'Organic Soap Set', brand: 'Kama Ayurveda', price: 799, tags: ['soap', 'organic', 'ayurvedic'] },
  ],
  'Medicine': [
    { name: 'First Aid Kit', brand: 'Johnson & Johnson', price: 999, tags: ['first-aid', 'medical', 'emergency'] },
    { name: 'Digital Thermometer', brand: 'Omron', price: 499, tags: ['thermometer', 'digital', 'medical'] },
    { name: 'Vitamin C Tablets', brand: 'Limcee', price: 199, tags: ['vitamin', 'immunity', 'health'] },
    { name: 'Pain Relief Spray', brand: 'Volini', price: 299, tags: ['pain-relief', 'spray', 'medical'] },
    { name: 'Blood Glucose Monitor', brand: 'Accu-Chek', price: 1999, tags: ['glucose', 'diabetes', 'monitor'] },
  ],
  'Medicines': [
    { name: 'Cold & Flu Kit', brand: 'Vicks', price: 399, tags: ['cold', 'flu', 'medicine'] },
    { name: 'Antiseptic Liquid', brand: 'Dettol', price: 249, tags: ['antiseptic', 'disinfectant', 'medical'] },
    { name: 'Cough Syrup', brand: 'Benadryl', price: 149, tags: ['cough', 'syrup', 'medicine'] },
    { name: 'Bandage Set', brand: 'Band-Aid', price: 199, tags: ['bandage', 'wound', 'first-aid'] },
  ],
  'Fruit': [
    { name: 'Apple Box 1kg', brand: 'Kashmir Farms', price: 299, tags: ['apple', 'fruit', 'fresh'] },
    { name: 'Banana Bunch', brand: 'Organic Farms', price: 79, tags: ['banana', 'fruit', 'fresh'] },
    { name: 'Orange Pack 1kg', brand: 'Nagpur Fresh', price: 149, tags: ['orange', 'citrus', 'fresh'] },
    { name: 'Mango Premium', brand: 'Alphonso', price: 599, tags: ['mango', 'premium', 'seasonal'] },
    { name: 'Grapes Seedless', brand: 'Green Valley', price: 199, tags: ['grapes', 'seedless', 'fresh'] },
  ],
  'Fruits': [
    { name: 'Mixed Fruit Basket', brand: 'Fresh Farms', price: 499, tags: ['mixed', 'basket', 'fresh'] },
    { name: 'Pomegranate Pack', brand: 'Ruby Red', price: 349, tags: ['pomegranate', 'healthy', 'fresh'] },
    { name: 'Papaya Fresh', brand: 'Tropical', price: 129, tags: ['papaya', 'tropical', 'fresh'] },
    { name: 'Watermelon', brand: 'Summer Fresh', price: 99, tags: ['watermelon', 'summer', 'fresh'] },
  ],
  'Vegetables': [
    { name: 'Potato Pack 2kg', brand: 'Farm Fresh', price: 79, tags: ['potato', 'vegetable', 'staple'] },
    { name: 'Onion Pack 1kg', brand: 'Nashik', price: 49, tags: ['onion', 'vegetable', 'essential'] },
    { name: 'Tomato Fresh 1kg', brand: 'Green Garden', price: 59, tags: ['tomato', 'fresh', 'vegetable'] },
    { name: 'Mixed Vegetable Box', brand: 'Daily Fresh', price: 299, tags: ['mixed', 'vegetables', 'fresh'] },
    { name: 'Spinach Bundle', brand: 'Organic Greens', price: 49, tags: ['spinach', 'leafy', 'healthy'] },
  ],
  'Meat': [
    { name: 'Chicken Breast 500g', brand: 'Licious', price: 299, tags: ['chicken', 'breast', 'fresh'] },
    { name: 'Mutton Curry Cut', brand: 'FreshToHome', price: 599, tags: ['mutton', 'curry', 'fresh'] },
    { name: 'Fish Fillet Pack', brand: 'Pescafresh', price: 449, tags: ['fish', 'fillet', 'seafood'] },
    { name: 'Prawns Large', brand: 'Coastal Fresh', price: 699, tags: ['prawns', 'seafood', 'premium'] },
    { name: 'Eggs Pack 12', brand: 'Kegg Farms', price: 99, tags: ['eggs', 'protein', 'fresh'] },
  ],
  'Staples': [
    { name: 'Wheat Flour 5kg', brand: 'Aashirvaad', price: 299, tags: ['flour', 'wheat', 'staple'] },
    { name: 'Sugar 1kg', brand: 'Madhur', price: 59, tags: ['sugar', 'staple', 'essential'] },
    { name: 'Salt Iodized 1kg', brand: 'Tata Salt', price: 29, tags: ['salt', 'iodized', 'essential'] },
    { name: 'Cooking Oil 1L', brand: 'Fortune', price: 179, tags: ['oil', 'cooking', 'staple'] },
    { name: 'Masala Box', brand: 'MDH', price: 399, tags: ['masala', 'spices', 'cooking'] },
  ],
  'Chinese': [
    { name: 'Hakka Noodles', brand: 'Ching\'s', price: 249, tags: ['noodles', 'chinese', 'fast-food'] },
    { name: 'Manchurian Combo', brand: 'WOK Express', price: 349, tags: ['manchurian', 'chinese', 'veg'] },
    { name: 'Fried Rice Special', brand: 'Dragon House', price: 279, tags: ['fried-rice', 'chinese', 'rice'] },
    { name: 'Spring Rolls', brand: 'Chinese Kitchen', price: 199, tags: ['spring-rolls', 'appetizer', 'chinese'] },
    { name: 'Sweet & Sour Chicken', brand: 'Mainland China', price: 399, tags: ['chicken', 'sweet-sour', 'chinese'] },
  ],
  'Desserts': [
    { name: 'Chocolate Cake', brand: 'Theobroma', price: 599, tags: ['cake', 'chocolate', 'dessert'] },
    { name: 'Gulab Jamun Pack', brand: 'Haldiram', price: 249, tags: ['gulab-jamun', 'indian', 'sweet'] },
    { name: 'Ice Cream Tub 1L', brand: 'Baskin Robbins', price: 449, tags: ['ice-cream', 'dessert', 'cold'] },
    { name: 'Brownie Box', brand: 'Brownie Point', price: 399, tags: ['brownie', 'chocolate', 'dessert'] },
    { name: 'Rasgulla Can', brand: 'KC Das', price: 299, tags: ['rasgulla', 'bengali', 'sweet'] },
  ],
  'Smartphones': [
    { name: 'iPhone 15', brand: 'Apple', price: 79999, tags: ['iphone', 'apple', 'smartphone'] },
    { name: 'Samsung Galaxy S24', brand: 'Samsung', price: 74999, tags: ['samsung', 'galaxy', 'android'] },
    { name: 'OnePlus 12', brand: 'OnePlus', price: 64999, tags: ['oneplus', 'flagship', 'android'] },
    { name: 'Google Pixel 8', brand: 'Google', price: 69999, tags: ['pixel', 'google', 'android'] },
    { name: 'Xiaomi 14 Pro', brand: 'Xiaomi', price: 54999, tags: ['xiaomi', 'android', 'flagship'] },
  ],
  'Headphones & Earphones': [
    { name: 'AirPods Pro 2', brand: 'Apple', price: 24999, tags: ['airpods', 'wireless', 'apple'] },
    { name: 'Sony WH-1000XM5', brand: 'Sony', price: 29990, tags: ['headphones', 'noise-cancelling', 'premium'] },
    { name: 'Samsung Galaxy Buds', brand: 'Samsung', price: 12999, tags: ['earbuds', 'wireless', 'samsung'] },
    { name: 'JBL Tune 770NC', brand: 'JBL', price: 7999, tags: ['headphones', 'jbl', 'wireless'] },
    { name: 'Bose QuietComfort', brand: 'Bose', price: 34999, tags: ['bose', 'premium', 'headphones'] },
  ],
  'Speakers': [
    { name: 'JBL PartyBox 110', brand: 'JBL', price: 29999, tags: ['speaker', 'party', 'bluetooth'] },
    { name: 'Bose SoundLink', brand: 'Bose', price: 19999, tags: ['portable', 'speaker', 'premium'] },
    { name: 'Sony SRS-XB43', brand: 'Sony', price: 14990, tags: ['speaker', 'bass', 'portable'] },
    { name: 'Marshall Stanmore', brand: 'Marshall', price: 34999, tags: ['speaker', 'vintage', 'premium'] },
    { name: 'Amazon Echo', brand: 'Amazon', price: 9999, tags: ['alexa', 'smart', 'speaker'] },
  ],
  'Televisions': [
    { name: 'Samsung 55" QLED', brand: 'Samsung', price: 79990, tags: ['tv', 'qled', '4k'] },
    { name: 'LG 65" OLED', brand: 'LG', price: 149990, tags: ['tv', 'oled', 'premium'] },
    { name: 'Sony Bravia 55"', brand: 'Sony', price: 89990, tags: ['tv', 'bravia', '4k'] },
    { name: 'Mi TV 43"', brand: 'Xiaomi', price: 27999, tags: ['tv', 'smart', 'budget'] },
    { name: 'TCL 50" 4K', brand: 'TCL', price: 34999, tags: ['tv', '4k', 'smart'] },
  ],
  'Gaming': [
    { name: 'PlayStation 5', brand: 'Sony', price: 49990, tags: ['ps5', 'console', 'gaming'] },
    { name: 'Xbox Series X', brand: 'Microsoft', price: 49990, tags: ['xbox', 'console', 'gaming'] },
    { name: 'Nintendo Switch', brand: 'Nintendo', price: 29999, tags: ['switch', 'portable', 'gaming'] },
    { name: 'Gaming Keyboard', brand: 'Razer', price: 8999, tags: ['keyboard', 'rgb', 'gaming'] },
    { name: 'Gaming Mouse', brand: 'Logitech', price: 4999, tags: ['mouse', 'gaming', 'rgb'] },
  ],
  'Sunglasses & Eyewear': [
    { name: 'Aviator Classic', brand: 'Ray-Ban', price: 9999, tags: ['aviator', 'sunglasses', 'classic'] },
    { name: 'Wayfarer Original', brand: 'Ray-Ban', price: 8999, tags: ['wayfarer', 'sunglasses', 'iconic'] },
    { name: 'Sports Sunglasses', brand: 'Oakley', price: 12999, tags: ['sports', 'sunglasses', 'active'] },
    { name: 'Designer Frames', brand: 'Gucci', price: 24999, tags: ['designer', 'frames', 'luxury'] },
    { name: 'Blue Light Glasses', brand: 'Lenskart', price: 1999, tags: ['blue-light', 'computer', 'protection'] },
  ],
  'Perfumes & Fragrances': [
    { name: 'Eau de Parfum', brand: 'Dior', price: 8999, tags: ['perfume', 'luxury', 'fragrance'] },
    { name: 'Men\'s Cologne', brand: 'Hugo Boss', price: 5999, tags: ['cologne', 'men', 'fragrance'] },
    { name: 'Attar Collection', brand: 'Ajmal', price: 2999, tags: ['attar', 'traditional', 'fragrance'] },
    { name: 'Body Mist', brand: 'Bath & Body Works', price: 1499, tags: ['body-mist', 'light', 'fragrance'] },
    { name: 'Luxury Perfume Set', brand: 'Chanel', price: 14999, tags: ['luxury', 'set', 'gift'] },
  ],
  'Salon Services': [
    { name: 'Haircut & Styling', brand: 'Looks Salon', price: 499, tags: ['haircut', 'styling', 'salon'] },
    { name: 'Facial Treatment', brand: 'VLCC', price: 999, tags: ['facial', 'skincare', 'salon'] },
    { name: 'Hair Spa Package', brand: 'L\'Oreal', price: 1499, tags: ['hair-spa', 'treatment', 'salon'] },
    { name: 'Manicure & Pedicure', brand: 'O2 Spa', price: 799, tags: ['manicure', 'pedicure', 'nails'] },
    { name: 'Bridal Makeup', brand: 'Lakme', price: 9999, tags: ['bridal', 'makeup', 'wedding'] },
  ],
  'Spa & Wellness': [
    { name: 'Full Body Massage', brand: 'O2 Spa', price: 2499, tags: ['massage', 'relaxation', 'wellness'] },
    { name: 'Aromatherapy Session', brand: 'Aroma Magic', price: 1999, tags: ['aromatherapy', 'relaxation', 'spa'] },
    { name: 'Couple Spa Package', brand: 'Four Fountains', price: 4999, tags: ['couple', 'spa', 'romantic'] },
    { name: 'Ayurvedic Treatment', brand: 'Kama Ayurveda', price: 2999, tags: ['ayurvedic', 'traditional', 'healing'] },
  ],
  'Fleet Market': [
    { name: 'Car Rental - Sedan', brand: 'Zoomcar', price: 1999, tags: ['car-rental', 'sedan', 'travel'] },
    { name: 'Bike Rental - Day', brand: 'Bounce', price: 299, tags: ['bike-rental', 'two-wheeler', 'travel'] },
    { name: 'SUV Rental', brand: 'Drivezy', price: 2999, tags: ['suv', 'rental', 'travel'] },
    { name: 'Luxury Car Rental', brand: 'Avis', price: 5999, tags: ['luxury', 'car-rental', 'premium'] },
  ],
  'Car Rentals': [
    { name: 'Hatchback Daily Rental', brand: 'Myles', price: 1499, tags: ['hatchback', 'rental', 'daily'] },
    { name: 'Premium Sedan Rental', brand: 'Carzonrent', price: 2499, tags: ['sedan', 'premium', 'rental'] },
    { name: 'SUV Weekend Package', brand: 'Revv', price: 4999, tags: ['suv', 'weekend', 'rental'] },
  ],
  'Gift Cards': [
    { name: 'Amazon Gift Card', brand: 'Amazon', price: 1000, tags: ['amazon', 'gift-card', 'shopping'] },
    { name: 'Flipkart Gift Card', brand: 'Flipkart', price: 1000, tags: ['flipkart', 'gift-card', 'shopping'] },
    { name: 'Myntra Gift Card', brand: 'Myntra', price: 1000, tags: ['myntra', 'fashion', 'gift-card'] },
    { name: 'Swiggy Gift Card', brand: 'Swiggy', price: 500, tags: ['swiggy', 'food', 'gift-card'] },
  ],
  'Mobile Accessories': [
    { name: 'Phone Case Premium', brand: 'Spigen', price: 1499, tags: ['case', 'protection', 'mobile'] },
    { name: 'Screen Protector', brand: 'Belkin', price: 999, tags: ['screen', 'protector', 'mobile'] },
    { name: 'Fast Charger 65W', brand: 'Anker', price: 2499, tags: ['charger', 'fast', 'mobile'] },
    { name: 'Power Bank 20000mAh', brand: 'Mi', price: 1999, tags: ['powerbank', 'portable', 'charging'] },
    { name: 'Wireless Charger', brand: 'Samsung', price: 2999, tags: ['wireless', 'charger', 'mobile'] },
  ],
  'General': [
    { name: 'Multi-Purpose Kit', brand: 'Generic', price: 999, tags: ['kit', 'general', 'utility'] },
    { name: 'Storage Container Set', brand: 'Milton', price: 599, tags: ['storage', 'container', 'kitchen'] },
    { name: 'Cleaning Supplies Kit', brand: 'Scotch-Brite', price: 399, tags: ['cleaning', 'supplies', 'home'] },
    { name: 'Tool Box Basic', brand: 'Stanley', price: 1499, tags: ['tools', 'diy', 'home'] },
  ],
  'Other': [
    { name: 'Utility Pack', brand: 'Various', price: 499, tags: ['utility', 'general', 'daily'] },
    { name: 'Everyday Essentials', brand: 'Various', price: 799, tags: ['essentials', 'daily', 'home'] },
    { name: 'Value Bundle', brand: 'Various', price: 999, tags: ['bundle', 'value', 'savings'] },
  ],
  'Uncategorized': [
    { name: 'Daily Use Items', brand: 'Various', price: 399, tags: ['daily', 'utility', 'home'] },
    { name: 'Home Essentials Set', brand: 'Various', price: 699, tags: ['home', 'essentials', 'set'] },
    { name: 'Kitchen Basics', brand: 'Various', price: 599, tags: ['kitchen', 'basics', 'cooking'] },
  ],
  'clothing': [
    { name: 'Cotton Shirt', brand: 'Allen Solly', price: 1299, tags: ['shirt', 'cotton', 'formal'] },
    { name: 'Casual Tshirt', brand: 'US Polo', price: 899, tags: ['tshirt', 'casual', 'cotton'] },
    { name: 'Denim Jeans', brand: 'Levis', price: 2499, tags: ['jeans', 'denim', 'casual'] },
    { name: 'Formal Trousers', brand: 'Arrow', price: 1999, tags: ['trousers', 'formal', 'office'] },
    { name: 'Winter Sweater', brand: 'Monte Carlo', price: 1799, tags: ['sweater', 'winter', 'wool'] },
  ],
  'Shirts & Tops': [
    { name: 'Formal White Shirt', brand: 'Van Heusen', price: 1499, tags: ['shirt', 'formal', 'white'] },
    { name: 'Casual Check Shirt', brand: 'Wrangler', price: 1299, tags: ['shirt', 'casual', 'check'] },
    { name: 'Polo T-Shirt', brand: 'Lacoste', price: 2999, tags: ['polo', 'tshirt', 'casual'] },
    { name: 'Graphic Tee', brand: 'Jack & Jones', price: 899, tags: ['tshirt', 'graphic', 'casual'] },
  ],
  'Jeans & Pants': [
    { name: 'Slim Fit Jeans', brand: 'Levis', price: 2999, tags: ['jeans', 'slim', 'denim'] },
    { name: 'Chino Pants', brand: 'GAP', price: 2499, tags: ['chinos', 'casual', 'pants'] },
    { name: 'Cargo Pants', brand: 'Superdry', price: 3499, tags: ['cargo', 'casual', 'pants'] },
    { name: 'Track Pants', brand: 'Puma', price: 1499, tags: ['track', 'sports', 'comfortable'] },
  ],
  'Jackets & Coats': [
    { name: 'Leather Jacket', brand: 'Woodland', price: 7999, tags: ['leather', 'jacket', 'winter'] },
    { name: 'Denim Jacket', brand: 'Levis', price: 4999, tags: ['denim', 'jacket', 'casual'] },
    { name: 'Windcheater', brand: 'Wildcraft', price: 2999, tags: ['windcheater', 'rain', 'outdoor'] },
    { name: 'Blazer Formal', brand: 'Raymond', price: 6999, tags: ['blazer', 'formal', 'business'] },
  ],
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

async function run() {
  await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
  const db = mongoose.connection.db;

  const products = db.collection('products');
  const stores = db.collection('stores');
  const categories = db.collection('categories');

  console.log('=== FIXING REMAINING STORES ===\n');

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

  // Get stores without products or with wrong products
  const allStores = await stores.find({ isActive: true }).toArray();

  let fixed = 0;
  let created = 0;

  for (const store of allStores) {
    const storeCategory = allCategories.find(c => c._id.toString() === store.category?.toString());
    if (!storeCategory) continue;

    const categoryName = storeCategory.name;

    // Check if store has products
    const existingProducts = await products.find({
      store: store._id,
      isDeleted: { $ne: true }
    }).toArray();

    // Get template for this category
    let templates = additionalTemplates[categoryName];
    if (!templates) {
      // Try case-insensitive match
      for (const key of Object.keys(additionalTemplates)) {
        if (key.toLowerCase() === categoryName.toLowerCase()) {
          templates = additionalTemplates[key];
          break;
        }
      }
    }

    if (!templates) {
      continue; // Already handled by previous script
    }

    // Only fix if no products or very few
    if (existingProducts.length < 3) {
      // Delete existing products
      if (existingProducts.length > 0) {
        await products.deleteMany({ store: store._id });
      }

      const subcategories = parentToChildren[store.category?.toString()] || [];
      const numProducts = Math.min(templates.length, 5);

      for (let i = 0; i < numProducts; i++) {
        const template = templates[i];
        const subcat = subcategories.length > 0
          ? subcategories[Math.floor(Math.random() * subcategories.length)]
          : null;

        const productData = {
          name: template.name,
          slug: generateSlug(template.name, store._id.toString().slice(-6) + i),
          description: `Premium ${template.name} from ${template.brand}. Best quality guaranteed.`,
          shortDescription: `${template.brand} ${template.name}`,
          productType: 'product',
          category: store.category,
          subCategory: subcat?._id || null,
          store: store._id,
          merchantId: MERCHANT_ID,
          brand: template.brand,
          sku: generateSKU(),
          images: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop'],
          pricing: {
            original: Math.round(template.price * 1.2),
            selling: template.price,
            discount: 17,
            currency: 'INR'
          },
          inventory: {
            stock: Math.floor(Math.random() * 80) + 20,
            isAvailable: true,
            lowStockThreshold: 5,
            unlimited: false
          },
          ratings: {
            average: parseFloat((Math.random() * 1.5 + 3.5).toFixed(1)),
            count: Math.floor(Math.random() * 300) + 20,
            distribution: { 5: 40, 4: 35, 3: 15, 2: 7, 1: 3 }
          },
          tags: template.tags,
          cashback: {
            percentage: Math.floor(Math.random() * 7) + 3,
            maxAmount: Math.floor(template.price * 0.08),
            isActive: true
          },
          deliveryInfo: {
            estimatedDays: '2-4 days',
            freeShippingThreshold: 499,
            expressAvailable: true
          },
          isActive: true,
          isFeatured: Math.random() > 0.75,
          isDigital: false,
          visibility: 'public',
          isDeleted: false,
          createdAt: new Date(Date.now() - Math.random() * 20 * 24 * 60 * 60 * 1000),
          updatedAt: new Date()
        };

        await products.insertOne(productData);
        created++;
      }

      fixed++;
      console.log(`✅ Fixed "${store.name}" (${categoryName}) - ${numProducts} products`);
    }
  }

  // Final stats
  console.log('\n=== COMPLETE ===\n');
  console.log('Stores fixed:', fixed);
  console.log('Products created:', created);

  const totalProducts = await products.countDocuments({ isDeleted: { $ne: true } });
  const storesWithProducts = (await products.aggregate([
    { $match: { isDeleted: { $ne: true } } },
    { $group: { _id: '$store' } }
  ]).toArray()).length;

  console.log('Total products:', totalProducts);
  console.log('Stores with products:', storesWithProducts, '/', allStores.length);

  await mongoose.disconnect();
}

run().catch(console.error);
