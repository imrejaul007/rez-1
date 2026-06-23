/**
 * Analyze Cuisine Data in Database
 * 
 * This script checks:
 * 1. What cuisine-related tags exist on stores
 * 2. How many stores have each cuisine tag
 * 3. Whether subcategories exist for cuisines
 * 
 * Run from rez-backend folder: node scripts/analyzeCuisineData.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };
const DB_NAME = process.env.DB_NAME || 'test';

// Cuisine keywords to analyze
const CUISINE_KEYWORDS = [
    'pizza', 'biryani', 'burgers', 'burger', 'chinese', 'desserts', 'dessert',
    'healthy', 'south indian', 'north indian', 'cafe', 'street food', 'thali',
    'ice cream', 'italian', 'thai', 'mexican', 'japanese', 'sushi'
];

async function analyzeCuisineData() {
    try {
        console.log('\n╔════════════════════════════════════════════════════════════╗');
        console.log('║                                                            ║');
        console.log('║   🍕 ANALYZE CUISINE DATA IN DATABASE                     ║');
        console.log('║                                                            ║');
        console.log('╚════════════════════════════════════════════════════════════╝\n');

        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI, {
            dbName: DB_NAME,
        });
        console.log('✅ Connected to MongoDB\n');

        // Load models
        console.log('📦 Loading models...');
        require('ts-node/register');

        const projectRoot = path.resolve(__dirname, '..');
        const { Category } = require(path.join(projectRoot, 'src/models/Category'));
        const { Store } = require(path.join(projectRoot, 'src/models/Store'));
        const { Product } = require(path.join(projectRoot, 'src/models/Product'));

        console.log('✅ Models loaded\n');

        // 1. Check all categories
        console.log('═'.repeat(60));
        console.log('📁 ALL CATEGORIES:');
        console.log('═'.repeat(60));

        const allCategories = await Category.find({ isActive: true }).lean();
        console.log(`Total categories: ${allCategories.length}`);

        allCategories.forEach(cat => {
            const isChild = cat.parentCategory ? '(subcategory)' : '(root)';
            console.log(`  - ${cat.name} [${cat.slug}] ${isChild}`);
        });

        // 2. Find Food & Dining category
        console.log('\n═'.repeat(60));
        console.log('🍴 FOOD & DINING CATEGORY:');
        console.log('═'.repeat(60));

        const foodCategory = await Category.findOne({ slug: 'food-dining', isActive: true }).lean();

        if (foodCategory) {
            console.log(`Found: ${foodCategory.name} (ID: ${foodCategory._id})`);

            // Check for subcategories
            const subcategories = await Category.find({
                parentCategory: foodCategory._id,
                isActive: true
            }).lean();

            console.log(`\nSubcategories (${subcategories.length}):`);
            subcategories.forEach(sub => {
                console.log(`  - ${sub.name} [${sub.slug}]`);
            });
        } else {
            console.log('❌ Food & Dining category NOT FOUND!');
        }

        // 3. Analyze store tags
        console.log('\n═'.repeat(60));
        console.log('🏪 STORE TAG ANALYSIS:');
        console.log('═'.repeat(60));

        const allStores = await Store.find({ isActive: true }).lean();
        console.log(`Total active stores: ${allStores.length}`);

        // Collect all unique tags
        const tagCounts = {};
        allStores.forEach(store => {
            if (store.tags && Array.isArray(store.tags)) {
                store.tags.forEach(tag => {
                    const lowerTag = tag.toLowerCase();
                    tagCounts[lowerTag] = (tagCounts[lowerTag] || 0) + 1;
                });
            }
        });

        console.log('\nAll tags found:');
        const sortedTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]);
        sortedTags.forEach(([tag, count]) => {
            console.log(`  - "${tag}": ${count} stores`);
        });

        // 4. Check cuisine keyword matches
        console.log('\n═'.repeat(60));
        console.log('🍕 CUISINE KEYWORD MATCHES:');
        console.log('═'.repeat(60));

        for (const cuisine of CUISINE_KEYWORDS) {
            // Count stores with this tag
            const storesWithTag = allStores.filter(store => {
                if (!store.tags || !Array.isArray(store.tags)) return false;
                return store.tags.some(tag =>
                    tag.toLowerCase().includes(cuisine.toLowerCase())
                );
            });

            // Count stores with name containing cuisine
            const storesWithName = allStores.filter(store =>
                store.name.toLowerCase().includes(cuisine.toLowerCase())
            );

            const total = new Set([...storesWithTag, ...storesWithName].map(s => s._id.toString())).size;

            if (total > 0) {
                console.log(`  ✅ "${cuisine}": ${total} stores (${storesWithTag.length} by tag, ${storesWithName.length} by name)`);
            } else {
                console.log(`  ❌ "${cuisine}": 0 stores`);
            }
        }

        // 5. Check stores in Food & Dining category
        console.log('\n═'.repeat(60));
        console.log('🏷️ STORES IN FOOD & DINING CATEGORY:');
        console.log('═'.repeat(60));

        if (foodCategory) {
            const foodStores = await Store.find({
                category: foodCategory._id,
                isActive: true
            }).lean();

            console.log(`Stores directly in Food & Dining: ${foodStores.length}`);
            foodStores.forEach(store => {
                const tags = store.tags ? store.tags.join(', ') : 'none';
                console.log(`  - ${store.name} [tags: ${tags}]`);
            });
        }

        // 6. Check products for food category
        console.log('\n═'.repeat(60));
        console.log('📦 PRODUCTS IN FOOD & DINING CATEGORY:');
        console.log('═'.repeat(60));

        if (foodCategory) {
            const foodProducts = await Product.find({
                category: foodCategory._id,
                isActive: true
            }).lean();

            console.log(`Products in Food & Dining: ${foodProducts.length}`);
            foodProducts.slice(0, 5).forEach(product => {
                const tags = product.tags ? product.tags.join(', ') : 'none';
                console.log(`  - ${product.name} [tags: ${tags}]`);
            });
            if (foodProducts.length > 5) {
                console.log(`  ... and ${foodProducts.length - 5} more`);
            }
        }

        // 7. Summary and Recommendations
        console.log('\n═'.repeat(60));
        console.log('💡 SUMMARY & RECOMMENDATIONS:');
        console.log('═'.repeat(60));

        const hasCuisineTags = sortedTags.some(([tag]) =>
            CUISINE_KEYWORDS.some(cuisine => tag.includes(cuisine))
        );

        if (!hasCuisineTags) {
            console.log('\n⚠️  ISSUE: No cuisine tags found on stores!');
            console.log('   FIX: Add cuisine tags to stores (pizza, biryani, etc.)');
            console.log('   OR: Create a seeding script to add tags to existing stores');
        } else {
            console.log('\n✅ Cuisine tags exist on stores');
        }

        console.log('\n📋 To make "Browse by Cuisine" work, you need:');
        console.log('   1. Stores with cuisine tags (pizza, biryani, etc.)');
        console.log('   2. Backend search API that filters by tags');
        console.log('   3. Frontend to pass cuisine as tag filter, not subcategory');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 Disconnected from MongoDB\n');
    }
}

analyzeCuisineData();
