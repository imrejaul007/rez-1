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

    // Step 1: Update ALL stores to link to this merchant
    console.log(`\n🏪 Finding all stores...`);
    const allStores = await Store.find({}).lean();
    console.log(`   Found ${allStores.length} stores`);

    console.log(`\n🔗 Linking all stores to merchant...`);
    const updateResult = await Store.updateMany(
      {},
      { $set: { merchantId: newMerchantId } }
    );

    console.log(`✅ Updated ${updateResult.modifiedCount} stores`);

    // Get updated stores
    const linkedStores = await Store.find({ merchantId: newMerchantId }).lean();
    console.log(`✅ Total stores linked: ${linkedStores.length}`);

    // Step 2: Migrate ALL products from mproducts to products collection
    console.log(`\n📦 Migrating products from mproducts...`);
    const mProductsCollection = mongoose.connection.collection('mproducts');
    const mProducts = await mProductsCollection.find({}).toArray();
    
    console.log(`   Found ${mProducts.length} products in mproducts`);

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // Process in batches to show progress
    for (let i = 0; i < mProducts.length; i++) {
      const mProduct = mProducts[i];
      
      try {
        // Check if already exists
        const exists = await Product.findOne({ _id: mProduct._id });

        if (exists) {
          skippedCount++;
          if (i % 10 === 0) {
            console.log(`   Progress: ${i + 1}/${mProducts.length} (${skippedCount} skipped, ${migratedCount} migrated)`);
          }
          continue;
        }

        // Determine store - distribute across linked stores
        const storeIndex = migratedCount % linkedStores.length;
        const assignedStore = linkedStores[storeIndex];

        // Extract price info
        const price = mProduct.price || mProduct.pricing?.basePrice || mProduct.pricing?.selling || 0;
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

        // Get or create category
        let categoryId = mProduct.category;
        if (typeof categoryId === 'string' && !mongoose.Types.ObjectId.isValid(categoryId)) {
          const Category = mongoose.model('Category');
          let category = await Category.findOne({ name: { $regex: new RegExp(categoryId, 'i') } });
          if (!category) {
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
        slug = `${slug}-${mProduct._id.toString().slice(-6)}`;

        // Create product data
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

          isActive: mProduct.status === 'active',
          isFeatured: mProduct.featured || false,

          createdAt: mProduct.createdAt || new Date(),
          updatedAt: mProduct.updatedAt || new Date()
        };

        await Product.create(productData);
        migratedCount++;

        if (i % 10 === 0) {
          console.log(`   Progress: ${i + 1}/${mProducts.length} (${migratedCount} migrated, ${skippedCount} skipped)`);
        }

      } catch (error: any) {
        errorCount++;
        if (errorCount < 5) { // Only show first 5 errors
          console.error(`   ❌ Error: ${mProduct.name} - ${error.message}`);
        }
      }
    }

    // Step 3: Verification
    console.log(`\n📊 Migration Summary:`);
    console.log(`   ✅ Products migrated: ${migratedCount}`);
    console.log(`   ⏭️  Products skipped: ${skippedCount}`);
    console.log(`   ❌ Products with errors: ${errorCount}`);

    const totalProducts = await Product.countDocuments({});
    console.log(`   📦 Total products in database: ${totalProducts}`);

    // Show store distribution (sample)
    console.log(`\n📍 Store Distribution (Top 10):`);
    const topStores = linkedStores.slice(0, 10);
    for (const store of topStores) {
      const count = await Product.countDocuments({ store: store._id });
      console.log(`   ${store.name}: ${count} products`);
    }

    // Final stats
    const storesWithProducts = await Product.distinct('store');
    console.log(`\n✅ Final Statistics:`);
    console.log(`   Total Stores: ${linkedStores.length}`);
    console.log(`   Stores with Products: ${storesWithProducts.length}`);
    console.log(`   Total Products: ${totalProducts}`);
    console.log(`   Merchant: ${TARGET_MERCHANT_EMAIL}`);

    await mongoose.disconnect();
    console.log('\n✅ Migration completed successfully!');
    console.log('👋 Disconnected');
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

linkAllStoresToMerchant();

