/**
 * Setup Going Out Categories Script
 * Verifies and creates the categories needed for the Going Out section
 * Categories: Cafes, Family Restaurants, Fine Dining, QSR/Fast Food
 */

const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };
const DB_NAME = 'test';

// Going Out subcategories
const GOING_OUT_CATEGORIES = [
  {
    name: 'Cafes',
    slug: 'cafes',
    description: 'Coffee shops, tea houses, and casual cafes',
    icon: 'cafe-outline',
    type: 'going_out',
    color: '#6F4E37'
  },
  {
    name: 'Family Restaurants',
    slug: 'family-restaurants',
    description: 'Family-friendly dining establishments',
    icon: 'people-outline',
    type: 'going_out',
    color: '#FF6B6B'
  },
  {
    name: 'Fine Dining',
    slug: 'fine-dining',
    description: 'Upscale restaurants and premium dining',
    icon: 'wine-outline',
    type: 'going_out',
    color: '#9B59B6'
  },
  {
    name: 'QSR/Fast Food',
    slug: 'qsr-fast-food',
    description: 'Quick service restaurants and fast food chains',
    icon: 'fast-food-outline',
    type: 'going_out',
    color: '#FF9F1C'
  }
];

async function setupGoingOutCategories() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db(DB_NAME);
    const categoriesCollection = db.collection('categories');
    const storesCollection = db.collection('stores');

    console.log('📁 Setting up Going Out categories...\n');

    // First, check for existing "going_out" type categories
    const existingGoingOut = await categoriesCollection.find({ type: 'going_out' }).toArray();
    console.log(`Found ${existingGoingOut.length} existing going_out categories:`);
    existingGoingOut.forEach(cat => {
      console.log(`  - ${cat.name} (slug: ${cat.slug})`);
    });
    console.log('');

    let added = 0;
    let skipped = 0;
    let updated = 0;
    const categoryIds = {};

    for (const cat of GOING_OUT_CATEGORIES) {
      const existing = await categoriesCollection.findOne({ slug: cat.slug });

      if (existing) {
        // Category exists - check if it has type 'going_out'
        if (existing.type !== 'going_out') {
          // Update the type to going_out
          await categoriesCollection.updateOne(
            { _id: existing._id },
            { $set: { type: 'going_out', updatedAt: new Date() } }
          );
          console.log(`  🔄 Updated "${cat.name}" type to going_out`);
          updated++;
        } else {
          console.log(`  ⏭️ "${cat.name}" already exists with correct type`);
          skipped++;
        }
        categoryIds[cat.slug] = existing._id;
      } else {
        // Create new category
        const newCategory = {
          name: cat.name,
          slug: cat.slug,
          description: cat.description,
          icon: cat.icon,
          type: cat.type,
          isActive: true,
          sortOrder: GOING_OUT_CATEGORIES.indexOf(cat) + 1,
          metadata: {
            color: cat.color,
            bgColor: cat.color + '20',
            featured: true
          },
          headerConfig: {
            title: cat.name,
            backgroundColor: ['#00C06A', '#00A86B'],
            textColor: '#FFFFFF',
            showSearch: true,
            showCart: true,
            showCoinBalance: true,
            searchPlaceholder: `Search ${cat.name.toLowerCase()}...`
          },
          layoutConfig: {
            type: 'grid',
            columns: 2,
            showFilters: true,
            showSort: true
          },
          productCount: 0,
          storeCount: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const result = await categoriesCollection.insertOne(newCategory);
        console.log(`  ✅ Created "${cat.name}" (slug: ${cat.slug})`);
        added++;
        categoryIds[cat.slug] = result.insertedId;
      }
    }

    console.log(`\n📊 Summary: Added: ${added}, Updated: ${updated}, Skipped: ${skipped}\n`);

    // Count stores per category
    console.log('📊 Store counts per category:');
    for (const [slug, categoryId] of Object.entries(categoryIds)) {
      const storeCount = await storesCollection.countDocuments({
        category: categoryId,
        isActive: true
      });
      console.log(`  - ${slug}: ${storeCount} stores`);

      // Update the category with store count
      await categoriesCollection.updateOne(
        { _id: categoryId },
        { $set: { storeCount, updatedAt: new Date() } }
      );
    }

    console.log('\n✅ Going Out categories setup complete!');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await client.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the script
setupGoingOutCategories().catch(console.error);
