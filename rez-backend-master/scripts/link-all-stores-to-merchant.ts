import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

import { User, Store, Product } from '../src/models';

const TARGET_MERCHANT_EMAIL = 'mukulraj756@gmail.com';

async function linkAllStoresToMerchant() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    const dbName = process.env.DB_NAME || 'test';

    if (!mongoUri) {
      throw new Error('MONGODB_URI is not defined');
    }

    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri, { dbName });
    console.log('✅ Connected');

    // Find target merchant
    const merchantUser = await User.findOne({
      $or: [
        { 'profile.email': TARGET_MERCHANT_EMAIL },
        { email: TARGET_MERCHANT_EMAIL }
      ]
    }).lean();

    if (!merchantUser) {
      throw new Error(`Merchant not found: ${TARGET_MERCHANT_EMAIL}`);
    }

    const merchantId = merchantUser._id.toString();
    console.log(`\n👤 Target Merchant: ${merchantUser.profile?.firstName || ''} ${merchantUser.profile?.lastName || ''}`);
    console.log(`   Email: ${TARGET_MERCHANT_EMAIL}`);
    console.log(`   ID: ${merchantId}`);

    // Get all stores
    const allStores = await Store.find({}).lean();
    console.log(`\n🏪 Found ${allStores.length} total stores in database`);

    // Find stores with invalid/missing merchants
    const storesWithInvalidMerchant = [];
    const validMerchantIds = new Set();

    for (const store of allStores) {
      if (!store.merchantId) {
        storesWithInvalidMerchant.push(store);
      } else {
        const merchantExists = await User.findById(store.merchantId).lean();
        if (!merchantExists) {
          storesWithInvalidMerchant.push(store);
        } else {
          validMerchantIds.add(store.merchantId.toString());
        }
      }
    }

    console.log(`\n📊 Store Analysis:`);
    console.log(`   Total stores: ${allStores.length}`);
    console.log(`   Stores with valid merchants: ${allStores.length - storesWithInvalidMerchant.length}`);
    console.log(`   Stores without valid merchants: ${storesWithInvalidMerchant.length}`);
    console.log(`   Unique valid merchants: ${validMerchantIds.size}`);

    if (storesWithInvalidMerchant.length === 0) {
      console.log('\n✅ All stores already have valid merchants!');
      console.log(`\n💡 Linking ALL ${allStores.length} stores to your account...`);
      
      // Link all stores
      const updateResult = await Store.updateMany(
        {},
        { $set: { merchantId: merchantId } }
      );
      console.log(`✅ Updated ${updateResult.modifiedCount} stores`);
    } else {
      console.log(`\n🔄 Linking ${storesWithInvalidMerchant.length} stores without valid merchants...`);
      
      const storeIds = storesWithInvalidMerchant.map(s => s._id);
      const updateResult = await Store.updateMany(
        { _id: { $in: storeIds } },
        { $set: { merchantId: merchantId } }
      );
      console.log(`✅ Updated ${updateResult.modifiedCount} stores`);

      // Ask if user wants to link ALL stores
      console.log(`\n❓ There are ${allStores.length - storesWithInvalidMerchant.length} stores with valid merchants.`);
      console.log(`   Do you want to link ALL stores to your account?`);
      console.log(`   Running migration for ALL stores...`);
      
      const updateAllResult = await Store.updateMany(
        {},
        { $set: { merchantId: merchantId } }
      );
      console.log(`✅ Updated ${updateAllResult.modifiedCount} additional stores`);
    }

    // Get updated store list
    const linkedStores = await Store.find({ merchantId: merchantId }).lean();
    console.log(`\n📦 Total stores now linked to your account: ${linkedStores.length}`);

    // Migrate products from mproducts
    console.log(`\n📦 Migrating products from mproducts...`);
    const mProductsCollection = mongoose.connection.collection('mproducts');
    const mProducts = await mProductsCollection.find({}).toArray();
    
    console.log(`   Found ${mProducts.length} products in mproducts`);

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // Get category helper
    const Category = mongoose.model('Category');
    const getOrCreateCategory = async (categoryName: string) => {
      if (mongoose.Types.ObjectId.isValid(categoryName)) {
        return new mongoose.Types.ObjectId(categoryName);
      }
      
      let category = await Category.findOne({ 
        name: { $regex: new RegExp(`^${categoryName}$`, 'i') } 
      });
      
      if (!category) {
        category = await Category.create({
          name: categoryName || 'General',
          slug: (categoryName || 'general').toLowerCase().replace(/\s+/g, '-'),
          description: `${categoryName} products`,
          isActive: true
        });
      }
      
      return category._id;
    };

    for (let i = 0; i < mProducts.length; i++) {
      const mProduct = mProducts[i];
      
      try {
        // Check if already exists
        const exists = await Product.findById(mProduct._id);
        if (exists) {
          skippedCount++;
          continue;
        }

        // Assign to store (distribute evenly)
        const storeIndex = i % linkedStores.length;
        const assignedStore = linkedStores[storeIndex];

        // Extract price info
        const price = mProduct.price || mProduct.pricing?.basePrice || mProduct.pricing?.selling || 100;
        const originalPrice = mProduct.pricing?.original || mProduct.compareAtPrice || price;
        const sellingPrice = mProduct.pricing?.selling || mProduct.pricing?.basePrice || mProduct.salePrice || price;

        // Extract images
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

        // Get category
        const categoryId = await getOrCreateCategory(mProduct.category || 'General');

        // Create unique slug
        let slug = mProduct.slug || mProduct.name.toLowerCase().replace(/\s+/g, '-');
        slug = `${slug}-${mProduct._id.toString().slice(-6)}`;

        // Create product
        const productData = {
          _id: mProduct._id,
          name: mProduct.name,
          slug: slug,
          description: mProduct.description || 'No description available',
          shortDescription: mProduct.shortDescription || mProduct.description?.substring(0, 200) || 'No description',
          sku: mProduct.sku || `SKU-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          barcode: mProduct.barcode,
          category: categoryId,
          store: assignedStore._id,
          brand: mProduct.brand,
          
          pricing: {
            original: originalPrice,
            selling: sellingPrice,
            discount: mProduct.pricing?.discount || 0,
            currency: mProduct.currency || 'INR'
          },

          inventory: {
            stock: mProduct.inventory?.stock || mProduct.inventory?.quantity || 10,
            isAvailable: true,
            lowStockThreshold: mProduct.inventory?.lowStockThreshold || 5
          },

          images: imageUrls,
          tags: mProduct.tags || [],
          
          cashback: {
            percentage: mProduct.cashback?.percentage || 5,
            maxAmount: mProduct.cashback?.maxAmount || 100
          },

          isActive: mProduct.status === 'active' || mProduct.status === undefined,
          isFeatured: mProduct.featured || false,

          createdAt: mProduct.createdAt || new Date(),
          updatedAt: mProduct.updatedAt || new Date()
        };

        await Product.create(productData);
        migratedCount++;
        
        if (migratedCount % 10 === 0) {
          console.log(`   ✅ Migrated ${migratedCount}/${mProducts.length} products...`);
        }

      } catch (error: any) {
        console.error(`   ❌ Error migrating ${mProduct.name}: ${error.message}`);
        errorCount++;
      }
    }

    // Final verification
    console.log(`\n📊 Migration Summary:`);
    console.log(`   ✅ Products migrated: ${migratedCount}`);
    console.log(`   ⏭️  Products skipped (already exist): ${skippedCount}`);
    console.log(`   ❌ Products with errors: ${errorCount}`);

    const totalProducts = await Product.countDocuments({
      store: { $in: linkedStores.map(s => s._id) }
    });
    console.log(`   📦 Total products across all stores: ${totalProducts}`);

    // Show top stores by product count
    console.log(`\n📍 Top 10 stores by product count:`);
    const storeProductCounts = await Promise.all(
      linkedStores.slice(0, 10).map(async (store) => {
        const count = await Product.countDocuments({ store: store._id });
        return { name: store.name, count };
      })
    );
    
    storeProductCounts.sort((a, b) => b.count - a.count);
    storeProductCounts.forEach((item, idx) => {
      console.log(`   ${idx + 1}. ${item.name}: ${item.count} products`);
    });

    await mongoose.disconnect();
    console.log('\n✅ Migration completed!');
    console.log('👋 Disconnected');
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

linkAllStoresToMerchant();

