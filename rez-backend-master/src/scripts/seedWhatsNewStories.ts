import mongoose from 'mongoose';
import { connectDatabase } from '../config/database';
import WhatsNewStory from '../models/WhatsNewStory';

// Sample image URLs (using placeholder services for demo)
const SAMPLE_IMAGES = {
  winterFest: [
    'https://images.unsplash.com/photo-1544027993-37dbfe43562a?w=800&h=1200&fit=crop',
    'https://images.unsplash.com/photo-1512389142860-9c449e58a814?w=800&h=1200&fit=crop',
  ],
  flashSale: [
    'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&h=1200&fit=crop',
    'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=1200&fit=crop',
  ],
  newFeatures: [
    'https://images.unsplash.com/photo-1551650975-87deedd944c3?w=800&h=1200&fit=crop',
    'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&h=1200&fit=crop',
  ],
  referral: [
    'https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=800&h=1200&fit=crop',
    'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800&h=1200&fit=crop',
  ],
  rewards: [
    'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=800&h=1200&fit=crop',
    'https://images.unsplash.com/photo-1579621970588-a35d0e7ab9b6?w=800&h=1200&fit=crop',
  ],
};

const ICON_URLS = {
  winterFest: 'https://cdn-icons-png.flaticon.com/512/2832/2832800.png',
  flashSale: 'https://cdn-icons-png.flaticon.com/512/1611/1611179.png',
  newFeatures: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
  referral: 'https://cdn-icons-png.flaticon.com/512/2282/2282188.png',
  rewards: 'https://cdn-icons-png.flaticon.com/512/1170/1170611.png',
};

async function clearWhatsNewStories() {
  console.log('🗑️  Clearing existing What\'s New stories...');
  await WhatsNewStory.deleteMany({});
  console.log('✅ Existing stories cleared');
}

async function seedWhatsNewStories() {
  try {
    console.log('🚀 Starting What\'s New Stories seeding...');

    // Connect to database
    await connectDatabase();
    console.log('✅ Connected to database');

    // Clear existing stories
    await clearWhatsNewStories();

    // Create stories
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysFromNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

    const storiesData = [
      {
        title: 'Winter Fest',
        subtitle: 'Special offers just for you!',
        icon: ICON_URLS.winterFest,
        slides: [
          {
            image: SAMPLE_IMAGES.winterFest[0],
            backgroundColor: '#1a365d',
            overlayText: 'Winterfest is here!',
            duration: 5000,
          },
          {
            image: SAMPLE_IMAGES.winterFest[1],
            backgroundColor: '#1a365d',
            overlayText: 'Spend ₹4,999 & get travel bag worth ₹2,999',
            duration: 5000,
          },
        ],
        ctaButton: {
          text: 'Explore Now',
          action: 'screen' as const,
          target: '/offers',
        },
        validity: {
          startDate: now,
          endDate: thirtyDaysFromNow,
          isActive: true,
        },
        targeting: {
          userTypes: ['all'] as ('new' | 'returning' | 'premium' | 'all')[],
        },
        priority: 10,
        analytics: {
          views: 0,
          clicks: 0,
          completions: 0,
        },
      },
      {
        title: 'Flash Sale',
        subtitle: 'Limited time deals!',
        icon: ICON_URLS.flashSale,
        slides: [
          {
            image: SAMPLE_IMAGES.flashSale[0],
            backgroundColor: '#7c2d12',
            overlayText: '🔥 Flash Sale Alert!',
            duration: 5000,
          },
          {
            image: SAMPLE_IMAGES.flashSale[1],
            backgroundColor: '#7c2d12',
            overlayText: 'Up to 70% OFF on Electronics',
            duration: 5000,
          },
        ],
        ctaButton: {
          text: 'Shop Now',
          action: 'screen' as const,
          target: '/flash-sales',
        },
        validity: {
          startDate: now,
          endDate: thirtyDaysFromNow,
          isActive: true,
        },
        targeting: {
          userTypes: ['all'] as ('new' | 'returning' | 'premium' | 'all')[],
        },
        priority: 9,
        analytics: {
          views: 0,
          clicks: 0,
          completions: 0,
        },
      },
      {
        title: 'New Features',
        subtitle: 'Check out what\'s new!',
        icon: ICON_URLS.newFeatures,
        slides: [
          {
            image: SAMPLE_IMAGES.newFeatures[0],
            backgroundColor: '#064E3B',
            overlayText: 'New App Features!',
            duration: 5000,
          },
          {
            image: SAMPLE_IMAGES.newFeatures[1],
            backgroundColor: '#064E3B',
            overlayText: 'Enhanced checkout & more savings',
            duration: 5000,
          },
        ],
        ctaButton: {
          text: 'Learn More',
          action: 'screen' as const,
          target: '/how-rez-works',
        },
        validity: {
          startDate: now,
          endDate: sixtyDaysFromNow,
          isActive: true,
        },
        targeting: {
          userTypes: ['new', 'returning'] as ('new' | 'returning' | 'premium' | 'all')[],
        },
        priority: 8,
        analytics: {
          views: 0,
          clicks: 0,
          completions: 0,
        },
      },
      {
        title: 'Refer & Earn',
        subtitle: 'Invite friends, earn rewards!',
        icon: ICON_URLS.referral,
        slides: [
          {
            image: SAMPLE_IMAGES.referral[0],
            backgroundColor: '#5b21b6',
            overlayText: 'Refer Friends, Earn Big!',
            duration: 5000,
          },
          {
            image: SAMPLE_IMAGES.referral[1],
            backgroundColor: '#5b21b6',
            overlayText: 'Get ₹100 for every friend who joins',
            duration: 5000,
          },
        ],
        ctaButton: {
          text: 'Invite Now',
          action: 'screen' as const,
          target: '/referral',
        },
        validity: {
          startDate: now,
          endDate: sixtyDaysFromNow,
          isActive: true,
        },
        targeting: {
          userTypes: ['all'] as ('new' | 'returning' | 'premium' | 'all')[],
        },
        priority: 7,
        analytics: {
          views: 0,
          clicks: 0,
          completions: 0,
        },
      },
      {
        title: 'Rez Rewards',
        subtitle: 'Unlock premium benefits!',
        icon: ICON_URLS.rewards,
        slides: [
          {
            image: SAMPLE_IMAGES.rewards[0],
            backgroundColor: '#b45309',
            overlayText: 'Unlock Premium Rewards!',
            duration: 5000,
          },
          {
            image: SAMPLE_IMAGES.rewards[1],
            backgroundColor: '#b45309',
            overlayText: 'Exclusive deals for Rez members',
            duration: 5000,
          },
        ],
        ctaButton: {
          text: 'Join Now',
          action: 'screen' as const,
          target: '/subscription',
        },
        validity: {
          startDate: now,
          endDate: sixtyDaysFromNow,
          isActive: true,
        },
        targeting: {
          userTypes: ['returning'] as ('new' | 'returning' | 'premium' | 'all')[],
        },
        priority: 6,
        analytics: {
          views: 0,
          clicks: 0,
          completions: 0,
        },
      },
    ];

    console.log('🔄 Creating What\'s New stories...');
    const stories = await WhatsNewStory.insertMany(storiesData);

    console.log(`✅ Created ${stories.length} What's New stories:`);
    stories.forEach((story, index) => {
      console.log(`   ${index + 1}. ${story.title} (Priority: ${story.priority})`);
    });

    console.log('\n🎉 What\'s New Stories seeding completed successfully!');

  } catch (error) {
    console.error('❌ Error seeding What\'s New stories:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('📤 Database connection closed');
  }
}

// Run the seed function
seedWhatsNewStories().catch(console.error);
