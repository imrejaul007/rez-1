import mongoose from 'mongoose';
import { Store } from '../models/Store';
import { Product } from '../models/Product';
import { Category } from '../models/Category';
import { connectDatabase } from '../config/database';
import dotenv from 'dotenv';

dotenv.config();

// Extra categories to ensure exist
const EXTRA_CATEGORIES = [
    { name: 'Food & Dining', slug: 'food-dining', type: 'going_out', icon: '🍽️', sortOrder: 99 },
    // Ensure 12 Core are here too (redundant but safe for upsert)
    // ... we will trust existing ones are there or use the ones from unifiedSeeds if needed. 
    // Just focusing on food-dining and ensuring stores for all.
];

const NEW_STORES = [
    // Food & Dining
    { name: 'The Table', slug: 'the-table', categorySlug: 'food-dining', image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800' },
    { name: 'Olive Bar & Kitchen', slug: 'olive-bar', categorySlug: 'food-dining', image: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800' },

    // Restaurants
    { name: 'Punjab Grill', slug: 'punjab-grill', categorySlug: 'restaurants', image: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800' },

    // Cafes
    { name: 'Blue Tokai', slug: 'blue-tokai', categorySlug: 'cafes', image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800' },

    // Bars & Pubs
    { name: 'Social', slug: 'social-offline', categorySlug: 'bars-pubs', image: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800' },

    // Movies
    { name: 'PVR Cinemas', slug: 'pvr', categorySlug: 'movies', image: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800' },

    // Salon & Spa
    { name: 'Enrich Salon', slug: 'enrich', categorySlug: 'salon-spa', image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800' },

    // Gym & Fitness
    { name: 'Gold\'s Gym', slug: 'golds-gym', categorySlug: 'gym-fitness', image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800' },

    // Food Delivery
    { name: 'Swiggy', slug: 'swiggy', categorySlug: 'food-delivery', image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800' },

    // Grocery
    { name: 'BigBasket', slug: 'bigbasket', categorySlug: 'grocery', image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800' },

    // Electronics
    { name: 'Vijay Sales', slug: 'vijay-sales', categorySlug: 'electronics', image: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=800' },

    // Fashion
    { name: 'Myntra', slug: 'myntra', categorySlug: 'fashion', image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800' },

    // Beauty
    { name: 'Sephora', slug: 'sephora', categorySlug: 'beauty', image: 'https://images.unsplash.com/photo-1522335789203-abd65232a2fc?w=800' },

    // Home & Kitchen
    { name: 'Home Centre', slug: 'home-centre', categorySlug: 'home-kitchen', image: 'https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=800' }
];

async function addMoreStores() {
    console.log('🚀 Starting addMoreStores script...');
    await connectDatabase();

    // 1. Ensure Food & Dining category exists
    console.log('📦 Ensuring categories...');
    for (const cat of EXTRA_CATEGORIES) {
        await Category.findOneAndUpdate(
            { slug: cat.slug },
            {
                $set: {
                    name: cat.name,
                    type: cat.type as any,
                    icon: cat.icon,
                    isActive: true
                }
            },
            { upsert: true, new: true }
        );
        console.log(`   ✅ Checked/Created category: ${cat.name}`);
    }

    // 2. Add Stores without deleting
    console.log('🏬 Adding stores...');
    let addedCount = 0;

    for (const s of NEW_STORES) {
        // Find category
        const category = await Category.findOne({ slug: s.categorySlug });
        if (!category) {
            console.warn(`   ⚠️ Category ${s.categorySlug} not found for ${s.name} (Skipping)`);
            continue;
        }

        // Check if store exists
        let store = await Store.findOne({ slug: s.slug });
        if (store) {
            console.log(`   ℹ️ Store ${s.name} already exists (Skipping creation)`);
        } else {
            console.log(`   🆕 Creating store: ${s.name}`);
            store = await Store.create({
                name: s.name,
                slug: s.slug,
                category: category._id,
                image: s.image,
                location: {
                    address: 'Added via Script',
                    city: 'Mumbai',
                    state: 'Maharashtra',
                    pincode: '400050',
                    coordinates: [72.8, 19.0]
                },
                rating: 4.2,
                isActive: true
            });
            addedCount++;
        }

        // 3. Ensure products for this store
        const productCount = await Product.countDocuments({ store: store._id });
        if (productCount < 2) {
            console.log(`      Creating products for ${s.name}...`);
            for (let i = 1; i <= 3; i++) {
                await Product.create({
                    name: `${s.name} Special Item ${i}`,
                    slug: `${s.slug}-special-${i}`,
                    description: `Special item from ${s.name}`,
                    sku: `${s.slug.toUpperCase().replace(/-/g, '')}-SPL-${i}`,
                    category: category._id,
                    store: store._id,
                    images: [s.image],
                    pricing: {
                        original: 1500,
                        selling: 1200
                    },
                    inventory: {
                        stock: 100,
                        isAvailable: true
                    }
                });
            }
        }
    }

    console.log(`✅ Added ${addedCount} new stores.`);
    console.log('🎉 Done!');
}

if (require.main === module) {
    addMoreStores().then(() => {
        mongoose.disconnect();
        process.exit(0);
    }).catch(err => {
        console.error(err);
        process.exit(1);
    });
}
