import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import Challenge from '../models/Challenge';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI || '';
const DB_NAME = process.env.DB_NAME || 'test';

/**
 * Update all challenge dates to be currently active
 */
async function updateChallengeDates() {
  try {
    console.log('🔄 Updating challenge dates...');
    console.log('📊 Database:', DB_NAME);

    await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
    console.log('✅ Connected to MongoDB\n');

    const now = new Date();
    const challenges = await Challenge.find({});

    console.log(`📋 Found ${challenges.length} challenges\n`);

    let updated = 0;

    for (const challenge of challenges) {
      let startDate = new Date();
      let endDate = new Date();

      // Set dates based on challenge type
      switch (challenge.type) {
        case 'daily':
          // Start today at midnight, end tomorrow at midnight
          startDate.setHours(0, 0, 0, 0);
          endDate.setDate(startDate.getDate() + 1);
          endDate.setHours(0, 0, 0, 0);
          break;

        case 'weekly':
          // Start this Monday at midnight, end next Monday
          const dayOfWeek = startDate.getDay();
          const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
          startDate.setDate(startDate.getDate() + daysToMonday);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(startDate);
          endDate.setDate(startDate.getDate() + 7);
          break;

        case 'monthly':
          // Start on 1st of this month, end on 1st of next month
          startDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 1);
          endDate.setHours(0, 0, 0, 0);
          break;

        case 'special':
          // Start today, end in 7 days
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(startDate);
          endDate.setDate(startDate.getDate() + 7);
          endDate.setHours(23, 59, 59, 999);
          break;

        default:
          // Default: start today, end in 1 day
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(startDate);
          endDate.setDate(startDate.getDate() + 1);
          endDate.setHours(23, 59, 59, 999);
      }

      // Update the challenge
      challenge.startDate = startDate;
      challenge.endDate = endDate;
      challenge.active = true;

      await challenge.save();

      console.log(`✅ Updated: ${challenge.title}`);
      console.log(`   Type: ${challenge.type}`);
      console.log(`   Start: ${startDate.toLocaleString()}`);
      console.log(`   End: ${endDate.toLocaleString()}`);
      console.log('');

      updated++;
    }

    console.log(`\n✅ Successfully updated ${updated} challenges!`);
    console.log('\n📊 Summary:');

    const daily = challenges.filter(c => c.type === 'daily').length;
    const weekly = challenges.filter(c => c.type === 'weekly').length;
    const monthly = challenges.filter(c => c.type === 'monthly').length;
    const special = challenges.filter(c => c.type === 'special').length;

    console.log(`   • Daily: ${daily}`);
    console.log(`   • Weekly: ${weekly}`);
    console.log(`   • Monthly: ${monthly}`);
    console.log(`   • Special: ${special}`);
    console.log(`   • Total: ${challenges.length}`);

    await mongoose.disconnect();
    console.log('\n✅ Done!');
  } catch (error) {
    console.error('❌ Error:', error);
  }
  process.exit(0);
}

updateChallengeDates();
