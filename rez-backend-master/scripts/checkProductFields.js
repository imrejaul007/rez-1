const mongoose = require('mongoose');

async function checkFields() {
  await mongoose.connect(process.env.MONGODB_URI);

  console.log('=== CHECKING PRODUCT FIELD VALUES FOR HOMEPAGE ===\n');

  const db = mongoose.connection.db;

  // Check isActive field
  const activeCount = await db.collection('products').countDocuments({ isActive: true });
  const inactiveCount = await db.collection('products').countDocuments({ isActive: false });
  const noActiveField = await db.collection('products').countDocuments({ isActive: { $exists: false } });
  console.log('isActive:');
  console.log('  true:', activeCount);
  console.log('  false:', inactiveCount);
  console.log('  field missing:', noActiveField);

  // Check isFeatured field
  const featuredCount = await db.collection('products').countDocuments({ isFeatured: true });
  const notFeaturedCount = await db.collection('products').countDocuments({ isFeatured: false });
  const noFeaturedField = await db.collection('products').countDocuments({ isFeatured: { $exists: false } });
  console.log('\nisFeatured:');
  console.log('  true:', featuredCount);
  console.log('  false:', notFeaturedCount);
  console.log('  field missing:', noFeaturedField);

  // Check inventory.isAvailable field
  const availableCount = await db.collection('products').countDocuments({ 'inventory.isAvailable': true });
  const notAvailableCount = await db.collection('products').countDocuments({ 'inventory.isAvailable': false });
  const noAvailableField = await db.collection('products').countDocuments({ 'inventory.isAvailable': { $exists: false } });
  console.log('\ninventory.isAvailable:');
  console.log('  true:', availableCount);
  console.log('  false:', notAvailableCount);
  console.log('  field missing:', noAvailableField);

  // Check sample product
  const sampleProduct = await db.collection('products').findOne({});
  console.log('\n=== SAMPLE PRODUCT ===');
  console.log('isActive:', sampleProduct.isActive);
  console.log('isFeatured:', sampleProduct.isFeatured);
  console.log('inventory:', JSON.stringify(sampleProduct.inventory, null, 2));

  // What query would return for homepage
  const homepageFeaturedQuery = {
    isActive: true,
    isFeatured: true,
    'inventory.isAvailable': true
  };
  const homepageFeaturedCount = await db.collection('products').countDocuments(homepageFeaturedQuery);
  console.log('\n=== HOMEPAGE FEATURED PRODUCTS QUERY ===');
  console.log('Query:', JSON.stringify(homepageFeaturedQuery));
  console.log('Would return:', homepageFeaturedCount, 'products');

  // New arrivals query (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const newArrivalsQuery = {
    isActive: true,
    'inventory.isAvailable': true,
    createdAt: { $gte: thirtyDaysAgo }
  };
  const newArrivalsCount = await db.collection('products').countDocuments(newArrivalsQuery);
  console.log('\n=== HOMEPAGE NEW ARRIVALS QUERY ===');
  console.log('Query:', JSON.stringify(newArrivalsQuery));
  console.log('Would return:', newArrivalsCount, 'products');

  await mongoose.disconnect();
  console.log('\nDone');
}

checkFields().catch(console.error);
