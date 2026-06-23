const mongoose = require('mongoose');

async function checkDB() {
  await mongoose.connect(process.env.MONGODB_URI);

  console.log('Connected to MongoDB');

  // Check products collection
  const productsCount = await mongoose.connection.db.collection('products').countDocuments();
  console.log('\nTotal products in DB:', productsCount);

  // Get some product samples with store info
  const products = await mongoose.connection.db.collection('products').find({}).limit(5).toArray();
  console.log('\nSample products:');
  products.forEach((p, i) => {
    console.log((i + 1) + '. Name:', p.name, '| Store:', p.store, '| isDeleted:', p.isDeleted);
  });

  // Check stores collection
  const storesCount = await mongoose.connection.db.collection('stores').countDocuments();
  console.log('\nTotal stores in DB:', storesCount);

  // Get stores with merchant info
  const stores = await mongoose.connection.db.collection('stores').find({}).limit(5).toArray();
  console.log('\nSample stores:');
  stores.forEach((s, i) => {
    console.log((i + 1) + '. Name:', s.name, '| MerchantId:', s.merchantId, '| StoreId:', s._id);
  });

  // Count products per store
  const productsByStore = await mongoose.connection.db.collection('products').aggregate([
    { $group: { _id: '$store', count: { $sum: 1 } } }
  ]).toArray();
  console.log('\nProducts by store:', productsByStore);

  // Check merchantproducts collection
  const merchantProductsCount = await mongoose.connection.db.collection('merchantproducts').countDocuments();
  console.log('\nTotal merchant products in DB:', merchantProductsCount);

  await mongoose.disconnect();
  console.log('\nDisconnected');
}

checkDB().catch(console.error);
