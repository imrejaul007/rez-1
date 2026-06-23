/**
 * Migrate Food & Dining Stores Script
 * Updates existing stores with missing required fields for the Food & Dining page
 * Does NOT delete or clear any existing data - only adds missing fields
 *
 * Run: npx ts-node src/scripts/migrateFoodDiningStores.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Import models
import { Category } from '../models/Category';
import { Store } from '../models/Store';

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/rez-app';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
};

const log = {
  info: (msg: string) => console.log(`${colors.cyan}ℹ ${msg}${colors.reset}`),
  success: (msg: string) => console.log(`${colors.green}✓ ${msg}${colors.reset}`),
  warning: (msg: string) => console.log(`${colors.yellow}⚠ ${msg}${colors.reset}`),
  error: (msg: string) => console.log(`${colors.red}✗ ${msg}${colors.reset}`),
  header: (msg: string) => console.log(`\n${colors.bright}${colors.blue}━━━ ${msg} ━━━${colors.reset}\n`),
  section: (msg: string) => console.log(`\n${colors.magenta}▶ ${msg}${colors.reset}`),
};

// Default banner images for food & dining stores
const DEFAULT_FOOD_BANNERS = [
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800',
  'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800',
  'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800',
  'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800',
  'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800',
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800',
  'https://images.unsplash.com/photo-1579584425555-c3b17fa6c098?w=800',
  'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=800',
  'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800',
  'https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=800',
];

// Map cuisine keywords to tags
function inferCuisineTags(store: any): string[] {
  const tags: string[] = ['restaurant', 'food', 'dining'];
  const name = (store.name || '').toLowerCase();
  const description = (store.description || '').toLowerCase();
  const categoryName = ((store.category as any)?.name || '').toLowerCase();
  const text = `${name} ${description} ${categoryName}`;
  
  // Special handling for known store names
  if (name.includes('table')) {
    tags.push('indian', 'continental', 'fine-dining');
  } else if (name.includes('olive')) {
    tags.push('continental', 'mediterranean', 'fine-dining');
  } else if (name.includes('punjab')) {
    tags.push('indian', 'north indian', 'punjabi');
  } else if (name.includes('shanghai')) {
    tags.push('chinese', 'szechuan');
  } else if (name.includes('domino') || name.includes('pizza')) {
    tags.push('italian', 'pizza', 'fast-food');
  } else if (name.includes('sagar') || name.includes('ratna')) {
    tags.push('south indian', 'indian', 'vegetarian');
  } else if (name.includes('thai')) {
    tags.push('thai');
  } else if (name.includes('sushi') || name.includes('zen')) {
    tags.push('japanese', 'sushi');
  } else if (name.includes('taco') || name.includes('bell')) {
    tags.push('mexican', 'tex-mex', 'fast-food');
  } else if (name.includes('kfc')) {
    tags.push('chicken', 'fast-food');
  }
  
  // Indian
  if (text.match(/\b(indian|north indian|south indian|punjabi|mughlai|biryani|curry|dosa|idli|vada|sambar)\b/)) {
    if (text.match(/\b(south indian|dosa|idli|vada|sambar)\b/)) {
      tags.push('south indian', 'indian');
      if (text.match(/\bdosa\b/)) tags.push('dosa');
      if (text.match(/\bidli\b/)) tags.push('idli');
    } else if (text.match(/\b(north indian|punjabi|mughlai)\b/)) {
      tags.push('north indian', 'indian');
      if (text.match(/\bpunjabi\b/)) tags.push('punjabi');
      if (text.match(/\bmughlai\b/)) tags.push('mughlai');
    } else {
      tags.push('indian');
    }
    if (text.match(/\bbiryani\b/)) tags.push('biryani');
    if (text.match(/\bcurry\b/)) tags.push('curry');
  }
  
  // Chinese
  if (text.match(/\b(chinese|szechuan|cantonese|dim sum|noodles)\b/)) {
    tags.push('chinese');
    if (text.match(/\bszechuan\b/)) tags.push('szechuan');
    if (text.match(/\bcantonese\b/)) tags.push('cantonese');
  }
  
  // Italian
  if (text.match(/\b(italian|pizza|pasta|spaghetti|risotto)\b/)) {
    tags.push('italian');
    if (text.match(/\bpizza\b/)) tags.push('pizza');
    if (text.match(/\bpasta\b/)) tags.push('pasta');
  }
  
  // Thai
  if (text.match(/\b(thai|pad thai|green curry|tom yum)\b/)) {
    tags.push('thai');
  }
  
  // Mexican
  if (text.match(/\b(mexican|tex-mex|taco|burrito)\b/)) {
    tags.push('mexican');
    if (text.match(/\btex-mex\b/)) tags.push('tex-mex');
  }
  
  // Japanese
  if (text.match(/\b(japanese|sushi|sashimi|ramen)\b/)) {
    tags.push('japanese');
    if (text.match(/\bsushi\b/)) tags.push('sushi');
  }
  
  // Continental
  if (text.match(/\b(continental|mediterranean|european|french)\b/)) {
    tags.push('continental');
    if (text.match(/\bmediterranean\b/)) tags.push('mediterranean');
  }
  
  // Fast food
  if (text.match(/\b(fast.?food|quick|delivery|takeaway)\b/)) {
    tags.push('fast-food', 'delivery');
  }
  
  // Fine dining
  if (text.match(/\b(fine.?dining|premium|upscale)\b/)) {
    tags.push('fine-dining');
  }
  
  return [...new Set(tags)]; // Remove duplicates
}

// Connect to database
async function connectDB() {
  try {
    log.info('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    log.success('Connected to MongoDB');
  } catch (error: any) {
    log.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
}

// Migrate a single store
async function migrateStore(store: any, categoryId: mongoose.Types.ObjectId): Promise<{ updated: boolean; changes: string[] }> {
  const changes: string[] = [];
  const updates: any = {};
  
  // 1. Fix banner - ensure it's an array with at least one image
  if (!store.banner || !Array.isArray(store.banner) || store.banner.length === 0) {
    // Use a default banner image
    const bannerIndex = Math.floor(Math.random() * DEFAULT_FOOD_BANNERS.length);
    updates.banner = [DEFAULT_FOOD_BANNERS[bannerIndex]];
    changes.push('Added banner image');
  } else if (!Array.isArray(store.banner)) {
    // Convert string to array
    updates.banner = [store.banner];
    changes.push('Converted banner string to array');
  }
  
  // 2. Add tags if missing or empty
  if (!store.tags || !Array.isArray(store.tags) || store.tags.length === 0) {
    const inferredTags = inferCuisineTags(store);
    updates.tags = inferredTags;
    changes.push(`Added ${inferredTags.length} tags: ${inferredTags.slice(0, 5).join(', ')}`);
  } else {
    // Check if cuisine tags exist, if not add them
    const existingTags = store.tags.map((t: string) => t.toLowerCase());
    const cuisineKeywords = ['indian', 'chinese', 'italian', 'thai', 'mexican', 'japanese', 'continental', 'south indian', 'north indian'];
    const hasCuisineTag = cuisineKeywords.some(keyword => 
      existingTags.some((tag: string) => tag.includes(keyword))
    );
    
    if (!hasCuisineTag) {
      const inferredTags = inferCuisineTags(store);
      // Merge with existing tags, avoiding duplicates
      const mergedTags = [...new Set([...store.tags, ...inferredTags])];
      updates.tags = mergedTags;
      changes.push(`Added cuisine tags: ${inferredTags.filter(t => !existingTags.includes(t.toLowerCase())).slice(0, 3).join(', ')}`);
    }
  }
  
  // 3. Add offers.cashback if missing
  if (!store.offers || typeof store.offers.cashback !== 'number') {
    if (!updates.offers) {
      updates.offers = store.offers ? { ...store.offers } : {};
    }
    // Default cashback between 10-20%
    updates.offers.cashback = updates.offers.cashback || Math.floor(Math.random() * 11) + 10;
    updates.offers.minOrderAmount = updates.offers.minOrderAmount || 200;
    changes.push(`Added cashback: ${updates.offers.cashback}%`);
  }
  
  // 4. Add logo if missing (use first banner image)
  if (!store.logo) {
    if (updates.banner && Array.isArray(updates.banner) && updates.banner.length > 0) {
      updates.logo = updates.banner[0].replace('?w=800', '?w=200');
      changes.push('Added logo from banner');
    } else if (store.banner && Array.isArray(store.banner) && store.banner.length > 0) {
      updates.logo = store.banner[0].replace('?w=800', '?w=200');
      changes.push('Added logo from existing banner');
    }
  }
  
  // 5. Add image field if missing (use banner or logo as fallback)
  if (!store.image) {
    if (updates.banner && Array.isArray(updates.banner) && updates.banner.length > 0) {
      updates.image = updates.banner[0];
      changes.push('Added image from banner');
    } else if (store.banner && Array.isArray(store.banner) && store.banner.length > 0) {
      updates.image = store.banner[0];
      changes.push('Added image from existing banner');
    } else if (updates.logo) {
      updates.image = updates.logo;
      changes.push('Added image from logo');
    } else if (store.logo) {
      updates.image = store.logo;
      changes.push('Added image from existing logo');
    }
  }
  
  // 6. Add id field if missing (use _id as string)
  if (!store.id) {
    updates.id = store._id.toString();
    changes.push('Added id field');
  }
  
  // Apply updates if any
  if (Object.keys(updates).length > 0) {
    try {
      // Use direct MongoDB update to bypass strict mode for id field
      await Store.collection.updateOne(
        { _id: store._id },
        { $set: updates }
      );
      return { updated: true, changes };
    } catch (error: any) {
      log.error(`Error updating store ${store.name}: ${error.message}`);
      return { updated: false, changes: [] };
    }
  }
  
  return { updated: false, changes: [] };
}

// Main migration function
async function migrateStores() {
  log.section('Starting Migration');
  
  try {
    // Find category
    const category = await Category.findOne({ slug: 'food-dining' }).lean();
    if (!category) {
      log.error('Food & Dining category not found');
      return { success: false, migrated: 0, skipped: 0 };
    }
    
    log.info(`Found category: ${category.name}`);
    
    // Find all active stores in category
    const stores = await Store.find({
      category: category._id,
      isActive: true
    })
    .populate('category', 'name slug')
    .lean();
    
    log.info(`Found ${stores.length} active stores to migrate`);
    
    if (stores.length === 0) {
      log.warning('No stores found to migrate');
      return { success: true, migrated: 0, skipped: 0 };
    }
    
    // Migrate each store
    let migratedCount = 0;
    let skippedCount = 0;
    
    const categoryObjectId = category._id as mongoose.Types.ObjectId;
    
    for (const store of stores) {
      const result = await migrateStore(store, categoryObjectId);
      
      if (result.updated) {
        migratedCount++;
        log.success(`${store.name}: ${result.changes.join(', ')}`);
      } else {
        skippedCount++;
        log.info(`${store.name}: No changes needed`);
      }
    }
    
    return { success: true, migrated: migratedCount, skipped: skippedCount };
    
  } catch (error: any) {
    log.error(`Migration error: ${error.message}`);
    console.error(error);
    return { success: false, migrated: 0, skipped: 0 };
  }
}

// Main function
async function main() {
  const startTime = Date.now();
  
  try {
    log.header('Food & Dining Stores Migration');
    log.info('Updating existing stores with missing required fields...\n');
    log.warning('NOTE: This script will NOT delete or clear any existing data');
    log.info('It only adds missing fields: banner images, tags, and offers.cashback\n');
    
    // Connect to database
    await connectDB();
    
    // Run migration
    const result = await migrateStores();
    
    // Summary
    log.header('Migration Summary');
    
    console.log('\n┌──────────────────────────────────────┬──────────────┐');
    console.log('│ Metric                               │ Value        │');
    console.log('├──────────────────────────────────────┼──────────────┤');
    console.log(`│ Stores Migrated                      │ ${String(result.migrated).padStart(12)} │`);
    console.log(`│ Stores Skipped (No Changes)          │ ${String(result.skipped).padStart(12)} │`);
    console.log('└──────────────────────────────────────┴──────────────┘');
    
    if (result.success && result.migrated > 0) {
      log.success(`\n✅ Successfully migrated ${result.migrated} store(s)`);
      log.info('All stores now have required fields for the Food & Dining page');
      log.info('\nNext steps:');
      log.info('1. Run the audit script to verify: npx ts-node src/scripts/checkFoodDiningData.ts');
      log.info('2. Test the page at /MainCategory/food-dining');
    } else if (result.success && result.migrated === 0) {
      log.warning('\n⚠ No stores needed migration');
      log.info('All stores already have the required fields, or no stores found');
    } else {
      log.error('\n✗ Migration failed');
    }
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    log.success(`\nMigration completed in ${duration}s`);
    
  } catch (error: any) {
    log.error(`Migration failed: ${error.message}`);
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
