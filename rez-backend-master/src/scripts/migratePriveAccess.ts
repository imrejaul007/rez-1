/**
 * Privé Access Migration Script
 *
 * 1. Whitelist target user (Mukul Raj) as permanent Privé member
 * 2. Seed WalletConfig with priveInviteConfig defaults
 * 3. Optionally grandfather existing eligible users
 *
 * Usage: npx ts-node src/scripts/migratePriveAccess.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const run = async () => {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/rez';

  console.log('Connecting to MongoDB...');
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');

  // Import models after connection
  const { User } = await import('../models/User');
  const { default: PriveAccess } = await import('../models/PriveAccess');
  const { WalletConfig } = await import('../models/WalletConfig');
  const { UserReputation } = await import('../models/UserReputation');

  // ─── Step 1: Whitelist Mukul Raj ────────────────────────────────────────────

  console.log('\n--- Step 1: Whitelist target user ---');

  const targetUser = await User.findOne({
    $or: [
      { phoneNumber: '+918210224305' },
      { email: 'mukulraj756@gmail.com' },
    ],
  }).lean();

  if (targetUser) {
    console.log(`Found user: ${(targetUser as any).profile?.firstName || 'Unknown'} ${(targetUser as any).profile?.lastName || ''} (${targetUser._id})`);

    // Check if already has access
    const existing = await PriveAccess.findOne({ userId: targetUser._id });

    if (existing) {
      console.log(`User already has PriveAccess record (status: ${existing.status}, whitelisted: ${existing.isWhitelisted})`);
      if (!existing.isWhitelisted || existing.status !== 'active') {
        existing.status = 'active';
        existing.isWhitelisted = true;
        existing.whitelistedBy = targetUser._id as mongoose.Types.ObjectId;
        existing.whitelistReason = 'Development/testing whitelist - Mukul Raj';
        existing.tierOverride = 'elite';
        existing.auditLog.push({
          action: 'whitelisted',
          by: targetUser._id as mongoose.Types.ObjectId,
          reason: 'Migration script whitelist',
          timestamp: new Date(),
        });
        await existing.save();
        console.log('Updated to active + whitelisted + elite tier override');
      } else {
        console.log('Already active and whitelisted, no changes needed');
      }
    } else {
      const access = new PriveAccess({
        userId: targetUser._id,
        status: 'active',
        grantMethod: 'admin_whitelist',
        isWhitelisted: true,
        whitelistedBy: targetUser._id,
        whitelistReason: 'Development/testing whitelist - Mukul Raj',
        tierOverride: 'elite',
        activatedAt: new Date(),
        auditLog: [
          {
            action: 'whitelisted',
            by: targetUser._id as mongoose.Types.ObjectId,
            reason: 'Migration script - initial whitelist for development',
            timestamp: new Date(),
          },
        ],
      });
      await access.save();
      console.log('Created PriveAccess record with whitelist + elite tier override');
    }
  } else {
    console.log('WARNING: Target user not found (phone: +918210224305, email: mukulraj756@gmail.com)');
    console.log('The user will be whitelisted automatically via the admin panel once they register.');
  }

  // ─── Step 2: Seed WalletConfig ──────────────────────────────────────────────

  console.log('\n--- Step 2: Seed WalletConfig priveInviteConfig ---');

  const walletConfig = await WalletConfig.getOrCreate();

  if (!walletConfig.priveInviteConfig || !(walletConfig.priveInviteConfig as any).enabled === undefined) {
    walletConfig.priveInviteConfig = {
      enabled: true,
      inviterRewardCoins: 100,
      inviteeRewardCoins: 50,
      maxCodesPerUser: 5,
      codeExpiryDays: 30,
      maxUsesPerCode: 5,
      minTierToInvite: 'entry',
      cooldownHours: 24,
      fraudBlockThreshold: 80,
    };
    walletConfig.markModified('priveInviteConfig');
    await walletConfig.save();
    console.log('Seeded priveInviteConfig with defaults');
  } else {
    console.log('priveInviteConfig already exists, skipping');
  }

  // ─── Step 3: Grandfather existing eligible users (optional) ─────────────────

  console.log('\n--- Step 3: Grandfather existing eligible users ---');

  const eligibleUsers = await UserReputation.find({
    isEligible: true,
    tier: { $in: ['entry', 'signature', 'elite'] },
  }).select('userId tier').lean();

  console.log(`Found ${eligibleUsers.length} eligible users`);

  let grandfathered = 0;
  for (const rep of eligibleUsers) {
    const existing = await PriveAccess.findOne({ userId: rep.userId });
    if (!existing) {
      await PriveAccess.create({
        userId: rep.userId,
        status: 'active',
        grantMethod: 'auto_qualify',
        activatedAt: new Date(),
        auditLog: [
          {
            action: 'granted',
            by: rep.userId,
            reason: `Auto-qualified from existing reputation (tier: ${rep.tier})`,
            timestamp: new Date(),
          },
        ],
      });
      grandfathered++;
    }
  }

  console.log(`Grandfathered ${grandfathered} users (${eligibleUsers.length - grandfathered} already had access)`);

  // ─── Done ───────────────────────────────────────────────────────────────────

  console.log('\n✅ Migration complete!');
  await mongoose.disconnect();
  process.exit(0);
};

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
