/**
 * Database Inspector Script
 * Prints a summary of the current database state to the console.
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

async function checkDatabase() {
    console.log('🔍 Inspecting Database...\n');

    try {
        // 1. Counts
        const userCount = await User.countDocuments();
        const storeCount = await Store.countDocuments();
        const productCount = await Product.countDocuments();
        const orderCount = await Order.countDocuments();
        const categoryCount = await Category.countDocuments();

        console.log('📊 Statistics:');
        console.log(`   Users:      ${userCount}`);
        console.log(`   Stores:     ${storeCount}`);
        console.log(`   Products:   ${productCount}`);
        console.log(`   Orders:     ${orderCount}`);
        console.log(`   Categories: ${categoryCount}`);
        console.log('-------------------------------------------');

        // 2. Sample Orders (to check relationships)
        console.log('\n📝 Recent Orders (checking links):');
        const recentOrders = await Order.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('user', 'name email')
            .populate('items.store', 'name slug');

        if (recentOrders.length === 0) {
            console.log('   No orders found.');
        }

        recentOrders.forEach(order => {
            const user = order.user as any;
            const store = order.items[0]?.store as any; // Assuming single item for simplicity

            console.log(`   Order ID: ${order._id}`);
            console.log(`     User:  ${user ? `${user.name} (${user.email})` : '❌ MISSING (orphaned)'}`);
            console.log(`     Store: ${store ? `${store.name} (${store.slug})` : '❌ MISSING (orphaned)'}`);
            console.log(`     Total: ₹${order.totals.total}`);
            console.log(`     Date:  ${order.createdAt.toISOString()}`);
            console.log('');
        });

        // 3. Sample Stores
        console.log('🏪 Sample Stores:');
        const stores = await Store.find().limit(3).select('name slug category');
        stores.forEach(s => {
            console.log(`   - ${s.name} (Slug: ${s.slug}, CatID: ${s.category})`);
        });

    } catch (error) {
        console.error('❌ Error inspecting DB:', error);
    }
}

// Run if executed directly
if (require.main === module) {
    connectDatabase()
        .then(() => checkDatabase())
        .then(() => {
            console.log('\n✅ Inspection complete.');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Connection failed:', error);
            process.exit(1);
        });
}
