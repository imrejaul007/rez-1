import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Offer from '../src/models/Offer';
import { Store } from '../src/models/Store';
import { User } from '../src/models/User';

dotenv.config();

async function seedOffers() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rez-app');
    console.log('✅ Connected to MongoDB');

    // Get test user to be the creator
    const testUserId = '68ef4d41061faaf045222506';
    const user = await User.findById(testUserId);
    if (!user) {
      console.log('❌ Test user not found!');
      process.exit(1);
    }
    console.log(`✅ Found creator user: ${user.email}`);

    // Get some stores to associate with offers
    const stores = await Store.find().limit(5);
    if (stores.length === 0) {
      console.log('⚠️  No stores found. Creating sample store...');
      const sampleStore = new Store({
        name: 'Sample Store',
        slug: 'sample-store',
        logo: 'https://i.imgur.com/placeholder.jpg',
        verified: true,
        location: {
          address: 'Sample Address',
          city: 'Delhi',
          state: 'Delhi',
          pincode: '110001',
          coordinates: [77.2090, 28.6139]
        },
        contactInfo: {
          phone: '+91-11-1234-5678',
          email: 'info@samplestore.com'
        }
      });
      await sampleStore.save();
      stores.push(sampleStore);
    }

    const offerTemplates = [
      {
        title: 'Mega Electronics Sale',
        subtitle: 'Up to 30% OFF',
        description: 'Get flat 30% discount on all electronics items. Limited time offer!',
        image: 'https://i.imgur.com/electronics-offer.jpg',
        category: 'electronics' as const,
        type: 'discount' as const,
        cashbackPercentage: 30,
        originalPrice: 5000,
        discountedPrice: 3500
      },
      {
        title: 'Fashion Bonanza',
        subtitle: 'Cashback up to 25%',
        description: 'Shop fashion and get amazing cashback on every purchase.',
        image: 'https://i.imgur.com/fashion-offer.jpg',
        category: 'fashion' as const,
        type: 'cashback' as const,
        cashbackPercentage: 25,
        originalPrice: 2000,
        discountedPrice: 1500
      },
      {
        title: 'Food Delivery Offers',
        subtitle: 'Get 20% Cashback',
        description: 'Order your favorite food and get 20% cashback.',
        image: 'https://i.imgur.com/food-offer.jpg',
        category: 'food' as const,
        type: 'cashback' as const,
        cashbackPercentage: 20,
        originalPrice: 500,
        discountedPrice: 400
      },
      {
        title: 'New Arrival: Student Special',
        subtitle: 'Exclusive for Students',
        description: 'Special discounts for students on all categories.',
        image: 'https://i.imgur.com/student-offer.jpg',
        category: 'student' as const,
        type: 'special' as const,
        cashbackPercentage: 15,
        originalPrice: 1000,
        discountedPrice: 850
      },
      {
        title: 'Trending Deal: Electronics',
        subtitle: 'Hot Selling Items',
        description: 'Grab the trending electronics at amazing prices.',
        image: 'https://i.imgur.com/trending-offer.jpg',
        category: 'trending' as const,
        type: 'discount' as const,
        cashbackPercentage: 35,
        originalPrice: 8000,
        discountedPrice: 5200
      },
      {
        title: 'Gift Voucher Bonanza',
        subtitle: 'Buy Vouchers & Save',
        description: 'Purchase gift vouchers and get extra cashback.',
        image: 'https://i.imgur.com/voucher-offer.jpg',
        category: 'general' as const,
        type: 'voucher' as const,
        cashbackPercentage: 10,
        originalPrice: 1000,
        discountedPrice: 900
      },
      {
        title: 'Combo Offer: Fashion + Accessories',
        subtitle: 'Buy Together & Save',
        description: 'Get amazing deals when you buy fashion combos.',
        image: 'https://i.imgur.com/combo-offer.jpg',
        category: 'fashion' as const,
        type: 'combo' as const,
        cashbackPercentage: 40,
        originalPrice: 3000,
        discountedPrice: 1800
      },
      {
        title: 'Mega Sale: All Categories',
        subtitle: 'Up to 50% OFF',
        description: 'Shop across all categories and save big!',
        image: 'https://i.imgur.com/mega-offer.jpg',
        category: 'mega' as const,
        type: 'special' as const,
        cashbackPercentage: 50,
        originalPrice: 10000,
        discountedPrice: 5000
      }
    ];

    console.log('🧹 Checking existing offers...');
    const existingCount = await Offer.countDocuments();
    console.log(`📊 Current offers count: ${existingCount}`);

    console.log('🌱 Seeding new offers...');

    let seededCount = 0;

    for (const offerTemplate of offerTemplates) {
      const existingOffer = await Offer.findOne({ title: offerTemplate.title });

      if (existingOffer) {
        console.log(`⚠️  "${offerTemplate.title}" already exists, skipping...`);
        continue;
      }

      // Create offer with common fields
      const storeData = stores[seededCount % stores.length];
      const startDate = new Date();
      const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const offerData: any = {
        ...offerTemplate,
        createdBy: testUserId,
        location: {
          type: 'Point',
          coordinates: storeData.location?.coordinates || [77.2090, 28.6139]
        },
        store: {
          id: storeData._id,
          name: storeData.name,
          logo: storeData.logo,
          rating: (storeData as any).ratings?.average || 4.0
        },
        validity: {
          startDate,
          endDate
        },
        validFrom: startDate,
        validUntil: endDate,
        isActive: true,
        isFeatured: seededCount < 3, // First 3 offers are featured
        redemptionInstructions: [
          'Show this offer at the store',
          'Valid for single use per user',
          'Cannot be combined with other offers'
        ],
        termsAndConditions: [
          'Offer valid for limited time only',
          'Cannot be combined with other offers',
          'Non-refundable and non-transferable',
          'Subject to availability',
          'Terms and conditions apply'
        ]
      };

      const offer = new Offer(offerData);
      await offer.save();
      console.log(`✅ Created offer: ${offerTemplate.title}`);
      seededCount++;
    }

    const finalCount = await Offer.countDocuments();
    console.log(`\n📊 Final offers count: ${finalCount}`);
    console.log(`✅ Successfully seeded ${seededCount} new offers!`);

    // Display all offers
    const allOffers = await Offer.find()
      .select('title type cashbackPercentage category isActive store');

    console.log('\n📋 All Offers:');
    allOffers.forEach((offer, i) => {
      const storeName = (offer.store as any)?.name || 'N/A';
      console.log(`${i + 1}. ${offer.title} (${offer.type}) - ${offer.cashbackPercentage}% | Store: ${storeName} | Category: ${offer.category}`);
    });

    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error seeding offers:', error);
    process.exit(1);
  }
}

seedOffers();
