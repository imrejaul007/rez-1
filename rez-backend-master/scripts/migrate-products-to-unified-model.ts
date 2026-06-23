import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Import models
import { User, Product, Store } from '../src/models';

const TARGET_MERCHANT_EMAIL = 'mukulraj756@gmail.com';
const TARGET_STORE_NAMES = ['hhhhhhhhhhhhhf', 'Mukul Test Business'];

async function migrateProductsToUnifiedModel() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    const dbName = process.env.DB_NAME || 'test';

    if (!mongoUri) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri, {
      dbName,
    });
    console.log('✅ Connected to MongoDB');

    // Step 1: Find the merchant user
    console.log(`\n👤 Finding merchant with email: ${TARGET_MERCHANT_EMAIL}...`);
    const merchantUser = await User.findOne({ 
      $or: [
        { 'profile.email': TARGET_MERCHANT_EMAIL },
        { email: TARGET_MERCHANT_EMAIL }
      ]
    }).lean();

    if (!merchantUser) {
      throw new Error(`Merchant user with email ${TARGET_MERCHANT_EMAIL} not found`);
    }

    const merchantId = merchantUser._id.toString();
    console.log(`✅ Found merchant: ${merchantId}`);
    console.log(`   Name: ${merchantUser.profile?.firstName || ''} ${merchantUser.profile?.lastName || ''}`);

    // Step 2: Find the target stores
    console.log(`\n🏪 Finding stores: ${TARGET_STORE_NAMES.join(', ')}...`);
    const stores = await Store.find({
      name: { $in: TARGET_STORE_NAMES },
      merchantId: merchantId
    }).lean();

    if (stores.length === 0) {
      throw new Error(`No stores found with names: ${TARGET_STORE_NAMES.join(', ')}`);
    }

    console.log(`✅ Found ${stores.length} stores:`);
    stores.forEach((store, idx) => {
      console.log(`   ${idx + 1}. ${store.name} (ID: ${store._id})`);
    });

    const storeIds = stores.map(s => s._id.toString());

    // Step 3: Check for MProduct collection and get products
    console.log('\n📦 Checking for products in mproducts collection...');
    const mProductsCollection = mongoose.connection.collection('mproducts');
    const mProductsCount = await mProductsCollection.countDocuments();
    console.log(`   Found ${mProductsCount} products in mproducts collection`);

    // Step 4: Get all products from mproducts
    const mProducts = await mProductsCollection.find({}).toArray();
    console.log(`\n📋 Processing ${mProducts.length} products from mproducts...`);

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const mProduct of mProducts) {
      try {
        // Check if product already exists in products collection
        const existingProduct = await Product.findOne({
          $or: [
            { _id: mProduct._id },
            { sku: mProduct.sku, merchantId: merchantId }
          ]
        });

        if (existingProduct) {
          console.log(`   ⏭️  Skipping ${mProduct.name} - Already exists in products`);
          skippedCount++;
          continue;
        }

        // Determine which store this product belongs to
        let productStoreId = mProduct.storeId || mProduct.store;
        
        // If no store assigned, assign to first store
        if (!productStoreId) {
          productStoreId = storeIds[0];
          console.log(`   ℹ️  Assigning ${mProduct.name} to default store: ${stores[0].name}`);
        }

        // Map MProduct to Product schema
        const productData = {
          _id: mProduct._id, // Preserve the ID
          name: mProduct.name,
          slug: mProduct.slug || mProduct.name.toLowerCase().replace(/\s+/g, '-'),
          description: mProduct.description || '',
          shortDescription: mProduct.shortDescription || '',
          sku: mProduct.sku || `SKU-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          barcode: mProduct.barcode,
          category: mProduct.category,
          subcategory: mProduct.subcategory,
          brand: mProduct.brand,
          storeId: new mongoose.Types.ObjectId(productStoreId),
          merchantId: merchantId,
          
          // Pricing
          pricing: {
            basePrice: mProduct.price || mProduct.pricing?.basePrice || 0,
            salePrice: mProduct.salePrice || mProduct.pricing?.salePrice,
            costPrice: mProduct.costPrice || mProduct.pricing?.costPrice,
            compareAtPrice: mProduct.compareAtPrice || mProduct.pricing?.compareAtPrice,
            currency: mProduct.currency || 'INR',
            taxRate: mProduct.pricing?.taxRate || 0,
            taxInclusive: mProduct.pricing?.taxInclusive || false
          },

          // Inventory
          inventory: {
            quantity: mProduct.inventory?.stock || mProduct.inventory?.quantity || 0,
            sku: mProduct.sku,
            trackInventory: mProduct.inventory?.trackInventory !== false,
            allowBackorder: mProduct.inventory?.allowBackorders || mProduct.inventory?.allowBackorder || false,
            lowStockThreshold: mProduct.inventory?.lowStockThreshold || 5,
            stockStatus: mProduct.inventory?.stock > 0 ? 'in_stock' : 'out_of_stock'
          },

          // Images
          images: mProduct.images || [],

          // Dimensions
          weight: mProduct.weight,
          dimensions: mProduct.dimensions,

          // SEO
          seo: {
            metaTitle: mProduct.metaTitle || mProduct.name,
            metaDescription: mProduct.metaDescription || mProduct.shortDescription,
            keywords: mProduct.searchKeywords || []
          },

          // Status
          status: mProduct.status || 'active',
          visibility: mProduct.visibility || 'public',
          featured: mProduct.featured || false,

          // Tags
          tags: mProduct.tags || [],

          // Cashback
          cashback: {
            percentage: mProduct.cashback?.percentage || 0,
            maxAmount: mProduct.cashback?.maxAmount || 0,
            isActive: mProduct.cashback?.isActive !== false
          },

          // Ratings
          ratings: {
            average: mProduct.ratings?.average || 0,
            count: mProduct.ratings?.count || 0,
            distribution: mProduct.ratings?.distribution || { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
          },

          // Analytics
          analytics: mProduct.analytics || {
            views: 0,
            purchases: 0,
            addedToCart: 0,
            addedToWishlist: 0,
            revenue: 0
          },

          // Timestamps
          createdAt: mProduct.createdAt || new Date(),
          updatedAt: mProduct.updatedAt || new Date()
        };

        // Create product in products collection
        await Product.create(productData);
        console.log(`   ✅ Migrated: ${mProduct.name} → products collection`);
        migratedCount++;

      } catch (error: any) {
        console.error(`   ❌ Error migrating ${mProduct.name}:`, error.message);
        errorCount++;
      }
    }

    // Step 5: Verification
    console.log('\n🔍 Verifying migration...');
    const productsInMainCollection = await Product.countDocuments({
      merchantId: merchantId,
      storeId: { $in: storeIds.map(id => new mongoose.Types.ObjectId(id)) }
    });

    console.log(`\n📊 Migration Summary:`);
    console.log(`   ✅ Products migrated: ${migratedCount}`);
    console.log(`   ⏭️  Products skipped (already exist): ${skippedCount}`);
    console.log(`   ❌ Products with errors: ${errorCount}`);
    console.log(`   📦 Total products in main collection for merchant: ${productsInMainCollection}`);
    console.log(`   🏪 Linked to stores: ${stores.map(s => s.name).join(', ')}`);

    // Step 6: Show sample products
    console.log('\n📋 Sample migrated products:');
    const sampleProducts = await Product.find({
      merchantId: merchantId
    }).limit(5).lean();

    sampleProducts.forEach((product, idx) => {
      const store = stores.find(s => s._id.toString() === product.storeId.toString());
      console.log(`   ${idx + 1}. ${product.name}`);
      console.log(`      Store: ${store?.name || 'Unknown'}`);
      console.log(`      Price: ₹${product.pricing?.basePrice || 0}`);
      console.log(`      Stock: ${product.inventory?.quantity || 0}`);
      console.log(`      Status: ${product.status}`);
    });

    // Step 7: Backup info
    console.log('\n💡 NOTE: Original products still exist in mproducts collection');
    console.log('   You can safely delete mproducts collection after verification');
    console.log('   Command: db.mproducts.drop()');

    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('\n✅ Migration completed successfully!');
    console.log('👋 Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the migration
migrateProductsToUnifiedModel();

