// SECURITY: hard-coded MongoDB credentials replaced with env-var reference.
// Set MONGODB_URI in your environment before running this script.

/**
 * Challenge Seeds - Update/Regenerate Challenge Dates
 * Run with: npx ts-node src/seeds/challengeSeeds.ts
 *
 * This script updates all existing challenges with fresh start/end dates
 * and can also create new challenges from templates.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Challenge from '../models/Challenge';
import CHALLENGE_TEMPLATES from '../config/challengeTemplates';

dotenv.config();

// Get date helpers
const getDateRange = (type: string): { startDate: Date; endDate: Date } => {
  const now = new Date();
  now.setHours(0, 0, 0, 0); // Start of today

  const startDate = new Date(now);
  const endDate = new Date(now);

  switch (type) {
    case 'daily':
      // Daily: starts today, ends tomorrow at 11:59 PM
      endDate.setDate(endDate.getDate() + 1);
      endDate.setHours(23, 59, 59, 999);
      break;
    case 'weekly':
      // Weekly: starts today, ends in 7 days
      endDate.setDate(endDate.getDate() + 7);
      endDate.setHours(23, 59, 59, 999);
      break;
    case 'monthly':
      // Monthly: starts today, ends in 30 days
      endDate.setDate(endDate.getDate() + 30);
      endDate.setHours(23, 59, 59, 999);
      break;
    case 'special':
      // Special: starts today, ends in 14 days
      endDate.setDate(endDate.getDate() + 14);
      endDate.setHours(23, 59, 59, 999);
      break;
    default:
      endDate.setDate(endDate.getDate() + 7);
      endDate.setHours(23, 59, 59, 999);
  }

  return { startDate, endDate };
};

async function updateExistingChallenges() {
  console.log('\n📅 Updating existing challenge dates...');

  const challenges = await Challenge.find({});
  let updatedCount = 0;

  for (const challenge of challenges) {
    const { startDate, endDate } = getDateRange(challenge.type);

    challenge.startDate = startDate;
    challenge.endDate = endDate;
    challenge.active = true;

    await challenge.save();
    updatedCount++;
    console.log(`   ✅ Updated: ${challenge.title} (${challenge.type}) -> ends ${endDate.toDateString()}`);
  }

  console.log(`   📊 Total updated: ${updatedCount} challenges\n`);
  return updatedCount;
}

async function createChallengesFromTemplates() {
  console.log('\n🎯 Creating challenges from templates...');

  const now = new Date();
  let createdCount = 0;

  // Group templates by type
  const dailyTemplates = CHALLENGE_TEMPLATES.filter(t => t.type === 'daily');
  const weeklyTemplates = CHALLENGE_TEMPLATES.filter(t => t.type === 'weekly');
  const monthlyTemplates = CHALLENGE_TEMPLATES.filter(t => t.type === 'monthly');
  const specialTemplates = CHALLENGE_TEMPLATES.filter(t => t.type === 'special');

  // Create 5 daily challenges
  console.log('   📆 Creating daily challenges...');
  for (let i = 0; i < Math.min(5, dailyTemplates.length); i++) {
    const template = dailyTemplates[i];
    const { startDate, endDate } = getDateRange('daily');

    const existing = await Challenge.findOne({ title: template.title, type: 'daily' });
    if (!existing) {
      await Challenge.create({
        ...template,
        startDate,
        endDate,
        active: true,
        featured: i === 0,
        participantCount: 0,
        completionCount: 0,
      });
      createdCount++;
      console.log(`      ✅ Created: ${template.title}`);
    }
  }

  // Create 3 weekly challenges
  console.log('   📅 Creating weekly challenges...');
  for (let i = 0; i < Math.min(3, weeklyTemplates.length); i++) {
    const template = weeklyTemplates[i];
    const { startDate, endDate } = getDateRange('weekly');

    const existing = await Challenge.findOne({ title: template.title, type: 'weekly' });
    if (!existing) {
      await Challenge.create({
        ...template,
        startDate,
        endDate,
        active: true,
        featured: i === 0,
        participantCount: 0,
        completionCount: 0,
      });
      createdCount++;
      console.log(`      ✅ Created: ${template.title}`);
    }
  }

  // Create 2 monthly challenges
  console.log('   📆 Creating monthly challenges...');
  for (let i = 0; i < Math.min(2, monthlyTemplates.length); i++) {
    const template = monthlyTemplates[i];
    const { startDate, endDate } = getDateRange('monthly');

    const existing = await Challenge.findOne({ title: template.title, type: 'monthly' });
    if (!existing) {
      await Challenge.create({
        ...template,
        startDate,
        endDate,
        active: true,
        featured: i === 0,
        participantCount: 0,
        completionCount: 0,
      });
      createdCount++;
      console.log(`      ✅ Created: ${template.title}`);
    }
  }

  // Create 2 special challenges
  console.log('   🌟 Creating special challenges...');
  for (let i = 0; i < Math.min(2, specialTemplates.length); i++) {
    const template = specialTemplates[i];
    const { startDate, endDate } = getDateRange('special');

    const existing = await Challenge.findOne({ title: template.title, type: 'special' });
    if (!existing) {
      await Challenge.create({
        ...template,
        startDate,
        endDate,
        active: true,
        featured: i === 0,
        participantCount: 0,
        completionCount: 0,
      });
      createdCount++;
      console.log(`      ✅ Created: ${template.title}`);
    }
  }

  console.log(`   📊 Total created: ${createdCount} new challenges\n`);
  return createdCount;
}

async function runChallengeSeeds() {
  console.log('🚀 Starting Challenge Seeds...\n');

  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI ||
      (process.env.MONGODB_URI || process.env.MONGO_URI) as string;
if (!mongoUri) { console.error('MONGODB_URI or MONGO_URI not set'); process.exit(1); };

    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Check current state
    const totalChallenges = await Challenge.countDocuments();
    const now = new Date();
    const activeChallenges = await Challenge.countDocuments({
      active: true,
      startDate: { $lte: now },
      endDate: { $gte: now }
    });

    console.log('📊 Current State:');
    console.log(`   Total challenges: ${totalChallenges}`);
    console.log(`   Active challenges: ${activeChallenges}`);

    // Update existing challenges with fresh dates
    const updatedCount = await updateExistingChallenges();

    // Create new challenges from templates if needed
    const createdCount = await createChallengesFromTemplates();

    // Verify final state
    const finalTotal = await Challenge.countDocuments();
    const finalActive = await Challenge.countDocuments({
      active: true,
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() }
    });

    console.log('━'.repeat(50));
    console.log('📊 FINAL STATE');
    console.log('━'.repeat(50));
    console.log(`   Total challenges: ${finalTotal}`);
    console.log(`   Active challenges: ${finalActive}`);
    console.log(`   Updated: ${updatedCount}`);
    console.log(`   Created: ${createdCount}`);
    console.log('━'.repeat(50));

    console.log('\n🎉 Challenge seeds completed successfully!');

  } catch (error) {
    console.error('❌ Error running challenge seeds:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n📡 Disconnected from MongoDB');
  }
}

// Run seeds if executed directly
if (require.main === module) {
  runChallengeSeeds()
    .then(() => {
      console.log('\n✅ Seeding complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}

export { runChallengeSeeds, updateExistingChallenges, createChallengesFromTemplates };
