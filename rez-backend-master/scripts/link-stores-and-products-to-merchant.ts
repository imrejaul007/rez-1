import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

import { User, Store, Product } from '../src/models';

const TARGET_MERCHANT_EMAIL = 'mukulraj756@gmail.com';
const TARGET_STORE_IDS = ['692016c8ad3a6bb2af9e5e48', '691ffad7e84b098937ac0b65'];

async function linkStoresAndProductsToMerchant() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    const dbName = process.env.DB_NAME || 'test';

    if (!mongoUri) {
      throw new Error('MONGODB_URI is not defined');
    }

    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri, { dbName });
    console.log('✅ Connected');

    // Find the target merchant
    const merchantUser = await User.findOne({
      $or: [
        { 'profile.email': TARGET_MERCHANT_EMAIL },
        { email: TARGET_MERCHANT_EMAIL }
      ]
    }).lean();

    if (!merchantUser) {
      throw new Error(`Merchant not found: ${TARGET_MERCHANT_EMAIL}`);
    }

    const newMerchantId = merchantUser._id.toString();
    console.log(`\n👤 Target Merchant: ${merchantUser.profile?.firstName || ''} ${merchantUser.profile?.lastName || ''}`);
    console.log(`   Email: ${TARGET_MERCHANT_EMAIL}`);
    console.log(`   ID: ${newMerchantId}`);

    // Step 1: Update stores to link to the correct merchant
    console.log(`\n🏪 Linking stores to merchant...`);
    const updateResult = await Store.updateMany(
      { _id: { $in: TARGET_STORE_IDS.map(id => new mongoose.Types.ObjectId(id)) } },
      { $set: { merchantId: newMerchantId } }
    );

    console.log(`✅ Updated ${updateResult.modifiedCount} stores`);

    // Get the updated stores
    const stores = await Store.find({
      _id: { $in: TARGET_STORE_IDS.map(id => new mongoose.Types.ObjectId(id)) }
    }).lean();

    console.log(`\nStores linked:`);
    stores.forEach((store, idx) => {
      console.log(`   ${idx + 1}. ${store.name} (ID: ${store._id})`);
    });

    // Step 2: Migrate products from mproducts to products collection
    console.log(`\n📦 Migrating products from mproducts...`);
    const mProductsCollection = mongoose.connection.collection('mproducts');
    const mProducts = await mProductsCollection.find({}).toArray();
    
    console.log(`   Found ${mProducts.length} products in mproducts`);

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const mProduct of mProducts) {
      try {
        // Check if already exists
        const exists = await Product.findOne({
          $or: [
            { _id: mProduct._id },
            { sku: mProduct.sku, merchantId: newMerchantId }
          ]
        });

        if (exists) {
          skippedCount++;
          continue;
        }

        // Determine store - distribute evenly between the two stores
        const storeIndex = migratedCount % stores.length;
        const assignedStore = stores[storeIndex];

        // Extract price info
        const price = mProduct.price || mProduct.pricing?.basePrice || mProduct.pricing?.selling || 0;
        const originalPrice = mProduct.pricing?.original || mProduct.compareAtPrice || price;
        const sellingPrice = mProduct.pricing?.selling || mProduct.pricing?.basePrice || mProduct.salePrice || price;

        // Extract images - handle both array and string formats
        let imageUrls: string[] = [];
        if (Array.isArray(mProduct.images)) {
          imageUrls = mProduct.images.map((img: any) => {
            if (typeof img === 'string') return img;
            if (img && img.url) return img.url;
            return 'https://via.placeholder.com/300';
          });
        }
        if (imageUrls.length === 0) {
          imageUrls = ['https://via.placeholder.com/300'];
        }

        // Get or create default category
        let categoryId = mProduct.category;
        if (typeof categoryId === 'string' && !mongoose.Types.ObjectId.isValid(categoryId)) {
          // If category is a string name, try to find it or use a default
          const Category = mongoose.model('Category');
          let category = await Category.findOne({ name: { $regex: new RegExp(categoryId, 'i') } });
          if (!category) {
            // Create a default category
            category = await Category.create({
              name: 'General',
              slug: 'general',
              description: 'General products',
              isActive: true
            });
          }
          categoryId = category._id;
        }

        // Create unique slug
        let slug = mProduct.slug || mProduct.name.toLowerCase().replace(/\s+/g, '-');
        slug = `${slug}-${mProduct._id.toString().slice(-6)}`; // Make unique

        // Create product data matching Product schema
        const productData = {
          _id: mProduct._id,
          name: mProduct.name,
          slug: slug,
          description: mProduct.description || 'No description available',
          shortDescription: mProduct.shortDescription || mProduct.description?.substring(0, 200) || 'No description',
          sku: mProduct.sku || `SKU-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          barcode: mProduct.barcode,
          category: categoryId,
          store: assignedStore._id, // 'store' not 'storeId'
          brand: mProduct.brand,
          
          pricing: {
            original: originalPrice,
            selling: sellingPrice,
            discount: mProduct.pricing?.discount || 0,
            currency: mProduct.currency || 'INR'
          },

          inventory: {
            stock: mProduct.inventory?.stock || mProduct.inventory?.quantity || 10, // Default to 10
            isAvailable: true,
            lowStockThreshold: mProduct.inventory?.lowStockThreshold || 5
          },

          images: imageUrls,
          tags: mProduct.tags || [],
          
          cashback: {
            percentage: mProduct.cashback?.percentage || 5,
            maxAmount: mProduct.cashback?.maxAmount || 100
          },

          isActive: mProduct.status === 'active',
          isFeatured: mProduct.featured || false,

          createdAt: mProduct.createdAt || new Date(),
          updatedAt: mProduct.updatedAt || new Date()
        };

        await Product.create(productData);
        console.log(`   ✅ ${mProduct.name} → ${assignedStore.name}`);
        migratedCount++;

      } catch (error: any) {
        console.error(`   ❌ Error: ${mProduct.name} - ${error.message}`);
        errorCount++;
      }
    }

    // Step 3: Verification
    console.log(`\n📊 Migration Summary:`);
    console.log(`   ✅ Products migrated: ${migratedCount}`);
    console.log(`   ⏭️  Products skipped: ${skippedCount}`);
    console.log(`   ❌ Products with errors: ${errorCount}`);

    const totalProducts = await Product.countDocuments({
      store: { $in: stores.map(s => s._id) }
    });
    console.log(`   📦 Total products for these stores: ${totalProducts}`);

    // Show distribution
    console.log(`\n📍 Product distribution:`);
    for (const store of stores) {
      const count = await Product.countDocuments({
        store: store._id
      });
      console.log(`   ${store.name}: ${count} products`);
      
      // Show sample products
      const sampleProducts = await Product.find({ store: store._id }).limit(3).lean();
      sampleProducts.forEach((p: any) => {
        console.log(`      • ${p.name} (₹${p.pricing?.selling || 0})`);
      });
    }

    await mongoose.disconnect();
    console.log('\n✅ Migration completed!');
    console.log('👋 Disconnected');
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

linkStoresAndProductsToMerchant();

