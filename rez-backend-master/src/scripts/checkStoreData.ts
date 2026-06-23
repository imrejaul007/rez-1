/**
 * Check Store Data for Sections
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function checkData() {
  await mongoose.connect(process.env.MONGODB_URI || '');
  const db = mongoose.connection.db;

  console.log('\n=== Store City Distribution ===');
  const cityDistribution = await db!.collection('stores').aggregate([
    { $group: { _id: '$location.city', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]).toArray();
  cityDistribution.forEach(item => console.log(`  ${item._id || 'null'}: ${item.count}`));

  console.log('\n=== Store Subcategory Slug Distribution (top 15) ===');
  const subCatSlugCount = await db!.collection('stores').aggregate([
    { $group: { _id: '$subcategorySlug', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 15 }
  ]).toArray();
  subCatSlugCount.forEach(item => console.log(`  ${item._id || 'null'}: ${item.count}`));

  console.log('\n=== Categories with slug matching section slugs ===');
  const sectionSlugs = [
    // Going Out
    'cafes', 'family-restaurants', 'fine-dining', 'qsr-fast-food',
    // Home Delivery
    'cloud-kitchens', 'supermarkets', 'pharmacies', 'pet-stores',
    // Services
    'ac-repair', 'salons', 'cleaning', 'spa-wellness'
  ];

  const matchingCategories = await db!.collection('categories').find({
    slug: { $in: sectionSlugs }
  }).project({ name: 1, slug: 1, parentCategory: 1 }).toArray();

  console.log(`  Found ${matchingCategories.length} matching categories:`);
  matchingCategories.forEach(cat => {
    console.log(`    - ${cat.slug}: ${cat.name} (${cat.parentCategory ? 'subcategory' : 'main'})`);
  });

  console.log('\n=== Stores with matching subcategorySlug ===');
  for (const slug of sectionSlugs) {
    const count = await db!.collection('stores').countDocuments({ subcategorySlug: slug });
    if (count > 0) {
      console.log(`  ${slug}: ${count} stores`);
    }
  }

  console.log('\n=== Sample Bangalore Stores ===');
  const bangaloreStores = await db!.collection('stores').find({
    'location.city': { $regex: /bangalore|bengaluru/i }
  }).limit(5).project({ name: 1, 'location.city': 1, subcategorySlug: 1 }).toArray();
  bangaloreStores.forEach(s => console.log(`  ${s.name} - ${s.location?.city} - slug: ${s.subcategorySlug || 'none'}`));

  await mongoose.disconnect();
  console.log('\nDone.');
}

checkData();
