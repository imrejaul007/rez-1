/**
 * One-time admin user creation script.
 *
 * Usage (local, against production MONGODB_URI):
 *   MONGODB_URI="mongodb+srv://..." ADMIN_EMAIL="admin@rez.money" ADMIN_PASSWORD="YourSecurePass123!" npx ts-node scripts/createAdminUser.ts
 *
 * Or with .env already containing MONGODB_URI:
 *   ADMIN_EMAIL="admin@rez.money" ADMIN_PASSWORD="YourSecurePass123!" npx ts-node scripts/createAdminUser.ts
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
import { User } from '../src/models/User';

dotenv.config({ path: path.join(__dirname, '../.env') });

const EMAIL = process.env.ADMIN_EMAIL || 'admin@rez.money';
const PASSWORD = process.env.ADMIN_PASSWORD as string;
const ROLE = (process.env.ADMIN_ROLE as any) || 'super_admin';
const FIRST_NAME = process.env.ADMIN_FIRST_NAME || 'REZ';
const LAST_NAME = process.env.ADMIN_LAST_NAME || 'Admin';

if (!PASSWORD) {
  console.error('ERROR: ADMIN_PASSWORD env var is required.');
  console.error('  ADMIN_PASSWORD="YourSecurePass123!" npx ts-node scripts/createAdminUser.ts');
  process.exit(1);
}

if (PASSWORD.length < 8) {
  console.error('ERROR: ADMIN_PASSWORD must be at least 8 characters.');
  process.exit(1);
}

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI env var is required.');
  process.exit(1);
}

async function main() {
  await mongoose.connect(MONGODB_URI!);
  console.log('Connected to MongoDB.');

  const existing = await User.findOne({ email: EMAIL.toLowerCase().trim() }).select('+password');

  if (existing) {
    console.log(`User found: ${existing.email} (role: ${existing.role})`);
    const adminRoles = ['admin', 'support', 'operator', 'super_admin'];
    if (adminRoles.includes(existing.role)) {
      // Promote or reset password
      existing.password = await bcrypt.hash(PASSWORD, 12);
      existing.role = ROLE;
      existing.isActive = true;
      // FIX: Set refresh token so token refresh works
      existing.auth = existing.auth || {};
      existing.auth.refreshToken = crypto.createHash('sha256').update(`${existing._id}-${Date.now()}-${crypto.randomBytes(16).toString('hex')}`).digest('hex');
      await existing.save();
      console.log(`✓ Updated existing admin — role: ${ROLE}, password reset, isActive: true, refresh token set`);
    } else {
      // Regular user — promote to admin
      existing.role = ROLE;
      existing.isActive = true;
      existing.password = await bcrypt.hash(PASSWORD, 12);
      await existing.save();
      console.log(`✓ Promoted ${EMAIL} to ${ROLE} and reset password`);
    }
  } else {
    // Create new admin user
    const hashed = await bcrypt.hash(PASSWORD, 12);
    const user = new User({
      email: EMAIL.toLowerCase().trim(),
      password: hashed,
      role: ROLE,
      isActive: true,
      phoneNumber: process.env.ADMIN_PHONE || '+910000000000',
      profile: {
        firstName: FIRST_NAME,
        lastName: LAST_NAME,
      },
      auth: {
        isVerified: true,
        lastLogin: new Date(),
      },
    });
    await user.save();
    console.log(`✓ Created new ${ROLE}: ${EMAIL}`);
  }

  console.log('\nAdmin login ready. Env vars to set in Render:');
  console.log('  REQUIRE_ADMIN_TOTP=false   (disable TOTP until you enroll via the admin app)');
  console.log('  JWT_ADMIN_SECRET=<random>  (required for token signing)');
  console.log('  TOTP_ENCRYPTION_KEY=<32-byte hex>  (required when TOTP is enabled)');
  console.log('\nGenerate secrets:');
  console.log("  node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"");

  await mongoose.disconnect();
  console.log('\nDone.');
}

main().catch((err) => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
