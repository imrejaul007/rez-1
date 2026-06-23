const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };
const DB_NAME = 'test';

// Placeholder images from Unsplash - Coffee/Cafe themed
const starbucksImages = {
  interior: [
    { url: 'https://images.unsplash.com/photo-1453614512568-c4024d13c247?w=800', title: 'Cozy Interior', tags: ['seating', 'ambience'] },
    { url: 'https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=800', title: 'Modern Decor', tags: ['decor', 'lighting'] },
    { url: 'https://images.unsplash.com/photo-1521017432531-fbd92d768814?w=800', title: 'Coffee Bar Area', tags: ['bar', 'service'] },
  ],
  exterior: [
    { url: 'https://images.unsplash.com/photo-1511081692775-05d0f180a065?w=800', title: 'Store Front', tags: ['entrance', 'signage'] },
    { url: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800', title: 'Outdoor Seating', tags: ['patio', 'outdoor'] },
  ],
  products: [
    { url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800', title: 'Classic Latte', tags: ['coffee', 'latte', 'hot'] },
    { url: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=800', title: 'Espresso Shot', tags: ['coffee', 'espresso'] },
    { url: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=800', title: 'Iced Coffee', tags: ['coffee', 'iced', 'cold'] },
    { url: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800', title: 'Cappuccino Art', tags: ['coffee', 'art', 'cappuccino'] },
    { url: 'https://images.unsplash.com/photo-1485808191679-5f86510681a2?w=800', title: 'Fresh Pastries', tags: ['pastry', 'bakery', 'food'] },
  ],
  menu: [
    { url: 'https://images.unsplash.com/photo-1514066558159-fc8c737ef259?w=800', title: 'Coffee Selection', tags: ['menu', 'drinks'] },
    { url: 'https://images.unsplash.com/photo-1498804103079-a6351b050096?w=800', title: 'Seasonal Specials', tags: ['menu', 'special'] },
  ],
  team: [
    { url: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800', title: 'Barista at Work', tags: ['barista', 'team', 'service'] },
    { url: 'https://images.unsplash.com/photo-1600093463592-8e36ae95ef56?w=800', title: 'Friendly Service', tags: ['team', 'customer service'] },
  ],
  events: [
    { url: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=800', title: 'Coffee Tasting Event', tags: ['event', 'tasting'] },
  ]
};

// Generic restaurant images for other stores
const restaurantImages = {
  interior: [
    { url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800', title: 'Dining Area', tags: ['seating', 'ambience'] },
    { url: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800', title: 'Restaurant Interior', tags: ['decor', 'dining'] },
  ],
  exterior: [
    { url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800', title: 'Restaurant Front', tags: ['entrance', 'signage'] },
  ],
  products: [
    { url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800', title: 'Signature Dish', tags: ['food', 'main course'] },
    { url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800', title: 'Pizza', tags: ['food', 'pizza'] },
    { url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800', title: 'Fresh Salad', tags: ['food', 'healthy'] },
  ],
  menu: [
    { url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800', title: 'Menu Highlights', tags: ['menu', 'food'] },
  ],
  team: [
    { url: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=800', title: 'Chef at Work', tags: ['chef', 'team'] },
  ]
};

// Fast food specific images
const fastFoodImages = {
  interior: [
    { url: 'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=800', title: 'Quick Service Area', tags: ['service', 'counter'] },
  ],
  exterior: [
    { url: 'https://images.unsplash.com/photo-1604467794349-0b74285de7e7?w=800', title: 'Store Entrance', tags: ['entrance'] },
  ],
  products: [
    { url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800', title: 'Burger', tags: ['burger', 'food'] },
    { url: 'https://images.unsplash.com/photo-1630384060421-cb20d0e0649d?w=800', title: 'Crispy Fries', tags: ['fries', 'side'] },
    { url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800', title: 'Pizza Special', tags: ['pizza', 'cheese'] },
    { url: 'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=800', title: 'Fried Chicken', tags: ['chicken', 'crispy'] },
  ]
};

// Store categories mapping
const storeTypeMap = {
  'Starbucks': 'coffee',
  'KFC': 'fastfood',
  'McDonald\'s': 'fastfood',
  'Domino\'s Pizza': 'fastfood',
  'Barbeque Nation': 'restaurant',
  'Chianti': 'restaurant',
  'Empire Restaurant': 'restaurant',
  'Corner House': 'dessert',
  'Baskin Robbins': 'dessert',
  'Theobroma': 'bakery',
  'Glen\'s Bakehouse': 'bakery',
  'Dyu Art Cafe': 'cafe',
};

function getImagesForStore(storeName) {
  const storeType = storeTypeMap[storeName] || 'restaurant';

  if (storeName === 'Starbucks') {
    return starbucksImages;
  } else if (storeType === 'fastfood') {
    return fastFoodImages;
  } else {
    return restaurantImages;
  }
}

async function seedGalleryData() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db(DB_NAME);

    // Get stores that need gallery data
    const storesToSeed = [
      'Starbucks',
      'KFC',
      'McDonald\'s',
      'Domino\'s Pizza',
      'Barbeque Nation',
      'Chianti',
      'Dyu Art Cafe',
      'Empire Restaurant',
      'Corner House',
      'Baskin Robbins',
    ];

    let totalInserted = 0;

    for (const storeName of storesToSeed) {
      const store = await db.collection('stores').findOne({ name: storeName });

      if (!store) {
        console.log(`Store not found: ${storeName}`);
        continue;
      }

      // Check if gallery items already exist for this store
      const existingCount = await db.collection('storegalleries').countDocuments({
        storeId: store._id
      });

      if (existingCount > 0) {
        console.log(`${storeName} already has ${existingCount} gallery items, skipping...`);
        continue;
      }

      console.log(`\nSeeding gallery for: ${storeName} (ID: ${store._id})`);

      const images = getImagesForStore(storeName);
      const galleryItems = [];

      for (const [category, items] of Object.entries(images)) {
        items.forEach((item, index) => {
          galleryItems.push({
            storeId: store._id,
            merchantId: store.merchantId || new ObjectId('68aaa623d4ae0ab11dc2436f'),
            url: item.url,
            thumbnail: item.url,
            publicId: `gallery_${storeName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${category}_${index}`,
            type: 'image',
            category: category,
            title: item.title,
            description: `${item.title} at ${storeName}`,
            tags: item.tags || [],
            order: index,
            isVisible: true,
            isCover: index === 0, // First item in each category is cover
            views: Math.floor(Math.random() * 100),
            likes: Math.floor(Math.random() * 50),
            shares: Math.floor(Math.random() * 20),
            viewedBy: [],
            uploadedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        });
      }

      if (galleryItems.length > 0) {
        const result = await db.collection('storegalleries').insertMany(galleryItems);
        console.log(`  Inserted ${result.insertedCount} gallery items`);
        totalInserted += result.insertedCount;
      }
    }

    console.log(`\n=== Summary ===`);
    console.log(`Total gallery items inserted: ${totalInserted}`);

    // Verify the data for Starbucks
    const starbucksGallery = await db.collection('storegalleries').find({
      storeId: new ObjectId('6937bc52bbdcc28f8cc26e63')
    }).toArray();

    console.log(`\nStarbucks gallery items after seeding: ${starbucksGallery.length}`);
    if (starbucksGallery.length > 0) {
      console.log('Categories:', [...new Set(starbucksGallery.map(g => g.category))]);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    console.log('\nDisconnected from MongoDB');
  }
}

seedGalleryData();
