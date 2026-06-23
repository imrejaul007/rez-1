const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Prevent running in production
if (process.env.NODE_ENV === 'production') {
  console.error('ERROR: Seed scripts cannot run in production!');
  process.exit(1);
}

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'test';

// Connect to MongoDB
async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI, {
      dbName: DB_NAME,
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB for seeding');
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    return false;
  }
}

// Seed data for all collections
const seedData = {
  // Users
  users: [
    {
      _id: new mongoose.Types.ObjectId('60a7f0d9c5e3a52f8c8b4567'),
      name: 'Demo User',
      email: 'demo@rezapp.com',
      phone: '+919876543210',
      password: crypto.randomBytes(16).toString('hex'),
      isVerified: true,
      loyaltyPoints: 500,
      tier: 'silver',
      profileCompletion: 85,
      preferences: {
        notifications: true,
        newsletter: true,
        language: 'en'
      },
      createdAt: new Date('2024-01-01')
    },
    {
      _id: new mongoose.Types.ObjectId('60a7f0d9c5e3a52f8c8b4568'),
      name: 'Test User',
      email: 'test@rezapp.com',
      phone: '+919876543211',
      password: require('crypto').randomBytes(16).toString('hex'),
      isVerified: true,
      loyaltyPoints: 1200,
      tier: 'gold',
      profileCompletion: 90,
      createdAt: new Date('2024-02-01')
    }
  ],

  // Categories
  categories: [
    {
      _id: new mongoose.Types.ObjectId(),
      name: 'Electronics',
      slug: 'electronics',
      description: 'Electronic gadgets and accessories',
      image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661',
      isActive: true,
      order: 1
    },
    {
      _id: new mongoose.Types.ObjectId(),
      name: 'Fashion',
      slug: 'fashion',
      description: 'Clothing, footwear and accessories',
      image: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b',
      isActive: true,
      order: 2
    },
    {
      _id: new mongoose.Types.ObjectId(),
      name: 'Groceries',
      slug: 'groceries',
      description: 'Daily essentials and food items',
      image: 'https://images.unsplash.com/photo-1542838132-92c53300491e',
      isActive: true,
      order: 3
    },
    {
      _id: new mongoose.Types.ObjectId(),
      name: 'Home & Living',
      slug: 'home-living',
      description: 'Furniture and home decor',
      image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc',
      isActive: true,
      order: 4
    },
    {
      _id: new mongoose.Types.ObjectId(),
      name: 'Sports',
      slug: 'sports',
      description: 'Sports equipment and fitness',
      image: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211',
      isActive: true,
      order: 5
    }
  ],

  // Stores
  stores: [
    {
      _id: new mongoose.Types.ObjectId(),
      name: 'TechHub Electronics',
      slug: 'techhub-electronics',
      description: 'Your one-stop shop for all electronics',
      logo: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3',
      coverImage: 'https://images.unsplash.com/photo-1556656793-08538906a9f8',
      category: 'Electronics',
      location: {
        type: 'Point',
        coordinates: [77.5946, 12.9716], // Bangalore
        address: 'MG Road, Bangalore',
        city: 'Bangalore',
        state: 'Karnataka',
        pincode: '560001'
      },
      rating: 4.5,
      totalRatings: 245,
      isVerified: true,
      isActive: true,
      deliveryTime: '30-45 mins',
      minOrder: 500,
      deliveryFee: 40,
      operatingHours: {
        monday: { open: '09:00', close: '22:00' },
        tuesday: { open: '09:00', close: '22:00' },
        wednesday: { open: '09:00', close: '22:00' },
        thursday: { open: '09:00', close: '22:00' },
        friday: { open: '09:00', close: '22:00' },
        saturday: { open: '09:00', close: '23:00' },
        sunday: { open: '10:00', close: '22:00' }
      }
    },
    {
      _id: new mongoose.Types.ObjectId(),
      name: 'Fashion Paradise',
      slug: 'fashion-paradise',
      description: 'Trendy fashion for everyone',
      logo: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8',
      category: 'Fashion',
      location: {
        type: 'Point',
        coordinates: [77.5946, 12.9716],
        address: 'Brigade Road, Bangalore',
        city: 'Bangalore',
        state: 'Karnataka',
        pincode: '560025'
      },
      rating: 4.3,
      totalRatings: 189,
      isVerified: true,
      isActive: true,
      deliveryTime: '45-60 mins',
      minOrder: 1000
    },
    {
      _id: new mongoose.Types.ObjectId(),
      name: 'Fresh Mart',
      slug: 'fresh-mart',
      description: 'Fresh groceries delivered to your doorstep',
      logo: 'https://images.unsplash.com/photo-1534723452862-4c874018d66d',
      category: 'Groceries',
      location: {
        type: 'Point',
        coordinates: [77.5946, 12.9716],
        address: 'Indiranagar, Bangalore',
        city: 'Bangalore',
        state: 'Karnataka',
        pincode: '560038'
      },
      rating: 4.7,
      totalRatings: 532,
      isVerified: true,
      isActive: true,
      deliveryTime: '20-30 mins',
      minOrder: 200
    }
  ],

  // Products
  products: [
    // Electronics
    {
      _id: new mongoose.Types.ObjectId(),
      name: 'iPhone 15 Pro Max',
      slug: 'iphone-15-pro-max',
      description: 'Latest iPhone with advanced features',
      price: 149900,
      discountPrice: 139900,
      category: 'Electronics',
      storeId: 'TechHub Electronics',
      images: [
        'https://images.unsplash.com/photo-1695048064165-630d35b58005'
      ],
      stock: 50,
      unit: 'piece',
      rating: 4.8,
      totalRatings: 127,
      features: [
        'A17 Pro chip',
        '256GB Storage',
        'Titanium design',
        '48MP camera'
      ],
      isActive: true,
      isFeatured: true,
      brand: 'Apple'
    },
    {
      _id: new mongoose.Types.ObjectId(),
      name: 'Samsung Galaxy S24 Ultra',
      slug: 'samsung-galaxy-s24-ultra',
      description: 'Premium Android smartphone',
      price: 124999,
      discountPrice: 119999,
      category: 'Electronics',
      storeId: 'TechHub Electronics',
      images: [
        'https://images.unsplash.com/photo-1610792516307-ea5aee3f1232'
      ],
      stock: 35,
      unit: 'piece',
      rating: 4.6,
      totalRatings: 89,
      isActive: true
    },
    {
      _id: new mongoose.Types.ObjectId(),
      name: 'Sony WH-1000XM5 Headphones',
      slug: 'sony-wh-1000xm5',
      description: 'Premium noise cancelling headphones',
      price: 29990,
      discountPrice: 26990,
      category: 'Electronics',
      storeId: 'TechHub Electronics',
      images: [
        'https://images.unsplash.com/photo-1545127398-14699f92334b'
      ],
      stock: 100,
      unit: 'piece',
      rating: 4.7,
      totalRatings: 234,
      isActive: true
    },

    // Fashion
    {
      _id: new mongoose.Types.ObjectId(),
      name: 'Men\'s Formal Shirt',
      slug: 'mens-formal-shirt',
      description: 'Premium cotton formal shirt',
      price: 2499,
      discountPrice: 1999,
      category: 'Fashion',
      storeId: 'Fashion Paradise',
      images: [
        'https://images.unsplash.com/photo-1596755094514-f87e34085b2c'
      ],
      stock: 200,
      unit: 'piece',
      rating: 4.4,
      totalRatings: 67,
      sizes: ['S', 'M', 'L', 'XL', 'XXL'],
      colors: ['White', 'Blue', 'Black'],
      isActive: true
    },
    {
      _id: new mongoose.Types.ObjectId(),
      name: 'Women\'s Designer Dress',
      slug: 'womens-designer-dress',
      description: 'Elegant party wear dress',
      price: 5999,
      discountPrice: 4499,
      category: 'Fashion',
      storeId: 'Fashion Paradise',
      images: [
        'https://images.unsplash.com/photo-1595777457583-95e059d581b8'
      ],
      stock: 150,
      unit: 'piece',
      rating: 4.6,
      totalRatings: 112,
      sizes: ['XS', 'S', 'M', 'L', 'XL'],
      colors: ['Red', 'Black', 'Navy'],
      isActive: true,
      isFeatured: true
    },

    // Groceries
    {
      _id: new mongoose.Types.ObjectId(),
      name: 'Organic Basmati Rice',
      slug: 'organic-basmati-rice',
      description: 'Premium quality long grain rice',
      price: 350,
      discountPrice: 320,
      category: 'Groceries',
      storeId: 'Fresh Mart',
      images: [
        'https://images.unsplash.com/photo-1586201375761-83865001e31c'
      ],
      stock: 500,
      unit: '5kg',
      rating: 4.5,
      totalRatings: 234,
      isActive: true
    },
    {
      _id: new mongoose.Types.ObjectId(),
      name: 'Fresh Vegetables Combo',
      slug: 'fresh-vegetables-combo',
      description: 'Assorted fresh vegetables pack',
      price: 199,
      discountPrice: 149,
      category: 'Groceries',
      storeId: 'Fresh Mart',
      images: [
        'https://images.unsplash.com/photo-1540420773420-3366772f4999'
      ],
      stock: 100,
      unit: '2kg',
      rating: 4.3,
      totalRatings: 156,
      isActive: true
    },
    {
      _id: new mongoose.Types.ObjectId(),
      name: 'Amul Butter',
      slug: 'amul-butter',
      description: 'Fresh dairy butter',
      price: 56,
      category: 'Groceries',
      storeId: 'Fresh Mart',
      images: [
        'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d'
      ],
      stock: 200,
      unit: '100g',
      rating: 4.7,
      totalRatings: 445,
      isActive: true
    }
  ],

  // Vouchers
  vouchers: [
    {
      _id: new mongoose.Types.ObjectId(),
      code: 'WELCOME50',
      description: 'Get 50% off on your first order',
      discountType: 'percentage',
      discountValue: 50,
      minOrder: 500,
      maxDiscount: 250,
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      usageLimit: 1,
      isActive: true
    },
    {
      _id: new mongoose.Types.ObjectId(),
      code: 'SAVE100',
      description: 'Flat ₹100 off on orders above ₹1000',
      discountType: 'fixed',
      discountValue: 100,
      minOrder: 1000,
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      isActive: true
    },
    {
      _id: new mongoose.Types.ObjectId(),
      code: 'FREEDELIVERY',
      description: 'Free delivery on all orders',
      discountType: 'free_delivery',
      minOrder: 200,
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      isActive: true
    }
  ],

  // Sample addresses for demo user
  addresses: [
    {
      _id: new mongoose.Types.ObjectId(),
      userId: '60a7f0d9c5e3a52f8c8b4567',
      type: 'home',
      name: 'Demo User',
      phone: '+919876543210',
      addressLine1: '123, MG Road',
      addressLine2: 'Near Central Mall',
      city: 'Bangalore',
      state: 'Karnataka',
      country: 'India',
      pincode: '560001',
      landmark: 'Central Mall',
      isDefault: true,
      location: {
        type: 'Point',
        coordinates: [77.5946, 12.9716]
      }
    },
    {
      _id: new mongoose.Types.ObjectId(),
      userId: '60a7f0d9c5e3a52f8c8b4567',
      type: 'office',
      name: 'Demo User',
      phone: '+919876543210',
      addressLine1: '456, Brigade Road',
      addressLine2: 'Tech Park',
      city: 'Bangalore',
      state: 'Karnataka',
      country: 'India',
      pincode: '560025',
      isDefault: false
    }
  ],

  // Sample loyalty points
  loyaltypoints: [
    {
      _id: new mongoose.Types.ObjectId(),
      userId: '60a7f0d9c5e3a52f8c8b4567',
      points: 500,
      tier: 'silver',
      totalEarned: 1500,
      totalRedeemed: 1000,
      transactions: [
        {
          type: 'earned',
          points: 100,
          description: 'Order #1001',
          date: new Date('2024-01-15')
        },
        {
          type: 'earned',
          points: 200,
          description: 'Referral bonus',
          date: new Date('2024-02-01')
        },
        {
          type: 'redeemed',
          points: -50,
          description: 'Voucher redemption',
          date: new Date('2024-02-15')
        }
      ]
    }
  ],

  // Wallets
  wallets: [
    {
      _id: new mongoose.Types.ObjectId(),
      userId: '60a7f0d9c5e3a52f8c8b4567',
      balance: 1500,
      currency: 'INR',
      transactions: [
        {
          type: 'credit',
          amount: 2000,
          description: 'Added money',
          date: new Date('2024-01-10'),
          status: 'completed'
        },
        {
          type: 'debit',
          amount: 500,
          description: 'Order payment',
          date: new Date('2024-01-20'),
          status: 'completed'
        }
      ]
    }
  ]
};

// Seeding functions
async function seedCollection(collectionName, data) {
  try {
    const db = mongoose.connection.db;
    const collection = db.collection(collectionName);

    // Check if collection already has data
    const count = await collection.countDocuments();
    if (count > 0) {
      console.log(`⏭️  ${collectionName}: Already has ${count} documents, skipping...`);
      return { skipped: true, count };
    }

    // Insert data
    const result = await collection.insertMany(data);
    console.log(`✅ ${collectionName}: Inserted ${result.insertedCount} documents`);
    return { inserted: result.insertedCount };

  } catch (error) {
    console.error(`❌ Error seeding ${collectionName}:`, error.message);
    return { error: error.message };
  }
}

// Main seeding function
async function seedDatabase() {
  console.log('🌱 Starting database seeding...\n');

  const results = {};

  // Hash passwords for users before seeding
  for (let user of seedData.users) {
    if (user.password) {
      user.password = await bcrypt.hash(user.password, 10);
    }
  }

  // Seed each collection
  for (const [collectionName, data] of Object.entries(seedData)) {
    results[collectionName] = await seedCollection(collectionName, data);
  }

  // Create indexes
  console.log('\n📇 Creating indexes...');
  try {
    const db = mongoose.connection.db;

    // User indexes
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('users').createIndex({ phone: 1 }, { unique: true });

    // Product indexes
    await db.collection('products').createIndex({ slug: 1 }, { unique: true });
    await db.collection('products').createIndex({ category: 1 });
    await db.collection('products').createIndex({ price: 1 });

    // Store indexes
    await db.collection('stores').createIndex({ slug: 1 }, { unique: true });
    await db.collection('stores').createIndex({ 'location.coordinates': '2dsphere' });

    console.log('✅ Indexes created successfully');
  } catch (error) {
    console.error('❌ Error creating indexes:', error.message);
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 SEEDING SUMMARY');
  console.log('='.repeat(50));

  let totalInserted = 0;
  let totalSkipped = 0;

  for (const [collection, result] of Object.entries(results)) {
    if (result.inserted) {
      totalInserted += result.inserted;
      console.log(`✅ ${collection}: ${result.inserted} documents`);
    } else if (result.skipped) {
      totalSkipped++;
      console.log(`⏭️  ${collection}: Skipped (already has data)`);
    } else if (result.error) {
      console.log(`❌ ${collection}: Error - ${result.error}`);
    }
  }

  console.log('\n📈 Total documents inserted:', totalInserted);
  console.log('⏭️  Collections skipped:', totalSkipped);

  return results;
}

// Main execution
async function main() {
  const connected = await connectDB();
  if (!connected) {
    console.error('Failed to connect to database');
    process.exit(1);
  }

  try {
    await seedDatabase();
    console.log('\n✅ Database seeding completed successfully!');

    console.log('\n📱 TEST CREDENTIALS:');
    console.log('   Email: demo@rezapp.com');
    console.log('   Password: (randomly generated at seed time)');
    console.log('   Phone: +919876543210');

  } catch (error) {
    console.error('❌ Seeding error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Database connection closed');
  }
}

// Run the script
main().catch(console.error);