const mongoose = require('mongoose');
const { Product } = require('../dist/models/Product');
const { Category } = require('../dist/models/Category');

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

const fixProductCategories = async () => {
  try {
    console.log('🔍 Finding all categories...');
    const categories = await Category.find({});
    const categoryMap = {};
    categories.forEach(cat => {
      categoryMap[cat.name] = cat._id;
      categoryMap[cat.name.toLowerCase()] = cat._id;
    });

    console.log('📋 Available categories:');
    Object.keys(categoryMap).forEach(name => {
      console.log(`  - ${name}: ${categoryMap[name]}`);
    });

    console.log('🔍 Finding all products with string categories...');
    const products = await Product.find({});
    console.log(`📦 Found ${products.length} products total`);

    let fixedCount = 0;

    for (const product of products) {
      const categoryValue = product.category;

      // Check if category is a string
      if (typeof categoryValue === 'string') {
        console.log(`🔧 Product "${product.title}" has string category: "${categoryValue}"`);

        // Find matching category ObjectId
        const categoryId = categoryMap[categoryValue] || categoryMap[categoryValue.toLowerCase()];

        if (categoryId) {
          console.log(`✅ Updating to ObjectId: ${categoryId}`);
          await Product.updateOne(
            { _id: product._id },
            { category: categoryId }
          );
          fixedCount++;
        } else {
          console.log(`❌ No matching category found for: "${categoryValue}"`);
        }
      } else if (mongoose.Types.ObjectId.isValid(categoryValue)) {
        console.log(`✅ Product "${product.title}" already has ObjectId category: ${categoryValue}`);
      } else {
        console.log(`⚠️ Product "${product.title}" has unknown category type:`, typeof categoryValue, categoryValue);
      }
    }

    console.log(`🎉 Fixed ${fixedCount} products with string categories!`);

  } catch (error) {
    console.error('❌ Error fixing product categories:', error);
    throw error;
  }
};

// Run the fix
const run = async () => {
  await connectDB();
  await fixProductCategories();

  console.log('🎉 Product category fixing completed!');
  process.exit(0);
};

run().catch(error => {
  console.error('💥 Fixing failed:', error);
  process.exit(1);
});