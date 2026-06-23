// Seed script for UGC Content Creator Users
// Creates 15-20 users with realistic profiles who will be content creators

import mongoose from 'mongoose';
import { User } from '../models/User';
import dotenv from 'dotenv';
import { connectDatabase } from '../config/database';

dotenv.config();

// Indian cities for location diversity
const INDIAN_CITIES = [
  { city: 'Mumbai', state: 'Maharashtra', coordinates: [72.8777, 19.0760] as [number, number] },
  { city: 'Delhi', state: 'Delhi', coordinates: [77.2090, 28.6139] as [number, number] },
  { city: 'Bangalore', state: 'Karnataka', coordinates: [77.5946, 12.9716] as [number, number] },
  { city: 'Hyderabad', state: 'Telangana', coordinates: [78.4867, 17.3850] as [number, number] },
  { city: 'Chennai', state: 'Tamil Nadu', coordinates: [80.2707, 13.0827] as [number, number] },
  { city: 'Kolkata', state: 'West Bengal', coordinates: [88.3639, 22.5726] as [number, number] },
  { city: 'Pune', state: 'Maharashtra', coordinates: [73.8567, 18.5204] as [number, number] },
  { city: 'Ahmedabad', state: 'Gujarat', coordinates: [72.5714, 23.0225] as [number, number] },
  { city: 'Jaipur', state: 'Rajasthan', coordinates: [75.7873, 26.9124] as [number, number] },
  { city: 'Lucknow', state: 'Uttar Pradesh', coordinates: [80.9462, 26.8467] as [number, number] }
];

// Avatar URLs - professional looking avatars
const AVATAR_BASE = 'https://i.pravatar.cc/300?img=';

// Content creator profile interface
interface CreatorProfile {
  firstName: string;
  lastName: string;
  gender: 'male' | 'female';
  age: number;
  bio: string;
  avatar: string;
  interests: string[];
  category: 'fashion' | 'beauty' | 'lifestyle' | 'tech';
  engagementScore: number;
  isPremium: boolean;
}

// Content creator profiles data
const CREATOR_PROFILES: CreatorProfile[] = [
  // Fashion Influencers (6 users)
  {
    firstName: 'Priya',
    lastName: 'Sharma',
    gender: 'female',
    age: 24,
    bio: 'Fashion blogger & style influencer. Passionate about sustainable fashion and ethnic wear. Love creating content that inspires! ✨',
    avatar: `${AVATAR_BASE}1`,
    interests: ['fashion', 'beauty', 'lifestyle', 'photography'],
    category: 'fashion',
    engagementScore: 8.5,
    isPremium: true
  },
  {
    firstName: 'Ananya',
    lastName: 'Verma',
    gender: 'female',
    age: 27,
    bio: 'Street style fashionista | Vintage fashion lover | Creating daily outfit inspiration 👗',
    avatar: `${AVATAR_BASE}5`,
    interests: ['fashion', 'vintage', 'thrift', 'styling'],
    category: 'fashion',
    engagementScore: 9.2,
    isPremium: true
  },
  {
    firstName: 'Kavya',
    lastName: 'Patel',
    gender: 'female',
    age: 22,
    bio: 'Designer wear enthusiast | Fashion week coverage | Sharing the latest trends and styling tips 💄',
    avatar: `${AVATAR_BASE}9`,
    interests: ['fashion', 'designer wear', 'runway', 'trends'],
    category: 'fashion',
    engagementScore: 7.8,
    isPremium: false
  },
  {
    firstName: 'Riya',
    lastName: 'Mehta',
    gender: 'female',
    age: 25,
    bio: 'Indo-western fusion fashion | Bridal fashion specialist | Making traditional wear trendy again 👰',
    avatar: `${AVATAR_BASE}10`,
    interests: ['fashion', 'bridal', 'ethnic', 'fusion'],
    category: 'fashion',
    engagementScore: 8.9,
    isPremium: true
  },
  {
    firstName: 'Sneha',
    lastName: 'Reddy',
    gender: 'female',
    age: 26,
    bio: 'Minimalist fashion advocate | Capsule wardrobe creator | Less is more 🌿',
    avatar: `${AVATAR_BASE}16`,
    interests: ['fashion', 'minimalism', 'sustainability', 'lifestyle'],
    category: 'fashion',
    engagementScore: 8.1,
    isPremium: false
  },
  {
    firstName: 'Ishita',
    lastName: 'Singh',
    gender: 'female',
    age: 23,
    bio: 'Affordable fashion finds | Budget styling queen | Proving style doesn\'t need a big budget 👛',
    avatar: `${AVATAR_BASE}20`,
    interests: ['fashion', 'budget', 'styling', 'shopping'],
    category: 'fashion',
    engagementScore: 7.5,
    isPremium: false
  },

  // Beauty Creators (5 users)
  {
    firstName: 'Neha',
    lastName: 'Gupta',
    gender: 'female',
    age: 28,
    bio: 'Certified makeup artist | Beauty product reviewer | Honest reviews & tutorials 💋',
    avatar: `${AVATAR_BASE}23`,
    interests: ['beauty', 'makeup', 'skincare', 'reviews'],
    category: 'beauty',
    engagementScore: 9.0,
    isPremium: true
  },
  {
    firstName: 'Divya',
    lastName: 'Nair',
    gender: 'female',
    age: 25,
    bio: 'Skincare enthusiast | Natural beauty advocate | Sharing my journey to healthy skin ✨',
    avatar: `${AVATAR_BASE}24`,
    interests: ['beauty', 'skincare', 'natural', 'wellness'],
    category: 'beauty',
    engagementScore: 8.7,
    isPremium: true
  },
  {
    firstName: 'Simran',
    lastName: 'Kaur',
    gender: 'female',
    age: 24,
    bio: 'Bridal makeup specialist | Traditional & modern looks | Making brides feel beautiful 👰💄',
    avatar: `${AVATAR_BASE}26`,
    interests: ['beauty', 'makeup', 'bridal', 'hair'],
    category: 'beauty',
    engagementScore: 8.4,
    isPremium: false
  },
  {
    firstName: 'Pooja',
    lastName: 'Iyer',
    gender: 'female',
    age: 29,
    bio: 'Beauty blogger | Product junkie | Trying products so you don\'t have to! 🧴',
    avatar: `${AVATAR_BASE}27`,
    interests: ['beauty', 'reviews', 'products', 'blogging'],
    category: 'beauty',
    engagementScore: 7.9,
    isPremium: false
  },
  {
    firstName: 'Aisha',
    lastName: 'Khan',
    gender: 'female',
    age: 26,
    bio: 'DIY beauty recipes | Natural & homemade solutions | Beauty on a budget 🌱',
    avatar: `${AVATAR_BASE}28`,
    interests: ['beauty', 'diy', 'natural', 'budget'],
    category: 'beauty',
    engagementScore: 7.2,
    isPremium: false
  },

  // Lifestyle Bloggers (4 users)
  {
    firstName: 'Rahul',
    lastName: 'Desai',
    gender: 'male',
    age: 30,
    bio: 'Lifestyle vlogger | Travel & food enthusiast | Living life one adventure at a time 🌍',
    avatar: `${AVATAR_BASE}33`,
    interests: ['lifestyle', 'travel', 'food', 'vlogging'],
    category: 'lifestyle',
    engagementScore: 8.8,
    isPremium: true
  },
  {
    firstName: 'Arjun',
    lastName: 'Malhotra',
    gender: 'male',
    age: 28,
    bio: 'Fitness & wellness coach | Healthy lifestyle advocate | Transform your life 💪',
    avatar: `${AVATAR_BASE}12`,
    interests: ['lifestyle', 'fitness', 'wellness', 'health'],
    category: 'lifestyle',
    engagementScore: 8.3,
    isPremium: true
  },
  {
    firstName: 'Meera',
    lastName: 'Joshi',
    gender: 'female',
    age: 32,
    bio: 'Mom blogger | Work-life balance | Sharing tips for modern parenting & lifestyle 👨‍👩‍👧',
    avatar: `${AVATAR_BASE}44`,
    interests: ['lifestyle', 'parenting', 'family', 'wellness'],
    category: 'lifestyle',
    engagementScore: 7.6,
    isPremium: false
  },
  {
    firstName: 'Aarav',
    lastName: 'Chopra',
    gender: 'male',
    age: 27,
    bio: 'Urban lifestyle blogger | City life hacks | Exploring the best of metro living 🏙️',
    avatar: `${AVATAR_BASE}13`,
    interests: ['lifestyle', 'urban', 'city', 'exploration'],
    category: 'lifestyle',
    engagementScore: 7.4,
    isPremium: false
  },

  // Tech Reviewers (4 users)
  {
    firstName: 'Karthik',
    lastName: 'Rao',
    gender: 'male',
    age: 29,
    bio: 'Tech reviewer | Gadget geek | Unbiased reviews of latest tech 📱💻',
    avatar: `${AVATAR_BASE}14`,
    interests: ['tech', 'gadgets', 'reviews', 'innovation'],
    category: 'tech',
    engagementScore: 9.1,
    isPremium: true
  },
  {
    firstName: 'Rohan',
    lastName: 'Bhatt',
    gender: 'male',
    age: 26,
    bio: 'Mobile tech enthusiast | Camera comparisons | Finding the best phone for you 📸',
    avatar: `${AVATAR_BASE}15`,
    interests: ['tech', 'mobile', 'photography', 'reviews'],
    category: 'tech',
    engagementScore: 8.6,
    isPremium: true
  },
  {
    firstName: 'Vikram',
    lastName: 'Kumar',
    gender: 'male',
    age: 31,
    bio: 'Gaming tech specialist | PC builds | Console reviews | Level up your gaming 🎮',
    avatar: `${AVATAR_BASE}51`,
    interests: ['tech', 'gaming', 'pc', 'hardware'],
    category: 'tech',
    engagementScore: 8.2,
    isPremium: false
  },
  {
    firstName: 'Siddharth',
    lastName: 'Menon',
    gender: 'male',
    age: 25,
    bio: 'Budget tech reviewer | Best value gadgets | Tech for everyone 💰',
    avatar: `${AVATAR_BASE}52`,
    interests: ['tech', 'budget', 'value', 'reviews'],
    category: 'tech',
    engagementScore: 7.7,
    isPremium: false
  }
];

// Helper function to generate unique phone number
function generatePhoneNumber(index: number): string {
  const baseNumber = 9000000000 + (index * 12345);
  return `+91${baseNumber}`;
}

// Helper function to generate email from name
function generateEmail(firstName: string, lastName: string): string {
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`;
}

// Helper function to calculate date of birth from age
function calculateDOB(age: number): Date {
  const currentYear = new Date().getFullYear();
  const birthYear = currentYear - age;
  const randomMonth = Math.floor(Math.random() * 12);
  const randomDay = Math.floor(Math.random() * 28) + 1;
  return new Date(birthYear, randomMonth, randomDay);
}

// Helper function to get random city
function getRandomCity() {
  return INDIAN_CITIES[Math.floor(Math.random() * INDIAN_CITIES.length)];
}

// Helper function to generate username
function generateUsername(firstName: string, lastName: string): string {
  const suffixes = ['_official', '_creator', '_vlogs', '_diaries', '_world'];
  const randomSuffix = suffixes[Math.floor(Math.random() * suffixes.length)];
  return `${firstName.toLowerCase()}${lastName.toLowerCase()}${randomSuffix}`;
}

// Helper function to determine referral tier based on engagement
function getReferralTier(engagementScore: number): 'STARTER' | 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND' {
  if (engagementScore >= 9.0) return 'PLATINUM';
  if (engagementScore >= 8.5) return 'GOLD';
  if (engagementScore >= 8.0) return 'SILVER';
  if (engagementScore >= 7.5) return 'BRONZE';
  return 'STARTER';
}

// Helper function to calculate wallet based on engagement
function calculateWallet(engagementScore: number, isPremium: boolean) {
  const baseEarnings = Math.floor(engagementScore * 1000);
  const premiumBonus = isPremium ? 2000 : 0;
  const totalEarned = baseEarnings + premiumBonus;
  const totalSpent = Math.floor(totalEarned * 0.3); // Spent 30% on average
  const balance = totalEarned - totalSpent;

  return {
    balance,
    totalEarned,
    totalSpent,
    pendingAmount: Math.floor(engagementScore * 100)
  };
}

async function seedUserCreators() {
  try {
    console.log('🚀 Starting UGC Content Creator Users seeding...');
    console.log(`📍 Connecting to database...\n`);

    // Connect to database
    await connectDatabase();
    console.log('✅ Connected to MongoDB successfully\n');

    // Clear existing creator users (optional - comment out to preserve)
    console.log('🧹 Checking for existing creator users...');
    const existingCreators = await User.countDocuments({
      'profile.bio': { $regex: /fashion|beauty|lifestyle|tech/i }
    });

    if (existingCreators > 0) {
      console.log(`⚠️  Found ${existingCreators} existing creator users`);
      console.log('💡 Skipping deletion to preserve existing data');
      console.log('💡 To clear existing creators, uncomment the deleteMany line\n');
      // await User.deleteMany({ 'profile.bio': { $regex: /fashion|beauty|lifestyle|tech/i } });
    }

    // Create creator users
    console.log('👥 Creating UGC content creator users...\n');
    const createdUsers: any[] = [];
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < CREATOR_PROFILES.length; i++) {
      const profile = CREATOR_PROFILES[i];
      const city = getRandomCity();
      const dob = calculateDOB(profile.age);
      const wallet = calculateWallet(profile.engagementScore, profile.isPremium);
      const phoneNumber = generatePhoneNumber(i + 1000);

      try {
        // Check if user already exists
        const existingUser = await User.findOne({ phoneNumber });
        if (existingUser) {
          console.log(`⏭️  [${i + 1}/${CREATOR_PROFILES.length}] User already exists: ${profile.firstName} ${profile.lastName}`);
          createdUsers.push(existingUser);
          continue;
        }

        const userData: any = {
          phoneNumber,
          email: generateEmail(profile.firstName, profile.lastName),
          username: generateUsername(profile.firstName, profile.lastName),
          profile: {
            firstName: profile.firstName,
            lastName: profile.lastName,
            avatar: profile.avatar,
            bio: profile.bio,
            dateOfBirth: dob,
            gender: profile.gender,
            location: {
              city: city.city,
              state: city.state,
              coordinates: city.coordinates,
              address: `${Math.floor(Math.random() * 999) + 1}, ${city.city}`,
              pincode: `${110001 + Math.floor(Math.random() * 100000)}`
            },
            timezone: 'Asia/Kolkata'
          },
          preferences: {
            language: 'en',
            theme: Math.random() > 0.5 ? 'light' : 'dark',
            emailNotifications: true,
            pushNotifications: true,
            smsNotifications: Math.random() > 0.6,
            notifications: {
              push: true,
              email: true,
              sms: Math.random() > 0.6
            }
          },
          wallet,
          walletBalance: wallet.balance,
          auth: {
            isVerified: true,
            isOnboarded: true,
            lastLogin: new Date(Date.now() - Math.floor(Math.random() * 7) * 24 * 60 * 60 * 1000),
            loginAttempts: 0
          },
          referral: {
            referredUsers: [],
            totalReferrals: Math.floor(profile.engagementScore * 5),
            referralEarnings: Math.floor(profile.engagementScore * 500)
          },
          role: 'user',
          userType: 'creator',
          age: profile.age,
          location: city.city,
          interests: profile.interests,
          referralTier: getReferralTier(profile.engagementScore),
          isPremium: profile.isPremium,
          premiumExpiresAt: profile.isPremium ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) : undefined,
          fullName: `${profile.firstName} ${profile.lastName}`,
          isActive: true,
          createdAt: new Date(Date.now() - Math.floor(Math.random() * 180) * 24 * 60 * 60 * 1000) // Random date within last 6 months
        };

        const user = await User.create(userData);
        createdUsers.push(user);
        successCount++;

        // Progress indicator
        const categoryEmoji: Record<string, string> = {
          fashion: '👗',
          beauty: '💄',
          lifestyle: '🌟',
          tech: '📱'
        };

        console.log(
          `✅ [${i + 1}/${CREATOR_PROFILES.length}] Created: ${categoryEmoji[profile.category]} ${profile.firstName} ${profile.lastName}`,
          `| ${city.city}`,
          `| Score: ${profile.engagementScore}`,
          `| ${profile.isPremium ? '⭐ Premium' : 'Regular'}`
        );

      } catch (error: any) {
        errorCount++;
        console.error(`❌ [${i + 1}/${CREATOR_PROFILES.length}] Error creating ${profile.firstName} ${profile.lastName}:`, error.message);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('📊 UGC Content Creator Users Seeding Summary');
    console.log('='.repeat(80));

    // Category breakdown
    const categoryStats = {
      fashion: createdUsers.filter(u => CREATOR_PROFILES.find(p =>
        p.firstName === u.profile?.firstName && p.category === 'fashion'
      )).length,
      beauty: createdUsers.filter(u => CREATOR_PROFILES.find(p =>
        p.firstName === u.profile?.firstName && p.category === 'beauty'
      )).length,
      lifestyle: createdUsers.filter(u => CREATOR_PROFILES.find(p =>
        p.firstName === u.profile?.firstName && p.category === 'lifestyle'
      )).length,
      tech: createdUsers.filter(u => CREATOR_PROFILES.find(p =>
        p.firstName === u.profile?.firstName && p.category === 'tech'
      )).length
    };

    console.log(`\n📈 Total Users Created: ${successCount}/${CREATOR_PROFILES.length}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log('\n📁 Category Breakdown:');
    console.log(`   👗 Fashion Influencers: ${categoryStats.fashion}`);
    console.log(`   💄 Beauty Creators: ${categoryStats.beauty}`);
    console.log(`   🌟 Lifestyle Bloggers: ${categoryStats.lifestyle}`);
    console.log(`   📱 Tech Reviewers: ${categoryStats.tech}`);

    // Demographics
    const genderStats = {
      male: createdUsers.filter(u => u.profile?.gender === 'male').length,
      female: createdUsers.filter(u => u.profile?.gender === 'female').length
    };

    console.log('\n👥 Demographics:');
    console.log(`   Female: ${genderStats.female}`);
    console.log(`   Male: ${genderStats.male}`);

    // Premium stats
    const premiumCount = createdUsers.filter(u => u.isPremium).length;
    console.log('\n⭐ Premium Users: ', premiumCount);

    // Engagement tiers
    const tierStats: Record<string, number> = {};
    createdUsers.forEach(u => {
      const tier = u.referralTier || 'STARTER';
      tierStats[tier] = (tierStats[tier] || 0) + 1;
    });

    console.log('\n🏆 Referral Tier Distribution:');
    Object.entries(tierStats).sort((a, b) => b[1] - a[1]).forEach(([tier, count]) => {
      console.log(`   ${tier}: ${count}`);
    });

    // City distribution
    const cityStats: Record<string, number> = {};
    createdUsers.forEach(u => {
      const city = u.location || 'Unknown';
      cityStats[city] = (cityStats[city] || 0) + 1;
    });

    console.log('\n🌍 City Distribution:');
    Object.entries(cityStats).sort((a, b) => b[1] - a[1]).slice(0, 5).forEach(([city, count]) => {
      console.log(`   ${city}: ${count}`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('\n✅ UGC content creator users seeding completed successfully!');
    console.log('\n💡 Next Steps:');
    console.log('   1. Run seed-ugc-videos.ts to create UGC videos for these users');
    console.log('   2. Test user API endpoints: GET /api/users');
    console.log('   3. Verify user profiles in database');

    console.log('\n📋 Sample User IDs for reference:');
    createdUsers.slice(0, 3).forEach(user => {
      console.log(`   ${user._id} - ${user.profile?.firstName} ${user.profile?.lastName} (${user.phoneNumber})`);
    });

    // Export created users for other scripts
    return createdUsers;

  } catch (error: any) {
    console.error('\n❌ Fatal Error during seeding:', error);
    console.error('Stack trace:', error.stack);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Export for use in other scripts
export { CREATOR_PROFILES, seedUserCreators };

// Run seeding if executed directly
if (require.main === module) {
  seedUserCreators()
    .then(() => {
      console.log('\n🎉 Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Script failed:', error.message);
      process.exit(1);
    });
}
