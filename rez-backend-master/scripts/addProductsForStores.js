require('dotenv').config();
const mongoose = require('mongoose');
const { Product } = require('../dist/models/Product');
const { Store } = require('../dist/models/Store');
const { Category } = require('../dist/models/Category');

// Product data templates for different store types
const productTemplates = {
  electronics: [
    {
      title: 'Smart Watch Pro',
      name: 'Smart Watch Pro',
      brand: 'TechWear',
      description: 'Advanced smartwatch with health tracking, GPS, and notification features',
      tags: ['smartwatch', 'fitness', 'wearable', 'health'],
      price: { current: 12999, original: 15999, discount: 19 },
      image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500'
    },
    {
      title: 'Wireless Bluetooth Earbuds',
      name: 'Wireless Bluetooth Earbuds',
      brand: 'SoundMax',
      description: 'Premium wireless earbuds with active noise cancellation and long battery life',
      tags: ['earbuds', 'wireless', 'audio', 'bluetooth'],
      price: { current: 4999, original: 6999, discount: 29 },
      image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=500'
    },
    {
      title: '4K Ultra HD Webcam',
      name: '4K Ultra HD Webcam',
      brand: 'ViewTech',
      description: 'Professional 4K webcam with autofocus and built-in microphone',
      tags: ['webcam', 'camera', '4k', 'streaming'],
      price: { current: 7999, original: 9999, discount: 20 },
      image: 'https://images.unsplash.com/photo-1585752721009-4a74b55b2a90?w=500'
    }
  ],
  fashion: [
    {
      title: 'Classic Denim Jacket',
      name: 'Classic Denim Jacket',
      brand: 'UrbanStyle',
      description: 'Timeless denim jacket with modern fit and premium quality fabric',
      tags: ['jacket', 'denim', 'casual', 'fashion'],
      price: { current: 2499, original: 3999, discount: 38 },
      image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500'
    },
    {
      title: 'Designer Handbag',
      name: 'Designer Handbag',
      brand: 'LuxeBags',
      description: 'Elegant designer handbag with multiple compartments and premium leather',
      tags: ['handbag', 'accessories', 'leather', 'designer'],
      price: { current: 5999, original: 8999, discount: 33 },
      image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=500'
    },
    {
      title: 'Cotton Casual T-Shirt',
      name: 'Cotton Casual T-Shirt',
      brand: 'ComfortWear',
      description: 'Premium cotton t-shirt with comfortable fit and vibrant colors',
      tags: ['t-shirt', 'cotton', 'casual', 'comfort'],
      price: { current: 599, original: 999, discount: 40 },
      image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500'
    }
  ],
  food: [
    {
      title: 'Organic Quinoa Bowl',
      name: 'Organic Quinoa Bowl',
      brand: 'HealthyBites',
      description: 'Nutritious quinoa bowl with fresh vegetables and protein-rich ingredients',
      tags: ['healthy', 'organic', 'quinoa', 'bowl'],
      price: { current: 299, original: 399, discount: 25 },
      image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500'
    },
    {
      title: 'Gourmet Pizza Margherita',
      name: 'Gourmet Pizza Margherita',
      brand: 'PizzaHaven',
      description: 'Classic Margherita pizza with fresh mozzarella and basil',
      tags: ['pizza', 'italian', 'cheese', 'gourmet'],
      price: { current: 449, original: 599, discount: 25 },
      image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=500'
    },
    {
      title: 'Fresh Fruit Smoothie',
      name: 'Fresh Fruit Smoothie',
      brand: 'FreshBlend',
      description: 'Refreshing smoothie made with fresh fruits and natural ingredients',
      tags: ['smoothie', 'healthy', 'fresh', 'drinks'],
      price: { current: 199, original: 249, discount: 20 },
      image: 'https://images.unsplash.com/photo-1505252585461-04db1eb84625?w=500'
    }
  ],
  books: [
    {
      title: 'The Art of Programming',
      name: 'The Art of Programming',
      brand: 'TechBooks',
      description: 'Comprehensive guide to modern programming practices and design patterns',
      tags: ['book', 'programming', 'technology', 'education'],
      price: { current: 899, original: 1299, discount: 31 },
      image: 'https://images.unsplash.com/photo-1589998059171-988d887df646?w=500'
    },
    {
      title: 'Mystery Thriller Novel',
      name: 'Mystery Thriller Novel',
      brand: 'PageTurner',
      description: 'Gripping mystery thriller that keeps you on the edge of your seat',
      tags: ['book', 'thriller', 'mystery', 'fiction'],
      price: { current: 399, original: 599, discount: 33 },
      image: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=500'
    },
    {
      title: 'Self-Help Guide',
      name: 'Self-Help Guide',
      brand: 'MindGrowth',
      description: 'Practical guide to personal development and achieving your goals',
      tags: ['book', 'self-help', 'motivation', 'personal-growth'],
      price: { current: 499, original: 699, discount: 29 },
      image: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=500'
    }
  ],
  sports: [
    {
      title: 'Yoga Mat Premium',
      name: 'Yoga Mat Premium',
      brand: 'FitLife',
      description: 'Non-slip premium yoga mat with extra cushioning and carrying strap',
      tags: ['yoga', 'fitness', 'exercise', 'mat'],
      price: { current: 1299, original: 1999, discount: 35 },
      image: 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=500'
    },
    {
      title: 'Resistance Bands Set',
      name: 'Resistance Bands Set',
      brand: 'PowerFit',
      description: 'Complete set of resistance bands for strength training and flexibility',
      tags: ['fitness', 'resistance', 'training', 'exercise'],
      price: { current: 899, original: 1499, discount: 40 },
      image: 'https://images.unsplash.com/photo-1598289431512-b97b0917affc?w=500'
    },
    {
      title: 'Running Shoes Pro',
      name: 'Running Shoes Pro',
      brand: 'SpeedRunner',
      description: 'Professional running shoes with advanced cushioning and support',
      tags: ['shoes', 'running', 'sports', 'fitness'],
      price: { current: 3999, original: 5999, discount: 33 },
      image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500'
    }
  ],
  groceries: [
    {
      title: 'Organic Vegetables Pack',
      name: 'Organic Vegetables Pack',
      brand: 'FreshFarm',
      description: 'Fresh organic vegetables grown without pesticides',
      tags: ['organic', 'vegetables', 'fresh', 'healthy'],
      price: { current: 299, original: 399, discount: 25 },
      image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500'
    },
    {
      title: 'Premium Rice 5kg',
      name: 'Premium Rice 5kg',
      brand: 'GrainSelect',
      description: 'Premium quality basmati rice, aromatic and long-grain',
      tags: ['rice', 'grains', 'food', 'staples'],
      price: { current: 549, original: 699, discount: 21 },
      image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500'
    },
    {
      title: 'Fresh Milk 1L',
      name: 'Fresh Milk 1L',
      brand: 'DairyFresh',
      description: 'Fresh pasteurized milk from local farms',
      tags: ['milk', 'dairy', 'fresh', 'organic'],
      price: { current: 65, original: 75, discount: 13 },
      image: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=500'
    }
  ],
  pharmacy: [
    {
      title: 'Vitamin C Tablets',
      name: 'Vitamin C Tablets',
      brand: 'HealthPlus',
      description: 'High-potency vitamin C tablets for immunity support',
      tags: ['vitamins', 'health', 'supplements', 'immunity'],
      price: { current: 399, original: 499, discount: 20 },
      image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500'
    },
    {
      title: 'Digital Thermometer',
      name: 'Digital Thermometer',
      brand: 'MediCare',
      description: 'Fast and accurate digital thermometer for fever monitoring',
      tags: ['thermometer', 'medical', 'health', 'diagnostic'],
      price: { current: 299, original: 399, discount: 25 },
      image: 'https://images.unsplash.com/photo-1603396382238-5a8a127c665b?w=500'
    },
    {
      title: 'First Aid Kit',
      name: 'First Aid Kit',
      brand: 'SafetyFirst',
      description: 'Complete first aid kit with essential medical supplies',
      tags: ['first-aid', 'medical', 'emergency', 'health'],
      price: { current: 799, original: 999, discount: 20 },
      image: 'https://images.unsplash.com/photo-1603398938378-e54eab446dde?w=500'
    }
  ],
  snacks: [
    {
      title: 'Potato Chips Classic',
      name: 'Potato Chips Classic',
      brand: 'CrunchTime',
      description: 'Crispy potato chips with classic salted flavor',
      tags: ['chips', 'snacks', 'savory', 'crispy'],
      price: { current: 40, original: 50, discount: 20 },
      image: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=500'
    },
    {
      title: 'Mixed Nuts Pack',
      name: 'Mixed Nuts Pack',
      brand: 'NuttyDelights',
      description: 'Premium mix of roasted cashews, almonds, and pistachios',
      tags: ['nuts', 'healthy', 'snacks', 'protein'],
      price: { current: 199, original: 249, discount: 20 },
      image: 'https://images.unsplash.com/photo-1599599810769-bcde5a160d32?w=500'
    },
    {
      title: 'Chocolate Cookies',
      name: 'Chocolate Cookies',
      brand: 'BakeryFresh',
      description: 'Delicious chocolate chip cookies baked to perfection',
      tags: ['cookies', 'chocolate', 'snacks', 'sweet'],
      price: { current: 120, original: 150, discount: 20 },
      image: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=500'
    }
  ],
  luxury: [
    {
      title: 'Designer Sunglasses',
      name: 'Designer Sunglasses',
      brand: 'LuxeVision',
      description: 'Premium designer sunglasses with UV protection',
      tags: ['sunglasses', 'luxury', 'fashion', 'accessories'],
      price: { current: 8999, original: 12999, discount: 31 },
      image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=500'
    },
    {
      title: 'Leather Wallet Premium',
      name: 'Leather Wallet Premium',
      brand: 'EliteLeather',
      description: 'Handcrafted genuine leather wallet with RFID protection',
      tags: ['wallet', 'leather', 'luxury', 'accessories'],
      price: { current: 2999, original: 4999, discount: 40 },
      image: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=500'
    },
    {
      title: 'Premium Perfume',
      name: 'Premium Perfume',
      brand: 'FragranceLux',
      description: 'Exclusive luxury perfume with long-lasting fragrance',
      tags: ['perfume', 'fragrance', 'luxury', 'beauty'],
      price: { current: 6999, original: 9999, discount: 30 },
      image: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=500'
    }
  ],
  jewelry: [
    {
      title: 'Gold Plated Necklace',
      name: 'Gold Plated Necklace',
      brand: 'RoyalJewels',
      description: 'Elegant gold-plated necklace with intricate design',
      tags: ['necklace', 'jewelry', 'gold', 'fashion'],
      price: { current: 4999, original: 7999, discount: 38 },
      image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=500'
    },
    {
      title: 'Diamond Stud Earrings',
      name: 'Diamond Stud Earrings',
      brand: 'SparkleGems',
      description: 'Elegant diamond stud earrings in sterling silver setting',
      tags: ['earrings', 'diamond', 'jewelry', 'luxury'],
      price: { current: 12999, original: 15999, discount: 19 },
      image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=500'
    },
    {
      title: 'Silver Bracelet',
      name: 'Silver Bracelet',
      brand: 'SilverCraft',
      description: 'Handcrafted sterling silver bracelet with modern design',
      tags: ['bracelet', 'silver', 'jewelry', 'accessories'],
      price: { current: 3499, original: 4999, discount: 30 },
      image: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=500'
    }
  ],
  organic: [
    {
      title: 'Organic Honey 500g',
      name: 'Organic Honey 500g',
      brand: 'NaturePure',
      description: 'Pure organic honey harvested from wildflowers',
      tags: ['honey', 'organic', 'natural', 'healthy'],
      price: { current: 399, original: 499, discount: 20 },
      image: 'https://images.unsplash.com/photo-1587049352846-4a222e784210?w=500'
    },
    {
      title: 'Organic Tea Leaves',
      name: 'Organic Tea Leaves',
      brand: 'TeaGarden',
      description: 'Premium organic tea leaves from mountain plantations',
      tags: ['tea', 'organic', 'beverage', 'natural'],
      price: { current: 349, original: 449, discount: 22 },
      image: 'https://images.unsplash.com/photo-1597318130377-1e3a8c0b4ab4?w=500'
    },
    {
      title: 'Organic Coconut Oil',
      name: 'Organic Coconut Oil',
      brand: 'CocoNatural',
      description: 'Cold-pressed organic coconut oil for cooking and beauty',
      tags: ['coconut-oil', 'organic', 'natural', 'healthy'],
      price: { current: 449, original: 599, discount: 25 },
      image: 'https://images.unsplash.com/photo-1593098025339-1f3a3a6bc3e8?w=500'
    }
  ],
  general: [
    {
      title: 'Multipurpose Storage Box',
      name: 'Multipurpose Storage Box',
      brand: 'HomeOrganize',
      description: 'Durable plastic storage box for organizing household items',
      tags: ['storage', 'organization', 'home', 'utility'],
      price: { current: 299, original: 399, discount: 25 },
      image: 'https://images.unsplash.com/photo-1600096194534-95cf5ece04cf?w=500'
    },
    {
      title: 'LED Desk Lamp',
      name: 'LED Desk Lamp',
      brand: 'BrightLight',
      description: 'Energy-efficient LED desk lamp with adjustable brightness',
      tags: ['lamp', 'led', 'lighting', 'desk'],
      price: { current: 799, original: 999, discount: 20 },
      image: 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=500'
    },
    {
      title: 'Water Bottle 1L',
      name: 'Water Bottle 1L',
      brand: 'HydroLife',
      description: 'BPA-free stainless steel water bottle with insulation',
      tags: ['bottle', 'water', 'hydration', 'eco-friendly'],
      price: { current: 499, original: 699, discount: 29 },
      image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=500'
    }
  ]
};

// Function to generate SKU
function generateSKU(storeName, productName, index) {
  const storeCode = storeName.substring(0, 3).toUpperCase();
  const productCode = productName.replace(/\s+/g, '').substring(0, 3).toUpperCase();
  const randomNum = Math.floor(Math.random() * 90000) + 10000;
  return `${storeCode}${productCode}${randomNum}${index}`;
}

// Function to generate slug
function generateSlug(name, storeId, index) {
  const slug = name.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const uniqueId = storeId.toString().substring(20, 24);
  return `${slug}-${uniqueId}-${index}`;
}

// Function to determine product template based on store name
function getProductTemplateForStore(storeName) {
  const name = storeName.toLowerCase();

  if (name.includes('tech') || name.includes('electron')) return 'electronics';
  if (name.includes('fashion') || name.includes('boutique') || name.includes('style')) return 'fashion';
  if (name.includes('food') || name.includes('bite') || name.includes('pizza') || name.includes('gourmet')) return 'food';
  if (name.includes('book')) return 'books';
  if (name.includes('sport') || name.includes('fit')) return 'sports';
  if (name.includes('grocery') || name.includes('mart') || name.includes('bazaar')) return 'groceries';
  if (name.includes('pharma') || name.includes('pharmacy')) return 'pharmacy';
  if (name.includes('snack')) return 'snacks';
  if (name.includes('luxe') || name.includes('elite') || name.includes('premium') || name.includes('lux')) return 'luxury';
  if (name.includes('jewel')) return 'jewelry';
  if (name.includes('organic') || name.includes('nature') || name.includes('eco') || name.includes('green')) return 'organic';

  return 'general';
}

async function addProductsForStores() {
  try {
    console.log('🚀 Starting product creation process...\n');

    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
if (!mongoUri) { console.error('MONGODB_URI or MONGO_URI not set'); process.exit(1); };

    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to MongoDB\n');

    // Fetch all stores
    const stores = await Store.find().lean();
    console.log(`📊 Found ${stores.length} stores\n`);

    // Fetch a category to use as default
    const defaultCategory = await Category.findOne().lean();
    if (!defaultCategory) {
      throw new Error('No categories found. Please create at least one category first.');
    }

    let totalProductsCreated = 0;
    const createdProducts = [];

    // Loop through each store and create products
    for (let i = 0; i < stores.length; i++) {
      const store = stores[i];
      console.log(`\n📦 Creating products for: ${store.name} (${i + 1}/${stores.length})`);

      // Determine which product template to use
      const templateType = getProductTemplateForStore(store.name);
      const templates = productTemplates[templateType];
      console.log(`   Using template: ${templateType}`);

      // Create 2-3 products per store
      const numProducts = Math.random() > 0.5 ? 3 : 2;

      for (let j = 0; j < numProducts; j++) {
        const template = templates[j % templates.length];

        const productData = {
          name: template.name,
          slug: generateSlug(template.name, store._id, j),
          sku: generateSKU(store.name, template.name, j),
          brand: template.brand,
          description: template.description,
          shortDescription: template.description.substring(0, 100),
          productType: 'product',
          images: [template.image],
          pricing: {
            original: template.price.original,
            selling: template.price.current,
            discount: template.price.discount,
            currency: 'INR'
          },
          category: store.category || defaultCategory._id,
          ratings: {
            average: parseFloat((Math.random() * 2 + 3).toFixed(1)), // Random rating between 3.0 and 5.0
            count: Math.floor(Math.random() * 200) + 10, // Random count between 10 and 210
            distribution: {
              5: Math.floor(Math.random() * 50),
              4: Math.floor(Math.random() * 40),
              3: Math.floor(Math.random() * 20),
              2: Math.floor(Math.random() * 10),
              1: Math.floor(Math.random() * 5)
            }
          },
          tags: template.tags,
          isFeatured: Math.random() > 0.8,
          isActive: true,
          isDigital: false,
          store: store._id,
          inventory: {
            stock: Math.floor(Math.random() * 200) + 50, // Random stock between 50 and 250
            isAvailable: true,
            lowStockThreshold: 10,
            unlimited: false
          },
          specifications: [],
          seo: {
            title: template.name,
            description: template.description,
            keywords: template.tags
          },
          analytics: {
            views: Math.floor(Math.random() * 100),
            purchases: Math.floor(Math.random() * 20),
            conversions: Math.random() * 0.3,
            wishlistAdds: Math.floor(Math.random() * 30),
            shareCount: Math.floor(Math.random() * 15),
            returnRate: Math.random() * 0.1,
            avgRating: parseFloat((Math.random() * 2 + 3).toFixed(1))
          }
        };

        try {
          const product = await Product.create(productData);
          totalProductsCreated++;
          createdProducts.push({
            store: store.name,
            product: product.name,
            id: product._id
          });
          console.log(`   ✅ Created: ${product.name}`);
        } catch (error) {
          console.log(`   ❌ Failed to create ${template.name}: ${error.message}`);
        }
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('📊 PRODUCT CREATION SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total Stores: ${stores.length}`);
    console.log(`Total Products Created: ${totalProductsCreated}`);
    console.log(`Average Products per Store: ${(totalProductsCreated / stores.length).toFixed(2)}`);

    console.log('\n📝 Sample Created Products:');
    createdProducts.slice(0, 10).forEach((item, index) => {
      console.log(`${index + 1}. ${item.product} (Store: ${item.store})`);
    });

    console.log('\n✅ Product creation complete!');

    await mongoose.connection.close();
    console.log('✅ Database connection closed');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

addProductsForStores();
