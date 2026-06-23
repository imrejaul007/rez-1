const mongoose = require('mongoose');
require('dotenv').config();

async function addProductsToEmptyStores() {
  // Connect to MongoDB
  await mongoose.connect(process.env.MONGODB_URI, {
    dbName: process.env.DB_NAME || 'test'
  });
  console.log('✅ Connected to MongoDB');

  const db = mongoose.connection.db;

  try {
    console.log('\n🔍 Adding products to stores without products...\n');

    const storesCollection = db.collection('stores');
    const productsCollection = db.collection('products');
    const categoriesCollection = db.collection('categories');

    // Get all categories for reference
    const categories = await categoriesCollection.find({}).toArray();
    const categoryMap = {};
    categories.forEach(cat => {
      categoryMap[cat.name.toLowerCase()] = cat._id;
      if (cat.slug) categoryMap[cat.slug.toLowerCase()] = cat._id;
    });

    console.log(`📂 Found ${categories.length} categories\n`);

    // Define product templates for different store types
    const productTemplates = {
      // Fast Food Restaurants
      fastfood: [
        {
          name: 'Classic Burger',
          description: 'Juicy beef patty with lettuce, tomato, cheese, and special sauce',
          pricing: { selling: 199, original: 249, mrp: 249, base: 249, salePrice: 199, currency: 'INR' },
          images: ['https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500'],
          tags: ['burger', 'fast-food', 'popular'],
          categoryName: 'Food & Dining'
        },
        {
          name: 'French Fries',
          description: 'Crispy golden fries with seasoning',
          pricing: { selling: 79, original: 99, mrp: 99, base: 99, salePrice: 79, currency: 'INR' },
          images: ['https://images.unsplash.com/photo-1576107232684-1279f390859f?w=500'],
          tags: ['fries', 'sides', 'fast-food'],
          categoryName: 'Food & Dining'
        },
        {
          name: 'Chicken Nuggets (6 pcs)',
          description: 'Crispy chicken nuggets served with dipping sauce',
          pricing: { selling: 149, original: 179, mrp: 179, base: 179, salePrice: 149, currency: 'INR' },
          images: ['https://images.unsplash.com/photo-1562967916-eb82221dfb92?w=500'],
          tags: ['chicken', 'nuggets', 'fast-food'],
          categoryName: 'Food & Dining'
        },
        {
          name: 'Soft Drink (Medium)',
          description: 'Refreshing cold soft drink',
          pricing: { selling: 59, original: 79, mrp: 79, base: 79, salePrice: 59, currency: 'INR' },
          images: ['https://images.unsplash.com/photo-1581006852262-e4307cf6283a?w=500'],
          tags: ['beverages', 'drinks', 'cold'],
          categoryName: 'Food & Dining'
        },
        {
          name: 'Meal Combo',
          description: 'Burger + Fries + Drink combo',
          pricing: { selling: 299, original: 399, mrp: 399, base: 399, salePrice: 299, currency: 'INR' },
          images: ['https://images.unsplash.com/photo-1585238342024-78d387f4a707?w=500'],
          tags: ['combo', 'meal', 'value'],
          categoryName: 'Food & Dining'
        }
      ],

      // Pizza Restaurants
      pizza: [
        {
          name: 'Margherita Pizza (Medium)',
          description: 'Classic pizza with tomato sauce, mozzarella, and basil',
          pricing: { selling: 249, original: 299, mrp: 299, base: 299, salePrice: 249, currency: 'INR' },
          images: ['https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=500'],
          tags: ['pizza', 'vegetarian', 'italian'],
          categoryName: 'Restaurant'
        },
        {
          name: 'Pepperoni Pizza (Medium)',
          description: 'Loaded with pepperoni and cheese',
          pricing: { selling: 349, original: 399, mrp: 399, base: 399, salePrice: 349, currency: 'INR' },
          images: ['https://images.unsplash.com/photo-1628840042765-356cda07504e?w=500'],
          tags: ['pizza', 'pepperoni', 'popular'],
          categoryName: 'Restaurant'
        },
        {
          name: 'Garlic Bread',
          description: 'Crispy garlic bread with herbs and butter',
          pricing: { selling: 99, original: 129, mrp: 129, base: 129, salePrice: 99, currency: 'INR' },
          images: ['https://images.unsplash.com/photo-1573140401552-3fab0b24f5af?w=500'],
          tags: ['sides', 'garlic-bread', 'appetizer'],
          categoryName: 'Restaurant'
        },
        {
          name: 'Pasta Alfredo',
          description: 'Creamy alfredo pasta with chicken',
          pricing: { selling: 229, original: 279, mrp: 279, base: 279, salePrice: 229, currency: 'INR' },
          images: ['https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=500'],
          tags: ['pasta', 'italian', 'creamy'],
          categoryName: 'Restaurant'
        }
      ],

      // Cafes
      cafe: [
        {
          name: 'Cappuccino',
          description: 'Rich espresso with steamed milk and foam',
          pricing: { selling: 149, original: 179, mrp: 179, base: 179, salePrice: 149, currency: 'INR' },
          images: ['https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=500'],
          tags: ['coffee', 'hot', 'espresso'],
          categoryName: 'Food & Dining'
        },
        {
          name: 'Cold Coffee',
          description: 'Iced coffee with milk and sugar',
          pricing: { selling: 169, original: 199, mrp: 199, base: 199, salePrice: 169, currency: 'INR' },
          images: ['https://images.unsplash.com/photo-1517487881594-2787fef5ebf7?w=500'],
          tags: ['coffee', 'cold', 'iced'],
          categoryName: 'Food & Dining'
        },
        {
          name: 'Chocolate Muffin',
          description: 'Freshly baked chocolate muffin',
          pricing: { selling: 79, original: 99, mrp: 99, base: 99, salePrice: 79, currency: 'INR' },
          images: ['https://images.unsplash.com/photo-1607958996333-41aef7caefaa?w=500'],
          tags: ['bakery', 'muffin', 'chocolate'],
          categoryName: 'Food & Dining'
        },
        {
          name: 'Sandwich',
          description: 'Grilled chicken or veg sandwich',
          pricing: { selling: 129, original: 159, mrp: 159, base: 159, salePrice: 129, currency: 'INR' },
          images: ['https://images.unsplash.com/photo-1528736235302-52922df5c122?w=500'],
          tags: ['sandwich', 'lunch', 'snacks'],
          categoryName: 'Food & Dining'
        }
      ],

      // Fine Dining Restaurants
      restaurant: [
        {
          name: 'Butter Chicken',
          description: 'Creamy tomato-based curry with tender chicken',
          pricing: { selling: 399, original: 449, mrp: 449, base: 449, salePrice: 399, currency: 'INR' },
          images: ['https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=500'],
          tags: ['indian', 'curry', 'chicken', 'popular'],
          categoryName: 'Restaurant'
        },
        {
          name: 'Paneer Tikka',
          description: 'Marinated cottage cheese grilled to perfection',
          pricing: { selling: 299, original: 349, mrp: 349, base: 349, salePrice: 299, currency: 'INR' },
          images: ['https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=500'],
          tags: ['indian', 'vegetarian', 'appetizer'],
          categoryName: 'Restaurant'
        },
        {
          name: 'Naan Bread',
          description: 'Soft Indian flatbread',
          pricing: { selling: 49, original: 59, mrp: 59, base: 59, salePrice: 49, currency: 'INR' },
          images: ['https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=500'],
          tags: ['bread', 'indian', 'sides'],
          categoryName: 'Restaurant'
        },
        {
          name: 'Biryani',
          description: 'Aromatic rice dish with spices and meat/vegetables',
          pricing: { selling: 349, original: 399, mrp: 399, base: 399, salePrice: 349, currency: 'INR' },
          images: ['https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500'],
          tags: ['biryani', 'rice', 'indian', 'popular'],
          categoryName: 'Restaurant'
        }
      ],

      // Salons & Spas
      salon: [
        {
          name: 'Haircut & Styling',
          description: 'Professional haircut with styling',
          pricing: { selling: 299, original: 399, mrp: 399, base: 399, salePrice: 299, currency: 'INR' },
          images: ['https://images.unsplash.com/photo-1560066984-138dadb4c035?w=500'],
          tags: ['haircut', 'styling', 'grooming'],
          categoryName: 'Services'
        },
        {
          name: 'Hair Color & Highlights',
          description: 'Professional hair coloring service',
          pricing: { selling: 1499, original: 1999, mrp: 1999, base: 1999, salePrice: 1499, currency: 'INR' },
          images: ['https://images.unsplash.com/photo-1522337660859-02fbefca4702?w=500'],
          tags: ['hair-color', 'highlights', 'styling'],
          categoryName: 'Services'
        },
        {
          name: 'Facial Treatment',
          description: 'Deep cleansing facial with natural products',
          pricing: { selling: 799, original: 999, mrp: 999, base: 999, salePrice: 799, currency: 'INR' },
          images: ['https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=500'],
          tags: ['facial', 'skincare', 'beauty'],
          categoryName: 'Beauty & Cosmetics'
        },
        {
          name: 'Manicure & Pedicure',
          description: 'Complete nail care treatment',
          pricing: { selling: 599, original: 799, mrp: 799, base: 799, salePrice: 599, currency: 'INR' },
          images: ['https://images.unsplash.com/photo-1604654894610-df63bc536371?w=500'],
          tags: ['nails', 'manicure', 'pedicure'],
          categoryName: 'Beauty & Cosmetics'
        }
      ],

      // Spas
      spa: [
        {
          name: 'Full Body Massage',
          description: 'Relaxing 60-minute full body massage',
          pricing: { selling: 1499, original: 1999, mrp: 1999, base: 1999, salePrice: 1499, currency: 'INR' },
          images: ['https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=500'],
          tags: ['massage', 'relaxation', 'wellness'],
          categoryName: 'Health & Wellness'
        },
        {
          name: 'Aromatherapy Session',
          description: 'Therapeutic aromatherapy with essential oils',
          pricing: { selling: 1299, original: 1699, mrp: 1699, base: 1699, salePrice: 1299, currency: 'INR' },
          images: ['https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=500'],
          tags: ['aromatherapy', 'wellness', 'relaxation'],
          categoryName: 'Health & Wellness'
        },
        {
          name: 'Steam & Sauna',
          description: 'Detoxifying steam and sauna session',
          pricing: { selling: 599, original: 799, mrp: 799, base: 799, salePrice: 599, currency: 'INR' },
          images: ['https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=500'],
          tags: ['sauna', 'steam', 'detox'],
          categoryName: 'Health & Wellness'
        }
      ],

      // Clinics
      clinic: [
        {
          name: 'General Consultation',
          description: 'Consultation with experienced doctor',
          pricing: { selling: 399, original: 499, mrp: 499, base: 499, salePrice: 399, currency: 'INR' },
          images: ['https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=500'],
          tags: ['consultation', 'doctor', 'health'],
          categoryName: 'Health & Wellness'
        },
        {
          name: 'Health Checkup Package',
          description: 'Comprehensive health screening',
          pricing: { selling: 1999, original: 2499, mrp: 2499, base: 2499, salePrice: 1999, currency: 'INR' },
          images: ['https://images.unsplash.com/photo-1584820927498-cfe5bae34fc0?w=500'],
          tags: ['checkup', 'health', 'screening'],
          categoryName: 'Health & Wellness'
        },
        {
          name: 'Vaccination',
          description: 'Standard vaccination service',
          pricing: { selling: 599, original: 699, mrp: 699, base: 699, salePrice: 599, currency: 'INR' },
          images: ['https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=500'],
          tags: ['vaccination', 'immunization', 'health'],
          categoryName: 'Health & Wellness'
        }
      ],

      // Malls
      mall: [
        {
          name: 'Shopping Voucher ₹500',
          description: 'Redeemable at any store in the mall',
          pricing: { selling: 500, original: 500, mrp: 500, base: 500, salePrice: 500, currency: 'INR' },
          images: ['https://images.unsplash.com/photo-1607083206968-13611e3d76db?w=500'],
          tags: ['voucher', 'gift-card', 'shopping'],
          categoryName: 'Services'
        },
        {
          name: 'Shopping Voucher ₹1000',
          description: 'Redeemable at any store in the mall',
          pricing: { selling: 1000, original: 1000, mrp: 1000, base: 1000, salePrice: 1000, currency: 'INR' },
          images: ['https://images.unsplash.com/photo-1607083206968-13611e3d76db?w=500'],
          tags: ['voucher', 'gift-card', 'shopping'],
          categoryName: 'Services'
        },
        {
          name: 'Food Court Meal',
          description: 'Value meal at food court',
          pricing: { selling: 299, original: 349, mrp: 349, base: 349, salePrice: 299, currency: 'INR' },
          images: ['https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=500'],
          tags: ['food', 'meal', 'food-court'],
          categoryName: 'Food & Dining'
        }
      ]
    };

    // Map store names to product templates
    const storeProductMapping = {
      "McDonald's": 'fastfood',
      "KFC": 'fastfood',
      "Subway": 'fastfood',
      "Burger King": 'fastfood',
      "Pizza Hut": 'pizza',
      "Domino's Pizza": 'pizza',
      "Starbucks": 'cafe',
      "Cafe Coffee Day": 'cafe',
      "The Yellow Chilli": 'restaurant',
      "Barbeque Nation": 'restaurant',
      "Lakme Salon": 'salon',
      "Green Trends": 'salon',
      "Looks Salon": 'salon',
      "Jawed Habib": 'salon',
      "Urban Company Salon": 'salon',
      "Bounce Salon": 'salon',
      "The Barber Shop": 'salon',
      "Enrich Salon": 'salon',
      "Spa Nirvana": 'spa',
      "Tattva Spa": 'spa',
      "Apollo Clinic": 'clinic',
      "Max Healthcare Clinic": 'clinic',
      "Dentassure Dental Clinic": 'clinic',
      "Vision Eye Clinic": 'clinic',
      "Pet Care Veterinary Clinic": 'clinic',
      "Wellness Plus Mall": 'mall',
      "Central Square": 'mall',
      "LifeStyle Department Store": 'mall',
      "Wellness Junction": 'clinic',
      "Phoenix MarketCity": 'mall'
    };

    let totalProductsAdded = 0;
    let storesUpdated = 0;

    for (const [storeName, templateKey] of Object.entries(storeProductMapping)) {
      const store = await storesCollection.findOne({ name: storeName });

      if (!store) {
        console.log(`⚠️  Store not found: ${storeName}`);
        continue;
      }

      // Check if store already has products
      const existingProducts = await productsCollection.countDocuments({ store: store._id });
      if (existingProducts > 0) {
        console.log(`✓ ${storeName} already has ${existingProducts} products, skipping...`);
        continue;
      }

      const templates = productTemplates[templateKey];
      if (!templates) {
        console.log(`⚠️  No template found for ${storeName} (${templateKey})`);
        continue;
      }

      console.log(`\n📦 Adding products to "${storeName}"...`);

      for (const template of templates) {
        // Find category
        let categoryId = categoryMap[template.categoryName.toLowerCase()];
        if (!categoryId) {
          // Try to find by partial match
          const categoryKey = Object.keys(categoryMap).find(key =>
            key.includes(template.categoryName.toLowerCase()) ||
            template.categoryName.toLowerCase().includes(key)
          );
          categoryId = categoryKey ? categoryMap[categoryKey] : categoryMap['general'] || categories[0]?._id;
        }

        const product = {
          name: template.name,
          title: template.name,
          slug: `${template.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          description: template.description,
          brand: storeName,
          sku: `${templateKey.toUpperCase()}-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
          images: template.images,
          pricing: template.pricing,
          category: categoryId,
          store: store._id,
          tags: template.tags,
          isActive: true,
          productType: templateKey === 'salon' || templateKey === 'spa' || templateKey === 'clinic' ? 'service' : 'product',
          inventory: {
            isAvailable: true,
            stock: templateKey === 'salon' || templateKey === 'spa' || templateKey === 'clinic' ? 999 : 50,
            trackQuantity: false,
            lowStockThreshold: 5
          },
          ratings: {
            average: 4 + Math.random(),
            count: Math.floor(Math.random() * 50) + 10
          },
          createdAt: new Date(),
          updatedAt: new Date()
        };

        await productsCollection.insertOne(product);
        totalProductsAdded++;
      }

      console.log(`✅ Added ${templates.length} products to ${storeName}`);
      storesUpdated++;
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Product addition completed!');
    console.log('📊 Summary:');
    console.log(`   - Stores updated: ${storesUpdated}`);
    console.log(`   - Total products added: ${totalProductsAdded}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Error adding products:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Database connection closed');
    process.exit(0);
  }
}

addProductsToEmptyStores();
