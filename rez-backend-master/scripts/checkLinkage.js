const mongoose = require('mongoose');

async function checkLinkage() {
  await mongoose.connect(process.env.MONGODB_URI);

  console.log('=== CHECKING PRODUCT-STORE-MERCHANT LINKAGE ===\n');

  // Get all unique store IDs from products
  const productStoreIds = await mongoose.connection.db.collection('products').distinct('store');
  console.log('Unique store IDs in products:', productStoreIds.length);

  // Get all store IDs that exist in stores collection
  const existingStores = await mongoose.connection.db.collection('stores').find({
    _id: { $in: productStoreIds }
  }).toArray();
  console.log('Stores that exist for those IDs:', existingStores.length);

  // Check for orphan products (products linked to non-existent stores)
  const existingStoreIds = existingStores.map(s => s._id.toString());
  const orphanProductStoreIds = productStoreIds.filter(id => !existingStoreIds.includes(id.toString()));
  console.log('Orphan store IDs (products point to non-existent stores):', orphanProductStoreIds.length);

  if (orphanProductStoreIds.length > 0) {
    console.log('\nOrphan store IDs:', orphanProductStoreIds.slice(0, 5));

    // Count orphan products
    const orphanCount = await mongoose.connection.db.collection('products').countDocuments({
      store: { $in: orphanProductStoreIds }
    });
    console.log('Products linked to non-existent stores:', orphanCount);
  }

  // Check the main merchant's stores
  const mainMerchantId = new mongoose.Types.ObjectId('68aaa623d4ae0ab11dc2436f');
  const merchantStores = await mongoose.connection.db.collection('stores').find({
    merchantId: mainMerchantId
  }).toArray();
  console.log('\n=== MAIN MERCHANT (68aaa623d4ae0ab11dc2436f) ===');
  console.log('Stores belonging to main merchant:', merchantStores.length);

  if (merchantStores.length > 0) {
    console.log('\nMerchant stores:');
    merchantStores.forEach((s, i) => {
      console.log((i+1) + '. ' + s.name + ' | ID: ' + s._id);
    });

    // Check how many products are linked to these stores
    const merchantStoreIds = merchantStores.map(s => s._id);
    const merchantProductCount = await mongoose.connection.db.collection('products').countDocuments({
      store: { $in: merchantStoreIds }
    });
    console.log('\nProducts linked to merchant stores:', merchantProductCount);
  }

  // Check product schema - does it have merchantId field directly?
  const sampleProduct = await mongoose.connection.db.collection('products').findOne({});
  console.log('\n=== SAMPLE PRODUCT FIELDS ===');
  console.log('Fields in product:', Object.keys(sampleProduct || {}));
  if (sampleProduct) {
    console.log('Product store:', sampleProduct.store);
    console.log('Product merchantId:', sampleProduct.merchantId);
  }

  await mongoose.disconnect();
  console.log('\nDone');
}

checkLinkage().catch(console.error);
