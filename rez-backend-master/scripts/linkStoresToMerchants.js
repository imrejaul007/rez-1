const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };
const DB_NAME = process.env.DB_NAME || 'test';

async function linkStoresToMerchants() {
  try {
    await mongoose.connect(MONGODB_URI, {
      dbName: DB_NAME,
    });
    console.log('✅ Connected to MongoDB');

    const Merchant = mongoose.model('Merchant', new mongoose.Schema({}, { strict: false }));
    const Store = mongoose.model('Store', new mongoose.Schema({}, { strict: false }));

    // Get all merchants
    const merchants = await Merchant.find({});
    console.log(`\n📊 Found ${merchants.length} merchants`);

    // Get all stores without merchantId or with invalid merchantId
    const storesWithoutMerchant = await Store.find({
      $or: [
        { merchantId: { $exists: false } },
        { merchantId: null }
      ]
    });
    console.log(`📊 Found ${storesWithoutMerchant.length} stores without merchantId`);

    // Strategy: Link stores to merchants by matching:
    // 1. Store name matches business name
    // 2. Store email matches merchant email
    // 3. Store location matches merchant address

    let linkedCount = 0;
    let createdCount = 0;
    let unmatchedStores = [];

    // First, link stores that match merchant business names or emails
    for (const store of storesWithoutMerchant) {
      let matchedMerchant = null;

      // Try to match by store name = business name
      matchedMerchant = merchants.find(m => 
        m.businessName && 
        store.name && 
        m.businessName.toLowerCase().trim() === store.name.toLowerCase().trim()
      );

      // If no match, try by email
      if (!matchedMerchant && store.contact?.email) {
        matchedMerchant = merchants.find(m => 
          m.email && 
          m.email.toLowerCase().trim() === store.contact.email.toLowerCase().trim()
        );
      }

      // If no match, try by city
      if (!matchedMerchant && store.location?.city && store.contact?.email) {
        matchedMerchant = merchants.find(m => 
          m.businessAddress?.city && 
          m.businessAddress.city.toLowerCase().trim() === store.location.city.toLowerCase().trim() &&
          m.email && 
          m.email.toLowerCase().trim() === store.contact.email.toLowerCase().trim()
        );
      }

      if (matchedMerchant) {
        const merchantId = typeof matchedMerchant._id === 'string' 
          ? new mongoose.Types.ObjectId(matchedMerchant._id) 
          : matchedMerchant._id;
        
        store.merchantId = merchantId;
        await store.save();
        console.log(`✅ Linked store "${store.name}" to merchant "${matchedMerchant.businessName}" (${matchedMerchant.email})`);
        linkedCount++;
      } else {
        unmatchedStores.push(store);
      }
    }

    // For remaining unmatched stores, create a default store for each merchant that doesn't have one
    for (const merchant of merchants) {
      const merchantId = typeof merchant._id === 'string' 
        ? new mongoose.Types.ObjectId(merchant._id) 
        : merchant._id;
      
      const existingStore = await Store.findOne({ merchantId });
      if (!existingStore) {
        // Create a store for this merchant
        let Category;
        try {
          Category = mongoose.model('Category');
        } catch {
          Category = mongoose.model('Category', new mongoose.Schema({}, { strict: false }));
        }
        let defaultCategory = await Category.findOne({ name: 'General' });
        if (!defaultCategory) {
          defaultCategory = await Category.create({
            name: 'General',
            slug: 'general',
            type: 'general',
            isActive: true
          });
        }

        const storeSlug = merchant.businessName
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, '')
          .replace(/\s+/g, '-')
          .trim();

        let finalSlug = storeSlug;
        let counter = 1;
        while (await Store.findOne({ slug: finalSlug })) {
          finalSlug = `${storeSlug}-${counter}`;
          counter++;
        }

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

        await Store.create(storeData);
        console.log(`✅ Created store "${merchant.businessName}" for merchant ${merchant.email}`);
        createdCount++;
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Linked existing stores: ${linkedCount}`);
    console.log(`   Created new stores: ${createdCount}`);
    console.log(`   Unmatched stores: ${unmatchedStores.length}`);

    if (unmatchedStores.length > 0) {
      console.log(`\n⚠️  Unmatched stores (${unmatchedStores.length}):`);
      unmatchedStores.forEach(store => {
        console.log(`   - ${store.name} (${store.contact?.email || 'no email'})`);
      });
    }

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

linkStoresToMerchants();

