import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log('Connected to DB');

  const stores = await mongoose.connection.db!.collection('stores').find({ 'location.city': 'Dubai' }).toArray();
  console.log('Dubai stores count:', stores.length);

  if (stores.length > 0) {
    console.log('First store ID:', stores[0]._id.toString());
    console.log('First store name:', stores[0].name);

    const storeIds = stores.map(s => s._id);
    const products = await mongoose.connection.db!.collection('products').find({ store: { $in: storeIds } }).toArray();
    console.log('Products in Dubai stores:', products.length);

    if (products.length > 0) {
      console.log('Sample product:', products[0].name, 'Currency:', products[0].pricing?.currency);
    }
  }

  // Check AED products
  const aedProducts = await mongoose.connection.db!.collection('products').find({ 'pricing.currency': 'AED' }).toArray();
  console.log('AED products count:', aedProducts.length);
  if (aedProducts.length > 0) {
    console.log('AED product names:', aedProducts.map(p => p.name).join(', '));
  }

  await mongoose.disconnect();
  console.log('Done');
}
check().catch(console.error);
