const mongoose = require('mongoose');

// Category Schema
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

// Categories with proper image URLs (using Unsplash for quality images)
const categories = [
  {
    name: 'Fashion & Beauty',
    slug: 'fashion-beauty',
    description: 'Trending fashion items and beauty products for men and women',
    type: 'going_out',
    icon: 'shirt-outline',
    image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=800&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=1200&q=80',
    sortOrder: 1,
    metadata: {
      color: '#E91E63',
      featured: true,
      description: 'Latest fashion trends, clothing, and beauty products',
      tags: ['fashion', 'beauty', 'clothing', 'accessories']
    }
  },
  {
    name: 'Food & Dining',
    slug: 'food-dining',
    description: 'Delicious food from restaurants and cafes',
    type: 'going_out',
    icon: 'restaurant-outline',
    image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&q=80',
    sortOrder: 2,
    metadata: {
      color: '#F59E0B',
      featured: true,
      description: 'Restaurants, cafes, and food delivery',
      tags: ['food', 'restaurant', 'dining', 'delivery']
    }
  },
  {
    name: 'Entertainment',
    slug: 'entertainment',
    description: 'Movies, events, and entertainment options',
    type: 'going_out',
    icon: 'film-outline',
    image: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=1200&q=80',
    sortOrder: 3,
    metadata: {
      color: '#9C27B0',
      featured: true,
      description: 'Movies, concerts, events, and entertainment',
      tags: ['entertainment', 'movies', 'events', 'shows']
    }
  },
  {
    name: 'Grocery & Essentials',
    slug: 'grocery-essentials',
    description: 'Daily grocery and household essentials delivered to your doorstep',
    type: 'home_delivery',
    icon: 'basket-outline',
    image: 'https://images.unsplash.com/photo-1543168256-418811576931?w=800&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1534723328310-e82dad3ee43f?w=1200&q=80',
    sortOrder: 4,
    metadata: {
      color: '#4CAF50',
      featured: true,
      description: 'Fresh groceries and daily essentials',
      tags: ['grocery', 'essentials', 'household', 'delivery']
    }
  },
  {
    name: 'Electronics',
    slug: 'electronics',
    description: 'Latest electronic gadgets and devices',
    type: 'general',
    icon: 'phone-portrait-outline',
    image: 'https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=800&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1200&q=80',
    sortOrder: 5,
    metadata: {
      color: '#2196F3',
      featured: true,
      description: 'Electronics, gadgets, and smart devices',
      tags: ['electronics', 'gadgets', 'technology', 'devices']
    }
  },
  {
    name: 'Home & Living',
    slug: 'home-living',
    description: 'Furniture, decor, and home improvement',
    type: 'home_delivery',
    icon: 'home-outline',
    image: 'https://images.unsplash.com/photo-1556912167-f556f1f39faa?w=800&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1200&q=80',
    sortOrder: 6,
    metadata: {
      color: '#FF9800',
      featured: true,
      description: 'Furniture, home decor, and living essentials',
      tags: ['home', 'furniture', 'decor', 'living']
    }
  },
  {
    name: 'Health & Wellness',
    slug: 'health-wellness',
    description: 'Healthcare products and wellness services',
    type: 'home_delivery',
    icon: 'medical-outline',
    image: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1200&q=80',
    sortOrder: 7,
    metadata: {
      color: '#00BCD4',
      featured: false,
      description: 'Medical supplies, healthcare, and wellness',
      tags: ['health', 'wellness', 'medical', 'healthcare']
    }
  },
  {
    name: 'Fresh Produce',
    slug: 'fresh-produce',
    description: 'Fresh fruits, vegetables, and organic produce',
    type: 'home_delivery',
    icon: 'nutrition-outline',
    image: 'https://images.unsplash.com/photo-1610348725531-843dff563e2c?w=800&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=1200&q=80',
    sortOrder: 8,
    metadata: {
      color: '#8BC34A',
      featured: false,
      description: 'Fresh fruits, vegetables, and organic items',
      tags: ['fruits', 'vegetables', 'organic', 'fresh']
    }
  },
  {
    name: 'Sports & Fitness',
    slug: 'sports-fitness',
    description: 'Sports equipment and fitness gear',
    type: 'general',
    icon: 'fitness-outline',
    image: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200&q=80',
    sortOrder: 9,
    metadata: {
      color: '#FF5722',
      featured: false,
      description: 'Sports equipment, fitness gear, and activewear',
      tags: ['sports', 'fitness', 'gym', 'health']
    }
  },
  {
    name: 'Books & Stationery',
    slug: 'books-stationery',
    description: 'Books, stationery, and educational materials',
    type: 'home_delivery',
    icon: 'book-outline',
    image: 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=800&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=1200&q=80',
    sortOrder: 10,
    metadata: {
      color: '#795548',
      featured: false,
      description: 'Books, stationery, and learning materials',
      tags: ['books', 'stationery', 'education', 'reading']
    }
  }
];

async function seedCategories() {
  try {
    // Load environment variables
    require('dotenv').config();
    
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rez-app';
    await mongoose.connect(mongoURI, { dbName: process.env.DB_NAME || 'rez-app' });
    console.log('✅ Connected to MongoDB');

    // Clear existing categories
    await Category.deleteMany({});
    console.log('🗑️  Cleared existing categories');

    // Insert new categories
    const insertedCategories = await Category.insertMany(categories);
    console.log(`✅ Inserted ${insertedCategories.length} categories with images`);

    // Display inserted categories
    console.log('\n📋 Inserted Categories:');
    insertedCategories.forEach((cat, index) => {
      console.log(`${index + 1}. ${cat.name} (${cat.slug})`);
      console.log(`   Type: ${cat.type} | Featured: ${cat.metadata.featured}`);
      console.log(`   Image: ${cat.image ? '✓' : '✗'} | Banner: ${cat.bannerImage ? '✓' : '✗'}`);
    });

    console.log('\n🎉 Category seeding with images completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   Going Out: ${insertedCategories.filter(c => c.type === 'going_out').length}`);
    console.log(`   Home Delivery: ${insertedCategories.filter(c => c.type === 'home_delivery').length}`);
    console.log(`   General: ${insertedCategories.filter(c => c.type === 'general').length}`);
    console.log(`   Featured: ${insertedCategories.filter(c => c.metadata.featured).length}`);
    
  } catch (error) {
    console.error('❌ Error seeding categories:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Run the seeding script
seedCategories();

