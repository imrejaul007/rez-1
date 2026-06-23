/**
 * Seed Creator Profiles & Picks
 * Creates CreatorProfile documents linked to existing users,
 * plus CreatorPick documents linked to real products/stores.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { connectDatabase } from '../config/database';

dotenv.config();

const CREATOR_DATA = [
  {
    displayName: 'Riya Sharma',
    bio: 'Minimalist fashion & sustainable style',
    category: 'fashion',
    tags: ['Sustainable', 'Minimalist', 'Ethnic'],
    tier: 'gold',
    isFeatured: true,
    featuredOrder: 1,
    isVerified: true,
    stats: { totalPicks: 35, totalViews: 125000, totalLikes: 4200, totalFollowers: 8500, totalConversions: 248, totalEarnings: 12400, engagementRate: 78 },
  },
  {
    displayName: 'Arjun Mehta',
    bio: 'Gadget reviews & tech recommendations',
    category: 'tech',
    tags: ['Gadgets', 'Smart Home', 'Gaming'],
    tier: 'gold',
    isFeatured: true,
    featuredOrder: 2,
    isVerified: true,
    stats: { totalPicks: 28, totalViews: 95000, totalLikes: 3800, totalFollowers: 6200, totalConversions: 156, totalEarnings: 9800, engagementRate: 72 },
  },
  {
    displayName: 'Vikram Reddy',
    bio: 'Fitness gear & nutrition expert',
    category: 'fitness',
    tags: ['Fitness', 'Nutrition', 'Wellness'],
    tier: 'silver',
    isFeatured: true,
    featuredOrder: 3,
    isVerified: true,
    stats: { totalPicks: 22, totalViews: 68000, totalLikes: 2900, totalFollowers: 4800, totalConversions: 98, totalEarnings: 5600, engagementRate: 65 },
  },
  {
    displayName: 'Kavita Reddy',
    bio: 'Beauty tips & skincare recommendations',
    category: 'beauty',
    tags: ['Skincare', 'Makeup', 'Natural'],
    tier: 'silver',
    isFeatured: true,
    featuredOrder: 4,
    isVerified: false,
    stats: { totalPicks: 35, totalViews: 82000, totalLikes: 3100, totalFollowers: 5500, totalConversions: 142, totalEarnings: 7100, engagementRate: 70 },
  },
  {
    displayName: 'Rahul Kumar',
    bio: 'Lifestyle & home essentials curator',
    category: 'lifestyle',
    tags: ['Home', 'Essentials', 'Budget'],
    tier: 'bronze',
    isFeatured: true,
    featuredOrder: 5,
    isVerified: false,
    stats: { totalPicks: 29, totalViews: 54000, totalLikes: 1800, totalFollowers: 3200, totalConversions: 76, totalEarnings: 3800, engagementRate: 55 },
  },
  {
    displayName: 'Sneha Patel',
    bio: 'Food discoveries & restaurant picks',
    category: 'food',
    tags: ['Food', 'Restaurants', 'Street Food'],
    tier: 'bronze',
    isFeatured: false,
    isVerified: false,
    stats: { totalPicks: 18, totalViews: 42000, totalLikes: 1500, totalFollowers: 2800, totalConversions: 52, totalEarnings: 2600, engagementRate: 48 },
  },
  {
    displayName: 'Priya Nair',
    bio: 'Travel recommendations & hidden gems',
    category: 'travel',
    tags: ['Travel', 'Budget', 'Adventure'],
    tier: 'starter',
    isFeatured: false,
    isVerified: false,
    stats: { totalPicks: 12, totalViews: 28000, totalLikes: 950, totalFollowers: 1800, totalConversions: 34, totalEarnings: 1700, engagementRate: 42 },
  },
  {
    displayName: 'Aditya Singh',
    bio: 'Health & wellness product reviews',
    category: 'health',
    tags: ['Health', 'Supplements', 'Ayurveda'],
    tier: 'starter',
    isFeatured: false,
    isVerified: false,
    stats: { totalPicks: 15, totalViews: 22000, totalLikes: 780, totalFollowers: 1400, totalConversions: 28, totalEarnings: 1400, engagementRate: 38 },
  },
];

const PICK_TAGS = ['#trending', '#musthave', '#bestseller', '#budgetfriendly', '#premium', '#newlaunch', '#accessories', '#essentials', '#healthy', '#organic'];

async function seedCreatorProfiles() {
  try {
    await connectDatabase();
    console.log('Connected to MongoDB\n');

    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false, collection: 'users' }));
    const CreatorProfile = mongoose.model('CreatorProfile', new mongoose.Schema({}, { strict: false, collection: 'creatorprofiles' }));
    const CreatorPick = mongoose.model('CreatorPick', new mongoose.Schema({}, { strict: false, collection: 'creatorpicks' }));
    const Product = mongoose.model('ProductSeed', new mongoose.Schema({}, { strict: false, collection: 'products' }));
    const Store = mongoose.model('StoreSeed', new mongoose.Schema({}, { strict: false, collection: 'stores' }));

    // Check existing
    const existingCount = await CreatorProfile.countDocuments();
    if (existingCount > 0) {
      console.log(`Already have ${existingCount} CreatorProfile documents. Skipping seed.`);
      console.log('To re-seed, run: db.creatorprofiles.deleteMany({}) in MongoDB shell first.');
      await mongoose.disconnect();
      return;
    }

    // Get random users to link as creators
    const users = await User.find({}).select('_id profile.firstName profile.lastName profile.avatar').limit(50).lean();
    if (users.length < CREATOR_DATA.length) {
      console.error(`Need at least ${CREATOR_DATA.length} users, found ${users.length}. Seed users first.`);
      await mongoose.disconnect();
      return;
    }

    // Get products and stores for picks
    const products = await Product.find({ isActive: true }).select('_id name price images store').limit(100).lean();
    const stores = await Store.find({}).select('_id name logo merchantId').limit(50).lean();

    console.log(`Found ${users.length} users, ${products.length} products, ${stores.length} stores\n`);

    const createdProfiles: any[] = [];

    for (let i = 0; i < CREATOR_DATA.length; i++) {
      const data = CREATOR_DATA[i];
      const user = users[i] as any;
      const avatarName = encodeURIComponent(data.displayName.replace(' ', '+'));

      const profile = await CreatorProfile.create({
        user: user._id,
        status: 'approved',
        applicationDate: new Date(Date.now() - (90 + i * 10) * 24 * 60 * 60 * 1000),
        approvedDate: new Date(Date.now() - (85 + i * 10) * 24 * 60 * 60 * 1000),
        displayName: data.displayName,
        bio: data.bio,
        avatar: `https://ui-avatars.com/api/?name=${avatarName}&background=10B981&color=fff&size=200`,
        category: data.category,
        tags: data.tags,
        socialLinks: [
          { platform: 'instagram', url: `https://instagram.com/${data.displayName.toLowerCase().replace(' ', '_')}` },
        ],
        tier: data.tier,
        stats: { ...data.stats, lastUpdated: new Date() },
        isVerified: data.isVerified,
        isFeatured: data.isFeatured,
        featuredOrder: data.featuredOrder,
      });

      createdProfiles.push(profile);
      console.log(`✅ Created CreatorProfile: ${data.displayName} (${data.category}, ${data.tier})`);
    }

    // Create picks for each creator
    let totalPicks = 0;
    if (products.length > 0) {
      for (const profile of createdProfiles) {
        const numPicks = Math.min(5 + Math.floor(Math.random() * 5), products.length);
        const shuffled = [...products].sort(() => Math.random() - 0.5).slice(0, numPicks);

        for (const product of shuffled) {
          const p = product as any;
          const store = stores.find((s: any) => s._id.toString() === p.store?.toString()) || stores[0];

          await CreatorPick.create({
            creator: (profile as any)._id,
            product: p._id,
            store: (store as any)?._id,
            title: `${p.name || 'Product Pick'}`.substring(0, 200),
            description: `Handpicked by ${(profile as any).displayName}`,
            tags: [PICK_TAGS[Math.floor(Math.random() * PICK_TAGS.length)]],
            engagement: {
              views: Math.floor(Math.random() * 50000) + 1000,
              likes: [],
              bookmarks: [],
              shares: Math.floor(Math.random() * 200),
              clicks: Math.floor(Math.random() * 5000) + 100,
            },
            conversions: {
              totalPurchases: Math.floor(Math.random() * 100),
              totalRevenue: Math.floor(Math.random() * 50000),
              totalCommissionEarned: Math.floor(Math.random() * 2500),
            },
            commissionRate: 5 + Math.floor(Math.random() * 10),
            status: 'approved',
            moderationStatus: 'approved',
            isPublished: true,
            isTrending: Math.random() > 0.5,
            trendingScore: Math.floor(Math.random() * 1000),
            createdAt: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000),
          });
          totalPicks++;
        }
        console.log(`   📌 Created ${numPicks} picks for ${(profile as any).displayName}`);
      }
    } else {
      console.log('⚠️  No products found — skipping pick creation');
    }

    console.log(`\n🎉 Seeding complete!`);
    console.log(`   CreatorProfiles: ${createdProfiles.length}`);
    console.log(`   CreatorPicks: ${totalPicks}`);

    await mongoose.disconnect();
  } catch (error: any) {
    console.error('Seed error:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

seedCreatorProfiles();
