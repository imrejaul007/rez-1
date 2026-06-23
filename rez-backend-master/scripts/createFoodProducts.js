const mongoose = require('mongoose');
require('dotenv').config();

async function createFoodProducts() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.DB_NAME || 'rez-app' });
    console.log('✅ Connected to MongoDB\n');

    // Get Food & Dining category
    const foodCategory = await mongoose.connection.db.collection('categories').findOne({ slug: 'food-dining' });
    console.log('🍕 Food & Dining Category:', foodCategory.name, '| ID:', foodCategory._id.toString());

    // Create food products (pizza already exists, so starting with burger)
    const foodProducts = [
      {
        name: 'Premium Burger Combo',
        slug: 'premium-burger-combo',
        description: 'Juicy beef burger with fries and drink',
        shortDescription: 'Delicious burger combo',
        category: foodCategory._id,
        type: 'going_out',
        pricing: {
          original: 399,
          selling: 349,
          compare: 399,
          discount: 13
        },
        images: ['https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80'],
        inventory: {
          stock: 75,
          sku: 'FOOD-BURGER-001'
        },
        ratings: {
          average: 4.5,
          count: 134
        },
        cashback: {
          percentage: 8,
          maxAmount: 30
        },
        tags: ['food', 'burger', 'fast-food', 'combo'],
        isActive: true,
        isFeatured: true,
        isNewArrival: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Artisan Coffee & Pastry',
        slug: 'artisan-coffee-pastry',
        description: 'Freshly brewed artisan coffee with croissant',
        shortDescription: 'Coffee and pastry combo',
        category: foodCategory._id,
        type: 'going_out',
        pricing: {
          original: 299,
          selling: 249,
          compare: 299,
          discount: 17
        },
        images: ['https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&q=80'],
        inventory: {
          stock: 100,
          sku: 'FOOD-COFFEE-001'
        },
        ratings: {
          average: 4.8,
          count: 67
        },
        cashback: {
          percentage: 12,
          maxAmount: 30
        },
        tags: ['coffee', 'breakfast', 'pastry', 'cafe'],
        isActive: true,
        isFeatured: true,
        isNewArrival: false,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Sushi Platter Deluxe',
        slug: 'sushi-platter-deluxe',
        description: 'Assorted fresh sushi rolls with wasabi and soy sauce',
        shortDescription: 'Premium sushi platter',
        category: foodCategory._id,
        type: 'going_out',
        pricing: {
          original: 899,
          selling: 749,
          compare: 899,
          discount: 17
        },
        images: ['https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=800&q=80'],
        inventory: {
          stock: 30,
          sku: 'FOOD-SUSHI-001'
        },
        ratings: {
          average: 4.9,
          count: 45
        },
        cashback: {
          percentage: 15,
          maxAmount: 100
        },
        tags: ['sushi', 'japanese', 'seafood', 'premium'],
        isActive: true,
        isFeatured: true,
        isNewArrival: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    // Insert food products
    const result = await mongoose.connection.db.collection('products').insertMany(foodProducts);
    console.log('\n✅ Created', result.insertedCount, 'food products\n');

    foodProducts.forEach(p => {
      console.log('  🍽️ ', p.name, '-', p.pricing.currency || '₹', p.pricing.selling);
    });

    // Update category product count
    const productCount = await mongoose.connection.db.collection('products').countDocuments({ category: foodCategory._id });
    
    await mongoose.connection.db.collection('categories').updateOne(
      { _id: foodCategory._id },
      { $set: { productCount: productCount } }
    );

    console.log('\n🔢 Updated Food & Dining category product count:', productCount);

    await mongoose.disconnect();
    console.log('\n✨ All done! Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createFoodProducts();

