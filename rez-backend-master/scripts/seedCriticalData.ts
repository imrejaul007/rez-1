import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

/**
 * Master seed script for all critical missing data
 *
 * This script seeds data for newly implemented features:
 * 1. Subscriptions (Just implemented subscription system)
 * 2. Referrals (Just implemented referral system)
 * 3. Gamification (Just implemented gamification system)
 *
 * Run with: npm run seed:critical
 */

async function seedCriticalData() {
  console.log('\n' + '='.repeat(70));
  console.log('🚀 SEEDING CRITICAL MISSING DATA');
  console.log('='.repeat(70) + '\n');

  console.log('📊 This will seed:');
  console.log('   1. Subscriptions (0 → 10)');
  console.log('   2. Referrals (0 → 15)');
  console.log('   3. Gamification (Challenges, Progress, ScratchCards, etc.)');
  console.log('\n' + '='.repeat(70) + '\n');

  try {
    // Phase 1: Subscriptions
    console.log('📋 PHASE 1: SUBSCRIPTIONS');
    console.log('-'.repeat(70));
    console.log('⏳ Seeding subscription data...\n');

    const { stdout: subOut, stderr: subErr } = await execPromise('npx ts-node scripts/seedSubscriptions.ts');
    console.log(subOut);
    if (subErr) console.error('Warnings:', subErr);

    console.log('✅ Subscriptions seeded successfully!\n');
    console.log('='.repeat(70) + '\n');

    // Wait between phases
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Phase 2: Referrals
    console.log('📋 PHASE 2: REFERRALS');
    console.log('-'.repeat(70));
    console.log('⏳ Seeding referral data...\n');

    const { stdout: refOut, stderr: refErr } = await execPromise('npx ts-node scripts/seedReferrals.ts');
    console.log(refOut);
    if (refErr) console.error('Warnings:', refErr);

    console.log('✅ Referrals seeded successfully!\n');
    console.log('='.repeat(70) + '\n');

    // Wait between phases
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Phase 3: Gamification
    console.log('📋 PHASE 3: GAMIFICATION');
    console.log('-'.repeat(70));
    console.log('⏳ Seeding gamification data...\n');

    const { stdout: gamOut, stderr: gamErr } = await execPromise('npx ts-node scripts/seedGamification.ts');
    console.log(gamOut);
    if (gamErr) console.error('Warnings:', gamErr);

    console.log('✅ Gamification seeded successfully!\n');
    console.log('='.repeat(70) + '\n');

    // Final Summary
    console.log('\n' + '='.repeat(70));
    console.log('🎉 ALL CRITICAL DATA SEEDED SUCCESSFULLY!');
    console.log('='.repeat(70));

    console.log('\n📊 SEEDING SUMMARY:\n');
    console.log('✅ Subscriptions System');
    console.log('   • 10 subscription records created');
    console.log('   • 5 FREE tier (active)');
    console.log('   • 3 PREMIUM tier (mixed statuses)');
    console.log('   • 2 VIP tier (active)');
    console.log('   • Mock Razorpay integration added\n');

    console.log('✅ Referrals System');
    console.log('   • 15 referral relationships created');
    console.log('   • 10 completed (rewards paid)');
    console.log('   • 3 pending (awaiting qualification)');
    console.log('   • 2 qualified (processing rewards)');
    console.log('   • User stats updated');
    console.log('   • Wallet balances credited\n');

    console.log('✅ Gamification System');
    console.log('   • 15 challenges (5 daily, 5 weekly, 5 monthly)');
    console.log('   • 30 user challenge progress records');
    console.log('   • 20 scratch cards');
    console.log('   • 50 coin transactions');
    console.log('   • 15 mini-game instances');
    console.log('   • User wallets updated with coin balances\n');

    console.log('='.repeat(70));
    console.log('\n🚀 NEXT STEPS:\n');
    console.log('1. Verify data in MongoDB:');
    console.log('   mongosh rez-app');
    console.log('   db.subscriptions.countDocuments()');
    console.log('   db.referrals.countDocuments()');
    console.log('   db.challenges.countDocuments()\n');

    console.log('2. Test the APIs:');
    console.log('   GET /api/subscriptions/tiers');
    console.log('   GET /api/referral/data');
    console.log('   GET /api/gamification/challenges\n');

    console.log('3. Run comprehensive tests:');
    console.log('   npm run test:product-integration\n');

    console.log('='.repeat(70) + '\n');

    console.log('✨ Database is now ready for testing all features!');
    console.log('📱 Frontend can now fetch and display all seeded data.\n');

  } catch (error: any) {
    console.error('\n❌ ERROR DURING SEEDING:');
    console.error('='.repeat(70));
    console.error(error.message);
    if (error.stdout) {
      console.error('\nStdout:', error.stdout);
    }
    if (error.stderr) {
      console.error('\nStderr:', error.stderr);
    }
    console.error('\n' + '='.repeat(70));
    console.error('\n⚠️  Some data may have been seeded before the error occurred.');
    console.error('Check the logs above to see which phase failed.\n');
    process.exit(1);
  }
}

// Run the seeding
seedCriticalData();
