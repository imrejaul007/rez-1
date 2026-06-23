import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Partner from '../models/Partner';
import { User } from '../models/User';
import { connectDatabase } from '../config/database';

// Load environment variables
dotenv.config();

const seedPartners = async () => {
  try {
    console.log('🌱 [PARTNER SEEDING] Starting partner seeding...');
    
    // Connect to database
    await connectDatabase();
    console.log('✅ [PARTNER SEEDING] Connected to database');
    
    // Get all users
    const users = await User.find({ email: { $exists: true } }).limit(10);
    console.log(`📊 [PARTNER SEEDING] Found ${users.length} users`);
    
    if (users.length === 0) {
      console.log('⚠️ [PARTNER SEEDING] No users found. Please seed users first.');
      return;
    }
    
    // Clear existing partners (optional - comment out to keep existing data)
    await Partner.deleteMany({});
    console.log('🗑️ [PARTNER SEEDING] Cleared existing partners');
    
    // Create partner profiles for each user
    const partnerPromises = users.map(async (user) => {
      try {
        // Check if partner already exists
        const existingPartner = await Partner.findOne({ userId: user._id });
        if (existingPartner) {
          console.log(`⏭️ [PARTNER SEEDING] Partner already exists for user: ${user.email}`);
          return existingPartner;
        }
        
        const name = user.profile?.firstName 
          ? `${user.profile.firstName} ${user.profile.lastName || ''}`.trim()
          : user.email?.split('@')[0] || 'Partner';
        
        const userId = user._id as any;
        const partner = await (Partner as any).createDefaultPartner(
          userId.toString(),
          name,
          user.email || '',
          user.profile?.avatar
        );
        
        console.log(`✅ [PARTNER SEEDING] Created partner for: ${name}`);
        return partner;
      } catch (error) {
        console.error(`❌ [PARTNER SEEDING] Error creating partner for user ${user.email}:`, error);
        return null;
      }
    });
    
    const createdPartners = await Promise.all(partnerPromises);
    const successCount = createdPartners.filter((p: any) => p !== null).length;
    
    console.log('\n🎉 [PARTNER SEEDING] Partner seeding completed!');
    console.log(`✅ Created ${successCount} partner profiles`);
    console.log('\n📊 Summary:');
    console.log(`   Total Users: ${users.length}`);
    console.log(`   Partners Created: ${successCount}`);
    console.log(`   Failed: ${users.length - successCount}`);
    
    // Display sample partner data
    const samplePartner = await Partner.findOne().populate('userId', 'email');
    if (samplePartner) {
      console.log('\n📝 Sample Partner Data:');
      console.log(`   Name: ${samplePartner.name}`);
      console.log(`   Email: ${samplePartner.email}`);
      console.log(`   Level: ${samplePartner.currentLevel.name} (${samplePartner.currentLevel.level})`);
      console.log(`   Total Orders: ${samplePartner.totalOrders}`);
      console.log(`   Milestones: ${samplePartner.milestones.length}`);
      console.log(`   Tasks: ${samplePartner.tasks.length}`);
      console.log(`   Jackpot Milestones: ${samplePartner.jackpotProgress.length}`);
      console.log(`   Offers: ${samplePartner.claimableOffers.length}`);
    }
    
  } catch (error) {
    console.error('❌ [PARTNER SEEDING] Error:', error);
    throw error;
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('\n👋 [PARTNER SEEDING] Database connection closed');
  }
};

// Run the seeding if this file is executed directly
if (require.main === module) {
  seedPartners()
    .then(() => {
      console.log('✅ [PARTNER SEEDING] Seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ [PARTNER SEEDING] Seeding failed:', error);
      process.exit(1);
    });
}

export default seedPartners;

