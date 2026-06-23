// Comprehensive seed script for vouchers linked to stores
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { VoucherBrand } from '../models/Voucher';
import { Store } from '../models/Store';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/test';
const DB_NAME = process.env.DB_NAME || 'test';

async function seedVouchersWithStores() {
  try {
    console.log('🌱 Starting Voucher Seeding with Store Links...\n');
    console.log(`📡 Connecting to database: ${DB_NAME}`);
    
    // Connect to MongoDB - use the URI as is, or construct it properly
    let connectionUri = MONGODB_URI;
    
    // If URI doesn't include database name, append it
    if (!connectionUri.includes('/?') && !connectionUri.match(/\/[\w-]+\?/)) {
      // Check if URI already has a database name
      const uriParts = connectionUri.split('/');
      const lastPart = uriParts[uriParts.length - 1];
      
      // If last part is empty or doesn't contain query params, add database name
      if (!lastPart.includes('?') && !lastPart.match(/^[\w-]+$/)) {
        if (connectionUri.endsWith('/')) {
          connectionUri = connectionUri + DB_NAME;
        } else {
          connectionUri = connectionUri + '/' + DB_NAME;
        }
      }
    }
    
    await mongoose.connect(connectionUri);
    console.log('✅ Connected to MongoDB\n');

    // Get existing stores
    console.log('🏪 Fetching existing stores...');
    const stores = await Store.find({ isActive: true }).select('_id name slug category location');
    console.log(`✅ Found ${stores.length} active stores\n`);

    if (stores.length === 0) {
      console.log('⚠️  No stores found. Please seed stores first.');
      await mongoose.disconnect();
      process.exit(1);
    }

    // Categorize stores by type - more comprehensive matching
    const storeByCategory: { [key: string]: typeof stores } = {
      fashion: stores.filter(s => {
        const name = s.name.toLowerCase();
        return name.includes('fashion') || name.includes('clothing') || name.includes('apparel') || 
               name.includes('style') || name.includes('boutique');
      }),
      food: stores.filter(s => {
        const name = s.name.toLowerCase();
        return name.includes('food') || name.includes('restaurant') || name.includes('cafe') || 
               name.includes('restaurant') || name.includes('dining');
      }),
      grocery: stores.filter(s => {
        const name = s.name.toLowerCase();
        return name.includes('grocery') || name.includes('mart') || name.includes('supermarket') || 
               name.includes('store') || name.includes('market');
      }),
      groceries: stores.filter(s => {
        const name = s.name.toLowerCase();
        return name.includes('grocery') || name.includes('mart') || name.includes('supermarket') || 
               name.includes('store') || name.includes('market');
      }),
      electronics: stores.filter(s => {
        const name = s.name.toLowerCase();
        return name.includes('tech') || name.includes('electronics') || name.includes('digital') || 
               name.includes('mobile') || name.includes('phone');
      }),
      beauty: stores.filter(s => {
        const name = s.name.toLowerCase();
        return name.includes('beauty') || name.includes('cosmetic') || name.includes('salon') || 
               name.includes('spa');
      }),
      entertainment: stores.filter(s => {
        const name = s.name.toLowerCase();
        return name.includes('entertainment') || name.includes('movie') || name.includes('cinema') || 
               name.includes('theater') || name.includes('theatre');
      }),
    };

    // Comprehensive voucher brands data with store links
    const voucherBrandsData = [
      // Fashion vouchers
      {
        name: 'Myntra',
        logo: '👗',
        backgroundColor: '#F26A2D',
        logoColor: '#FFFFFF',
        description: 'Shop fashion and lifestyle products',
        cashbackRate: 11,
        rating: 4.4,
        ratingCount: 13456,
        category: 'fashion',
        isNewlyAdded: true,
        isFeatured: true,
        isActive: true,
        denominations: [100, 250, 500, 1000, 2000],
        termsAndConditions: [
          'Valid for 6 months from date of purchase',
          'Can be used multiple times until balance is exhausted',
          'Non-refundable',
          'Valid on Myntra app and website',
          'Cannot be used during EORS sale'
        ],
        purchaseCount: 1678,
        viewCount: 8901,
        store: storeByCategory.fashion[0]?._id || stores[0]?._id,
      },
      {
        name: 'AJIO',
        logo: '👕',
        backgroundColor: '#000000',
        logoColor: '#FFFFFF',
        description: 'Fashion destination for trendy clothing',
        cashbackRate: 10,
        rating: 4.5,
        ratingCount: 10234,
        category: 'fashion',
        isNewlyAdded: false,
        isFeatured: true,
        isActive: true,
        denominations: [250, 500, 1000, 2000],
        termsAndConditions: [
          'Valid for 6 months',
          'Applicable on all fashion items',
          'Non-refundable'
        ],
        purchaseCount: 1234,
        viewCount: 5432,
        store: storeByCategory.fashion[1]?._id || stores[0]?._id,
      },
      {
        name: 'Zara',
        logo: '🧥',
        backgroundColor: '#E6E6E6',
        logoColor: '#000000',
        description: 'Fast fashion brand for modern lifestyle',
        cashbackRate: 8,
        rating: 4.6,
        ratingCount: 8765,
        category: 'fashion',
        isNewlyAdded: false,
        isFeatured: false,
        isActive: true,
        denominations: [500, 1000, 2000, 5000],
        termsAndConditions: [
          'Valid for 12 months',
          'Applicable at all Zara stores and online',
          'Non-transferable'
        ],
        purchaseCount: 987,
        viewCount: 4321,
        store: storeByCategory.fashion[0]?._id || stores[0]?._id,
      },
      {
        name: 'H&M',
        logo: '🏷️',
        backgroundColor: '#FF6B6B',
        logoColor: '#FFFFFF',
        description: 'Affordable fashion for everyone',
        cashbackRate: 9,
        rating: 4.3,
        ratingCount: 7654,
        category: 'fashion',
        isNewlyAdded: true,
        isFeatured: false,
        isActive: true,
        denominations: [250, 500, 1000, 2000],
        termsAndConditions: [
          'Valid for 6 months',
          'Can be used multiple times',
          'Non-refundable'
        ],
        purchaseCount: 876,
        viewCount: 3456,
        store: storeByCategory.fashion[1]?._id || stores[0]?._id,
      },

      // Food & Delivery vouchers
      {
        name: 'Zomato',
        logo: '🍔',
        backgroundColor: '#E23744',
        logoColor: '#FFFFFF',
        description: 'Order food online from your favorite restaurants',
        cashbackRate: 10,
        rating: 4.3,
        ratingCount: 15420,
        category: 'food',
        isNewlyAdded: true,
        isFeatured: true,
        isActive: true,
        denominations: [100, 200, 500, 1000, 2000],
        termsAndConditions: [
          'Valid for 6 months from date of purchase',
          'Can be used multiple times until balance is exhausted',
          'Non-refundable and cannot be exchanged for cash',
          'Valid on Zomato app and website',
          'Cannot be clubbed with other offers'
        ],
        purchaseCount: 892,
        viewCount: 4521,
        store: storeByCategory.food[0]?._id || stores[0]?._id,
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
        viewCount: 14321,
        store: storeByCategory.food[1]?._id || stores[0]?._id,
      },
      {
        name: 'Dominos',
        logo: '🍕',
        backgroundColor: '#0078AE',
        logoColor: '#FFFFFF',
        description: 'Get delicious pizzas delivered to your doorstep',
        cashbackRate: 8,
        rating: 4.1,
        ratingCount: 8765,
        category: 'food',
        isNewlyAdded: false,
        isFeatured: true,
        isActive: true,
        denominations: [100, 250, 500, 1000],
        termsAndConditions: [
          'Valid for 3 months from date of purchase',
          'Can be used multiple times until balance is exhausted',
          'Non-refundable and non-transferable',
          'Valid at all Dominos outlets',
          'Not valid on combo offers'
        ],
        purchaseCount: 654,
        viewCount: 3210,
        store: storeByCategory.food[2]?._id || stores[0]?._id,
      },
      {
        name: 'KFC',
        logo: '🍗',
        backgroundColor: '#E4002B',
        logoColor: '#FFFFFF',
        description: 'Finger lickin\' good',
        cashbackRate: 9,
        rating: 4.2,
        ratingCount: 9876,
        category: 'food',
        isNewlyAdded: false,
        isFeatured: false,
        isActive: true,
        denominations: [200, 500, 1000],
        termsAndConditions: [
          'Valid for 2 months',
          'Applicable at all KFC outlets',
          'Cannot be used with other offers'
        ],
        purchaseCount: 543,
        viewCount: 2876,
        store: storeByCategory.food[3]?._id || stores[0]?._id,
      },

      // Grocery vouchers
      {
        name: 'BigBasket',
        logo: '🛒',
        backgroundColor: '#84C225',
        logoColor: '#FFFFFF',
        description: 'Order groceries and essentials online',
        cashbackRate: 7,
        rating: 4.0,
        ratingCount: 6543,
        category: 'grocery',
        isNewlyAdded: false,
        isFeatured: false,
        isActive: true,
        denominations: [100, 200, 500, 1000],
        termsAndConditions: [
          'Valid for 3 months from date of purchase',
          'Can be used multiple times until balance is exhausted',
          'Non-refundable',
          'Valid on BigBasket app and website',
          'Minimum order value may apply'
        ],
        purchaseCount: 789,
        viewCount: 3456,
        store: storeByCategory.grocery[0]?._id || stores[0]?._id,
      },
      {
        name: 'Zepto',
        logo: '⚡',
        backgroundColor: '#7C3AED',
        logoColor: '#FFFFFF',
        description: '10-minute grocery delivery',
        cashbackRate: 12,
        rating: 4.7,
        ratingCount: 15234,
        category: 'grocery',
        isNewlyAdded: true,
        isFeatured: true,
        isActive: true,
        denominations: [200, 500, 1000, 2000],
        termsAndConditions: [
          'Valid for 3 months',
          'Fastest grocery delivery',
          'Non-refundable'
        ],
        purchaseCount: 1876,
        viewCount: 9234,
        store: storeByCategory.grocery[1]?._id || stores[0]?._id,
      },
      {
        name: 'Blinkit',
        logo: '⚡',
        backgroundColor: '#00D9FF',
        logoColor: '#FFFFFF',
        description: 'Quick grocery delivery in minutes',
        cashbackRate: 8,
        rating: 4.6,
        ratingCount: 11234,
        category: 'grocery',
        isNewlyAdded: true,
        isFeatured: false,
        isActive: true,
        denominations: [200, 500, 1000],
        termsAndConditions: [
          'Valid for 2 months',
          '10-minute delivery guarantee',
          'Non-refundable'
        ],
        purchaseCount: 1543,
        viewCount: 6543,
        store: storeByCategory.grocery[0]?._id || stores[0]?._id,
      },

      // E-commerce vouchers
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
        viewCount: 25678,
        // No specific store - Amazon is online only
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
        viewCount: 21345,
        // No specific store - Flipkart is online only
      },

      // Beauty vouchers
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
        isFeatured: true,
        isActive: true,
        denominations: [250, 500, 1000, 2000],
        termsAndConditions: [
          'Valid for 6 months',
          'Applicable on all beauty products',
          'Check for brand exclusions'
        ],
        purchaseCount: 2134,
        viewCount: 11234,
        store: storeByCategory.beauty[0]?._id || stores[0]?._id,
      },
      {
        name: 'Sephora',
        logo: '💋',
        backgroundColor: '#000000',
        logoColor: '#FFFFFF',
        description: 'Luxury beauty products and cosmetics',
        cashbackRate: 6,
        rating: 4.7,
        ratingCount: 8765,
        category: 'beauty',
        isNewlyAdded: false,
        isFeatured: false,
        isActive: true,
        denominations: [500, 1000, 2000, 5000],
        termsAndConditions: [
          'Valid for 12 months',
          'Applicable at all Sephora stores and online',
          'Non-transferable'
        ],
        purchaseCount: 987,
        viewCount: 4321,
        store: storeByCategory.beauty[0]?._id || stores[0]?._id,
      },

      // Electronics vouchers
      {
        name: 'Croma',
        logo: '📱',
        backgroundColor: '#69BE28',
        logoColor: '#FFFFFF',
        description: 'Shop electronics and appliances',
        cashbackRate: 9,
        rating: 4.1,
        ratingCount: 7890,
        category: 'electronics',
        isNewlyAdded: false,
        isFeatured: true,
        isActive: true,
        denominations: [500, 1000, 2000, 5000],
        termsAndConditions: [
          'Valid for 12 months from date of purchase',
          'Can be used multiple times until balance is exhausted',
          'Non-refundable',
          'Valid at all Croma stores and online',
          'Not valid on Apple products'
        ],
        purchaseCount: 432,
        viewCount: 2345,
        store: storeByCategory.electronics[0]?._id || stores[0]?._id,
      },
      {
        name: 'Reliance Digital',
        logo: '📺',
        backgroundColor: '#0066CC',
        logoColor: '#FFFFFF',
        description: 'Electronics and appliances store',
        cashbackRate: 8,
        rating: 4.3,
        ratingCount: 6543,
        category: 'electronics',
        isNewlyAdded: false,
        isFeatured: false,
        isActive: true,
        denominations: [500, 1000, 2000, 5000, 10000],
        termsAndConditions: [
          'Valid for 12 months',
          'Applicable in-store and online',
          'Check for product exclusions'
        ],
        purchaseCount: 345,
        viewCount: 1890,
        store: storeByCategory.electronics[1]?._id || stores[0]?._id,
      },

      // Travel vouchers
      {
        name: 'MakeMyTrip',
        logo: '✈️',
        backgroundColor: '#E7332B',
        logoColor: '#FFFFFF',
        description: 'Book flights, hotels, and holiday packages',
        cashbackRate: 15,
        rating: 4.2,
        ratingCount: 9876,
        category: 'travel',
        isNewlyAdded: false,
        isFeatured: true,
        isActive: true,
        denominations: [500, 1000, 2000, 5000],
        termsAndConditions: [
          'Valid for 12 months from date of purchase',
          'Can be used for flights, hotels, and packages',
          'Non-refundable and non-transferable',
          'Valid on MakeMyTrip app and website',
          'Cannot be used for gift cards or vouchers'
        ],
        purchaseCount: 567,
        viewCount: 2890,
        // No specific store - online travel booking
      },
      {
        name: 'Air India',
        logo: '✈️',
        backgroundColor: '#DC143C',
        logoColor: '#FFFFFF',
        description: 'National airline of India',
        cashbackRate: 12,
        rating: 4.2,
        ratingCount: 8765,
        category: 'travel',
        isNewlyAdded: true,
        isFeatured: false,
        isActive: true,
        denominations: [1000, 2000, 5000, 10000],
        termsAndConditions: [
          'Valid for 12 months',
          'Applicable on domestic and international flights',
          'Non-refundable'
        ],
        purchaseCount: 432,
        viewCount: 2345,
        // No specific store - airline
      },
      {
        name: 'IndiGo',
        logo: '✈️',
        backgroundColor: '#FF6A00',
        logoColor: '#FFFFFF',
        description: 'India\'s largest airline',
        cashbackRate: 10,
        rating: 4.4,
        ratingCount: 11234,
        category: 'travel',
        isNewlyAdded: false,
        isFeatured: false,
        isActive: true,
        denominations: [1000, 2000, 5000],
        termsAndConditions: [
          'Valid for 12 months',
          'Applicable on all IndiGo flights',
          'Non-refundable'
        ],
        purchaseCount: 321,
        viewCount: 1876,
        // No specific store - airline
      },

      // Entertainment vouchers
      {
        name: 'BookMyShow',
        logo: '🎬',
        backgroundColor: '#C4242B',
        logoColor: '#FFFFFF',
        description: 'Book movie tickets and entertainment events',
        cashbackRate: 12,
        rating: 4.4,
        ratingCount: 12340,
        category: 'entertainment',
        isNewlyAdded: true,
        isFeatured: true,
        isActive: true,
        denominations: [100, 200, 500, 1000],
        termsAndConditions: [
          'Valid for 12 months from date of purchase',
          'Can be used for movies, plays, sports, and events',
          'Non-refundable',
          'Valid on BookMyShow app and website',
          'Convenience fees applicable'
        ],
        purchaseCount: 1203,
        viewCount: 6789,
        // No specific store - online booking
      },
      {
        name: 'PVR Cinemas',
        logo: '🎥',
        backgroundColor: '#E4002B',
        logoColor: '#FFFFFF',
        description: 'Book movie tickets at PVR Cinemas',
        cashbackRate: 10,
        rating: 4.5,
        ratingCount: 9876,
        category: 'entertainment',
        isNewlyAdded: false,
        isFeatured: false,
        isActive: true,
        denominations: [200, 500, 1000, 2000],
        termsAndConditions: [
          'Valid for 6 months',
          'Applicable at all PVR locations',
          'Non-refundable'
        ],
        purchaseCount: 876,
        viewCount: 4321,
        // No specific store - cinema chain
      },

      // Sports vouchers
      {
        name: 'Decathlon',
        logo: '⚽',
        backgroundColor: '#0082C3',
        logoColor: '#FFFFFF',
        description: 'Shop sports and fitness equipment',
        cashbackRate: 8,
        rating: 4.3,
        ratingCount: 5432,
        category: 'sports',
        isNewlyAdded: true,
        isFeatured: false,
        isActive: true,
        denominations: [250, 500, 1000, 2000],
        termsAndConditions: [
          'Valid for 12 months from date of purchase',
          'Can be used multiple times until balance is exhausted',
          'Non-refundable and non-transferable',
          'Valid at all Decathlon stores and online',
          'Cannot be used for purchase of gift cards'
        ],
        purchaseCount: 345,
        viewCount: 1890,
        // No specific store - Decathlon has many stores
      },

      // More fashion brands
      {
        name: 'Hollister',
        logo: '🏖️',
        backgroundColor: '#F5F5F5',
        logoColor: '#000000',
        description: 'California lifestyle brand',
        cashbackRate: 10,
        rating: 4.3,
        ratingCount: 5432,
        category: 'fashion',
        isNewlyAdded: false,
        isFeatured: false,
        isActive: true,
        denominations: [500, 1000, 2000, 5000],
        termsAndConditions: [
          'Valid for 12 months',
          'Applicable at all Hollister stores',
          'Non-transferable'
        ],
        purchaseCount: 432,
        viewCount: 2345,
        store: storeByCategory.fashion[0]?._id || stores[0]?._id,
      },
      {
        name: 'Levi\'s',
        logo: '👖',
        backgroundColor: '#0054A6',
        logoColor: '#FFFFFF',
        description: 'American denim brand',
        cashbackRate: 10,
        rating: 4.6,
        ratingCount: 8765,
        category: 'fashion',
        isNewlyAdded: false,
        isFeatured: true,
        isActive: true,
        denominations: [500, 1000, 2000],
        termsAndConditions: [
          'Valid for 12 months',
          'Can be used multiple times',
          'Non-refundable'
        ],
        purchaseCount: 654,
        viewCount: 3210,
        store: storeByCategory.fashion[1]?._id || stores[0]?._id,
      },
      {
        name: 'Calvin Klein',
        logo: 'CK',
        backgroundColor: '#000000',
        logoColor: '#FFFFFF',
        description: 'American fashion house',
        cashbackRate: 9,
        rating: 4.5,
        ratingCount: 7654,
        category: 'fashion',
        isNewlyAdded: false,
        isFeatured: false,
        isActive: true,
        denominations: [500, 1000, 2000, 5000],
        termsAndConditions: [
          'Valid for 12 months',
          'Applicable at all CK stores',
          'Non-transferable'
        ],
        purchaseCount: 543,
        viewCount: 2876,
        store: storeByCategory.fashion[0]?._id || stores[0]?._id,
      },

      // More Entertainment vouchers
      {
        name: 'Movie Time',
        logo: '🎬',
        backgroundColor: '#10B981',
        logoColor: '#FFFFFF',
        description: 'Book movie tickets and entertainment',
        cashbackRate: 12,
        rating: 4.4,
        ratingCount: 12340,
        category: 'entertainment',
        isNewlyAdded: true,
        isFeatured: false,
        isActive: true,
        denominations: [100, 200, 500, 1000],
        termsAndConditions: [
          'Valid for 6 months',
          'Applicable for movies and shows',
          'Non-refundable'
        ],
        purchaseCount: 890,
        viewCount: 5432,
      },
      {
        name: 'INOX Cinemas',
        logo: '🎥',
        backgroundColor: '#8B5CF6',
        logoColor: '#FFFFFF',
        description: 'Movie tickets at INOX Cinemas',
        cashbackRate: 9,
        rating: 4.3,
        ratingCount: 8765,
        category: 'entertainment',
        isNewlyAdded: false,
        isFeatured: false,
        isActive: true,
        denominations: [200, 500, 1000],
        termsAndConditions: [
          'Valid for 6 months',
          'Applicable at all INOX locations',
          'Non-refundable'
        ],
        purchaseCount: 543,
        viewCount: 2876,
      },
    ];

    // Check existing voucher brands (DO NOT DELETE ANYTHING)
    console.log('📊 Checking existing voucher brands...');
    const existingCount = await VoucherBrand.countDocuments();
    console.log(`✅ Found ${existingCount} existing voucher brands\n`);

    // Seed voucher brands
    console.log('🌱 Seeding voucher brands...');
    let created = 0;
    let skipped = 0;

    for (const voucherData of voucherBrandsData) {
      const existingVoucher = await VoucherBrand.findOne({ name: voucherData.name });

      if (existingVoucher) {
        // Update existing voucher with store link if missing
        if (!existingVoucher.store && voucherData.store) {
          existingVoucher.store = voucherData.store as mongoose.Types.ObjectId;
          await existingVoucher.save();
          console.log(`🔄 Updated ${voucherData.name} with store link`);
          created++;
        } else {
          skipped++;
          console.log(`⚠️  ${voucherData.name} already exists, skipping...`);
        }
      } else {
        const voucher = new VoucherBrand(voucherData);
        await voucher.save();
        console.log(`✅ Created voucher brand: ${voucherData.name}${voucherData.store ? ' (linked to store)' : ''}`);
        created++;
      }
    }

    const finalCount = await VoucherBrand.countDocuments();
    console.log(`\n📊 Final voucher brand count: ${finalCount}`);
    console.log(`✅ Created/Updated: ${created} vouchers`);
    console.log(`⏭️  Skipped: ${skipped} vouchers`);

    // Display vouchers linked to stores
    const vouchersWithStores = await VoucherBrand.find({ store: { $exists: true, $ne: null } })
      .populate('store', 'name slug')
      .select('name store');
    console.log(`\n🔗 Vouchers linked to stores: ${vouchersWithStores.length}`);
    vouchersWithStores.forEach(v => {
      console.log(`   - ${v.name} → ${(v.store as any)?.name || 'Store'}`);
    });

    console.log('\n✨ Voucher seeding completed successfully!');

    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding vouchers:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the seeder
if (require.main === module) {
  seedVouchersWithStores();
}

export { seedVouchersWithStores };

