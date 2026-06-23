/**
 * MongoDB Data Verification Script for Category Pages
 * Checks if all required data exists for the 11 category pages
 *
 * Run: node scripts/checkCategoryPageData.js
 */

const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };
const DB_NAME = 'test';

// 11 main category slugs
const CATEGORY_SLUGS = [
  'food-dining',
  'fashion',
  'beauty-wellness',
  'grocery-essentials',
  'healthcare',
  'fitness-sports',
  'education-learning',
  'home-services',
  'travel-experiences',
  'entertainment',
  'financial-lifestyle',
];

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✓ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}✗ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.cyan}ℹ ${msg}${colors.reset}`),
  header: (msg) => console.log(`\n${colors.bold}━━━ ${msg} ━━━${colors.reset}\n`),
};

async function checkCategoryPageData() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    log.info('Connected to MongoDB');

    const db = client.db(DB_NAME);
    const results = {
      categories: { total: 0, withVibes: 0, withOccasions: 0, withHashtags: 0 },
      stores: { total: 0, byCategory: {} },
      products: { total: 0, byCategory: {} },
      ugc: { total: 0, byStore: 0 },
      offers: { bankOffers: 0, exclusiveOffers: 0, regularOffers: 0 },
      socialProof: { total: 0 },
      issues: [],
    };

    // ═══════════════════════════════════════════════════════════════
    log.header('1. CHECKING CATEGORIES');
    // ═══════════════════════════════════════════════════════════════

    const categories = await db.collection('categories').find({
      slug: { $in: CATEGORY_SLUGS }
    }).toArray();

    results.categories.total = categories.length;

    console.log(`Found ${categories.length}/${CATEGORY_SLUGS.length} categories\n`);

    for (const slug of CATEGORY_SLUGS) {
      const category = categories.find(c => c.slug === slug);

      if (!category) {
        log.error(`Missing category: ${slug}`);
        results.issues.push(`Missing category: ${slug}`);
        continue;
      }

      const hasVibes = category.vibes && category.vibes.length > 0;
      const hasOccasions = category.occasions && category.occasions.length > 0;
      const hasHashtags = category.trendingHashtags && category.trendingHashtags.length > 0;

      if (hasVibes) results.categories.withVibes++;
      if (hasOccasions) results.categories.withOccasions++;
      if (hasHashtags) results.categories.withHashtags++;

      const status = (hasVibes && hasOccasions && hasHashtags) ? '✓' : '⚠';
      console.log(`${status} ${slug.padEnd(20)} | Vibes: ${(category.vibes?.length || 0).toString().padStart(2)} | Occasions: ${(category.occasions?.length || 0).toString().padStart(2)} | Hashtags: ${(category.trendingHashtags?.length || 0).toString().padStart(2)}`);

      if (!hasVibes) results.issues.push(`${slug}: Missing vibes`);
      if (!hasOccasions) results.issues.push(`${slug}: Missing occasions`);
      if (!hasHashtags) results.issues.push(`${slug}: Missing hashtags`);
    }

    // ═══════════════════════════════════════════════════════════════
    log.header('2. CHECKING STORES BY CATEGORY');
    // ═══════════════════════════════════════════════════════════════

    const totalStores = await db.collection('stores').countDocuments({ isActive: true });
    results.stores.total = totalStores;
    console.log(`Total active stores: ${totalStores}\n`);

    for (const category of categories) {
      const storeCount = await db.collection('stores').countDocuments({
        $or: [
          { category: category._id },
          { subCategories: category._id }
        ],
        isActive: true
      });

      results.stores.byCategory[category.slug] = storeCount;

      const status = storeCount >= 5 ? '✓' : (storeCount > 0 ? '⚠' : '✗');
      console.log(`${status} ${category.slug.padEnd(20)} | Stores: ${storeCount.toString().padStart(4)}`);

      if (storeCount === 0) {
        results.issues.push(`${category.slug}: No stores found`);
      } else if (storeCount < 5) {
        results.issues.push(`${category.slug}: Only ${storeCount} stores (recommend 5+)`);
      }
    }

    // ═══════════════════════════════════════════════════════════════
    log.header('3. CHECKING PRODUCTS BY CATEGORY');
    // ═══════════════════════════════════════════════════════════════

    const totalProducts = await db.collection('products').countDocuments({ isActive: true });
    results.products.total = totalProducts;
    console.log(`Total active products: ${totalProducts}\n`);

    for (const category of categories) {
      const productCount = await db.collection('products').countDocuments({
        category: category._id,
        isActive: true
      });

      results.products.byCategory[category.slug] = productCount;

      const status = productCount >= 10 ? '✓' : (productCount > 0 ? '⚠' : '✗');
      console.log(`${status} ${category.slug.padEnd(20)} | Products: ${productCount.toString().padStart(4)}`);

      if (productCount === 0) {
        results.issues.push(`${category.slug}: No products found`);
      } else if (productCount < 10) {
        results.issues.push(`${category.slug}: Only ${productCount} products (recommend 10+)`);
      }
    }

    // ═══════════════════════════════════════════════════════════════
    log.header('4. CHECKING UGC/VIDEOS');
    // ═══════════════════════════════════════════════════════════════

    const totalVideos = await db.collection('videos').countDocuments({ isPublished: true });
    const ugcVideos = await db.collection('videos').countDocuments({
      contentType: 'ugc',
      isPublished: true
    });
    const videosWithStores = await db.collection('videos').countDocuments({
      stores: { $exists: true, $ne: [] },
      isPublished: true
    });

    results.ugc.total = ugcVideos;
    results.ugc.byStore = videosWithStores;

    console.log(`Total published videos: ${totalVideos}`);
    console.log(`UGC videos: ${ugcVideos}`);
    console.log(`Videos linked to stores: ${videosWithStores}`);

    if (ugcVideos === 0) {
      log.error('No UGC content found!');
      results.issues.push('No UGC videos found');
    } else if (ugcVideos < 20) {
      log.warning(`Only ${ugcVideos} UGC videos (recommend 20+)`);
    } else {
      log.success(`${ugcVideos} UGC videos available`);
    }

    // ═══════════════════════════════════════════════════════════════
    log.header('5. CHECKING OFFERS');
    // ═══════════════════════════════════════════════════════════════

    const bankOffers = await db.collection('bankoffers').countDocuments({ isActive: true });
    const exclusiveOffers = await db.collection('exclusiveoffers').countDocuments({ isActive: true });
    const regularOffers = await db.collection('offers').countDocuments({ 'validity.isActive': true });

    results.offers.bankOffers = bankOffers;
    results.offers.exclusiveOffers = exclusiveOffers;
    results.offers.regularOffers = regularOffers;

    console.log(`Bank Offers: ${bankOffers}`);
    console.log(`Exclusive Offers: ${exclusiveOffers}`);
    console.log(`Regular Offers: ${regularOffers}`);

    if (bankOffers === 0) {
      log.warning('No bank offers found');
      results.issues.push('No bank offers found');
    }
    if (exclusiveOffers === 0) {
      log.warning('No exclusive offers found');
      results.issues.push('No exclusive offers found');
    }

    // ═══════════════════════════════════════════════════════════════
    log.header('6. CHECKING SOCIAL PROOF STATS');
    // ═══════════════════════════════════════════════════════════════

    const socialProofStats = await db.collection('socialproofstats').countDocuments({});
    results.socialProof.total = socialProofStats;

    console.log(`Social Proof Stats: ${socialProofStats}`);

    if (socialProofStats === 0) {
      log.warning('No social proof stats found');
      results.issues.push('No social proof stats found');
    } else if (socialProofStats < 11) {
      log.warning(`Only ${socialProofStats} social proof stats (need 11 for all categories)`);
    } else {
      log.success(`${socialProofStats} social proof stats available`);
    }

    // ═══════════════════════════════════════════════════════════════
    log.header('7. CHECKING SUBCATEGORIES');
    // ═══════════════════════════════════════════════════════════════

    for (const category of categories) {
      const subcategories = await db.collection('categories').countDocuments({
        parentCategory: category._id,
        isActive: true
      });

      const status = subcategories >= 6 ? '✓' : (subcategories > 0 ? '⚠' : '✗');
      console.log(`${status} ${category.slug.padEnd(20)} | Subcategories: ${subcategories.toString().padStart(3)}`);

      if (subcategories === 0) {
        results.issues.push(`${category.slug}: No subcategories found`);
      } else if (subcategories < 6) {
        results.issues.push(`${category.slug}: Only ${subcategories} subcategories (recommend 6+)`);
      }
    }

    // ═══════════════════════════════════════════════════════════════
    log.header('SUMMARY');
    // ═══════════════════════════════════════════════════════════════

    console.log('\n┌─────────────────────────────────┬──────────┐');
    console.log('│ Data Type                       │ Count    │');
    console.log('├─────────────────────────────────┼──────────┤');
    console.log(`│ Categories                      │ ${results.categories.total.toString().padStart(8)} │`);
    console.log(`│   - With Vibes                  │ ${results.categories.withVibes.toString().padStart(8)} │`);
    console.log(`│   - With Occasions              │ ${results.categories.withOccasions.toString().padStart(8)} │`);
    console.log(`│   - With Hashtags               │ ${results.categories.withHashtags.toString().padStart(8)} │`);
    console.log(`│ Total Stores                    │ ${results.stores.total.toString().padStart(8)} │`);
    console.log(`│ Total Products                  │ ${results.products.total.toString().padStart(8)} │`);
    console.log(`│ UGC Videos                      │ ${results.ugc.total.toString().padStart(8)} │`);
    console.log(`│ Bank Offers                     │ ${results.offers.bankOffers.toString().padStart(8)} │`);
    console.log(`│ Exclusive Offers                │ ${results.offers.exclusiveOffers.toString().padStart(8)} │`);
    console.log(`│ Social Proof Stats              │ ${results.socialProof.total.toString().padStart(8)} │`);
    console.log('└─────────────────────────────────┴──────────┘');

    // ═══════════════════════════════════════════════════════════════
    log.header('ISSUES FOUND');
    // ═══════════════════════════════════════════════════════════════

    if (results.issues.length === 0) {
      log.success('No critical issues found! All data is ready.');
    } else {
      console.log(`Found ${results.issues.length} issues:\n`);
      results.issues.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue}`);
      });
    }

    // Final assessment
    log.header('PRODUCTION READINESS');

    const criticalIssues = results.issues.filter(i =>
      i.includes('Missing category') ||
      i.includes('No stores found') ||
      i.includes('No products found')
    );

    if (criticalIssues.length === 0) {
      log.success('Category pages are READY for production!');
    } else {
      log.error(`${criticalIssues.length} critical issues must be fixed before production.`);
    }

  } catch (error) {
    log.error(`Error: ${error.message}`);
    console.error(error);
  } finally {
    await client.close();
    log.info('\nDisconnected from MongoDB');
  }
}

// Run the script
checkCategoryPageData();
