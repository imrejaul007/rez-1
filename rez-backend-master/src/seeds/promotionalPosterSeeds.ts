/**
 * Promotional Poster Seeds - Seed data for Daily Check-in promotional posters
 * Run with: npx ts-node src/seeds/promotionalPosterSeeds.ts
 *
 * This seeds HeroBanner documents with tags ['promotional', 'shareable', 'poster']
 * that are used in the Daily Check-in page for sharing.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import HeroBanner from '../models/HeroBanner';
import { User } from '../models/User';

dotenv.config();

// ==========================================
// PROMOTIONAL POSTER DATA
// ==========================================
const PROMOTIONAL_POSTERS = [
  {
    title: 'Mega Diwali Sale',
    subtitle: 'Up to 70% off + Extra Cashback',
    description: 'Celebrate Diwali with massive discounts on fashion, electronics, and more!',
    image: 'https://images.unsplash.com/photo-1607083206968-13611e3d76db?w=800&q=80',
    backgroundColor: '#F97316',
    ctaText: 'Shop Now',
    ctaAction: 'navigate',
    ctaUrl: '/offers',
    shareBonus: 50,
  },
  {
    title: 'Weekend Bonanza',
    subtitle: '3X Coins on All Purchases',
    description: 'Earn triple coins on every purchase this weekend only!',
    image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&q=80',
    backgroundColor: '#A855F7',
    ctaText: 'Earn Now',
    ctaAction: 'navigate',
    ctaUrl: '/explore',
    shareBonus: 30,
  },
  {
    title: 'New User Special',
    subtitle: 'Get Rs.500 Welcome Bonus',
    description: 'Join ReZ and get Rs.500 welcome bonus on your first purchase!',
    image: 'https://images.unsplash.com/photo-1607082349566-187342175e2f?w=800&q=80',
    backgroundColor: '#3B82F6',
    ctaText: 'Join Now',
    ctaAction: 'navigate',
    ctaUrl: '/signup',
    shareBonus: 100,
  },
  {
    title: 'Flash Sale Today',
    subtitle: 'Limited Time Mega Deals',
    description: 'Grab the hottest deals before they are gone! Flash sale ends at midnight.',
    image: 'https://images.unsplash.com/photo-1607082350899-7e105aa886ae?w=800&q=80',
    backgroundColor: '#22C55E',
    ctaText: 'Shop Flash Sale',
    ctaAction: 'navigate',
    ctaUrl: '/flash-sale',
    shareBonus: 40,
  },
  {
    title: 'Summer Fashion Fest',
    subtitle: 'Refresh Your Wardrobe',
    description: 'Trendy summer styles at unbeatable prices. Free shipping on orders above Rs.999!',
    image: 'https://images.unsplash.com/photo-1558171813-4c088753af8f?w=800&q=80',
    backgroundColor: '#EC4899',
    ctaText: 'Explore Fashion',
    ctaAction: 'navigate',
    ctaUrl: '/categories/fashion',
    shareBonus: 35,
  },
  {
    title: 'Electronics Bonanza',
    subtitle: 'Up to 50% Off on Gadgets',
    description: 'Latest smartphones, laptops, and accessories at incredible prices!',
    image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=800&q=80',
    backgroundColor: '#6366F1',
    ctaText: 'Shop Electronics',
    ctaAction: 'navigate',
    ctaUrl: '/categories/electronics',
    shareBonus: 45,
  },
  {
    title: 'Refer & Earn Big',
    subtitle: 'Rs.100 per Friend',
    description: 'Invite friends to ReZ and earn Rs.100 for each successful referral!',
    image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80',
    backgroundColor: '#F59E0B',
    ctaText: 'Start Referring',
    ctaAction: 'navigate',
    ctaUrl: '/referral',
    shareBonus: 75,
  },
  {
    title: 'Beauty Deals',
    subtitle: 'Flat 40% Off Skincare',
    description: 'Premium skincare and makeup products at flat 40% discount!',
    image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&q=80',
    backgroundColor: '#D946EF',
    ctaText: 'Shop Beauty',
    ctaAction: 'navigate',
    ctaUrl: '/categories/beauty',
    shareBonus: 30,
  },
];

// ==========================================
// SEED FUNCTION
// ==========================================

async function seedPromotionalPosters() {
  console.log('Seeding promotional posters...\n');

  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/rez';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB\n');

    // Get an admin user to use as createdBy
    let adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      adminUser = await User.findOne({});
    }

    if (!adminUser) {
      console.error('No user found to set as createdBy. Please seed users first.');
      process.exit(1);
    }

    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const in90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    let created = 0;
    let skipped = 0;

    for (let i = 0; i < PROMOTIONAL_POSTERS.length; i++) {
      const poster = PROMOTIONAL_POSTERS[i];

      // Check if poster already exists
      const existing = await HeroBanner.findOne({
        title: poster.title,
        'metadata.tags': { $all: ['promotional', 'shareable', 'poster'] }
      });

      if (existing) {
        console.log(`  -> Poster "${poster.title}" already exists, skipping`);
        skipped++;
        continue;
      }

      // Create new promotional poster
      const newBanner = new HeroBanner({
        title: poster.title,
        subtitle: poster.subtitle,
        description: poster.description,
        image: poster.image,
        backgroundColor: poster.backgroundColor,
        textColor: '#FFFFFF',
        ctaText: poster.ctaText,
        ctaAction: poster.ctaAction,
        ctaUrl: poster.ctaUrl,
        isActive: true,
        priority: 100 - i, // Higher priority for first items
        validFrom: now,
        validUntil: i < 4 ? in30Days : in90Days, // First 4 expire in 30 days, rest in 90
        targetAudience: {
          userTypes: ['all'],
          locations: [],
          categories: [],
        },
        analytics: {
          views: Math.floor(Math.random() * 1000),
          clicks: Math.floor(Math.random() * 200),
          conversions: Math.floor(Math.random() * 50),
        },
        metadata: {
          page: 'all',
          position: 'top',
          size: 'large',
          animation: 'fade',
          tags: ['promotional', 'shareable', 'poster'],
        },
        createdBy: adminUser._id,
      });

      await newBanner.save();
      console.log(`  + Created poster: "${poster.title}" (Share bonus: Rs.${poster.shareBonus})`);
      created++;
    }

    console.log(`\n Promotional poster seeding complete!`);
    console.log(`   - Created: ${created}`);
    console.log(`   - Skipped (already exist): ${skipped}`);

    // Verify count
    const totalPosters = await HeroBanner.countDocuments({
      'metadata.tags': { $all: ['promotional', 'shareable', 'poster'] },
      isActive: true
    });
    console.log(`   - Total active promotional posters in DB: ${totalPosters}`);

  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
    process.exit(0);
  }
}

// Run if executed directly
if (require.main === module) {
  seedPromotionalPosters();
}

export { seedPromotionalPosters };
