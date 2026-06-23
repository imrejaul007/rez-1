/**
 * Privé Offer Seed Data
 *
 * Run with: npx ts-node src/seeds/priveOfferSeeds.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

import PriveOffer from '../models/PriveOffer';

const priveOffers = [
  // Elite tier offers
  {
    title: 'Private Preview Event',
    subtitle: 'Exclusive collection launch at Artisan Watch Co',
    description:
      'Be among the first to preview our upcoming luxury timepiece collection. Enjoy champagne, private viewings, and a personal consultation with our master horologist. Attendees receive priority access to limited editions.',
    shortDescription: 'Exclusive preview of upcoming luxury watch collection with VIP treatment.',
    brand: {
      name: 'Artisan Watch Co',
      logo: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100',
    },
    type: 'experience',
    reward: {
      type: 'coins',
      value: 500,
      coinType: 'prive',
      displayText: '500 Privé Coins',
    },
    tierRequired: 'elite',
    isExclusive: true,
    startsAt: new Date(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    isActive: true,
    images: [
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800',
      'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800',
    ],
    coverImage: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1200',
    terms: [
      'Valid for elite tier members only',
      'RSVP required 48 hours in advance',
      'Limited to 20 guests per event',
      'Smart casual dress code required',
    ],
    howToRedeem: [
      'Tap "Reserve Spot" to confirm attendance',
      'Show your Privé member card at the venue',
      'Enjoy your exclusive preview experience',
    ],
    category: 'Experiences',
    tags: ['luxury', 'watches', 'exclusive', 'event'],
    priority: 100,
    isFeatured: true,
  },
  {
    title: 'Elite Cashback Boost',
    subtitle: '15% cashback on all luxury purchases',
    description:
      'As an elite member, enjoy an exclusive 15% cashback on all purchases at our premium partner stores. This limited-time offer includes fashion, jewelry, electronics, and dining.',
    shortDescription: 'Exclusive 15% cashback for elite members on luxury purchases.',
    brand: {
      name: 'ReZ Premium',
      logo: 'https://images.unsplash.com/photo-1560472355-536de3962603?w=100',
    },
    type: 'cashback',
    reward: {
      type: 'percentage',
      value: 15,
      displayText: '15% Cashback',
    },
    tierRequired: 'elite',
    isExclusive: true,
    startsAt: new Date(),
    expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
    isActive: true,
    images: ['https://images.unsplash.com/photo-1560472355-536de3962603?w=800'],
    coverImage: 'https://images.unsplash.com/photo-1560472355-536de3962603?w=1200',
    terms: [
      'Maximum cashback of 5000 coins per transaction',
      'Valid at participating premium partners only',
      'Cannot be combined with other offers',
    ],
    howToRedeem: [
      'Make a purchase at any premium partner store',
      'Pay using ReZ Pay or linked card',
      'Cashback credited within 24 hours',
    ],
    category: 'Cashback',
    tags: ['cashback', 'premium', 'shopping'],
    priority: 95,
    isFeatured: true,
  },

  // Signature tier offers
  {
    title: 'Gourmet Dining Experience',
    subtitle: 'Complimentary dessert at Sapore Italiano',
    description:
      'Indulge in authentic Italian cuisine at Sapore Italiano. As a signature member, receive a complimentary chef\'s special dessert with any main course order. Experience the taste of Italy in the heart of the city.',
    shortDescription: 'Free chef\'s special dessert with your Italian dining experience.',
    brand: {
      name: 'Sapore Italiano',
      logo: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=100',
    },
    type: 'freebie',
    reward: {
      type: 'fixed',
      value: 0,
      displayText: 'Free Dessert',
    },
    tierRequired: 'signature',
    isExclusive: false,
    startsAt: new Date(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    isActive: true,
    images: [
      'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800',
      'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=800',
    ],
    coverImage: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200',
    terms: [
      'Valid with main course order only',
      'One dessert per table',
      'Dine-in only',
      'Subject to availability',
    ],
    howToRedeem: [
      'Make a reservation mentioning ReZ Privé',
      'Show your Privé member card',
      'Order any main course',
      'Enjoy your complimentary dessert',
    ],
    category: 'Dining',
    tags: ['dining', 'italian', 'dessert', 'restaurant'],
    priority: 80,
    isFeatured: true,
  },
  {
    title: 'Fashion Forward',
    subtitle: '300 Bonus Coins at Style Avenue',
    description:
      'Shop the latest fashion trends at Style Avenue and earn 300 bonus Privé coins on purchases over $100. From designer wear to accessories, refresh your wardrobe while earning rewards.',
    shortDescription: 'Earn 300 bonus coins on fashion purchases over $100.',
    brand: {
      name: 'Style Avenue',
      logo: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=100',
    },
    type: 'discount',
    reward: {
      type: 'coins',
      value: 300,
      coinType: 'prive',
      displayText: '300 Privé Coins',
    },
    tierRequired: 'signature',
    isExclusive: false,
    startsAt: new Date(),
    expiresAt: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // 21 days
    isActive: true,
    images: ['https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800'],
    coverImage: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200',
    terms: [
      'Minimum purchase of $100 required',
      'Valid on full-price items only',
      'One redemption per customer per day',
    ],
    howToRedeem: [
      'Shop at any Style Avenue location',
      'Spend $100 or more',
      'Scan your Privé QR at checkout',
      'Bonus coins credited instantly',
    ],
    category: 'Fashion',
    tags: ['fashion', 'shopping', 'clothing', 'bonus'],
    priority: 75,
    isFeatured: false,
  },
  {
    title: 'Spa & Wellness Retreat',
    subtitle: '20% off premium spa packages',
    description:
      'Relax and rejuvenate at Serenity Spa with an exclusive 20% discount on all premium spa packages. From deep tissue massages to aromatherapy sessions, treat yourself to ultimate relaxation.',
    shortDescription: '20% discount on all premium spa and wellness packages.',
    brand: {
      name: 'Serenity Spa',
      logo: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=100',
    },
    type: 'discount',
    reward: {
      type: 'percentage',
      value: 20,
      displayText: '20% Off',
    },
    tierRequired: 'signature',
    isExclusive: false,
    startsAt: new Date(),
    expiresAt: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 days
    isActive: true,
    images: ['https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800'],
    coverImage: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=1200',
    terms: [
      'Valid on premium packages only',
      'Advance booking required',
      'Not valid on public holidays',
      'Cannot be combined with other promotions',
    ],
    howToRedeem: [
      'Book online or call Serenity Spa',
      'Mention your Privé membership',
      'Present your member card at arrival',
      'Enjoy 20% off your bill',
    ],
    category: 'Wellness',
    tags: ['spa', 'wellness', 'relaxation', 'massage'],
    priority: 70,
    isFeatured: false,
  },

  // Entry tier offers
  {
    title: 'Coffee Lovers Reward',
    subtitle: 'Double coins at Brew Masters',
    description:
      'Start your day right with Brew Masters. Earn double ReZ coins on every purchase at participating Brew Masters locations. From espresso to cold brew, every sip counts double!',
    shortDescription: 'Earn 2x coins on all coffee purchases at Brew Masters.',
    brand: {
      name: 'Brew Masters',
      logo: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=100',
    },
    type: 'discount',
    reward: {
      type: 'coins',
      value: 2,
      coinType: 'rez',
      displayText: '2x ReZ Coins',
    },
    tierRequired: 'entry',
    isExclusive: false,
    startsAt: new Date(),
    expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
    isActive: true,
    images: ['https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800'],
    coverImage: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=1200',
    terms: [
      'Valid at participating locations',
      'Standard coin earning rules apply',
      'Double coins calculated at checkout',
    ],
    howToRedeem: [
      'Visit any Brew Masters location',
      'Order your favorite drink',
      'Pay with ReZ Pay',
      'Automatically earn 2x coins',
    ],
    category: 'Dining',
    tags: ['coffee', 'cafe', 'drinks', 'bonus'],
    priority: 60,
    isFeatured: true,
  },
  {
    title: 'Weekend Movie Treat',
    subtitle: '100 bonus coins on weekend tickets',
    description:
      'Make your weekends special with CineMax! Earn 100 bonus ReZ coins when you book any movie ticket for Friday, Saturday, or Sunday shows. Popcorn cravings included separately.',
    shortDescription: '100 bonus coins on weekend movie tickets.',
    brand: {
      name: 'CineMax',
      logo: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=100',
    },
    type: 'discount',
    reward: {
      type: 'coins',
      value: 100,
      coinType: 'rez',
      displayText: '100 ReZ Coins',
    },
    tierRequired: 'entry',
    isExclusive: false,
    startsAt: new Date(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    isActive: true,
    images: ['https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800'],
    coverImage: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1200',
    terms: [
      'Valid for Fri-Sun shows only',
      'One bonus per transaction',
      'Book through CineMax app or website',
    ],
    howToRedeem: [
      'Book your weekend movie ticket',
      'Link your ReZ account',
      'Bonus coins credited after movie',
    ],
    category: 'Entertainment',
    tags: ['movies', 'cinema', 'entertainment', 'weekend'],
    priority: 55,
    isFeatured: false,
  },
  {
    title: 'Fitness First',
    subtitle: 'Free trial week at FitZone',
    description:
      'Kickstart your fitness journey with a complimentary week at FitZone gym. Access all equipment, group classes, and amenities. No commitment, just gains!',
    shortDescription: 'Free 7-day trial at FitZone with full access.',
    brand: {
      name: 'FitZone',
      logo: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=100',
    },
    type: 'freebie',
    reward: {
      type: 'fixed',
      value: 0,
      displayText: 'Free Week',
    },
    tierRequired: 'entry',
    isExclusive: false,
    startsAt: new Date(),
    expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
    isActive: true,
    images: ['https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800'],
    coverImage: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200',
    terms: [
      'New FitZone members only',
      'Valid ID required',
      'One trial per person',
      'Must be 18+ years old',
    ],
    howToRedeem: [
      'Visit any FitZone location',
      'Show your Privé member status',
      'Complete a quick registration',
      'Start your free week immediately',
    ],
    category: 'Fitness',
    tags: ['gym', 'fitness', 'health', 'trial'],
    priority: 50,
    isFeatured: false,
  },

  // Building tier offers
  {
    title: 'New Member Welcome',
    subtitle: '50 bonus coins on first purchase',
    description:
      'Welcome to Privé! Get 50 bonus ReZ coins on your very first purchase at any partner store. Start your rewards journey on the right foot.',
    shortDescription: 'Welcome bonus of 50 coins on your first partner store purchase.',
    brand: {
      name: 'ReZ Rewards',
      logo: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=100',
    },
    type: 'discount',
    reward: {
      type: 'coins',
      value: 50,
      coinType: 'rez',
      displayText: '50 ReZ Coins',
    },
    tierRequired: 'none',
    isExclusive: false,
    startsAt: new Date(),
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
    isActive: true,
    images: ['https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800'],
    coverImage: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200',
    terms: [
      'First purchase only',
      'Minimum spend of $10',
      'One welcome bonus per account',
    ],
    howToRedeem: [
      'Make your first purchase at any partner',
      'Pay using ReZ Pay',
      'Bonus coins credited automatically',
    ],
    category: 'Rewards',
    tags: ['welcome', 'bonus', 'new member', 'first purchase'],
    priority: 40,
    isFeatured: false,
    limitPerUser: 1,
  },
  {
    title: 'Quick Bites Deal',
    subtitle: '10% off at FastFood Partners',
    description:
      'Hungry for a deal? Enjoy 10% off at participating fast food partners. From burgers to wraps, satisfy your cravings while saving.',
    shortDescription: '10% discount at fast food partner restaurants.',
    brand: {
      name: 'Partner Restaurants',
      logo: 'https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=100',
    },
    type: 'discount',
    reward: {
      type: 'percentage',
      value: 10,
      displayText: '10% Off',
    },
    tierRequired: 'none',
    isExclusive: false,
    startsAt: new Date(),
    expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
    isActive: true,
    images: ['https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=800'],
    coverImage: 'https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=1200',
    terms: [
      'Valid at participating locations',
      'Maximum discount of $5',
      'Dine-in and takeaway',
    ],
    howToRedeem: [
      'Order at a participating restaurant',
      'Show your Privé QR code',
      'Discount applied at checkout',
    ],
    category: 'Dining',
    tags: ['food', 'fast food', 'discount', 'dining'],
    priority: 35,
    isFeatured: false,
  },
  {
    title: 'Grocery Saver',
    subtitle: '5% cashback on groceries',
    description:
      'Save on your weekly grocery shopping! Get 5% cashback on all purchases at MegaMart and FreshMart stores. Stock up and earn back.',
    shortDescription: '5% cashback on grocery purchases at partner stores.',
    brand: {
      name: 'MegaMart',
      logo: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=100',
    },
    type: 'cashback',
    reward: {
      type: 'percentage',
      value: 5,
      displayText: '5% Cashback',
    },
    tierRequired: 'none',
    isExclusive: false,
    startsAt: new Date(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    isActive: true,
    images: ['https://images.unsplash.com/photo-1542838132-92c53300491e?w=800'],
    coverImage: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200',
    terms: [
      'Valid at MegaMart and FreshMart only',
      'Maximum cashback of 200 coins per week',
      'Excludes alcohol and tobacco',
    ],
    howToRedeem: [
      'Shop at participating grocery stores',
      'Pay with ReZ Pay or linked card',
      'Cashback credited within 48 hours',
    ],
    category: 'Groceries',
    tags: ['groceries', 'cashback', 'shopping', 'savings'],
    priority: 30,
    isFeatured: false,
  },

  // Special Event Offer
  {
    title: 'New Year Celebration',
    subtitle: 'Triple coins on all purchases',
    description:
      'Ring in the New Year with triple rewards! For a limited time, earn 3x ReZ coins on all purchases at partner stores. The more you shop, the more you celebrate!',
    shortDescription: 'Earn triple coins on all purchases during the celebration.',
    brand: {
      name: 'ReZ Celebration',
      logo: 'https://images.unsplash.com/photo-1467810563316-b5476525c0f9?w=100',
    },
    type: 'event',
    reward: {
      type: 'coins',
      value: 3,
      coinType: 'rez',
      displayText: '3x ReZ Coins',
    },
    tierRequired: 'none',
    isExclusive: false,
    startsAt: new Date(),
    expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days
    isActive: true,
    images: ['https://images.unsplash.com/photo-1467810563316-b5476525c0f9?w=800'],
    coverImage: 'https://images.unsplash.com/photo-1467810563316-b5476525c0f9?w=1200',
    terms: [
      'Valid at all partner stores',
      'Triple coins on base earning',
      'Limited time offer',
    ],
    howToRedeem: [
      'Shop at any partner store',
      'Pay with ReZ Pay',
      'Triple coins credited automatically',
    ],
    category: 'Events',
    tags: ['celebration', 'bonus', 'event', 'triple'],
    priority: 90,
    isFeatured: true,
  },
];

async function seedPriveOffers() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/rez';
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Clear existing offers
    await PriveOffer.deleteMany({});
    console.log('Cleared existing Privé offers');

    // Insert new offers
    const result = await PriveOffer.insertMany(priveOffers);
    console.log(`Successfully seeded ${result.length} Privé offers`);

    // Log summary by tier
    const tierCounts = priveOffers.reduce(
      (acc, offer) => {
        acc[offer.tierRequired] = (acc[offer.tierRequired] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
    console.log('Offers by tier:', tierCounts);

    // Log featured count
    const featuredCount = priveOffers.filter((o) => o.isFeatured).length;
    console.log(`Featured offers: ${featuredCount}`);

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding Privé offers:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  seedPriveOffers();
}

export { priveOffers, seedPriveOffers };
