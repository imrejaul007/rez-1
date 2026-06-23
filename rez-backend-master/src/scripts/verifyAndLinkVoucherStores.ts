// Script to verify voucher-store links and create missing stores
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { VoucherBrand } from '../models/Voucher';
import { Store } from '../models/Store';
import { Category } from '../models/Category';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/test';
const DB_NAME = process.env.DB_NAME || 'test';

// Store templates for different voucher categories
const storeTemplatesByCategory: { [key: string]: Array<Partial<any>> } = {
  fashion: [
    {
      name: 'Fashion Hub',
      slug: 'fashion-hub',
      description: 'Trendy fashion and clothing store',
      logo: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=200',
      location: {
        address: 'Karol Bagh, New Delhi',
        city: 'New Delhi',
        state: 'Delhi',
        pincode: '110005',
        coordinates: [77.1892, 28.6517],
        deliveryRadius: 8
      },
      contact: {
        phone: '+91-11-2345-6790',
        email: 'info@fashionhub.com'
      },
      ratings: {
        average: 4.3,
        count: 156,
        distribution: { 5: 89, 4: 45, 3: 15, 2: 5, 1: 2 }
      },
      offers: {
        cashback: 5,
        minOrderAmount: 200,
        maxCashback: 50,
        isPartner: true,
        partnerLevel: 'silver'
      },
      isActive: true,
      isVerified: true
    },
    {
      name: 'Style Boutique',
      slug: 'style-boutique',
      description: 'Premium fashion and accessories',
      logo: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=200',
      location: {
        address: 'Connaught Place, New Delhi',
        city: 'New Delhi',
        state: 'Delhi',
        pincode: '110001',
        coordinates: [77.2189, 28.6304],
        deliveryRadius: 10
      },
      contact: {
        phone: '+91-11-2345-6791',
        email: 'info@styleboutique.com'
      },
      ratings: {
        average: 4.5,
        count: 234,
        distribution: { 5: 156, 4: 58, 3: 15, 2: 4, 1: 1 }
      },
      offers: {
        cashback: 8,
        minOrderAmount: 300,
        maxCashback: 100,
        isPartner: true,
        partnerLevel: 'gold'
      },
      isActive: true,
      isVerified: true
    }
  ],
  food: [
    {
      name: 'Foodie Paradise',
      slug: 'foodie-paradise',
      description: 'Delicious food and dining',
      logo: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200',
      location: {
        address: 'Lajpat Nagar, New Delhi',
        city: 'New Delhi',
        state: 'Delhi',
        pincode: '110024',
        coordinates: [77.2434, 28.5687],
        deliveryRadius: 5
      },
      contact: {
        phone: '+91-11-2345-6792',
        email: 'info@foodieparadise.com'
      },
      ratings: {
        average: 4.7,
        count: 178,
        distribution: { 5: 98, 4: 55, 3: 20, 2: 4, 1: 1 }
      },
      offers: {
        cashback: 5,
        minOrderAmount: 200,
        maxCashback: 50,
        isPartner: true,
        partnerLevel: 'silver'
      },
      isActive: true,
      isVerified: true
    },
    {
      name: 'Quick Bites Express',
      slug: 'quick-bites-express',
      description: 'Fast food delivery in 30 minutes',
      logo: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=200',
      location: {
        address: 'Saket, New Delhi',
        city: 'New Delhi',
        state: 'Delhi',
        pincode: '110017',
        coordinates: [77.2090, 28.5284],
        deliveryRadius: 6
      },
      contact: {
        phone: '+91-11-2345-6793',
        email: 'orders@quickbites.com'
      },
      ratings: {
        average: 4.2,
        count: 134,
        distribution: { 5: 89, 4: 35, 3: 8, 2: 2, 1: 0 }
      },
      offers: {
        cashback: 4,
        minOrderAmount: 150,
        maxCashback: 40,
        isPartner: true,
        partnerLevel: 'bronze'
      },
      isActive: true,
      isVerified: true
    }
  ],
  groceries: [
    {
      name: 'Fresh Market',
      slug: 'fresh-market',
      description: 'Fresh groceries and daily essentials',
      logo: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=200',
      location: {
        address: 'Nehru Place, New Delhi',
        city: 'New Delhi',
        state: 'Delhi',
        pincode: '110019',
        coordinates: [77.2544, 28.5492],
        deliveryRadius: 7
      },
      contact: {
        phone: '+91-11-2345-6794',
        email: 'orders@freshmarket.com'
      },
      ratings: {
        average: 4.4,
        count: 189,
        distribution: { 5: 98, 4: 55, 3: 25, 2: 8, 1: 3 }
      },
      offers: {
        cashback: 3,
        minOrderAmount: 300,
        maxCashback: 60,
        isPartner: true,
        partnerLevel: 'silver'
      },
      isActive: true,
      isVerified: true
    }
  ],
  electronics: [
    {
      name: 'TechMart Electronics',
      slug: 'techmart-electronics',
      description: 'Latest electronics and gadgets',
      logo: 'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=200',
      location: {
        address: 'Connaught Place, New Delhi',
        city: 'New Delhi',
        state: 'Delhi',
        pincode: '110001',
        coordinates: [77.2189, 28.6304],
        deliveryRadius: 10
      },
      contact: {
        phone: '+91-11-2345-6789',
        email: 'info@techmart.com'
      },
      ratings: {
        average: 4.5,
        count: 234,
        distribution: { 5: 156, 4: 58, 3: 15, 2: 4, 1: 1 }
      },
      offers: {
        cashback: 6,
        minOrderAmount: 500,
        maxCashback: 150,
        isPartner: true,
        partnerLevel: 'gold'
      },
      isActive: true,
      isVerified: true
    }
  ],
  beauty: [
    {
      name: 'Beauty Lounge',
      slug: 'beauty-lounge',
      description: 'Premium beauty and cosmetics',
      logo: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=200',
      location: {
        address: 'Greater Kailash, New Delhi',
        city: 'New Delhi',
        state: 'Delhi',
        pincode: '110048',
        coordinates: [77.2418, 28.5537],
        deliveryRadius: 8
      },
      contact: {
        phone: '+91-11-2345-6795',
        email: 'info@beautylounge.com'
      },
      ratings: {
        average: 4.6,
        count: 167,
        distribution: { 5: 98, 4: 45, 3: 20, 2: 3, 1: 1 }
      },
      offers: {
        cashback: 7,
        minOrderAmount: 400,
        maxCashback: 120,
        isPartner: true,
        partnerLevel: 'gold'
      },
      isActive: true,
      isVerified: true
    }
  ],
  entertainment: [
    {
      name: 'Entertainment Hub',
      slug: 'entertainment-hub',
      description: 'Movies, games, and entertainment',
      logo: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=200',
      location: {
        address: 'Select Citywalk, Saket, New Delhi',
        city: 'New Delhi',
        state: 'Delhi',
        pincode: '110017',
        coordinates: [77.2090, 28.5284],
        deliveryRadius: 12
      },
      contact: {
        phone: '+91-11-2345-6796',
        email: 'info@entertainmenthub.com'
      },
      ratings: {
        average: 4.3,
        count: 145,
        distribution: { 5: 78, 4: 45, 3: 18, 2: 3, 1: 1 }
      },
      offers: {
        cashback: 5,
        minOrderAmount: 500,
        maxCashback: 100,
        isPartner: true,
        partnerLevel: 'silver'
      },
      isActive: true,
      isVerified: true
    }
  ],
  travel: [
    {
      name: 'Travel Express',
      slug: 'travel-express',
      description: 'Travel bookings and vacation packages',
      logo: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=200',
      location: {
        address: 'Connaught Place, New Delhi',
        city: 'New Delhi',
        state: 'Delhi',
        pincode: '110001',
        coordinates: [77.2189, 28.6304],
        deliveryRadius: 15
      },
      contact: {
        phone: '+91-11-2345-6797',
        email: 'bookings@travelexpress.com'
      },
      ratings: {
        average: 4.5,
        count: 234,
        distribution: { 5: 156, 4: 58, 3: 15, 2: 4, 1: 1 }
      },
      offers: {
        cashback: 10,
        minOrderAmount: 1000,
        maxCashback: 500,
        isPartner: true,
        partnerLevel: 'platinum'
      },
      isActive: true,
      isVerified: true
    }
  ],
  sports: [
    {
      name: 'Sports Central',
      slug: 'sports-central',
      description: 'Sports equipment and fitness gear',
      logo: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=200',
      location: {
        address: 'Saket, New Delhi',
        city: 'New Delhi',
        state: 'Delhi',
        pincode: '110017',
        coordinates: [77.2090, 28.5284],
        deliveryRadius: 8
      },
      contact: {
        phone: '+91-11-2345-6798',
        email: 'info@sportscentral.com'
      },
      ratings: {
        average: 4.6,
        count: 178,
        distribution: { 5: 98, 4: 55, 3: 20, 2: 4, 1: 1 }
      },
      offers: {
        cashback: 6,
        minOrderAmount: 500,
        maxCashback: 150,
        isPartner: true,
        partnerLevel: 'gold'
      },
      isActive: true,
      isVerified: true
    }
  ],
  shopping: [
    {
      name: 'Shopping Mall',
      slug: 'shopping-mall',
      description: 'One-stop shopping destination',
      logo: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=200',
      location: {
        address: 'Phoenix MarketCity, New Delhi',
        city: 'New Delhi',
        state: 'Delhi',
        pincode: '110017',
        coordinates: [77.2090, 28.5284],
        deliveryRadius: 10
      },
      contact: {
        phone: '+91-11-2345-6799',
        email: 'info@shoppingmall.com'
      },
      ratings: {
        average: 4.4,
        count: 201,
        distribution: { 5: 125, 4: 58, 3: 15, 2: 2, 1: 1 }
      },
      offers: {
        cashback: 8,
        minOrderAmount: 1000,
        maxCashback: 300,
        isPartner: true,
        partnerLevel: 'gold'
      },
      isActive: true,
      isVerified: true
    }
  ]
};

async function verifyAndLinkVoucherStores() {
  try {
    console.log('🔍 Starting Voucher-Store Verification and Linking...\n');
    console.log(`📡 Connecting to database: ${DB_NAME}`);
    
    // Connect to MongoDB
    let connectionUri = MONGODB_URI;
    
    // If URI doesn't include database name, append it
    if (!connectionUri.includes('/?') && !connectionUri.match(/\/[\w-]+\?/)) {
      const uriParts = connectionUri.split('/');
      const lastPart = uriParts[uriParts.length - 1];
      
      if (!lastPart.includes('?') && !lastPart.match(/^[\w-]+$/)) {
        if (connectionUri.endsWith('/')) {
          connectionUri = connectionUri + DB_NAME;
        } else {
          connectionUri = connectionUri + '/' + DB_NAME;
        }
      }
    }
    
    await mongoose.connect(connectionUri);
    console.log('✅ Connected to MongoDB\n');

    // Get all categories
    console.log('📂 Fetching categories...');
    const categories = await Category.find({ isActive: true });
    console.log(`✅ Found ${categories.length} categories\n`);

    // Get all stores
    console.log('🏪 Fetching existing stores...');
    const existingStores = await Store.find({ isActive: true });
    console.log(`✅ Found ${existingStores.length} active stores\n`);

    // Get all vouchers
    console.log('🎫 Fetching all vouchers...');
    const vouchers = await VoucherBrand.find({ isActive: true });
    console.log(`✅ Found ${vouchers.length} active vouchers\n`);

    // Analyze voucher-store links
    console.log('📊 Analyzing voucher-store links...\n');
    
    const vouchersWithoutStore = vouchers.filter(v => !v.store);
    const vouchersWithStore = vouchers.filter(v => v.store);
    
    console.log(`   📋 Total vouchers: ${vouchers.length}`);
    console.log(`   ✅ Vouchers with store links: ${vouchersWithStore.length}`);
    console.log(`   ⚠️  Vouchers without store links: ${vouchersWithoutStore.length}\n`);

    // Group vouchers by category
    const vouchersByCategory: { [key: string]: typeof vouchers } = {};
    vouchers.forEach(voucher => {
      const category = voucher.category.toLowerCase();
      if (!vouchersByCategory[category]) {
        vouchersByCategory[category] = [];
      }
      vouchersByCategory[category].push(voucher);
    });

    console.log('📊 Vouchers by Category:');
    Object.keys(vouchersByCategory).forEach(cat => {
      const withoutStore = vouchersByCategory[cat].filter(v => !v.store).length;
      const withStore = vouchersByCategory[cat].filter(v => v.store).length;
      console.log(`   ${cat}: ${vouchersByCategory[cat].length} vouchers (${withStore} linked, ${withoutStore} unlinked)`);
    });
    console.log('');

    // Categorize existing stores
    const storesByCategory: { [key: string]: typeof existingStores } = {};
    existingStores.forEach(store => {
      const storeName = store.name.toLowerCase();
      const storeSlug = store.slug.toLowerCase();
      
      // Match stores to categories
      const matchedCategories: string[] = [];
      
      if (storeName.includes('fashion') || storeName.includes('clothing') || storeName.includes('apparel') || 
          storeSlug.includes('fashion') || storeSlug.includes('style') || storeSlug.includes('boutique')) {
        matchedCategories.push('fashion');
      }
      if (storeName.includes('food') || storeName.includes('restaurant') || storeName.includes('cafe') ||
          storeName.includes('dining') || storeSlug.includes('food') || storeSlug.includes('bites') ||
          storeSlug.includes('pizza')) {
        matchedCategories.push('food');
      }
      if (storeName.includes('grocery') || storeName.includes('mart') || storeName.includes('supermarket') ||
          storeName.includes('market') || storeSlug.includes('grocery') || storeSlug.includes('mart') ||
          storeSlug.includes('market')) {
        matchedCategories.push('groceries');
      }
      if (storeName.includes('tech') || storeName.includes('electronics') || storeName.includes('digital') ||
          storeSlug.includes('tech') || storeSlug.includes('electronics')) {
        matchedCategories.push('electronics');
      }
      if (storeName.includes('beauty') || storeName.includes('cosmetic') || storeName.includes('salon') ||
          storeSlug.includes('beauty') || storeSlug.includes('cosmetic')) {
        matchedCategories.push('beauty');
      }
      if (storeName.includes('entertainment') || storeName.includes('movie') || storeName.includes('cinema') ||
          storeSlug.includes('entertainment') || storeSlug.includes('movie')) {
        matchedCategories.push('entertainment');
      }
      if (storeName.includes('travel') || storeSlug.includes('travel')) {
        matchedCategories.push('travel');
      }
      if (storeName.includes('sports') || storeName.includes('fitness') || storeSlug.includes('sports') ||
          storeSlug.includes('fitness')) {
        matchedCategories.push('sports');
      }
      if (storeName.includes('shopping') || storeName.includes('mall') || storeSlug.includes('shopping') ||
          storeSlug.includes('mall')) {
        matchedCategories.push('shopping');
      }

      // Assign to matched categories or default
      if (matchedCategories.length > 0) {
        matchedCategories.forEach(cat => {
          if (!storesByCategory[cat]) {
            storesByCategory[cat] = [];
          }
          storesByCategory[cat].push(store);
        });
      }
    });

    console.log('🏪 Stores by Category:');
    Object.keys(storesByCategory).forEach(cat => {
      console.log(`   ${cat}: ${storesByCategory[cat].length} stores`);
    });
    console.log('');

    // Create missing stores for categories
    console.log('🏗️  Creating missing stores...');
    let storesCreated = 0;
    const createdStoreIds: { [key: string]: mongoose.Types.ObjectId[] } = {};

    for (const category of Object.keys(vouchersByCategory)) {
      const vouchersInCategory = vouchersByCategory[category];
      const storesInCategory = storesByCategory[category] || [];
      const unlinkedVouchers = vouchersInCategory.filter(v => !v.store);
      
      // If we have unlinked vouchers and not enough stores, create new ones
      if (unlinkedVouchers.length > 0 && storesInCategory.length < 2) {
        const templates = storeTemplatesByCategory[category] || [];
        
        if (templates.length > 0) {
          // Get a category document for the store
          const categoryDoc = categories.find(c => 
            c.slug.toLowerCase() === category || 
            c.name.toLowerCase().includes(category)
          ) || categories[0];

          for (let i = storesInCategory.length; i < Math.min(2, templates.length); i++) {
            const template = templates[i];
            const slug = `${template.slug}-${Date.now()}-${i}`;
            
            // Check if store with similar name already exists
            const existing = await Store.findOne({ slug: template.slug });
            if (existing) {
              console.log(`   ⏭️  Store "${template.name}" already exists, skipping...`);
              if (!createdStoreIds[category]) {
                createdStoreIds[category] = [];
              }
              createdStoreIds[category].push(existing._id as mongoose.Types.ObjectId);
              continue;
            }

            const newStore = new Store({
              ...template,
              category: categoryDoc._id,
              operationalInfo: {
                hours: {
                  monday: { open: '10:00', close: '22:00', closed: false },
                  tuesday: { open: '10:00', close: '22:00', closed: false },
                  wednesday: { open: '10:00', close: '22:00', closed: false },
                  thursday: { open: '10:00', close: '22:00', closed: false },
                  friday: { open: '10:00', close: '22:00', closed: false },
                  saturday: { open: '10:00', close: '22:00', closed: false },
                  sunday: { open: '11:00', close: '21:00', closed: false }
                },
                deliveryTime: '45-60 mins',
                minimumOrder: template.offers?.minOrderAmount || 200,
                deliveryFee: 30,
                freeDeliveryAbove: (template.offers?.minOrderAmount || 200) * 2,
                acceptsWalletPayment: true,
                paymentMethods: ['cash', 'card', 'upi', 'wallet']
              }
            });

            try {
              const savedStore = await newStore.save();
              console.log(`   ✅ Created store: ${savedStore.name} (${category})`);
              storesCreated++;
              
              if (!createdStoreIds[category]) {
                createdStoreIds[category] = [];
              }
              createdStoreIds[category].push(savedStore._id as mongoose.Types.ObjectId);
              
              // Add to storesByCategory
              if (!storesByCategory[category]) {
                storesByCategory[category] = [];
              }
              storesByCategory[category].push(savedStore);
            } catch (error: any) {
              if (error.code === 11000) {
                console.log(`   ⚠️  Store with slug "${template.slug}" already exists, skipping...`);
              } else {
                console.error(`   ❌ Error creating store "${template.name}":`, error.message);
              }
            }
          }
        }
      }
    }

    console.log(`\n✅ Created ${storesCreated} new stores\n`);

    // Refresh stores list
    const allStores = await Store.find({ isActive: true });
    
    // Link vouchers to stores
    console.log('🔗 Linking vouchers to stores...');
    let vouchersLinked = 0;
    let vouchersUpdated = 0;

    for (const voucher of vouchersWithoutStore) {
      const category = voucher.category.toLowerCase();
      const availableStores = storesByCategory[category] || allStores;
      
      if (availableStores.length > 0) {
        // Pick a store (prefer stores in the same category)
        const storeIndex = Math.floor(Math.random() * availableStores.length);
        const selectedStore = availableStores[storeIndex];
        
        voucher.store = selectedStore._id as mongoose.Types.ObjectId;
        await voucher.save();
        vouchersLinked++;
        console.log(`   ✅ Linked "${voucher.name}" → "${selectedStore.name}" (${category})`);
      } else {
        // If no store in category, use any available store
        if (allStores.length > 0) {
          const storeIndex = Math.floor(Math.random() * allStores.length);
          const selectedStore = allStores[storeIndex];
          
          voucher.store = selectedStore._id as mongoose.Types.ObjectId;
          await voucher.save();
          vouchersLinked++;
          console.log(`   ✅ Linked "${voucher.name}" → "${selectedStore.name}" (fallback)`);
        }
      }
    }

    // Verify existing links are valid
    console.log('\n🔍 Verifying existing store links...');
    for (const voucher of vouchersWithStore) {
      const store = await Store.findById(voucher.store);
      if (!store || !store.isActive) {
        // Re-link to a valid store
        const category = voucher.category.toLowerCase();
        const availableStores = storesByCategory[category] || allStores.filter(s => s.isActive);
        
        if (availableStores.length > 0) {
          const storeIndex = Math.floor(Math.random() * availableStores.length);
          const selectedStore = availableStores[storeIndex];
          
          voucher.store = selectedStore._id as mongoose.Types.ObjectId;
          await voucher.save();
          vouchersUpdated++;
          console.log(`   🔄 Re-linked "${voucher.name}" → "${selectedStore.name}" (invalid store fixed)`);
        }
      }
    }

    console.log(`\n✅ Linked ${vouchersLinked} vouchers`);
    console.log(`🔄 Updated ${vouchersUpdated} invalid links\n`);

    // Final statistics
    console.log('📊 Final Statistics:\n');
    const finalVouchers = await VoucherBrand.find({ isActive: true }).populate('store', 'name slug');
    const finalVouchersWithStore = finalVouchers.filter(v => v.store);
    const finalVouchersWithoutStore = finalVouchers.filter(v => !v.store);
    
    console.log(`   📋 Total vouchers: ${finalVouchers.length}`);
    console.log(`   ✅ Vouchers with valid store links: ${finalVouchersWithStore.length}`);
    console.log(`   ⚠️  Vouchers without store links: ${finalVouchersWithoutStore.length}`);
    
    if (finalVouchersWithoutStore.length > 0) {
      console.log('\n   Unlinked vouchers:');
      finalVouchersWithoutStore.forEach(v => {
        console.log(`      - ${v.name} (${v.category})`);
      });
    }

    console.log('\n🔗 Store-Voucher Links Summary:');
    const linkStats: { [key: string]: number } = {};
    finalVouchersWithStore.forEach(v => {
      const store = v.store as any;
      const storeName = store?.name || 'Unknown';
      linkStats[storeName] = (linkStats[storeName] || 0) + 1;
    });
    
    Object.entries(linkStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([store, count]) => {
        console.log(`   ${store}: ${count} vouchers`);
      });

    console.log('\n✨ Voucher-Store verification and linking completed successfully!');

    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error verifying/linking vouchers:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  verifyAndLinkVoucherStores();
}

export default verifyAndLinkVoucherStores;

