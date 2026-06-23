const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };

// Define Store schema inline
const StoreSchema = new mongoose.Schema({}, { strict: false });
const Store = mongoose.model('Store', StoreSchema);

// Store data with complete information for MainStorePage
const storeUpdates = [
  {
    name: 'TechMart Electronics',
    updates: {
      description: 'Your one-stop shop for the latest electronics, gadgets, and tech accessories. Quality products with warranty and excellent after-sales service.',
      banner: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=1200&h=400&fit=crop',
      logo: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=200&h=200&fit=crop',
      videos: [
        {
          url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
          thumbnail: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400&h=300&fit=crop',
          title: 'TechMart Store Tour - Latest Gadgets',
          duration: 45
        },
        {
          url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
          thumbnail: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=400&h=300&fit=crop',
          title: 'New Arrivals - Smartphones & Laptops',
          duration: 30
        },
        {
          url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
          thumbnail: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=300&fit=crop',
          title: 'Customer Reviews & Testimonials',
          duration: 25
        }
      ],
      contact: {
        phone: '+91-11-2234-5678',
        email: 'info@techmart.com',
        website: 'www.techmart.com',
        whatsapp: '+91-98765-43210'
      },
      'ratings.average': 4.5,
      'ratings.count': 1250,
      'ratings.distribution.5': 800,
      'ratings.distribution.4': 300,
      'ratings.distribution.3': 100,
      'ratings.distribution.2': 30,
      'ratings.distribution.1': 20,
      'offers.cashback': 10,
      'offers.minOrderAmount': 500,
      'offers.maxCashback': 100,
      'offers.isPartner': true,
      'offers.partnerLevel': 'gold',
      'location.landmark': 'Near Connaught Place Metro',
      'operationalInfo.deliveryTime': '30-45 mins',
      'operationalInfo.minimumOrder': 500,
      'operationalInfo.deliveryFee': 40,
      'operationalInfo.freeDeliveryAbove': 1000,
      'operationalInfo.acceptsWalletPayment': true,
      'operationalInfo.paymentMethods': ['Cash', 'Card', 'UPI', 'Wallet', 'Net Banking'],
      tags: ['Electronics', 'Gadgets', 'Smartphones', 'Laptops', 'Accessories'],
      isVerified: true,
      isFeatured: true
    }
  },
  {
    name: 'Fashion Hub',
    updates: {
      description: 'Trendy fashion for everyone. From casual wear to formal attire, discover the latest styles and brands at unbeatable prices.',
      banner: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=1200&h=400&fit=crop',
      logo: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=200&h=200&fit=crop',
      videos: [
        {
          url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
          thumbnail: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400&h=300&fit=crop',
          title: 'Fashion Hub - New Collection 2025',
          duration: 40
        },
        {
          url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
          thumbnail: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400&h=300&fit=crop',
          title: 'Summer Fashion Trends',
          duration: 35
        }
      ],
      contact: {
        phone: '+91-11-2345-6789',
        email: 'hello@fashionhub.com',
        website: 'www.fashionhub.com',
        whatsapp: '+91-98765-43211'
      },
      'ratings.average': 4.3,
      'ratings.count': 980,
      'ratings.distribution.5': 600,
      'ratings.distribution.4': 250,
      'ratings.distribution.3': 80,
      'ratings.distribution.2': 30,
      'ratings.distribution.1': 20,
      'offers.cashback': 15,
      'offers.minOrderAmount': 800,
      'offers.maxCashback': 150,
      'offers.isPartner': true,
      'offers.partnerLevel': 'platinum',
      'location.landmark': 'Near India Gate',
      'operationalInfo.deliveryTime': '45-60 mins',
      'operationalInfo.minimumOrder': 800,
      'operationalInfo.deliveryFee': 50,
      'operationalInfo.freeDeliveryAbove': 1500,
      'operationalInfo.acceptsWalletPayment': true,
      'operationalInfo.paymentMethods': ['Cash', 'Card', 'UPI', 'Wallet'],
      tags: ['Fashion', 'Clothing', 'Accessories', 'Shoes', 'Bags'],
      isVerified: true,
      isFeatured: true
    }
  },
  {
    name: 'Sports Central',
    updates: {
      description: 'Your ultimate destination for sports equipment, fitness gear, and athletic wear. Quality products for all your sporting needs.',
      banner: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=1200&h=400&fit=crop',
      logo: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=200&h=200&fit=crop',
      videos: [
        {
          url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
          thumbnail: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400&h=300&fit=crop',
          title: 'Sports Central - Fitness Equipment Tour',
          duration: 50
        },
        {
          url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
          thumbnail: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&h=300&fit=crop',
          title: 'New Athletic Wear Collection',
          duration: 28
        }
      ],
      contact: {
        phone: '+91-11-2456-7890',
        email: 'support@sportscentral.com',
        website: 'www.sportscentral.com',
        whatsapp: '+91-98765-43212'
      },
      'ratings.average': 4.6,
      'ratings.count': 750,
      'ratings.distribution.5': 500,
      'ratings.distribution.4': 180,
      'ratings.distribution.3': 50,
      'ratings.distribution.2': 15,
      'ratings.distribution.1': 5,
      'offers.cashback': 8,
      'offers.minOrderAmount': 1000,
      'offers.maxCashback': 200,
      'offers.isPartner': true,
      'offers.partnerLevel': 'silver',
      'location.landmark': 'Near Nehru Stadium',
      'operationalInfo.deliveryTime': '40-55 mins',
      'operationalInfo.minimumOrder': 1000,
      'operationalInfo.deliveryFee': 60,
      'operationalInfo.freeDeliveryAbove': 2000,
      'operationalInfo.acceptsWalletPayment': true,
      'operationalInfo.paymentMethods': ['Cash', 'Card', 'UPI', 'Wallet', 'EMI'],
      tags: ['Sports', 'Fitness', 'Gym', 'Athletic Wear', 'Equipment'],
      isVerified: true,
      isFeatured: false
    }
  },
  {
    name: 'Foodie Paradise',
    updates: {
      description: 'Fresh groceries, organic produce, and gourmet food items delivered to your doorstep. Experience quality and freshness.',
      banner: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200&h=400&fit=crop',
      logo: 'https://images.unsplash.com/photo-1516594798947-e65505dbb29d?w=200&h=200&fit=crop',
      videos: [
        {
          url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
          thumbnail: 'https://images.unsplash.com/photo-1495195134817-aeb325a55b65?w=400&h=300&fit=crop',
          title: 'Fresh Produce & Organic Selection',
          duration: 38
        }
      ],
      contact: {
        phone: '+91-11-2567-8901',
        email: 'orders@foodieparadise.com',
        website: 'www.foodieparadise.com',
        whatsapp: '+91-98765-43213'
      },
      'ratings.average': 4.7,
      'ratings.count': 1580,
      'ratings.distribution.5': 1100,
      'ratings.distribution.4': 350,
      'ratings.distribution.3': 90,
      'ratings.distribution.2': 25,
      'ratings.distribution.1': 15,
      'offers.cashback': 5,
      'offers.minOrderAmount': 300,
      'offers.maxCashback': 50,
      'offers.isPartner': true,
      'offers.partnerLevel': 'gold',
      'location.landmark': 'Near INA Market',
      'operationalInfo.deliveryTime': '20-30 mins',
      'operationalInfo.minimumOrder': 300,
      'operationalInfo.deliveryFee': 30,
      'operationalInfo.freeDeliveryAbove': 500,
      'operationalInfo.acceptsWalletPayment': true,
      'operationalInfo.paymentMethods': ['Cash', 'Card', 'UPI', 'Wallet'],
      tags: ['Groceries', 'Food', 'Organic', 'Fresh Produce', 'Gourmet'],
      isVerified: true,
      isFeatured: true
    }
  },
  {
    name: 'BookWorld',
    updates: {
      description: 'A paradise for book lovers. Wide collection of books across all genres, stationery, and educational materials.',
      banner: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=1200&h=400&fit=crop',
      logo: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=200&h=200&fit=crop',
      videos: [
        {
          url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
          thumbnail: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&h=300&fit=crop',
          title: 'BookWorld Store Tour',
          duration: 42
        },
        {
          url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4',
          thumbnail: 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=400&h=300&fit=crop',
          title: 'New Arrivals - Best Sellers 2025',
          duration: 33
        }
      ],
      contact: {
        phone: '+91-11-2678-9012',
        email: 'hello@bookworld.com',
        website: 'www.bookworld.com',
        whatsapp: '+91-98765-43214'
      },
      'ratings.average': 4.4,
      'ratings.count': 650,
      'ratings.distribution.5': 400,
      'ratings.distribution.4': 180,
      'ratings.distribution.3': 50,
      'ratings.distribution.2': 15,
      'ratings.distribution.1': 5,
      'offers.cashback': 12,
      'offers.minOrderAmount': 400,
      'offers.maxCashback': 80,
      'offers.isPartner': true,
      'offers.partnerLevel': 'bronze',
      'location.landmark': 'Near Delhi University',
      'operationalInfo.deliveryTime': '35-50 mins',
      'operationalInfo.minimumOrder': 400,
      'operationalInfo.deliveryFee': 40,
      'operationalInfo.freeDeliveryAbove': 800,
      'operationalInfo.acceptsWalletPayment': true,
      'operationalInfo.paymentMethods': ['Cash', 'Card', 'UPI', 'Wallet'],
      tags: ['Books', 'Stationery', 'Education', 'Novels', 'Comics'],
      isVerified: true,
      isFeatured: false
    }
  }
];

async function seedStores() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    for (const storeUpdate of storeUpdates) {
      console.log(`🔄 Updating ${storeUpdate.name}...`);

      const result = await Store.updateOne(
        { name: storeUpdate.name },
        { $set: storeUpdate.updates },
        { runValidators: true }
      );

      if (result.matchedCount > 0) {
        console.log(`   ✅ Updated ${storeUpdate.name}`);
        console.log(`   📦 Added: ${storeUpdate.updates.videos?.length || 0} videos`);
        console.log(`   💰 Cashback: ${storeUpdate.updates['offers.cashback']}%`);
        console.log(`   ⭐ Rating: ${storeUpdate.updates['ratings.average']}/5.0`);
      } else {
        console.log(`   ⚠️  Store not found: ${storeUpdate.name}`);
      }
      console.log('');
    }

    // Verify updates
    console.log('\n📊 Verification:\n');
    const stores = await Store.find({ name: { $in: storeUpdates.map(s => s.name) } });

    stores.forEach(store => {
      console.log(`Store: ${store.name}`);
      console.log(`  Description: ${store.description ? '✅' : '❌'}`);
      console.log(`  Banner: ${store.banner ? '✅' : '❌'}`);
      console.log(`  Videos: ${store.videos?.length || 0}`);
      console.log(`  Contact: ${store.contact?.phone ? '✅' : '❌'}`);
      console.log(`  Cashback: ${store.offers?.cashback || 0}%`);
      console.log(`  Rating: ${store.ratings?.average || 0}/5.0 (${store.ratings?.count || 0} reviews)`);
      console.log(`  Tags: ${store.tags?.length || 0}`);
      console.log('');
    });

    await mongoose.connection.close();
    console.log('✅ Seeding completed successfully!');
    console.log('\n🎉 All stores now have:');
    console.log('   ✅ Descriptions');
    console.log('   ✅ Banners & Logos');
    console.log('   ✅ Videos (2-3 per store)');
    console.log('   ✅ Contact Information');
    console.log('   ✅ Cashback Offers');
    console.log('   ✅ Ratings & Reviews');
    console.log('   ✅ Tags & Categories');
    console.log('   ✅ Payment Methods');
    console.log('\n🚀 Ready for MainStorePage!');

  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err);
    process.exit(1);
  }
}

seedStores();
