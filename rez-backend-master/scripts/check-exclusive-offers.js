const mongoose = require('mongoose');
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };

async function check() {
  await mongoose.connect(MONGODB_URI, { dbName: 'test' });
  console.log('Connected to MongoDB');

  // Check all offers (latest first)
  const allOffers = await mongoose.connection.db.collection('offers').find({}).sort({ createdAt: -1 }).limit(10).toArray();
  console.log('\n=== Sample offers (first 5) ===');
  console.log('Total offers in collection:', await mongoose.connection.db.collection('offers').countDocuments());

  allOffers.forEach((o, i) => {
    console.log(`\n--- Offer ${i+1}: ${o.title} ---`);
    console.log('Fields:', Object.keys(o).join(', '));
    console.log('exclusiveZone:', o.exclusiveZone);
    console.log('eligibilityRequirement:', o.eligibilityRequirement);
  });

  // Check offers with exclusiveZone
  const offersWithZone = await mongoose.connection.db.collection('offers').find({
    exclusiveZone: { $exists: true, $ne: null }
  }).toArray();
  console.log('\n=== Offers with exclusiveZone ===');
  console.log('Count:', offersWithZone.length);

  await mongoose.disconnect();
}

check().catch(console.error);
