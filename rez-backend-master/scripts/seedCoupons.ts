// Seed Coupons Script
// Creates sample coupon codes for testing

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { Coupon } from '../src/models/Coupon';
import { User } from '../src/models/User';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rezapp';

// Sample coupons
const sampleCoupons = [
  {
    couponCode: 'FIRST10',
    title: '10% Off First Order',
    description: 'Get 10% discount on your first order. Minimum order value ₹299',
    discountType: 'PERCENTAGE' as const,
    discountValue: 10,
    minOrderValue: 299,
    maxDiscountCap: 100,
    validFrom: new Date('2025-01-01'),
    validTo: new Date('2025-12-31'),
    usageLimit: {
      totalUsage: 0, // unlimited
      perUser: 1,
      usedCount: 0,
    },
    applicableTo: {
      categories: [],
      products: [],
      stores: [],
      userTiers: ['all'],
    },
    autoApply: false,
    autoApplyPriority: 0,
    status: 'active' as const,
    termsAndConditions: [
      'Valid for first-time users only',
      'Minimum order value ₹299',
      'Maximum discount ₹100',
      'Cannot be combined with other offers',
    ],
    tags: ['new-user', 'percentage', 'first-order'],
    isFeatured: true,
    isNewlyAdded: true,
  },
  {
    couponCode: 'SAVE50',
    title: 'Flat ₹50 Off',
    description: 'Get flat ₹50 discount on orders above ₹500',
    discountType: 'FIXED' as const,
    discountValue: 50,
    minOrderValue: 500,
    maxDiscountCap: 0,
    validFrom: new Date('2025-01-01'),
    validTo: new Date('2025-12-31'),
    usageLimit: {
      totalUsage: 1000,
      perUser: 3,
      usedCount: 0,
    },
    applicableTo: {
      categories: [],
      products: [],
      stores: [],
      userTiers: ['all'],
    },
    autoApply: false,
    autoApplyPriority: 0,
    status: 'active' as const,
    termsAndConditions: [
      'Minimum order value ₹500',
      'Can be used up to 3 times per user',
      'Valid on all products',
    ],
    tags: ['fixed-discount', 'popular'],
    isFeatured: true,
    isNewlyAdded: false,
  },
  {
    couponCode: 'WELCOME20',
    title: '20% Off Welcome Offer',
    description: 'Special welcome offer! Get 20% off on your first purchase',
    discountType: 'PERCENTAGE' as const,
    discountValue: 20,
    minOrderValue: 1000,
    maxDiscountCap: 200,
    validFrom: new Date('2025-01-01'),
    validTo: new Date('2025-12-31'),
    usageLimit: {
      totalUsage: 0,
      perUser: 1,
      usedCount: 0,
    },
    applicableTo: {
      categories: [],
      products: [],
      stores: [],
      userTiers: ['all'],
    },
    autoApply: false,
    autoApplyPriority: 5,
    status: 'active' as const,
    termsAndConditions: [
      'Valid for new users only',
      'Minimum order value ₹1000',
      'Maximum discount ₹200',
    ],
    tags: ['welcome', 'new-user', 'percentage'],
    isFeatured: true,
    isNewlyAdded: true,
  },
  {
    couponCode: 'MEGA100',
    title: 'Mega Sale - ₹100 Off',
    description: 'Get ₹100 off on orders above ₹1500',
    discountType: 'FIXED' as const,
    discountValue: 100,
    minOrderValue: 1500,
    maxDiscountCap: 0,
    validFrom: new Date('2025-01-01'),
    validTo: new Date('2025-12-31'),
    usageLimit: {
      totalUsage: 500,
      perUser: 2,
      usedCount: 0,
    },
    applicableTo: {
      categories: [],
      products: [],
      stores: [],
      userTiers: ['all'],
    },
    autoApply: false,
    autoApplyPriority: 0,
    status: 'active' as const,
    termsAndConditions: [
      'Minimum order value ₹1500',
      'Can be used twice per user',
      'Valid until stocks last',
    ],
    tags: ['mega-sale', 'fixed-discount'],
    isFeatured: true,
    isNewlyAdded: false,
  },
  {
    couponCode: 'FLASH15',
    title: 'Flash Sale - 15% Off',
    description: 'Limited time flash sale! Get 15% off on all products',
    discountType: 'PERCENTAGE' as const,
    discountValue: 15,
    minOrderValue: 750,
    maxDiscountCap: 150,
    validFrom: new Date('2025-01-01'),
    validTo: new Date('2025-06-30'),
    usageLimit: {
      totalUsage: 200,
      perUser: 1,
      usedCount: 0,
    },
    applicableTo: {
      categories: [],
      products: [],
      stores: [],
      userTiers: ['all'],
    },
    autoApply: false,
    autoApplyPriority: 10,
    status: 'active' as const,
    termsAndConditions: [
      'Valid for limited time only',
      'Minimum order value ₹750',
      'Maximum discount ₹150',
      'First come, first served',
    ],
    tags: ['flash-sale', 'limited-time', 'percentage'],
    isFeatured: true,
    isNewlyAdded: true,
  },
  {
    couponCode: 'FREESHIP',
    title: 'Free Shipping on All Orders',
    description: 'Get free shipping on orders above ₹399',
    discountType: 'FIXED' as const,
    discountValue: 40,
    minOrderValue: 399,
    maxDiscountCap: 0,
    validFrom: new Date('2025-01-01'),
    validTo: new Date('2025-12-31'),
    usageLimit: {
      totalUsage: 0,
      perUser: 10,
      usedCount: 0,
    },
    applicableTo: {
      categories: [],
      products: [],
      stores: [],
      userTiers: ['all'],
    },
    autoApply: true,
    autoApplyPriority: 1,
    status: 'active' as const,
    termsAndConditions: [
      'Minimum order value ₹399',
      'Automatically applied at checkout',
      'Valid on all products',
    ],
    tags: ['free-shipping', 'auto-apply'],
    isFeatured: false,
    isNewlyAdded: false,
  },
];

async function seedCoupons() {
  try {
    console.log('🚀 Starting coupon seeding...');
    console.log(`📡 Connecting to MongoDB: ${MONGODB_URI}`);

    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find an admin or user to set as creator
    let adminUser = await User.findOne({ role: 'admin' });
    
    if (!adminUser) {
      console.log('⚠️ No admin found, looking for any user...');
      adminUser = await User.findOne();
    }

    if (!adminUser) {
      console.error('❌ No users found in database! Please create a user first.');
      process.exit(1);
    }

    console.log(`👤 Using user ${adminUser._id} as creator`);

    // Check existing coupons
    const existingCoupons = await Coupon.find();
    console.log(`📊 Found ${existingCoupons.length} existing coupons`);

    // Delete existing coupons (optional - uncomment if you want fresh start)
    // await Coupon.deleteMany({});
    // console.log('🗑️ Cleared existing coupons');

    let createdCount = 0;
    let skippedCount = 0;

    for (const couponData of sampleCoupons) {
      // Check if coupon already exists
      const existing = await Coupon.findOne({ couponCode: couponData.couponCode });
      
      if (existing) {
        console.log(`⏭️ Skipping ${couponData.couponCode} - already exists`);
        skippedCount++;
        continue;
      }

      // Create coupon
      const coupon = await Coupon.create({
        ...couponData,
        createdBy: adminUser._id,
      });

      console.log(`✅ Created coupon: ${coupon.couponCode} - ${coupon.title}`);
      createdCount++;
    }

    console.log('\n📋 SEEDING SUMMARY');
    console.log('==================');
    console.log(`✅ Created: ${createdCount} coupons`);
    console.log(`⏭️ Skipped: ${skippedCount} coupons (already exist)`);
    console.log(`📊 Total coupons in database: ${await Coupon.countDocuments()}`);

    // Display all active coupons
    console.log('\n🎫 ACTIVE COUPONS:');
    console.log('==================');
    const activeCoupons = await Coupon.find({ status: 'active' }).sort({ isFeatured: -1 });
    
    activeCoupons.forEach((coupon) => {
      const discountDisplay = coupon.discountType === 'PERCENTAGE' 
        ? `${coupon.discountValue}% OFF` 
        : `₹${coupon.discountValue} OFF`;
      
      console.log(`
      Code: ${coupon.couponCode}
      Title: ${coupon.title}
      Discount: ${discountDisplay}
      Min Order: ₹${coupon.minOrderValue}
      ${coupon.maxDiscountCap > 0 ? `Max Discount: ₹${coupon.maxDiscountCap}` : ''}
      Featured: ${coupon.isFeatured ? '⭐' : ''}
      Auto Apply: ${coupon.autoApply ? '✓' : '✗'}
      `);
    });

    console.log('\n✅ Coupon seeding completed successfully!');
    console.log('💡 You can now use these coupons in the app.');

  } catch (error: any) {
    console.error('❌ Error seeding coupons:', error);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run the seeding
seedCoupons();

