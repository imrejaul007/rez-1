const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI as string;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); }
;
const DB_NAME = 'test';

// User Schema (simplified for seeding - will use existing User model)
const UserSchema = new mongoose.Schema({
  phoneNumber: { type: String, required: true, unique: true },
  email: { type: String, unique: true, sparse: true },
  role: { type: String, enum: ['user', 'admin', 'merchant'], default: 'merchant' },
  profile: {
    firstName: String,
    lastName: String,
    avatar: String,
    bio: String,
    website: String,
    location: {
      address: String,
      city: String,
      state: String,
      pincode: String,
      coordinates: [Number]
    }
  },
  referral: {
    referralCode: { type: String, unique: true, sparse: true },
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    referralCount: { type: Number, default: 0 }
  },
  auth: {
    isVerified: { type: Boolean, default: true },
    isOnboarded: { type: Boolean, default: true },
    lastLogin: Date
  },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Create or use existing User model
const User = mongoose.models.User || mongoose.model('User', UserSchema);

// Helper function to generate unique referral code
function generateReferralCode(name) {
  const cleanName = name.replace(/\s+/g, '').toUpperCase().substring(0, 6);
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${cleanName}${random}`;
}

// Comprehensive merchant data with realistic business information
const merchantsData = [
  // FASHION MERCHANTS (4)
  {
    phoneNumber: '+919876501001',
    email: 'info@trendsetters.com',
    role: 'merchant',
    referral: {
      referralCode: generateReferralCode('Trendsetters'),
      referredBy: null,
      referralCount: 0
    },
    profile: {
      firstName: 'Trendsetters',
      lastName: 'Boutique',
      avatar: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=200',
      bio: 'Premium fashion boutique offering the latest trends in ethnic and western wear. Your style destination for all occasions.',
      website: 'https://trendsetters.com',
      location: {
        address: '123 Fashion Street, MG Road',
        city: 'Bangalore',
        state: 'Karnataka',
        pincode: '560001',
        coordinates: [77.5946, 12.9716]
      }
    },
    auth: {
      isVerified: true,
      isOnboarded: true,
      lastLogin: new Date('2025-01-05T10:30:00Z')
    },
    isActive: true
  },
  {
    phoneNumber: '+919876501002',
    email: 'contact@ethnicwear.com',
    role: 'merchant',
    referral: {
      referralCode: generateReferralCode('EthnicElegance'),
      referredBy: null,
      referralCount: 0
    },
    profile: {
      firstName: 'Ethnic',
      lastName: 'Elegance',
      avatar: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=200',
      bio: 'Traditional Indian clothing and accessories. Sarees, lehengas, kurtas and more. Celebrating Indian heritage through fashion.',
      website: 'https://ethnicelegance.com',
      location: {
        address: '456 Silk Board, HSR Layout',
        city: 'Bangalore',
        state: 'Karnataka',
        pincode: '560102',
        coordinates: [77.6408, 12.9141]
      }
    },
    auth: {
      isVerified: true,
      isOnboarded: true,
      lastLogin: new Date('2025-01-06T14:20:00Z')
    },
    isActive: true
  },
  {
    phoneNumber: '+919876501003',
    email: 'hello@urbanstyle.com',
    role: 'merchant',
    referral: {
      referralCode: generateReferralCode('UrbanStyle'),
      referredBy: null,
      referralCount: 0
    },
    profile: {
      firstName: 'Urban',
      lastName: 'Style Studio',
      avatar: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=200',
      bio: 'Contemporary fashion for the modern individual. Western wear, casual clothing, and trendy accessories.',
      website: 'https://urbanstylestudio.com',
      location: {
        address: '789 Indiranagar 100ft Road',
        city: 'Bangalore',
        state: 'Karnataka',
        pincode: '560038',
        coordinates: [77.6408, 12.9716]
      }
    },
    auth: {
      isVerified: true,
      isOnboarded: true,
      lastLogin: new Date('2025-01-07T09:15:00Z')
    },
    isActive: true
  },
  {
    phoneNumber: '+919876501004',
    email: 'shop@luxefashion.com',
    role: 'merchant',
    referral: {
      referralCode: generateReferralCode('LuxeFashion'),
      referredBy: null,
      referralCount: 0
    },
    profile: {
      firstName: 'Luxe',
      lastName: 'Fashion House',
      avatar: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=200',
      bio: 'Designer wear and luxury fashion. Exclusive collections from top Indian and international designers.',
      website: 'https://luxefashionhouse.com',
      location: {
        address: '321 UB City Mall, Vittal Mallya Road',
        city: 'Bangalore',
        state: 'Karnataka',
        pincode: '560001',
        coordinates: [77.5946, 12.9716]
      }
    },
    auth: {
      isVerified: true,
      isOnboarded: true,
      lastLogin: new Date('2025-01-08T11:45:00Z')
    },
    isActive: true
  },

  // BEAUTY MERCHANTS (3)
  {
    phoneNumber: '+919876501005',
    email: 'info@glowbeauty.com',
    role: 'merchant',
    referral: {
      referralCode: generateReferralCode('GlowBeauty'),
      referredBy: null,
      referralCount: 0
    },
    profile: {
      firstName: 'Glow',
      lastName: 'Beauty Lounge',
      avatar: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=200',
      bio: 'Professional beauty salon and spa. Skincare, makeup, haircare, and wellness services. Your beauty transformation starts here.',
      website: 'https://glowbeautylounge.com',
      location: {
        address: '147 Jayanagar 4th Block',
        city: 'Bangalore',
        state: 'Karnataka',
        pincode: '560011',
        coordinates: [77.5833, 12.9304]
      }
    },
    auth: {
      isVerified: true,
      isOnboarded: true,
      lastLogin: new Date('2025-01-07T08:30:00Z')
    },
    isActive: true
  },
  {
    phoneNumber: '+919876501006',
    email: 'contact@naturalbeauty.com',
    role: 'merchant',
    referral: {
      referralCode: generateReferralCode('NaturalBeauty'),
      referredBy: null,
      referralCount: 0
    },
    profile: {
      firstName: 'Natural',
      lastName: 'Beauty Studio',
      avatar: 'https://images.unsplash.com/photo-1487412912498-0447578fcca8?w=200',
      bio: 'Organic and natural beauty products. Skincare, cosmetics, and wellness products made from natural ingredients.',
      website: 'https://naturalbeautystudio.com',
      location: {
        address: '258 Whitefield Main Road',
        city: 'Bangalore',
        state: 'Karnataka',
        pincode: '560066',
        coordinates: [77.7500, 12.9698]
      }
    },
    auth: {
      isVerified: true,
      isOnboarded: true,
      lastLogin: new Date('2025-01-06T16:00:00Z')
    },
    isActive: true
  },
  {
    phoneNumber: '+919876501007',
    email: 'hello@glamspa.com',
    role: 'merchant',
    referral: {
      referralCode: generateReferralCode('GlamSpa'),
      referredBy: null,
      referralCount: 0
    },
    profile: {
      firstName: 'Glam',
      lastName: 'Spa & Salon',
      avatar: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=200',
      bio: 'Luxury spa and salon experience. Premium treatments, bridal makeup, and exclusive beauty services.',
      website: 'https://glamspa.com',
      location: {
        address: '654 Koramangala 5th Block',
        city: 'Bangalore',
        state: 'Karnataka',
        pincode: '560095',
        coordinates: [77.6229, 12.9304]
      }
    },
    auth: {
      isVerified: true,
      isOnboarded: true,
      lastLogin: new Date('2025-01-08T13:20:00Z')
    },
    isActive: true
  },

  // LIFESTYLE MERCHANTS (3)
  {
    phoneNumber: '+919876501008',
    email: 'info@homedecor.com',
    role: 'merchant',
    referral: {
      referralCode: generateReferralCode('HomeDecor'),
      referredBy: null,
      referralCount: 0
    },
    profile: {
      firstName: 'Home',
      lastName: 'Decor Gallery',
      avatar: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=200',
      bio: 'Premium home decor and furnishings. Transform your living space with our curated collection of furniture and accessories.',
      website: 'https://homedecorgallery.com',
      location: {
        address: '369 Brigade Road',
        city: 'Bangalore',
        state: 'Karnataka',
        pincode: '560025',
        coordinates: [77.6091, 12.9716]
      }
    },
    auth: {
      isVerified: true,
      isOnboarded: true,
      lastLogin: new Date('2025-01-07T10:00:00Z')
    },
    isActive: true
  },
  {
    phoneNumber: '+919876501009',
    email: 'contact@fitlife.com',
    role: 'merchant',
    referral: {
      referralCode: generateReferralCode('FitLife'),
      referredBy: null,
      referralCount: 0
    },
    profile: {
      firstName: 'Fit',
      lastName: 'Life Wellness',
      avatar: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=200',
      bio: 'Fitness and wellness center. Gym equipment, supplements, activewear, and personalized training programs.',
      website: 'https://fitlifewellness.com',
      location: {
        address: '741 Marathahalli',
        city: 'Bangalore',
        state: 'Karnataka',
        pincode: '560037',
        coordinates: [77.7000, 12.9581]
      }
    },
    auth: {
      isVerified: true,
      isOnboarded: true,
      lastLogin: new Date('2025-01-08T07:45:00Z')
    },
    isActive: true
  },
  {
    phoneNumber: '+919876501010',
    email: 'hello@artcraft.com',
    role: 'merchant',
    referral: {
      referralCode: generateReferralCode('ArtCraft'),
      referredBy: null,
      referralCount: 0
    },
    profile: {
      firstName: 'Art',
      lastName: 'Craft Emporium',
      avatar: 'https://images.unsplash.com/photo-1452860606245-08befc0ff44b?w=200',
      bio: 'Handmade crafts, artworks, and unique lifestyle products. Supporting local artisans and traditional craftsmanship.',
      website: 'https://artcraftemporium.com',
      location: {
        address: '852 Commercial Street',
        city: 'Bangalore',
        state: 'Karnataka',
        pincode: '560001',
        coordinates: [77.6109, 12.9716]
      }
    },
    auth: {
      isVerified: true,
      isOnboarded: true,
      lastLogin: new Date('2025-01-05T15:30:00Z')
    },
    isActive: true
  },

  // TECH MERCHANTS (3)
  {
    phoneNumber: '+919876501011',
    email: 'info@techzone.com',
    role: 'merchant',
    referral: {
      referralCode: generateReferralCode('TechZone'),
      referredBy: null,
      referralCount: 0
    },
    profile: {
      firstName: 'Tech',
      lastName: 'Zone Electronics',
      avatar: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=200',
      bio: 'Latest electronics and gadgets. Smartphones, laptops, accessories, and smart home devices at competitive prices.',
      website: 'https://techzone.com',
      location: {
        address: '963 SP Road, Chickpet',
        city: 'Bangalore',
        state: 'Karnataka',
        pincode: '560053',
        coordinates: [77.5778, 12.9698]
      }
    },
    auth: {
      isVerified: true,
      isOnboarded: true,
      lastLogin: new Date('2025-01-08T09:00:00Z')
    },
    isActive: true
  },
  {
    phoneNumber: '+919876501012',
    email: 'contact@gadgetworld.com',
    role: 'merchant',
    referral: {
      referralCode: generateReferralCode('GadgetWorld'),
      referredBy: null,
      referralCount: 0
    },
    profile: {
      firstName: 'Gadget',
      lastName: 'World',
      avatar: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200',
      bio: 'Your one-stop shop for all things tech. Mobile phones, computers, gaming consoles, and premium audio equipment.',
      website: 'https://gadgetworld.com',
      location: {
        address: '147 Electronic City Phase 1',
        city: 'Bangalore',
        state: 'Karnataka',
        pincode: '560100',
        coordinates: [77.6700, 12.8456]
      }
    },
    auth: {
      isVerified: true,
      isOnboarded: true,
      lastLogin: new Date('2025-01-07T12:15:00Z')
    },
    isActive: true
  },
  {
    phoneNumber: '+919876501013',
    email: 'support@smarttech.com',
    role: 'merchant',
    referral: {
      referralCode: generateReferralCode('SmartTech'),
      referredBy: null,
      referralCount: 0
    },
    profile: {
      firstName: 'Smart',
      lastName: 'Tech Solutions',
      avatar: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=200',
      bio: 'Smart home automation and IoT devices. Transform your home into a smart living space with cutting-edge technology.',
      website: 'https://smarttechsolutions.com',
      location: {
        address: '258 Outer Ring Road, Bellandur',
        city: 'Bangalore',
        state: 'Karnataka',
        pincode: '560103',
        coordinates: [77.6754, 12.9250]
      }
    },
    auth: {
      isVerified: true,
      isOnboarded: true,
      lastLogin: new Date('2025-01-06T11:30:00Z')
    },
    isActive: true
  },

  // ADDITIONAL MERCHANTS (2 more for variety)
  {
    phoneNumber: '+919876501014',
    email: 'info@bookshaven.com',
    role: 'merchant',
    referral: {
      referralCode: generateReferralCode('BooksHaven'),
      referredBy: null,
      referralCount: 0
    },
    profile: {
      firstName: 'Books',
      lastName: 'Haven',
      avatar: 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=200',
      bio: 'Independent bookstore with a vast collection of books, stationery, and educational materials. A paradise for book lovers.',
      website: 'https://bookshaven.com',
      location: {
        address: '741 Church Street',
        city: 'Bangalore',
        state: 'Karnataka',
        pincode: '560001',
        coordinates: [77.6091, 12.9716]
      }
    },
    auth: {
      isVerified: true,
      isOnboarded: true,
      lastLogin: new Date('2025-01-08T08:00:00Z')
    },
    isActive: true
  },
  {
    phoneNumber: '+919876501015',
    email: 'hello@jewelrycorner.com',
    role: 'merchant',
    referral: {
      referralCode: generateReferralCode('JewelryCorner'),
      referredBy: null,
      referralCount: 0
    },
    profile: {
      firstName: 'Jewelry',
      lastName: 'Corner',
      avatar: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=200',
      bio: 'Exquisite jewelry in gold, silver, and precious stones. Traditional and contemporary designs for every occasion.',
      website: 'https://jewelrycorner.com',
      location: {
        address: '369 Chickpet Main Road',
        city: 'Bangalore',
        state: 'Karnataka',
        pincode: '560053',
        coordinates: [77.5778, 12.9698]
      }
    },
    auth: {
      isVerified: true,
      isOnboarded: true,
      lastLogin: new Date('2025-01-07T14:45:00Z')
    },
    isActive: true
  }
];

/**
 * Seed merchants into the database
 * Creates 15 realistic merchant accounts across different business categories
 */
async function seedMerchants() {
  try {
    console.log('🌱 Starting merchant seeding process...\n');

    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      dbName: DB_NAME,
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB successfully!\n');

    // Clear existing merchant users
    console.log('🧹 Clearing existing merchant users...');
    const deletedCount = await User.deleteMany({ role: 'merchant' });
    console.log(`✅ Deleted ${deletedCount.deletedCount} existing merchants\n`);

    // Seed new merchants
    console.log('👥 Creating merchant accounts...');
    const createdMerchants = await User.insertMany(merchantsData);
    console.log(`✅ Successfully created ${createdMerchants.length} merchants!\n`);

    // Display summary
    console.log('📊 Merchant Summary by Category:');
    console.log('================================\n');

    const fashionMerchants = createdMerchants.slice(0, 4);
    const beautyMerchants = createdMerchants.slice(4, 7);
    const lifestyleMerchants = createdMerchants.slice(7, 10);
    const techMerchants = createdMerchants.slice(10, 13);
    const otherMerchants = createdMerchants.slice(13, 15);

    console.log('👗 FASHION (4 merchants):');
    fashionMerchants.forEach(m => {
      console.log(`   - ${m.profile.firstName} ${m.profile.lastName}`);
      console.log(`     📧 ${m.email}`);
      console.log(`     📱 ${m.phoneNumber}`);
      console.log(`     📍 ${m.profile.location.city}`);
      console.log('');
    });

    console.log('💄 BEAUTY (3 merchants):');
    beautyMerchants.forEach(m => {
      console.log(`   - ${m.profile.firstName} ${m.profile.lastName}`);
      console.log(`     📧 ${m.email}`);
      console.log(`     📱 ${m.phoneNumber}`);
      console.log(`     📍 ${m.profile.location.city}`);
      console.log('');
    });

    console.log('🏠 LIFESTYLE (3 merchants):');
    lifestyleMerchants.forEach(m => {
      console.log(`   - ${m.profile.firstName} ${m.profile.lastName}`);
      console.log(`     📧 ${m.email}`);
      console.log(`     📱 ${m.phoneNumber}`);
      console.log(`     📍 ${m.profile.location.city}`);
      console.log('');
    });

    console.log('💻 TECH (3 merchants):');
    techMerchants.forEach(m => {
      console.log(`   - ${m.profile.firstName} ${m.profile.lastName}`);
      console.log(`     📧 ${m.email}`);
      console.log(`     📱 ${m.phoneNumber}`);
      console.log(`     📍 ${m.profile.location.city}`);
      console.log('');
    });

    console.log('📚 OTHER (2 merchants):');
    otherMerchants.forEach(m => {
      console.log(`   - ${m.profile.firstName} ${m.profile.lastName}`);
      console.log(`     📧 ${m.email}`);
      console.log(`     📱 ${m.phoneNumber}`);
      console.log(`     📍 ${m.profile.location.city}`);
      console.log('');
    });

    console.log('================================');
    console.log(`✅ Total merchants created: ${createdMerchants.length}`);
    console.log('✅ All merchants verified: true');
    console.log('✅ All merchants active: true\n');

    console.log('🎉 Merchant seeding completed successfully!\n');

    return createdMerchants;

  } catch (error) {
    console.error('❌ Error seeding merchants:', error);
    console.error('Error details:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    throw error;
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Export merchants data for use in other seed scripts
module.exports = {
  seedMerchants,
  merchantsData
};

// Run seeding if this file is executed directly
if (require.main === module) {
  seedMerchants()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}
