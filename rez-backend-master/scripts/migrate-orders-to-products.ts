import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rez-app';
const DB_NAME = process.env.DB_NAME || 'test';

async function migrateOrders() {
  try {
    console.log('🔍 Connecting to MongoDB...');
    console.log('📍 Database:', DB_NAME);
    
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI, {
      dbName: DB_NAME,
    });
    
    console.log('✅ Connected to MongoDB\n');
    
    // Import models
    const { Order, Product, Store, MerchantUser, Merchant, User, Category } = await import('../src/models');
    
    // Step 1: Find or create merchant user
    console.log('📧 Step 1: Finding merchant with email: mukulraj756@gmail.com');
    let merchantUser = await MerchantUser.findOne({ 
      email: 'mukulraj756@gmail.com' 
    }).lean();
    
    let merchantId: any;
    
    if (!merchantUser) {
      console.log('⚠️  Merchant user not found. Looking for merchant by ID from store...');
      // Try to find merchant by the merchantId from the store
      const existingStore = await Store.findOne({ 
        name: 'Mukul Test Business' 
      }).lean();
      
      if (existingStore && (existingStore as any).merchantId) {
        merchantId = (existingStore as any).merchantId;
        console.log(`✅ Found merchant ID from store: ${merchantId}`);
        
        // Try to find merchant user by merchantId
        merchantUser = await MerchantUser.findOne({ 
          merchantId: merchantId 
        }).lean();
        
        if (!merchantUser) {
          console.log('⚠️  Merchant user not found. Creating one...');
          // Create merchant user
          const merchant = await Merchant.findById(merchantId).lean();
          if (!merchant) {
            throw new Error(`Merchant with ID ${merchantId} not found. Cannot create merchant user.`);
          }
          
          // Create merchant user
          const newMerchantUser = new MerchantUser({
            merchantId: merchantId,
            email: 'mukulraj756@gmail.com',
            name: 'Mukul Raj',
            role: 'owner',
            status: 'active',
            invitedBy: merchantId, // Self-invited
            invitedAt: new Date(),
            acceptedAt: new Date(),
            failedLoginAttempts: 0,
          });
          
          await newMerchantUser.save();
          merchantUser = newMerchantUser.toObject();
          console.log('✅ Created merchant user');
        }
      } else {
        throw new Error('Cannot find merchant. Please create merchant and store first.');
      }
    } else {
      merchantId = (merchantUser as any).merchantId;
      console.log(`✅ Found merchant user with merchant ID: ${merchantId}`);
    }
    
    // Step 2: Find or get stores for this merchant
    console.log('\n🏪 Step 2: Finding stores for merchant...');
    let stores = await Store.find({ 
      merchantId: merchantId 
    }).lean();
    
    console.log(`✅ Found ${stores.length} store(s) for merchant`);
    stores.forEach((store, index) => {
      console.log(`   ${index + 1}. ${(store as any).name} (ID: ${store._id})`);
    });
    
    // Ensure we have at least 2 stores
    if (stores.length < 2) {
      console.log('⚠️  Less than 2 stores found. Creating additional store...');
      
      // Create a second store
      const newStore = new Store({
        name: stores.length === 0 ? 'Mukul Store 1' : 'Mukul Store 2',
        slug: stores.length === 0 ? 'mukul-store-1' : 'mukul-store-2',
        merchantId: merchantId,
        description: 'Store for merchant mukulraj756@gmail.com',
        location: {
          address: 'Test Address',
          city: 'Test City',
          state: 'Test State',
          pincode: '123456',
        },
        contact: {
          phone: '+918210224305',
          email: 'mukulraj756@gmail.com',
        },
        isActive: true,
      });
      
      await newStore.save();
      stores.push(newStore.toObject());
      console.log(`✅ Created store: ${newStore.name}`);
    }
    
    // Use the two existing stores: "Mukul Test Business" and "hhhhhhhhhhhhhf"
    // Store IDs from the UI: 
    // - "Mukul Test Business": 691ffad7e84b098937ac0b65
    // - "hhhhhhhhhhhhhf": 692016c8ad3a6bb2af9e5e48
    const store1 = stores.find((s: any) => 
      s.name === 'Mukul Test Business' || s._id.toString() === '691ffad7e84b098937ac0b65'
    ) || stores[0];
    const store2 = stores.find((s: any) => 
      s.name === 'hhhhhhhhhhhhhf' || s._id.toString() === '692016c8ad3a6bb2af9e5e48'
    ) || stores[1];
    
    if (!store1 || !store2) {
      throw new Error(`Could not find both stores. Found: ${stores.map((s: any) => s.name).join(', ')}`);
    }
    
    console.log(`\n📦 Store 1: ${(store1 as any).name} (ID: ${store1._id})`);
    console.log(`📦 Store 2: ${(store2 as any).name} (ID: ${store2._id})`);
    
    // Step 3: Find or create products for each store
    console.log('\n📦 Step 3: Finding products for stores...');
    
    // Get a category for products (use first available category)
    const category = await Category.findOne({}).lean();
    if (!category) {
      throw new Error('No category found. Please create a category first.');
    }
    
    // Find products for store 1
    let productsStore1 = await Product.find({ 
      store: store1._id 
    }).lean();
    
    // Find products for store 2
    let productsStore2 = await Product.find({ 
      store: store2._id 
    }).lean();
    
    console.log(`✅ Store 1 has ${productsStore1.length} product(s)`);
    console.log(`✅ Store 2 has ${productsStore2.length} product(s)`);
    
    // Ensure at least 4-5 products in each store (one main product + additional products)
    const productsToCreate = {
      store1: Math.max(0, 5 - productsStore1.length), // At least 5 products in store 1
      store2: Math.max(0, 5 - productsStore2.length), // At least 5 products in store 2
    };
    
    console.log(`\n📦 Need to create ${productsToCreate.store1} products for Store 1`);
    console.log(`📦 Need to create ${productsToCreate.store2} products for Store 2`);
    
    // Create products for store 1
    const store1Name = (store1 as any).name;
    for (let i = 0; i < productsToCreate.store1; i++) {
      const productNum = productsStore1.length + i + 1;
      const productNames = [
        'Premium Product',
        'Standard Product',
        'Basic Product',
        'Deluxe Product',
        'Economy Product',
      ];
      const productName = productNames[i] || `Product ${productNum}`;
      const newProduct = new Product({
        name: `${productName} - ${store1Name}`,
        slug: `${store1Name.toLowerCase().replace(/\s+/g, '-')}-product-${productNum}-${Date.now()}`,
        description: `${productName} available at ${store1Name}`,
        productType: 'product',
        category: category._id,
        store: store1._id,
        sku: `SKU-STORE1-${productNum}-${Date.now()}`,
        images: ['https://via.placeholder.com/150'],
        pricing: {
          original: 1000 + (i * 100),
          selling: 800 + (i * 100),
          currency: 'INR',
        },
        inventory: {
          stock: 100,
          isAvailable: true,
          lowStockThreshold: 10,
          unlimited: false,
        },
        ratings: {
          average: 4.5,
          count: 0,
          distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        },
        specifications: [],
        tags: ['store1', 'product'],
        seo: {
          title: `Product ${productNum} - Store 1`,
          description: `Product ${productNum} for Store 1`,
          keywords: ['product', 'store1'],
        },
        analytics: {
          views: 0,
          purchases: 0,
          conversions: 0,
          wishlistAdds: 0,
          shareCount: 0,
          returnRate: 0,
          avgRating: 4.5,
        },
        isActive: true,
        isFeatured: false,
        isDigital: false,
      });
      
      await newProduct.save();
      productsStore1.push(newProduct.toObject());
      console.log(`✅ Created product for Store 1: ${newProduct.name}`);
    }
    
    // Create products for store 2
    const store2Name = (store2 as any).name;
    for (let i = 0; i < productsToCreate.store2; i++) {
      const productNum = productsStore2.length + i + 1;
      const productNames = [
        'Premium Product',
        'Standard Product',
        'Basic Product',
        'Deluxe Product',
        'Economy Product',
      ];
      const productName = productNames[i] || `Product ${productNum}`;
      const newProduct = new Product({
        name: `${productName} - ${store2Name}`,
        slug: `${store2Name.toLowerCase().replace(/\s+/g, '-')}-product-${productNum}-${Date.now()}`,
        description: `${productName} available at ${store2Name}`,
        productType: 'product',
        category: category._id,
        store: store2._id,
        sku: `SKU-STORE2-${productNum}-${Date.now()}`,
        images: ['https://via.placeholder.com/150'],
        pricing: {
          original: 1000 + (i * 100),
          selling: 800 + (i * 100),
          currency: 'INR',
        },
        inventory: {
          stock: 100,
          isAvailable: true,
          lowStockThreshold: 10,
          unlimited: false,
        },
        ratings: {
          average: 4.5,
          count: 0,
          distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        },
        specifications: [],
        tags: ['store2', 'product'],
        seo: {
          title: `Product ${productNum} - Store 2`,
          description: `Product ${productNum} for Store 2`,
          keywords: ['product', 'store2'],
        },
        analytics: {
          views: 0,
          purchases: 0,
          conversions: 0,
          wishlistAdds: 0,
          shareCount: 0,
          returnRate: 0,
          avgRating: 4.5,
        },
        isActive: true,
        isFeatured: false,
        isDigital: false,
      });
      
      await newProduct.save();
      productsStore2.push(newProduct.toObject());
      console.log(`✅ Created product for Store 2: ${newProduct.name}`);
    }
    
    // Select main products (first product from each store)
    const mainProduct1 = productsStore1[0];
    const mainProduct2 = productsStore2[0];
    
    console.log(`\n✅ Main Product 1: ${(mainProduct1 as any).name} (ID: ${mainProduct1._id})`);
    console.log(`✅ Main Product 2: ${(mainProduct2 as any).name} (ID: ${mainProduct2._id})`);
    
    // Step 4: Link orders to products and stores
    console.log('\n📋 Step 4: Linking orders to products and stores...');
    
    const allOrders = await Order.find({}).lean();
    console.log(`✅ Found ${allOrders.length} orders to migrate`);
    
    // Divide orders: 7 to store1/product1, 8 to store2/product2
    const ordersForStore1 = allOrders.slice(0, 7);
    const ordersForStore2 = allOrders.slice(7, 15);
    
    console.log(`\n📦 Linking ${ordersForStore1.length} orders to Store 1 / Product 1`);
    console.log(`📦 Linking ${ordersForStore2.length} orders to Store 2 / Product 2`);
    
    // Update orders for store 1
    for (const order of ordersForStore1) {
      const orderDoc = await Order.findById(order._id);
      if (!orderDoc) continue;
      
      // Update items to link to product1 and store1
      if (orderDoc.items && orderDoc.items.length > 0) {
        for (const item of orderDoc.items) {
          (item as any).product = mainProduct1._id;
          (item as any).store = store1._id;
          // Update name and image from product if not set
          if (!item.name || item.name === 'Test Product' || item.name === 'Unknown Product') {
            item.name = (mainProduct1 as any).name;
          }
          if (!item.image || item.image === 'https://via.placeholder.com/150') {
            item.image = (mainProduct1 as any).images?.[0] || 'https://via.placeholder.com/150';
          }
        }
      } else {
        // If no items, create one
        orderDoc.items = [{
          product: mainProduct1._id,
          store: store1._id,
          name: (mainProduct1 as any).name,
          image: (mainProduct1 as any).images?.[0] || 'https://via.placeholder.com/150',
          quantity: 1,
          price: (mainProduct1 as any).pricing?.selling || (mainProduct1 as any).price?.selling || 1000,
          subtotal: (mainProduct1 as any).pricing?.selling || (mainProduct1 as any).price?.selling || 1000,
        }];
      }
      
      await orderDoc.save();
      console.log(`✅ Updated order ${orderDoc.orderNumber} → Store 1 / Product 1`);
    }
    
    // Update orders for store 2
    for (const order of ordersForStore2) {
      const orderDoc = await Order.findById(order._id);
      if (!orderDoc) continue;
      
      // Update items to link to product2 and store2
      if (orderDoc.items && orderDoc.items.length > 0) {
        for (const item of orderDoc.items) {
          (item as any).product = mainProduct2._id;
          (item as any).store = store2._id;
          // Update name and image from product if not set
          if (!item.name || item.name === 'Test Product' || item.name === 'Unknown Product') {
            item.name = (mainProduct2 as any).name;
          }
          if (!item.image || item.image === 'https://via.placeholder.com/150') {
            item.image = (mainProduct2 as any).images?.[0] || 'https://via.placeholder.com/150';
          }
        }
      } else {
        // If no items, create one
        orderDoc.items = [{
          product: mainProduct2._id,
          store: store2._id,
          name: (mainProduct2 as any).name,
          image: (mainProduct2 as any).images?.[0] || 'https://via.placeholder.com/150',
          quantity: 1,
          price: (mainProduct2 as any).pricing?.selling || (mainProduct2 as any).price?.selling || 1000,
          subtotal: (mainProduct2 as any).pricing?.selling || (mainProduct2 as any).price?.selling || 1000,
        }];
      }
      
      await orderDoc.save();
      console.log(`✅ Updated order ${orderDoc.orderNumber} → Store 2 / Product 2`);
    }
    
    // Step 5: Verification
    console.log('\n✅ Step 5: Verifying migration...');
    const updatedOrders = await Order.find({})
      .populate('items.product', 'name')
      .populate('items.store', 'name')
      .lean();
    
    const ordersWithProducts = updatedOrders.filter((o: any) => 
      o.items && o.items.some((item: any) => item.product && item.product !== null)
    ).length;
    
    const ordersWithStores = updatedOrders.filter((o: any) => 
      o.items && o.items.some((item: any) => item.store && item.store !== null)
    ).length;
    
    console.log(`\n📊 MIGRATION SUMMARY:`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Total Orders: ${updatedOrders.length}`);
    console.log(`   Orders with products: ${ordersWithProducts}`);
    console.log(`   Orders with stores: ${ordersWithStores}`);
    console.log(`   Store 1: ${(store1 as any).name} (${productsStore1.length} products)`);
    console.log(`   Store 2: ${(store2 as any).name} (${productsStore2.length} products)`);
    console.log(`   Orders linked to Store 1: ${ordersForStore1.length}`);
    console.log(`   Orders linked to Store 2: ${ordersForStore2.length}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('✅ Migration completed successfully!');
    
  } catch (error: any) {
    console.error('❌ Error during migration:', error.message);
    console.error(error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('📤 Disconnected from MongoDB');
  }
}

// Run the migration
migrateOrders();

