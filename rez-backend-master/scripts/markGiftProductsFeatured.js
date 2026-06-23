const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };
const DB_NAME = 'test';

// Schemas
const CategorySchema = new mongoose.Schema({}, { strict: false });
const ProductSchema = new mongoose.Schema({}, { strict: false });

const Category = mongoose.model('Category', CategorySchema);
const Product = mongoose.model('Product', ProductSchema);

(async function markGiftProductsFeatured() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(`${MONGODB_URI}/${DB_NAME}`);
    console.log('✅ Connected to MongoDB\n');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎁 MARKING GIFT PRODUCTS AS FEATURED');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Find Gift category
    const giftCategory = await Category.findOne({ slug: 'gift' });
    
    if (!giftCategory) {
      console.log('❌ Gift category not found!');
      process.exit(0);
    }

    console.log(`✅ Found Gift category: ${giftCategory.name}\n`);

    // Find all Gift products
    const giftProducts = await Product.find({ 
      category: giftCategory._id,
      isActive: true
    });

    console.log(`📦 Found ${giftProducts.length} Gift products\n`);

    // Mark top 3-4 products as featured
    const productsToFeature = giftProducts.slice(0, 4);
    
    let featuredCount = 0;
    for (const product of productsToFeature) {
      if (!product.isFeatured) {
        await Product.findByIdAndUpdate(product._id, { isFeatured: true });
        console.log(`✅ Marked as featured: ${product.name}`);
        featuredCount++;
      } else {
        console.log(`⏭️  Already featured: ${product.name}`);
      }
    }

    // Also add some more gift products if we have less than 5
    if (giftProducts.length < 5) {
      console.log(`\n📦 Adding more Gift products...\n`);
      
      // Find Gift stores
      const Store = mongoose.model('Store', new mongoose.Schema({}, { strict: false }));
      const giftStores = await Store.find({
        $or: [
          { tags: { $in: ['gift', 'present', 'occasion'] } },
          { name: { $regex: /gift|present/i } }
        ],
        isActive: true
      }).limit(2);

      if (giftStores.length > 0) {
        const additionalProducts = [
          {
            name: 'Elegant Gift Basket',
            slug: 'elegant-gift-basket',
            description: 'Beautifully curated gift basket with premium items',
            brand: 'Gift Galaxy',
            category: giftCategory._id,
            store: giftStores[0]._id,
            sku: `GIFT-${Math.random().toString(36).substring(7).toUpperCase()}`,
            images: ['https://images.unsplash.com/photo-1519676867240-f03562e64548?w=500'],
            pricing: {
              base: 2499,
              selling: 1999,
              mrp: 2499,
              currency: 'INR',
              taxable: true,
            },
            inventory: {
              stock: 15,
              trackQuantity: true,
              allowBackorder: false,
              isAvailable: true,
              lowStockThreshold: 5,
            },
            ratings: {
              average: 4.7,
              count: 89,
            },
            tags: ['gift', 'basket', 'premium', 'elegant'],
            isFeatured: true,
            isActive: true,
          },
          {
            name: 'Flower Bouquet Gift Set',
            slug: 'flower-bouquet-gift-set',
            description: 'Fresh flowers with chocolates and greeting card',
            brand: 'Celebration Store',
            category: giftCategory._id,
            store: (giftStores[1] && giftStores[1]._id) || giftStores[0]._id,
            sku: `GIFT-${Math.random().toString(36).substring(7).toUpperCase()}`,
            images: ['https://images.unsplash.com/photo-1563241527-3004b5be2e05?w=500'],
            pricing: {
              base: 899,
              selling: 749,
              mrp: 899,
              currency: 'INR',
              taxable: true,
            },
            inventory: {
              stock: 20,
              trackQuantity: true,
              allowBackorder: false,
              isAvailable: true,
              lowStockThreshold: 5,
            },
            ratings: {
              average: 4.6,
              count: 124,
            },
            tags: ['gift', 'flowers', 'bouquet', 'fresh'],
            isFeatured: true,
            isActive: true,
          },
          {
            name: 'Gourmet Gift Collection',
            slug: 'gourmet-gift-collection',
            description: 'Premium gourmet foods and delicacies gift collection',
            brand: 'Gift Galaxy',
            category: giftCategory._id,
            store: giftStores[0]._id,
            sku: `GIFT-${Math.random().toString(36).substring(7).toUpperCase()}`,
            images: ['https://images.unsplash.com/photo-1519676867240-f03562e64548?w=500'],
            pricing: {
              base: 2999,
              selling: 2499,
              mrp: 2999,
              currency: 'INR',
              taxable: true,
            },
            inventory: {
              stock: 12,
              trackQuantity: true,
              allowBackorder: false,
              isAvailable: true,
              lowStockThreshold: 5,
            },
            ratings: {
              average: 4.8,
              count: 156,
            },
            tags: ['gift', 'gourmet', 'premium', 'delicacies'],
            isFeatured: true,
            isActive: true,
          },
        ];

        for (const productData of additionalProducts) {
          const existing = await Product.findOne({ slug: productData.slug });
          if (!existing) {
            await Product.create(productData);
            console.log(`✅ Created featured product: ${productData.name} - ₹${productData.pricing.selling}`);
            featuredCount++;
          } else {
            console.log(`⏭️  Product already exists: ${productData.name}`);
          }
        }
      }
    }

    // Update category product count
    const totalProducts = await Product.countDocuments({ category: giftCategory._id });
    await Category.findByIdAndUpdate(giftCategory._id, { productCount: totalProducts });

    const featuredProducts = await Product.countDocuments({ 
      category: giftCategory._id,
      isFeatured: true,
      isActive: true
    });

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ GIFT PRODUCTS UPDATED');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`⭐ Featured Products: ${featuredProducts}`);
    console.log(`📦 Total Products: ${totalProducts}`);
    console.log(`✅ Products marked/created: ${featuredCount}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
    process.exit(0);
  }
})();

