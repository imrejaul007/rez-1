/**
 * Fix Referral Tier Script
 * Fixes invalid referralTier values in the database.
 */

import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI || '';

async function fixReferralTier() {
  if (!MONGODB_URI) {
    console.error('MONGODB_URI not set');
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db!;

  // Fix all invalid referralTier values (uppercase → lowercase)
  const result = await db.collection('users').updateMany(
    {
      referralTier: { $in: ['STARTER', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND'] },
    },
    {
      $set: {
        referralTier: 'starter',
      },
    },
  );

  console.log(`Fixed ${result.modifiedCount} user(s) with invalid referralTier`);

  await mongoose.disconnect();
  process.exit(0);
}

fixReferralTier().catch((err) => {
  console.error(err);
  process.exit(1);
});
