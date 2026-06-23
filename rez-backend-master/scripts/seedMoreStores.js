const mongoose = require('mongoose');
require('dotenv').config();

// Store schema (matching existing)
const StoreSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  description: String,
  logo: String,
  location: {
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: String,
    pincode: String,
    coordinates: { type: [Number], required: true },
    deliveryRadius: { type: Number, default: 5 }
  },
  contact: {
    phone: String,
    email: String
  },
  ratings: {
    average: { type: Number, default: 0 },
    count: { type: Number, default: 0 },
    distribution: {
      1: { type: Number, default: 0 },
      2: { type: Number, default: 0 },
      3: { type: Number, default: 0 },
      4: { type: Number, default: 0 },
      5: { type: Number, default: 0 }
    }
  },
  deliveryCategories: {
    fastDelivery: { type: Boolean, default: false },
    budgetFriendly: { type: Boolean, default: false },
    premium: { type: Boolean, default: false },
    organic: { type: Boolean, default: false },
    alliance: { type: Boolean, default: false },
    lowestPrice: { type: Boolean, default: false },
    mall: { type: Boolean, default: false },
    cashStore: { type: Boolean, default: false }
  },
  operationalInfo: {
    hours: {
      monday: { open: String, close: String, closed: { type: Boolean, default: false } },
      tuesday: { open: String, close: String, closed: { type: Boolean, default: false } },
      wednesday: { open: String, close: String, closed: { type: Boolean, default: false } },
      thursday: { open: String, close: String, closed: { type: Boolean, default: false } },
      friday: { open: String, close: String, closed: { type: Boolean, default: false } },
      saturday: { open: String, close: String, closed: { type: Boolean, default: false } },
      sunday: { open: String, close: String, closed: { type: Boolean, default: false } }
    },
    deliveryTime: { type: String, default: '30-45 mins' },
    minimumOrder: { type: Number, default: 0 },
    deliveryFee: { type: Number, default: 0 }
  },
  isActive: { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false },
  isVerified: { type: Boolean, default: true }
}, { timestamps: true });

const Store = mongoose.model('Store', StoreSchema);

async function seedMoreStores() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/test');
    console.log('Connected to MongoDB');

    // Clear existing stores
    await Store.deleteMany({});
    console.log('Cleared existing stores');

    // Create comprehensive store data
    const stores = [
      // Fast Food & Restaurants
      {
        name: 'Fast Food Express',
        slug: 'fast-food-express',
        description: 'Quick and delicious fast food delivery',
        logo: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=100',
        location: {
          address: '123 Main Street',
          city: 'Bangalore',
          state: 'Karnataka',
          pincode: '560001',
          coordinates: [77.62288487205235, 12.930389422290512],
          deliveryRadius: 10
        },
        contact: {
          phone: '+91-9876543210',
          email: 'info@fastfoodexpress.com'
        },
        ratings: {
          average: 4.2,
          count: 150,
          distribution: { 1: 5, 2: 10, 3: 25, 4: 60, 5: 50 }
        },
        deliveryCategories: {
          fastDelivery: true,
          budgetFriendly: true
        },
        operationalInfo: {
          deliveryTime: '20-30 mins'
        },
        isFeatured: true
      },
      {
        name: 'Premium Restaurant',
        slug: 'premium-restaurant',
        description: 'Fine dining experience at your doorstep',
        logo: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=100',
        location: {
          address: '456 Park Avenue',
          city: 'Bangalore',
          state: 'Karnataka',
          pincode: '560002',
          coordinates: [77.63288487205234, 12.940389422290512],
          deliveryRadius: 15
        },
        contact: {
          phone: '+91-9876543211',
          email: 'info@premiumrestaurant.com'
        },
        ratings: {
          average: 4.8,
          count: 89,
          distribution: { 1: 1, 2: 2, 3: 8, 4: 28, 5: 50 }
        },
        deliveryCategories: {
          premium: true
        },
        operationalInfo: {
          deliveryTime: '45-60 mins'
        },
        isFeatured: true
      },

      // Electronics & Tech
      {
        name: 'TechZone Electronics',
        slug: 'techzone-electronics',
        description: 'Latest gadgets and electronics at best prices',
        logo: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=100',
        location: {
          address: '789 Tech Street',
          city: 'Bangalore',
          state: 'Karnataka',
          pincode: '560003',
          coordinates: [77.61288487205235, 12.920389422290512],
          deliveryRadius: 12
        },
        contact: {
          phone: '+91-9876543215',
          email: 'info@techzone.com'
        },
        ratings: {
          average: 4.6,
          count: 178,
          distribution: { 1: 3, 2: 8, 3: 22, 4: 65, 5: 80 }
        },
        deliveryCategories: {
          fastDelivery: true,
          premium: true
        },
        operationalInfo: {
          deliveryTime: '30-45 mins'
        },
        isFeatured: true
      },

      // Fashion & Clothing
      {
        name: 'Fashion Hub',
        slug: 'fashion-hub',
        description: 'Trendy clothes and accessories for all',
        logo: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=100',
        location: {
          address: '321 Style Avenue',
          city: 'Bangalore',
          state: 'Karnataka',
          pincode: '560004',
          coordinates: [77.64288487205235, 12.950389422290512],
          deliveryRadius: 18
        },
        contact: {
          phone: '+91-9876543216',
          email: 'info@fashionhub.com'
        },
        ratings: {
          average: 4.4,
          count: 267,
          distribution: { 1: 8, 2: 15, 3: 35, 4: 89, 5: 120 }
        },
        deliveryCategories: {
          budgetFriendly: true,
          fastDelivery: true
        },
        operationalInfo: {
          deliveryTime: '25-40 mins'
        },
        isFeatured: true
      },

      // Books & Education
      {
        name: 'BookWorld',
        slug: 'bookworld',
        description: 'Largest collection of books and educational materials',
        logo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100',
        location: {
          address: '654 Knowledge Lane',
          city: 'Bangalore',
          state: 'Karnataka',
          pincode: '560005',
          coordinates: [77.60288487205235, 12.910389422290512],
          deliveryRadius: 25
        },
        contact: {
          phone: '+91-9876543217',
          email: 'info@bookworld.com'
        },
        ratings: {
          average: 4.7,
          count: 156,
          distribution: { 1: 2, 2: 5, 3: 18, 4: 51, 5: 80 }
        },
        deliveryCategories: {
          organic: true,
          budgetFriendly: true
        },
        operationalInfo: {
          deliveryTime: '40-60 mins'
        },
        isFeatured: true
      },

      // Sports & Fitness
      {
        name: 'FitLife Sports',
        slug: 'fitlife-sports',
        description: 'Complete fitness and sports equipment store',
        logo: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=100',
        location: {
          address: '987 Fitness Road',
          city: 'Bangalore',
          state: 'Karnataka',
          pincode: '560006',
          coordinates: [77.65288487205235, 12.960389422290512],
          deliveryRadius: 15
        },
        contact: {
          phone: '+91-9876543218',
          email: 'info@fitlifesports.com'
        },
        ratings: {
          average: 4.5,
          count: 134,
          distribution: { 1: 3, 2: 8, 3: 25, 4: 48, 5: 50 }
        },
        deliveryCategories: {
          premium: true,
          alliance: true
        },
        operationalInfo: {
          deliveryTime: '35-50 mins'
        },
        isFeatured: true
      },

      // Home & Kitchen
      {
        name: 'Home Essentials',
        slug: 'home-essentials',
        description: 'Everything for your home and kitchen needs',
        logo: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=100',
        location: {
          address: '147 Home Street',
          city: 'Bangalore',
          state: 'Karnataka',
          pincode: '560007',
          coordinates: [77.66288487205235, 12.970389422290512],
          deliveryRadius: 20
        },
        contact: {
          phone: '+91-9876543219',
          email: 'info@homeessentials.com'
        },
        ratings: {
          average: 4.3,
          count: 201,
          distribution: { 1: 5, 2: 12, 3: 38, 4: 76, 5: 70 }
        },
        deliveryCategories: {
          budgetFriendly: true,
          lowestPrice: true
        },
        operationalInfo: {
          deliveryTime: '30-50 mins'
        },
        isFeatured: true
      },

      // Additional stores for variety
      {
        name: 'Organic Fresh',
        slug: 'organic-fresh',
        description: 'Fresh organic produce and healthy meals',
        logo: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=100',
        location: {
          address: '789 Green Street',
          city: 'Bangalore',
          state: 'Karnataka',
          pincode: '560008',
          coordinates: [77.61288487205235, 12.920389422290512],
          deliveryRadius: 12
        },
        contact: {
          phone: '+91-9876543212',
          email: 'info@organicfresh.com'
        },
        ratings: {
          average: 4.5,
          count: 67,
          distribution: { 1: 2, 2: 3, 3: 12, 4: 25, 5: 25 }
        },
        deliveryCategories: {
          organic: true,
          fastDelivery: true
        },
        operationalInfo: {
          deliveryTime: '25-35 mins'
        },
        isFeatured: false // Mix of featured and non-featured
      },

      {
        name: 'Budget Bites',
        slug: 'budget-bites',
        description: 'Affordable meals for everyone',
        logo: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=100',
        location: {
          address: '321 Economy Lane',
          city: 'Bangalore',
          state: 'Karnataka',
          pincode: '560009',
          coordinates: [77.64288487205235, 12.950389422290512],
          deliveryRadius: 8
        },
        contact: {
          phone: '+91-9876543213',
          email: 'info@budgetbites.com'
        },
        ratings: {
          average: 3.8,
          count: 203,
          distribution: { 1: 15, 2: 25, 3: 50, 4: 70, 5: 43 }
        },
        deliveryCategories: {
          budgetFriendly: true,
          lowestPrice: true
        },
        operationalInfo: {
          deliveryTime: '30-40 mins'
        },
        isFeatured: false
      },

      {
        name: 'Alliance Store',
        slug: 'alliance-store',
        description: 'Partner store with exclusive deals',
        logo: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=100',
        location: {
          address: '654 Partnership Road',
          city: 'Bangalore',
          state: 'Karnataka',
          pincode: '560010',
          coordinates: [77.60288487205235, 12.910389422290512],
          deliveryRadius: 20
        },
        contact: {
          phone: '+91-9876543214',
          email: 'info@alliancestore.com'
        },
        ratings: {
          average: 4.3,
          count: 112,
          distribution: { 1: 3, 2: 7, 3: 20, 4: 45, 5: 37 }
        },
        deliveryCategories: {
          alliance: true,
          fastDelivery: true
        },
        operationalInfo: {
          deliveryTime: '20-30 mins'
        },
        isFeatured: false
      }
    ];

    await Store.insertMany(stores);
    console.log(`Created ${stores.length} test stores`);

    // Verify stores were created
    const count = await Store.countDocuments();
    console.log(`Total stores in database: ${count}`);

    // Check featured stores
    const featuredStores = await Store.countDocuments({ isFeatured: true });
    console.log(`Featured stores: ${featuredStores}`);

    // Check fastDelivery stores
    const fastDeliveryStores = await Store.countDocuments({ 'deliveryCategories.fastDelivery': true });
    console.log(`Fast delivery stores: ${fastDeliveryStores}`);

    console.log('Store seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding stores:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

seedMoreStores();