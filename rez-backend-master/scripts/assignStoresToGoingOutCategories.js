/**
 * Assign Stores to Going Out Subcategories
 * Maps existing Food & Dining stores to appropriate subcategories
 * based on their names and characteristics
 */

const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };
const DB_NAME = 'test';

// Keywords to identify store types (order matters - first match wins)
const STORE_TYPE_KEYWORDS = {
  'qsr-fast-food': [
    'kfc', 'mcdonald', 'domino', 'pizza hut', 'burger king', 'subway',
    'wendy', 'taco bell', 'papa john', 'chick-fil-a', 'popeyes',
    'fast food', 'qsr', 'quick service', 'box8', 'mojo pizza', 'behrouz',
    'biryani', 'vada pav', 'chaat'
  ],
  'ice-cream-dessert': [
    'corner house', 'baskin robbins', 'naturals', 'ice cream', 'gelato',
    'frozen yogurt', 'dessert', 'sweet', 'theobroma', 'bakehouse', 'bakery'
  ],
  cafes: [
    'cafe', 'coffee', 'starbucks', 'barista', 'tea', 'chai', 'espresso',
    'dyu art cafe', 'third wave', 'blue tokai', 'brewing'
  ],
  'fine-dining': [
    'chianti', 'olive', 'taj', 'itc', 'leela', 'oberoi', 'fine dining',
    'gourmet', 'premium', 'luxury', 'vineyard', 'truffles'
  ],
  'family-restaurants': [
    'barbeque nation', 'empire', 'meghana', 'nandhini', 'udupi',
    'restaurant', 'kitchen', 'diner', 'eatery', 'family'
  ]
};

async function assignStoresToCategories() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db(DB_NAME);
    const storesCollection = db.collection('stores');
    const categoriesCollection = db.collection('categories');

    // Get the Food & Dining parent category
    const foodDiningCat = await categoriesCollection.findOne({ slug: 'food-dining' });
    if (!foodDiningCat) {
      console.log('❌ Food & Dining category not found');
      return;
    }

    // Get all going_out subcategories
    const goingOutCategories = await categoriesCollection.find({
      type: 'going_out',
      slug: { $in: ['cafes', 'family-restaurants', 'fine-dining', 'qsr-fast-food', 'ice-cream-dessert'] }
    }).toArray();

    console.log('📁 Going Out subcategories found:');
    const categoryMap = {};
    goingOutCategories.forEach(cat => {
      categoryMap[cat.slug] = cat._id;
      console.log(`  - ${cat.name} (${cat.slug}): ${cat._id}`);
    });
    console.log('');

    // Get all stores under Food & Dining
    const foodStores = await storesCollection.find({
      category: foodDiningCat._id,
      isActive: true
    }).toArray();

    console.log(`📊 Found ${foodStores.length} stores under Food & Dining\n`);

    let assigned = 0;
    let unmatched = [];

    for (const store of foodStores) {
      const storeName = store.name.toLowerCase();
      const storeTags = (store.tags || []).map(t => t.toLowerCase());
      let matchedCategory = null;

      // Try to match store to a subcategory
      for (const [catSlug, keywords] of Object.entries(STORE_TYPE_KEYWORDS)) {
        const matches = keywords.some(keyword =>
          storeName.includes(keyword) || storeTags.some(tag => tag.includes(keyword))
        );

        if (matches && categoryMap[catSlug]) {
          matchedCategory = catSlug;
          break;
        }
      }

      // Default unmatched food stores to family-restaurants
      if (!matchedCategory) {
        matchedCategory = 'family-restaurants';
        unmatched.push(store.name);
      }

      // Update the store's subCategories - replace with correct category
      const subCatId = categoryMap[matchedCategory];
      if (subCatId) {
        // Remove all going_out subcategories and add the correct one
        const goingOutCatIds = Object.values(categoryMap);
        const currentSubCats = (store.subCategories || []).filter(
          id => !goingOutCatIds.some(gid => gid.toString() === id.toString())
        );
        currentSubCats.push(subCatId);

        await storesCollection.updateOne(
          { _id: store._id },
          {
            $set: {
              subCategories: currentSubCats,
              updatedAt: new Date()
            }
          }
        );
        console.log(`  ✅ ${store.name} → ${matchedCategory}`);
        assigned++;
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`  - Assigned: ${assigned}`);
    console.log(`  - Defaulted to family-restaurants: ${unmatched.length}`);
    if (unmatched.length > 0) {
      console.log(`  - Stores defaulted: ${unmatched.slice(0, 10).join(', ')}${unmatched.length > 10 ? '...' : ''}`);
    }

    // Update store counts for each category
    console.log('\n📊 Updating store counts...');
    for (const [slug, catId] of Object.entries(categoryMap)) {
      const count = await storesCollection.countDocuments({
        $or: [
          { category: catId },
          { subCategories: catId }
        ],
        isActive: true
      });
      await categoriesCollection.updateOne(
        { _id: catId },
        { $set: { storeCount: count } }
      );
      console.log(`  - ${slug}: ${count} stores`);
    }

    console.log('\n✅ Store assignment complete!');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await client.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the script
assignStoresToCategories().catch(console.error);
