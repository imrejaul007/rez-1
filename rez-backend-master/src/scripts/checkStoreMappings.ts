/**
 * Store-Merchant-Product Mapping Report
 * Queries the database and prints which merchant each store is connected to
 * and which products each store has.
 */
import mongoose from 'mongoose';
import { connectDatabase } from '../config/database';
import { Store } from '../models/Store';
import { Product } from '../models/Product';
import { MProduct } from '../models/MerchantProduct';
import { Merchant } from '../models/Merchant';
import dotenv from 'dotenv';

dotenv.config();

async function checkStoreMappings() {
    console.log('🗺️  Store-Merchant-Product Mapping Report');
    console.log('='.repeat(60));
    console.log('');

    try {
        const stores = await Store.find().sort({ name: 1 }).lean();

        if (stores.length === 0) {
            console.log('⚠️  No stores found in the database.');
            return;
        }

        let totalStores = stores.length;
        let linkedStores = 0;
        let unlinkedStores = 0;
        let totalProducts = 0;
        let totalMProducts = 0;

        for (const store of stores) {
            const storeId = store._id;

            console.log('─'.repeat(60));
            console.log(`🏪 ${store.name}`);
            console.log(`   Slug: ${store.slug}`);
            console.log(`   City: ${store.location?.city || 'N/A'}`);
            console.log(`   Active: ${store.isActive ? '✅ Yes' : '❌ No'}`);

            // --- Merchant Info ---
            if (store.merchantId) {
                const merchant = await Merchant.findById(store.merchantId).lean();
                if (merchant) {
                    linkedStores++;
                    console.log(`   🤝 Merchant: ${merchant.businessName} (${merchant.ownerName})`);
                    console.log(`      Email: ${merchant.email}`);
                    console.log(`      Phone: ${merchant.phone}`);
                    console.log(`      Verified: ${merchant.verificationStatus}`);
                } else {
                    unlinkedStores++;
                    console.log(`   ⚠️  Merchant ID set (${store.merchantId}) but NOT FOUND in DB`);
                }
            } else {
                unlinkedStores++;
                console.log('   🚫 Merchant: NOT LINKED');
            }

            // --- Customer-facing Products (Product collection) ---
            const products = await Product.find({ store: storeId })
                .select('name sku pricing.selling inventory.stock isActive')
                .sort({ name: 1 })
                .lean();

            if (products.length > 0) {
                console.log(`\n   📦 Products (customer-facing): ${products.length}`);
                for (const p of products) {
                    const price = (p as any).pricing?.selling ?? 'N/A';
                    const stock = (p as any).inventory?.stock ?? 'N/A';
                    const active = p.isActive ? '✅' : '❌';
                    console.log(`      ${active} ${p.name}  |  SKU: ${p.sku}  |  ₹${price}  |  Stock: ${stock}`);
                }
                totalProducts += products.length;
            } else {
                console.log('\n   📦 Products (customer-facing): 0');
            }

            // --- Merchant-managed Products (MProduct collection) ---
            const mProducts = await MProduct.find({ storeId: storeId })
                .select('name sku price inventory.stock status')
                .sort({ name: 1 })
                .lean();

            if (mProducts.length > 0) {
                console.log(`   📋 MerchantProducts: ${mProducts.length}`);
                for (const mp of mProducts) {
                    const stock = (mp as any).inventory?.stock ?? 'N/A';
                    const status = (mp as any).status ?? 'N/A';
                    console.log(`      [${status}] ${mp.name}  |  SKU: ${(mp as any).sku}  |  ₹${(mp as any).price}  |  Stock: ${stock}`);
                }
                totalMProducts += mProducts.length;
            } else {
                console.log('   📋 MerchantProducts: 0');
            }

            // Also check MProducts linked by merchantId (not storeId)
            if (store.merchantId) {
                const mProductsByMerchant = await MProduct.find({
                    merchantId: store.merchantId,
                    $or: [{ storeId: { $exists: false } }, { storeId: null }],
                })
                    .select('name sku price inventory.stock status')
                    .sort({ name: 1 })
                    .lean();

                if (mProductsByMerchant.length > 0) {
                    console.log(`   📋 MerchantProducts (via merchant, no storeId): ${mProductsByMerchant.length}`);
                    for (const mp of mProductsByMerchant) {
                        const stock = (mp as any).inventory?.stock ?? 'N/A';
                        const status = (mp as any).status ?? 'N/A';
                        console.log(`      [${status}] ${mp.name}  |  SKU: ${(mp as any).sku}  |  ₹${(mp as any).price}  |  Stock: ${stock}`);
                    }
                    totalMProducts += mProductsByMerchant.length;
                }
            }

            console.log('');
        }

        // --- Summary ---
        console.log('='.repeat(60));
        console.log('📊 SUMMARY');
        console.log('='.repeat(60));
        console.log(`   Total Stores:              ${totalStores}`);
        console.log(`   Linked to Merchant:        ${linkedStores}`);
        console.log(`   NOT linked to Merchant:    ${unlinkedStores}`);
        console.log(`   Total Products:            ${totalProducts}`);
        console.log(`   Total MerchantProducts:    ${totalMProducts}`);
        console.log('='.repeat(60));

    } catch (error) {
        console.error('❌ Error generating report:', error);
    }
}

// Run if executed directly
if (require.main === module) {
    connectDatabase()
        .then(() => checkStoreMappings())
        .then(() => {
            console.log('\n✅ Report complete.');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Connection failed:', error);
            process.exit(1);
        });
}
