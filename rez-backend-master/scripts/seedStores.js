const mongoose = require('mongoose');
require('dotenv').config();

// Store schema (simplified for seeding)
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

async function seedStores() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/test');
    console.log('Connected to MongoDB');

    // Clear existing stores
    await Store.deleteMany({});
    console.log('Cleared existing stores');

    // Create test stores
    const stores = [
      {
        name: 'Fast Food Express',
        slug: 'fast-food-express',
        description: 'Quick and delicious fast food delivery',
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
        location: {
          address: '456 Park Avenue',
          city: 'Bangalore',
          state: 'Karnataka',
          pincode: '560002',
          coordinates: [77.63288487205235, 12.940389422290512],
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
      {
        name: 'Organic Fresh',
        slug: 'organic-fresh',
        description: 'Fresh organic produce and healthy meals',
        location: {
          address: '789 Green Street',
          city: 'Bangalore',
          state: 'Karnataka',
          pincode: '560003',
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
        }
      },
      {
        name: 'Budget Bites',
        slug: 'budget-bites',
        description: 'Affordable meals for everyone',
        location: {
          address: '321 Economy Lane',
          city: 'Bangalore',
          state: 'Karnataka',
          pincode: '560004',
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
        }
      },
      {
        name: 'Alliance Store',
        slug: 'alliance-store',
        description: 'Partner store with exclusive deals',
        location: {
          address: '654 Partnership Road',
          city: 'Bangalore',
          state: 'Karnataka',
          pincode: '560005',
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
        }
      }
    ];

    await Store.insertMany(stores);
    console.log(`Created ${stores.length} test stores`);

    // Verify stores were created
    const count = await Store.countDocuments();
    console.log(`Total stores in database: ${count}`);

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

seedStores();
