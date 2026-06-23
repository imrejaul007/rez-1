const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };
const DB_NAME = 'test';

// Categories needed based on unmatched products
const MISSING_CATEGORIES = [
  // Fashion
  { name: 'Jackets & Coats', slug: 'jackets-coats', icon: 'jacket-outline', type: 'home_delivery', color: '#5D4037' },

  // Beauty Services
  { name: 'Salon Services', slug: 'salon-services', icon: 'cut-outline', type: 'going_out', color: '#E91E63' },
  { name: 'Spa & Wellness', slug: 'spa-wellness', icon: 'flower-outline', type: 'going_out', color: '#9C27B0' },

  // Food
  { name: 'Healthy Food', slug: 'healthy-food', icon: 'leaf-outline', type: 'home_delivery', color: '#4CAF50' },

  // Grocery
  { name: 'Organic Products', slug: 'organic-products', icon: 'leaf-outline', type: 'home_delivery', color: '#8BC34A' },

  // Health
  { name: 'Health Services', slug: 'health-services', icon: 'medkit-outline', type: 'going_out', color: '#F44336' },

  // Gifts
  { name: 'Gifts', slug: 'gifts', icon: 'gift-outline', type: 'home_delivery', color: '#FF5722' },
  { name: 'Gift Cards', slug: 'gift-cards', icon: 'card-outline', type: 'home_delivery', color: '#FF9800' },

  // Services
  { name: 'Car Rentals', slug: 'car-rentals', icon: 'car-outline', type: 'going_out', color: '#607D8B' },
];

async function addMissingCategories() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db(DB_NAME);
    const categoriesCollection = db.collection('categories');

    console.log('📁 Adding missing categories...\n');

    let added = 0;
    let skipped = 0;

    for (const cat of MISSING_CATEGORIES) {
      // Check if category already exists
      const existing = await categoriesCollection.findOne({ slug: cat.slug });

      if (existing) {
        console.log(`  ⏭️ "${cat.name}" already exists (ID: ${existing._id})`);
        skipped++;
        continue;
      }

      // Create new category
      const newCategory = {
        name: cat.name,
        slug: cat.slug,
        icon: cat.icon,
        type: cat.type,
        isActive: true,
        sortOrder: 50,
        metadata: {
          color: cat.color,
          bgColor: cat.color + '20'
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
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await categoriesCollection.insertOne(newCategory);
      console.log(`  ✅ Added "${cat.name}" (slug: ${cat.slug})`);
      added++;
    }

    console.log(`\n${'='.repeat(50)}`);
    console.log(`📊 RESULTS:`);
    console.log(`  ✅ Added: ${added} categories`);
    console.log(`  ⏭️ Skipped: ${skipped} categories (already exist)`);

    // Now verify all needed slugs exist
    console.log(`\n🔍 VERIFICATION - Required slugs:`);
    const requiredSlugs = [
      'bags-wallets', 'shirts-tops', 'jackets-coats', 'jeans-pants', 'dresses',
      'watches', 'jewelry', 'footwear', 'sunglasses-eyewear', 'perfumes-fragrances',
      'makeup', 'skincare', 'haircare', 'salon-services', 'spa-wellness',
      'smartphones', 'laptops', 'tablets', 'headphones-earphones', 'speakers',
      'cameras', 'televisions', 'gaming', 'mobile-accessories',
      'lighting', 'kitchen-dining', 'storage-organization', 'home-decor',
      'fast-food', 'indian-cuisine', 'chinese', 'desserts', 'beverages', 'healthy-food',
      'fruits', 'vegetables', 'dairy-products', 'snacks', 'staples', 'organic-products',
      'vitamins-supplements', 'medicines', 'fitness-equipment', 'health-services',
      'books', 'stationery', 'gifts', 'gift-cards', 'car-rentals'
    ];

    for (const slug of requiredSlugs) {
      const exists = await categoriesCollection.findOne({ slug });
      const status = exists ? '✅' : '❌';
      console.log(`  ${status} ${slug}`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

addMissingCategories();
