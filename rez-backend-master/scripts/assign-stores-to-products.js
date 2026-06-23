const mongoose = require('mongoose');
require('dotenv').config();

async function assignStoresToProducts() {
  try {
    // Connect to MongoDB using the provided connection string
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
if (!mongoUri) { console.error('MONGODB_URI or MONGO_URI not set'); process.exit(1); };
    const dbName = process.env.DB_NAME || 'test';

    console.log('🔗 Connecting to MongoDB Atlas...');
    await mongoose.connect(mongoUri, { dbName });
    console.log('✅ Connected to MongoDB (database: ' + dbName + ')\n');

    const db = mongoose.connection.db;

    // Get all stores
    const storesCollection = db.collection('stores');
    const stores = await storesCollection.find({}).toArray();
    console.log(`📦 Found ${stores.length} stores in database`);

    if (stores.length === 0) {
      console.log('❌ No stores found! Please seed stores first.');
      return;
    }

    // Get all products
    const productsCollection = db.collection('products');
    const products = await productsCollection.find({}).toArray();
    console.log(`📦 Found ${products.length} products in database\n`);

    // Assign stores to products based on category/type
    console.log('🔄 Assigning stores to products...\n');

    let updateCount = 0;
    for (const product of products) {
      let assignedStore = null;

      // Assign based on product characteristics
      const productName = product.name?.toLowerCase() || '';
      const productBrand = product.brand?.toLowerCase() || '';
      const productDescription = product.description?.toLowerCase() || '';

      // Find appropriate store
      if (productName.includes('macbook') || productName.includes('iphone') ||
          productName.includes('galaxy') || productName.includes('sony') ||
          productBrand.includes('apple') || productBrand.includes('samsung') ||
          productDescription.includes('electronic') || productDescription.includes('laptop') ||
          productDescription.includes('phone') || productDescription.includes('headphone')) {
        // Assign to TechMart Electronics
        assignedStore = stores.find(s => s.name.toLowerCase().includes('tech') ||
                                        s.name.toLowerCase().includes('electronic'));
      } else if (productName.includes('shirt') || productName.includes('jacket') ||
                 productName.includes('dress') || productDescription.includes('fashion') ||
                 productDescription.includes('clothing')) {
        // Assign to Fashion Hub
        assignedStore = stores.find(s => s.name.toLowerCase().includes('fashion'));
      } else if (productName.includes('sports') || productDescription.includes('sports') ||
                 productDescription.includes('fitness')) {
        // Assign to Sports Central
        assignedStore = stores.find(s => s.name.toLowerCase().includes('sport'));
      } else {
        // Assign to a random store as fallback
        assignedStore = stores[Math.floor(Math.random() * stores.length)];
      }

      if (assignedStore) {
        const result = await productsCollection.updateOne(
          { _id: product._id },
          {
            $set: {
              store: assignedStore._id,
              updatedAt: new Date()
            }
          }
        );

        if (result.modifiedCount > 0) {
          updateCount++;
          console.log(`✅ Assigned "${product.name}" to "${assignedStore.name}"`);
        }
      }
    }

    console.log(`\n📊 RESULTS:`);
    console.log(`=====================================`);
    console.log(`Total products updated: ${updateCount}/${products.length}`);

    // Verify the updates
    const productsWithStore = await productsCollection.countDocuments({
      store: { $exists: true, $ne: null }
    });
    const productsWithoutStore = await productsCollection.countDocuments({
      $or: [{ store: { $exists: false } }, { store: null }]
    });

    console.log(`Products WITH store: ${productsWithStore}`);
    console.log(`Products WITHOUT store: ${productsWithoutStore}`);

    // Check MacBook specifically
    console.log('\n🔍 Checking MacBook Air M3:');
    const macbook = await productsCollection.findOne({ name: { $regex: /MacBook Air M3/i } });
    if (macbook && macbook.store) {
      const store = await storesCollection.findOne({ _id: macbook.store });
      console.log(`✅ MacBook Air M3 is now assigned to: ${store?.name || 'Unknown Store'}`);
    }

    // Also fix pricing fields if they're missing
    console.log('\n🔧 Fixing product pricing structure...');
    const productsNeedingPricingFix = await productsCollection.find({
      $or: [
        { 'pricing.selling': { $exists: false } },
        { 'pricing.original': { $exists: false } }
      ]
    }).toArray();

    for (const product of productsNeedingPricingFix) {
      const updates = {};

      // Build pricing object from available data
      if (!product.pricing) {
        updates.pricing = {};
      }

      if (product.price) {
        updates['pricing.selling'] = product.price.current || product.price.selling || 999;
        updates['pricing.original'] = product.price.original || product.price.current || 999;
        updates['pricing.discount'] = product.price.discount || 0;
        updates['pricing.currency'] = 'INR';
      }

      if (Object.keys(updates).length > 0) {
        await productsCollection.updateOne(
          { _id: product._id },
          { $set: updates }
        );
        console.log(`✅ Fixed pricing for: ${product.name}`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    console.log('🎉 Store assignment completed!');
  }
}

assignStoresToProducts();