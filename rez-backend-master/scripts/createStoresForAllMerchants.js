const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };
const DB_NAME = process.env.DB_NAME || 'test';

async function createStoresForAllMerchants() {
  try {
    await mongoose.connect(MONGODB_URI, {
      dbName: DB_NAME,
    });
    console.log('✅ Connected to MongoDB');

    const Merchant = mongoose.model('Merchant', new mongoose.Schema({}, { strict: false }));
    const Store = mongoose.model('Store', new mongoose.Schema({}, { strict: false }));
    const Category = mongoose.model('Category', new mongoose.Schema({}, { strict: false }));

    // Find all merchants
    const merchants = await Merchant.find({});
    console.log(`\n📊 Found ${merchants.length} merchants`);

    // Find or create default category
    let defaultCategory = await Category.findOne({ name: 'General' });
    if (!defaultCategory) {
      defaultCategory = await Category.create({
        name: 'General',
        slug: 'general',
        type: 'general',
        isActive: true
      });
      console.log('✅ Created default category');
    }

    let createdCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const merchant of merchants) {
      try {
        const merchantId = typeof merchant._id === 'string' 
          ? new mongoose.Types.ObjectId(merchant._id) 
          : merchant._id;
        
        // Check if store already exists
        const existingStore = await Store.findOne({ merchantId });
        if (existingStore) {
          console.log(`⏭️  Skipping ${merchant.businessName} - store already exists`);
          skippedCount++;
          continue;
        }

        // Create store slug
        const storeSlug = merchant.businessName
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, '')
          .replace(/\s+/g, '-')
          .trim();

        // Make slug unique
        let finalSlug = storeSlug;
        let counter = 1;
        while (await Store.findOne({ slug: finalSlug })) {
          finalSlug = `${storeSlug}-${counter}`;
          counter++;
        }

        // Create the store
        const storeData = {
          name: merchant.businessName,
          slug: finalSlug,
          description: `${merchant.businessName} - Your trusted local business`,
          category: defaultCategory._id,
          merchantId: merchantId,
          location: {
            address: merchant.businessAddress?.street 
              ? `${merchant.businessAddress.street}, ${merchant.businessAddress.city || ''}` 
              : 'Address not provided',
            city: merchant.businessAddress?.city || 'Unknown',
            state: merchant.businessAddress?.state || 'Unknown',
            pincode: merchant.businessAddress?.zipCode || '000000'
          },
          contact: {
            phone: merchant.phone || '',
            email: merchant.email
          },
          ratings: {
            average: 0,
            count: 0,
            distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
          },
          offers: {
            cashback: 5,
            isPartner: true,
            partnerLevel: 'bronze'
          },
          operationalInfo: {
            hours: {
              monday: { open: '09:00', close: '18:00', closed: false },
              tuesday: { open: '09:00', close: '18:00', closed: false },
              wednesday: { open: '09:00', close: '18:00', closed: false },
              thursday: { open: '09:00', close: '18:00', closed: false },
              friday: { open: '09:00', close: '18:00', closed: false },
              saturday: { open: '09:00', close: '18:00', closed: false },
              sunday: { open: '10:00', close: '16:00', closed: false }
            },
            deliveryTime: '30-45 mins',
            minimumOrder: 0,
            deliveryFee: 0,
            freeDeliveryAbove: 500,
            acceptsWalletPayment: true,
            paymentMethods: ['cash', 'card', 'upi', 'wallet']
          },
          analytics: {
            totalOrders: 0,
            totalRevenue: 0,
            avgOrderValue: 0,
            repeatCustomers: 0
          },
          tags: ['new-store', 'local-business'],
          isActive: true,
          isFeatured: false,
          isVerified: merchant.verificationStatus === 'verified'
        };

        const store = await Store.create(storeData);
        console.log(`✅ Created store "${store.name}" for merchant ${merchant.email}`);
        createdCount++;
      } catch (error) {
        console.error(`❌ Error creating store for ${merchant.email}:`, error.message);
        errorCount++;
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Created: ${createdCount}`);
    console.log(`   Skipped: ${skippedCount}`);
    console.log(`   Errors: ${errorCount}`);

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

createStoresForAllMerchants();

