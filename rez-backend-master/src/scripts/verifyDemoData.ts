/**
 * Verify Demo Data Script
 * Run with: npx ts-node src/scripts/verifyDemoData.ts
 *
 * Connects to MongoDB and verifies ALL data relationships needed for the demo flow:
 * 1. Admin user exists and has correct role
 * 2. Customer user exists with wallet + coins
 * 3. Merchant user exists, linked to Merchant record
 * 4. Merchant linked to Store
 * 5. Store linked to Products (with stock)
 * 6. Categories exist and linked to products
 * 7. Campaigns exist and linked to store/products
 * 8. MerchantWallet exists and linked to merchant + store
 * 9. Order model has platformFee/merchantPayout fields
 * 10. CoinTransaction model has required source types
 * 11. PendingCoinReward model exists
 * 12. Share model exists
 *
 * Does NOT delete any data - only reads and reports.
 * If data is missing or broken, it will attempt to fix/migrate.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

// Import all models
import { User } from '../models/User';
import { Wallet } from '../models/Wallet';
import { Merchant } from '../models/Merchant';
import { Store } from '../models/Store';
import { Category } from '../models/Category';
import { Product } from '../models/Product';
import MerchantWallet from '../models/MerchantWallet';
import Campaign from '../models/Campaign';

// Try importing optional models
let CoinTransaction: any;
let PendingCoinReward: any;
let Share: any;
let Order: any;

try { CoinTransaction = require('../models/CoinTransaction').default || require('../models/CoinTransaction').CoinTransaction; } catch (e) { }
try { PendingCoinReward = require('../models/PendingCoinReward').default || require('../models/PendingCoinReward').PendingCoinReward; } catch (e) { }
try { Share = require('../models/Share').default || require('../models/Share').Share; } catch (e) { }
try { Order = require('../models/Order').default || require('../models/Order').Order; } catch (e) { }

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rez';

// Tracking
let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;
let warnings = 0;
let fixesApplied = 0;

function pass(msg: string) {
  totalChecks++;
  passedChecks++;
  console.log(`  ✅ ${msg}`);
}

function fail(msg: string) {
  totalChecks++;
  failedChecks++;
  console.log(`  ❌ ${msg}`);
}

function warn(msg: string) {
  warnings++;
  console.log(`  ⚠️  ${msg}`);
}

function info(msg: string) {
  console.log(`  ℹ️  ${msg}`);
}

function fixed(msg: string) {
  fixesApplied++;
  console.log(`  🔧 FIXED: ${msg}`);
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  REZ DEMO DATA VERIFICATION SCRIPT');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  Database: ${MONGODB_URI.replace(/\/\/.*:.*@/, '//***:***@')}`);
  console.log(`  Time: ${new Date().toISOString()}`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB\n');
  } catch (err) {
    console.error('Failed to connect to MongoDB:', err);
    process.exit(1);
  }

  // ─────────────────────────────────────────────────
  // 1. ADMIN USER
  // ─────────────────────────────────────────────────
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('1. ADMIN USER');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const adminUser = await User.findOne({ email: 'admin@rez.app' });
  if (adminUser) {
    pass(`Admin user found: ${adminUser.email} (ID: ${adminUser._id})`);

    if (adminUser.role === 'admin') {
      pass(`Role is 'admin'`);
    } else {
      fail(`Role is '${adminUser.role}' - expected 'admin'`);
      // Fix
      adminUser.role = 'admin' as any;
      await adminUser.save();
      fixed(`Updated role to 'admin'`);
    }

    if ((adminUser as any).auth?.isVerified) {
      pass('Admin is verified');
    } else {
      fail('Admin is NOT verified');
      (adminUser as any).auth = { ...(adminUser as any).auth, isVerified: true, isOnboarded: true };
      await adminUser.save();
      fixed('Set admin as verified');
    }

    if (adminUser.isActive) {
      pass('Admin is active');
    } else {
      fail('Admin is NOT active');
    }

    info(`Name: ${(adminUser as any).profile?.firstName || 'N/A'} ${(adminUser as any).profile?.lastName || 'N/A'}`);
    info(`Phone: ${adminUser.phoneNumber || 'N/A'}`);
  } else {
    fail('Admin user NOT found (email: admin@rez.app)');
    warn('Run seed script: npx ts-node src/scripts/seedDemoData.ts');
  }

  // ─────────────────────────────────────────────────
  // 2. CUSTOMER USER + WALLET
  // ─────────────────────────────────────────────────
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('2. CUSTOMER USER + WALLET');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const customerUser = await User.findOne({ $or: [{ email: 'customer@rez.app' }, { email: 'customer@test.com' }] });
  if (customerUser) {
    pass(`Customer user found: ${customerUser.email} (ID: ${customerUser._id})`);
    info(`Name: ${(customerUser as any).profile?.firstName || 'N/A'} ${(customerUser as any).profile?.lastName || 'N/A'}`);
    info(`Phone: ${customerUser.phoneNumber || 'N/A'}`);

    // Check wallet
    const wallet = await Wallet.findOne({ user: customerUser._id });
    if (wallet) {
      pass(`Wallet found (ID: ${wallet._id})`);
      info(`Balance: total=${(wallet as any).balance?.total || 0}, available=${(wallet as any).balance?.available || 0}`);

      // Check coins array structure
      const coins = (wallet as any).coins;
      if (coins && Array.isArray(coins) && coins.length > 0) {
        pass(`Coins array has ${coins.length} entries`);
        for (const coin of coins) {
          info(`  - Type: ${coin.type}, Amount: ${coin.amount}, Active: ${coin.isActive}`);
        }
      } else {
        fail('Coins array is empty or missing');
        warn('Customer has no coins in wallet - need to run seed or create order for 5% reward');
      }

      // Check branded coins
      const brandedCoins = (wallet as any).brandedCoins;
      if (brandedCoins && Array.isArray(brandedCoins)) {
        info(`Branded coins: ${brandedCoins.length} entries`);
        for (const bc of brandedCoins) {
          info(`  - Store: ${bc.storeName || bc.storeId}, Amount: ${bc.amount}`);
        }
      }
    } else {
      fail('Customer wallet NOT found');
      warn('Wallet should be created when customer signs up or seed runs');
    }
  } else {
    fail('Customer user NOT found (email: customer@rez.app)');
    warn('Run seed script: npx ts-node src/scripts/seedDemoData.ts');
  }

  // ─────────────────────────────────────────────────
  // 3. MERCHANT USER + MERCHANT RECORD
  // ─────────────────────────────────────────────────
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('3. MERCHANT USER + MERCHANT RECORD');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const merchantUser = await User.findOne({ $or: [{ email: 'merchant@rez.app' }, { email: 'merchant@test.com' }] });
  let merchantRecord: any = null;
  let storeRecord: any = null;
  const merchantUserId = merchantUser?._id as any;

  if (merchantUser) {
    pass(`Merchant user found: ${merchantUser.email} (ID: ${merchantUserId})`);
    info(`Name: ${(merchantUser as any).profile?.firstName || 'N/A'} ${(merchantUser as any).profile?.lastName || 'N/A'}`);

    if (merchantUser.role === 'merchant') {
      pass(`Role is 'merchant'`);
    } else {
      fail(`Role is '${merchantUser.role}' - expected 'merchant'`);
    }

    // Find Merchant record linked to user
    merchantRecord = await Merchant.findOne({ userId: merchantUserId });
    if (!merchantRecord) {
      // Try alternative field names
      merchantRecord = await Merchant.findOne({ user: merchantUserId });
    }

    if (merchantRecord) {
      pass(`Merchant record found (ID: ${merchantRecord._id})`);
      info(`Business: ${merchantRecord.businessName || 'N/A'}`);
      info(`Status: ${merchantRecord.status || 'N/A'}`);
      info(`Verified: ${merchantRecord.isVerified || false}`);

      if (merchantRecord.status === 'approved' || merchantRecord.status === 'active') {
        pass('Merchant is approved/active');
      } else {
        fail(`Merchant status is '${merchantRecord.status}' - expected 'approved' or 'active'`);
        warn('Admin needs to approve the merchant first');
      }
    } else {
      fail('Merchant record NOT found linked to merchant user');
      warn('Need to create Merchant record linked to the user');
    }
  } else {
    fail('Merchant user NOT found (email: merchant@rez.app)');
    warn('Run seed script: npx ts-node src/scripts/seedDemoData.ts');
  }

  // ─────────────────────────────────────────────────
  // 4. STORE LINKED TO MERCHANT
  // ─────────────────────────────────────────────────
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('4. STORE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (merchantUser) {
    // Try different field names
    storeRecord = await Store.findOne({ merchantId: merchantUserId });
    if (!storeRecord) {
      storeRecord = await Store.findOne({ merchant: merchantUserId });
    }
    if (!storeRecord && merchantRecord) {
      storeRecord = await Store.findOne({ merchantId: merchantRecord._id });
    }
    // Try by slug
    if (!storeRecord) {
      storeRecord = await Store.findOne({ slug: 'urban-style-store' });
    }

    if (storeRecord) {
      pass(`Store found: "${storeRecord.name}" (ID: ${storeRecord._id})`);
      info(`Slug: ${storeRecord.slug}`);
      info(`Status: ${(storeRecord as any).status || 'N/A'}`);
      info(`Active: ${(storeRecord as any).isActive}`);

      // Check merchant link
      const storeMerchantId = (storeRecord as any).merchantId || (storeRecord as any).merchant;
      if (storeMerchantId) {
        const linkedToUser = storeMerchantId.toString() === merchantUserId.toString();
        const linkedToMerchant = merchantRecord && storeMerchantId.toString() === merchantRecord._id.toString();
        if (linkedToUser || linkedToMerchant) {
          pass(`Store linked to merchant (${storeMerchantId})`);
        } else {
          fail(`Store merchantId (${storeMerchantId}) doesn't match merchant user (${merchantUserId}) or merchant record (${merchantRecord?._id})`);
        }
      } else {
        fail('Store has no merchantId field');
      }
    } else {
      fail('Store NOT found for merchant');
    }
  } else {
    fail('Cannot check store - no merchant user');
  }

  // ─────────────────────────────────────────────────
  // 5. PRODUCTS LINKED TO STORE
  // ─────────────────────────────────────────────────
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('5. PRODUCTS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (storeRecord) {
    const products = await Product.find({ store: storeRecord._id });
    if (products.length > 0) {
      pass(`Found ${products.length} products in store`);
      for (const p of products) {
        const pricing = (p as any).pricing || {};
        const inventory = (p as any).inventory || {};
        const stock = inventory.stock ?? inventory.quantity ?? 'N/A';
        const original = pricing.original ?? pricing.mrp ?? 'N/A';
        const selling = pricing.selling ?? pricing.sellingPrice ?? 'N/A';
        info(`  - "${p.name}" | SKU: ${(p as any).sku || 'N/A'} | Price: ₹${original} → ₹${selling} | Stock: ${stock} | Active: ${(p as any).isActive}`);

        // Verify category link
        const cat = (p as any).category;
        if (cat) {
          const catDoc = await Category.findById(cat);
          if (catDoc) {
            pass(`  Product "${p.name}" linked to category "${catDoc.name}"`);
          } else {
            fail(`  Product "${p.name}" has category ${cat} but category not found in DB`);
          }
        } else {
          warn(`  Product "${p.name}" has no category`);
        }
      }
    } else {
      fail('No products found for store');
    }

    // Also check products by merchant
    const productsByMerchant = await Product.find({ merchant: merchantUser?._id });
    if (productsByMerchant.length > 0) {
      info(`Also found ${productsByMerchant.length} products by merchant ID`);
    }
  } else {
    fail('Cannot check products - no store found');
  }

  // ─────────────────────────────────────────────────
  // 6. CATEGORIES
  // ─────────────────────────────────────────────────
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('6. CATEGORIES');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const categories = await Category.find({});
  if (categories.length > 0) {
    pass(`Found ${categories.length} categories`);
    for (const cat of categories) {
      const productCount = await Product.countDocuments({ category: cat._id });
      info(`  - "${cat.name}" (${cat.slug || 'no-slug'}) → ${productCount} products`);
    }
  } else {
    fail('No categories found');
  }

  // ─────────────────────────────────────────────────
  // 7. CAMPAIGNS
  // ─────────────────────────────────────────────────
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('7. CAMPAIGNS / DEALS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const campaigns = await Campaign.find({});
  if (campaigns.length > 0) {
    pass(`Found ${campaigns.length} campaigns`);
    for (const camp of campaigns) {
      const c = camp as any;
      info(`  - "${c.title}" | Type: ${c.type} | Active: ${c.isActive} | Store: ${c.store || 'N/A'}`);

      // Check store link
      if (c.store && storeRecord) {
        if (c.store.toString() === storeRecord._id.toString()) {
          pass(`  Campaign "${c.title}" linked to correct store`);
        } else {
          warn(`  Campaign "${c.title}" linked to different store: ${c.store}`);
        }
      }

      // Check product links
      if (c.products && c.products.length > 0) {
        info(`  Products in campaign: ${c.products.length}`);
        for (const prodId of c.products) {
          const prod = await Product.findById(prodId);
          if (prod) {
            pass(`    Product "${prod.name}" exists`);
          } else {
            fail(`    Product ${prodId} NOT found in DB`);
          }
        }
      }
    }
  } else {
    fail('No campaigns found');
    warn('Campaigns are needed for the "Search deals" step');
  }

  // ─────────────────────────────────────────────────
  // 8. MERCHANT WALLET
  // ─────────────────────────────────────────────────
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('8. MERCHANT WALLET');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (merchantUser) {
    const mWallet = await MerchantWallet.findOne({ merchant: merchantUserId });
    if (mWallet) {
      pass(`Merchant wallet found (ID: ${mWallet._id})`);
      const bal = (mWallet as any).balance || {};
      const stats = (mWallet as any).statistics || {};
      info(`Balance: total=${bal.total || 0}, available=${bal.available || 0}, pending=${bal.pending || 0}, withdrawn=${bal.withdrawn || 0}`);
      info(`Stats: totalSales=${stats.totalSales || 0}, platformFees=${stats.totalPlatformFees || 0}, netSales=${stats.netSales || 0}`);
      info(`Orders: ${stats.totalOrders || 0}, Avg: ₹${stats.averageOrderValue || 0}`);
      info(`Transactions: ${(mWallet as any).transactions?.length || 0}`);

      // Check store link
      if ((mWallet as any).store) {
        if (storeRecord && (mWallet as any).store.toString() === storeRecord._id.toString()) {
          pass('Merchant wallet linked to correct store');
        } else {
          warn(`Merchant wallet store (${(mWallet as any).store}) differs from store record (${storeRecord?._id})`);
        }
      } else {
        fail('Merchant wallet has no store field');
      }
    } else {
      fail('Merchant wallet NOT found');
      warn('MerchantWallet will be auto-created when first order is paid');
    }
  }

  // ─────────────────────────────────────────────────
  // 9. ORDER MODEL - platformFee FIELDS
  // ─────────────────────────────────────────────────
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('9. ORDER MODEL (platformFee/merchantPayout)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (Order) {
    pass('Order model imported successfully');
    const sampleOrder = await Order.findOne({}).lean();
    if (sampleOrder) {
      info(`Found sample order: ${(sampleOrder as any).orderNumber || sampleOrder._id}`);
      const totals = (sampleOrder as any).totals || {};
      if ('platformFee' in totals) {
        pass(`Order has platformFee field: ₹${totals.platformFee}`);
      } else {
        warn('Order does not have platformFee in totals (will be added on new orders)');
      }
      if ('merchantPayout' in totals) {
        pass(`Order has merchantPayout field: ₹${totals.merchantPayout}`);
      } else {
        warn('Order does not have merchantPayout in totals (will be added on new orders)');
      }
    } else {
      info('No orders in DB yet - platformFee will be calculated on new orders');
    }
  } else {
    fail('Order model could not be imported');
  }

  // ─────────────────────────────────────────────────
  // 10. COINTRANSACTION MODEL
  // ─────────────────────────────────────────────────
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('10. COIN TRANSACTION MODEL');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (CoinTransaction) {
    pass('CoinTransaction model imported successfully');
    const ctCount = await CoinTransaction.countDocuments({});
    info(`Total coin transactions in DB: ${ctCount}`);

    // Check source types
    const sources = await CoinTransaction.distinct('source');
    info(`Source types in DB: ${sources.length > 0 ? sources.join(', ') : 'none yet'}`);

    // Check schema for required sources
    const schema = CoinTransaction.schema;
    const sourcePath = schema.path('source');
    if (sourcePath && sourcePath.enumValues) {
      const hasReward = sourcePath.enumValues.includes('purchase_reward');
      const hasShare = sourcePath.enumValues.includes('social_share_reward');
      const hasMerchant = sourcePath.enumValues.includes('merchant_award');

      if (hasReward) pass("'purchase_reward' source type exists in schema");
      else fail("'purchase_reward' source type MISSING from schema");

      if (hasShare) pass("'social_share_reward' source type exists in schema");
      else fail("'social_share_reward' source type MISSING from schema");

      if (hasMerchant) pass("'merchant_award' source type exists in schema");
      else fail("'merchant_award' source type MISSING from schema");
    } else {
      warn('Could not read source enum from schema');
    }
  } else {
    fail('CoinTransaction model could not be imported');
  }

  // ─────────────────────────────────────────────────
  // 11. PENDING COIN REWARD MODEL
  // ─────────────────────────────────────────────────
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('11. PENDING COIN REWARD MODEL');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (PendingCoinReward) {
    pass('PendingCoinReward model imported successfully');
    const pcrCount = await PendingCoinReward.countDocuments({});
    info(`Total pending coin rewards in DB: ${pcrCount}`);
    const pendingCount = await PendingCoinReward.countDocuments({ status: 'pending' });
    const approvedCount = await PendingCoinReward.countDocuments({ status: 'approved' });
    info(`Pending: ${pendingCount}, Approved: ${approvedCount}`);
  } else {
    fail('PendingCoinReward model could not be imported');
    warn('This model is needed for admin approval of social share coins');
  }

  // ─────────────────────────────────────────────────
  // 12. SHARE MODEL
  // ─────────────────────────────────────────────────
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('12. SHARE MODEL');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (Share) {
    pass('Share model imported successfully');
    const shareCount = await Share.countDocuments({});
    info(`Total shares in DB: ${shareCount}`);
    const purchaseShares = await Share.countDocuments({ contentType: 'purchase' });
    info(`Purchase shares: ${purchaseShares}`);
  } else {
    fail('Share model could not be imported');
    warn('This model is needed for social sharing coin rewards');
  }

  // ─────────────────────────────────────────────────
  // 13. EXISTING ORDERS CHECK
  // ─────────────────────────────────────────────────
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('13. EXISTING ORDERS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (Order) {
    const orderCount = await Order.countDocuments({});
    info(`Total orders in DB: ${orderCount}`);

    if (orderCount > 0) {
      const statuses = await Order.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]);
      for (const s of statuses) {
        info(`  Status '${s._id}': ${s.count} orders`);
      }

      // Check if orders have store/user links
      const recentOrders = await Order.find({}).sort({ createdAt: -1 }).limit(5).lean();
      for (const o of recentOrders as any[]) {
        const hasStore = !!o.store;
        const hasUser = !!o.user;
        const hasTotals = !!o.totals;
        info(`  Order ${o.orderNumber || o._id}: user=${hasUser}, store=${hasStore}, totals=${hasTotals}, status=${o.status}`);
      }
    } else {
      info('No orders yet - that is expected before demo starts');
    }
  }

  // ─────────────────────────────────────────────────
  // 14. ALL COLLECTIONS SUMMARY
  // ─────────────────────────────────────────────────
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('14. DATABASE COLLECTIONS SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const db = mongoose.connection.db;
  if (db) {
    const collections = await db.listCollections().toArray();
    console.log(`  Total collections: ${collections.length}`);
    for (const col of collections.sort((a, b) => a.name.localeCompare(b.name))) {
      const count = await db.collection(col.name).countDocuments();
      console.log(`  📁 ${col.name}: ${count} documents`);
    }
  }

  // ─────────────────────────────────────────────────
  // FINAL REPORT
  // ─────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  VERIFICATION REPORT');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  Total checks:  ${totalChecks}`);
  console.log(`  ✅ Passed:      ${passedChecks}`);
  console.log(`  ❌ Failed:      ${failedChecks}`);
  console.log(`  ⚠️  Warnings:   ${warnings}`);
  console.log(`  🔧 Fixes:      ${fixesApplied}`);
  console.log('═══════════════════════════════════════════════════════════════');

  if (failedChecks === 0) {
    console.log('\n  🎉 ALL CHECKS PASSED - Data is ready for demo!\n');
  } else {
    console.log(`\n  ⚠️  ${failedChecks} checks failed - see details above.\n`);
  }

  // ─────────────────────────────────────────────────
  // DEMO FLOW READINESS
  // ─────────────────────────────────────────────────
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  DEMO FLOW READINESS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const hasAdmin = !!adminUser;
  const hasCustomer = !!customerUser;
  const hasWallet = !!(customerUser && await Wallet.findOne({ user: customerUser._id }));
  const hasMerchant = !!merchantUser && !!merchantRecord;
  const hasStore = !!storeRecord;
  const hasProducts = storeRecord ? (await Product.countDocuments({ store: storeRecord._id })) > 0 : false;
  const hasCampaigns = (await Campaign.countDocuments({})) > 0;
  const hasMerchantWallet = merchantUser ? !!(await MerchantWallet.findOne({ merchant: merchantUserId })) : false;
  const hasCategories = (await Category.countDocuments({})) > 0;

  const steps = [
    { name: 'Admin login (admin@rez.app / Admin@123)', ready: hasAdmin, port: '8083' },
    { name: 'Customer login (customer@rez.app or customer@test.com)', ready: hasCustomer, port: '8081' },
    { name: 'Customer wallet with coins', ready: hasWallet, port: '8081' },
    { name: 'Merchant login (merchant@rez.app or merchant@test.com / Merchant@123)', ready: hasMerchant, port: '8082' },
    { name: 'Store with products', ready: hasStore && hasProducts, port: '8082' },
    { name: 'Categories for browsing', ready: hasCategories, port: '8081' },
    { name: 'Campaigns/Deals to search', ready: hasCampaigns, port: '8081' },
    { name: 'Merchant wallet for 15% fee tracking', ready: hasMerchantWallet, port: '8082' },
  ];

  for (const step of steps) {
    console.log(`  ${step.ready ? '✅' : '❌'} ${step.name} (localhost:${step.port})`);
  }

  const allReady = steps.every(s => s.ready);
  console.log(allReady
    ? '\n  🚀 ALL SYSTEMS GO - Ready for full demo!'
    : '\n  ⚠️  Some prerequisites missing - fix the ❌ items above'
  );

  await mongoose.disconnect();
  console.log('\nDisconnected from MongoDB');
  process.exit(0);
}

main().catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
});
