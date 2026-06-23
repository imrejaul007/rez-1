/**
 * Unified Seeder
 * Populates Users, Stores, Products, and Orders with consistent relationships
 * to ensure all lookups (Ticker, My Visits, etc.) work correctly.
 */

import mongoose from 'mongoose';
import { User } from '../models/User';
import { Store } from '../models/Store';
import { Product } from '../models/Product';
import { Order } from '../models/Order';
import { Category } from '../models/Category';
import { connectDatabase } from '../config/database';
import dotenv from 'dotenv';

dotenv.config();

// ============================================
// DATA GENERATORS
// ============================================

const USERS = [
    { name: 'Rahul Kumar', email: 'rahul@example.com' },
    { name: 'Priya Singh', email: 'priya@example.com' },
    { name: 'Amit Shah', email: 'amit@example.com' },
    { name: 'Sneha Patel', email: 'sneha@example.com' },
    { name: 'Vikram Malhotra', email: 'vikram@example.com' },
    { name: 'Anjali Gupta', email: 'anjali@example.com' },
    { name: 'Rohan Das', email: 'rohan@example.com' },
    { name: 'Kavita Reddy', email: 'kavita@example.com' },
    // Specific user requested
    {
        name: 'Mukul Raj',
        email: 'mukulraj756@gmail.com',
        phone: '+918210224305',
        walletBalance: 10000
    }
];

/**
 * THE 12 CORE CATEGORIES (Going Out + Home Delivery)
 */
const CATEGORIES_DATA = [
    // Going Out (6)
    { name: 'Restaurants', slug: 'restaurants', type: 'going_out', icon: '🍽️', sortOrder: 1 },
    { name: 'Cafes', slug: 'cafes', type: 'going_out', icon: '☕', sortOrder: 2 },
    { name: 'Bars & Pubs', slug: 'bars-pubs', type: 'going_out', icon: '🍺', sortOrder: 3 },
    { name: 'Movies', slug: 'movies', type: 'going_out', icon: '�', sortOrder: 4 },
    { name: 'Salon & Spa', slug: 'salon-spa', type: 'going_out', icon: '💅', sortOrder: 5 },
    { name: 'Gym & Fitness', slug: 'gym-fitness', type: 'going_out', icon: '🏋️', sortOrder: 6 },

    // Home Delivery (6)
    { name: 'Food Delivery', slug: 'food-delivery', type: 'home_delivery', icon: '🍕', sortOrder: 1 },
    { name: 'Grocery', slug: 'grocery', type: 'home_delivery', icon: '🥬', sortOrder: 2 },
    { name: 'Electronics', slug: 'electronics', type: 'home_delivery', icon: '📱', sortOrder: 3 },
    { name: 'Fashion', slug: 'fashion', type: 'home_delivery', icon: '�', sortOrder: 4 },
    { name: 'Beauty', slug: 'beauty', type: 'home_delivery', icon: '💄', sortOrder: 5 },
    { name: 'Home & Kitchen', slug: 'home-kitchen', type: 'home_delivery', icon: '🏠', sortOrder: 6 },
];

const STORES = [
    { name: 'Dominos Pizza', slug: 'dominos', categorySlug: 'food-delivery', image: 'https://images.unsplash.com/photo-1590846406792-0adc7f938f1d?w=800' },
    { name: 'Burger King', slug: 'burger-king', categorySlug: 'food-delivery', image: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=800' },
    { name: 'Starbucks', slug: 'starbucks', categorySlug: 'cafes', image: 'https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=800' }, // Linked to Cafes
    { name: 'Zara', slug: 'zara', categorySlug: 'fashion', image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800' },
    { name: 'H&M', slug: 'hm', categorySlug: 'fashion', image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=800' },
    { name: 'Croma', slug: 'croma', categorySlug: 'electronics', image: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=800' },
    { name: 'Reliance Digital', slug: 'reliance-digital', categorySlug: 'electronics', image: 'https://images.unsplash.com/photo-1593640408182-31c70c8268f5?w=800' },
    { name: 'Nykaa', slug: 'nykaa', categorySlug: 'beauty', image: 'https://images.unsplash.com/photo-1596462502278-27bfdd403348?w=800' },
    { name: 'Decathlon', slug: 'decathlon', categorySlug: 'fashion', image: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800' }, // Mapped to Fashion (Activewear)
    { name: 'Urban Company', slug: 'urban-company', categorySlug: 'salon-spa', image: 'https://images.unsplash.com/photo-1581578731117-104f2a41272c?w=800' }, // Mapped to Salon & Spa (closest)
];

async function seedUnified() {
    console.log('🌱 Starting Unified Seeding...');

    // 1. Clear existing data
    await User.deleteMany({});
    await Order.deleteMany({});
    await Store.deleteMany({});
    await Product.deleteMany({});
    // We do NOT delete categories here to avoid breaking relationships if IDs change, 
    // but since we are UPSERTING by slug, it's fine.

    console.log('🧹 Cleared Orders, Stores, Products, Users');

    // 2. Ensure Categories Exist (Upsert)
    console.log('📦 Checking Categories...');
    for (const cat of CATEGORIES_DATA) {
        await Category.findOneAndUpdate(
            { slug: cat.slug },
            {
                $set: {
                    name: cat.name,
                    type: cat.type as any,
                    icon: cat.icon,
                    sortOrder: cat.sortOrder,
                    isActive: true
                }
            },
            { upsert: true, new: true }
        );
    }
    console.log('✅ Categories ensured');

    // 3. Create Users
    const userDocs = [];
    for (const u of USERS) {
        let user = await User.findOne({ email: u.email });
        if (!user) {
            const [firstName, lastName] = u.name.split(' ');

            // Use provided phone or generate one
            const phoneNumber = (u as any).phone || `987654320${USERS.indexOf(u)}`;

            // Use provided wallet balance or default to 0
            const walletBalance = (u as any).walletBalance || 0;

            user = await User.create({
                phoneNumber: phoneNumber,
                email: u.email,
                password: 'password123',
                profile: {
                    firstName,
                    lastName
                },
                wallet: {
                    balance: walletBalance,
                    totalEarned: walletBalance,
                    totalSpent: 0,
                    pendingAmount: 0
                }
            });
        } else {
            // If user exists, ensure wallet balance is updated if specified
            if ((u as any).walletBalance) {
                user.wallet.balance = (u as any).walletBalance;
                user.wallet.totalEarned = (u as any).walletBalance; // Assuming initial grants count as earned
                await user.save();
            }
        }
        userDocs.push(user);
    }
    console.log(`✅ ${userDocs.length} Users ready`);

    // 4. Create Stores & Products
    const storeDocs = [];
    const productDocs = [];

    for (const s of STORES) {
        const category = await Category.findOne({ slug: s.categorySlug });
        if (!category) {
            console.warn(`⚠️ Category ${s.categorySlug} not found for store ${s.name} - Skipping`);
            continue;
        }

        const store = await Store.create({
            name: s.name,
            slug: s.slug,
            category: category._id,
            image: s.image,
            location: {
                address: '123 Main St',
                city: 'Mumbai',
                state: 'Maharashtra',
                pincode: '400001',
                coordinates: [72.8777, 19.0760]
            },
            rating: 4.5,
            isActive: true
        });
        storeDocs.push(store);

        // Create 2-3 products for this store
        for (let i = 1; i <= 3; i++) {
            const price = Math.floor(Math.random() * 2000) + 100;
            const product = await Product.create({
                name: `${s.name} Product ${i}`,
                slug: `${s.slug}-product-${i}`,
                description: `Awesome product from ${s.name}`,
                sku: `${s.slug.toUpperCase().replace(/-/g, '')}-PROD-${i}`,
                category: category._id, // Product category
                store: store._id,       // Store reference
                images: [s.image],
                pricing: {
                    original: price + 200,
                    selling: price
                },
                inventory: {
                    stock: 50,
                    isAvailable: true
                }
            });
            productDocs.push(product);
        }
    }
    console.log(`✅ ${storeDocs.length} Stores & ${productDocs.length} Products created`);

    // 5. Create Random Orders for Loyalty & History
    const orders = [];
    const now = Date.now();

    for (let i = 0; i < 50; i++) {
        const user = userDocs[Math.floor(Math.random() * userDocs.length)];
        const store = storeDocs[Math.floor(Math.random() * storeDocs.length)];

        const storeIdStr = String(store._id);
        const storeProducts = productDocs.filter(p => String((p as any).store) === storeIdStr);
        if (storeProducts.length === 0) continue;

        const product = storeProducts[0];

        const timeOffset = Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000); // Random time in last 7 days
        const createdAt = new Date(now - timeOffset);

        const price = (product as any).pricing.selling;
        const subtotal = price * 1;

        const order = await Order.create({
            orderNumber: `ORD-${now}-${i}-${Math.floor(Math.random() * 1000)}`,
            user: user._id,
            items: [{
                product: product._id,
                store: store._id,
                name: product.name,
                image: product.images[0],
                quantity: 1,
                price: price,
                subtotal: subtotal
            }],
            totals: {
                subtotal: subtotal,
                total: subtotal,
                paidAmount: subtotal,
                tax: 0,
                delivery: 0,
                discount: 0
            },
            payment: {
                method: 'card',
                status: 'paid',
                paidAt: createdAt
            },
            delivery: {
                status: 'delivered',
                method: 'standard',
                address: {
                    name: (user as any).profile.firstName + ' ' + (user as any).profile.lastName,
                    phone: (user as any).phoneNumber,
                    addressLine1: '456 User St',
                    city: 'Mumbai',
                    state: 'Maharashtra',
                    pincode: '400002',
                    country: 'India'
                },
                deliveredAt: createdAt
            },
            status: 'delivered',
            createdAt: createdAt,
            updatedAt: createdAt
        });
        orders.push(order);
    }

    console.log(`✅ ${orders.length} Orders created`);

    // ============================================
    // INSPECT DB STATE
    // ============================================
    console.log('\n🔍 Verifying Database State...');

    const userCount = await User.countDocuments();
    const storeCount = await Store.countDocuments();
    const orderCount = await Order.countDocuments();
    const categoryCount = await Category.countDocuments();

    console.log('📊 Stats:', { Users: userCount, Stores: storeCount, Orders: orderCount, Categories: categoryCount });

    // Sample Order Check
    console.log('\n📝 Checking Recent Order Links:');
    const recentOrders = await Order.find()
        .sort({ createdAt: -1 })
        .limit(3)
        .populate('user', 'profile.firstName profile.lastName email')
        .populate('items.store', 'name slug');

    recentOrders.forEach((order: any) => {
        const u = order.user;
        const userName = u?.profile ? `${u.profile.firstName} ${u.profile.lastName}` : (u?.name || '❌ MISSING USER');
        const storeName = order.items[0]?.store?.name || '❌ MISSING STORE';
        console.log(`   Order: ${order._id} | User: ${userName} | Store: ${storeName}`);
    });

    console.log('\n🎉 Unified Seeding & Verification Completed!');
}

if (require.main === module) {
    connectDatabase()
        .then(() => seedUnified())
        .then(() => {
            console.log('👋 Disconnecting...');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Seeding failed:', error);
            process.exit(1);
        });
}

export { seedUnified };
