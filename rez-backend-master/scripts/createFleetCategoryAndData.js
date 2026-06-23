const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };
const DB_NAME = 'test';

// Schemas
const CategorySchema = new mongoose.Schema({}, { strict: false });
const ProductSchema = new mongoose.Schema({}, { strict: false });
const StoreSchema = new mongoose.Schema({}, { strict: false });

const Category = mongoose.model('Category', CategorySchema);
const Product = mongoose.model('Product', ProductSchema);
const Store = mongoose.model('Store', StoreSchema);

(async function createFleetCategoryAndData() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(`${MONGODB_URI}/${DB_NAME}`);
    console.log('✅ Connected to MongoDB\n');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🚗 CREATING FLEET MARKET DATA');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Step 1: Create Fleet Category
    console.log('📦 Step 1: Creating Fleet Category...\n');
    
    let fleetCategory = await Category.findOne({ slug: 'fleet' });
    
    if (!fleetCategory) {
      fleetCategory = await Category.create({
        name: 'Fleet Market',
        slug: 'fleet',
        description: 'Rent vehicles, cars, and transportation services',
        icon: 'car-outline',
        image: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800&q=80',
        bannerImage: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=1200&q=80',
        type: 'going_out',
        isActive: true,
        sortOrder: 3,
        metadata: {
          color: '#3B82F6',
          tags: ['fleet', 'car', 'vehicle', 'rental', 'transportation'],
          description: 'Vehicle rentals and fleet services',
          featured: true
        }
      });
      console.log(`✅ Created Fleet category: ${fleetCategory.name} (${fleetCategory.slug})`);
    } else {
      console.log(`✅ Fleet category already exists: ${fleetCategory.name}`);
    }

    // Step 2: Create Fleet Stores
    console.log('\n📦 Step 2: Creating Fleet Stores...\n');

    const fleetStores = [
      {
        name: 'Bond Street Rentals',
        slug: 'bond-street-rentals',
        description: 'Premium car rentals for comfort and style',
        logo: 'https://ui-avatars.com/api/?name=Bond+Street&size=200&background=DC2626',
        banner: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800&q=80',
        tags: ['fleet', 'car', 'rental', 'premium', 'sedan', 'luxury'],
        isFeatured: true,
        isActive: true,
        isVerified: true,
        location: {
          address: 'BTM Layout, Bangalore',
          city: 'Bangalore',
          state: 'Karnataka',
          pincode: '560068',
          coordinates: [77.6100, 12.9352],
          deliveryRadius: 15,
          landmark: 'Near BTM Circle',
        },
        contact: {
          phone: '+91-80-2222-3333',
          email: 'info@bondstreet.com',
          website: 'www.bondstreet.com',
        },
        ratings: {
          average: 4.6,
          count: 234,
        },
        offers: {
          cashback: 8,
          minOrderAmount: 1000,
          maxCashback: 500,
          isPartner: true,
          partnerLevel: 'gold'
        },
        operationalInfo: {
          hours: {
            monday: { open: '08:00', close: '20:00', closed: false },
            tuesday: { open: '08:00', close: '20:00', closed: false },
            wednesday: { open: '08:00', close: '20:00', closed: false },
            thursday: { open: '08:00', close: '20:00', closed: false },
            friday: { open: '08:00', close: '20:00', closed: false },
            saturday: { open: '08:00', close: '20:00', closed: false },
            sunday: { open: '09:00', close: '18:00', closed: false },
          },
          deliveryTime: 'Same day',
          minimumOrder: 1000,
          deliveryFee: 0,
          freeDeliveryAbove: 0,
          acceptsWalletPayment: true,
          paymentMethods: ['cash', 'card', 'upi', 'wallet', 'netbanking'],
        },
        deliveryCategories: {
          fastDelivery: false,
          budgetFriendly: false,
          ninetyNineStore: false,
          premium: true,
          organic: false,
          alliance: true,
        },
      },
      {
        name: 'Adventure Rentals',
        slug: 'adventure-rentals',
        description: 'SUV rentals for family trips and adventures',
        logo: 'https://ui-avatars.com/api/?name=Adventure&size=200&background=10B981',
        banner: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80',
        tags: ['fleet', 'car', 'rental', 'suv', 'adventure', 'family'],
        isFeatured: true,
        isActive: true,
        isVerified: true,
        location: {
          address: 'Indiranagar, Bangalore',
          city: 'Bangalore',
          state: 'Karnataka',
          pincode: '560038',
          coordinates: [77.6400, 12.9719],
          deliveryRadius: 12,
          landmark: 'Near Indiranagar Metro',
        },
        contact: {
          phone: '+91-80-4444-5555',
          email: 'info@adventurerentals.com',
          website: 'www.adventurerentals.com',
        },
        ratings: {
          average: 4.7,
          count: 189,
        },
        offers: {
          cashback: 6,
          minOrderAmount: 2000,
          maxCashback: 800,
          isPartner: true,
          partnerLevel: 'silver'
        },
        operationalInfo: {
          hours: {
            monday: { open: '08:00', close: '20:00', closed: false },
            tuesday: { open: '08:00', close: '20:00', closed: false },
            wednesday: { open: '08:00', close: '20:00', closed: false },
            thursday: { open: '08:00', close: '20:00', closed: false },
            friday: { open: '08:00', close: '20:00', closed: false },
            saturday: { open: '08:00', close: '20:00', closed: false },
            sunday: { open: '09:00', close: '18:00', closed: false },
          },
          deliveryTime: 'Same day',
          minimumOrder: 2000,
          deliveryFee: 0,
          freeDeliveryAbove: 0,
          acceptsWalletPayment: true,
          paymentMethods: ['cash', 'card', 'upi', 'wallet', 'netbanking'],
        },
        deliveryCategories: {
          fastDelivery: false,
          budgetFriendly: false,
          ninetyNineStore: false,
          premium: true,
          organic: false,
          alliance: true,
        },
      },
    ];

    const createdStores = [];
    for (const storeData of fleetStores) {
      let store = await Store.findOne({ slug: storeData.slug });
      
      if (!store) {
        store = await Store.create(storeData);
        console.log(`✅ Created store: ${store.name}`);
        createdStores.push(store);
      } else {
        console.log(`⏭️  Store already exists: ${store.name}`);
        createdStores.push(store);
      }
    }

    // Step 3: Create Fleet Products
    console.log('\n📦 Step 3: Creating Fleet Products...\n');

    const bondStreetStore = createdStores.find(s => s.slug === 'bond-street-rentals');
    const adventureStore = createdStores.find(s => s.slug === 'adventure-rentals');

    const fleetProducts = [
      // Bond Street Products
      {
        name: 'Honda City Sedan Rental',
        slug: 'honda-city-sedan-rental',
        description: 'Comfortable sedan perfect for city rides and long trips',
        brand: 'Honda',
        category: fleetCategory._id,
        store: bondStreetStore._id,
        sku: `FLEET-${Math.random().toString(36).substring(7).toUpperCase()}`,
        images: ['https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=500'],
        pricing: {
          base: 3000,
          selling: 2500,
          mrp: 3000,
          currency: 'INR',
          taxable: true,
        },
        inventory: {
          stock: 5,
          trackQuantity: true,
          allowBackorder: false,
          isAvailable: true,
          lowStockThreshold: 2,
        },
        ratings: {
          average: 4.6,
          count: 234,
        },
        tags: ['sedan', 'honda', 'city', 'comfortable', 'premium'],
        isFeatured: true,
        isActive: true,
      },
      {
        name: 'Toyota Camry Premium Rental',
        slug: 'toyota-camry-premium-rental',
        description: 'Luxury sedan for executive travel and business trips',
        brand: 'Toyota',
        category: fleetCategory._id,
        store: bondStreetStore._id,
        sku: `FLEET-${Math.random().toString(36).substring(7).toUpperCase()}`,
        images: ['https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=500'],
        pricing: {
          base: 5000,
          selling: 4500,
          mrp: 5000,
          currency: 'INR',
          taxable: true,
        },
        inventory: {
          stock: 3,
          trackQuantity: true,
          allowBackorder: false,
          isAvailable: true,
          lowStockThreshold: 1,
        },
        ratings: {
          average: 4.8,
          count: 156,
        },
        tags: ['sedan', 'toyota', 'premium', 'luxury', 'executive'],
        isFeatured: true,
        isActive: true,
      },
      {
        name: 'Maruti Swift Hatchback Rental',
        slug: 'maruti-swift-hatchback-rental',
        description: 'Compact and fuel-efficient for city commuting',
        brand: 'Maruti',
        category: fleetCategory._id,
        store: bondStreetStore._id,
        sku: `FLEET-${Math.random().toString(36).substring(7).toUpperCase()}`,
        images: ['https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=500'],
        pricing: {
          base: 1800,
          selling: 1500,
          mrp: 1800,
          currency: 'INR',
          taxable: true,
        },
        inventory: {
          stock: 8,
          trackQuantity: true,
          allowBackorder: false,
          isAvailable: true,
          lowStockThreshold: 3,
        },
        ratings: {
          average: 4.4,
          count: 98,
        },
        tags: ['hatchback', 'maruti', 'compact', 'fuel-efficient', 'economy'],
        isFeatured: false,
        isActive: true,
      },
      // Adventure Rentals Products
      {
        name: 'Toyota Fortuner SUV Rental',
        slug: 'toyota-fortuner-suv-rental',
        description: 'Powerful SUV perfect for family trips and adventures',
        brand: 'Toyota',
        category: fleetCategory._id,
        store: adventureStore._id,
        sku: `FLEET-${Math.random().toString(36).substring(7).toUpperCase()}`,
        images: ['https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=500'],
        pricing: {
          base: 6000,
          selling: 5500,
          mrp: 6000,
          currency: 'INR',
          taxable: true,
        },
        inventory: {
          stock: 4,
          trackQuantity: true,
          allowBackorder: false,
          isAvailable: true,
          lowStockThreshold: 2,
        },
        ratings: {
          average: 4.7,
          count: 189,
        },
        tags: ['suv', 'toyota', 'fortuner', 'family', 'adventure'],
        isFeatured: true,
        isActive: true,
      },
      {
        name: 'Mahindra XUV500 Rental',
        slug: 'mahindra-xuv500-rental',
        description: 'Spacious 7-seater SUV for large family trips',
        brand: 'Mahindra',
        category: fleetCategory._id,
        store: adventureStore._id,
        sku: `FLEET-${Math.random().toString(36).substring(7).toUpperCase()}`,
        images: ['https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=500'],
        pricing: {
          base: 5500,
          selling: 5000,
          mrp: 5500,
          currency: 'INR',
          taxable: true,
        },
        inventory: {
          stock: 3,
          trackQuantity: true,
          allowBackorder: false,
          isAvailable: true,
          lowStockThreshold: 1,
        },
        ratings: {
          average: 4.5,
          count: 145,
        },
        tags: ['suv', 'mahindra', 'xuv500', '7-seater', 'family'],
        isFeatured: true,
        isActive: true,
      },
      {
        name: 'Hyundai Creta SUV Rental',
        slug: 'hyundai-creta-suv-rental',
        description: 'Modern compact SUV for city and highway drives',
        brand: 'Hyundai',
        category: fleetCategory._id,
        store: adventureStore._id,
        sku: `FLEET-${Math.random().toString(36).substring(7).toUpperCase()}`,
        images: ['https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=500'],
        pricing: {
          base: 4000,
          selling: 3500,
          mrp: 4000,
          currency: 'INR',
          taxable: true,
        },
        inventory: {
          stock: 6,
          trackQuantity: true,
          allowBackorder: false,
          isAvailable: true,
          lowStockThreshold: 2,
        },
        ratings: {
          average: 4.6,
          count: 201,
        },
        tags: ['suv', 'hyundai', 'creta', 'compact', 'modern'],
        isFeatured: true,
        isActive: true,
      },
    ];

    let createdProducts = 0;
    let skippedProducts = 0;

    for (const productData of fleetProducts) {
      const existing = await Product.findOne({ slug: productData.slug });
      
      if (!existing) {
        await Product.create(productData);
        console.log(`✅ Created product: ${productData.name} - ₹${productData.pricing.selling}`);
        createdProducts++;
      } else {
        console.log(`⏭️  Product already exists: ${productData.name}`);
        skippedProducts++;
      }
    }

    // Update category product count
    const totalProducts = await Product.countDocuments({ category: fleetCategory._id });
    await Category.findByIdAndUpdate(fleetCategory._id, { productCount: totalProducts });

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ FLEET MARKET DATA CREATED');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📦 Category: 1 (Fleet Market)`);
    console.log(`🏪 Stores: ${createdStores.length}`);
    console.log(`🚗 Products: ${createdProducts} created, ${skippedProducts} skipped`);
    console.log(`📊 Total Products in Fleet: ${totalProducts}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
    process.exit(0);
  }
})();

