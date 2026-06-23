const mongoose = require('mongoose');

// Category Schema (copied from your model)
const CategorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  description: String,
  icon: String,
  image: String,
  bannerImage: String,
  type: {
    type: String,
    required: true,
    enum: ['going_out', 'home_delivery', 'earn', 'play', 'general'],
    default: 'general'
  },
  parentCategory: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  childCategories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
  metadata: {
    color: String,
    tags: [String],
    description: String,
    featured: { type: Boolean, default: false }
  },
  productCount: { type: Number, default: 0 },
  storeCount: { type: Number, default: 0 }
}, { timestamps: true });

const Category = mongoose.model('Category', CategorySchema);

// Categories to seed
const categories = [
  {
    name: 'Fashion',
    slug: 'fashion',
    description: 'Trending fashion items for men and women',
    type: 'general',
    icon: 'shirt-outline',
    sortOrder: 1,
    metadata: {
      color: '#8B5CF6',
      featured: true,
      description: 'Latest fashion trends and clothing'
    },
    productCount: 25
  },
  {
    name: 'Fleet Market',
    slug: 'fleet',
    description: 'Vehicle rental and transportation services',
    type: 'general',
    icon: 'car-outline',
    sortOrder: 2,
    metadata: {
      color: '#3B82F6',
      featured: true,
      description: 'Cars, bikes, and transportation rentals'
    },
    productCount: 18
  },
  {
    name: 'Gift',
    slug: 'gift',
    description: 'Perfect gifts for every occasion',
    type: 'general',
    icon: 'gift-outline',
    sortOrder: 3,
    metadata: {
      color: '#EF4444',
      featured: true,
      description: 'Special gifts and presents'
    },
    productCount: 32
  },
  {
    name: 'Restaurant',
    slug: 'restaurant',
    description: 'Delicious food from local restaurants',
    type: 'home_delivery',
    icon: 'restaurant-outline',
    sortOrder: 4,
    metadata: {
      color: '#F59E0B',
      featured: true,
      description: 'Food delivery from restaurants'
    },
    productCount: 156
  },
  {
    name: 'Electronic',
    slug: 'electronics',
    description: 'Latest electronic gadgets and devices',
    type: 'general',
    icon: 'phone-portrait-outline',
    sortOrder: 5,
    metadata: {
      color: '#10B981',
      featured: true,
      description: 'Electronics, gadgets, and devices'
    },
    productCount: 89
  },
  {
    name: 'Organic',
    slug: 'organic',
    description: 'Organic and natural products',
    type: 'home_delivery',
    icon: 'leaf-outline',
    sortOrder: 6,
    metadata: {
      color: '#22C55E',
      featured: true,
      description: 'Natural and organic products'
    },
    productCount: 45
  },
  {
    name: 'Grocery',
    slug: 'grocery',
    description: 'Daily grocery essentials',
    type: 'home_delivery',
    icon: 'basket-outline',
    sortOrder: 7,
    metadata: {
      color: '#84CC16',
      featured: true,
      description: 'Daily grocery and household items'
    },
    productCount: 234
  },
  {
    name: 'Medicine',
    slug: 'medicine',
    description: 'Healthcare and medical supplies',
    type: 'home_delivery',
    icon: 'medical-outline',
    sortOrder: 8,
    metadata: {
      color: '#06B6D4',
      featured: false,
      description: 'Medical supplies and healthcare'
    },
    productCount: 67
  },
  {
    name: 'Fruit',
    slug: 'fruit',
    description: 'Fresh fruits and vegetables',
    type: 'home_delivery',
    icon: 'nutrition-outline',
    sortOrder: 9,
    metadata: {
      color: '#F97316',
      featured: false,
      description: 'Fresh fruits and vegetables'
    },
    productCount: 78
  },
  {
    name: 'Meat',
    slug: 'meat',
    description: 'Fresh meat and seafood',
    type: 'home_delivery',
    icon: 'restaurant',
    sortOrder: 10,
    metadata: {
      color: '#DC2626',
      featured: false,
      description: 'Fresh meat and seafood'
    },
    productCount: 34
  }
];

async function seedCategories() {
  try {
    // Load environment variables
    require('dotenv').config();
    
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rez-app';
    await mongoose.connect(mongoURI, { dbName: process.env.DB_NAME || 'rez-app' });
    console.log('✅ Connected to MongoDB:', mongoURI.replace(/\/\/[^:]*:[^@]*@/, '//***:***@'));

    // Clear existing categories
    await Category.deleteMany({});
    console.log('🗑️  Cleared existing categories');

    // Insert new categories
    const insertedCategories = await Category.insertMany(categories);
    console.log(`✅ Inserted ${insertedCategories.length} categories`);

    // Display inserted categories
    console.log('\n📋 Inserted Categories:');
    insertedCategories.forEach((cat, index) => {
      console.log(`${index + 1}. ${cat.name} (${cat.slug}) - ${cat.type} - ${cat.productCount} products`);
    });

    console.log('\n🎉 Category seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding categories:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Run the seeding script
seedCategories();