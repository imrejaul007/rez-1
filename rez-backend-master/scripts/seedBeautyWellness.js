/**
 * Seed Beauty & Wellness Data
 * Creates stores and products for beauty, salon, spa, wellness, skincare, haircare categories
 */

const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };

// Define schemas inline with flexible structure
const StoreSchema = new mongoose.Schema({}, { strict: false });
const ProductSchema = new mongoose.Schema({}, { strict: false });

const Store = mongoose.models.Store || mongoose.model('Store', StoreSchema);
const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

// Beauty & Wellness Stores
const beautyStores = [
  // Salons
  {
    name: 'Glamour Studio',
    slug: 'glamour-studio',
    description: 'Premium hair salon offering cutting, styling, coloring, and hair treatments by expert stylists.',
    banner: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1200&h=400&fit=crop',
    logo: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=200&h=200&fit=crop',
    tags: ['salon', 'beauty', 'hair', 'haircut', 'styling', 'coloring'],
    category: { name: 'Salon', slug: 'salon' },
    contact: {
      phone: '+91-11-2345-6001',
      email: 'info@glamourstudio.com',
      website: 'www.glamourstudio.com',
      whatsapp: '+91-98765-00001'
    },
    location: {
      address: '123 Fashion Street, Connaught Place',
      city: 'New Delhi',
      state: 'Delhi',
      pincode: '110001',
      coordinates: [77.2195, 28.6329]
    },
    ratings: {
      average: 4.7,
      count: 856,
      distribution: { 5: 550, 4: 200, 3: 70, 2: 25, 1: 11 }
    },
    offers: {
      cashback: { percentage: 20 },
      minOrderAmount: 500,
      maxCashback: 200,
      isPartner: true,
      partnerLevel: 'gold'
    },
    operationalInfo: {
      deliveryTime: 'Walk-in / Appointment',
      openTime: '10:00 AM',
      closeTime: '9:00 PM',
      acceptsWalletPayment: true,
      paymentMethods: ['Cash', 'Card', 'UPI', 'Wallet']
    },
    isVerified: true,
    isFeatured: true,
    isActive: true
  },
  {
    name: 'Luxe Hair Lounge',
    slug: 'luxe-hair-lounge',
    description: 'High-end hair salon specializing in bridal makeup, hair extensions, and luxury treatments.',
    banner: 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=1200&h=400&fit=crop',
    logo: 'https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?w=200&h=200&fit=crop',
    tags: ['salon', 'beauty', 'hair', 'bridal', 'makeup', 'luxury'],
    category: { name: 'Salon', slug: 'salon' },
    contact: {
      phone: '+91-11-2345-6002',
      email: 'book@luxehairlounge.com',
      whatsapp: '+91-98765-00002'
    },
    location: {
      address: '45 Beauty Lane, South Extension',
      city: 'New Delhi',
      state: 'Delhi',
      pincode: '110049',
      coordinates: [77.2273, 28.5706]
    },
    ratings: {
      average: 4.8,
      count: 1245,
      distribution: { 5: 900, 4: 250, 3: 60, 2: 25, 1: 10 }
    },
    offers: {
      cashback: { percentage: 25 },
      minOrderAmount: 1000,
      maxCashback: 500,
      isPartner: true,
      partnerLevel: 'platinum'
    },
    operationalInfo: {
      deliveryTime: 'Appointment Only',
      openTime: '10:00 AM',
      closeTime: '8:00 PM',
      acceptsWalletPayment: true,
      paymentMethods: ['Cash', 'Card', 'UPI', 'Wallet']
    },
    isVerified: true,
    isFeatured: true,
    isActive: true
  },
  {
    name: 'Style Point Unisex Salon',
    slug: 'style-point-unisex',
    description: 'Modern unisex salon offering haircuts, grooming, facials, and beauty services for all.',
    banner: 'https://images.unsplash.com/photo-1633681926022-84c23e8cb2d6?w=1200&h=400&fit=crop',
    logo: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=200&h=200&fit=crop',
    tags: ['salon', 'beauty', 'hair', 'unisex', 'grooming', 'facial'],
    category: { name: 'Salon', slug: 'salon' },
    contact: {
      phone: '+91-11-2345-6003',
      email: 'hello@stylepoint.com',
      whatsapp: '+91-98765-00003'
    },
    location: {
      address: '78 Market Road, Karol Bagh',
      city: 'New Delhi',
      state: 'Delhi',
      pincode: '110005',
      coordinates: [77.1902, 28.6519]
    },
    ratings: {
      average: 4.5,
      count: 623,
      distribution: { 5: 380, 4: 150, 3: 60, 2: 23, 1: 10 }
    },
    offers: {
      cashback: { percentage: 15 },
      minOrderAmount: 300,
      maxCashback: 150,
      isPartner: true,
      partnerLevel: 'silver'
    },
    operationalInfo: {
      deliveryTime: 'Walk-in Welcome',
      openTime: '9:00 AM',
      closeTime: '9:00 PM',
      acceptsWalletPayment: true,
      paymentMethods: ['Cash', 'Card', 'UPI', 'Wallet']
    },
    isVerified: true,
    isFeatured: false,
    isActive: true
  },

  // Spas
  {
    name: 'Serenity Spa & Wellness',
    slug: 'serenity-spa',
    description: 'Luxury spa offering full body massages, aromatherapy, and holistic wellness treatments.',
    banner: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=1200&h=400&fit=crop',
    logo: 'https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=200&h=200&fit=crop',
    tags: ['spa', 'massage', 'wellness', 'aromatherapy', 'relaxation'],
    category: { name: 'Spa', slug: 'spa' },
    contact: {
      phone: '+91-11-2345-7001',
      email: 'relax@serenityspa.com',
      whatsapp: '+91-98765-10001'
    },
    location: {
      address: '234 Wellness Park, Vasant Kunj',
      city: 'New Delhi',
      state: 'Delhi',
      pincode: '110070',
      coordinates: [77.1537, 28.5184]
    },
    ratings: {
      average: 4.9,
      count: 2150,
      distribution: { 5: 1800, 4: 280, 3: 50, 2: 15, 1: 5 }
    },
    offers: {
      cashback: { percentage: 30 },
      minOrderAmount: 1500,
      maxCashback: 750,
      isPartner: true,
      partnerLevel: 'platinum'
    },
    operationalInfo: {
      deliveryTime: 'Appointment Required',
      openTime: '10:00 AM',
      closeTime: '10:00 PM',
      acceptsWalletPayment: true,
      paymentMethods: ['Cash', 'Card', 'UPI', 'Wallet']
    },
    isVerified: true,
    isFeatured: true,
    isActive: true
  },
  {
    name: 'Thai Bliss Spa',
    slug: 'thai-bliss-spa',
    description: 'Authentic Thai massage and spa treatments by trained therapists from Thailand.',
    banner: 'https://images.unsplash.com/photo-1519823551278-64ac92734fb1?w=1200&h=400&fit=crop',
    logo: 'https://images.unsplash.com/photo-1596178060810-72f53ce9a65c?w=200&h=200&fit=crop',
    tags: ['spa', 'massage', 'thai', 'wellness', 'therapy'],
    category: { name: 'Spa', slug: 'spa' },
    contact: {
      phone: '+91-11-2345-7002',
      email: 'book@thaiblissspa.com',
      whatsapp: '+91-98765-10002'
    },
    location: {
      address: '56 Relaxation Road, Greater Kailash',
      city: 'New Delhi',
      state: 'Delhi',
      pincode: '110048',
      coordinates: [77.2423, 28.5467]
    },
    ratings: {
      average: 4.6,
      count: 890,
      distribution: { 5: 580, 4: 220, 3: 60, 2: 20, 1: 10 }
    },
    offers: {
      cashback: { percentage: 22 },
      minOrderAmount: 1200,
      maxCashback: 400,
      isPartner: true,
      partnerLevel: 'gold'
    },
    operationalInfo: {
      deliveryTime: 'Walk-in / Appointment',
      openTime: '11:00 AM',
      closeTime: '9:00 PM',
      acceptsWalletPayment: true,
      paymentMethods: ['Cash', 'Card', 'UPI', 'Wallet']
    },
    isVerified: true,
    isFeatured: true,
    isActive: true
  },
  {
    name: 'Ayurveda Healing Center',
    slug: 'ayurveda-healing',
    description: 'Traditional Ayurvedic treatments, Panchakarma therapy, and natural wellness solutions.',
    banner: 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=1200&h=400&fit=crop',
    logo: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=200&h=200&fit=crop',
    tags: ['spa', 'ayurveda', 'wellness', 'massage', 'natural', 'therapy'],
    category: { name: 'Spa', slug: 'spa' },
    contact: {
      phone: '+91-11-2345-7003',
      email: 'heal@ayurvedacenter.com',
      whatsapp: '+91-98765-10003'
    },
    location: {
      address: '89 Healing Way, Hauz Khas',
      city: 'New Delhi',
      state: 'Delhi',
      pincode: '110016',
      coordinates: [77.2065, 28.5494]
    },
    ratings: {
      average: 4.7,
      count: 567,
      distribution: { 5: 400, 4: 120, 3: 30, 2: 12, 1: 5 }
    },
    offers: {
      cashback: { percentage: 18 },
      minOrderAmount: 800,
      maxCashback: 300,
      isPartner: true,
      partnerLevel: 'gold'
    },
    operationalInfo: {
      deliveryTime: 'Consultation + Treatment',
      openTime: '9:00 AM',
      closeTime: '7:00 PM',
      acceptsWalletPayment: true,
      paymentMethods: ['Cash', 'Card', 'UPI', 'Wallet']
    },
    isVerified: true,
    isFeatured: false,
    isActive: true
  },

  // Wellness Centers
  {
    name: 'Zen Yoga Studio',
    slug: 'zen-yoga-studio',
    description: 'Modern yoga studio offering Hatha, Vinyasa, Power Yoga, and meditation classes.',
    banner: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=1200&h=400&fit=crop',
    logo: 'https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?w=200&h=200&fit=crop',
    tags: ['wellness', 'yoga', 'meditation', 'fitness', 'mindfulness'],
    category: { name: 'Wellness', slug: 'wellness' },
    contact: {
      phone: '+91-11-2345-8001',
      email: 'namaste@zenyoga.com',
      whatsapp: '+91-98765-20001'
    },
    location: {
      address: '12 Peace Garden, Saket',
      city: 'New Delhi',
      state: 'Delhi',
      pincode: '110017',
      coordinates: [77.2177, 28.5245]
    },
    ratings: {
      average: 4.8,
      count: 1320,
      distribution: { 5: 1000, 4: 250, 3: 50, 2: 15, 1: 5 }
    },
    offers: {
      cashback: { percentage: 15 },
      minOrderAmount: 500,
      maxCashback: 200,
      isPartner: true,
      partnerLevel: 'silver'
    },
    operationalInfo: {
      deliveryTime: 'Class Schedule Available',
      openTime: '6:00 AM',
      closeTime: '8:00 PM',
      acceptsWalletPayment: true,
      paymentMethods: ['Cash', 'Card', 'UPI', 'Wallet']
    },
    isVerified: true,
    isFeatured: true,
    isActive: true
  },
  {
    name: 'Mind Body Soul Center',
    slug: 'mind-body-soul',
    description: 'Holistic wellness center with yoga, meditation, counseling, and alternative therapies.',
    banner: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=1200&h=400&fit=crop',
    logo: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=200&h=200&fit=crop',
    tags: ['wellness', 'yoga', 'meditation', 'therapy', 'counseling', 'holistic'],
    category: { name: 'Wellness', slug: 'wellness' },
    contact: {
      phone: '+91-11-2345-8002',
      email: 'wellness@mindbodysoul.com',
      whatsapp: '+91-98765-20002'
    },
    location: {
      address: '34 Harmony Street, Defence Colony',
      city: 'New Delhi',
      state: 'Delhi',
      pincode: '110024',
      coordinates: [77.2322, 28.5729]
    },
    ratings: {
      average: 4.6,
      count: 456,
      distribution: { 5: 300, 4: 110, 3: 30, 2: 11, 1: 5 }
    },
    offers: {
      cashback: { percentage: 12 },
      minOrderAmount: 600,
      maxCashback: 150,
      isPartner: true,
      partnerLevel: 'silver'
    },
    operationalInfo: {
      deliveryTime: 'Sessions by Appointment',
      openTime: '7:00 AM',
      closeTime: '9:00 PM',
      acceptsWalletPayment: true,
      paymentMethods: ['Cash', 'Card', 'UPI', 'Wallet']
    },
    isVerified: true,
    isFeatured: false,
    isActive: true
  }
];

// Beauty Products
const beautyProducts = [
  // Skincare
  {
    name: 'Vitamin C Brightening Serum',
    slug: 'vitamin-c-brightening-serum',
    description: '20% Vitamin C serum for bright, glowing skin. Reduces dark spots and uneven skin tone.',
    images: [
      { url: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400', alt: 'Vitamin C Serum' }
    ],
    tags: ['skincare', 'serum', 'vitamin-c', 'beauty', 'brightening'],
    brand: { name: 'Glow Essentials', slug: 'glow-essentials' },
    category: { name: 'Skincare', slug: 'skincare' },
    pricing: { basePrice: 1299, salePrice: 999 },
    ratings: { average: 4.7, count: 2456 },
    cashback: { percentage: 12 },
    isActive: true
  },
  {
    name: 'Hyaluronic Acid Moisturizer',
    slug: 'hyaluronic-acid-moisturizer',
    description: 'Deep hydrating moisturizer with Hyaluronic Acid for plump, youthful skin.',
    images: [
      { url: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400', alt: 'Moisturizer' }
    ],
    tags: ['skincare', 'moisturizer', 'hyaluronic', 'beauty', 'hydrating'],
    brand: { name: 'Hydra Skin', slug: 'hydra-skin' },
    category: { name: 'Skincare', slug: 'skincare' },
    pricing: { basePrice: 899, salePrice: 749 },
    ratings: { average: 4.5, count: 1823 },
    cashback: { percentage: 10 },
    isActive: true
  },
  {
    name: 'Retinol Anti-Aging Night Cream',
    slug: 'retinol-anti-aging-cream',
    description: 'Advanced retinol formula for reducing fine lines and wrinkles while you sleep.',
    images: [
      { url: 'https://images.unsplash.com/photo-1570194065650-d99fb4b38b15?w=400', alt: 'Night Cream' }
    ],
    tags: ['skincare', 'retinol', 'anti-aging', 'beauty', 'night-cream'],
    brand: { name: 'Age Defy', slug: 'age-defy' },
    category: { name: 'Skincare', slug: 'skincare' },
    pricing: { basePrice: 1599, salePrice: 1299 },
    ratings: { average: 4.6, count: 987 },
    cashback: { percentage: 15 },
    isActive: true
  },
  {
    name: 'Niacinamide Pore Minimizer',
    slug: 'niacinamide-pore-minimizer',
    description: '10% Niacinamide serum to minimize pores and control excess oil production.',
    images: [
      { url: 'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=400', alt: 'Niacinamide Serum' }
    ],
    tags: ['skincare', 'niacinamide', 'serum', 'beauty', 'pore-care'],
    brand: { name: 'Clear Skin', slug: 'clear-skin' },
    category: { name: 'Skincare', slug: 'skincare' },
    pricing: { basePrice: 799, salePrice: 649 },
    ratings: { average: 4.4, count: 1567 },
    cashback: { percentage: 8 },
    isActive: true
  },

  // Makeup / Cosmetics
  {
    name: 'Matte Liquid Lipstick - Ruby Red',
    slug: 'matte-liquid-lipstick-ruby',
    description: 'Long-lasting matte liquid lipstick in stunning Ruby Red shade. Smudge-proof formula.',
    images: [
      { url: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=400', alt: 'Red Lipstick' }
    ],
    tags: ['makeup', 'lipstick', 'cosmetics', 'beauty', 'matte'],
    brand: { name: 'Color Pop', slug: 'color-pop' },
    category: { name: 'Makeup', slug: 'makeup' },
    pricing: { basePrice: 599, salePrice: 449 },
    ratings: { average: 4.8, count: 3456 },
    cashback: { percentage: 10 },
    isActive: true
  },
  {
    name: 'Full Coverage Foundation',
    slug: 'full-coverage-foundation',
    description: 'Buildable full coverage foundation with SPF 15. Available in 24 shades.',
    images: [
      { url: 'https://images.unsplash.com/photo-1631214524115-f04da804a0e2?w=400', alt: 'Foundation' }
    ],
    tags: ['makeup', 'foundation', 'cosmetics', 'beauty', 'coverage'],
    brand: { name: 'Perfect Base', slug: 'perfect-base' },
    category: { name: 'Makeup', slug: 'makeup' },
    pricing: { basePrice: 1299, salePrice: 999 },
    ratings: { average: 4.5, count: 2123 },
    cashback: { percentage: 12 },
    isActive: true
  },
  {
    name: 'Volumizing Mascara',
    slug: 'volumizing-mascara',
    description: 'Dramatic volume mascara for bold, beautiful lashes. Water-resistant formula.',
    images: [
      { url: 'https://images.unsplash.com/photo-1591360236480-4ed861025fa1?w=400', alt: 'Mascara' }
    ],
    tags: ['makeup', 'mascara', 'cosmetics', 'beauty', 'eyes'],
    brand: { name: 'Lash Luxe', slug: 'lash-luxe' },
    category: { name: 'Makeup', slug: 'makeup' },
    pricing: { basePrice: 499, salePrice: 399 },
    ratings: { average: 4.6, count: 1876 },
    cashback: { percentage: 8 },
    isActive: true
  },
  {
    name: 'Eyeshadow Palette - Nude Collection',
    slug: 'eyeshadow-palette-nude',
    description: '12 highly pigmented nude shades for everyday glam. Matte and shimmer finishes.',
    images: [
      { url: 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=400', alt: 'Eyeshadow Palette' }
    ],
    tags: ['makeup', 'eyeshadow', 'cosmetics', 'beauty', 'palette'],
    brand: { name: 'Nude Glam', slug: 'nude-glam' },
    category: { name: 'Makeup', slug: 'makeup' },
    pricing: { basePrice: 1499, salePrice: 1199 },
    ratings: { average: 4.7, count: 2567 },
    cashback: { percentage: 15 },
    isActive: true
  },

  // Hair Care
  {
    name: 'Argan Oil Hair Serum',
    slug: 'argan-oil-hair-serum',
    description: 'Nourishing argan oil serum for frizz control and shine. Heat protection included.',
    images: [
      { url: 'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?w=400', alt: 'Hair Serum' }
    ],
    tags: ['haircare', 'serum', 'argan', 'beauty', 'frizz-control'],
    brand: { name: 'Silk Hair', slug: 'silk-hair' },
    category: { name: 'Hair Care', slug: 'haircare' },
    pricing: { basePrice: 699, salePrice: 549 },
    ratings: { average: 4.5, count: 1234 },
    cashback: { percentage: 10 },
    isActive: true
  },
  {
    name: 'Anti-Hair Fall Shampoo',
    slug: 'anti-hair-fall-shampoo',
    description: 'Strengthening shampoo with biotin and keratin. Reduces hair fall in 4 weeks.',
    images: [
      { url: 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=400', alt: 'Shampoo' }
    ],
    tags: ['haircare', 'shampoo', 'hair', 'beauty', 'anti-hairfall'],
    brand: { name: 'Strong Roots', slug: 'strong-roots' },
    category: { name: 'Hair Care', slug: 'haircare' },
    pricing: { basePrice: 449, salePrice: 349 },
    ratings: { average: 4.3, count: 2890 },
    cashback: { percentage: 8 },
    isActive: true
  },
  {
    name: 'Deep Conditioning Hair Mask',
    slug: 'deep-conditioning-hair-mask',
    description: 'Intensive repair mask for damaged hair. With coconut oil and shea butter.',
    images: [
      { url: 'https://images.unsplash.com/photo-1522338242042-2d1c9cd13aba?w=400', alt: 'Hair Mask' }
    ],
    tags: ['haircare', 'mask', 'hair', 'beauty', 'conditioning'],
    brand: { name: 'Repair Plus', slug: 'repair-plus' },
    category: { name: 'Hair Care', slug: 'haircare' },
    pricing: { basePrice: 599, salePrice: 499 },
    ratings: { average: 4.6, count: 1456 },
    cashback: { percentage: 12 },
    isActive: true
  },
  {
    name: 'Keratin Smoothing Treatment',
    slug: 'keratin-smoothing-treatment',
    description: 'Professional-grade keratin treatment for smooth, manageable hair at home.',
    images: [
      { url: 'https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=400', alt: 'Keratin Treatment' }
    ],
    tags: ['haircare', 'keratin', 'hair', 'beauty', 'smoothing'],
    brand: { name: 'Salon Pro', slug: 'salon-pro' },
    category: { name: 'Hair Care', slug: 'haircare' },
    pricing: { basePrice: 1999, salePrice: 1599 },
    ratings: { average: 4.4, count: 876 },
    cashback: { percentage: 15 },
    isActive: true
  }
];

async function seedBeautyWellness() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB\n');

    // Seed Stores
    console.log('=== Seeding Beauty & Wellness Stores ===\n');

    for (const store of beautyStores) {
      const existingStore = await Store.findOne({ slug: store.slug });

      if (existingStore) {
        // Update existing store
        await Store.updateOne({ slug: store.slug }, { $set: store });
        console.log(`Updated: ${store.name}`);
      } else {
        // Create new store
        await Store.create(store);
        console.log(`Created: ${store.name}`);
      }
    }

    console.log(`\nStores seeded: ${beautyStores.length}`);

    // Seed Products
    console.log('\n=== Seeding Beauty Products ===\n');

    for (const product of beautyProducts) {
      const existingProduct = await Product.findOne({ slug: product.slug });

      if (existingProduct) {
        // Update existing product
        await Product.updateOne({ slug: product.slug }, { $set: product });
        console.log(`Updated: ${product.name}`);
      } else {
        // Create new product
        await Product.create(product);
        console.log(`Created: ${product.name}`);
      }
    }

    console.log(`\nProducts seeded: ${beautyProducts.length}`);

    // Verification
    console.log('\n=== Verification ===\n');

    const salonCount = await Store.countDocuments({ tags: { $in: ['salon'] } });
    const spaCount = await Store.countDocuments({ tags: { $in: ['spa'] } });
    const wellnessCount = await Store.countDocuments({ tags: { $in: ['wellness'] } });
    const skincareProducts = await Product.countDocuments({ tags: { $in: ['skincare'] } });
    const makeupProducts = await Product.countDocuments({ tags: { $in: ['makeup'] } });
    const haircareProducts = await Product.countDocuments({ tags: { $in: ['haircare'] } });

    console.log('Stores by category:');
    console.log(`  - Salons: ${salonCount}`);
    console.log(`  - Spas: ${spaCount}`);
    console.log(`  - Wellness Centers: ${wellnessCount}`);

    console.log('\nProducts by category:');
    console.log(`  - Skincare: ${skincareProducts}`);
    console.log(`  - Makeup: ${makeupProducts}`);
    console.log(`  - Hair Care: ${haircareProducts}`);

    await mongoose.connection.close();
    console.log('\nSeeding completed successfully!');
    console.log('\nBeauty & Wellness section is now ready to use.');

  } catch (err) {
    console.error('Error:', err.message);
    console.error(err);
    process.exit(1);
  }
}

seedBeautyWellness();
