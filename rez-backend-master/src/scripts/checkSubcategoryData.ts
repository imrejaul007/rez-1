import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function checkData() {
  const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };

  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected!');

  const db = mongoose.connection.db!;

  // Check categories with 'street' in slug
  const categories = await db.collection('categories').find({ slug: { $regex: 'street', $options: 'i' } }).toArray();
  console.log('\n=== Categories with "street" in slug ===');
  console.log('Count:', categories.length);
  categories.forEach(c => console.log('  -', c.slug, '|', c.name, '|', c._id));

  // Check stores with subcategorySlug = street-food
  const streetFoodStores = await db.collection('stores').find({ subcategorySlug: 'street-food' }).toArray();
  console.log('\n=== Stores with subcategorySlug="street-food" ===');
  console.log('Count:', streetFoodStores.length);
  streetFoodStores.forEach(s => console.log('  -', s.name, '|', s._id));

  // Check all unique subcategorySlug values in stores
  const allStores = await db.collection('stores').find({}).project({ subcategorySlug: 1, name: 1 }).toArray();
  const uniqueSlugs = [...new Set(allStores.map(s => s.subcategorySlug).filter(Boolean))];
  console.log('\n=== All unique subcategorySlug values in stores ===');
  console.log('Count:', uniqueSlugs.length);
  console.log(uniqueSlugs);

  // Check food-dining related stores
  const foodStores = await db.collection('stores').find({
    subcategorySlug: { $in: ['cafes', 'qsr-fast-food', 'family-restaurants', 'fine-dining', 'ice-cream-dessert', 'bakery-confectionery', 'cloud-kitchens', 'street-food'] }
  }).project({ name: 1, subcategorySlug: 1 }).toArray();
  console.log('\n=== Food & Dining stores ===');
  console.log('Count:', foodStores.length);
  foodStores.forEach(s => console.log('  -', s.subcategorySlug, '|', s.name));

  // Check products count per store
  const productsByStore = await db.collection('products').aggregate([
    { $group: { _id: '$store', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 }
  ]).toArray();
  console.log('\n=== Top 10 stores by product count ===');
  for (const p of productsByStore) {
    const store = await db.collection('stores').findOne({ _id: p._id });
    console.log('  -', store?.name || 'Unknown', '|', store?.subcategorySlug || 'no-slug', '| products:', p.count);
  }

  await mongoose.disconnect();
  console.log('\nDone!');
}

checkData().catch(console.error);
