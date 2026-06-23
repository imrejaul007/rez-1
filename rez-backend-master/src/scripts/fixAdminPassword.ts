/**
 * Fix Admin Password Script
 * Run with: npx ts-node src/scripts/fixAdminPassword.ts
 * Only updates password, role, and isActive — does NOT overwrite the full user document.
 */

import dotenv from 'dotenv';
import path from 'path';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI || '';
const PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD || 'ChangeMe123!';
const BCRYPT_ROUNDS = 12;

async function fixAdminPassword() {
  if (!MONGODB_URI) {
    console.error('MONGODB_URI not set');
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db!;

  const adminEmail = 'admin@rez.money';
  const superAdminEmail = 'superadmin@rez.money';
  const password = await bcrypt.hash(PASSWORD, BCRYPT_ROUNDS);
  console.log(`Hashing password with ${BCRYPT_ROUNDS} rounds...`);

  // Fix existing users by email
  for (const email of [adminEmail, superAdminEmail]) {
    const result = await db.collection('users').updateOne(
      { email },
      {
        $set: {
          password,
          role: email === superAdminEmail ? 'super_admin' : 'admin',
          isActive: true,
          'auth.isVerified': true,
        },
      },
    );
    console.log(`${email}: matched=${result.matchedCount}, modified=${result.modifiedCount}`);
  }

  // Also create if not exists
  for (const email of [adminEmail, superAdminEmail]) {
    const existing = await db.collection('users').findOne({ email });
    if (!existing) {
      await db.collection('users').insertOne({
        email,
        phoneNumber: email === superAdminEmail ? '+919999999900' : '+919999999901',
        password,
        role: email === superAdminEmail ? 'super_admin' : 'admin',
        profile: email === superAdminEmail
          ? { firstName: 'Super', lastName: 'Admin' }
          : { firstName: 'Admin', lastName: 'REZ' },
        auth: { isVerified: true, isOnboarded: true },
        isActive: true,
      });
      console.log(`${email}: created new user`);
    }
  }

  console.log('Done!');
  await mongoose.disconnect();
  process.exit(0);
}

fixAdminPassword().catch((err) => {
  console.error(err);
  process.exit(1);
});
