
import mongoose from 'mongoose';
import { Product } from '../src/models/Product';
import { Category } from '../src/models/Category';
import { Store } from '../src/models/Store';
import { connectDatabase } from '../src/config/database';

function slugify(text: string) {
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')           // Replace spaces with -
        .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
        .replace(/\-\-+/g, '-')         // Replace multiple - with single -
        .replace(/^-+/, '')             // Trim - from start of text
        .replace(/-+$/, '');            // Trim - from end of text
}

async function seedProducts() {
    await connectDatabase();
    console.log('🌱 Starting Product Seeding...');

    // 1. Get or Create a General Category and Store for safety
    let category = await Category.findOne({ slug: 'general' });
    if (!category) {
        category = await Category.create({ name: 'General', slug: 'general', image: 'https://via.placeholder.com/150' });
        console.log('Created General Category');
    }

    let store = await Store.findOne(); // Any store
    if (!store) {
        console.log('❌ No store found! Please seed stores first.');
        process.exit(1);
    }
    console.log(`Using Store: ${store.name}`);

    const PRODUCTS = [
        // --- Sample/Trial ---
        {
            name: "Premium Skincare Trial Set",
            description: "Try our best-selling serums and creams before you commit to full size.",
            pricing: { selling: 0, cost: 5, currency: 'INR' },
            images: ["https://images.unsplash.com/photo-1571781565036-d3f75af54b76?w=400"],
            tags: ["sample", "trial", "beauty", "free"],
            ratings: { average: 4.8, count: 120 },
            inventory: { stock: 50, sku: "SAMPLE-001" }
        },
        {
            name: "Organic Protein Bar Sample",
            description: "Free sample of our new chocolate peanut butter protein bar.",
            pricing: { selling: 0, cost: 2, currency: 'INR' },
            images: ["https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400"],
            tags: ["sample", "trial", "food", "healthy"],
            ratings: { average: 4.5, count: 85 },
            inventory: { stock: 100, sku: "SAMPLE-002" }
        },
        {
            name: "7-Day Netflix Trial",
            description: "Experience premium entertainment for a week, on us.",
            pricing: { selling: 0, cost: 0, currency: 'INR' },
            images: ["https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=400"],
            tags: ["sample", "trial", "digital"],
            ratings: { average: 4.9, count: 500 },
            inventory: { stock: 999, sku: "SAMPLE-003" }
        },

        // --- Fast Delivery ---
        {
            name: "Farm Fresh Milk (1L)",
            description: "Delivered fresh to your doorstep within 60 mins.",
            pricing: { selling: 60, cost: 45, currency: 'INR' },
            images: ["https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400"],
            tags: ["fast", "grocery", "essential", "daily"],
            ratings: { average: 4.7, count: 300 },
            inventory: { stock: 50, sku: "FAST-001" }
        },
        {
            name: "Whole Wheat Bread",
            description: "Freshly baked daily.",
            pricing: { selling: 40, cost: 25, currency: 'INR' },
            images: ["https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400"],
            tags: ["fast", "grocery", "essential", "breakfast"],
            ratings: { average: 4.6, count: 250 },
            inventory: { stock: 30, sku: "FAST-002" }
        },

        // --- Luxury ---
        {
            name: "Classic Gold Watch",
            description: "Timeless elegance with 24k gold plating.",
            pricing: { selling: 25000, cost: 18000, currency: 'INR' },
            images: ["https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=400"],
            tags: ["luxury", "premium", "gold", "watch"],
            ratings: { average: 4.9, count: 45 },
            inventory: { stock: 5, sku: "LUX-001" }
        },
        {
            name: "Designer Leather Handbag",
            description: "Italian leather, handcrafted perfection.",
            pricing: { selling: 45000, cost: 30000, currency: 'INR' },
            images: ["https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400"],
            tags: ["luxury", "premium", "fashion", "bag"],
            ratings: { average: 4.8, count: 60 },
            inventory: { stock: 8, sku: "LUX-002" }
        },

        // --- Organic ---
        {
            name: "Organic Quinoa (1kg)",
            description: "100% certified organic white quinoa.",
            pricing: { selling: 350, cost: 200, currency: 'INR' },
            images: ["https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400"],
            tags: ["organic", "healthy", "food", "natural"],
            ratings: { average: 4.7, count: 150 },
            inventory: { stock: 40, sku: "ORG-001" }
        },

        // --- Men ---
        {
            name: "Men's Grooming Kit",
            description: "Complete beard care and face wash set.",
            pricing: { selling: 1200, cost: 800, currency: 'INR' },
            images: ["https://images.unsplash.com/photo-1621600411688-4be93cd68504?w=400"],
            tags: ["men", "grooming", "kit"],
            ratings: { average: 4.6, count: 90 },
            inventory: { stock: 25, sku: "MEN-001" }
        },

        // --- Women ---
        {
            name: "Summer Floral Dress",
            description: "Lightweight cotton dress perfect for hot days.",
            pricing: { selling: 1500, cost: 900, currency: 'INR' },
            images: ["https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=400"],
            tags: ["women", "fashion", "clothing"],
            ratings: { average: 4.5, count: 200 },
            inventory: { stock: 60, sku: "WOM-001" }
        },

        // --- Gifting ---
        {
            name: "Luxury Chocolate Hampers",
            description: "Assorted gourmet chocolates in a gift box.",
            pricing: { selling: 800, cost: 500, currency: 'INR' },
            images: ["https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=400"],
            tags: ["gift", "present", "chocolate"],
            ratings: { average: 4.8, count: 300 },
            inventory: { stock: 100, sku: "GIFT-001" }
        }
    ];

    for (const prod of PRODUCTS) {
        const slug = slugify(prod.name);
        await Product.findOneAndUpdate(
            { name: prod.name },
            {
                ...prod,
                slug, // Ensure slug is present
                store: store._id,
                category: category._id,
                isActive: true,
                isFeatured: true
            },
            { upsert: true, new: true }
        );
        console.log(`✅ Seeded: ${prod.name}`);
    }

    console.log('🎉 Seeding Complete!');
    process.exit();
}

seedProducts().catch(err => {
    console.error('❌ Seeding Failed:', err);
    process.exit(1);
});
