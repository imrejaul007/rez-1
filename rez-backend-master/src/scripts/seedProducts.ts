import mongoose from 'mongoose';
import { Product, IProduct } from '../models/Product';
import { Store } from '../models/Store';
import { Category } from '../models/Category';

// Connect to database
const connectDB = async () => {
  try {
    // Load environment variables
    require('dotenv').config();
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/rez-app';
    console.log('🔗 Connecting to:', mongoUri.includes('mongodb+srv') ? 'MongoDB Atlas Cloud' : 'Local MongoDB');
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Frontend dummy data transformed to backend format
const productsToSeed = [
  // New Arrivals Data
  {
    name: 'Premium Scented Candle Collection',
    slug: 'premium-scented-candle-collection',
    description: 'Scented candles for relaxation and ambiance. Perfect for creating a peaceful atmosphere in your home.',
    shortDescription: 'Scented candles for relaxation and ambiance',
    brand: 'Aroma Delights',
    sku: 'ARO-CAN-001',
    images: ['https://images.unsplash.com/photo-1602522049634-6271b3a0b1a3?w=400&h=200&fit=crop'],
    pricing: {
      original: 799,
      selling: 599,
      discount: 25,
      currency: 'INR'
    },
    inventory: {
      stock: 50,
      isAvailable: true,
      lowStockThreshold: 5,
      unlimited: false
    },
    ratings: {
      average: 4.5,
      count: 324,
      distribution: { 5: 150, 4: 120, 3: 40, 2: 10, 1: 4 }
    },
    specifications: [
      { key: 'Material', value: 'Soy Wax', group: 'materials' },
      { key: 'Burn Time', value: '40-45 hours', group: 'features' },
      { key: 'Scent', value: 'Lavender & Vanilla', group: 'features' }
    ],
    tags: ['aromatherapy', 'relaxation', 'home', 'gift', 'new-arrival'],
    seo: {
      title: 'Premium Scented Candle Collection - Aroma Delights',
      description: 'Luxury scented candles for home relaxation and ambiance',
      keywords: ['scented candles', 'aromatherapy', 'home decor', 'relaxation']
    },
    analytics: {
      views: 1250,
      purchases: 89,
      conversions: 7.1,
      wishlistAdds: 156,
      shareCount: 23,
      returnRate: 2.1,
      avgRating: 4.5
    },
    isActive: true,
    isFeatured: true,
    isDigital: false,
    weight: 300,
    categoryName: 'Home Decor',
    subcategoryName: 'Candles',
    storeName: 'Aroma Delights Store'
  },
  {
    name: 'Essence Luxury Fragrance',
    slug: 'essence-luxury-fragrance',
    description: 'Best of the best perfumes for every occasion. A premium unisex fragrance with long-lasting scent.',
    shortDescription: 'Best of the best perfumes for every occasion',
    brand: 'Essence',
    sku: 'ESS-PER-001',
    images: ['https://images.unsplash.com/photo-1541643600914-78b084683601?w=400&h=200&fit=crop'],
    pricing: {
      original: 3299,
      selling: 2499,
      discount: 24,
      currency: 'INR'
    },
    inventory: {
      stock: 8,
      isAvailable: true,
      lowStockThreshold: 10,
      unlimited: false
    },
    ratings: {
      average: 4.7,
      count: 189,
      distribution: { 5: 120, 4: 50, 3: 15, 2: 3, 1: 1 }
    },
    specifications: [
      { key: 'Volume', value: '100ml', group: 'dimensions' },
      { key: 'Type', value: 'Eau de Parfum', group: 'features' },
      { key: 'Gender', value: 'Unisex', group: 'features' }
    ],
    tags: ['luxury', 'fragrance', 'premium', 'unisex', 'new-arrival'],
    seo: {
      title: 'Essence Luxury Fragrance - Premium Unisex Perfume',
      description: 'Luxury unisex fragrance for every occasion',
      keywords: ['luxury perfume', 'unisex fragrance', 'premium scent', 'essence']
    },
    analytics: {
      views: 890,
      purchases: 45,
      conversions: 5.1,
      wishlistAdds: 78,
      shareCount: 12,
      returnRate: 1.8,
      avgRating: 4.7
    },
    isActive: true,
    isFeatured: true,
    isDigital: false,
    weight: 200,
    categoryName: 'Beauty',
    subcategoryName: 'Fragrance',
    storeName: 'Essence Beauty Store'
  },
  // Just for You (Recommendations) Data
  {
    name: 'Premium Ergonomic Chair',
    slug: 'premium-ergonomic-chair',
    description: 'Comfortable ergonomic chair for home office. Perfect for long working hours with lumbar support and adjustable height.',
    shortDescription: 'Comfortable ergonomic chair for home office',
    brand: 'Pottery Barn',
    sku: 'POT-CHA-001',
    images: ['https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=200&fit=crop'],
    pricing: {
      original: 12999,
      selling: 8999,
      discount: 31,
      currency: 'INR'
    },
    inventory: {
      stock: 25,
      isAvailable: true,
      lowStockThreshold: 5,
      unlimited: false
    },
    ratings: {
      average: 4.6,
      count: 567,
      distribution: { 5: 280, 4: 200, 3: 60, 2: 20, 1: 7 }
    },
    specifications: [
      { key: 'Material', value: 'Premium Leather', group: 'materials' },
      { key: 'Height Range', value: '45-52 cm', group: 'dimensions' },
      { key: 'Weight Capacity', value: '120 kg', group: 'features' },
      { key: 'Lumbar Support', value: 'Yes', group: 'features' }
    ],
    tags: ['ergonomic', 'office', 'comfort', 'premium', 'recommended'],
    seo: {
      title: 'Premium Ergonomic Office Chair - Pottery Barn',
      description: 'Comfortable ergonomic chair with lumbar support for home office',
      keywords: ['ergonomic chair', 'office furniture', 'home office', 'comfort']
    },
    analytics: {
      views: 2340,
      purchases: 156,
      conversions: 6.7,
      wishlistAdds: 289,
      shareCount: 45,
      returnRate: 3.2,
      avgRating: 4.6
    },
    isActive: true,
    isFeatured: true,
    isDigital: false,
    weight: 18000,
    categoryName: 'Furniture',
    subcategoryName: 'Chairs',
    storeName: 'Pottery Barn Store'
  },
  {
    name: 'Nike Air Zoom Pegasus 40',
    slug: 'nike-air-zoom-pegasus-40',
    description: 'Premium running shoes for daily training. Designed for comfort and performance with Nike\'s latest technology.',
    shortDescription: 'Premium running shoes for daily training',
    brand: 'Nike',
    sku: 'NIK-SHO-001',
    images: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=200&fit=crop'],
    pricing: {
      original: 10995,
      selling: 9695,
      discount: 12,
      currency: 'INR'
    },
    inventory: {
      stock: 45,
      isAvailable: true,
      lowStockThreshold: 10,
      unlimited: false,
      variants: [
        { type: 'size', value: '8', price: 0, stock: 12, sku: 'NIK-SHO-001-8' },
        { type: 'size', value: '9', price: 0, stock: 15, sku: 'NIK-SHO-001-9' },
        { type: 'size', value: '10', price: 0, stock: 18, sku: 'NIK-SHO-001-10' }
      ]
    },
    ratings: {
      average: 4.8,
      count: 1234,
      distribution: { 5: 800, 4: 300, 3: 100, 2: 25, 1: 9 }
    },
    specifications: [
      { key: 'Material', value: 'Mesh Upper', group: 'materials' },
      { key: 'Sole', value: 'React Foam', group: 'materials' },
      { key: 'Type', value: 'Running', group: 'features' },
      { key: 'Gender', value: 'Unisex', group: 'features' }
    ],
    tags: ['running', 'sports', 'premium', 'comfort', 'recommended'],
    seo: {
      title: 'Nike Air Zoom Pegasus 40 - Premium Running Shoes',
      description: 'Premium running shoes with React Foam technology',
      keywords: ['nike shoes', 'running shoes', 'sports footwear', 'pegasus']
    },
    analytics: {
      views: 5670,
      purchases: 789,
      conversions: 13.9,
      wishlistAdds: 1245,
      shareCount: 234,
      returnRate: 2.8,
      avgRating: 4.8
    },
    isActive: true,
    isFeatured: true,
    isDigital: false,
    weight: 800,
    categoryName: 'Sports',
    subcategoryName: 'Shoes',
    storeName: 'Nike Official Store'
  }
];

// Create default categories and stores
const createDefaultData = async () => {
  // Create categories
  const categories = [
    { name: 'Home Decor', slug: 'home-decor', description: 'Home decoration items' },
    { name: 'Beauty', slug: 'beauty', description: 'Beauty and personal care products' },
    { name: 'Furniture', slug: 'furniture', description: 'Home and office furniture' },
    { name: 'Sports', slug: 'sports', description: 'Sports and fitness equipment' }
  ];

  const stores = [
    { 
      name: 'Aroma Delights Store',
      slug: 'aroma-delights-store',
      description: 'Premium home fragrance and candles',
      isActive: true
    },
    { 
      name: 'Essence Beauty Store',
      slug: 'essence-beauty-store',
      description: 'Luxury beauty and fragrance products',
      isActive: true
    },
    { 
      name: 'Pottery Barn Store',
      slug: 'pottery-barn-store',
      description: 'Premium furniture and home decor',
      isActive: true
    },
    { 
      name: 'Nike Official Store',
      slug: 'nike-official-store',
      description: 'Official Nike sports products',
      isActive: true
    }
  ];

  // Insert categories
  for (const cat of categories) {
    await Category.findOneAndUpdate(
      { slug: cat.slug },
      cat,
      { upsert: true, new: true }
    );
  }

  // Insert stores
  for (const store of stores) {
    await Store.findOneAndUpdate(
      { slug: store.slug },
      store,
      { upsert: true, new: true }
    );
  }

  console.log('✅ Created default categories and stores');
};

// Seed products
const seedProducts = async () => {
  try {
    console.log('🌱 Starting product seeding...');
    
    // Clear existing products
    await Product.deleteMany({});
    console.log('🗑️ Cleared existing products');

    // Create default data
    await createDefaultData();

    // Get category and store IDs for references
    const categoryMap = new Map();
    const storeMap = new Map();
    
    const categories = await Category.find();
    const stores = await Store.find();
    
    categories.forEach(cat => categoryMap.set(cat.name, cat._id));
    stores.forEach(store => storeMap.set(store.name, store._id));

    // Transform and insert products
    for (const productData of productsToSeed) {
      const { categoryName, subcategoryName, storeName, ...productFields } = productData;
      
      const product = new Product({
        ...productFields,
        category: categoryMap.get(categoryName),
        store: storeMap.get(storeName)
      });

      await product.save();
      console.log(`✅ Seeded product: ${product.name}`);
    }

    console.log('🎉 Successfully seeded all products!');
    
    // Display summary
    const totalProducts = await Product.countDocuments();
    const featuredProducts = await Product.countDocuments({ isFeatured: true });
    const activeProducts = await Product.countDocuments({ isActive: true });
    
    console.log('\n📊 Seeding Summary:');
    console.log(`Total Products: ${totalProducts}`);
    console.log(`Featured Products: ${featuredProducts}`);
    console.log(`Active Products: ${activeProducts}`);
    
  } catch (error) {
    console.error('❌ Error seeding products:', error);
  }
};

// Run seeding script
const main = async () => {
  await connectDB();
  await seedProducts();
  await mongoose.connection.close();
  console.log('✅ Database connection closed');
  process.exit(0);
};

// Execute if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  });
}

export { seedProducts };