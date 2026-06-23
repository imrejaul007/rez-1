/**
 * Seed User Settings
 * Creates default settings for all users
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/User';
import { UserSettings } from '../models/UserSettings';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rez-app';

// Default settings template
const getDefaultSettings = (userId: mongoose.Types.ObjectId) => ({
  user: userId,
  general: {
    language: 'en',
    currency: 'INR',
    timezone: 'Asia/Kolkata',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '12h' as const,
    theme: 'auto' as const,
  },
  notifications: {
    push: {
      enabled: true,
      orderUpdates: true,
      promotions: true,
      recommendations: true,
      priceAlerts: true,
      deliveryUpdates: true,
      paymentUpdates: true,
      securityAlerts: true,
      chatMessages: true,
    },
    email: {
      enabled: true,
      newsletters: false,
      orderReceipts: true,
      weeklyDigest: true,
      promotions: false,
      securityAlerts: true,
      accountUpdates: true,
    },
    sms: {
      enabled: true,
      orderUpdates: true,
      deliveryAlerts: true,
      paymentConfirmations: true,
      securityAlerts: true,
      otpMessages: true,
    },
    inApp: {
      enabled: true,
      showBadges: true,
      soundEnabled: true,
      vibrationEnabled: true,
      bannerStyle: 'BANNER' as const,
    },
  },
  privacy: {
    profileVisibility: 'FRIENDS' as const,
    showActivity: true,
    showPurchaseHistory: false,
    allowMessaging: true,
    allowFriendRequests: true,
    dataSharing: {
      shareWithPartners: false,
      shareForMarketing: false,
      shareForRecommendations: true,
      shareForAnalytics: true,
      sharePurchaseData: false,
    },
    analytics: {
      allowUsageTracking: true,
      allowCrashReporting: true,
      allowPerformanceTracking: true,
      allowLocationTracking: false,
    },
  },
  security: {
    twoFactorAuth: {
      enabled: true,
      method: '2FA_SMS' as const,
      backupCodes: ['ABC123XYZ', 'DEF456UVW', 'GHI789RST'],
      lastUpdated: new Date(),
    },
    biometric: {
      fingerprintEnabled: true,
      faceIdEnabled: false,
      voiceEnabled: false,
      availableMethods: ['FINGERPRINT' as const],
    },
    sessionManagement: {
      autoLogoutTime: 30, // 30 minutes
      allowMultipleSessions: true,
      rememberMe: true,
    },
    loginAlerts: true,
  },
  delivery: {
    deliveryInstructions: 'Please ring the doorbell',
    deliveryTime: {
      preferred: 'ASAP' as const,
      workingDays: ['MON' as const, 'TUE' as const, 'WED' as const, 'THU' as const, 'FRI' as const],
    },
    contactlessDelivery: true,
    deliveryNotifications: true,
  },
  payment: {
    autoPayEnabled: false,
    paymentPinEnabled: true,
    biometricPaymentEnabled: true,
    transactionLimits: {
      dailyLimit: 10000,
      weeklyLimit: 50000,
      monthlyLimit: 200000,
      singleTransactionLimit: 25000,
    },
  },
  preferences: {
    startupScreen: 'HOME' as const,
    defaultView: 'CARD' as const,
    autoRefresh: true,
    offlineMode: false,
    dataSaver: false,
    highQualityImages: true,
    animations: true,
    sounds: true,
    hapticFeedback: true,
  },
  courier: {
    preferredCourier: 'any' as const,
    deliveryTimePreference: {
      weekdays: ['MON' as const, 'TUE' as const, 'WED' as const, 'THU' as const, 'FRI' as const],
      preferredTimeSlot: {
        start: '09:00',
        end: '18:00',
      },
      avoidWeekends: false,
    },
    deliveryInstructions: {
      contactlessDelivery: true,
      leaveAtDoor: false,
      signatureRequired: false,
      callBeforeDelivery: true,
      specificInstructions: 'Please call 5 minutes before delivery',
    },
    courierNotifications: {
      smsUpdates: true,
      emailUpdates: true,
      whatsappUpdates: false,
      callUpdates: false,
    },
  },
  lastUpdated: new Date(),
});

async function seedUserSettings() {
  try {
    console.log('🌱 Starting User Settings Seed...\n');

    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all users
    console.log('👥 Fetching users...');
    const users = await User.find({});
    console.log(`✅ Found ${users.length} users\n`);

    if (users.length === 0) {
      console.log('⚠️  No users found. Please seed users first.');
      process.exit(0);
    }

    // Clear existing settings
    console.log('🗑️  Clearing existing user settings...');
    await UserSettings.deleteMany({});
    console.log('✅ Cleared existing settings\n');

    // Create settings for each user
    console.log('📝 Creating user settings...');
    const settingsToCreate = [];

    for (const user of users) {
      const settings = getDefaultSettings(user._id as mongoose.Types.ObjectId);
      settingsToCreate.push(settings);
    }

    await UserSettings.insertMany(settingsToCreate);
    console.log(`✅ Created settings for ${settingsToCreate.length} users\n`);

    // Verify
    const count = await UserSettings.countDocuments();
    console.log('📊 Verification:');
    console.log(`   Total UserSettings: ${count}`);

    // Show sample
    const sample = await UserSettings.findOne().populate('user', 'email profile.firstName profile.lastName');
    if (sample) {
      console.log('\n📋 Sample User Settings:');
      console.log(`   User: ${(sample.user as any)?.email}`);
      console.log(`   Language: ${sample.general.language}`);
      console.log(`   Currency: ${sample.general.currency}`);
      console.log(`   Theme: ${sample.general.theme}`);
      console.log(`   Push Notifications: ${sample.notifications.push.enabled ? 'Enabled' : 'Disabled'}`);
      console.log(`   2FA: ${sample.security.twoFactorAuth.enabled ? 'Enabled' : 'Disabled'}`);
      console.log(`   Preferred Courier: ${sample.courier.preferredCourier}`);
    }

    console.log('\n✅ User Settings Seed Complete!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding user settings:', error);
    process.exit(1);
  }
}

// Run the seed function
if (require.main === module) {
  seedUserSettings();
}

export default seedUserSettings;
