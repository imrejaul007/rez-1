/**
 * Seed Admin User Script
 * Run with: npx ts-node src/scripts/seedAdminUser.ts
 *
 * Creates a super admin user for the rez-admin portal
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Import User model after dotenv config
import { User } from '../models/User';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rez';

// Admin user details - CHANGE THESE FOR PRODUCTION
const ADMIN_USER = {
  phoneNumber: '+919999999999',
  email: 'admin@rez.app',
  password: 'Admin@123', // Will be hashed automatically
  role: 'admin' as const,
  profile: {
    firstName: 'Super',
    lastName: 'Admin',
  },
  auth: {
    isVerified: true,
    isOnboarded: true,
  },
  isActive: true,
};

async function seedAdminUser() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check if admin user already exists
    const existingAdmin = await User.findOne({
      $or: [
        { email: ADMIN_USER.email },
        { phoneNumber: ADMIN_USER.phoneNumber }
      ]
    });

    if (existingAdmin) {
      console.log('⚠️  Admin user already exists:');
      console.log(`   Email: ${existingAdmin.email}`);
      console.log(`   Phone: ${existingAdmin.phoneNumber}`);
      console.log(`   Role: ${existingAdmin.role}`);

      // Update role to admin if not already
      if (existingAdmin.role !== 'admin') {
        existingAdmin.role = 'admin';
        existingAdmin.auth.isVerified = true;
        await existingAdmin.save();
        console.log('✅ Updated user role to admin');
      }
    } else {
      // Create new admin user
      const adminUser = new User(ADMIN_USER);
      await adminUser.save();

      console.log('✅ Admin user created successfully!');
      console.log('');
      console.log('📋 Admin Login Credentials:');
      console.log('─────────────────────────────');
      console.log(`   Email:    ${ADMIN_USER.email}`);
      console.log(`   Password: ${ADMIN_USER.password}`);
      console.log('─────────────────────────────');
      console.log('');
      console.log('🔐 Use these credentials to login at the admin portal');
    }

  } catch (error) {
    console.error('❌ Error seeding admin user:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run the seed
seedAdminUser();
