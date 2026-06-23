// Script to test product data and verify it's working correctly
const mongoose = require('mongoose');

async function testProductData() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
if (!mongoUri) { console.error('MONGODB_URI or MONGO_URI not set'); process.exit(1); };
    const dbName = 'test';

    await mongoose.connect(mongoUri, {
      dbName: dbName
    });
    console.log('✅ Connected to MongoDB:', dbName);

    // Get models
    const Product = mongoose.model('Product', new mongoose.Schema({
      name: String,
      images: [String],
      description: String,
      category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
      store: { type: mongoose.Schema.Types.ObjectId, ref: 'Store' },
      pricing: Object,
      inventory: Object,
      ratings: Object
    }));

    const Store = mongoose.model('Store', new mongoose.Schema({
      name: String,
      category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
      isActive: Boolean
    }));

    const Category = mongoose.model('Category', new mongoose.Schema({
      name: String
    }));

    // Test getting a specific product (Margherita Pizza)
    console.log('\n🔍 Testing Margherita Pizza product...');
    const pizzaProduct = await Product.findOne({ name: 'Margherita Pizza' })
      .populate('category')
      .populate('store');

    if (pizzaProduct) {
      console.log('✅ Found Margherita Pizza:');
      console.log(`   ID: ${pizzaProduct._id}`);
      console.log(`   Name: ${pizzaProduct.name}`);
      console.log(`   Category: ${pizzaProduct.category?.name || 'N/A'}`);
      console.log(`   Store: ${pizzaProduct.store?.name || 'N/A'}`);
      console.log(`   Images: ${pizzaProduct.images?.length || 0}`);
      if (pizzaProduct.images && pizzaProduct.images.length > 0) {
        console.log(`   Image URL: ${pizzaProduct.images[0]}`);
      }
      console.log(`   Pricing: ${JSON.stringify(pizzaProduct.pricing)}`);
      console.log(`   Inventory: ${JSON.stringify(pizzaProduct.inventory)}`);
      console.log(`   Ratings: ${JSON.stringify(pizzaProduct.ratings)}`);
    } else {
      console.log('❌ Margherita Pizza not found');
    }

    // Test getting all products
    console.log('\n🔍 Testing all products...');
    const allProducts = await Product.find({})
      .populate('category')
      .populate('store');

    console.log(`📦 Found ${allProducts.length} products:`);
    allProducts.forEach((product, index) => {
      console.log(`\n  ${index + 1}. ${product.name}`);
      console.log(`     ID: ${product._id}`);
      console.log(`     Category: ${product.category?.name || 'N/A'}`);
      console.log(`     Store: ${product.store?.name || 'N/A'}`);
      console.log(`     Images: ${product.images?.length || 0}`);
      if (product.images && product.images.length > 0) {
        console.log(`     Image: ${product.images[0].substring(0, 60)}...`);
      }
    });

    // Test API endpoint simulation
    console.log('\n🔍 Simulating API response for ProductPage...');
    const productForAPI = await Product.findById('68e24b6d4381285a768357e4')
      .populate('category')
      .populate('store');

    if (productForAPI) {
      const apiResponse = {
        success: true,
        data: {
          _id: productForAPI._id,
          name: productForAPI.name,
          description: productForAPI.description,
          images: productForAPI.images,
          pricing: productForAPI.pricing,
          ratings: productForAPI.ratings,
          category: productForAPI.category,
          store: productForAPI.store,
          inventory: productForAPI.inventory
        }
      };
      
      console.log('✅ API Response simulation:');
      console.log(JSON.stringify(apiResponse, null, 2));
    } else {
      console.log('❌ Product with ID 68e24b6d4381285a768357e4 not found');
    }

    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    console.log('🎉 Product data test completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
testProductData();
