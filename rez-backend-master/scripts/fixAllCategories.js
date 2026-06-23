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

const createMissingCategories = async () => {
  const categoriesToCreate = [
    {
      name: 'Home & Kitchen',
      slug: 'home-kitchen',
      description: 'Home and kitchen essentials',
      image: 'https://images.unsplash.com/photo-1556909114-4bb7e6e4464d?w=500'
    },
    {
      name: 'Sports',
      slug: 'sports',
      description: 'Sports and fitness equipment',
      image: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=500'
    }
  ];

  for (const categoryData of categoriesToCreate) {
    const exists = await Category.findOne({ slug: categoryData.slug });
    if (!exists) {
      const newCategory = new Category({
        ...categoryData,
        type: 'general',
        isActive: true,
        sortOrder: 0,
        metadata: {
          tags: [],
          featured: false
        }
      });
      await newCategory.save();
      console.log(`✅ Created category: ${categoryData.name} (${newCategory._id})`);
    } else {
      console.log(`✅ Category already exists: ${categoryData.name} (${exists._id})`);
    }
  }
};

const fixProductCategories = async () => {
  try {
    // First create any missing categories
    await createMissingCategories();

    console.log('🔍 Finding all categories...');
    const categories = await Category.find({});
    const categoryMap = {};
    categories.forEach(cat => {
      categoryMap[cat.name] = cat._id;
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
        const categoryId = categoryMap[categoryValue];

        if (categoryId) {
          console.log(`✅ Updating to ObjectId: ${categoryId}`);
          await Product.updateOne(
            { _id: product._id },
            { category: categoryId }
          );
          fixedCount++;
        } else {
          console.log(`❌ No matching category found for: "${categoryValue}"`);
          console.log('Available categories:', Object.keys(categoryMap));
        }
      } else if (mongoose.Types.ObjectId.isValid(categoryValue)) {
        console.log(`✅ Product "${product.title}" already has ObjectId category`);
      } else {
        console.log(`⚠️ Product "${product.title}" has unknown category:`, categoryValue);
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

  console.log('🎉 All product categories fixed!');
  process.exit(0);
};

run().catch(error => {
  console.error('💥 Fixing failed:', error);
  process.exit(1);
});