import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function fixProductStoreLinks() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log('Connected to DB');

  const db = mongoose.connection.db!;

  // Get AED products and their current store IDs
  const aedProducts = await db.collection('products').find({ 'pricing.currency': 'AED' }).toArray();
  console.log('AED products:', aedProducts.length);

  for (const product of aedProducts) {
    console.log(`Product: ${product.name}, Store ID: ${product.store}`);
  }

  // Get Dubai stores
  const dubaiStores = await db.collection('stores').find({ 'location.city': 'Dubai' }).toArray();
  console.log('\nDubai stores:');
  for (const store of dubaiStores) {
    console.log(`Store: ${store.name}, ID: ${store._id}, Slug: ${store.slug}`);
  }

  // Create mapping: product name -> store slug
  const productStoreMapping: Record<string, string> = {
    'Fresh Organic Dates 500g': 'carrefour-dubai',
    'Arabic Coffee 250g': 'carrefour-dubai',
    'Samsung Galaxy S24 Ultra': 'sharaf-dg-dubai',
    'Apple MacBook Pro 14"': 'sharaf-dg-dubai',
    'Designer Abaya Collection': 'centrepoint-dubai',
    'Kandura Set - Premium White': 'centrepoint-dubai',
  };

  console.log('\n--- Fixing product store links ---');

  for (const product of aedProducts) {
    const expectedStoreSlug = productStoreMapping[product.name];
    if (!expectedStoreSlug) {
      console.log(`No mapping for product: ${product.name}`);
      continue;
    }

    const store = dubaiStores.find(s => s.slug === expectedStoreSlug);
    if (!store) {
      console.log(`Store not found for slug: ${expectedStoreSlug}`);
      continue;
    }

    // Update product with correct store ID
    await db.collection('products').updateOne(
      { _id: product._id },
      { $set: { store: store._id } }
    );
    console.log(`Updated ${product.name} -> ${store.name} (${store._id})`);
  }

  // Verify fix
  console.log('\n--- Verifying fix ---');
  const dubaiStoreIds = dubaiStores.map(s => s._id);
  const productsInDubaiStores = await db.collection('products').find({ store: { $in: dubaiStoreIds } }).toArray();
  console.log('Products now in Dubai stores:', productsInDubaiStores.length);

  await mongoose.disconnect();
  console.log('Done');
}

fixProductStoreLinks().catch(console.error);
