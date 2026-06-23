/**
 * FAQ Seed Script
 * Pre-populates the database with common FAQs for the REZ app
 * Run with: npx ts-node src/seeds/faq-seed.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { FAQ } from '../models/FAQ';
import { User } from '../models/User';
import { logger } from '../config/logger';

dotenv.config();

const faqs = [
  // General FAQs
  {
    category: 'general',
    question: 'What is REZ?',
    answer:
      'REZ is a comprehensive platform for shopping, payments, rewards, and financial services. It offers cashback, coins, exclusive deals, and a wallet to manage your digital currency.',
    shortAnswer: 'REZ is a multi-service platform offering shopping, payments, and rewards.',
    tags: ['rez', 'about', 'what-is-rez'],
    order: 1,
  },
  {
    category: 'general',
    question: 'How do I create a REZ account?',
    answer:
      'Download the REZ app from your device\'s app store, click on "Sign Up", enter your mobile number, verify the OTP, and complete your profile. You can start using REZ immediately.',
    shortAnswer: 'Download the app, sign up with your mobile number, and verify the OTP.',
    tags: ['signup', 'account', 'registration'],
    order: 2,
  },
  {
    category: 'general',
    question: 'Is my personal data secure on REZ?',
    answer:
      'Yes, REZ uses industry-standard encryption and security protocols to protect your data. We never share your information with third parties without your consent. For more details, read our Privacy Policy.',
    shortAnswer: 'Yes, we use advanced encryption to protect your data.',
    tags: ['security', 'privacy', 'data-protection'],
    order: 3,
  },
  {
    category: 'general',
    question: 'How do I contact customer support?',
    answer:
      'You can reach our support team through the "Help" section in the app, via email at support@rez.money, or call our helpline during business hours. We typically respond within 24 hours.',
    shortAnswer: 'Use the in-app Help section, email support@rez.money, or call our helpline.',
    tags: ['support', 'help', 'contact'],
    order: 4,
  },

  // Payments FAQs
  {
    category: 'payments',
    question: 'What payment methods does REZ accept?',
    answer:
      'REZ accepts multiple payment methods including credit cards, debit cards, UPI, net banking, and wallet balance. You can link your preferred payment method in the app settings.',
    shortAnswer: 'We accept cards, UPI, net banking, and wallet balance.',
    tags: ['payment', 'methods', 'cards'],
    order: 1,
  },
  {
    category: 'payments',
    question: 'Is it safe to make payments on REZ?',
    answer:
      'Yes, all payments on REZ are secured with industry-standard SSL encryption and PCI compliance. Your payment details are tokenized and never stored in plain text.',
    shortAnswer: 'Yes, all transactions are encrypted and secure.',
    tags: ['payment', 'security', 'safe'],
    order: 2,
  },
  {
    category: 'payments',
    question: 'Why was my payment declined?',
    answer:
      'Payments can be declined due to insufficient balance, incorrect details, card limits, or bank restrictions. Verify your payment details and try again. Contact your bank if the issue persists.',
    shortAnswer: 'Check your card details, balance, and bank limits.',
    tags: ['payment', 'declined', 'troubleshooting'],
    order: 3,
  },
  {
    category: 'payments',
    question: 'Can I get a refund for my payment?',
    answer:
      "Refunds are processed based on your transaction. For shopping orders, refunds are issued per the seller's policy. For other transactions, contact support with your transaction ID.",
    shortAnswer: 'Refunds depend on the transaction type. Contact support for details.',
    tags: ['refund', 'refunds', 'money-back'],
    order: 4,
  },

  // Wallet FAQs
  {
    category: 'wallet',
    question: 'What is the REZ Wallet?',
    answer:
      'The REZ Wallet is your digital account where you store coins, REZ points, and money. You can use your wallet balance for shopping, bill payments, and other transactions on the platform.',
    shortAnswer: 'The wallet stores your coins, points, and money for easy transactions.',
    tags: ['wallet', 'balance', 'coins'],
    order: 1,
  },
  {
    category: 'wallet',
    question: 'How do I add money to my wallet?',
    answer:
      'You can add money to your wallet using any payment method: cards, UPI, net banking, or bank transfer. Go to Wallet > Add Money and follow the instructions.',
    shortAnswer: 'Tap "Add Money" in the Wallet section and choose your payment method.',
    tags: ['wallet', 'add-money', 'topup'],
    order: 2,
  },
  {
    category: 'wallet',
    question: 'Can I withdraw money from my wallet?',
    answer:
      'Yes, you can withdraw wallet balance to your linked bank account. Go to Wallet > Withdraw, select your account, and enter the amount. Withdrawals are processed within 2-3 business days.',
    shortAnswer: 'Yes, go to Wallet > Withdraw and select your bank account.',
    tags: ['wallet', 'withdraw', 'transfer'],
    order: 3,
  },
  {
    category: 'wallet',
    question: 'What is the minimum balance in my wallet?',
    answer:
      'There is no minimum balance requirement. Your wallet can have a zero balance. However, to make transactions, you need sufficient balance.',
    shortAnswer: 'No minimum balance is required for your wallet.',
    tags: ['wallet', 'minimum', 'balance'],
    order: 4,
  },

  // Rewards FAQs
  {
    category: 'rewards',
    question: 'What are REZ coins?',
    answer:
      'REZ coins are a digital currency earned through shopping, referrals, activities, and loyalty programs. You can use coins to get cashback, discounts, or convert them to cash.',
    shortAnswer: 'Coins are earned through shopping and activities; use them for cashback.',
    tags: ['coins', 'rewards', 'points'],
    order: 1,
  },
  {
    category: 'rewards',
    question: 'How do I earn cashback?',
    answer:
      'You earn cashback on every purchase based on the category and offer. Cashback is automatically credited to your wallet. You can view your cashback history in the app.',
    shortAnswer: 'Cashback is automatically credited on purchases based on offers.',
    tags: ['cashback', 'earn', 'rewards'],
    order: 2,
  },
  {
    category: 'rewards',
    question: 'What is the referral program?',
    answer:
      "REZ's referral program rewards you for inviting friends. Share your referral code, and when they sign up and make their first purchase, both of you get coins.",
    shortAnswer: 'Share your code with friends; earn coins when they join and shop.',
    tags: ['referral', 'invite', 'bonus'],
    order: 3,
  },
  {
    category: 'rewards',
    question: 'Can I exchange coins for cash?',
    answer:
      'Yes, coins can be converted to cash and transferred to your bank account. The conversion rate is 1 coin = ₹1. Go to Wallet > Convert Coins.',
    shortAnswer: 'Yes, convert coins to cash at 1 coin = ₹1 ratio.',
    tags: ['coins', 'convert', 'cash'],
    order: 4,
  },

  // Account FAQs
  {
    category: 'account',
    question: 'How do I change my password?',
    answer:
      'Go to Settings > Security > Change Password. Enter your current password and then your new password. Your password should be at least 8 characters long.',
    shortAnswer: 'Go to Settings > Security > Change Password.',
    tags: ['password', 'security', 'account'],
    order: 1,
  },
  {
    category: 'account',
    question: 'How do I update my profile?',
    answer:
      'Tap your profile picture or name in the app, select "Edit Profile", and update your information. You can change your name, profile picture, phone number, and other details.',
    shortAnswer: 'Go to Profile > Edit Profile to update your information.',
    tags: ['profile', 'update', 'edit'],
    order: 2,
  },
  {
    category: 'account',
    question: 'How do I delete my account?',
    answer:
      'To delete your account, go to Settings > Account > Delete Account. Note that this action is permanent and cannot be reversed. Your wallet balance will be forfeited.',
    shortAnswer: 'Go to Settings > Account > Delete Account (permanent action).',
    tags: ['account', 'delete', 'deactivate'],
    order: 3,
  },

  // BBPS FAQs
  {
    category: 'bbps',
    question: 'What is BBPS?',
    answer:
      'BBPS (Bharat Bill Payment System) is a unified bill payment platform. Through REZ BBPS, you can pay electricity, water, mobile, insurance, and loan bills online.',
    shortAnswer: 'BBPS lets you pay bills for utilities, mobile, insurance, and loans.',
    tags: ['bbps', 'bills', 'payment'],
    order: 1,
  },
  {
    category: 'bbps',
    question: 'Which bills can I pay through REZ?',
    answer:
      'You can pay bills for electricity, water supply, gas, mobile (prepaid & postpaid), insurance premiums, loans, and other utility services. The list keeps expanding.',
    shortAnswer: 'Electricity, water, gas, mobile, insurance, loans, and more.',
    tags: ['bbps', 'bills', 'utilities'],
    order: 2,
  },
  {
    category: 'bbps',
    question: 'Are there any charges for bill payments?',
    answer:
      'Bill payments on REZ are free. No convenience charges or hidden fees are applied. You get rewards and cashback on every bill payment.',
    shortAnswer: 'Bill payments are free; you even get cashback!',
    tags: ['bbps', 'free', 'charges'],
    order: 3,
  },
];

async function seedFaqs() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/rez';
    await mongoose.connect(mongoUri);
    logger.info('[FAQ Seed] Connected to MongoDB');

    // Get admin user for createdBy field
    let adminUserId = new mongoose.Types.ObjectId();
    try {
      const adminUser = await User.findOne({ role: 'admin' }).select('_id').lean();
      if (adminUser) {
        adminUserId = adminUser._id as mongoose.Types.ObjectId;
      }
    } catch (error) {
      logger.warn('[FAQ Seed] Could not find admin user, using default ID');
    }

    // Clear existing FAQs (optional - comment out if you want to preserve existing)
    // const deleteResult = await FAQ.deleteMany({});
    // logger.info('[FAQ Seed] Deleted existing FAQs', { count: deleteResult.deletedCount });

    // Insert new FAQs with timestamps
    const faqsWithMetadata = faqs.map((faq) => ({
      ...faq,
      isActive: true,
      viewCount: 0,
      helpfulCount: 0,
      notHelpfulCount: 0,
      relatedQuestions: [],
      relatedArticles: [],
      createdBy: adminUserId,
      lastUpdatedBy: adminUserId,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    const result = await FAQ.insertMany(faqsWithMetadata);
    logger.info('[FAQ Seed] FAQs seeded successfully', { count: result.length });

    // Log breakdown by category
    const categories = faqs.reduce(
      (acc, faq) => {
        acc[faq.category] = (acc[faq.category] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    logger.info('[FAQ Seed] FAQs by category:', categories);

    logger.info('\n✓ FAQ seeding completed successfully!');
    logger.info(`Total FAQs created: ${result.length}`);
    logger.info('\nFAQs by category:');
    Object.entries(categories).forEach(([cat, count]) => {
      logger.info(`  - ${cat}: ${count} FAQs`);
    });
  } catch (error) {
    logger.error('[FAQ Seed] Error seeding FAQs:', error);
    logger.error('\n✗ Error seeding FAQs:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    logger.info('[FAQ Seed] Disconnected from MongoDB');
  }
}

// Run seed
seedFaqs().catch((error) => {
  logger.error('Seed script failed:', error);
  process.exit(1);
});
