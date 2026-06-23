/**
 * Fix Admin User Refresh Token
 * Run this script to ensure the admin user has a valid refresh token hash.
 * This fixes the auto-logout issue.
 */

import mongoose from 'mongoose';
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const EMAIL = process.env.ADMIN_EMAIL || 'superadmin@rez.money';

if (!process.env.MONGODB_URI) {
  console.error('ERROR: MONGODB_URI env var is required.');
  process.exit(1);
}

if (!process.env.JWT_REFRESH_SECRET) {
  console.error('ERROR: JWT_REFRESH_SECRET env var is required.');
  process.exit(1);
}

// Hash refresh token for storage (matches backend logic)
const hashRefreshToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

// Generate a new refresh token and hash it
const generateAndHashRefreshToken = (userId: string): string => {
  const token = `${userId}-${Date.now()}-${crypto.randomBytes(16).toString('hex')}`;
  return hashRefreshToken(token);
};

async function main() {
  await mongoose.connect(process.env.MONGODB_URI!);
  console.log('Connected to MongoDB.');

  // Import User model dynamically to avoid import issues
  const { User } = await import('../src/models/User');

  const user = await User.findOne({ email: EMAIL.toLowerCase().trim() });

  if (!user) {
    console.error(`ERROR: User ${EMAIL} not found. Run createAdminUser.ts first.`);
    process.exit(1);
  }

  console.log(`Found user: ${user.email} (role: ${user.role})`);

  // Generate a new refresh token hash
  const refreshTokenHash = generateAndHashRefreshToken(user._id.toString());

  // Update the user's refresh token
  user.auth.refreshToken = refreshTokenHash;
  await user.save();

  console.log('✓ Refresh token hash updated successfully!');
  console.log('The admin user can now refresh their access token.');
  console.log('Auto-logout issue should be resolved.');

  await mongoose.disconnect();
  console.log('Done.');
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
