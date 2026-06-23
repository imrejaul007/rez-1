/**
 * Check Homepage Data Script
 * Verifies that all homepage sections have proper data seeded
 * 
 * Run: npx ts-node src/scripts/checkHomepageData.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Import models
import Campaign from '../models/Campaign';
import StoreExperience from '../models/StoreExperience';
import { ServiceCategory } from '../models/ServiceCategory';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
};

const log = {
  info: (msg: string) => console.log(colors.cyan + 'ℹ ' + msg + colors.reset),
  success: (msg: string) => console.log(colors.green + '✓ ' + msg + colors.reset),
  warning: (msg: string) => console.log(colors.yellow + '⚠ ' + msg + colors.reset),
  error: (msg: string) => console.log(colors.red + '✗ ' + msg + colors.reset),
  header: (msg: string) => console.log('\n' + colors.bright + colors.blue + '━━━ ' + msg + ' ━━━' + colors.reset + '\n'),
};

// Connect to database
async function connectDB() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/rez';
    await mongoose.connect(mongoUri);
    log.success('Connected to MongoDB');
  } catch (error) {
    log.error(`MongoDB connection error: ${error}`);
    process.exit(1);
  }
}

// Check Campaigns
async function checkCampaigns() {
  log.header('Checking Campaigns (ExcitingDealsSection)');

  try {
    const now = new Date();
    const totalCampaigns = await Campaign.countDocuments({});
    const activeCampaigns = await Campaign.countDocuments({
      isActive: true,
      startTime: { $lte: now },
      endTime: { $gte: now },
    });

    const campaigns = await Campaign.find({})
      .sort({ priority: -1 })
      .lean();

    console.log(`\n📊 Campaign Statistics:`);
    console.log(`   Total Campaigns: ${totalCampaigns}`);
    console.log(`   Active Campaigns: ${activeCampaigns}`);

    if (campaigns.length === 0) {
      log.warning('No campaigns found in database');
      return false;
    }

    console.log(`\n📋 Campaign List:`);
    campaigns.forEach((campaign, index) => {
      const isActive = campaign.isActive && 
                      campaign.startTime <= now && 
                      campaign.endTime >= now;
      const status = isActive ? '✅ Active' : '❌ Inactive';
      const dealsCount = campaign.deals?.length || 0;
      
      console.log(`   ${index + 1}. ${campaign.title}`);
      console.log(`      ID: ${campaign.campaignId}`);
      console.log(`      Type: ${campaign.type}`);
      console.log(`      Status: ${status}`);
      console.log(`      Deals: ${dealsCount}`);
      console.log(`      Priority: ${campaign.priority}`);
      console.log('');
    });

    // Expected campaigns
    const expectedCampaigns = [
      'super-cashback-weekend',
      'triple-coin-day',
      'mega-bank-offers',
      'upload-bill-bonanza',
      'flash-coin-drops',
      'new-user-bonanza',
    ];

    const foundCampaigns = campaigns.map(c => c.campaignId);
    const missingCampaigns = expectedCampaigns.filter(id => !foundCampaigns.includes(id));

    if (missingCampaigns.length > 0) {
      log.warning(`Missing campaigns: ${missingCampaigns.join(', ')}`);
      return false;
    }

    log.success('All expected campaigns are present');
    return true;

  } catch (error: any) {
    log.error(`Error checking campaigns: ${error.message}`);
    return false;
  }
}

// Check Store Experiences
async function checkStoreExperiences() {
  log.header('Checking Store Experiences (ShopByExperienceSection)');

  try {
    const totalExperiences = await StoreExperience.countDocuments({});
    const activeExperiences = await StoreExperience.countDocuments({ isActive: true });
    const featuredExperiences = await StoreExperience.countDocuments({ 
      isActive: true, 
      isFeatured: true 
    });

    const experiences = await StoreExperience.find({})
      .sort({ sortOrder: 1 })
      .lean();

    console.log(`\n📊 Experience Statistics:`);
    console.log(`   Total Experiences: ${totalExperiences}`);
    console.log(`   Active Experiences: ${activeExperiences}`);
    console.log(`   Featured Experiences: ${featuredExperiences}`);

    if (experiences.length === 0) {
      log.warning('No store experiences found in database');
      return false;
    }

    console.log(`\n📋 Experience List:`);
    experiences.forEach((exp, index) => {
      const status = exp.isActive ? '✅ Active' : '❌ Inactive';
      const featured = exp.isFeatured ? '⭐ Featured' : '';
      
      console.log(`   ${index + 1}. ${exp.title}`);
      console.log(`      Slug: ${exp.slug}`);
      console.log(`      Type: ${exp.type}`);
      console.log(`      Status: ${status} ${featured}`);
      console.log(`      Icon: ${exp.icon}`);
      console.log(`      Sort Order: ${exp.sortOrder}`);
      console.log('');
    });

    // Expected experiences
    const expectedExperiences = [
      'sample-trial',
      '60-min-delivery',
      'luxury',
      'organic',
      'men',
      'women',
      'children',
      'rental',
      'gifting',
    ];

    const foundExperiences = experiences.map(e => e.slug);
    const missingExperiences = expectedExperiences.filter(slug => !foundExperiences.includes(slug));

    if (missingExperiences.length > 0) {
      log.warning(`Missing experiences: ${missingExperiences.join(', ')}`);
      return false;
    }

    log.success('All expected experiences are present');
    return true;

  } catch (error: any) {
    log.error(`Error checking store experiences: ${error.message}`);
    return false;
  }
}

// Check Home Services
async function checkHomeServices() {
  log.header('Checking Home Services (HomeServicesSection)');

  try {
    // Check for parent "Home Services" category
    const homeServicesCategory = await ServiceCategory.findOne({ slug: 'home-services' });
    
    if (!homeServicesCategory) {
      log.warning('Home Services parent category not found');
      return false;
    }

    // Get child categories
    const childCategories = await ServiceCategory.find({
      parentCategory: homeServicesCategory._id
    }).lean();

    const totalCategories = childCategories.length;

    console.log(`\n📊 Home Services Statistics:`);
    console.log(`   Parent Category: ${homeServicesCategory.name}`);
    console.log(`   Child Categories: ${totalCategories}`);

    if (childCategories.length === 0) {
      log.warning('No home service categories found');
      return false;
    }

    console.log(`\n📋 Service Categories List:`);
    childCategories.forEach((cat, index) => {
      const status = cat.isActive ? '✅ Active' : '❌ Inactive';
      const serviceCount = cat.serviceCount || 0;
      
      console.log(`   ${index + 1}. ${cat.name}`);
      console.log(`      Slug: ${cat.slug}`);
      console.log(`      Icon: ${cat.icon}`);
      console.log(`      Status: ${status}`);
      console.log(`      Services: ${serviceCount}`);
      console.log(`      Cashback: ${cat.cashbackPercentage}%`);
      console.log('');
    });

    // Expected categories
    const expectedCategories = [
      'repair',
      'cleaning',
      'painting',
      'carpentry',
      'plumbing',
      'electrical',
    ];

    const foundCategories = childCategories.map(c => c.slug);
    const missingCategories = expectedCategories.filter(slug => !foundCategories.includes(slug));

    if (missingCategories.length > 0) {
      log.warning(`Missing categories: ${missingCategories.join(', ')}`);
      return false;
    }

    log.success('All expected home service categories are present');
    return true;

  } catch (error: any) {
    log.error(`Error checking home services: ${error.message}`);
    return false;
  }
}

// Main function
async function main(): Promise<void> {
  try {
    log.header('Homepage Data Checker');
    log.info('Verifying all homepage sections have proper data...\n');

    // Connect to database
    await connectDB();

    // Check each section
    const campaignsOk = await checkCampaigns();
    const experiencesOk = await checkStoreExperiences();
    const homeServicesOk = await checkHomeServices();

    // Summary
    log.header('Summary');
    console.log('\nResults:');
    console.log('┌─────────────────────────────┬──────────┐');
    console.log('│ Section                     │ Status   │');
    console.log('├─────────────────────────────┼──────────┤');
    console.log(`│ Campaigns                   │ ${campaignsOk ? '✅ OK' : '❌ FAIL'}     │`);
    console.log(`│ Store Experiences           │ ${experiencesOk ? '✅ OK' : '❌ FAIL'}     │`);
    console.log(`│ Home Services               │ ${homeServicesOk ? '✅ OK' : '❌ FAIL'}     │`);
    console.log('└─────────────────────────────┴──────────┘');

    const allOk = campaignsOk && experiencesOk && homeServicesOk;

    if (allOk) {
      log.success('\n✅ All homepage sections have proper data!');
      log.success('🎉 Homepage is production ready!');
    } else {
      log.warning('\n⚠️  Some sections are missing data.');
      log.info('💡 Run the seed scripts to populate missing data:');
      log.info('   - npx ts-node src/scripts/seedCampaigns.ts');
      log.info('   - npx ts-node src/seeds/homepageSeeds.ts');
      log.info('   - npx ts-node src/scripts/seedHomeServices.ts');
    }

  } catch (error: any) {
    const errorMessage = error?.message || 'Unknown error';
    log.error('Check failed: ' + errorMessage);
    console.error(error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    log.success('Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export default main;
