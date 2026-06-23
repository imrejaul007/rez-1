const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };

// Product templates based on store types
const productTemplates = {
  electronics: [
    { name: 'Smart Watch Pro', brand: 'TechWear', price: { current: 12999, original: 15999 }, image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500', tags: ['smartwatch', 'fitness', 'wearable'] },
    { name: 'Wireless Earbuds', brand: 'AudioMax', price: { current: 4999, original: 6999 }, image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=500', tags: ['audio', 'wireless', 'earbuds'] },
    { name: 'Portable Charger 20000mAh', brand: 'PowerBank Pro', price: { current: 2499, original: 3499 }, image: 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=500', tags: ['charger', 'portable', 'battery'] },
  ],
  fashion: [
    { name: 'Denim Jacket', brand: 'UrbanStyle', price: { current: 2499, original: 3999 }, image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500', tags: ['jacket', 'denim', 'casual'] },
    { name: 'Designer Handbag', brand: 'LuxeBag', price: { current: 5999, original: 8999 }, image: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=500', tags: ['handbag', 'luxury', 'fashion'] },
    { name: 'Cotton T-Shirt Pack', brand: 'ComfortWear', price: { current: 999, original: 1499 }, image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500', tags: ['tshirt', 'cotton', 'casual'] },
  ],
  food: [
    { name: 'Gourmet Pizza Combo', brand: 'Chef Special', price: { current: 449, original: 599 }, image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=500', tags: ['pizza', 'food', 'combo'] },
    { name: 'Fresh Fruit Smoothie', brand: 'HealthyBlend', price: { current: 199, original: 249 }, image: 'https://images.unsplash.com/photo-1505252585461-04db1eb84625?w=500', tags: ['smoothie', 'healthy', 'fruit'] },
    { name: 'Organic Meal Box', brand: 'FreshDaily', price: { current: 349, original: 449 }, image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500', tags: ['organic', 'healthy', 'meal'] },
  ],
  grocery: [
    { name: 'Organic Vegetable Pack', brand: 'FarmFresh', price: { current: 299, original: 399 }, image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500', tags: ['vegetables', 'organic', 'fresh'] },
    { name: 'Premium Rice 5kg', brand: 'GrainMaster', price: { current: 549, original: 699 }, image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500', tags: ['rice', 'grain', 'staple'] },
    { name: 'Fresh Dairy Pack', brand: 'PureMillk', price: { current: 199, original: 249 }, image: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=500', tags: ['dairy', 'milk', 'fresh'] },
  ],
  books: [
    { name: 'The Art of Programming', brand: 'TechBooks', price: { current: 899, original: 1299 }, image: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=500', tags: ['programming', 'technical', 'education'] },
    { name: 'Mystery Thriller Novel', brand: 'Bestsellers', price: { current: 399, original: 599 }, image: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=500', tags: ['fiction', 'thriller', 'novel'] },
    { name: 'Self-Help Guide', brand: 'LifeWorks', price: { current: 499, original: 699 }, image: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=500', tags: ['self-help', 'motivation', 'guide'] },
  ],
  sports: [
    { name: 'Yoga Mat Premium', brand: 'FitGear', price: { current: 1299, original: 1999 }, image: 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=500', tags: ['yoga', 'fitness', 'exercise'] },
    { name: 'Running Shoes Pro', brand: 'SportMax', price: { current: 3999, original: 5999 }, image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500', tags: ['shoes', 'running', 'sports'] },
    { name: 'Resistance Bands Set', brand: 'PowerFit', price: { current: 899, original: 1299 }, image: 'https://images.unsplash.com/photo-1598289431512-b97b0917affc?w=500', tags: ['resistance', 'fitness', 'workout'] },
  ],
  pharmacy: [
    { name: 'Vitamin C Tablets 60s', brand: 'HealthCare Plus', price: { current: 399, original: 549 }, image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500', tags: ['vitamins', 'health', 'supplements'] },
    { name: 'Digital Thermometer', brand: 'MedTech', price: { current: 299, original: 449 }, image: 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=500', tags: ['thermometer', 'medical', 'digital'] },
    { name: 'First Aid Kit Complete', brand: 'SafetyFirst', price: { current: 799, original: 1099 }, image: 'https://images.unsplash.com/photo-1603398938378-e54eab446dde?w=500', tags: ['firstaid', 'medical', 'safety'] },
  ],
  snacks: [
    { name: 'Potato Chips Classic', brand: 'SnackTime', price: { current: 40, original: 50 }, image: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=500', tags: ['chips', 'snacks', 'crispy'] },
    { name: 'Mixed Nuts Pack', brand: 'HealthyBite', price: { current: 199, original: 249 }, image: 'https://images.unsplash.com/photo-1599599810769-bcde5a160d32?w=500', tags: ['nuts', 'healthy', 'protein'] },
    { name: 'Chocolate Cookies', brand: 'SweetTreats', price: { current: 120, original: 150 }, image: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=500', tags: ['cookies', 'chocolate', 'sweet'] },
  ],
  organic: [
    { name: 'Organic Honey 500g', brand: 'NaturePure', price: { current: 399, original: 499 }, image: 'https://images.unsplash.com/photo-1587049352846-4a222e784acc?w=500', tags: ['honey', 'organic', 'natural'] },
    { name: 'Organic Tea Leaves', brand: 'GreenLeaf', price: { current: 349, original: 449 }, image: 'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?w=500', tags: ['tea', 'organic', 'beverage'] },
    { name: 'Organic Coconut Oil', brand: 'PureNature', price: { current: 449, original: 599 }, image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500', tags: ['coconut', 'oil', 'organic'] },
  ],
  luxury: [
    { name: 'Designer Sunglasses', brand: 'LuxeOptics', price: { current: 8999, original: 12999 }, image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=500', tags: ['sunglasses', 'luxury', 'fashion'] },
    { name: 'Leather Wallet Premium', brand: 'RoyalLeather', price: { current: 2999, original: 4499 }, image: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=500', tags: ['wallet', 'leather', 'premium'] },
    { name: 'Premium Perfume', brand: 'Essence Luxe', price: { current: 6999, original: 9999 }, image: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=500', tags: ['perfume', 'fragrance', 'luxury'] },
  ],
  jewelry: [
    { name: 'Gold Plated Necklace', brand: 'JewelCraft', price: { current: 4999, original: 7999 }, image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=500', tags: ['necklace', 'gold', 'jewelry'] },
    { name: 'Diamond Stud Earrings', brand: 'Royal Gems', price: { current: 12999, original: 17999 }, image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=500', tags: ['earrings', 'diamond', 'jewelry'] },
    { name: 'Silver Bracelet', brand: 'SilverArt', price: { current: 2499, original: 3999 }, image: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=500', tags: ['bracelet', 'silver', 'jewelry'] },
  ],
  general: [
    { name: 'Multi-purpose Storage Box', brand: 'HomeOrganize', price: { current: 299, original: 449 }, image: 'https://images.unsplash.com/photo-1600494603989-9650cf6ddd3d?w=500', tags: ['storage', 'organize', 'home'] },
    { name: 'LED Desk Lamp', brand: 'BrightLight', price: { current: 799, original: 1199 }, image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=500', tags: ['lamp', 'lighting', 'desk'] },
    { name: 'Water Bottle 1L', brand: 'HydroMax', price: { current: 499, original: 699 }, image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=500', tags: ['bottle', 'water', 'hydration'] },
  ],
};

// Detect store category from name
function detectStoreCategory(storeName) {
  const name = storeName.toLowerCase();

  if (name.includes('tech') || name.includes('electronic')) return 'electronics';
  if (name.includes('fashion') || name.includes('boutique') || name.includes('studio')) return 'fashion';
  if (name.includes('food') || name.includes('bite') || name.includes('gourmet')) return 'food';
  if (name.includes('grocery') || name.includes('mart') || name.includes('super')) return 'grocery';
  if (name.includes('book')) return 'books';
  if (name.includes('sport')) return 'sports';
  if (name.includes('pharma') || name.includes('health')) return 'pharmacy';
  if (name.includes('snack')) return 'snacks';
  if (name.includes('organic') || name.includes('green') || name.includes('nature') || name.includes('eco')) return 'organic';
  if (name.includes('lux') || name.includes('elite') || name.includes('premium') || name.includes('royal')) return 'luxury';
  if (name.includes('jewel') || name.includes('gems')) return 'jewelry';

  return 'general';
}

async function createProductsForStores() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const storesCollection = mongoose.connection.db.collection('stores');
    const productsCollection = mongoose.connection.db.collection('products');
    const categoriesCollection = mongoose.connection.db.collection('categories');

    // Get a default category ID (we'll use the first one)
    const defaultCategory = await categoriesCollection.findOne();
    const defaultCategoryId = defaultCategory ? defaultCategory._id.toString() : null;

    // Get all stores
    const stores = await storesCollection.find().toArray();
    console.log(`🏪 Creating products for ${stores.length} stores...\n`);

    let totalCreated = 0;

    for (const store of stores) {
      const storeName = store.name || store.storeName;
      const storeId = store._id.toString();
      const category = detectStoreCategory(storeName);
      const templates = productTemplates[category] || productTemplates.general;

      // Select 2-3 random products from templates
      const numProducts = Math.floor(Math.random() * 2) + 2; // 2 or 3 products
      const selectedProducts = [];

      for (let i = 0; i < numProducts; i++) {
        const template = templates[i % templates.length];
        selectedProducts.push(template);
      }

      console.log(`📦 ${storeName} (${category}):`);

      for (let i = 0; i < selectedProducts.length; i++) {
        const template = selectedProducts[i];

        const product = {
          title: template.name,
          name: template.name,
          slug: `${template.name.toLowerCase().replace(/\s+/g, '-')}-${storeId.substring(0, 4)}-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
          sku: `${category.substring(0, 3).toUpperCase()}${template.name.substring(0, 3).toUpperCase()}${Math.floor(Math.random() * 1000000)}`,
          brand: template.brand,
          description: `${template.name} - High quality product from ${storeName}`,
          image: template.image,
          price: {
            current: template.price.current,
            original: template.price.original,
            currency: '₹',
            discount: Math.round(((template.price.original - template.price.current) / template.price.original) * 100)
          },
          category: defaultCategoryId,
          rating: {
            value: (Math.random() * 2 + 3).toFixed(1), // 3.0 to 5.0
            count: Math.floor(Math.random() * 200) + 10
          },
          availabilityStatus: 'in_stock',
          tags: template.tags,
          isRecommended: Math.random() > 0.7,
          isFeatured: Math.random() > 0.8,
          isNewArrival: Math.random() > 0.75,
          arrivalDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          store: storeId,
          type: 'product',
          isActive: true,
          inventory: {
            isAvailable: true,
            stock: Math.floor(Math.random() * 300) + 50
          },
          analytics: {
            views: Math.floor(Math.random() * 100)
          },
          createdAt: new Date(),
          updatedAt: new Date(),
          __v: 0
        };

        await productsCollection.insertOne(product);
        totalCreated++;
        console.log(`   ✅ Created: ${product.name} (₹${product.price.current})`);
      }
      console.log('');
    }

    console.log(`\n🎉 SUCCESS! Created ${totalCreated} products for ${stores.length} stores\n`);

    // Verify
    for (const store of stores) {
      const count = await productsCollection.countDocuments({ store: store._id.toString() });
      const status = count >= 2 ? '✅' : '⚠️';
      console.log(`${status} ${store.name || store.storeName}: ${count} products`);
    }

    await mongoose.connection.close();
    console.log('\n✅ Complete!');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

createProductsForStores();
