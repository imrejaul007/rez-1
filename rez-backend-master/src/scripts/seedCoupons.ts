// Seed Coupons Script
// Creates sample coupon data for testing

import mongoose from 'mongoose';
import { connectDatabase } from '../config/database';
import { Coupon } from '../models/Coupon';
import { UserCoupon } from '../models/UserCoupon';
import { User } from '../models/User';
import { Category } from '../models/Category';
import { Store } from '../models/Store';
import { Product } from '../models/Product';

async function seedCoupons() {
  try {
    console.log('🎫 Starting Coupon Seeding...');
    console.log('=====================================\n');

    // Connect to database
    await connectDatabase();
    console.log('✅ Connected to database\n');

    // Get some existing data for relationships
    const users = await User.find().limit(5);
    const categories = await Category.find().limit(5);
    const stores = await Store.find().limit(5);
    const products = await Product.find().limit(10);

    if (users.length === 0) {
      console.log('⚠️  No users found. Please seed users first.');
      return;
    }

    // Admin user for creating coupons (use first user)
    const adminUser = users[0];

    console.log('🗑️  Clearing existing coupons...');
    await Coupon.deleteMany({});
    await UserCoupon.deleteMany({});
    console.log('✅ Cleared existing coupons\n');

    console.log('🔄 Creating coupons...');

    // 1. Welcome Coupon - For new users
    const welcomeCoupon = await Coupon.create({
      couponCode: 'WELCOME10',
      title: 'Welcome Offer - Get 10% Off',
      description: 'Welcome to REZ! Get 10% off on your first purchase',
      discountType: 'PERCENTAGE',
      discountValue: 10,
      minOrderValue: 500,
      maxDiscountCap: 500,
      validFrom: new Date(),
      validTo: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
      usageLimit: {
        totalUsage: 0, // Unlimited
        perUser: 1,
        usedCount: 0,
      },
      applicableTo: {
        categories: [],
        products: [],
        stores: [],
        userTiers: ['all'],
      },
      autoApply: true,
      autoApplyPriority: 10,
      status: 'active',
      termsAndConditions: [
        'Valid for new users only',
        'Minimum order value ₹500',
        'Maximum discount ₹500',
        'Cannot be combined with other offers',
      ],
      createdBy: adminUser._id,
      tags: ['welcome', 'new-user', 'first-order'],
      imageUrl: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=500',
      isNewlyAdded: true,
      isFeatured: true,
      viewCount: 0,
      claimCount: 0,
      usageCount: 0,
    });

    // 2. Festive Sale - High value discount
    const festiveCoupon = await Coupon.create({
      couponCode: 'FEST2025',
      title: 'Festive Sale - Flat ₹500 Off',
      description: 'Celebrate with us! Get flat ₹500 off on orders above ₹2000',
      discountType: 'FIXED',
      discountValue: 500,
      minOrderValue: 2000,
      maxDiscountCap: 0,
      validFrom: new Date(),
      validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      usageLimit: {
        totalUsage: 1000,
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
      autoApplyPriority: 8,
      status: 'active',
      termsAndConditions: [
        'Valid on all products',
        'Minimum order value ₹2000',
        'Limited to first 1000 users',
        'Maximum 2 uses per user',
      ],
      createdBy: adminUser._id,
      tags: ['festive', 'sale', 'flat-discount'],
      imageUrl: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=500',
      isNewlyAdded: true,
      isFeatured: true,
      viewCount: 0,
      claimCount: 0,
      usageCount: 0,
    });

    // 3. Electronics Category Coupon
    const electronicsCoupon = await Coupon.create({
      couponCode: 'TECH20',
      title: 'Electronics Special - 20% Off',
      description: 'Get 20% off on all electronics items',
      discountType: 'PERCENTAGE',
      discountValue: 20,
      minOrderValue: 1000,
      maxDiscountCap: 2000,
      validFrom: new Date(),
      validTo: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
      usageLimit: {
        totalUsage: 500,
        perUser: 1,
        usedCount: 0,
      },
      applicableTo: {
        categories: categories.length > 0 ? [categories[0]._id] : [],
        products: [],
        stores: [],
        userTiers: ['all'],
      },
      autoApply: true,
      autoApplyPriority: 7,
      status: 'active',
      termsAndConditions: [
        'Valid on Electronics category only',
        'Minimum order value ₹1000',
        'Maximum discount ₹2000',
        'One use per user',
      ],
      createdBy: adminUser._id,
      tags: ['electronics', 'tech', 'category-specific'],
      imageUrl: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=500',
      isNewlyAdded: false,
      isFeatured: true,
      viewCount: 0,
      claimCount: 0,
      usageCount: 0,
    });

    // 4. Store Specific Coupon
    const storeCoupon = await Coupon.create({
      couponCode: 'STORE15',
      title: 'Store Special - 15% Off',
      description: 'Exclusive 15% discount on select store items',
      discountType: 'PERCENTAGE',
      discountValue: 15,
      minOrderValue: 750,
      maxDiscountCap: 1000,
      validFrom: new Date(),
      validTo: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 days
      usageLimit: {
        totalUsage: 0,
        perUser: 3,
        usedCount: 0,
      },
      applicableTo: {
        categories: [],
        products: [],
        stores: stores.length > 0 ? [stores[0]._id] : [],
        userTiers: ['all'],
      },
      autoApply: false,
      autoApplyPriority: 6,
      status: 'active',
      termsAndConditions: [
        'Valid on specific store only',
        'Minimum order value ₹750',
        'Maximum discount ₹1000',
        'Can be used 3 times per user',
      ],
      createdBy: adminUser._id,
      tags: ['store-specific', 'exclusive'],
      imageUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=500',
      isNewlyAdded: false,
      isFeatured: false,
      viewCount: 0,
      claimCount: 0,
      usageCount: 0,
    });

    // 5. Premium User Coupon
    const premiumCoupon = await Coupon.create({
      couponCode: 'GOLD25',
      title: 'Gold Member Exclusive - 25% Off',
      description: 'Exclusive discount for Gold tier members',
      discountType: 'PERCENTAGE',
      discountValue: 25,
      minOrderValue: 1500,
      maxDiscountCap: 3000,
      validFrom: new Date(),
      validTo: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000), // 120 days
      usageLimit: {
        totalUsage: 0,
        perUser: 5,
        usedCount: 0,
      },
      applicableTo: {
        categories: [],
        products: [],
        stores: [],
        userTiers: ['gold'],
      },
      autoApply: true,
      autoApplyPriority: 9,
      status: 'active',
      termsAndConditions: [
        'Valid for Gold tier members only',
        'Minimum order value ₹1500',
        'Maximum discount ₹3000',
        'Can be used 5 times',
      ],
      createdBy: adminUser._id,
      tags: ['premium', 'gold-member', 'exclusive'],
      imageUrl: 'https://images.unsplash.com/photo-1607082349566-187342175e2f?w=500',
      isNewlyAdded: true,
      isFeatured: true,
      viewCount: 0,
      claimCount: 0,
      usageCount: 0,
    });

    // 6. Product Specific Coupon
    const productCoupon = await Coupon.create({
      couponCode: 'PRODUCT50',
      title: 'Product Special - Flat ₹50 Off',
      description: 'Get flat ₹50 off on selected products',
      discountType: 'FIXED',
      discountValue: 50,
      minOrderValue: 200,
      maxDiscountCap: 0,
      validFrom: new Date(),
      validTo: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days
      usageLimit: {
        totalUsage: 200,
        perUser: 1,
        usedCount: 0,
      },
      applicableTo: {
        categories: [],
        products: products.length > 0 ? [products[0]._id, products[1]._id] : [],
        stores: [],
        userTiers: ['all'],
      },
      autoApply: false,
      autoApplyPriority: 5,
      status: 'active',
      termsAndConditions: [
        'Valid on selected products only',
        'Minimum order value ₹200',
        'Limited to 200 uses',
        'One use per user',
      ],
      createdBy: adminUser._id,
      tags: ['product-specific', 'flash-offer'],
      imageUrl: 'https://images.unsplash.com/photo-1607082350899-7e105aa886ae?w=500',
      isNewlyAdded: true,
      isFeatured: false,
      viewCount: 0,
      claimCount: 0,
      usageCount: 0,
    });

    // 7. Weekend Special
    const weekendCoupon = await Coupon.create({
      couponCode: 'WEEKEND30',
      title: 'Weekend Special - 30% Off',
      description: 'Weekend flash sale! Get 30% off on all orders',
      discountType: 'PERCENTAGE',
      discountValue: 30,
      minOrderValue: 1000,
      maxDiscountCap: 1500,
      validFrom: new Date(),
      validTo: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      usageLimit: {
        totalUsage: 300,
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
      autoApplyPriority: 8,
      status: 'active',
      termsAndConditions: [
        'Valid for weekend only',
        'Minimum order value ₹1000',
        'Maximum discount ₹1500',
        'First 300 users only',
      ],
      createdBy: adminUser._id,
      tags: ['weekend', 'flash-sale', 'limited-time'],
      imageUrl: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=500',
      isNewlyAdded: true,
      isFeatured: true,
      viewCount: 0,
      claimCount: 0,
      usageCount: 0,
    });

    // 8. Expired Coupon (for testing)
    const expiredCoupon = await Coupon.create({
      couponCode: 'EXPIRED10',
      title: 'Expired Offer',
      description: 'This coupon has expired',
      discountType: 'PERCENTAGE',
      discountValue: 10,
      minOrderValue: 500,
      maxDiscountCap: 500,
      validFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      validTo: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // Yesterday
      usageLimit: {
        totalUsage: 100,
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
      status: 'expired',
      termsAndConditions: ['This coupon has expired'],
      createdBy: adminUser._id,
      tags: ['expired'],
      isNewlyAdded: false,
      isFeatured: false,
      viewCount: 50,
      claimCount: 25,
      usageCount: 20,
    });

    const coupons = [
      welcomeCoupon,
      festiveCoupon,
      electronicsCoupon,
      storeCoupon,
      premiumCoupon,
      productCoupon,
      weekendCoupon,
      expiredCoupon,
    ];

    console.log(`✅ Created ${coupons.length} coupons\n`);

    // Create some user coupons (claimed coupons)
    console.log('🔄 Creating user coupons...');

    const userCoupons = [];

    // User 1 claims welcome and festive coupons
    if (users[0]) {
      userCoupons.push(
        await UserCoupon.create({
          user: users[0]._id,
          coupon: welcomeCoupon._id,
          claimedDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
          expiryDate: welcomeCoupon.validTo,
          status: 'available',
          notifications: {
            expiryReminder: true,
            expiryReminderSent: null,
          },
        })
      );

      userCoupons.push(
        await UserCoupon.create({
          user: users[0]._id,
          coupon: festiveCoupon._id,
          claimedDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
          expiryDate: festiveCoupon.validTo,
          status: 'available',
          notifications: {
            expiryReminder: true,
            expiryReminderSent: null,
          },
        })
      );
    }

    // User 2 claims electronics and uses it
    if (users[1]) {
      userCoupons.push(
        await UserCoupon.create({
          user: users[1]._id,
          coupon: electronicsCoupon._id,
          claimedDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
          expiryDate: electronicsCoupon.validTo,
          usedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          status: 'used',
          notifications: {
            expiryReminder: false,
            expiryReminderSent: null,
          },
        })
      );
    }

    // User 3 has an expired coupon
    if (users[2]) {
      userCoupons.push(
        await UserCoupon.create({
          user: users[2]._id,
          coupon: expiredCoupon._id,
          claimedDate: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
          expiryDate: expiredCoupon.validTo,
          status: 'expired',
          notifications: {
            expiryReminder: true,
            expiryReminderSent: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          },
        })
      );
    }

    // User 4 claims weekend coupon
    if (users[3]) {
      userCoupons.push(
        await UserCoupon.create({
          user: users[3]._id,
          coupon: weekendCoupon._id,
          claimedDate: new Date(),
          expiryDate: weekendCoupon.validTo,
          status: 'available',
          notifications: {
            expiryReminder: true,
            expiryReminderSent: null,
          },
        })
      );
    }

    console.log(`✅ Created ${userCoupons.length} user coupons\n`);

    // Update coupon claim counts
    await Coupon.findByIdAndUpdate(welcomeCoupon._id, { $inc: { claimCount: 1 } });
    await Coupon.findByIdAndUpdate(festiveCoupon._id, { $inc: { claimCount: 1 } });
    await Coupon.findByIdAndUpdate(electronicsCoupon._id, {
      $inc: { claimCount: 1, usageCount: 1, 'usageLimit.usedCount': 1 }
    });
    await Coupon.findByIdAndUpdate(weekendCoupon._id, { $inc: { claimCount: 1 } });

    console.log('\n=====================================');
    console.log('🎉 Coupon seeding completed successfully!');
    console.log('=====================================');
    console.log('\n📊 Summary:');
    console.log(`🎫 Total Coupons: ${coupons.length}`);
    console.log(`   - Active: ${coupons.filter(c => c.status === 'active').length}`);
    console.log(`   - Expired: ${coupons.filter(c => c.status === 'expired').length}`);
    console.log(`   - Featured: ${coupons.filter(c => c.isFeatured).length}`);
    console.log(`👥 User Coupons: ${userCoupons.length}`);
    console.log(`   - Available: ${userCoupons.filter((uc: any) => uc.status === 'available').length}`);
    console.log(`   - Used: ${userCoupons.filter((uc: any) => uc.status === 'used').length}`);
    console.log(`   - Expired: ${userCoupons.filter((uc: any) => uc.status === 'expired').length}`);

    console.log('\n🔗 Coupon Codes Created:');
    coupons.forEach((coupon) => {
      console.log(`   - ${coupon.couponCode}: ${coupon.title} (${coupon.status})`);
    });

    console.log('\n✅ Coupons are ready for testing!\n');
  } catch (error) {
    console.error('❌ Error seeding coupons:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from database');
  }
}

// Run the seeding script
if (require.main === module) {
  seedCoupons()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { seedCoupons };
