import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { VoucherBrand } from '../src/models/Voucher';

dotenv.config();

const newVoucherBrands = [
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
    viewCount: 4521
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
    viewCount: 3210
  },
  {
    name: 'BookMyShow',
    logo: '🎬',
    backgroundColor: '#C4242B',
    logoColor: '#FFFFFF',
    description: 'Book movie tickets and events',
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
    viewCount: 6789
  },
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
    viewCount: 2890
  },
  {
    name: 'Nykaa',
    logo: '💄',
    backgroundColor: '#FC2779',
    logoColor: '#FFFFFF',
    description: 'Shop beauty, wellness, and fashion products',
    cashbackRate: 10,
    rating: 4.5,
    ratingCount: 11234,
    category: 'beauty',
    isNewlyAdded: true,
    isFeatured: true,
    isActive: true,
    denominations: [100, 250, 500, 1000, 2000],
    termsAndConditions: [
      'Valid for 6 months from date of purchase',
      'Can be used multiple times until balance is exhausted',
      'Non-refundable',
      'Valid on Nykaa app, website, and retail stores',
      'Cannot be used for purchase of gift cards'
    ],
    purchaseCount: 1456,
    viewCount: 7823
  },
  {
    name: 'BigBasket',
    logo: '🛒',
    backgroundColor: '#84C225',
    logoColor: '#FFFFFF',
    description: 'Order groceries and essentials online',
    cashbackRate: 7,
    rating: 4.0,
    ratingCount: 6543,
    category: 'groceries',
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
    viewCount: 3456
  },
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
    viewCount: 1890
  },
  {
    name: 'Croma',
    logo: '🔌',
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
    viewCount: 2345
  },
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
    viewCount: 8901
  }
];

async function seedVouchers() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rez-app');
    console.log('✅ Connected to MongoDB');

    console.log('🧹 Checking existing voucher brands...');
    const existingCount = await VoucherBrand.countDocuments();
    console.log(`📊 Current voucher brands: ${existingCount}`);

    console.log('🌱 Seeding new voucher brands...');

    for (const voucherData of newVoucherBrands) {
      const existingVoucher = await VoucherBrand.findOne({ name: voucherData.name });

      if (existingVoucher) {
        console.log(`⚠️  ${voucherData.name} already exists, skipping...`);
        continue;
      }

      const voucher = new VoucherBrand(voucherData);
      await voucher.save();
      console.log(`✅ Created voucher brand: ${voucherData.name}`);
    }

    const finalCount = await VoucherBrand.countDocuments();
    console.log(`\n📊 Final voucher brand count: ${finalCount}`);
    console.log(`✅ Successfully seeded ${finalCount - existingCount} new voucher brands!`);

    // Display all voucher brands
    const allVouchers = await VoucherBrand.find().select('name category cashbackRate');
    console.log('\n📋 All Voucher Brands:');
    allVouchers.forEach((v, i) => {
      console.log(`${i + 1}. ${v.name} (${v.category}) - ${v.cashbackRate}% cashback`);
    });

    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error seeding vouchers:', error);
    process.exit(1);
  }
}

seedVouchers();
