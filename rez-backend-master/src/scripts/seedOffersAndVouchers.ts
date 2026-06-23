import mongoose from 'mongoose';
import Offer from '../models/Offer';
import { VoucherBrand } from '../models/Voucher';
import { Category } from '../models/Category';
import { Store } from '../models/Store';

// Connect to database
const connectDB = async () => {
  try {
    require('dotenv').config();
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/rez-app';
    console.log('🔗 Connecting to:', mongoUri.includes('mongodb+srv') ? 'MongoDB Atlas Cloud' : 'Local MongoDB');

    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Seed Offers
const seedOffers = async (): Promise<void> => {
  try {
    console.log('\n📦 Seeding Offers...');

    // Get categories and stores for associations
    const categories = await Category.find().limit(5);
    const stores = await Store.find().limit(10);

    if (categories.length === 0) {
      console.log('⚠️  No categories found. Please seed categories first.');
      return;
    }

    if (stores.length === 0) {
      console.log('⚠️  No stores found. Please seed stores first.');
      return;
    }

    // Clear existing offers
    await Offer.deleteMany({});
    console.log('🗑️  Cleared existing offers');

    const offersData = [
      // Featured Offers
      {
        title: 'Flat 50% OFF on Electronics',
        description: 'Get flat 50% cashback on all electronics items. Maximum cashback ₹500.',
        image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400',
        cashBackPercentage: 50,
        category: categories[0]._id,
        store: stores[0]._id,
        originalPrice: 1999,
        discountedPrice: 999,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        isActive: true,
        isFeatured: true,
        isTrending: true,
        isNew: true,
        tags: ['electronics', 'cashback', 'featured'],
        storeInfo: {
          name: stores[0].name,
          rating: 4.5,
          verified: true
        },
        maxRedemptions: 1000,
        userRedemptionLimit: 1
      },
      {
        title: 'Buy 1 Get 1 Free on Fashion',
        description: 'Buy any fashion item and get another one absolutely free. Limited time offer.',
        image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400',
        cashBackPercentage: 40,
        category: categories[1]._id,
        store: stores[1]._id,
        startDate: new Date(),
        endDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days
        isActive: true,
        isFeatured: true,
        isTrending: true,
        tags: ['fashion', 'bogo', 'featured'],
        storeInfo: {
          name: stores[1]?.name || 'Fashion Store',
          rating: 4.3,
          verified: true
        },
        maxRedemptions: 500
      },
      {
        title: '₹200 OFF on First Order',
        description: 'Get ₹200 instant discount on your first order. Minimum order value ₹500.',
        image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=400',
        cashBackPercentage: 30,
        category: categories[2]._id,
        startDate: new Date(),
        endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
        isActive: true,
        isFeatured: true,
        isNew: true,
        tags: ['first-order', 'cashback', 'new-user'],
        maxRedemptions: 10000,
        userRedemptionLimit: 1
      },
      {
        title: '30% Cashback on Groceries',
        description: 'Shop for groceries and get 30% cashback. Maximum cashback ₹150.',
        image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400',
        cashBackPercentage: 30,
        category: categories[0]._id,
        store: stores[2]._id,
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        isActive: true,
        isTrending: true,
        tags: ['groceries', 'cashback', 'weekly'],
        storeInfo: {
          name: stores[2]?.name || 'Grocery Mart',
          rating: 4.6,
          verified: true
        },
        maxRedemptions: 2000
      },
      {
        title: 'Weekend Special - 25% OFF',
        description: 'Special weekend offer! Get 25% off on all products. Valid till Sunday.',
        image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400',
        cashBackPercentage: 25,
        category: categories[1]._id,
        startDate: new Date(),
        endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days
        isActive: true,
        isSpecial: true,
        isTrending: true,
        tags: ['weekend', 'special', 'limited-time'],
        maxRedemptions: 500
      },
      {
        title: 'Free Delivery on Orders Above ₹999',
        description: 'Shop worth ₹999 or more and get free home delivery.',
        image: 'https://images.unsplash.com/photo-1566576721346-d4a3b4eaeb55?w=400',
        cashBackPercentage: 15,
        category: categories[0]._id,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isActive: true,
        isBestSeller: true,
        tags: ['delivery', 'shipping', 'free'],
        maxRedemptions: 5000
      },
      {
        title: 'Super Saver - Up to 70% OFF',
        description: 'Massive discounts on selected items. Save up to 70% on your purchases.',
        image: 'https://images.unsplash.com/photo-1607082349566-187342175e2f?w=400',
        cashBackPercentage: 60,
        category: categories[2]._id,
        store: stores[3]._id,
        startDate: new Date(),
        endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        isActive: true,
        isFeatured: true,
        isBestSeller: true,
        tags: ['supersaver', 'discount', 'clearance'],
        storeInfo: {
          name: stores[3]?.name || 'Super Store',
          rating: 4.4,
          verified: true
        },
        maxRedemptions: 1000
      },
      {
        title: 'Flat ₹100 Cashback on Electronics',
        description: 'Buy any electronic item and get flat ₹100 cashback instantly.',
        image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400',
        cashBackPercentage: 20,
        category: categories[0]._id,
        startDate: new Date(),
        endDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
        isActive: true,
        isNew: true,
        tags: ['electronics', 'cashback', 'instant'],
        maxRedemptions: 3000
      }
    ];

    const offers = await Offer.insertMany(offersData);
    console.log(`✅ Created ${offers.length} offers`);
  } catch (error) {
    console.error('❌ Error seeding offers:', error);
    throw error;
  }
};

// Seed Voucher Brands
const seedVoucherBrands = async () => {
  try {
    console.log('\n🎟️  Seeding Voucher Brands...');

    // Clear existing voucher brands
    await VoucherBrand.deleteMany({});
    console.log('🗑️  Cleared existing voucher brands');

    const voucherBrandsData = [
      // Featured Brands
      {
        name: 'Amazon',
        logo: '🛒',
        backgroundColor: '#FF9900',
        logoColor: '#FFFFFF',
        description: 'Shop from millions of products across all categories',
        cashbackRate: 5,
        rating: 4.8,
        ratingCount: 15234,
        category: 'shopping',
        isNewlyAdded: false,
        isFeatured: true,
        isActive: true,
        denominations: [100, 250, 500, 1000, 2000, 5000],
        termsAndConditions: [
          'Valid for 1 year from date of purchase',
          'Non-refundable and cannot be exchanged for cash',
          'Multiple vouchers can be used in single transaction',
          'Check Amazon website for participating products'
        ],
        purchaseCount: 5432,
        viewCount: 25678
      },
      {
        name: 'Flipkart',
        logo: '🛍️',
        backgroundColor: '#2874F0',
        logoColor: '#FFFFFF',
        description: 'Get vouchers for India\'s leading e-commerce platform',
        cashbackRate: 4,
        rating: 4.7,
        ratingCount: 12456,
        category: 'shopping',
        isNewlyAdded: false,
        isFeatured: true,
        isActive: true,
        denominations: [100, 250, 500, 1000, 2000, 5000],
        termsAndConditions: [
          'Valid for 1 year from purchase date',
          'Can be used on all products except gold coins',
          'Non-transferable and non-refundable'
        ],
        purchaseCount: 4521,
        viewCount: 21345
      },
      {
        name: 'Myntra',
        logo: '👗',
        backgroundColor: '#FF3F6C',
        logoColor: '#FFFFFF',
        description: 'Fashion and lifestyle shopping made easy',
        cashbackRate: 6,
        rating: 4.6,
        ratingCount: 8934,
        category: 'fashion',
        isNewlyAdded: false,
        isFeatured: true,
        isActive: true,
        denominations: [250, 500, 1000, 2000, 3000],
        termsAndConditions: [
          'Valid for 6 months from purchase',
          'Applicable on all fashion items',
          'Cannot be clubbed with other offers'
        ],
        purchaseCount: 3421,
        viewCount: 18234
      },
      {
        name: 'Zomato',
        logo: '🍔',
        backgroundColor: '#E23744',
        logoColor: '#FFFFFF',
        description: 'Order food from your favorite restaurants',
        cashbackRate: 8,
        rating: 4.5,
        ratingCount: 11234,
        category: 'food',
        isNewlyAdded: true,
        isFeatured: true,
        isActive: true,
        denominations: [100, 200, 500, 1000],
        termsAndConditions: [
          'Valid for 3 months from purchase',
          'Applicable on food orders only',
          'Minimum order value may apply'
        ],
        purchaseCount: 2876,
        viewCount: 15432
      },
      {
        name: 'Swiggy',
        logo: '🍕',
        backgroundColor: '#FC8019',
        logoColor: '#FFFFFF',
        description: 'Get food delivered to your doorstep',
        cashbackRate: 7,
        rating: 4.5,
        ratingCount: 10567,
        category: 'food',
        isNewlyAdded: true,
        isFeatured: true,
        isActive: true,
        denominations: [100, 200, 500, 1000],
        termsAndConditions: [
          'Valid for 3 months',
          'Can be used for food and grocery',
          'Not applicable on Swiggy One membership'
        ],
        purchaseCount: 2654,
        viewCount: 14321
      },
      {
        name: 'BookMyShow',
        logo: '🎬',
        backgroundColor: '#C4242B',
        logoColor: '#FFFFFF',
        description: 'Book movie tickets and entertainment events',
        cashbackRate: 10,
        rating: 4.4,
        ratingCount: 7890,
        category: 'entertainment',
        isNewlyAdded: false,
        isFeatured: false,
        isActive: true,
        denominations: [100, 200, 500, 1000],
        termsAndConditions: [
          'Valid for 6 months',
          'Applicable on movie tickets and events',
          'Convenience fee may apply'
        ],
        purchaseCount: 1987,
        viewCount: 9876
      },
      {
        name: 'MakeMyTrip',
        logo: '✈️',
        backgroundColor: '#E7312A',
        logoColor: '#FFFFFF',
        description: 'Book flights, hotels, and holiday packages',
        cashbackRate: 5,
        rating: 4.3,
        ratingCount: 6543,
        category: 'travel',
        isNewlyAdded: false,
        isFeatured: false,
        isActive: true,
        denominations: [500, 1000, 2000, 5000],
        termsAndConditions: [
          'Valid for 1 year',
          'Applicable on domestic bookings only',
          'Cannot be used during sale periods'
        ],
        purchaseCount: 1543,
        viewCount: 8765
      },
      {
        name: 'Nykaa',
        logo: '💄',
        backgroundColor: '#FC2779',
        logoColor: '#FFFFFF',
        description: 'Beauty and wellness products for everyone',
        cashbackRate: 7,
        rating: 4.6,
        ratingCount: 9876,
        category: 'beauty',
        isNewlyAdded: true,
        isFeatured: false,
        isActive: true,
        denominations: [250, 500, 1000, 2000],
        termsAndConditions: [
          'Valid for 6 months',
          'Applicable on all beauty products',
          'Check for brand exclusions'
        ],
        purchaseCount: 2134,
        viewCount: 11234
      },
      {
        name: 'BigBasket',
        logo: '🛒',
        backgroundColor: '#84C241',
        logoColor: '#FFFFFF',
        description: 'Order groceries and daily essentials online',
        cashbackRate: 4,
        rating: 4.5,
        ratingCount: 8765,
        category: 'grocery',
        isNewlyAdded: false,
        isFeatured: false,
        isActive: true,
        denominations: [200, 500, 1000, 2000],
        termsAndConditions: [
          'Valid for 3 months',
          'Minimum order value ₹500',
          'Delivery charges may apply'
        ],
        purchaseCount: 1876,
        viewCount: 10234
      },
      {
        name: 'Croma',
        logo: '📱',
        backgroundColor: '#0C831F',
        logoColor: '#FFFFFF',
        description: 'Electronics and appliances for every need',
        cashbackRate: 3,
        rating: 4.4,
        ratingCount: 5432,
        category: 'electronics',
        isNewlyAdded: false,
        isFeatured: false,
        isActive: true,
        denominations: [500, 1000, 2000, 5000, 10000],
        termsAndConditions: [
          'Valid for 1 year',
          'Applicable in-store and online',
          'Check for product exclusions'
        ],
        purchaseCount: 987,
        viewCount: 6543
      },
      {
        name: 'Decathlon',
        logo: '⚽',
        backgroundColor: '#0082C3',
        logoColor: '#FFFFFF',
        description: 'Sports gear and equipment for all sports',
        cashbackRate: 5,
        rating: 4.6,
        ratingCount: 6789,
        category: 'sports',
        isNewlyAdded: true,
        isFeatured: false,
        isActive: true,
        denominations: [500, 1000, 2000, 5000],
        termsAndConditions: [
          'Valid for 1 year',
          'Can be used at all Decathlon stores',
          'Online redemption available'
        ],
        purchaseCount: 1234,
        viewCount: 7890
      },
      {
        name: 'Dominos',
        logo: '🍕',
        backgroundColor: '#0066A1',
        logoColor: '#FFFFFF',
        description: 'Order your favorite pizzas and sides',
        cashbackRate: 10,
        rating: 4.3,
        ratingCount: 9876,
        category: 'food',
        isNewlyAdded: false,
        isFeatured: false,
        isActive: true,
        denominations: [100, 200, 500],
        termsAndConditions: [
          'Valid for 2 months',
          'Applicable at all outlets',
          'Cannot be used with other vouchers'
        ],
        purchaseCount: 2456,
        viewCount: 13456
      }
    ];

    const brands = await VoucherBrand.insertMany(voucherBrandsData);
    console.log(`✅ Created ${brands.length} voucher brands`);

    return brands;
  } catch (error) {
    console.error('❌ Error seeding voucher brands:', error);
    throw error;
  }
};

// Main seed function
const seedAll = async () => {
  try {
    console.log('🌱 Starting Offers & Vouchers Seeding Process...\n');

    await connectDB();

    await seedOffers();
    await seedVoucherBrands();

    console.log('\n✨ Seeding completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - Offers: Complete`);
    console.log(`   - Voucher Brands: Complete`);
    console.log('\n🎉 Database is ready for Phase 4 testing!');

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

// Run the seeder
if (require.main === module) {
  seedAll();
}

export { seedOffers, seedVoucherBrands, seedAll };