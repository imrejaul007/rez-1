require('dotenv').config();
const mongoose = require('mongoose');
const { Product } = require('../dist/models/Product');
const { Store } = require('../dist/models/Store');

async function verifyProducts() {
  try {
    console.log('🔍 Starting product verification...\n');

    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
if (!mongoUri) { console.error('MONGODB_URI or MONGO_URI not set'); process.exit(1); };

    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to MongoDB\n');

    // Get all stores
    const stores = await Store.find().lean();
    console.log(`📊 Total Stores: ${stores.length}\n`);

    // Get all products
    const allProducts = await Product.find().lean();
    console.log(`📦 Total Products in Database: ${allProducts.length}\n`);

    console.log('=' .repeat(100));
    console.log('PRODUCT DISTRIBUTION BY STORE');
    console.log('='.repeat(100));

    // Group products by store
    const storeProductCounts = {};
    const storesWithProducts = new Set();

    for (const product of allProducts) {
      const storeId = product.store.toString();
      storesWithProducts.add(storeId);
      if (!storeProductCounts[storeId]) {
        storeProductCounts[storeId] = [];
      }
      storeProductCounts[storeId].push(product.name);
    }

    // Display product distribution
    let totalNewProducts = 0;
    for (const store of stores) {
      const storeId = store._id.toString();
      const products = storeProductCounts[storeId] || [];
      const productCount = products.length;

      if (productCount > 0) {
        const status = productCount >= 2 ? '✅' : '⚠️';
        console.log(`${status} ${store.name.padEnd(40)} - ${productCount} product(s)`);

        // Show product names
        products.forEach((productName, index) => {
          console.log(`    ${index + 1}. ${productName}`);
        });

        totalNewProducts += productCount;
      } else {
        console.log(`❌ ${store.name.padEnd(40)} - No products`);
      }
      console.log('');
    }

    console.log('='.repeat(100));
    console.log('VERIFICATION SUMMARY');
    console.log('='.repeat(100));
    console.log(`Total Stores: ${stores.length}`);
    console.log(`Stores with Products: ${storesWithProducts.size}`);
    console.log(`Stores without Products: ${stores.length - storesWithProducts.size}`);
    console.log(`Total Products: ${allProducts.length}`);
    console.log(`Average Products per Store: ${(allProducts.length / stores.length).toFixed(2)}`);

    // Sample product details
    console.log('\n' + '='.repeat(100));
    console.log('SAMPLE PRODUCT DETAILS');
    console.log('='.repeat(100));

    const sampleProducts = await Product.find()
      .populate('store', 'name')
      .limit(5)
      .lean();

    sampleProducts.forEach((product, index) => {
      console.log(`\n${index + 1}. ${product.name}`);
      console.log(`   Store: ${product.store?.name || 'Unknown'}`);
      console.log(`   SKU: ${product.sku}`);
      console.log(`   Price: ₹${product.pricing?.selling || 'N/A'} (Original: ₹${product.pricing?.original || 'N/A'})`);
      console.log(`   Discount: ${product.pricing?.discount || 0}%`);
      console.log(`   Stock: ${product.inventory?.stock || 0}`);
      console.log(`   Rating: ${product.ratings?.average || 0} (${product.ratings?.count || 0} reviews)`);
      console.log(`   Tags: ${product.tags?.join(', ') || 'None'}`);
    });

    // Check for products with missing store references
    console.log('\n' + '='.repeat(100));
    console.log('DATA INTEGRITY CHECK');
    console.log('='.repeat(100));

    const productsWithoutStore = await Product.countDocuments({ store: null });
    const productsWithoutCategory = await Product.countDocuments({ category: null });

    console.log(`Products without store reference: ${productsWithoutStore}`);
    console.log(`Products without category reference: ${productsWithoutCategory}`);

    if (productsWithoutStore === 0 && productsWithoutCategory === 0) {
      console.log('✅ All products have proper store and category references!');
    } else {
      console.log('⚠️ Some products have missing references');
    }

    await mongoose.connection.close();
    console.log('\n✅ Verification complete!');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

verifyProducts();
