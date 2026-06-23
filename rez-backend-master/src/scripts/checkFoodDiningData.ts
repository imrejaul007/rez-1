/**
 * Check Food & Dining Data Script
 * Audits the database for Food & Dining category page requirements
 * Verifies all fields used in the frontend exist and are populated correctly
 * 
 * Run: npx ts-node src/scripts/checkFoodDiningData.ts
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

// Fields used in FoodDiningCategoryPage.tsx
const REQUIRED_FIELDS = {
  // Image fields
  banner: { type: 'array|string', required: true, description: 'Store banner images (array or string)' },
  logo: { type: 'string', required: true, description: 'Store logo URL' },
  image: { type: 'string', required: true, description: 'Store image URL (fallback)' },
  
  // Identity fields
  _id: { type: 'ObjectId', required: true, description: 'Store ID' },
  id: { type: 'string', required: true, description: 'Store ID as string' },
  name: { type: 'string', required: true, description: 'Store name' },
  slug: { type: 'string', required: true, description: 'Store slug' },
  
  // Category
  category: { type: 'ObjectId', required: true, description: 'Category reference' },
  'category.name': { type: 'string', required: true, description: 'Category name' },
  
  // Tags (for filtering)
  tags: { type: 'array', required: true, description: 'Store tags for cuisine filtering' },
  
  // Ratings
  'ratings.average': { type: 'number', required: true, description: 'Average rating' },
  'ratings.count': { type: 'number', required: true, description: 'Rating count' },
  
  // Offers
  'offers.cashback': { type: 'number', required: true, description: 'Cashback percentage' },
  
  // Delivery categories
  'deliveryCategories.fastDelivery': { type: 'boolean', required: false, description: '60-min delivery flag' },
  
  // Location
  'location.city': { type: 'string', required: true, description: 'City name' },
  
  // Operational info
  'operationalInfo.deliveryTime': { type: 'string', required: true, description: 'Delivery time range' },
  
  // Flags
  isFeatured: { type: 'boolean', required: false, description: 'Featured store flag' },
};

interface FieldCheckResult {
  field: string;
  exists: boolean;
  populated: boolean;
  correctType: boolean;
  issues: string[];
  sampleValue?: any;
}

interface StoreAuditResult {
  store: any;
  fields: FieldCheckResult[];
  score: number;
  needsMigration: boolean;
  needsSeeding: boolean;
}

interface AuditSummary {
  categoryExists: boolean;
  categoryData?: any;
  totalStores: number;
  activeStores: number;
  storesWithAllFields: number;
  storesNeedingMigration: number;
  storesNeedingSeeding: number;
  fieldCoverage: Record<string, { total: number; populated: number; percentage: number }>;
  recommendations: string[];
}

// Connect to database
async function connectDB() {
  try {
    log.info(`Connecting to MongoDB...`);
    await mongoose.connect(MONGO_URI);
    log.success('Connected to MongoDB');
  } catch (error: any) {
    log.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
}

// Check category
async function checkCategory(): Promise<{ exists: boolean; category?: any }> {
  log.section('Checking Food & Dining Category');
  
  try {
    const category = await Category.findOne({ slug: 'food-dining' }).lean();
    
    if (!category) {
      log.warning('Category "food-dining" not found');
      return { exists: false };
    }
    
    log.success(`Category found: ${category.name} (${category._id})`);
    log.info(`Store count: ${category.storeCount || 0}`);
    log.info(`Product count: ${category.productCount || 0}`);
    
    return { exists: true, category };
  } catch (error: any) {
    log.error(`Error checking category: ${error.message}`);
    return { exists: false };
  }
}

// Check a single field in a store
function checkField(store: any, fieldPath: string, fieldConfig: any): FieldCheckResult {
  const issues: string[] = [];
  let exists = false;
  let populated = false;
  let correctType = false;
  let sampleValue: any = undefined;
  
  try {
    // Navigate to nested field
    const parts = fieldPath.split('.');
    let value = store;
    
    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
        exists = true;
      } else {
        exists = false;
        break;
      }
    }
    
    if (exists) {
      sampleValue = value;
      
      // Check if populated (not null/undefined/empty)
      if (fieldPath === 'tags') {
        populated = Array.isArray(value) && value.length > 0;
      } else if (fieldPath === 'banner') {
        populated = (Array.isArray(value) && value.length > 0) || (typeof value === 'string' && value.length > 0);
      } else if (typeof value === 'string') {
        populated = value.trim().length > 0;
      } else if (typeof value === 'number') {
        populated = !isNaN(value);
      } else if (typeof value === 'boolean') {
        populated = true;
      } else if (value !== null && value !== undefined) {
        populated = true;
      }
      
      // Check type
      if (fieldPath === 'banner') {
        correctType = Array.isArray(value) || typeof value === 'string';
        if (!correctType) {
          issues.push(`Expected array or string, got ${typeof value}`);
        }
      } else if (fieldPath === 'tags') {
        correctType = Array.isArray(value);
        if (!correctType) {
          issues.push(`Expected array, got ${typeof value}`);
        }
      } else {
        const expectedType = fieldConfig.type.replace('|string', '').replace('|', ' or ');
        correctType = true; // Basic check passed
      }
    } else {
      issues.push('Field does not exist');
    }
    
    if (fieldConfig.required && !populated) {
      issues.push('Required field is missing or empty');
    }
    
  } catch (error: any) {
    issues.push(`Error checking field: ${error.message}`);
  }
  
  return {
    field: fieldPath,
    exists,
    populated,
    correctType,
    issues,
    sampleValue,
  };
}

// Audit a single store
function auditStore(store: any): StoreAuditResult {
  const fields: FieldCheckResult[] = [];
  
  // Check all required fields
  for (const [fieldPath, fieldConfig] of Object.entries(REQUIRED_FIELDS)) {
    const result = checkField(store, fieldPath, fieldConfig);
    fields.push(result);
  }
  
  // Calculate score
  const totalFields = fields.length;
  const populatedFields = fields.filter(f => f.populated).length;
  const score = Math.round((populatedFields / totalFields) * 100);
  
  // Determine needs
  const criticalFields = ['name', '_id', 'banner', 'tags', 'ratings.average', 'category'];
  const criticalFieldsMissing = criticalFields.some(fieldPath => {
    const field = fields.find(f => f.field === fieldPath);
    return !field || !field.populated;
  });
  
  const needsSeeding = criticalFieldsMissing || score < 50;
  const needsMigration = !needsSeeding && score < 90; // Has data but needs updates
  
  return {
    store,
    fields,
    score,
    needsMigration,
    needsSeeding,
  };
}

// Check stores
async function checkStores(categoryId: mongoose.Types.ObjectId): Promise<AuditSummary> {
  log.section('Checking Stores');
  
  try {
    // Get all stores in category
    const allStores = await Store.find({ category: categoryId }).lean();
    const activeStores = await Store.find({ 
      category: categoryId,
      isActive: true 
    })
    .populate('category', 'name slug')
    .lean();
    
    log.info(`Total stores in category: ${allStores.length}`);
    log.info(`Active stores: ${activeStores.length}`);
    
    if (activeStores.length === 0) {
      log.warning('No active stores found in category');
      return {
        categoryExists: true,
        totalStores: allStores.length,
        activeStores: 0,
        storesWithAllFields: 0,
        storesNeedingMigration: 0,
        storesNeedingSeeding: allStores.length,
        fieldCoverage: {},
        recommendations: ['No stores found. Run seed script: npx ts-node src/scripts/seedFoodDiningStores.ts'],
      };
    }
    
    // Audit each store
    const audits: StoreAuditResult[] = activeStores.map(store => auditStore(store));
    
    // Calculate field coverage
    const fieldCoverage: Record<string, { total: number; populated: number; percentage: number }> = {};
    
    for (const fieldPath of Object.keys(REQUIRED_FIELDS)) {
      const total = audits.length;
      const populated = audits.filter(audit => {
        const field = audit.fields.find(f => f.field === fieldPath);
        return field && field.populated;
      }).length;
      
      fieldCoverage[fieldPath] = {
        total,
        populated,
        percentage: Math.round((populated / total) * 100),
      };
    }
    
    // Count stores
    const storesWithAllFields = audits.filter(a => a.score === 100).length;
    const storesNeedingMigration = audits.filter(a => a.needsMigration).length;
    const storesNeedingSeeding = audits.filter(a => a.needsSeeding).length;
    
    // Display results
    console.log('\n📊 Store Audit Results:');
    console.log(`   Stores with all fields (100%): ${storesWithAllFields}/${activeStores.length}`);
    console.log(`   Stores needing migration: ${storesNeedingMigration}`);
    console.log(`   Stores needing seeding: ${storesNeedingSeeding}`);
    
    // Field coverage table
    log.section('Field Coverage');
    console.log('\n┌──────────────────────────────────────┬─────────┬───────────┬────────────┐');
    console.log('│ Field                                 │ Populated│ Total     │ Coverage   │');
    console.log('├──────────────────────────────────────┼─────────┼───────────┼────────────┤');
    
    for (const [fieldPath, coverage] of Object.entries(fieldCoverage)) {
      const status = coverage.percentage === 100 ? '✓' : coverage.percentage >= 50 ? '⚠' : '✗';
      const fieldName = fieldPath.padEnd(36);
      const populated = String(coverage.populated).padStart(7);
      const total = String(coverage.total).padStart(9);
      const percentage = `${coverage.percentage}%`.padStart(10);
      console.log(`│ ${fieldName} │ ${populated} │ ${total} │ ${percentage} ${status} │`);
    }
    
    console.log('└──────────────────────────────────────┴─────────┴───────────┴────────────┘');
    
    // Sample store details
    if (activeStores.length > 0) {
      log.section('Sample Store Analysis');
      const sampleStore = activeStores[0];
      const sampleAudit = audits[0];
      
      console.log(`\nSample Store: ${sampleStore.name}`);
      console.log(`Score: ${sampleAudit.score}%`);
      
      console.log('\nField Status:');
      sampleAudit.fields.forEach(field => {
        const status = field.populated ? '✓' : field.exists ? '⚠' : '✗';
        const issues = field.issues.length > 0 ? ` (${field.issues.join(', ')})` : '';
        console.log(`   ${status} ${field.field.padEnd(30)} ${field.populated ? 'OK' : 'MISSING'}${issues}`);
      });
      
      // Check banner format
      if (sampleStore.banner) {
        const banner: any = sampleStore.banner;
        const isBannerArray = Array.isArray(banner);
        const bannerType = isBannerArray ? 'array' : typeof banner;
        let bannerLength = 0;
        if (isBannerArray) {
          bannerLength = banner.length;
        } else if (typeof banner === 'string') {
          bannerLength = banner.length;
        }
        console.log(`\n   Banner format: ${bannerType} (length: ${bannerLength})`);
        if (!isBannerArray) {
          log.warning('Banner should be an array for proper display');
        }
      }
      
      // Check tags
      if (sampleStore.tags && Array.isArray(sampleStore.tags)) {
        const tags = sampleStore.tags as string[];
        console.log(`\n   Tags: ${tags.length} tags`);
        console.log(`   Tag samples: ${tags.slice(0, 5).join(', ')}`);
        const cuisineTags = tags.filter((tag: string) => 
          ['indian', 'chinese', 'italian', 'thai', 'mexican', 'japanese', 'continental'].some(c => 
            tag.toLowerCase().includes(c)
          )
        );
        if (cuisineTags.length === 0) {
          log.warning('No cuisine tags found - filters will not work properly');
        }
      } else {
        log.warning('No tags found - filters will not work');
      }
    }
    
    // Generate recommendations
    const recommendations: string[] = [];
    
    if (storesNeedingSeeding > 0) {
      recommendations.push(`${storesNeedingSeeding} stores need complete data - Run seed script: npx ts-node src/scripts/seedFoodDiningStores.ts`);
    }
    
    if (storesNeedingMigration > 0) {
      recommendations.push(`${storesNeedingMigration} stores need data migration - Update banner format, add tags, etc.`);
    }
    
    if (fieldCoverage['banner']?.percentage < 100) {
      recommendations.push('Some stores missing banner images - Add banner array to stores');
    }
    
    if (fieldCoverage['tags']?.percentage < 100) {
      recommendations.push('Some stores missing tags - Add cuisine tags for filtering to work');
    }
    
    if (storesWithAllFields === activeStores.length) {
      recommendations.push('✅ All stores have complete data - Page is production ready!');
    }
    
    return {
      categoryExists: true,
      categoryData: categoryId,
      totalStores: allStores.length,
      activeStores: activeStores.length,
      storesWithAllFields,
      storesNeedingMigration,
      storesNeedingSeeding,
      fieldCoverage,
      recommendations,
    };
    
  } catch (error: any) {
    log.error(`Error checking stores: ${error.message}`);
    console.error(error);
    return {
      categoryExists: true,
      totalStores: 0,
      activeStores: 0,
      storesWithAllFields: 0,
      storesNeedingMigration: 0,
      storesNeedingSeeding: 0,
      fieldCoverage: {},
      recommendations: [`Error: ${error.message}`],
    };
  }
}

// Main function
async function main() {
  const startTime = Date.now();
  
  try {
    log.header('Food & Dining Data Audit');
    log.info('Checking database for Food & Dining page requirements...\n');
    
    // Connect to database
    await connectDB();
    
    // Check category
    const categoryCheck = await checkCategory();
    
    if (!categoryCheck.exists) {
      log.error('Food & Dining category not found');
      log.info('Recommendation: Create the category first, then run seed script');
      process.exit(1);
    }
    
    // Check stores
    const summary = await checkStores(categoryCheck.category!._id);
    
    // Final summary
    log.header('Audit Summary');
    
    console.log('\n┌──────────────────────────────────────┬──────────────┐');
    console.log('│ Metric                               │ Value        │');
    console.log('├──────────────────────────────────────┼──────────────┤');
    console.log(`│ Category Exists                      │ ${summary.categoryExists ? '✓ Yes' : '✗ No'.padEnd(12)} │`);
    console.log(`│ Total Stores                         │ ${String(summary.totalStores).padStart(12)} │`);
    console.log(`│ Active Stores                        │ ${String(summary.activeStores).padStart(12)} │`);
    console.log(`│ Stores with All Fields (100%)        │ ${String(summary.storesWithAllFields).padStart(12)} │`);
    console.log(`│ Stores Needing Migration             │ ${String(summary.storesNeedingMigration).padStart(12)} │`);
    console.log(`│ Stores Needing Seeding               │ ${String(summary.storesNeedingSeeding).padStart(12)} │`);
    console.log('└──────────────────────────────────────┴──────────────┘');
    
    // Recommendations
    log.section('Recommendations');
    summary.recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec}`);
    });
    
    // Decision
    log.header('Decision');
    if (summary.storesNeedingSeeding > summary.activeStores * 0.5) {
      log.warning('MOST STORES NEED SEEDING');
      log.info('Action: Run seed script to create new stores with complete data');
      log.info('Command: npx ts-node src/scripts/seedFoodDiningStores.ts');
    } else if (summary.storesNeedingMigration > 0) {
      log.warning('STORES NEED DATA MIGRATION');
      log.info('Action: Update existing stores with missing fields (banner format, tags, etc.)');
      log.info('Option 1: Run seed script (will skip existing stores with --clear flag)');
      log.info('Option 2: Create migration script to update existing stores');
    } else if (summary.storesWithAllFields === summary.activeStores && summary.activeStores > 0) {
      log.success('ALL STORES HAVE COMPLETE DATA');
      log.success('✅ Food & Dining page is production ready!');
    } else {
      log.warning('MIXED STATE - Some stores need updates');
      log.info('Review field coverage table above and update stores as needed');
    }
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    log.success(`\nAudit completed in ${duration}s`);
    
  } catch (error: any) {
    log.error(`Audit failed: ${error.message}`);
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
