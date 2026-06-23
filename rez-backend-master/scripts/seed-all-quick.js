/**
 * MASTER SEED SCRIPT
 * ===================
 * Comprehensive database seeding solution for development/testing
 *
 * Seeds:
 * 1. Categories (8 categories)
 * 2. Stores/Merchants (15 stores)
 * 3. Products (30 products)
 * 4. Offers (20 offers)
 * 5. Videos (15 videos for Play page)
 * 6. Projects (10 projects for Earn page)
 *
 * Usage:
 *   npm run seed:all
 *
 * Or directly:
 *   node scripts/seed-all-quick.js
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rez-app';

// ==================== HELPER FUNCTIONS ====================

const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('\n✅ MongoDB Connected Successfully');
    console.log(`📦 Database: ${mongoose.connection.name}`);
    console.log('─'.repeat(60));
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error);
    process.exit(1);
  }
};

const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    console.log('\n📤 MongoDB Disconnected');
  } catch (error) {
    console.error('❌ Disconnect Error:', error);
  }
};

const randomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomNumber = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomFloat = (min, max, decimals = 2) =>
  parseFloat((Math.random() * (max - min) + min).toFixed(decimals));

// ==================== DATA GENERATORS ====================

const generateCategories = () => [
  {
    name: 'Electronics',
    slug: 'electronics',
    description: 'Latest gadgets, smartphones, laptops, and electronic accessories',
    icon: '📱',
    image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=500',
    bannerImage: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=1200',
    type: 'general',
    isActive: true,
    sortOrder: 1,
    metadata: {
      color: '#3B82F6',
      tags: ['tech', 'gadgets', 'electronics'],
      featured: true,
      seoTitle: 'Buy Electronics Online - Best Deals',
      seoDescription: 'Shop the latest electronics with amazing cashback offers'
    }
  },
  {
    name: 'Fashion',
    slug: 'fashion',
    description: 'Trendy clothing, footwear, and fashion accessories',
    icon: '👗',
    image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=500',
    bannerImage: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=1200',
    type: 'general',
    isActive: true,
    sortOrder: 2,
    metadata: {
      color: '#EC4899',
      tags: ['fashion', 'clothing', 'style'],
      featured: true
    }
  },
  {
    name: 'Food & Dining',
    slug: 'food-dining',
    description: 'Restaurants, cafes, food delivery, and dining experiences',
    icon: '🍔',
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=500',
    bannerImage: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200',
    type: 'going_out',
    isActive: true,
    sortOrder: 3,
    metadata: {
      color: '#F59E0B',
      tags: ['food', 'dining', 'restaurants'],
      featured: true
    }
  },
  {
    name: 'Beauty & Personal Care',
    slug: 'beauty',
    description: 'Cosmetics, skincare, haircare, and wellness products',
    icon: '💄',
    image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=500',
    bannerImage: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=1200',
    type: 'general',
    isActive: true,
    sortOrder: 4,
    metadata: {
      color: '#A855F7',
      tags: ['beauty', 'cosmetics', 'skincare']
    }
  },
  {
    name: 'Home & Living',
    slug: 'home-living',
    description: 'Furniture, home decor, kitchen essentials, and appliances',
    icon: '🏠',
    image: 'https://images.unsplash.com/photo-1484101403633-562f891dc89a?w=500',
    bannerImage: 'https://images.unsplash.com/photo-1556912172-45b7abe8b7e1?w=1200',
    type: 'home_delivery',
    isActive: true,
    sortOrder: 5,
    metadata: {
      color: '#10B981',
      tags: ['home', 'furniture', 'decor']
    }
  },
  {
    name: 'Sports & Fitness',
    slug: 'sports-fitness',
    description: 'Gym equipment, sportswear, fitness accessories',
    icon: '⚽',
    image: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=500',
    bannerImage: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200',
    type: 'general',
    isActive: true,
    sortOrder: 6,
    metadata: {
      color: '#EF4444',
      tags: ['sports', 'fitness', 'gym']
    }
  },
  {
    name: 'Books & Education',
    slug: 'books-education',
    description: 'Books, courses, educational materials, and stationery',
    icon: '📚',
    image: 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=500',
    bannerImage: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=1200',
    type: 'general',
    isActive: true,
    sortOrder: 7,
    metadata: {
      color: '#8B5CF6',
      tags: ['books', 'education', 'learning']
    }
  },
  {
    name: 'Services',
    slug: 'services',
    description: 'Home services, repairs, cleaning, and professional services',
    icon: '🛠️',
    image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=500',
    bannerImage: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=1200',
    type: 'general',
    isActive: true,
    sortOrder: 8,
    metadata: {
      color: '#14B8A6',
      tags: ['services', 'repair', 'maintenance']
    }
  }
];

const generateStores = (categories) => {
  const cities = ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata'];
  const storeTypes = ['online', 'physical', 'both'];

  return [
    {
      businessName: 'TechHub Electronics',
      ownerName: 'Rajesh Kumar',
      email: 'rajesh@techhub.com',
      password: '$2a$10$abcdefghijklmnopqrstuvwxyz123456', // Hashed password
      phone: '+91-9876543210',
      businessAddress: {
        street: '123 MG Road',
        city: 'Bangalore',
        state: 'Karnataka',
        zipCode: '560001',
        country: 'India',
        coordinates: { latitude: 12.9716, longitude: 77.5946 }
      },
      verificationStatus: 'verified',
      isActive: true,
      description: 'Your one-stop shop for all electronics and gadgets',
      logo: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=200',
      displayName: 'TechHub',
      tagline: 'Technology Made Easy',
      coverImage: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=1200',
      categories: [categories[0]._id.toString()],
      ratings: { average: 4.5, count: 1250 },
      isFeatured: true,
      businessHours: {
        monday: '9:00 AM - 9:00 PM',
        tuesday: '9:00 AM - 9:00 PM',
        wednesday: '9:00 AM - 9:00 PM',
        thursday: '9:00 AM - 9:00 PM',
        friday: '9:00 AM - 9:00 PM',
        saturday: '10:00 AM - 8:00 PM',
        sunday: '10:00 AM - 6:00 PM'
      },
      verification: { isVerified: true }
    },
    {
      businessName: 'Fashion Forward',
      ownerName: 'Priya Sharma',
      email: 'priya@fashionforward.com',
      password: '$2a$10$abcdefghijklmnopqrstuvwxyz123456',
      phone: '+91-9876543211',
      businessAddress: {
        street: '456 Fashion Street',
        city: 'Mumbai',
        state: 'Maharashtra',
        zipCode: '400001',
        country: 'India',
        coordinates: { latitude: 19.0760, longitude: 72.8777 }
      },
      verificationStatus: 'verified',
      isActive: true,
      description: 'Latest trends in fashion and lifestyle',
      logo: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=200',
      displayName: 'Fashion Forward',
      tagline: 'Style Meets Comfort',
      categories: [categories[1]._id.toString()],
      ratings: { average: 4.7, count: 890 },
      isFeatured: true,
      verification: { isVerified: true }
    },
    {
      businessName: 'Gourmet Kitchen',
      ownerName: 'Chef Amit Patel',
      email: 'amit@gourmetkitchen.com',
      password: '$2a$10$abcdefghijklmnopqrstuvwxyz123456',
      phone: '+91-9876543212',
      businessAddress: {
        street: '789 Food Plaza',
        city: 'Delhi',
        state: 'Delhi',
        zipCode: '110001',
        country: 'India',
        coordinates: { latitude: 28.6139, longitude: 77.2090 }
      },
      verificationStatus: 'verified',
      isActive: true,
      description: 'Fine dining and gourmet experiences',
      logo: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=200',
      displayName: 'Gourmet Kitchen',
      tagline: 'Where Food Meets Art',
      categories: [categories[2]._id.toString()],
      ratings: { average: 4.8, count: 2340 },
      isFeatured: true,
      verification: { isVerified: true }
    },
    {
      businessName: 'Beauty Bliss Spa',
      ownerName: 'Neha Reddy',
      email: 'neha@beautybliss.com',
      password: '$2a$10$abcdefghijklmnopqrstuvwxyz123456',
      phone: '+91-9876543213',
      businessAddress: {
        street: '101 Spa Lane',
        city: 'Hyderabad',
        state: 'Telangana',
        zipCode: '500001',
        country: 'India',
        coordinates: { latitude: 17.3850, longitude: 78.4867 }
      },
      verificationStatus: 'verified',
      isActive: true,
      description: 'Premium beauty and wellness services',
      logo: 'https://images.unsplash.com/photo-1519415387722-a1c3bbef716c?w=200',
      categories: [categories[3]._id.toString()],
      ratings: { average: 4.6, count: 567 },
      verification: { isVerified: true }
    },
    {
      businessName: 'HomeDecor Paradise',
      ownerName: 'Vikram Singh',
      email: 'vikram@homedecor.com',
      password: '$2a$10$abcdefghijklmnopqrstuvwxyz123456',
      phone: '+91-9876543214',
      businessAddress: {
        street: '202 Decor Street',
        city: 'Pune',
        state: 'Maharashtra',
        zipCode: '411001',
        country: 'India',
        coordinates: { latitude: 18.5204, longitude: 73.8567 }
      },
      verificationStatus: 'verified',
      isActive: true,
      description: 'Transform your home with our premium decor',
      logo: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=200',
      categories: [categories[4]._id.toString()],
      ratings: { average: 4.4, count: 423 },
      verification: { isVerified: true }
    },
    // Additional 10 stores
    {
      businessName: 'FitZone Gym',
      ownerName: 'Ravi Menon',
      email: 'ravi@fitzone.com',
      password: '$2a$10$abcdefghijklmnopqrstuvwxyz123456',
      phone: '+91-9876543215',
      businessAddress: {
        street: '303 Fitness Road',
        city: 'Chennai',
        state: 'Tamil Nadu',
        zipCode: '600001',
        country: 'India',
        coordinates: { latitude: 13.0827, longitude: 80.2707 }
      },
      verificationStatus: 'verified',
      isActive: true,
      description: 'Complete fitness solutions and equipment',
      logo: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=200',
      categories: [categories[5]._id.toString()],
      ratings: { average: 4.5, count: 678 },
      verification: { isVerified: true }
    },
    {
      businessName: 'BookWorm Store',
      ownerName: 'Anjali Desai',
      email: 'anjali@bookworm.com',
      password: '$2a$10$abcdefghijklmnopqrstuvwxyz123456',
      phone: '+91-9876543216',
      businessAddress: {
        street: '404 Reader Avenue',
        city: 'Kolkata',
        state: 'West Bengal',
        zipCode: '700001',
        country: 'India',
        coordinates: { latitude: 22.5726, longitude: 88.3639 }
      },
      verificationStatus: 'verified',
      isActive: true,
      description: 'Your gateway to knowledge and imagination',
      logo: 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=200',
      categories: [categories[6]._id.toString()],
      ratings: { average: 4.7, count: 345 },
      verification: { isVerified: true }
    },
    {
      businessName: 'QuickFix Services',
      ownerName: 'Suresh Nair',
      email: 'suresh@quickfix.com',
      password: '$2a$10$abcdefghijklmnopqrstuvwxyz123456',
      phone: '+91-9876543217',
      businessAddress: {
        street: '505 Service Center',
        city: 'Bangalore',
        state: 'Karnataka',
        zipCode: '560002',
        country: 'India',
        coordinates: { latitude: 12.9716, longitude: 77.5946 }
      },
      verificationStatus: 'verified',
      isActive: true,
      description: 'Professional home repair and maintenance',
      logo: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=200',
      categories: [categories[7]._id.toString()],
      ratings: { average: 4.3, count: 234 },
      verification: { isVerified: true }
    },
    {
      businessName: 'SmartPhone Hub',
      ownerName: 'Arjun Kapoor',
      email: 'arjun@smartphonehub.com',
      password: '$2a$10$abcdefghijklmnopqrstuvwxyz123456',
      phone: '+91-9876543218',
      businessAddress: {
        street: '606 Mobile Market',
        city: 'Mumbai',
        state: 'Maharashtra',
        zipCode: '400002',
        country: 'India',
        coordinates: { latitude: 19.0760, longitude: 72.8777 }
      },
      verificationStatus: 'verified',
      isActive: true,
      description: 'Latest smartphones and accessories',
      logo: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=200',
      categories: [categories[0]._id.toString()],
      ratings: { average: 4.6, count: 1890 },
      verification: { isVerified: true }
    },
    {
      businessName: 'Urban Trends',
      ownerName: 'Meera Joshi',
      email: 'meera@urbantrends.com',
      password: '$2a$10$abcdefghijklmnopqrstuvwxyz123456',
      phone: '+91-9876543219',
      businessAddress: {
        street: '707 Style Boulevard',
        city: 'Delhi',
        state: 'Delhi',
        zipCode: '110002',
        country: 'India',
        coordinates: { latitude: 28.6139, longitude: 77.2090 }
      },
      verificationStatus: 'verified',
      isActive: true,
      description: 'Contemporary fashion for modern lifestyle',
      logo: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=200',
      categories: [categories[1]._id.toString()],
      ratings: { average: 4.5, count: 756 },
      verification: { isVerified: true }
    },
    {
      businessName: 'Cafe Coffee Day',
      ownerName: 'Karan Malhotra',
      email: 'karan@cafecoffee.com',
      password: '$2a$10$abcdefghijklmnopqrstuvwxyz123456',
      phone: '+91-9876543220',
      businessAddress: {
        street: '808 Coffee Lane',
        city: 'Pune',
        state: 'Maharashtra',
        zipCode: '411002',
        country: 'India',
        coordinates: { latitude: 18.5204, longitude: 73.8567 }
      },
      verificationStatus: 'verified',
      isActive: true,
      description: 'Premium coffee and delightful snacks',
      logo: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=200',
      categories: [categories[2]._id.toString()],
      ratings: { average: 4.4, count: 1234 },
      verification: { isVerified: true }
    },
    {
      businessName: 'Glow Cosmetics',
      ownerName: 'Divya Iyer',
      email: 'divya@glowcosmetics.com',
      password: '$2a$10$abcdefghijklmnopqrstuvwxyz123456',
      phone: '+91-9876543221',
      businessAddress: {
        street: '909 Beauty Corner',
        city: 'Hyderabad',
        state: 'Telangana',
        zipCode: '500002',
        country: 'India',
        coordinates: { latitude: 17.3850, longitude: 78.4867 }
      },
      verificationStatus: 'verified',
      isActive: true,
      description: 'Natural and organic beauty products',
      logo: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=200',
      categories: [categories[3]._id.toString()],
      ratings: { average: 4.8, count: 456 },
      verification: { isVerified: true }
    },
    {
      businessName: 'Kitchen Essentials',
      ownerName: 'Ramesh Gupta',
      email: 'ramesh@kitchenessentials.com',
      password: '$2a$10$abcdefghijklmnopqrstuvwxyz123456',
      phone: '+91-9876543222',
      businessAddress: {
        street: '1010 Kitchen Plaza',
        city: 'Chennai',
        state: 'Tamil Nadu',
        zipCode: '600002',
        country: 'India',
        coordinates: { latitude: 13.0827, longitude: 80.2707 }
      },
      verificationStatus: 'verified',
      isActive: true,
      description: 'Everything you need for your kitchen',
      logo: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=200',
      categories: [categories[4]._id.toString()],
      ratings: { average: 4.3, count: 567 },
      verification: { isVerified: true }
    },
    {
      businessName: 'Sports Arena',
      ownerName: 'Sachin Tendulkar',
      email: 'sachin@sportsarena.com',
      password: '$2a$10$abcdefghijklmnopqrstuvwxyz123456',
      phone: '+91-9876543223',
      businessAddress: {
        street: '1111 Sports Complex',
        city: 'Mumbai',
        state: 'Maharashtra',
        zipCode: '400003',
        country: 'India',
        coordinates: { latitude: 19.0760, longitude: 72.8777 }
      },
      verificationStatus: 'verified',
      isActive: true,
      description: 'Premium sports equipment and gear',
      logo: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=200',
      categories: [categories[5]._id.toString()],
      ratings: { average: 4.9, count: 2345 },
      isFeatured: true,
      verification: { isVerified: true }
    },
    {
      businessName: 'Learning Hub',
      ownerName: 'Dr. Smita Rao',
      email: 'smita@learninghub.com',
      password: '$2a$10$abcdefghijklmnopqrstuvwxyz123456',
      phone: '+91-9876543224',
      businessAddress: {
        street: '1212 Education Street',
        city: 'Bangalore',
        state: 'Karnataka',
        zipCode: '560003',
        country: 'India',
        coordinates: { latitude: 12.9716, longitude: 77.5946 }
      },
      verificationStatus: 'verified',
      isActive: true,
      description: 'Online courses and educational materials',
      logo: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=200',
      categories: [categories[6]._id.toString()],
      ratings: { average: 4.7, count: 890 },
      verification: { isVerified: true }
    }
  ];
};

const generateProducts = (stores, categories) => {
  const products = [];
  const productNames = {
    electronics: [
      'iPhone 15 Pro Max', 'Samsung Galaxy S24 Ultra', 'MacBook Pro M3',
      'Dell XPS 15', 'Sony WH-1000XM5', 'iPad Air'
    ],
    fashion: [
      'Designer Kurta Set', 'Formal Shirt Collection', 'Running Shoes Pro',
      'Leather Jacket Premium', 'Summer Dress Collection', 'Denim Jeans'
    ],
    food: [
      'Gourmet Burger Combo', 'Pizza Special', 'Sushi Platter',
      'Continental Thali', 'Dessert Paradise', 'Coffee Special'
    ],
    beauty: [
      'Skincare Luxury Set', 'Makeup Kit Professional', 'Hair Care Bundle',
      'Perfume Collection', 'Spa Package', 'Anti-Aging Cream'
    ],
    home: [
      'Sofa Set Premium', 'Dining Table 6-Seater', 'LED TV 55 inch',
      'Kitchen Appliance Set', 'Bedding Collection', 'Wall Art Decor'
    ],
    sports: [
      'Yoga Mat Pro', 'Dumbbell Set 20kg', 'Treadmill Electric',
      'Cricket Kit Complete', 'Football Official', 'Gym Membership'
    ],
    books: [
      'Business Strategy Books', 'Fiction Bestsellers', 'Self-Help Collection',
      'Programming Course Bundle', 'Children Story Books', 'Academic Textbooks'
    ],
    services: [
      'AC Repair Service', 'Home Cleaning', 'Plumbing Service',
      'Electrical Work', 'Painting Service', 'Appliance Repair'
    ]
  };

  const descriptions = [
    'Premium quality product with excellent features',
    'Best-selling product with amazing reviews',
    'Limited edition - grab it before it\'s gone',
    'Customer favorite with 5-star ratings',
    'New arrival - trending now',
    'Exclusive deal - special price'
  ];

  let productIndex = 0;
  const storesPerCategory = Math.ceil(stores.length / categories.length);

  categories.forEach((category, catIndex) => {
    const categoryStores = stores.slice(
      catIndex * storesPerCategory,
      (catIndex + 1) * storesPerCategory
    );

    const categoryKey = ['electronics', 'fashion', 'food', 'beauty', 'home', 'sports', 'books', 'services'][catIndex] || 'electronics';
    const names = productNames[categoryKey] || productNames.electronics;

    categoryStores.forEach((store, storeIndex) => {
      const productsPerStore = storeIndex === 0 ? 5 : randomNumber(2, 4);

      for (let i = 0; i < productsPerStore && productIndex < 30; i++) {
        const productName = names[i % names.length];
        const basePrice = randomFloat(99, 9999);
        const discount = randomNumber(5, 40);
        const discountedPrice = basePrice * (1 - discount / 100);

        products.push({
          merchantId: store._id,
          name: `${productName}`,
          description: randomElement(descriptions) + '. High quality guaranteed.',
          shortDescription: randomElement(descriptions),
          sku: `SKU-${String(productIndex + 1).padStart(6, '0')}`,
          category: category.name,
          subcategory: category.name,
          brand: ['Samsung', 'Apple', 'Nike', 'Adidas', 'Sony', 'LG'][randomNumber(0, 5)],
          price: basePrice,
          compareAtPrice: basePrice + randomFloat(100, 500),
          currency: 'INR',
          inventory: {
            stock: randomNumber(5, 500),
            lowStockThreshold: 10,
            trackInventory: true,
            allowBackorders: false,
            reservedStock: 0
          },
          images: [
            {
              url: `https://images.unsplash.com/photo-${1500000000000 + productIndex}?w=800`,
              thumbnailUrl: `https://images.unsplash.com/photo-${1500000000000 + productIndex}?w=200`,
              altText: productName,
              sortOrder: 0,
              isMain: true
            },
            {
              url: `https://images.unsplash.com/photo-${1500000000001 + productIndex}?w=800`,
              thumbnailUrl: `https://images.unsplash.com/photo-${1500000000001 + productIndex}?w=200`,
              altText: `${productName} view 2`,
              sortOrder: 1,
              isMain: false
            }
          ],
          tags: ['trending', 'bestseller', category.name.toLowerCase()],
          searchKeywords: [productName.toLowerCase(), category.name.toLowerCase(), 'sale'],
          status: 'active',
          visibility: randomNumber(0, 10) > 2 ? 'public' : 'featured',
          cashback: {
            percentage: randomNumber(5, 25),
            maxAmount: randomFloat(50, 500),
            isActive: true
          },
          ratings: {
            average: randomFloat(3.5, 5.0, 1),
            count: randomNumber(50, 500)
          },
          isFeatured: randomNumber(0, 10) > 7,
          slug: productName.toLowerCase().replace(/\s+/g, '-'),
          publishedAt: new Date(Date.now() - randomNumber(1, 90) * 24 * 60 * 60 * 1000)
        });

        productIndex++;
      }
    });
  });

  return products.slice(0, 30);
};

const generateOffers = (stores, products) => {
  const offers = [];
  const offerTitles = [
    'Mega Cashback Sale', 'Flash Deal', 'Weekend Special', 'Student Discount',
    'New Arrival Offer', 'Clearance Sale', 'Buy 1 Get 1', 'Festival Special',
    'Limited Time Offer', 'Early Bird Deal', 'Premium Member Exclusive',
    'Seasonal Sale', 'Hot Deal', 'Crazy Discount', 'Super Saver',
    'Daily Deal', 'Best Price Guarantee', 'Combo Offer', 'Bundle Deal', 'Special Promo'
  ];

  const categories = ['mega', 'student', 'new_arrival', 'trending', 'food', 'fashion', 'electronics', 'general'];
  const types = ['cashback', 'discount', 'voucher', 'combo'];

  for (let i = 0; i < 20; i++) {
    const store = randomElement(stores);
    const product = randomElement(products.filter(p => p.merchantId.toString() === store._id.toString()));
    const startDate = new Date();
    const endDate = new Date(Date.now() + randomNumber(7, 60) * 24 * 60 * 60 * 1000);

    offers.push({
      title: randomElement(offerTitles),
      subtitle: `Amazing ${randomNumber(10, 70)}% off on selected items`,
      description: 'Limited time offer. Don\'t miss out on this incredible deal!',
      image: `https://images.unsplash.com/photo-${1600000000000 + i}?w=800`,
      category: randomElement(categories),
      type: randomElement(types),
      cashbackPercentage: randomNumber(5, 50),
      originalPrice: product ? product.price : randomFloat(500, 5000),
      discountedPrice: product ? product.price * 0.7 : randomFloat(300, 3500),
      location: {
        type: 'Point',
        coordinates: [
          store.businessAddress.coordinates.longitude,
          store.businessAddress.coordinates.latitude
        ]
      },
      store: {
        id: store._id,
        name: store.businessName,
        logo: store.logo,
        rating: store.ratings?.average || 4.5,
        verified: true
      },
      validity: {
        startDate,
        endDate,
        isActive: true
      },
      engagement: {
        likesCount: randomNumber(10, 1000),
        sharesCount: randomNumber(5, 500),
        viewsCount: randomNumber(100, 5000)
      },
      restrictions: {
        minOrderValue: randomFloat(200, 1000),
        maxDiscountAmount: randomFloat(100, 500),
        usageLimitPerUser: randomNumber(1, 5),
        userTypeRestriction: 'all'
      },
      metadata: {
        isNew: i < 5,
        isTrending: i < 10,
        isBestSeller: randomNumber(0, 10) > 6,
        priority: randomNumber(1, 10),
        tags: ['sale', 'discount', 'cashback'],
        featured: i < 8
      },
      createdBy: store._id
    });
  }

  return offers;
};

const generateVideos = (stores, products, userId) => {
  const videos = [];
  const categories = ['trending_me', 'trending_her', 'waist', 'article', 'featured', 'tutorial', 'review'];
  const contentTypes = ['merchant', 'ugc', 'article_video'];

  const videoTitles = [
    'Product Unboxing and Review', 'How to Style This Season',
    'Top 5 Features You Must Know', 'Customer Experience Story',
    'Behind the Scenes', 'Product Comparison Guide',
    'Styling Tips and Tricks', 'Why This is Trending',
    'Expert Review', 'User Testimonial',
    'Product Demo', 'Fashion Lookbook',
    'Tech Review 2024', 'Must-Have Items',
    'Shopping Haul'
  ];

  for (let i = 0; i < 15; i++) {
    const store = randomElement(stores);
    const product = randomElement(products);
    const category = randomElement(categories);
    const contentType = randomElement(contentTypes);

    videos.push({
      title: randomElement(videoTitles),
      description: 'Check out this amazing product and share your thoughts!',
      creator: userId,
      contentType,
      videoUrl: `https://storage.cloudinary.com/video-${i + 1}.mp4`,
      thumbnail: `https://images.unsplash.com/photo-${1550000000000 + i}?w=800`,
      preview: `https://storage.cloudinary.com/preview-${i + 1}.mp4`,
      category,
      tags: ['trending', 'viral', 'mustwatch'],
      hashtags: ['#trending', '#viral', '#shopping'],
      products: [product._id],
      stores: [store._id],
      engagement: {
        views: randomNumber(100, 50000),
        likes: [],
        shares: randomNumber(10, 1000),
        comments: randomNumber(5, 500),
        saves: randomNumber(5, 200),
        reports: 0
      },
      metadata: {
        duration: randomNumber(15, 180),
        resolution: randomElement(['720p', '1080p']),
        format: 'mp4',
        aspectRatio: '9:16',
        fps: 30
      },
      processing: {
        status: 'completed',
        processedUrl: `https://storage.cloudinary.com/video-${i + 1}.mp4`,
        thumbnailUrl: `https://images.unsplash.com/photo-${1550000000000 + i}?w=800`
      },
      analytics: {
        totalViews: randomNumber(100, 50000),
        uniqueViews: randomNumber(80, 40000),
        avgWatchTime: randomNumber(10, 120),
        completionRate: randomFloat(40, 95),
        engagementRate: randomFloat(5, 30),
        viewsByHour: {},
        viewsByDate: {},
        deviceBreakdown: {
          mobile: randomNumber(60, 80),
          tablet: randomNumber(10, 20),
          desktop: randomNumber(10, 30)
        }
      },
      isPublished: true,
      isFeatured: i < 5,
      isApproved: true,
      isTrending: i < 8,
      moderationStatus: 'approved',
      privacy: 'public',
      allowComments: true,
      allowSharing: true,
      publishedAt: new Date(Date.now() - randomNumber(1, 30) * 24 * 60 * 60 * 1000)
    });
  }

  return videos;
};

const generateProjects = (stores, products, userId) => {
  const projects = [];
  const projectCategories = ['review', 'social_share', 'ugc_content', 'store_visit', 'survey', 'photo', 'video'];
  const types = ['video', 'photo', 'text', 'visit', 'rating', 'social'];

  const projectTitles = [
    'Review our latest product', 'Share on Social Media',
    'Create UGC Content', 'Visit our store',
    'Complete Survey', 'Upload Product Photos',
    'Create Video Review', 'Rate Your Experience',
    'Instagram Story Challenge', 'TikTok Video Contest'
  ];

  const descriptions = [
    'Help us promote our product and earn rewards',
    'Share your honest review and get cashback',
    'Create engaging content and win exciting prizes',
    'Visit our store and complete the checklist',
    'Share your feedback in this quick survey',
    'Upload creative photos of our products',
    'Make a video showcasing our products',
    'Rate your shopping experience',
    'Post on Instagram and tag us',
    'Create a viral TikTok video'
  ];

  for (let i = 0; i < 10; i++) {
    const store = randomElement(stores);
    const product = randomElement(products);
    const category = randomElement(projectCategories);
    const type = randomElement(types);

    projects.push({
      title: randomElement(projectTitles),
      description: randomElement(descriptions),
      shortDescription: 'Earn coins by completing this task',
      category,
      type,
      brand: store.businessName,
      sponsor: store._id,
      requirements: {
        minWords: type === 'text' ? randomNumber(50, 200) : undefined,
        minDuration: type === 'video' ? randomNumber(15, 60) : undefined,
        minPhotos: type === 'photo' ? randomNumber(1, 5) : undefined,
        deviceRequirements: {
          camera: ['photo', 'video'].includes(type),
          microphone: type === 'video',
          location: type === 'visit'
        }
      },
      reward: {
        amount: randomNumber(50, 500),
        currency: 'INR',
        type: 'fixed',
        bonusMultiplier: randomFloat(1, 2, 1),
        paymentMethod: 'wallet',
        paymentSchedule: 'daily'
      },
      limits: {
        maxCompletions: randomNumber(100, 1000),
        totalBudget: randomNumber(10000, 100000),
        maxCompletionsPerUser: randomNumber(1, 5),
        expiryDate: new Date(Date.now() + randomNumber(30, 90) * 24 * 60 * 60 * 1000)
      },
      instructions: [
        'Follow the guidelines carefully',
        'Submit original content only',
        'Meet all requirements for approval',
        'Submit before deadline'
      ],
      tags: ['earn', 'rewards', 'cashback'],
      difficulty: randomElement(['easy', 'medium', 'hard']),
      estimatedTime: randomNumber(5, 60),
      status: 'active',
      priority: randomElement(['low', 'medium', 'high']),
      submissions: [],
      analytics: {
        totalViews: randomNumber(100, 1000),
        totalApplications: randomNumber(50, 500),
        totalSubmissions: randomNumber(20, 200),
        approvedSubmissions: randomNumber(10, 150),
        rejectedSubmissions: randomNumber(0, 20),
        avgCompletionTime: randomFloat(10, 120),
        avgQualityScore: randomFloat(6, 9),
        totalPayout: randomNumber(1000, 50000),
        conversionRate: randomFloat(20, 80),
        approvalRate: randomFloat(60, 95),
        participantDemographics: {
          ageGroups: {},
          genderSplit: {},
          locationSplit: {}
        },
        dailyStats: []
      },
      isFeatured: i < 4,
      isSponsored: true,
      approvalRequired: true,
      qualityControl: {
        enabled: true,
        minScore: randomNumber(5, 8),
        manualReview: true,
        autoApprove: false
      },
      targetAudience: {
        size: randomNumber(100, 1000),
        demographics: 'All ages',
        interests: ['shopping', 'cashback', 'rewards']
      },
      createdBy: userId
    });
  }

  return projects;
};

// ==================== MAIN SEEDING FUNCTION ====================

const seedDatabase = async () => {
  try {
    console.log('\n🌱 Starting Database Seeding...\n');

    // Import models
    const { Category } = require('../src/models/Category');
    const { Merchant } = require('../src/models/Merchant');
    const { MProduct } = require('../src/models/MerchantProduct');
    const Offer = require('../src/models/Offer').default;
    const { Video } = require('../src/models/Video');
    const { Project } = require('../src/models/Project');

    // Summary counters
    const summary = {
      categories: 0,
      stores: 0,
      products: 0,
      offers: 0,
      videos: 0,
      projects: 0
    };

    // 1. SEED CATEGORIES
    console.log('📁 Seeding Categories...');
    const categories = generateCategories();
    const savedCategories = await Category.insertMany(categories);
    summary.categories = savedCategories.length;
    console.log(`✅ Created ${summary.categories} categories\n`);

    // 2. SEED STORES/MERCHANTS
    console.log('🏪 Seeding Stores...');
    const stores = generateStores(savedCategories);
    const savedStores = await Merchant.insertMany(stores);
    summary.stores = savedStores.length;
    console.log(`✅ Created ${summary.stores} stores\n`);

    // 3. SEED PRODUCTS
    console.log('📦 Seeding Products...');
    const products = generateProducts(savedStores, savedCategories);
    const savedProducts = await MProduct.insertMany(products);
    summary.products = savedProducts.length;
    console.log(`✅ Created ${summary.products} products\n`);

    // 4. SEED OFFERS
    console.log('🎁 Seeding Offers...');
    const offers = generateOffers(savedStores, savedProducts);
    const savedOffers = await Offer.insertMany(offers);
    summary.offers = savedOffers.length;
    console.log(`✅ Created ${summary.offers} offers\n`);

    // Create a dummy user ID for videos and projects
    const dummyUserId = new mongoose.Types.ObjectId();

    // 5. SEED VIDEOS (for Play Page)
    console.log('🎥 Seeding Videos...');
    const videos = generateVideos(savedStores, savedProducts, dummyUserId);
    const savedVideos = await Video.insertMany(videos);
    summary.videos = savedVideos.length;
    console.log(`✅ Created ${summary.videos} videos\n`);

    // 6. SEED PROJECTS (for Earn Page)
    console.log('💼 Seeding Projects...');
    const projects = generateProjects(savedStores, savedProducts, dummyUserId);
    const savedProjects = await Project.insertMany(projects);
    summary.projects = savedProjects.length;
    console.log(`✅ Created ${summary.projects} projects\n`);

    // ==================== SUMMARY ====================
    console.log('\n' + '='.repeat(60));
    console.log('✨ DATABASE SEEDING COMPLETED SUCCESSFULLY ✨');
    console.log('='.repeat(60));
    console.log('\n📊 SUMMARY:');
    console.log('─'.repeat(60));
    console.log(`📁 Categories:  ${summary.categories}`);
    console.log(`🏪 Stores:      ${summary.stores}`);
    console.log(`📦 Products:    ${summary.products}`);
    console.log(`🎁 Offers:      ${summary.offers}`);
    console.log(`🎥 Videos:      ${summary.videos}`);
    console.log(`💼 Projects:    ${summary.projects}`);
    console.log('─'.repeat(60));
    console.log(`📈 Total Records: ${Object.values(summary).reduce((a, b) => a + b, 0)}`);
    console.log('─'.repeat(60));

    console.log('\n📋 DATA RELATIONSHIPS:');
    console.log('  • Products are linked to Stores and Categories');
    console.log('  • Offers are linked to Stores and Products');
    console.log('  • Videos are linked to Stores and Products');
    console.log('  • Projects are linked to Stores');

    console.log('\n🎯 NEXT STEPS:');
    console.log('  1. Start your backend server: npm run dev');
    console.log('  2. Test API endpoints');
    console.log('  3. Check frontend integration');

    console.log('\n📝 API ENDPOINTS TO TEST:');
    console.log('  • GET /api/categories');
    console.log('  • GET /api/stores');
    console.log('  • GET /api/products');
    console.log('  • GET /api/offers');
    console.log('  • GET /api/videos');
    console.log('  • GET /api/projects');

    console.log('\n');

  } catch (error) {
    console.error('\n❌ SEEDING ERROR:', error);
    throw error;
  }
};

// ==================== EXECUTION ====================

const main = async () => {
  try {
    await connectDB();
    await seedDatabase();
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await disconnectDB();
    process.exit(0);
  }
};

// Run the script
if (require.main === module) {
  main();
}

module.exports = { seedDatabase };
