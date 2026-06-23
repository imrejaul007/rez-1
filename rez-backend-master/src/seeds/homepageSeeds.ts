/**
 * Homepage Seeds - Seed data for homepage sections
 * Includes: Campaigns, Store Experiences, Service Categories, Event Categories
 */

import mongoose from 'mongoose';
import Campaign from '../models/Campaign';
import StoreExperience from '../models/StoreExperience';
import { ServiceCategory } from '../models/ServiceCategory';
import Event from '../models/Event';
import { connectDatabase } from '../config/database';

// Campaign seed data (for ExcitingDealsSection)
const campaignSeeds = [
  {
    campaignId: 'super-cashback',
    title: 'Super Cashback Weekend',
    subtitle: 'Up to 50% cashback',
    badge: '50%',
    badgeBg: '#FFFFFF',
    badgeColor: '#0B2240',
    gradientColors: ['rgba(16, 185, 129, 0.2)', 'rgba(20, 184, 166, 0.1)'],
    type: 'cashback',
    deals: [
      { store: 'Electronics Hub', cashback: '40%', image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=300' },
      { store: 'Fashion Central', cashback: '50%', image: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=300' },
      { store: 'Home Decor', cashback: '35%', image: 'https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=300' },
    ],
    startTime: new Date(),
    endTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    isActive: true,
    priority: 100,
  },
  {
    campaignId: 'triple-coin-day',
    title: 'Triple Coin Day',
    subtitle: '3X coins on all spends',
    badge: '3X',
    badgeBg: '#FFFFFF',
    badgeColor: '#0B2240',
    gradientColors: ['rgba(245, 158, 11, 0.2)', 'rgba(249, 115, 22, 0.1)'],
    type: 'coins',
    deals: [
      { store: 'Grocery Mart', coins: '3000', image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=300' },
      { store: 'Beauty Palace', coins: '2500', image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=300' },
      { store: 'Fitness Zone', coins: '1800', image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=300' },
    ],
    startTime: new Date(),
    endTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    isActive: true,
    priority: 90,
  },
  {
    campaignId: 'mega-bank-offers',
    title: 'Mega Bank Offers',
    subtitle: 'HDFC, ICICI, SBI, Axis',
    badge: 'BANKS',
    badgeBg: '#0B2240',
    badgeColor: '#FFFFFF',
    gradientColors: ['rgba(59, 130, 246, 0.2)', 'rgba(99, 102, 241, 0.1)'],
    type: 'bank',
    deals: [
      { store: 'HDFC Exclusive', cashback: '₹5000 off', image: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=300' },
      { store: 'ICICI Bonanza', cashback: '₹3000 off', image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=300' },
      { store: 'SBI Specials', cashback: '20% cashback', image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=300' },
    ],
    startTime: new Date(),
    endTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    isActive: true,
    priority: 85,
  },
  {
    campaignId: 'upload-bill-bonanza',
    title: 'Upload Bill Bonanza',
    subtitle: 'Extra ₹100 on every bill',
    badge: '+₹100',
    badgeBg: '#FFFFFF',
    badgeColor: '#8B5CF6',
    gradientColors: ['rgba(139, 92, 246, 0.2)', 'rgba(236, 72, 153, 0.1)'],
    type: 'bill',
    deals: [
      { store: 'Any Restaurant', bonus: '+₹100 coins', image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=300' },
      { store: 'Any Salon', bonus: '+₹150 coins', image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=300' },
      { store: 'Any Store', bonus: '+₹100 coins', image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=300' },
    ],
    startTime: new Date(),
    endTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    isActive: true,
    priority: 80,
  },
  {
    campaignId: 'flash-coin-drops',
    title: 'Flash Coin Drops',
    subtitle: 'Limited time only',
    badge: 'LIVE',
    badgeBg: '#FFFFFF',
    badgeColor: '#EC4899',
    gradientColors: ['rgba(239, 68, 68, 0.2)', 'rgba(249, 115, 22, 0.1)'],
    type: 'drop',
    deals: [
      { store: 'Nike Store', drop: '500 coins', endsIn: '2h', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300' },
      { store: 'Starbucks', drop: '300 coins', endsIn: '4h', image: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=300' },
      { store: 'Zara', drop: '400 coins', endsIn: '6h', image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=300' },
    ],
    startTime: new Date(),
    endTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    isActive: true,
    priority: 75,
  },
  {
    campaignId: 'new-user-bonanza',
    title: 'New User Bonanza',
    subtitle: 'First purchase rewards',
    badge: 'NEW',
    badgeBg: '#06B6D4',
    badgeColor: '#FFFFFF',
    gradientColors: ['rgba(34, 197, 94, 0.2)', 'rgba(16, 185, 129, 0.1)'],
    type: 'new-user',
    deals: [
      { store: 'First Order', bonus: '₹500 off', image: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=300' },
      { store: 'First Visit', bonus: '1000 coins', image: 'https://images.unsplash.com/photo-1555529902-5261145633bf?w=300' },
      { store: 'Sign Up Bonus', bonus: '₹300 cashback', image: 'https://images.unsplash.com/photo-1607082349566-187342175e2f?w=300' },
    ],
    startTime: new Date(),
    endTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    isActive: true,
    priority: 70,
  },
];

// Store Experience seed data (for ShopByExperienceSection)
const experienceSeeds = [
  {
    slug: 'sample-trial',
    title: 'Sample/Trial Store',
    subtitle: 'Try before you buy',
    description: 'Experience products before making a purchase. Get free samples and trial offers from top brands.',
    icon: '🧪',
    iconType: 'emoji',
    type: 'custom',
    gradientColors: ['rgba(59, 130, 246, 0.2)', 'rgba(6, 182, 212, 0.1)'],
    filterCriteria: {
      tags: ['sample', 'trial', 'test'],
    },
    sortOrder: 1,
    isActive: true,
    isFeatured: true,
  },
  {
    slug: '60-min-delivery',
    title: '60 Min Delivery',
    subtitle: 'Ultra-fast delivery',
    description: 'Get your orders delivered in 60 minutes or less. Perfect for urgent needs and last-minute shopping.',
    icon: '⚡',
    iconType: 'emoji',
    type: 'fastDelivery',
    gradientColors: ['rgba(249, 115, 22, 0.2)', 'rgba(239, 68, 68, 0.1)'],
    filterCriteria: {
      tags: ['fast-delivery', 'quick-commerce'],
      maxDeliveryTime: 60,
    },
    sortOrder: 2,
    isActive: true,
    isFeatured: true,
  },
  {
    slug: 'luxury',
    title: 'Luxury Store',
    subtitle: 'Premium brands',
    description: 'Indulge in premium shopping experiences with exclusive luxury brands and VIP treatment.',
    icon: '💎',
    iconType: 'emoji',
    type: 'luxury',
    gradientColors: ['rgba(139, 92, 246, 0.2)', 'rgba(236, 72, 153, 0.1)'],
    filterCriteria: {
      tags: ['luxury', 'premium', 'exclusive'],
      isPremium: true,
    },
    sortOrder: 3,
    isActive: true,
    isFeatured: true,
  },
  {
    slug: 'organic',
    title: 'Organic Store',
    subtitle: '100% natural',
    description: 'Shop 100% certified organic products. Healthy choices for you and sustainable for the planet.',
    icon: '🌿',
    iconType: 'emoji',
    type: 'organic',
    gradientColors: ['rgba(34, 197, 94, 0.2)', 'rgba(16, 185, 129, 0.1)'],
    filterCriteria: {
      tags: ['organic', 'natural', 'healthy'],
      isOrganic: true,
    },
    sortOrder: 4,
    isActive: true,
    isFeatured: true,
  },
  {
    slug: 'men',
    title: 'Men Store',
    subtitle: 'For modern men',
    description: "Curated collection of fashion, grooming, and lifestyle products exclusively for men.",
    icon: '👔',
    iconType: 'emoji',
    type: 'custom',
    gradientColors: ['rgba(107, 114, 128, 0.2)', 'rgba(100, 116, 139, 0.1)'],
    filterCriteria: {
      tags: ['men', 'mens-fashion', 'grooming'],
    },
    sortOrder: 5,
    isActive: true,
    isFeatured: true,
  },
  {
    slug: 'women',
    title: 'Women Store',
    subtitle: 'Curated for her',
    description: "Discover the latest in women's fashion, beauty, wellness, and lifestyle essentials.",
    icon: '👗',
    iconType: 'emoji',
    type: 'custom',
    gradientColors: ['rgba(236, 72, 153, 0.2)', 'rgba(244, 63, 94, 0.1)'],
    filterCriteria: {
      tags: ['women', 'womens-fashion', 'beauty'],
    },
    sortOrder: 6,
    isActive: true,
    isFeatured: true,
  },
  {
    slug: 'children',
    title: 'Children Store',
    subtitle: 'Kids essentials',
    description: 'Everything your little ones need - from toys and clothes to educational products.',
    icon: '🧸',
    iconType: 'emoji',
    type: 'custom',
    gradientColors: ['rgba(234, 179, 8, 0.2)', 'rgba(245, 158, 11, 0.1)'],
    filterCriteria: {
      tags: ['children', 'kids', 'toys', 'baby'],
    },
    sortOrder: 7,
    isActive: true,
    isFeatured: true,
  },
  {
    slug: 'rental',
    title: 'Rental Store',
    subtitle: 'Rent not buy',
    description: 'Rent high-quality products instead of buying. Perfect for special occasions and temporary needs.',
    icon: '🔄',
    iconType: 'emoji',
    type: 'custom',
    gradientColors: ['rgba(99, 102, 241, 0.2)', 'rgba(59, 130, 246, 0.1)'],
    filterCriteria: {
      tags: ['rental', 'rent', 'temporary'],
    },
    sortOrder: 8,
    isActive: true,
    isFeatured: true,
  },
  {
    slug: 'gifting',
    title: 'Gifting Store',
    subtitle: 'Perfect presents',
    description: 'Find the perfect gift for every occasion. From personalized items to luxury hampers.',
    icon: '🎁',
    iconType: 'emoji',
    type: 'custom',
    gradientColors: ['rgba(239, 68, 68, 0.2)', 'rgba(236, 72, 153, 0.1)'],
    filterCriteria: {
      tags: ['gifts', 'gifting', 'presents'],
    },
    sortOrder: 9,
    isActive: true,
    isFeatured: true,
  },
];

// Service Category seed data (for service sections)
const serviceCategorySeeds = [
  {
    name: 'Healthcare',
    slug: 'healthcare',
    description: 'Doctors, pharmacy, lab tests & health packages',
    icon: '👨‍⚕️',
    iconType: 'emoji',
    cashbackPercentage: 10,
    sortOrder: 1,
    isActive: true,
  },
  {
    name: 'Home Services',
    slug: 'home-services',
    description: 'Repair, cleaning, painting & more',
    icon: '🔧',
    iconType: 'emoji',
    cashbackPercentage: 15,
    sortOrder: 2,
    isActive: true,
  },
  {
    name: 'Financial Services',
    slug: 'financial-services',
    description: 'Bill payments, recharges, insurance & more',
    icon: '💳',
    iconType: 'emoji',
    cashbackPercentage: 5,
    sortOrder: 3,
    isActive: true,
  },
  {
    name: 'Travel',
    slug: 'travel',
    description: 'Flights, hotels, trains, buses & packages',
    icon: '✈️',
    iconType: 'emoji',
    cashbackPercentage: 8,
    sortOrder: 4,
    isActive: true,
  },
  {
    name: 'Beauty & Wellness',
    slug: 'beauty-wellness',
    description: 'Salon, spa & beauty products',
    icon: '💅',
    iconType: 'emoji',
    cashbackPercentage: 20,
    sortOrder: 5,
    isActive: true,
  },
  {
    name: 'Fitness & Sports',
    slug: 'fitness-sports',
    description: 'Gyms, studios & sports equipment',
    icon: '🏋️',
    iconType: 'emoji',
    cashbackPercentage: 12,
    sortOrder: 6,
    isActive: true,
  },
  {
    name: 'Grocery & Essentials',
    slug: 'grocery-essentials',
    description: 'Daily groceries & household essentials',
    icon: '🥬',
    iconType: 'emoji',
    cashbackPercentage: 5,
    sortOrder: 7,
    isActive: true,
  },
];

// Event seeds (for EventsExperiencesSection)
const eventSeeds = [
  {
    title: 'Weekend Movie Marathon',
    subtitle: 'Up to 20% off on bookings',
    description: 'Book your favorite movies with exclusive ReZ discounts',
    image: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400',
    price: { amount: 250, currency: '₹', isFree: false, discount: 20 },
    location: { name: 'PVR Cinemas', address: 'Koramangala', city: 'Bangalore', isOnline: false },
    date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    time: '18:00',
    category: 'Entertainment',
    organizer: { name: 'ReZ Entertainment', email: 'events@rez.app' },
    status: 'published',
    featured: true,
    priority: 100,
  },
  {
    title: 'Live Music Concert',
    subtitle: '2x coins on tickets',
    description: 'Experience live music with your favorite artists',
    image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400',
    price: { amount: 1500, currency: '₹', isFree: false },
    location: { name: 'Phoenix Arena', address: 'Whitefield', city: 'Bangalore', isOnline: false },
    date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    time: '19:00',
    category: 'Music',
    organizer: { name: 'LiveNation India', email: 'events@livenation.in' },
    status: 'published',
    featured: true,
    priority: 90,
  },
  {
    title: 'DIY Art Workshop',
    subtitle: 'Learn & create',
    description: 'Weekend pottery and painting workshop',
    image: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=400',
    price: { amount: 800, currency: '₹', isFree: false, discount: 15 },
    location: { name: 'Art Studio', address: 'Indiranagar', city: 'Bangalore', isOnline: false },
    date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    time: '10:00',
    category: 'Arts',
    organizer: { name: 'CreativeHub', email: 'workshops@creativehub.com' },
    status: 'published',
    featured: true,
    priority: 80,
  },
  {
    title: 'Theme Park Day Pass',
    subtitle: 'Family fun package',
    description: 'Full day access to all rides and attractions',
    image: 'https://images.unsplash.com/photo-1513889961551-628c1e5e2ee9?w=400',
    price: { amount: 1200, currency: '₹', isFree: false, discount: 25 },
    location: { name: 'Wonderla', address: 'Mysore Road', city: 'Bangalore', isOnline: false },
    date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    time: '10:00',
    category: 'Entertainment',
    organizer: { name: 'Wonderla Parks', email: 'booking@wonderla.com' },
    status: 'published',
    featured: true,
    priority: 85,
  },
  {
    title: 'Gaming Tournament',
    subtitle: 'Win big prizes',
    description: 'Compete in popular games and win prizes',
    image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400',
    price: { amount: 500, currency: '₹', isFree: false },
    location: { name: 'Game Arena', address: 'HSR Layout', city: 'Bangalore', isOnline: false },
    date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    time: '14:00',
    category: 'Entertainment',
    organizer: { name: 'ESports India', email: 'tournaments@esportsindia.com' },
    status: 'published',
    featured: true,
    priority: 75,
  },
];

/**
 * Run all homepage seeds
 */
async function runHomepageSeeds() {
  try {
    console.log('🌱 Starting homepage seeds...\n');

    // Seed Campaigns
    console.log('📢 Seeding Campaigns...');
    for (const campaign of campaignSeeds) {
      await Campaign.findOneAndUpdate(
        { campaignId: campaign.campaignId },
        campaign,
        { upsert: true, new: true }
      );
      console.log(`   ✅ Campaign: ${campaign.title}`);
    }
    console.log(`   📊 Total campaigns: ${campaignSeeds.length}\n`);

    // Seed Store Experiences
    console.log('🏪 Seeding Store Experiences...');
    for (const experience of experienceSeeds) {
      await StoreExperience.findOneAndUpdate(
        { slug: experience.slug },
        experience,
        { upsert: true, new: true }
      );
      console.log(`   ✅ Experience: ${experience.title}`);
    }
    console.log(`   📊 Total experiences: ${experienceSeeds.length}\n`);

    // Seed Service Categories
    console.log('🔧 Seeding Service Categories...');
    for (const category of serviceCategorySeeds) {
      await ServiceCategory.findOneAndUpdate(
        { slug: category.slug },
        category,
        { upsert: true, new: true }
      );
      console.log(`   ✅ Service Category: ${category.name}`);
    }
    console.log(`   📊 Total service categories: ${serviceCategorySeeds.length}\n`);

    // Seed Events
    console.log('🎭 Seeding Events...');
    for (const event of eventSeeds) {
      await Event.findOneAndUpdate(
        { title: event.title },
        event,
        { upsert: true, new: true }
      );
      console.log(`   ✅ Event: ${event.title}`);
    }
    console.log(`   📊 Total events: ${eventSeeds.length}\n`);

    console.log('🎉 Homepage seeds completed successfully!');
    console.log(`   Total items seeded: ${campaignSeeds.length + experienceSeeds.length + serviceCategorySeeds.length + eventSeeds.length}`);

  } catch (error) {
    console.error('❌ Error running homepage seeds:', error);
    throw error;
  }
}

// Run seeds if executed directly
if (require.main === module) {
  connectDatabase()
    .then(() => runHomepageSeeds())
    .then(() => {
      console.log('\n✅ Seeding complete. Disconnecting...');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}

export { runHomepageSeeds, campaignSeeds, experienceSeeds, serviceCategorySeeds, eventSeeds };
