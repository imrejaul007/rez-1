/**
 * Seed Special Program Configurations
 *
 * Run once to create the 3 SpecialProgramConfig documents.
 * Safe to re-run — uses upsert to avoid duplicates.
 *
 * Usage: npx ts-node src/scripts/seedSpecialPrograms.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import SpecialProgramConfig from '../models/SpecialProgramConfig';
import { BRAND } from '../config/brand';

dotenv.config();

const PROGRAMS = [
  {
    slug: 'student_zone',
    name: 'Student Zone',
    description: 'Exclusive earning program for verified students. Earn extra coins through campus activities, ambassador tasks, and student-only campaigns.',
    badge: '🎓',
    icon: 'school',
    eligibility: {
      requiresVerification: true,
      verificationZone: 'student',
      requiresPriveScore: false,
      customRules: [],
    },
    benefits: [
      { title: 'Student of the Month', description: 'Top earner recognition with bonus coins', icon: '🏆', type: 'recognition' as const },
      { title: 'Event Participation', description: 'Earn coins at exclusive campus events', icon: '🎪', type: 'perk' as const },
      { title: 'Campus Ambassador', description: 'Earn by spreading the word on campus', icon: '📢', type: 'task_reward' as const },
      { title: '1.5x Multiplier', description: 'On all qualifying earnings', icon: '⚡', type: 'earning_multiplier' as const },
    ],
    earningConfig: {
      monthlyCap: 5000,
      multiplier: 1.5,
      multiplierAppliesTo: ['order', 'review', 'bill_upload', 'referral', 'social_share_reward', 'daily_login', 'creator_pick_reward', 'poll_vote', 'photo_upload', 'offer_comment', 'ugc_reel', 'program_task_reward'],
      earningsDisplayText: 'Up to 5,000 coins/month',
    },
    linkedCampaigns: [],
    gradientColors: ['#DBEAFE', '#BFDBFE'],
    isActive: true,
    priority: 10,
  },
  {
    slug: 'corporate_perks',
    name: 'Corporate Perks',
    description: 'Employee benefit program for verified corporate professionals. Access exclusive BNPL offers, corporate events, and workplace campaigns.',
    badge: '🧑‍💼',
    icon: 'briefcase',
    eligibility: {
      requiresVerification: true,
      verificationZone: 'corporate',
      requiresPriveScore: false,
      customRules: [],
    },
    benefits: [
      { title: 'Employee of the Month', description: 'Top earner recognition at your company', icon: '🏅', type: 'recognition' as const },
      { title: 'Corporate Events', description: 'Earn coins at company-sponsored events', icon: '🎯', type: 'perk' as const },
      { title: 'Exclusive BNPL', description: 'Access to Buy Now, Pay Later offers', icon: '💳', type: 'perk' as const },
      { title: '1.2x Multiplier', description: 'On all qualifying earnings', icon: '⚡', type: 'earning_multiplier' as const },
    ],
    earningConfig: {
      monthlyCap: 3000,
      multiplier: 1.2,
      multiplierAppliesTo: ['order', 'review', 'bill_upload', 'purchase_reward', 'daily_login', 'social_share_reward', 'cashback', 'program_task_reward'],
      earningsDisplayText: 'Up to 3,000 coins/month',
    },
    linkedCampaigns: [],
    gradientColors: ['#FEF3C7', '#FDE68A'],
    isActive: true,
    priority: 9,
  },
  {
    slug: 'nuqta_prive',
    name: `${BRAND.PRIVE_NAME}`,
    description: `Premium reputation-based program for top ${BRAND.APP_NAME} users. Unlock the highest multipliers, premium campaigns, and brand collaboration opportunities.`,
    badge: '👑',
    icon: 'diamond',
    eligibility: {
      requiresVerification: false,
      requiresPriveScore: true,
      minPriveScore: 70,
      customRules: [
        { type: 'account_age_days' as const, value: 30, label: 'Account at least 30 days old' },
      ],
    },
    benefits: [
      { title: 'Premium Campaigns', description: 'Access to exclusive high-value campaigns', icon: '💎', type: 'exclusive_campaign' as const },
      { title: 'High Multipliers', description: '2x earning on qualifying activities', icon: '🚀', type: 'earning_multiplier' as const },
      { title: 'Brand Collaborations', description: 'Direct partnership opportunities with brands', icon: '🤝', type: 'perk' as const },
      { title: 'Priority Support', description: 'Dedicated support channel for Privé members', icon: '⭐', type: 'perk' as const },
    ],
    earningConfig: {
      monthlyCap: 0, // Unlimited
      multiplier: 2.0,
      multiplierAppliesTo: ['order', 'review', 'bill_upload', 'referral', 'social_share_reward', 'creator_pick_reward', 'daily_login', 'poll_vote', 'photo_upload', 'offer_comment', 'ugc_reel', 'purchase_reward', 'cashback', 'program_task_reward'],
      earningsDisplayText: 'Unlimited potential',
    },
    linkedCampaigns: [],
    gradientColors: ['#1a1a2e', '#16213e'],
    isActive: true,
    priority: 11,
  },
];

async function seed() {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) {
      console.error('MONGODB_URI not set in environment');
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    for (const program of PROGRAMS) {
      const result = await SpecialProgramConfig.findOneAndUpdate(
        { slug: program.slug },
        { $set: program },
        { upsert: true, new: true }
      );
      console.log(`✅ ${result.name} (${result.slug}) — ${result.isActive ? 'active' : 'inactive'}`);
    }

    console.log('\nSeeding complete! 3 special program configs created/updated.');
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

seed();
