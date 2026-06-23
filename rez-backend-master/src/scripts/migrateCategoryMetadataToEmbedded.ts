/**
 * Migration Script: Move Category Metadata from Separate Collections to Embedded
 * 
 * This script migrates data from CategoryVibe, CategoryOccasion, CategoryHashtag
 * collections to embedded arrays in the Category model.
 * 
 * Run: npx ts-node src/scripts/migrateCategoryMetadataToEmbedded.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Import models
import { Category } from '../models/Category';
import CategoryVibe from '../models/CategoryVibe';
import CategoryOccasion from '../models/CategoryOccasion';
import CategoryHashtag from '../models/CategoryHashtag';

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
  info: (msg: string) => console.log(`${colors.cyan}ℹ ${msg}${colors.reset}`),
  success: (msg: string) => console.log(`${colors.green}✓ ${msg}${colors.reset}`),
  warning: (msg: string) => console.log(`${colors.yellow}⚠ ${msg}${colors.reset}`),
  error: (msg: string) => console.log(`${colors.red}✗ ${msg}${colors.reset}`),
  header: (msg: string) => console.log(`\n${colors.bright}${colors.blue}━━━ ${msg} ━━━${colors.reset}\n`),
};

async function connectDB(): Promise<void> {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/rez';
  log.info(`Connecting to MongoDB: ${mongoUri.replace(/\/\/.*@/, '//***@')}`);
  await mongoose.connect(mongoUri);
  log.success('Connected to MongoDB');
}

async function migrateCategoryMetadata(): Promise<void> {
  log.header('Migrating Category Metadata to Embedded');

  const categories = await Category.find({}).lean();
  log.info(`Found ${categories.length} categories to migrate`);

  let migrated = 0;
  let skipped = 0;

  for (const category of categories) {
    const categorySlug = category.slug;

    // Get vibes, occasions, hashtags from separate collections
    const [vibes, occasions, hashtags] = await Promise.all([
      CategoryVibe.find({ categorySlug, isActive: true }).sort({ sortOrder: 1 }).lean(),
      CategoryOccasion.find({ categorySlug, isActive: true }).sort({ sortOrder: 1 }).lean(),
      CategoryHashtag.find({ categorySlug, isActive: true }).sort({ sortOrder: 1 }).lean()
    ]);

    // Transform data to embedded format
    const vibesEmbedded = vibes.map(v => ({
      id: v.id,
      name: v.name,
      icon: v.icon,
      color: v.color,
      description: v.description
    }));

    const occasionsEmbedded = occasions.map(o => ({
      id: o.id,
      name: o.name,
      icon: o.icon,
      color: o.color,
      tag: o.tag,
      discount: o.discount
    }));

    const hashtagsEmbedded = hashtags.map(h => ({
      id: h.id,
      tag: h.tag,
      count: h.count,
      color: h.color,
      trending: h.trending
    }));

    // Update category with embedded data
    if (vibesEmbedded.length > 0 || occasionsEmbedded.length > 0 || hashtagsEmbedded.length > 0) {
      await Category.findByIdAndUpdate(category._id, {
        $set: {
          vibes: vibesEmbedded,
          occasions: occasionsEmbedded,
          trendingHashtags: hashtagsEmbedded
        }
      });

      migrated++;
      log.info(`Migrated ${categorySlug}: ${vibesEmbedded.length} vibes, ${occasionsEmbedded.length} occasions, ${hashtagsEmbedded.length} hashtags`);
    } else {
      skipped++;
      log.warning(`Skipped ${categorySlug}: No metadata found`);
    }
  }

  log.success(`Migration complete: ${migrated} migrated, ${skipped} skipped`);
}

async function main(): Promise<void> {
  try {
    log.header('Category Metadata Migration');
    await connectDB();
    await migrateCategoryMetadata();
  } catch (error) {
    log.error(`Migration failed: ${error instanceof Error ? error.message : String(error)}`);
    console.error(error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    log.info('Disconnected from MongoDB');
  }
}

main().catch(console.error);





