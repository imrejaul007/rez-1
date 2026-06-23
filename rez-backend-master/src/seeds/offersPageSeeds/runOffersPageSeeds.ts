// SECURITY: hard-coded MongoDB credentials replaced with env-var reference.
// Set MONGODB_URI in your environment before running this script.

/**
 * Offers Page Seeds Runner
 *
 * This script seeds all the data needed for the Offers page:
 * - Flash Sales (Lightning Deals)
 * - Coupons (Promo Codes for Flash Sales)
 * - Friend Redemptions (Social Proof)
 *
 * Run with: npx ts-node src/seeds/offersPageSeeds/runOffersPageSeeds.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import models
import FlashSale from '../../models/FlashSale';
import { Coupon } from '../../models/Coupon';
import FriendRedemption from '../../models/FriendRedemption';
import { Store } from '../../models/Store';
import Offer from '../../models/Offer';
import { User } from '../../models/User';

// Helper functions
const futureDate = (hours: number) => new Date(Date.now() + hours * 60 * 60 * 1000);
const pastDate = (hours: number) => new Date(Date.now() - hours * 60 * 60 * 1000);

// Store name to ID mapping (will be populated from DB)
interface StoreMap {
  [key: string]: mongoose.Types.ObjectId;
}

async function getStoreIds(): Promise<StoreMap> {
  const storeNames = ['Starbucks', 'KFC', 'McDonald\'s', 'Domino\'s Pizza', 'Mojo Pizza'];
  const stores = await Store.find({
    name: { $regex: storeNames.join('|'), $options: 'i' },
  }).select('_id name').lean();

  const storeMap: StoreMap = {};
  for (const store of stores) {
    const nameLower = (store as any).name.toLowerCase();
    if (nameLower.includes('starbucks')) storeMap.starbucks = (store as any)._id;
    if (nameLower.includes('kfc')) storeMap.kfc = (store as any)._id;
    if (nameLower.includes('mcdonald')) storeMap.mcdonalds = (store as any)._id;
    if (nameLower.includes('domino')) storeMap.dominos = (store as any)._id;
    if (nameLower.includes('mojo')) storeMap.mojoPizza = (store as any)._id;
  }

  console.log('Found stores:', Object.keys(storeMap));
  return storeMap;
}

async function getOrCreateAdminUser(): Promise<mongoose.Types.ObjectId> {
  let admin = await User.findOne({ email: 'admin@rez.com' });
  if (!admin) {
    admin = await User.create({
      name: 'Admin User',
      email: 'admin@rez.com',
      phone: '+919999999999',
      isAdmin: true,
      isVerified: true,
    });
  }
  return admin._id as mongoose.Types.ObjectId;
}

async function getSampleUsers(): Promise<mongoose.Types.ObjectId[]> {
  const users = await User.find({}).limit(5).select('_id').lean();
  if (users.length === 0) {
    // Create sample users if none exist
    const sampleUsers = await User.create([
      { name: 'Rahul S.', email: 'rahul@example.com', phone: '+919111111111', isVerified: true },
      { name: 'Priya M.', email: 'priya@example.com', phone: '+919222222222', isVerified: true },
      { name: 'Arjun K.', email: 'arjun@example.com', phone: '+919333333333', isVerified: true },
      { name: 'Sneha R.', email: 'sneha@example.com', phone: '+919444444444', isVerified: true },
    ]);
    return sampleUsers.map((u: any) => u._id);
  }
  return users.map((u: any) => u._id);
}

async function getSampleOffers(): Promise<mongoose.Types.ObjectId[]> {
  const offers = await Offer.find({}).limit(4).select('_id').lean();
  return offers.map((o: any) => o._id);
}

async function seedFlashSales(storeMap: StoreMap): Promise<mongoose.Types.ObjectId[]> {
  console.log('\n📦 Seeding Flash Sales...');

  // Clear existing flash sales
  await FlashSale.deleteMany({});

  const flashSalesData = [
    {
      title: 'Flash Pizza Deal',
      description: 'Large Pizza + 2 Sides - Limited time offer! Get our best-selling pizza combo at an unbeatable price.',
      image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400',
      banner: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800',
      discountPercentage: 33,
      priority: 10,
      startTime: new Date(),
      endTime: futureDate(2),
      maxQuantity: 100,
      soldQuantity: 67,
      limitPerUser: 2,
      lowStockThreshold: 20,
      products: [],
      stores: storeMap.dominos ? [storeMap.dominos] : [],
      originalPrice: 15,
      flashSalePrice: 10,
      enabled: true,
      status: 'active' as const,
      termsAndConditions: [
        'Valid for dine-in and delivery',
        'Cannot be combined with other offers',
        'Valid until stock lasts',
      ],
      minimumPurchase: 0,
      maximumDiscount: 5,
      promoCode: 'FLASH33',
      viewCount: 1250,
      clickCount: 456,
      purchaseCount: 67,
      uniqueCustomers: 65,
      notifyOnStart: true,
      notifyOnEndingSoon: true,
      notifyOnLowStock: true,
    },
    {
      title: 'Burger Bonanza',
      description: 'Double Whopper Combo - Get the ultimate burger experience at flash sale prices!',
      image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400',
      banner: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800',
      discountPercentage: 33,
      priority: 9,
      startTime: new Date(),
      endTime: futureDate(1),
      maxQuantity: 50,
      soldQuantity: 42,
      limitPerUser: 2,
      lowStockThreshold: 20,
      products: [],
      stores: storeMap.mcdonalds ? [storeMap.mcdonalds] : [],
      originalPrice: 12,
      flashSalePrice: 8,
      enabled: true,
      status: 'active' as const,
      termsAndConditions: [
        'Valid for delivery only',
        'Max 2 per customer',
        'While stocks last',
      ],
      minimumPurchase: 0,
      maximumDiscount: 4,
      promoCode: 'BKFLASH',
      viewCount: 2100,
      clickCount: 789,
      purchaseCount: 42,
      uniqueCustomers: 40,
      notifyOnStart: true,
      notifyOnEndingSoon: true,
      notifyOnLowStock: true,
    },
    {
      title: 'Coffee Rush Hour',
      description: 'Any Grande Drink - Premium coffee at flash sale prices! Perfect for your morning boost.',
      image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400',
      banner: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800',
      discountPercentage: 33,
      priority: 8,
      startTime: new Date(),
      endTime: futureDate(0.5),
      maxQuantity: 200,
      soldQuantity: 156,
      limitPerUser: 3,
      lowStockThreshold: 25,
      products: [],
      stores: storeMap.starbucks ? [storeMap.starbucks] : [],
      originalPrice: 6,
      flashSalePrice: 4,
      enabled: true,
      status: 'ending_soon' as const,
      termsAndConditions: [
        'Valid on all Grande drinks',
        'In-store only',
        'One per customer per visit',
      ],
      minimumPurchase: 0,
      maximumDiscount: 2,
      promoCode: 'COFFEE33',
      viewCount: 3400,
      clickCount: 890,
      purchaseCount: 156,
      uniqueCustomers: 145,
      notifyOnStart: true,
      notifyOnEndingSoon: true,
      notifyOnLowStock: true,
    },
    {
      title: 'Crispy Chicken Special',
      description: '8pc Bucket Meal - Finger-lickin good chicken at amazing flash sale prices!',
      image: 'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=400',
      banner: 'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=800',
      discountPercentage: 33,
      priority: 7,
      startTime: new Date(),
      endTime: futureDate(3),
      maxQuantity: 75,
      soldQuantity: 23,
      limitPerUser: 2,
      lowStockThreshold: 20,
      products: [],
      stores: storeMap.kfc ? [storeMap.kfc] : [],
      originalPrice: 18,
      flashSalePrice: 12,
      enabled: true,
      status: 'active' as const,
      termsAndConditions: [
        'Valid for delivery and dine-in',
        'Cannot combine with other offers',
        'Subject to availability',
      ],
      minimumPurchase: 0,
      maximumDiscount: 6,
      promoCode: 'CRISPY33',
      viewCount: 890,
      clickCount: 234,
      purchaseCount: 23,
      uniqueCustomers: 22,
      notifyOnStart: true,
      notifyOnEndingSoon: true,
      notifyOnLowStock: true,
    },
  ];

  const flashSales = await FlashSale.insertMany(flashSalesData);
  console.log(`✅ Created ${flashSales.length} flash sales`);

  return flashSales.map((fs) => fs._id as mongoose.Types.ObjectId);
}

async function seedCoupons(adminId: mongoose.Types.ObjectId, storeMap: StoreMap): Promise<void> {
  console.log('\n🎟️ Seeding Coupons (Promo Codes)...');

  // Delete existing coupons with these codes
  await Coupon.deleteMany({
    couponCode: { $in: ['FLASH33', 'BKFLASH', 'COFFEE33', 'CRISPY33'] },
  });

  const couponsData = [
    {
      couponCode: 'FLASH33',
      title: 'Flash Pizza Deal - 33% Off',
      description: 'Get 33% off on our Flash Pizza Deal! Valid for Limited Time only.',
      discountType: 'PERCENTAGE' as const,
      discountValue: 33,
      minOrderValue: 0,
      maxDiscountCap: 50,
      validFrom: new Date(),
      validTo: futureDate(24 * 7), // 7 days
      usageLimit: {
        totalUsage: 1000,
        perUser: 2,
        usedCount: 67,
      },
      applicableTo: {
        categories: [],
        products: [],
        stores: storeMap.dominos ? [storeMap.dominos] : [],
        userTiers: ['all'],
      },
      autoApply: false,
      autoApplyPriority: 0,
      status: 'active' as const,
      termsAndConditions: [
        'Valid on Flash Pizza Deal only',
        'Max 2 uses per customer',
        'Cannot be combined with other offers',
      ],
      createdBy: adminId,
      tags: ['flash-sale', 'pizza', 'discount'],
      imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400',
      isNewlyAdded: true,
      isFeatured: true,
      viewCount: 500,
      claimCount: 200,
      usageCount: 67,
    },
    {
      couponCode: 'BKFLASH',
      title: 'Burger Bonanza - 33% Off',
      description: 'Get 33% off on our Burger Bonanza Deal! Limited time flash sale.',
      discountType: 'PERCENTAGE' as const,
      discountValue: 33,
      minOrderValue: 0,
      maxDiscountCap: 40,
      validFrom: new Date(),
      validTo: futureDate(24 * 7),
      usageLimit: {
        totalUsage: 500,
        perUser: 2,
        usedCount: 42,
      },
      applicableTo: {
        categories: [],
        products: [],
        stores: storeMap.mcdonalds ? [storeMap.mcdonalds] : [],
        userTiers: ['all'],
      },
      autoApply: false,
      autoApplyPriority: 0,
      status: 'active' as const,
      termsAndConditions: [
        'Valid on Burger Bonanza only',
        'Max 2 uses per customer',
        'Delivery orders only',
      ],
      createdBy: adminId,
      tags: ['flash-sale', 'burger', 'discount'],
      imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400',
      isNewlyAdded: true,
      isFeatured: true,
      viewCount: 400,
      claimCount: 150,
      usageCount: 42,
    },
    {
      couponCode: 'COFFEE33',
      title: 'Coffee Rush Hour - 33% Off',
      description: 'Get 33% off on any Grande drink at Starbucks!',
      discountType: 'PERCENTAGE' as const,
      discountValue: 33,
      minOrderValue: 0,
      maxDiscountCap: 20,
      validFrom: new Date(),
      validTo: futureDate(24 * 3),
      usageLimit: {
        totalUsage: 2000,
        perUser: 3,
        usedCount: 156,
      },
      applicableTo: {
        categories: [],
        products: [],
        stores: storeMap.starbucks ? [storeMap.starbucks] : [],
        userTiers: ['all'],
      },
      autoApply: false,
      autoApplyPriority: 0,
      status: 'active' as const,
      termsAndConditions: [
        'Valid on Grande drinks only',
        'In-store redemption only',
        'Max 3 uses per customer',
      ],
      createdBy: adminId,
      tags: ['flash-sale', 'coffee', 'starbucks'],
      imageUrl: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400',
      isNewlyAdded: true,
      isFeatured: false,
      viewCount: 600,
      claimCount: 300,
      usageCount: 156,
    },
    {
      couponCode: 'CRISPY33',
      title: 'Crispy Chicken - 33% Off',
      description: 'Get 33% off on our 8pc Bucket Meal at KFC!',
      discountType: 'PERCENTAGE' as const,
      discountValue: 33,
      minOrderValue: 0,
      maxDiscountCap: 60,
      validFrom: new Date(),
      validTo: futureDate(24 * 7),
      usageLimit: {
        totalUsage: 750,
        perUser: 2,
        usedCount: 23,
      },
      applicableTo: {
        categories: [],
        products: [],
        stores: storeMap.kfc ? [storeMap.kfc] : [],
        userTiers: ['all'],
      },
      autoApply: false,
      autoApplyPriority: 0,
      status: 'active' as const,
      termsAndConditions: [
        'Valid on 8pc Bucket Meal only',
        'Max 2 uses per customer',
        'Valid for delivery and dine-in',
      ],
      createdBy: adminId,
      tags: ['flash-sale', 'chicken', 'kfc'],
      imageUrl: 'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=400',
      isNewlyAdded: true,
      isFeatured: false,
      viewCount: 300,
      claimCount: 100,
      usageCount: 23,
    },
  ];

  const coupons = await Coupon.insertMany(couponsData);
  console.log(`✅ Created ${coupons.length} coupon codes`);
}

async function seedFriendRedemptions(
  userIds: mongoose.Types.ObjectId[],
  offerIds: mongoose.Types.ObjectId[]
): Promise<void> {
  console.log('\n👥 Seeding Friend Redemptions...');

  // Clear existing friend redemptions
  await FriendRedemption.deleteMany({});

  // If no users or offers, use mock ObjectIds
  const mockUserId = new mongoose.Types.ObjectId();
  const mockOfferId = new mongoose.Types.ObjectId();

  const friendRedemptionsData = [
    {
      userId: userIds[0] || mockUserId,
      friendId: userIds[1] || new mongoose.Types.ObjectId(),
      friendName: 'Rahul S.',
      friendAvatar: 'https://randomuser.me/api/portraits/men/1.jpg',
      offerId: offerIds[0] || mockOfferId,
      offerTitle: '50% Off Pizza',
      offerImage: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400',
      storeName: 'Dominos',
      storeLogo: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=200&h=200&fit=crop',
      savings: 8.5,
      cashbackPercentage: 15,
      redeemedAt: pastDate(2),
      isVisible: true,
    },
    {
      userId: userIds[0] || mockUserId,
      friendId: userIds[2] || new mongoose.Types.ObjectId(),
      friendName: 'Priya M.',
      friendAvatar: 'https://randomuser.me/api/portraits/women/2.jpg',
      offerId: offerIds[1] || mockOfferId,
      offerTitle: 'Free Coffee',
      offerImage: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400',
      storeName: 'Starbucks',
      storeLogo: 'https://upload.wikimedia.org/wikipedia/en/thumb/d/d3/Starbucks_Corporation_Logo_2011.svg/200px-Starbucks_Corporation_Logo_2011.svg.png',
      savings: 5.0,
      cashbackPercentage: 20,
      redeemedAt: pastDate(4),
      isVisible: true,
    },
    {
      userId: userIds[0] || mockUserId,
      friendId: userIds[3] || new mongoose.Types.ObjectId(),
      friendName: 'Arjun K.',
      friendAvatar: 'https://randomuser.me/api/portraits/men/3.jpg',
      offerId: offerIds[2] || mockOfferId,
      offerTitle: 'Burger Combo',
      offerImage: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400',
      storeName: 'Burger King',
      storeLogo: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=200&h=200&fit=crop',
      savings: 6.0,
      cashbackPercentage: 10,
      redeemedAt: pastDate(6),
      isVisible: true,
    },
    {
      userId: userIds[0] || mockUserId,
      friendId: userIds[4] || new mongoose.Types.ObjectId(),
      friendName: 'Sneha R.',
      friendAvatar: 'https://randomuser.me/api/portraits/women/4.jpg',
      offerId: offerIds[3] || mockOfferId,
      offerTitle: 'Sushi Platter',
      offerImage: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=400',
      storeName: 'Sushi Express',
      storeLogo: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=200&h=200&fit=crop',
      savings: 12.0,
      cashbackPercentage: 12,
      redeemedAt: pastDate(8),
      isVisible: true,
    },
  ];

  const redemptions = await FriendRedemption.insertMany(friendRedemptionsData);
  console.log(`✅ Created ${redemptions.length} friend redemptions`);
}

async function main() {
  console.log('🚀 Starting Offers Page Seeds...\n');

  try {
    // Connect to MongoDB
    const mongoUri =
      process.env.MONGODB_URI ||
      (process.env.MONGODB_URI || process.env.MONGO_URI) as string;
if (!mongoUri) { console.error('MONGODB_URI or MONGO_URI not set'); process.exit(1); };

    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Get store IDs from database
    const storeMap = await getStoreIds();

    // Get or create admin user
    const adminId = await getOrCreateAdminUser();
    console.log('Admin ID:', adminId);

    // Get sample users for friend redemptions
    const userIds = await getSampleUsers();
    console.log('User IDs:', userIds.length);

    // Get sample offers for friend redemptions
    const offerIds = await getSampleOffers();
    console.log('Offer IDs:', offerIds.length);

    // Seed flash sales
    await seedFlashSales(storeMap);

    // Seed coupons
    await seedCoupons(adminId, storeMap);

    // Seed friend redemptions
    await seedFriendRedemptions(userIds, offerIds);

    // Print summary
    console.log('\n📊 Seeding Summary:');
    const flashSaleCount = await FlashSale.countDocuments();
    const couponCount = await Coupon.countDocuments({
      couponCode: { $in: ['FLASH33', 'BKFLASH', 'COFFEE33', 'CRISPY33'] },
    });
    const friendRedemptionCount = await FriendRedemption.countDocuments();

    console.log(`- Flash Sales: ${flashSaleCount}`);
    console.log(`- Promo Coupons: ${couponCount}`);
    console.log(`- Friend Redemptions: ${friendRedemptionCount}`);

    console.log('\n✅ All seeds completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n📡 Disconnected from MongoDB');
  }
}

// Run the seeder
main();
