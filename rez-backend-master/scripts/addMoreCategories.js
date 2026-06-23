const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };
const DB_NAME = 'test';

// All missing categories
const MISSING_CATEGORIES = [
  // Fashion
  { name: 'Shirts & Tops', slug: 'shirts-tops', icon: 'shirt-outline', type: 'home_delivery', color: '#3F51B5' },
  { name: 'Jeans & Pants', slug: 'jeans-pants', icon: 'walk-outline', type: 'home_delivery', color: '#1565C0' },
  { name: 'Jewelry', slug: 'jewelry', icon: 'diamond-outline', type: 'home_delivery', color: '#FFD700' },
  { name: 'Sunglasses & Eyewear', slug: 'sunglasses-eyewear', icon: 'glasses-outline', type: 'home_delivery', color: '#455A64' },
  { name: 'Perfumes & Fragrances', slug: 'perfumes-fragrances', icon: 'water-outline', type: 'home_delivery', color: '#9C27B0' },

  // Electronics
  { name: 'Smartphones', slug: 'smartphones', icon: 'phone-portrait-outline', type: 'home_delivery', color: '#2196F3' },
  { name: 'Headphones & Earphones', slug: 'headphones-earphones', icon: 'headset-outline', type: 'home_delivery', color: '#00BCD4' },
  { name: 'Speakers', slug: 'speakers', icon: 'volume-high-outline', type: 'home_delivery', color: '#FF5722' },
  { name: 'Televisions', slug: 'televisions', icon: 'tv-outline', type: 'home_delivery', color: '#607D8B' },
  { name: 'Gaming', slug: 'gaming', icon: 'game-controller-outline', type: 'home_delivery', color: '#8BC34A' },
  { name: 'Mobile Accessories', slug: 'mobile-accessories', icon: 'phone-landscape-outline', type: 'home_delivery', color: '#FF9800' },

  // Food
  { name: 'Chinese', slug: 'chinese', icon: 'restaurant-outline', type: 'home_delivery', color: '#E53935' },
  { name: 'Desserts', slug: 'desserts', icon: 'ice-cream-outline', type: 'home_delivery', color: '#F8BBD9' },

  // Grocery
  { name: 'Fruits', slug: 'fruits', icon: 'nutrition-outline', type: 'home_delivery', color: '#FF5722' },
  { name: 'Vegetables', slug: 'vegetables', icon: 'leaf-outline', type: 'home_delivery', color: '#4CAF50' },
  { name: 'Staples', slug: 'staples', icon: 'bag-outline', type: 'home_delivery', color: '#795548' },

  // Health
  { name: 'Medicines', slug: 'medicines', icon: 'medical-outline', type: 'home_delivery', color: '#F44336' },

  // Books
  { name: 'Books', slug: 'books', icon: 'book-outline', type: 'home_delivery', color: '#5D4037' },
  { name: 'Stationery', slug: 'stationery', icon: 'pencil-outline', type: 'home_delivery', color: '#FFC107' },
];

async function addMoreCategories() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db(DB_NAME);
    const categoriesCollection = db.collection('categories');

    console.log('📁 Adding more missing categories...\n');

    let added = 0;
    let skipped = 0;

    for (const cat of MISSING_CATEGORIES) {
      const existing = await categoriesCollection.findOne({ slug: cat.slug });

      if (existing) {
        console.log(`  ⏭️ "${cat.name}" already exists`);
        skipped++;
        continue;
      }

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

    console.log(`\n📊 Added: ${added}, Skipped: ${skipped}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('✅ Done');
  }
}

addMoreCategories();
