/**
 * Play & Earn Seeds - Seed data for Play & Earn features
 * Run with: npx ts-node src/seeds/playAndEarnSeeds.ts
 *
 * This seeds:
 * - Verified Creator Users (6)
 * - Videos with Product associations (20+)
 * - Active Tournaments (5)
 * - Coin Drops (10)
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

// Import models
import { User } from '../models/User';
import { Video } from '../models/Video';
import { Product } from '../models/Product';
import { Store } from '../models/Store';
import Tournament from '../models/Tournament';
import CoinDrop from '../models/CoinDrop';

// ==========================================
// CREATOR DATA
// ==========================================
const CREATORS = [
  {
    firstName: 'Priya',
    lastName: 'Sharma',
    avatar: 'https://i.pravatar.cc/150?img=1',
    bio: 'Fashion & Beauty influencer. Love sharing my favorite finds!',
    email: 'priya.sharma@rez.app',
  },
  {
    firstName: 'Rahul',
    lastName: 'Verma',
    avatar: 'https://i.pravatar.cc/150?img=12',
    bio: 'Tech enthusiast & gadget reviewer. Making tech simple.',
    email: 'rahul.verma@rez.app',
  },
  {
    firstName: 'Ananya',
    lastName: 'Patel',
    avatar: 'https://i.pravatar.cc/150?img=5',
    bio: 'Home & lifestyle creator. Curating beautiful spaces.',
    email: 'ananya.patel@rez.app',
  },
  {
    firstName: 'Vikram',
    lastName: 'Singh',
    avatar: 'https://i.pravatar.cc/150?img=8',
    bio: 'Fitness & wellness coach. Healthy living advocate.',
    email: 'vikram.singh@rez.app',
  },
  {
    firstName: 'Neha',
    lastName: 'Gupta',
    avatar: 'https://i.pravatar.cc/150?img=9',
    bio: 'Food blogger & recipe creator. Exploring flavors of India.',
    email: 'neha.gupta@rez.app',
  },
  {
    firstName: 'Arjun',
    lastName: 'Reddy',
    avatar: 'https://i.pravatar.cc/150?img=15',
    bio: 'Student deals hunter. Best bargains for college students.',
    email: 'arjun.reddy@rez.app',
  },
];

// ==========================================
// TOURNAMENT DATA
// ==========================================
const getTournamentData = () => {
  const now = new Date();
  const in1Day = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const in14Days = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  return [
    {
      name: 'Weekend Shopping Sprint',
      description: 'Complete the most purchases this weekend and win big!',
      type: 'weekly',
      gameType: 'mixed',
      status: 'active',
      startDate: now,
      endDate: in3Days,
      entryFee: 0,
      maxParticipants: 1000,
      minParticipants: 10,
      participants: [],
      prizes: [
        { rank: 1, coins: 5000, badge: 'shopping-champion', description: 'Shopping Champion' },
        { rank: 2, coins: 3000, badge: 'shopping-master', description: 'Shopping Master' },
        { rank: 3, coins: 2000, badge: 'shopping-pro', description: 'Shopping Pro' },
        { rank: 4, coins: 1000, description: 'Top 10 Shopper' },
        { rank: 5, coins: 500, description: 'Top 20 Shopper' },
      ],
      rules: [
        'Make qualifying purchases through ReZ',
        'Each purchase earns points based on order value',
        'Bonus points for using ReZ Pay',
        'Top 100 participants win prizes',
      ],
      totalPrizePool: 11500,
      featured: true,
    },
    {
      name: 'Quiz Master Championship',
      description: 'Test your knowledge and compete with thousands of players!',
      type: 'weekly',
      gameType: 'quiz',
      status: 'active',
      startDate: now,
      endDate: in7Days,
      entryFee: 0,
      maxParticipants: 2000,
      minParticipants: 50,
      participants: [],
      prizes: [
        { rank: 1, coins: 10000, badge: 'quiz-champion', description: 'Quiz Champion' },
        { rank: 2, coins: 5000, badge: 'quiz-master', description: 'Quiz Master' },
        { rank: 3, coins: 3000, badge: 'quiz-expert', description: 'Quiz Expert' },
        { rank: 4, coins: 1500, description: 'Top 10 Quiz Player' },
        { rank: 5, coins: 1000, description: 'Top 25 Quiz Player' },
      ],
      rules: [
        'Play daily quizzes to earn points',
        'Correct answers = More points',
        'Faster answers = Bonus points',
        'Play every day for streak bonuses',
      ],
      totalPrizePool: 20500,
      featured: true,
    },
    {
      name: 'Memory Match Madness',
      description: 'Match cards faster than anyone else!',
      type: 'daily',
      gameType: 'memory_match',
      status: 'active',
      startDate: now,
      endDate: in1Day,
      entryFee: 0,
      maxParticipants: 500,
      minParticipants: 20,
      participants: [],
      prizes: [
        { rank: 1, coins: 1000, badge: 'memory-champion', description: 'Memory Champion' },
        { rank: 2, coins: 500, description: 'Memory Master' },
        { rank: 3, coins: 250, description: 'Memory Pro' },
      ],
      rules: [
        'Complete memory match games',
        'Fewer moves = Higher score',
        'Faster completion = Bonus points',
      ],
      totalPrizePool: 1750,
      featured: false,
    },
    {
      name: 'Coin Hunt Challenge',
      description: 'Catch the most coins and climb the leaderboard!',
      type: 'weekly',
      gameType: 'coin_hunt',
      status: 'active',
      startDate: now,
      endDate: in7Days,
      entryFee: 0,
      maxParticipants: 1500,
      minParticipants: 30,
      participants: [],
      prizes: [
        { rank: 1, coins: 3000, badge: 'coin-hunter', description: 'Coin Hunter Champion' },
        { rank: 2, coins: 2000, description: 'Coin Hunter Master' },
        { rank: 3, coins: 1000, description: 'Coin Hunter Pro' },
        { rank: 4, coins: 500, description: 'Top 10 Coin Hunter' },
      ],
      rules: [
        'Play Coin Hunt daily',
        'Collect as many coins as possible',
        'Complete bonus rounds for extra points',
      ],
      totalPrizePool: 6500,
      featured: true,
    },
    {
      name: 'Monthly Price Guesser',
      description: 'Guess product prices to win monthly prizes!',
      type: 'monthly',
      gameType: 'guess_price',
      status: 'upcoming',
      startDate: in7Days,
      endDate: in30Days,
      entryFee: 0,
      maxParticipants: 3000,
      minParticipants: 100,
      participants: [],
      prizes: [
        { rank: 1, coins: 15000, badge: 'price-guru', description: 'Price Guru' },
        { rank: 2, coins: 10000, badge: 'price-master', description: 'Price Master' },
        { rank: 3, coins: 5000, badge: 'price-expert', description: 'Price Expert' },
        { rank: 4, coins: 2500, description: 'Top 10 Price Guesser' },
        { rank: 5, coins: 1000, description: 'Top 50 Price Guesser' },
      ],
      rules: [
        'Guess product prices accurately',
        'Closer guesses = Higher scores',
        'Daily participation bonus',
        'Perfect guesses = 5x points',
      ],
      totalPrizePool: 33500,
      featured: true,
    },
  ];
};

// ==========================================
// VIDEO DATA FOR CREATORS
// ==========================================
// Valid categories: 'trending_me', 'trending_her', 'waist', 'article', 'featured', 'challenge', 'tutorial', 'review'
const VIDEO_TEMPLATES = [
  {
    title: 'My Holy Grail Skincare Routine',
    description: 'Finally sharing my complete skincare routine that transformed my skin!',
    hashtags: ['#skincare', '#beauty', '#routine'],
    category: 'tutorial',
  },
  {
    title: 'Best Budget Headphones Under 5K',
    description: 'Tested 10+ headphones to find the best budget option!',
    hashtags: ['#tech', '#headphones', '#gadgets'],
    category: 'review',
  },
  {
    title: 'Summer Outfit Haul 2024',
    description: 'My favorite summer picks from the latest collections',
    hashtags: ['#fashion', '#summer', '#haul'],
    category: 'trending_her',
  },
  {
    title: 'Kitchen Gadgets You Need',
    description: 'Game-changing kitchen tools that make cooking easier',
    hashtags: ['#kitchen', '#home', '#cooking'],
    category: 'review',
  },
  {
    title: 'Protein Powder Review',
    description: 'Honest review of the most popular protein powders',
    hashtags: ['#fitness', '#protein', '#health'],
    category: 'review',
  },
  {
    title: 'Best Cafe in Town',
    description: 'Found this hidden gem with amazing coffee and ambiance!',
    hashtags: ['#food', '#cafe', '#coffee'],
    category: 'featured',
  },
  {
    title: 'Laptop for Students 2024',
    description: 'Top laptops for college students on a budget',
    hashtags: ['#tech', '#laptop', '#student'],
    category: 'trending_me',
  },
  {
    title: 'Minimalist Makeup Look',
    description: 'Quick 5-minute everyday makeup tutorial',
    hashtags: ['#makeup', '#beauty', '#tutorial'],
    category: 'tutorial',
  },
];

const VIDEO_URLS = [
  'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  'https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
  'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
  'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
];

// ==========================================
// SEED FUNCTIONS
// ==========================================

async function seedCreators() {
  console.log('🎨 Seeding creator users...');
  const createdCreators = [];

  for (const creator of CREATORS) {
    const existingUser = await User.findOne({ 'auth.email': creator.email });
    if (existingUser) {
      console.log(`  → Creator ${creator.firstName} already exists`);
      createdCreators.push(existingUser);
      continue;
    }

    const hashedPassword = await bcrypt.hash('Creator@123', 10);

    const phoneNumber = `+91${Math.floor(9000000000 + Math.random() * 999999999)}`;

    const newUser = new User({
      phoneNumber: phoneNumber,
      auth: {
        email: creator.email,
        password: hashedPassword,
        isVerified: true,
        verificationToken: null,
      },
      profile: {
        firstName: creator.firstName,
        lastName: creator.lastName,
        avatar: creator.avatar,
        bio: creator.bio,
        phone: phoneNumber,
      },
      wallet: {
        coins: {
          rez: Math.floor(5000 + Math.random() * 10000),
          branded: [],
          promo: Math.floor(500 + Math.random() * 1000),
        },
        cashback: {
          available: Math.floor(100 + Math.random() * 500),
          pending: Math.floor(50 + Math.random() * 200),
          total: Math.floor(500 + Math.random() * 2000),
        },
      },
      isActive: true,
      createdAt: new Date(Date.now() - Math.floor(Math.random() * 90) * 24 * 60 * 60 * 1000),
    });

    await newUser.save();
    createdCreators.push(newUser);
    console.log(`  ✓ Created creator: ${creator.firstName} ${creator.lastName}`);
  }

  return createdCreators;
}

async function seedVideosForCreators(creators: any[]) {
  console.log('🎬 Seeding videos for creators...');

  // Get some products to associate with videos
  const products = await Product.find({ isActive: true }).limit(20).lean();
  if (products.length === 0) {
    console.log('  ⚠ No products found, skipping video-product associations');
  }

  let videoCount = 0;

  for (const creator of creators) {
    const existingVideos = await Video.countDocuments({ creator: creator._id });
    if (existingVideos >= 3) {
      console.log(`  → Creator ${creator.profile?.firstName} already has ${existingVideos} videos`);
      continue;
    }

    // Create 3-5 videos per creator
    const numVideos = 3 + Math.floor(Math.random() * 3);

    for (let i = 0; i < numVideos; i++) {
      const template = VIDEO_TEMPLATES[Math.floor(Math.random() * VIDEO_TEMPLATES.length)];
      const videoUrl = VIDEO_URLS[Math.floor(Math.random() * VIDEO_URLS.length)];
      const duration = Math.floor(30 + Math.random() * 90); // 30-120 seconds

      // Pick 1-3 random products to associate
      const numProducts = Math.min(1 + Math.floor(Math.random() * 3), products.length);
      const shuffledProducts = [...products].sort(() => 0.5 - Math.random());
      const associatedProducts = shuffledProducts.slice(0, numProducts).map(p => p._id);

      const video = new Video({
        creator: creator._id,
        title: template.title,
        description: template.description,
        contentType: 'ugc',
        videoUrl: videoUrl,
        thumbnail: `https://picsum.photos/seed/${Date.now() + i}/400/300`,
        category: template.category,
        tags: template.hashtags.map(h => h.replace('#', '')),
        hashtags: template.hashtags,
        products: associatedProducts,
        metadata: {
          duration: duration,
          resolution: '1080p',
          format: 'mp4',
          aspectRatio: '9:16',
          fps: 30,
        },
        engagement: {
          views: Math.floor(1000 + Math.random() * 50000),
          likes: [],
          shares: Math.floor(10 + Math.random() * 500),
          comments: Math.floor(5 + Math.random() * 200),
          saves: Math.floor(5 + Math.random() * 100),
          reports: 0,
        },
        analytics: {
          totalViews: Math.floor(1000 + Math.random() * 50000),
          uniqueViews: Math.floor(800 + Math.random() * 40000),
          avgWatchTime: Math.floor(duration * 0.6),
          completionRate: Math.floor(40 + Math.random() * 40),
          engagementRate: Math.floor(5 + Math.random() * 15),
          shareRate: Math.floor(1 + Math.random() * 5),
          likeRate: Math.floor(5 + Math.random() * 15),
        },
        processing: {
          status: 'completed',
          processedAt: new Date(),
        },
        isPublished: true,
        isApproved: true,
        isFeatured: Math.random() > 0.7,
        isTrending: Math.random() > 0.6,
        moderationStatus: 'approved',
        privacy: 'public',
        allowComments: true,
        allowSharing: true,
        publishedAt: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000),
      });

      await video.save();
      videoCount++;
    }

    console.log(`  ✓ Created ${numVideos} videos for ${creator.profile?.firstName}`);
  }

  console.log(`  Total videos created: ${videoCount}`);
}

async function seedTournaments() {
  console.log('🏆 Seeding tournaments...');

  const tournamentData = getTournamentData();

  for (const tournament of tournamentData) {
    const existing = await Tournament.findOne({ name: tournament.name });
    if (existing) {
      console.log(`  → Tournament "${tournament.name}" already exists`);
      continue;
    }

    const newTournament = new Tournament(tournament);
    await newTournament.save();
    console.log(`  ✓ Created tournament: ${tournament.name}`);
  }
}

async function seedCoinDrops() {
  console.log('💰 Seeding coin drops...');

  // Get some stores for coin drops
  const stores = await Store.find({ isActive: true }).limit(10).lean();
  if (stores.length === 0) {
    console.log('  ⚠ No stores found, skipping coin drops');
    return;
  }

  const now = new Date();
  const categories = ['Fashion', 'Electronics', 'Food & Dining', 'Beauty', 'Home'];

  for (let i = 0; i < Math.min(stores.length, 10); i++) {
    const store = stores[i];
    const existing = await CoinDrop.findOne({
      storeId: store._id,
      endTime: { $gt: now },
    });

    if (existing) {
      console.log(`  → Coin drop for ${store.name} already exists`);
      continue;
    }

    const multiplier = [2, 3, 5][Math.floor(Math.random() * 3)];
    const normalCashback = 2 + Math.floor(Math.random() * 6);
    const hoursToEnd = 6 + Math.floor(Math.random() * 42);

    const coinDrop = new CoinDrop({
      storeId: store._id,
      storeName: store.name,
      storeLogo: store.logo || `https://logo.clearbit.com/${store.name.toLowerCase().replace(/\s/g, '')}.com`,
      multiplier,
      normalCashback,
      boostedCashback: normalCashback * multiplier,
      category: categories[Math.floor(Math.random() * categories.length)],
      startTime: now,
      endTime: new Date(now.getTime() + hoursToEnd * 60 * 60 * 1000),
      minOrderValue: [0, 200, 500, 1000][Math.floor(Math.random() * 4)],
      maxCashback: [100, 200, 500][Math.floor(Math.random() * 3)],
      isActive: true,
      priority: Math.floor(Math.random() * 100),
    });

    await coinDrop.save();
    console.log(`  ✓ Created ${multiplier}x coin drop for ${store.name}`);
  }
}

// ==========================================
// MAIN SEED FUNCTION
// ==========================================

async function runSeeds() {
  console.log('🚀 Starting Play & Earn Seeds...\n');

  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/rez';
    await mongoose.connect(mongoUri);
    console.log('✓ Connected to MongoDB\n');

    // Run seeds in order
    const creators = await seedCreators();
    console.log('');

    await seedVideosForCreators(creators);
    console.log('');

    await seedTournaments();
    console.log('');

    await seedCoinDrops();
    console.log('');

    console.log('🎉 Play & Earn seeds completed successfully!\n');

    // Print summary
    const creatorCount = await User.countDocuments({ 'auth.isVerified': true });
    const videoCount = await Video.countDocuments({ isPublished: true, moderationStatus: 'approved' });
    const tournamentCount = await Tournament.countDocuments();
    const coinDropCount = await CoinDrop.countDocuments({ isActive: true });

    console.log('📊 Database Summary:');
    console.log(`   - Verified Users: ${creatorCount}`);
    console.log(`   - Published Videos: ${videoCount}`);
    console.log(`   - Tournaments: ${tournamentCount}`);
    console.log(`   - Active Coin Drops: ${coinDropCount}`);

  } catch (error) {
    console.error('❌ Seed error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n✓ Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run if executed directly
if (require.main === module) {
  runSeeds();
}

export { runSeeds };
