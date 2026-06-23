import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI as string;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };
const DB_NAME = process.env.DB_NAME || 'test';

async function checkProductPrices() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      dbName: DB_NAME,
    });
    console.log('✅ Connected to MongoDB\n');

    // Import Product model
    const { Product } = await import('../models/Product');
    const { Store } = await import('../models/Store');

    // Get sample products
    const products = await Product.find({ isDeleted: false })
      .select('name pricing cashback store')
      .populate('store', 'name rewardRules')
      .limit(10)
      .lean();

    console.log(`📦 Found ${products.length} products to check\n`);
    console.log('='.repeat(80));

    products.forEach((product: any, index: number) => {
      console.log(`\n${index + 1}. Product: ${product.name}`);
      console.log(`   ID: ${product._id}`);
      
      // Check pricing
      const currentPrice = product.pricing?.selling || 
                          product.pricing?.original || 
                          product.pricing?.mrp || 0;
      const originalPrice = product.pricing?.original || 
                           product.pricing?.mrp || 
                           currentPrice;
      
      console.log(`   Pricing:`);
      console.log(`     - selling: ${product.pricing?.selling || 'NOT SET'}`);
      console.log(`     - original: ${product.pricing?.original || 'NOT SET'}`);
      console.log(`     - mrp: ${product.pricing?.mrp || 'NOT SET'}`);
      console.log(`     - Calculated currentPrice: ${currentPrice}`);
      console.log(`     - Calculated originalPrice: ${originalPrice}`);
      
      // Check cashback
      console.log(`   Cashback:`);
      console.log(`     - percentage: ${product.cashback?.percentage || 'NOT SET'}`);
      console.log(`     - maxAmount: ${product.cashback?.maxAmount || 'NOT SET'}`);
      console.log(`     - isActive: ${product.cashback?.isActive ?? 'NOT SET'}`);
      console.log(`     - validUntil: ${product.cashback?.validUntil || 'NOT SET'}`);
      
      // Check store reward rules
      const store = product.store;
      console.log(`   Store: ${store?.name || 'NOT FOUND'}`);
      console.log(`     - baseCashbackPercent: ${store?.rewardRules?.baseCashbackPercent || 'NOT SET'}`);
      
      // Calculate what cashback would be
      let cashbackPercentage = 0;
      if (product.cashback?.percentage && 
          product.cashback.percentage > 0 &&
          (product.cashback.isActive !== false) &&
          (!product.cashback.validUntil || new Date(product.cashback.validUntil) > new Date())) {
        cashbackPercentage = product.cashback.percentage;
      }
      if (cashbackPercentage === 0 && store?.rewardRules?.baseCashbackPercent) {
        cashbackPercentage = store.rewardRules.baseCashbackPercent;
      }
      if (cashbackPercentage === 0) {
        cashbackPercentage = 5; // Default
      }
      
      const cashbackAmount = currentPrice > 0 ? Math.round((currentPrice * cashbackPercentage) / 100) : 0;
      const coins = currentPrice > 0 ? Math.max(1, Math.round((currentPrice * 5) / 100)) : 0;
      
      console.log(`   Calculated Values:`);
      console.log(`     - cashbackPercentage: ${cashbackPercentage}%`);
      console.log(`     - cashbackAmount: ₹${cashbackAmount}`);
      console.log(`     - coins: ${coins} rezcoins`);
      console.log(`     - Status: ${currentPrice > 0 ? '✅ VALID' : '❌ INVALID (price is 0)'}`);
      
      console.log('-'.repeat(80));
    });

    // Statistics
    console.log('\n📊 STATISTICS:');
    const allProducts = await Product.find({ isDeleted: false })
      .select('pricing cashback')
      .lean();
    
    const productsWithPrice = allProducts.filter((p: any) => {
      const price = p.pricing?.selling || p.pricing?.original || p.pricing?.mrp || 0;
      return price > 0;
    });
    
    const productsWithCashback = allProducts.filter((p: any) => 
      p.cashback?.percentage && p.cashback.percentage > 0
    );
    
    console.log(`   Total products: ${allProducts.length}`);
    console.log(`   Products with valid price: ${productsWithPrice.length} (${((productsWithPrice.length / allProducts.length) * 100).toFixed(1)}%)`);
    console.log(`   Products with cashback: ${productsWithCashback.length} (${((productsWithCashback.length / allProducts.length) * 100).toFixed(1)}%)`);
    
    // Check stores with reward rules
    const stores = await Store.find()
      .select('name rewardRules')
      .lean();
    const storesWithRewardRules = stores.filter((s: any) => 
      s.rewardRules?.baseCashbackPercent && s.rewardRules.baseCashbackPercent > 0
    );
    console.log(`   Total stores: ${stores.length}`);
    console.log(`   Stores with rewardRules: ${storesWithRewardRules.length} (${((storesWithRewardRules.length / stores.length) * 100).toFixed(1)}%)`);

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the script
checkProductPrices();

