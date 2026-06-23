/* eslint-disable no-console */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const SAMPLE_SIZE = 3;

async function run() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/rez-app';
  await mongoose.connect(mongoUri);

  const Category = mongoose.model(
    'Category',
    new mongoose.Schema({}, { strict: false, collection: 'categories' })
  );
  const Store = mongoose.model(
    'StoreRaw',
    new mongoose.Schema({}, { strict: false, collection: 'stores' })
  );
  const Product = mongoose.model(
    'ProductRaw',
    new mongoose.Schema({}, { strict: false, collection: 'products' })
  );

  const foodCategory = await Category.findOne({ slug: 'food-dining', isActive: true }).lean();
  if (!foodCategory) {
    throw new Error('food-dining category not found');
  }

  const categoryIds = [foodCategory._id, ...(foodCategory.childCategories || [])];

  const candidateStores = await Store.find({
    isActive: true,
    isSuspended: { $ne: true },
    $or: [
      { category: { $in: categoryIds } },
      { categories: { $in: categoryIds } },
      { subcategory: { $in: categoryIds } },
      { subCategories: { $in: categoryIds } },
    ],
  })
    .select('_id name slug category serviceCapabilities bookingConfig bookingType hasStorePickup')
    .limit(50)
    .lean();

  if (!candidateStores.length) {
    throw new Error('No candidate food-dining stores found');
  }

  const candidateIds = candidateStores.map((s) => s._id);
  const storesWithProducts = await Product.distinct('store', {
    isActive: true,
    store: { $in: candidateIds },
  });

  const sample = candidateStores
    .filter((s) => storesWithProducts.some((id) => String(id) === String(s._id)))
    .slice(0, SAMPLE_SIZE);

  if (!sample.length) {
    throw new Error('No food-dining stores with active products found');
  }

  const before = sample.map((s) => ({
    _id: s._id,
    name: s.name,
    slug: s.slug,
    serviceCapabilities: s.serviceCapabilities || null,
    bookingConfig: s.bookingConfig || null,
    bookingType: s.bookingType || null,
    hasStorePickup: s.hasStorePickup || false,
  }));

  const sampleIds = sample.map((s) => s._id);
  const update = {
    $set: {
      'serviceCapabilities.dineIn.enabled': true,
      'serviceCapabilities.tableBooking.enabled': true,
      'serviceCapabilities.storePickup.enabled': true,
      'serviceCapabilities.storePickup.estimatedTime': '10-20 min',
      'bookingConfig.enabled': true,
      'bookingConfig.requiresAdvanceBooking': true,
      'bookingConfig.allowWalkIn': true,
      'bookingType': 'RESTAURANT',
      'hasStorePickup': true,
    },
  };

  const result = await Store.updateMany({ _id: { $in: sampleIds } }, update);

  const after = await Store.find({ _id: { $in: sampleIds } })
    .select('_id name slug serviceCapabilities bookingConfig bookingType hasStorePickup')
    .lean();

  const snapshot = {
    migratedAt: new Date().toISOString(),
    sampleSize: sample.length,
    matchedCount: result.matchedCount,
    modifiedCount: result.modifiedCount,
    before,
    after,
  };

  const outDir = path.join(process.cwd(), 'logs');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `food-fulfillment-sample-${Date.now()}.json`);
  fs.writeFileSync(outPath, JSON.stringify(snapshot, null, 2), 'utf8');

  console.log(JSON.stringify({
    ok: true,
    matchedCount: result.matchedCount,
    modifiedCount: result.modifiedCount,
    updatedStoreIds: sampleIds.map(String),
    snapshot: outPath,
  }, null, 2));
}

run()
  .catch((err) => {
    console.error(JSON.stringify({ ok: false, error: err.message }, null, 2));
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await mongoose.disconnect();
    } catch (_err) {}
  });
