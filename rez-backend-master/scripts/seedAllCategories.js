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

// Category definitions with products and stores
const categoryDefinitions = {
  gift: {
    name: 'Gift',
    slug: 'gift',
    description: 'Thoughtful gifts for every occasion',
    icon: 'gift-outline',
    color: '#EC4899',
    tags: ['gift', 'present', 'occasion', 'celebration'],
    stores: [
      {
        name: 'Gift Galaxy',
        slug: 'gift-galaxy',
        description: 'Premium gifts and gift hampers for all occasions',
        tags: ['gift', 'present', 'occasion', 'premium'],
        cashback: 10,
        products: [
          { name: 'Premium Gift Hamper', price: 1999, selling: 1499, brand: 'Gift Galaxy', image: 'https://images.unsplash.com/photo-1519676867240-f03562e64548?w=500' },
          { name: 'Chocolate Gift Box', price: 999, selling: 799, brand: 'Sweet Treats', image: 'https://images.unsplash.com/photo-1606312619070-d48b4d7d5f34?w=500' },
          { name: 'Personalized Gift Set', price: 1499, selling: 1199, brand: 'Custom Gifts', image: 'https://images.unsplash.com/photo-1519676867240-f03562e64548?w=500' },
        ]
      },
      {
        name: 'Celebration Store',
        slug: 'celebration-store',
        description: 'Gifts for birthdays, anniversaries, and celebrations',
        tags: ['gift', 'celebration', 'birthday', 'anniversary'],
        cashback: 8,
        products: [
          { name: 'Birthday Gift Basket', price: 1299, selling: 999, brand: 'Celebration', image: 'https://images.unsplash.com/photo-1519676867240-f03562e64548?w=500' },
          { name: 'Anniversary Gift Set', price: 2499, selling: 1999, brand: 'Romance', image: 'https://images.unsplash.com/photo-1519676867240-f03562e64548?w=500' },
        ]
      }
    ]
  },
  restaurant: {
    name: 'Restaurant',
    slug: 'restaurant',
    description: 'Delicious food from top restaurants',
    icon: 'restaurant-outline',
    color: '#10B981',
    tags: ['restaurant', 'food', 'dining', 'cuisine'],
    stores: [
      {
        name: 'Spice Garden',
        slug: 'spice-garden',
        description: 'Authentic Indian cuisine with a modern twist',
        tags: ['restaurant', 'indian', 'spicy', 'traditional'],
        cashback: 12,
        products: [
          { name: 'Butter Chicken', price: 350, selling: 299, brand: 'Spice Garden', image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=500' },
          { name: 'Biryani Deluxe', price: 450, selling: 399, brand: 'Spice Garden', image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=500' },
          { name: 'Paneer Tikka', price: 280, selling: 249, brand: 'Spice Garden', image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=500' },
        ]
      },
      {
        name: 'Italian Corner',
        slug: 'italian-corner',
        description: 'Authentic Italian pasta and pizza',
        tags: ['restaurant', 'italian', 'pizza', 'pasta'],
        cashback: 10,
        products: [
          { name: 'Margherita Pizza', price: 400, selling: 349, brand: 'Italian Corner', image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=500' },
          { name: 'Spaghetti Carbonara', price: 450, selling: 399, brand: 'Italian Corner', image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=500' },
        ]
      }
    ]
  },
  electronics: {
    name: 'Electronics',
    slug: 'electronics',
    description: 'Latest electronics and gadgets',
    icon: 'phone-portrait-outline',
    color: '#3B82F6',
    tags: ['electronics', 'gadgets', 'tech', 'devices'],
    stores: [
      {
        name: 'Tech Hub',
        slug: 'tech-hub',
        description: 'Latest smartphones, laptops, and gadgets',
        tags: ['electronics', 'smartphone', 'laptop', 'gadgets'],
        cashback: 5,
        products: [
          { name: 'Wireless Bluetooth Earbuds', price: 389, selling: 299, brand: 'SoundMax', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500' },
          { name: 'Smart Watch Pro', price: 8999, selling: 7499, brand: 'TechWatch', image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500' },
          { name: 'Portable Power Bank', price: 1999, selling: 1499, brand: 'PowerMax', image: 'https://images.unsplash.com/photo-1609091839311-d5365f5be0d4?w=500' },
        ]
      },
      {
        name: 'Gadget Zone',
        slug: 'gadget-zone',
        description: 'Affordable electronics and accessories',
        tags: ['electronics', 'accessories', 'affordable', 'gadgets'],
        cashback: 8,
        products: [
          { name: 'USB-C Cable Pack', price: 499, selling: 399, brand: 'CablePro', image: 'https://images.unsplash.com/photo-1609091839311-d5365f5be0d4?w=500' },
          { name: 'Phone Case Premium', price: 899, selling: 699, brand: 'CaseGuard', image: 'https://images.unsplash.com/photo-1609091839311-d5365f5be0d4?w=500' },
        ]
      }
    ]
  },
  organic: {
    name: 'Organic',
    slug: 'organic',
    description: 'Organic and natural products',
    icon: 'leaf-outline',
    color: '#10B981',
    tags: ['organic', 'natural', 'healthy', 'eco-friendly'],
    stores: [
      {
        name: 'Organic Valley',
        slug: 'organic-valley',
        description: 'Fresh organic produce and products',
        tags: ['organic', 'fresh', 'natural', 'healthy'],
        cashback: 15,
        products: [
          { name: 'Organic Honey 500g', price: 599, selling: 499, brand: 'Pure Natural', image: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=500' },
          { name: 'Organic Green Tea', price: 399, selling: 349, brand: 'Tea Leaf', image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=500' },
          { name: 'Organic Turmeric Powder', price: 299, selling: 249, brand: 'Spice Pure', image: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=500' },
        ]
      },
      {
        name: 'Nature\'s Best',
        slug: 'natures-best',
        description: 'Premium organic products',
        tags: ['organic', 'premium', 'natural', 'eco-friendly'],
        cashback: 12,
        products: [
          { name: 'Organic Coconut Oil', price: 449, selling: 399, brand: 'Coconut Pure', image: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=500' },
          { name: 'Organic Jaggery 1kg', price: 199, selling: 169, brand: 'Sweet Natural', image: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=500' },
        ]
      }
    ]
  },
  grocery: {
    name: 'Grocery',
    slug: 'grocery',
    description: 'Daily groceries and essentials',
    icon: 'basket-outline',
    color: '#F59E0B',
    tags: ['grocery', 'essentials', 'daily', 'food'],
    stores: [
      {
        name: 'Fresh Mart',
        slug: 'fresh-mart',
        description: 'Your neighborhood grocery store',
        tags: ['grocery', 'fresh', 'daily', 'essentials'],
        cashback: 8,
        products: [
          { name: 'Premium Basmati Rice 5kg', price: 599, selling: 499, brand: 'Rice King', image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500' },
          { name: 'Toor Dal 1kg', price: 149, selling: 129, brand: 'Dal Pure', image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500' },
          { name: 'Cooking Oil 1L', price: 199, selling: 179, brand: 'Oil Fresh', image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500' },
        ]
      },
      {
        name: 'Quick Grocery',
        slug: 'quick-grocery',
        description: 'Fast delivery grocery service',
        tags: ['grocery', 'fast', 'delivery', 'essentials'],
        cashback: 10,
        products: [
          { name: 'Wheat Flour 5kg', price: 249, selling: 219, brand: 'Flour Fresh', image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500' },
          { name: 'Sugar 1kg', price: 49, selling: 45, brand: 'Sugar Pure', image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500' },
        ]
      }
    ]
  },
  medicine: {
    name: 'Medicine',
    slug: 'medicine',
    description: 'Pharmacy and healthcare products',
    icon: 'medical-outline',
    color: '#EF4444',
    tags: ['medicine', 'pharmacy', 'health', 'healthcare'],
    stores: [
      {
        name: 'Health Pharmacy',
        slug: 'health-pharmacy',
        description: 'Trusted pharmacy with all medicines',
        tags: ['medicine', 'pharmacy', 'health', 'trusted'],
        cashback: 5,
        products: [
          { name: 'Paracetamol 500mg (10 tablets)', price: 29, selling: 25, brand: 'MediCare', image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500' },
          { name: 'Vitamin D3 60k IU', price: 199, selling: 179, brand: 'VitaCare', image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500' },
          { name: 'Cough Syrup 100ml', price: 149, selling: 129, brand: 'CoughRelief', image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500' },
        ]
      },
      {
        name: 'Care Pharmacy',
        slug: 'care-pharmacy',
        description: 'Your health partner',
        tags: ['medicine', 'pharmacy', 'healthcare', 'care'],
        cashback: 6,
        products: [
          { name: 'Band-Aid Pack (20 strips)', price: 99, selling: 89, brand: 'BandAid', image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500' },
          { name: 'Thermometer Digital', price: 299, selling: 249, brand: 'TempCheck', image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500' },
        ]
      }
    ]
  },
  fruit: {
    name: 'Fruit',
    slug: 'fruit',
    description: 'Fresh fruits and vegetables',
    icon: 'nutrition-outline',
    color: '#10B981',
    tags: ['fruit', 'fresh', 'vegetables', 'healthy'],
    stores: [
      {
        name: 'Fresh Fruits Market',
        slug: 'fresh-fruits-market',
        description: 'Farm-fresh fruits and vegetables',
        tags: ['fruit', 'fresh', 'vegetables', 'farm'],
        cashback: 12,
        products: [
          { name: 'Fresh Apples 1kg', price: 149, selling: 129, brand: 'Farm Fresh', image: 'https://images.unsplash.com/photo-1567306226416-28d60e9f7d1c?w=500' },
          { name: 'Bananas 1 dozen', price: 79, selling: 69, brand: 'Farm Fresh', image: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=500' },
          { name: 'Fresh Oranges 1kg', price: 129, selling: 109, brand: 'Farm Fresh', image: 'https://images.unsplash.com/photo-1580052617918-b8c4d41a6a5d?w=500' },
        ]
      },
      {
        name: 'Veggie Basket',
        slug: 'veggie-basket',
        description: 'Fresh vegetables daily',
        tags: ['fruit', 'vegetables', 'fresh', 'daily'],
        cashback: 10,
        products: [
          { name: 'Fresh Tomatoes 1kg', price: 49, selling: 39, brand: 'Farm Fresh', image: 'https://images.unsplash.com/photo-1592841200221-2c1d3a0b0e9b?w=500' },
          { name: 'Potatoes 2kg', price: 89, selling: 79, brand: 'Farm Fresh', image: 'https://images.unsplash.com/photo-1518977822534-7049a61ee0c2?w=500' },
        ]
      }
    ]
  },
  meat: {
    name: 'Meat',
    slug: 'meat',
    description: 'Fresh meat and poultry',
    icon: 'restaurant',
    color: '#DC2626',
    tags: ['meat', 'poultry', 'fresh', 'protein'],
    stores: [
      {
        name: 'Fresh Meat Market',
        slug: 'fresh-meat-market',
        description: 'Premium fresh meat and poultry',
        tags: ['meat', 'poultry', 'fresh', 'premium'],
        cashback: 8,
        products: [
          { name: 'Chicken Breast 500g', price: 249, selling: 219, brand: 'Fresh Poultry', image: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=500' },
          { name: 'Mutton 1kg', price: 799, selling: 699, brand: 'Fresh Meat', image: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=500' },
          { name: 'Fish - Rohu 1kg', price: 299, selling: 269, brand: 'Fresh Fish', image: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=500' },
        ]
      },
      {
        name: 'Meat Express',
        slug: 'meat-express',
        description: 'Fresh meat delivery',
        tags: ['meat', 'fresh', 'delivery', 'express'],
        cashback: 10,
        products: [
          { name: 'Chicken Legs 500g', price: 199, selling: 179, brand: 'Fresh Poultry', image: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=500' },
          { name: 'Prawns 500g', price: 399, selling: 349, brand: 'Fresh Seafood', image: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=500' },
        ]
      }
    ]
  }
};

(async function seedAllCategories() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(`${MONGODB_URI}/${DB_NAME}`);
    console.log('✅ Connected to MongoDB\n');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🌱 SEEDING ALL CATEGORIES');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    let totalCategories = 0;
    let totalStores = 0;
    let totalProducts = 0;

    for (const [slug, catData] of Object.entries(categoryDefinitions)) {
      console.log(`\n📦 Processing Category: ${catData.name} (${slug})\n`);

      // Step 1: Create or get category
      let category = await Category.findOne({ slug });
      
      if (!category) {
        category = await Category.create({
          name: catData.name,
          slug: slug,
          description: catData.description,
          icon: catData.icon,
          image: `https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80`,
          bannerImage: `https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&q=80`,
          type: 'general',
          isActive: true,
          sortOrder: 0,
          metadata: {
            color: catData.color,
            tags: catData.tags,
            description: catData.description,
            featured: true
          }
        });
        console.log(`✅ Created category: ${category.name}`);
        totalCategories++;
      } else {
        console.log(`⏭️  Category already exists: ${category.name}`);
      }

      // Step 2: Create stores and products
      for (const storeData of catData.stores) {
        // Create store
        let store = await Store.findOne({ slug: storeData.slug });
        
        if (!store) {
          store = await Store.create({
            name: storeData.name,
            slug: storeData.slug,
            description: storeData.description,
            logo: `https://ui-avatars.com/api/?name=${encodeURIComponent(storeData.name)}&size=200&background=${catData.color.replace('#', '')}`,
            banner: `https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80`,
            tags: storeData.tags,
            isFeatured: true,
            isActive: true,
            isVerified: true,
            location: {
              address: 'BTM Layout, Bangalore',
              city: 'Bangalore',
              state: 'Karnataka',
              pincode: '560068',
              coordinates: [77.6100, 12.9352],
              deliveryRadius: 10,
              landmark: 'Near BTM Circle',
            },
            contact: {
              phone: '+91-80-1111-2222',
              email: `info@${storeData.slug.replace('-', '')}.com`,
            },
            ratings: {
              average: 4.5 + Math.random() * 0.3,
              count: Math.floor(Math.random() * 200) + 50,
            },
            offers: {
              cashback: storeData.cashback,
              minOrderAmount: 500,
              maxCashback: 500,
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
              minimumOrder: 500,
              deliveryFee: 0,
              acceptsWalletPayment: true,
              paymentMethods: ['cash', 'card', 'upi', 'wallet'],
            },
            deliveryCategories: {
              fastDelivery: false,
              budgetFriendly: true,
              premium: false,
              alliance: true,
            },
          });
          console.log(`   ✅ Created store: ${store.name}`);
          totalStores++;
        } else {
          console.log(`   ⏭️  Store already exists: ${store.name}`);
        }

        // Create products for this store
        for (const productData of storeData.products) {
          const existingProduct = await Product.findOne({ slug: productData.name.toLowerCase().replace(/\s+/g, '-') });
          
          if (!existingProduct) {
            const product = await Product.create({
              name: productData.name,
              slug: productData.name.toLowerCase().replace(/\s+/g, '-'),
              description: `${productData.name} - ${storeData.description}`,
              brand: productData.brand,
              category: category._id,
              store: store._id,
              sku: `${slug.toUpperCase()}-${Math.random().toString(36).substring(7).toUpperCase()}`,
              images: [productData.image],
              pricing: {
                base: productData.price,
                selling: productData.selling,
                mrp: productData.price,
                currency: 'INR',
                taxable: true,
              },
              inventory: {
                stock: Math.floor(Math.random() * 20) + 10,
                trackQuantity: true,
                allowBackorder: false,
                isAvailable: true,
                lowStockThreshold: 5,
              },
              ratings: {
                average: 4.0 + Math.random() * 0.8,
                count: Math.floor(Math.random() * 150) + 20,
              },
              tags: [...catData.tags, ...storeData.tags.slice(0, 2)],
              isFeatured: Math.random() > 0.5,
              isActive: true,
            });
            console.log(`      ✅ Created product: ${product.name} - ₹${product.pricing.selling}`);
            totalProducts++;
          } else {
            console.log(`      ⏭️  Product already exists: ${productData.name}`);
          }
        }
      }
    }

    // Update all category product counts
    console.log('\n📊 Updating category product counts...\n');
    for (const [slug] of Object.entries(categoryDefinitions)) {
      const category = await Category.findOne({ slug });
      if (category) {
        const productCount = await Product.countDocuments({ category: category._id });
        await Category.findByIdAndUpdate(category._id, { productCount });
        console.log(`   ${category.name}: ${productCount} products`);
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ ALL CATEGORIES SEEDED');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📦 Categories: ${totalCategories} created`);
    console.log(`🏪 Stores: ${totalStores} created`);
    console.log(`📦 Products: ${totalProducts} created`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
    process.exit(0);
  }
})();

