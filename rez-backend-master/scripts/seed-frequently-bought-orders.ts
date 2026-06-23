/**
 * Seed script to create test orders for "Frequently Bought Together" feature
 * This creates completed orders with multiple products to generate co-occurrence data
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const MONGODB_URI = process.env.MONGODB_URI || '';
const DB_NAME = process.env.DB_NAME || 'test';

// Order Schema (simplified for seeding)
const orderSchema = new mongoose.Schema({
  orderNumber: { type: String, unique: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  store: { type: mongoose.Schema.Types.ObjectId, ref: 'Store' },
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    quantity: Number,
    price: Number,
    name: String
  }],
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'completed', 'cancelled'],
    default: 'completed'
  },
  totalAmount: Number,
  paymentStatus: { type: String, default: 'paid' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Generate unique order number
function generateOrderNumber(index: number): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `FBT-${timestamp}-${random}-${index}`;
}

async function seedFrequentlyBoughtOrders() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
    console.log('✅ Connected to MongoDB');

    // Get Product model
    const Product = mongoose.model('Product', new mongoose.Schema({}, { strict: false }), 'products');

    // Get or create Order model
    let Order;
    try {
      Order = mongoose.model('Order');
    } catch {
      Order = mongoose.model('Order', orderSchema, 'orders');
    }

    // Get User model to find a test user
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }), 'users');

    // Fetch products grouped by store
    console.log('\n📦 Fetching products...');
    const products = await Product.find({ isActive: true })
      .limit(50)
      .lean();

    if (products.length < 2) {
      console.log('❌ Not enough products found to create orders');
      return;
    }

    console.log(`✅ Found ${products.length} products`);

    // Group products by store
    const productsByStore = new Map<string, any[]>();
    products.forEach((product: any) => {
      const storeId = product.store?.toString() || product.storeId?.toString();
      if (storeId) {
        if (!productsByStore.has(storeId)) {
          productsByStore.set(storeId, []);
        }
        productsByStore.get(storeId)!.push(product);
      }
    });

    console.log(`📊 Products grouped into ${productsByStore.size} stores`);

    // Get a test user (or create fake user IDs)
    const testUser = await User.findOne().lean();
    const testUserId = testUser?._id || new mongoose.Types.ObjectId();

    // Create orders for each store with multiple products
    const ordersToCreate: any[] = [];
    let orderCount = 0;

    productsByStore.forEach((storeProducts, storeId) => {
      if (storeProducts.length >= 2) {
        // Create multiple orders with different product combinations
        const numOrders = Math.min(10, Math.floor(storeProducts.length / 2) * 3);

        for (let i = 0; i < numOrders; i++) {
          // Randomly select 2-4 products for this order
          const shuffled = [...storeProducts].sort(() => Math.random() - 0.5);
          const numProducts = Math.min(2 + Math.floor(Math.random() * 3), shuffled.length);
          const selectedProducts = shuffled.slice(0, numProducts);

          const items = selectedProducts.map((product: any) => ({
            product: product._id,
            quantity: 1 + Math.floor(Math.random() * 2),
            price: product.pricing?.selling || product.price?.current || product.price || 100,
            name: product.name || product.title || 'Product'
          }));

          const totalAmount = items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);

          // Create order with random date in last 30 days
          const daysAgo = Math.floor(Math.random() * 30);
          const orderDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

          ordersToCreate.push({
            orderNumber: generateOrderNumber(orderCount),
            user: testUserId,
            store: new mongoose.Types.ObjectId(storeId),
            items,
            status: Math.random() > 0.3 ? 'completed' : 'delivered',
            totalAmount,
            paymentStatus: 'paid',
            createdAt: orderDate,
            updatedAt: orderDate
          });

          orderCount++;
        }
      }
    });

    console.log(`\n📝 Creating ${ordersToCreate.length} test orders...`);

    // Insert orders in batches
    if (ordersToCreate.length > 0) {
      const result = await Order.insertMany(ordersToCreate);
      console.log(`✅ Created ${result.length} orders successfully`);

      // Log some sample order info
      console.log('\n📋 Sample orders created:');
      result.slice(0, 3).forEach((order: any, index: number) => {
        console.log(`  Order ${index + 1}: ${order.items.length} products, Total: ₹${order.totalAmount}, Status: ${order.status}`);
      });
    }

    // Print summary of product co-occurrences
    console.log('\n📊 Product co-occurrence summary:');
    const coOccurrences = new Map<string, number>();
    ordersToCreate.forEach(order => {
      const productIds = order.items.map((item: any) => item.product.toString());
      // Count pairs
      for (let i = 0; i < productIds.length; i++) {
        for (let j = i + 1; j < productIds.length; j++) {
          const pair = [productIds[i], productIds[j]].sort().join('-');
          coOccurrences.set(pair, (coOccurrences.get(pair) || 0) + 1);
        }
      }
    });

    const topPairs = Array.from(coOccurrences.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    console.log('  Top product pairs bought together:');
    topPairs.forEach(([pair, count], index) => {
      console.log(`    ${index + 1}. Pair appears in ${count} orders`);
    });

    console.log('\n✅ Seeding completed! FrequentlyBoughtTogether should now work.');

  } catch (error) {
    console.error('❌ Error seeding orders:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the script
seedFrequentlyBoughtOrders();
