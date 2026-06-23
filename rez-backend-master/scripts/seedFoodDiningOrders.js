/**
 * Seed Food & Dining Orders for Social Proof Ticker
 * 
 * This script creates dummy orders for the Food & Dining category
 * to populate the social proof ticker that shows "X just ordered from Y"
 * 
 * IMPORTANT: This script does NOT delete any existing data
 * 
 * Run from rez-backend folder: node scripts/seedFoodDiningOrders.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };
const DB_NAME = process.env.DB_NAME || 'test';

// Sample user names for realistic display
const SAMPLE_NAMES = [
    'Rahul M',
    'Priya S',
    'Amit K',
    'Sneha R',
    'Vikram P',
    'Anjali D',
    'Rohan G',
    'Neha T',
    'Arjun B',
    'Kavya N'
];

async function seedFoodDiningOrders() {
    try {
        console.log('\n╔════════════════════════════════════════════════════════════╗');
        console.log('║                                                            ║');
        console.log('║   🍕 SEED FOOD & DINING ORDERS FOR SOCIAL PROOF          ║');
        console.log('║                                                            ║');
        console.log('╚════════════════════════════════════════════════════════════╝\n');

        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI, {
            dbName: DB_NAME,
        });
        console.log('✅ Connected to MongoDB\n');

        // Load models using ts-node - path relative to project root
        console.log('📦 Loading models...');
        require('ts-node/register');

        // Use absolute path from project root (one level up from scripts folder)
        const projectRoot = path.resolve(__dirname, '..');

        // Import with proper named exports (matching how seed-test-order.js does it)
        const { Category } = require(path.join(projectRoot, 'src/models/Category'));
        const { Store } = require(path.join(projectRoot, 'src/models/Store'));
        const { User } = require(path.join(projectRoot, 'src/models/User'));
        const { Order } = require(path.join(projectRoot, 'src/models/Order'));
        const { Product } = require(path.join(projectRoot, 'src/models/Product'));

        console.log('✅ Models loaded\n');

        // Step 1: Find the Food & Dining category
        console.log('🔍 Finding Food & Dining category...');
        const foodCategory = await Category.findOne({
            slug: 'food-dining',
            isActive: true
        });

        if (!foodCategory) {
            console.log('❌ Food & Dining category not found!');
            console.log('   Looking for alternatives...');

            const categories = await Category.find({ isActive: true }).select('name slug');
            console.log('   Available categories:', categories.map(c => c.slug).join(', '));
            process.exit(1);
        }

        console.log('✅ Found category:', foodCategory.name, '(ID:', foodCategory._id, ')');

        // Step 2: Find stores in Food & Dining category
        console.log('\n🔍 Finding stores in Food & Dining category...');
        let stores = await Store.find({
            category: foodCategory._id,
            isActive: true
        }).limit(10);

        if (stores.length === 0) {
            // Try finding by parentCategory
            const childCategories = await Category.find({ parentCategory: foodCategory._id });
            if (childCategories.length > 0) {
                const childCategoryIds = childCategories.map(c => c._id);
                stores = await Store.find({
                    category: { $in: [...childCategoryIds, foodCategory._id] },
                    isActive: true
                }).limit(10);
            }
        }

        if (stores.length === 0) {
            // Find any stores with food-related tags
            stores = await Store.find({
                $or: [
                    { tags: { $in: ['food', 'restaurant', 'dining', 'cafe', 'biryani', 'pizza'] } },
                    { name: { $regex: /restaurant|cafe|food|kitchen|biryani|pizza/i } }
                ],
                isActive: true
            }).limit(10);
        }

        if (stores.length === 0) {
            console.log('⚠️  No food stores found! Using any available stores...');
            stores = await Store.find({ isActive: true }).limit(10);
        }

        if (stores.length === 0) {
            console.log('❌ No stores found at all! Please ensure stores are seeded first.');
            process.exit(1);
        }

        console.log(`✅ Found ${stores.length} stores:`, stores.map(s => s.name).join(', '));

        // Step 3: Find products in this category
        console.log('\n🔍 Finding products in Food & Dining category...');
        let products = await Product.find({
            category: foodCategory._id,
            isActive: true
        }).limit(10);

        if (products.length === 0) {
            // Try child categories
            const childCategories = await Category.find({ parentCategory: foodCategory._id });
            if (childCategories.length > 0) {
                const childCategoryIds = childCategories.map(c => c._id);
                products = await Product.find({
                    category: { $in: [...childCategoryIds, foodCategory._id] },
                    isActive: true
                }).limit(10);
            }
        }

        if (products.length === 0) {
            console.log('⚠️  No products found, will use placeholder product IDs');
        } else {
            console.log(`✅ Found ${products.length} products`);
        }

        // Step 4: Find existing users (we'll assign orders to them)
        console.log('\n🔍 Finding existing users...');
        const users = await User.find({ isActive: { $ne: false } }).limit(10);

        if (users.length === 0) {
            console.log('⚠️  No users found! Will create orders with placeholder user IDs...');
        } else {
            console.log(`✅ Found ${users.length} users`);
        }

        // Step 5: Check existing food orders
        const existingOrderCount = await Order.countDocuments();
        console.log(`\n📊 Total existing orders in DB: ${existingOrderCount}`);

        // Step 6: Create new orders with varied timestamps
        console.log('\n📦 Creating dummy orders for social proof ticker...\n');

        const ordersToCreate = [];
        const now = Date.now();

        for (let i = 0; i < 10; i++) {
            // Randomize timestamps from 1 minute to 2 hours ago
            const minutesAgo = Math.floor(Math.random() * 120) + 1;
            const orderTime = new Date(now - minutesAgo * 60 * 1000);

            // Pick random store and product
            const store = stores[i % stores.length];
            const product = products.length > 0 ? products[i % products.length] : null;
            const user = users.length > 0 ? users[i % users.length] : null;

            // Get user name for display
            let userName = SAMPLE_NAMES[i];
            if (user) {
                const firstName = user.profile?.firstName || user.name?.split(' ')[0];
                const lastInitial = (user.profile?.lastName || user.name?.split(' ')[1] || '')[0];
                if (firstName) {
                    userName = lastInitial ? `${firstName} ${lastInitial}` : firstName;
                }
            }

            const orderNumber = `ORD${Date.now()}${String(i + 1).padStart(4, '0')}`;
            const itemPrice = Math.floor(Math.random() * 500) + 199;

            const orderData = {
                orderNumber,
                user: user?._id || new mongoose.Types.ObjectId(),
                items: [{
                    product: product?._id || new mongoose.Types.ObjectId(),
                    store: store._id,
                    name: product?.name || `Delicious Food Item ${i + 1}`,
                    quantity: Math.floor(Math.random() * 3) + 1,
                    price: itemPrice,
                    subtotal: itemPrice,
                    image: product?.images?.[0] || 'https://via.placeholder.com/150'
                }],
                totals: {
                    subtotal: itemPrice,
                    tax: Math.round(itemPrice * 0.05),
                    delivery: 40,
                    discount: 0,
                    cashback: Math.round(itemPrice * 0.05),
                    total: itemPrice + Math.round(itemPrice * 0.05) + 40,
                    paidAmount: itemPrice + Math.round(itemPrice * 0.05) + 40
                },
                payment: {
                    method: 'razorpay',
                    status: 'paid',
                    transactionId: `TXN${Date.now()}${i}`
                },
                delivery: {
                    method: 'standard',
                    status: 'delivered',
                    address: {
                        name: userName,
                        phone: '+919999999999',
                        addressLine1: 'Sample Address',
                        city: 'Mumbai',
                        state: 'Maharashtra',
                        pincode: '400001',
                        country: 'India',
                        addressType: 'home'
                    },
                    deliveryFee: 40,
                    estimatedDelivery: orderTime,
                    actualDelivery: orderTime
                },
                timeline: [
                    {
                        status: 'placed',
                        message: 'Order placed',
                        timestamp: new Date(orderTime.getTime() - 30 * 60 * 1000)
                    },
                    {
                        status: 'confirmed',
                        message: 'Order confirmed',
                        timestamp: new Date(orderTime.getTime() - 25 * 60 * 1000)
                    },
                    {
                        status: 'processing',
                        message: 'Preparing your order',
                        timestamp: new Date(orderTime.getTime() - 15 * 60 * 1000)
                    },
                    {
                        status: 'delivered',
                        message: 'Order delivered',
                        timestamp: orderTime
                    }
                ],
                status: 'delivered',
                createdAt: orderTime,
                updatedAt: orderTime
            };

            ordersToCreate.push(orderData);
            console.log(`   📝 Order ${i + 1}: ${userName} ordered from ${store.name} (${minutesAgo}m ago)`);
        }

        // Insert all orders
        console.log('\n💾 Saving orders to database...');
        const createdOrders = await Order.insertMany(ordersToCreate);
        console.log(`✅ Created ${createdOrders.length} orders successfully!`);

        // Verify the data
        console.log('\n🔍 Verifying recent orders endpoint would return...');
        const recentOrders = await Order.aggregate([
            { $sort: { createdAt: -1 } },
            { $limit: 5 },
            {
                $lookup: {
                    from: 'users',
                    localField: 'user',
                    foreignField: '_id',
                    as: 'userInfo'
                }
            },
            {
                $lookup: {
                    from: 'stores',
                    localField: 'items.store',
                    foreignField: '_id',
                    as: 'storeInfo'
                }
            },
            {
                $project: {
                    _id: 1,
                    userName: { $arrayElemAt: ['$userInfo.name', 0] },
                    storeName: { $arrayElemAt: ['$storeInfo.name', 0] },
                    createdAt: 1
                }
            }
        ]);

        console.log('\n📊 Sample recent orders for ticker:');
        console.log('─'.repeat(60));
        recentOrders.forEach((order, idx) => {
            const minutesAgo = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000);
            const name = order.userName?.split(' ')[0] || SAMPLE_NAMES[idx] || 'Someone';
            console.log(`   ${idx + 1}. ${name} ordered from ${order.storeName || 'a restaurant'} (${minutesAgo}m ago)`);
        });
        console.log('─'.repeat(60));

        console.log('\n╔════════════════════════════════════════════════════════════╗');
        console.log('║                                                            ║');
        console.log('║   ✅ SUCCESS! FOOD & DINING ORDERS SEEDED!                ║');
        console.log('║                                                            ║');
        console.log('╚════════════════════════════════════════════════════════════╝\n');

        console.log('🔄 NEXT STEPS:');
        console.log('─'.repeat(60));
        console.log('1. Refresh the Food & Dining category page');
        console.log('2. You should see the social proof ticker showing recent orders');
        console.log('3. The ticker will rotate through orders every 4 seconds');
        console.log('─'.repeat(60));

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 Disconnected from MongoDB\n');
    }
}

seedFoodDiningOrders();
