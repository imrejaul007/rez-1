const mongoose = require('mongoose');
const { Product } = require('../dist/models/Product');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGODB_URI, {
      dbName: process.env.DB_NAME || 'test'
    });
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const debugProducts = async () => {
  try {
    console.log('🔍 Finding all products...');
    const products = await Product.find({}).lean();
    console.log(`📦 Found ${products.length} products`);

    products.forEach((product, index) => {
      console.log(`\n--- Product ${index + 1} ---`);
      console.log('ID:', product._id);
      console.log('Name:', product.name);
      console.log('Title:', product.title);
      console.log('Category:', product.category, '(type:', typeof product.category, ')');
      console.log('Price:', JSON.stringify(product.price));
      console.log('Pricing:', JSON.stringify(product.pricing));
      console.log('IsFeatured:', product.isFeatured);
      console.log('IsActive:', product.isActive);
      console.log('Inventory:', JSON.stringify(product.inventory));
    });

  } catch (error) {
    console.error('❌ Error debugging products:', error);
    throw error;
  }
};

// Run the debug
const run = async () => {
  await connectDB();
  await debugProducts();
  process.exit(0);
};

run().catch(error => {
  console.error('💥 Debug failed:', error);
  process.exit(1);
});