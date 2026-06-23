/**
 * Script to fix product-store assignments
 * Ensures products match their store's subcategory
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI as string;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); }
;
const DB_NAME = process.env.DB_NAME || 'test';

// Mapping of subcategory slugs to valid subSubCategories
const SUBCATEGORY_VALID_SUBSUBCATEGORIES: Record<string, string[]> = {
  'cafes': ['Espresso-based drinks', 'Tea (Chai/Herbal)', 'Breakfast Items', 'Sandwiches', 'All-day brunch'],
  'qsr-fast-food': ['Burgers', 'Pizzas', 'Tacos/Burritos', 'Wraps/Rolls', 'Fried Chicken', 'Momos'],
  'family-restaurants': ['North Indian', 'South Indian', 'Chinese/Asian', 'Multicuisine'],
  'fine-dining': ['Continental', 'Modern Indian', 'Italian (Gourmet)', 'Japanese', 'Mediterranean'],
  'ice-cream-dessert': ['Gelato', 'Sorbet', 'Sundaes', 'Shakes', 'Frozen Yogurt', 'Indian Desserts (Kulfi)'],
  'bakery-confectionery': ['Cakes & Pastries', 'Bread', 'Cookies & Brownies', 'Donuts', 'Indian Sweets (Mithai)'],
  'cloud-kitchens': ['Biryani', 'Health & Salad Bowls', 'Meal Boxes', 'Desserts only'],
  'street-food': ['Chaat', 'Vada Pav', 'Pav Bhaji', 'Local Snacks'],
  'supermarkets': ['Fresh Produce', 'Dairy & Eggs', 'Packaged Foods', 'Household Goods', 'Personal Care'],
  'kirana-stores': ['Pulses & Grains', 'Spices & Masalas', 'Oils & Ghee', 'Stationery', 'Basic Toiletries'],
  'fresh-vegetables': ['Seasonal Produce', 'Exotic Vegetables', 'Organic Vegetables'],
  'dairy': ['Milk', 'Yogurt/Curd', 'Cheese', 'Butter & Cream', 'Paneer'],
  'pharmacy': ['Prescription Medicine', 'OTC Drugs', 'First Aid Supplies', 'Vitamins & Supplements', 'Baby Care'],
  'salons': ['Haircuts & Styling', 'Hair Colouring', 'Keratin/Smoothening', 'Facials'],
  'spa-massage': ['Swedish Massage', 'Deep Tissue', 'Aromatherapy', 'Ayurvedic Treatments', 'Reflexology'],
  'gyms': ['Weight Training', 'Cardio', 'Group Classes', 'Personal Training'],
};

// Product templates for each subcategory
const SUBCATEGORY_PRODUCTS: Record<string, Array<{name: string, subSubCategory: string, description: string, price: number}>> = {
  'cafes': [
    { name: 'Espresso', subSubCategory: 'Espresso-based drinks', description: 'Rich and bold espresso shot', price: 150 },
    { name: 'Cappuccino', subSubCategory: 'Espresso-based drinks', description: 'Espresso with steamed milk foam', price: 220 },
    { name: 'Latte', subSubCategory: 'Espresso-based drinks', description: 'Smooth espresso with steamed milk', price: 250 },
    { name: 'Americano', subSubCategory: 'Espresso-based drinks', description: 'Espresso with hot water', price: 180 },
    { name: 'Mocha', subSubCategory: 'Espresso-based drinks', description: 'Espresso with chocolate and milk', price: 280 },
    { name: 'Masala Chai', subSubCategory: 'Tea (Chai/Herbal)', description: 'Traditional Indian spiced tea', price: 120 },
    { name: 'Green Tea', subSubCategory: 'Tea (Chai/Herbal)', description: 'Healthy antioxidant-rich tea', price: 150 },
    { name: 'Chamomile Tea', subSubCategory: 'Tea (Chai/Herbal)', description: 'Calming herbal tea', price: 180 },
    { name: 'Pancakes', subSubCategory: 'Breakfast Items', description: 'Fluffy pancakes with maple syrup', price: 320 },
    { name: 'French Toast', subSubCategory: 'Breakfast Items', description: 'Classic French toast with berries', price: 280 },
    { name: 'Eggs Benedict', subSubCategory: 'Breakfast Items', description: 'Poached eggs on English muffin', price: 350 },
    { name: 'Club Sandwich', subSubCategory: 'Sandwiches', description: 'Triple-decker classic sandwich', price: 320 },
    { name: 'Grilled Cheese', subSubCategory: 'Sandwiches', description: 'Melted cheese on toasted bread', price: 220 },
    { name: 'BLT Sandwich', subSubCategory: 'Sandwiches', description: 'Bacon, lettuce, tomato sandwich', price: 280 },
    { name: 'Avocado Toast', subSubCategory: 'All-day brunch', description: 'Smashed avocado on sourdough', price: 350 },
    { name: 'Shakshuka', subSubCategory: 'All-day brunch', description: 'Poached eggs in spiced tomato sauce', price: 320 },
  ],
  'qsr-fast-food': [
    { name: 'Classic Burger', subSubCategory: 'Burgers', description: 'Juicy beef patty with fresh toppings', price: 220 },
    { name: 'Chicken Burger', subSubCategory: 'Burgers', description: 'Crispy chicken fillet burger', price: 200 },
    { name: 'Veggie Burger', subSubCategory: 'Burgers', description: 'Plant-based patty burger', price: 180 },
    { name: 'Margherita Pizza', subSubCategory: 'Pizzas', description: 'Classic tomato and mozzarella', price: 350 },
    { name: 'Pepperoni Pizza', subSubCategory: 'Pizzas', description: 'Loaded with pepperoni slices', price: 420 },
    { name: 'Chicken Tacos', subSubCategory: 'Tacos/Burritos', description: 'Spiced chicken in corn tortilla', price: 280 },
    { name: 'Veggie Burrito', subSubCategory: 'Tacos/Burritos', description: 'Loaded veggie burrito bowl', price: 320 },
    { name: 'Chicken Wrap', subSubCategory: 'Wraps/Rolls', description: 'Grilled chicken in tortilla wrap', price: 250 },
    { name: 'Paneer Roll', subSubCategory: 'Wraps/Rolls', description: 'Spiced paneer in rumali roti', price: 220 },
    { name: 'Fried Chicken', subSubCategory: 'Fried Chicken', description: 'Crispy fried chicken pieces', price: 350 },
    { name: 'Chicken Wings', subSubCategory: 'Fried Chicken', description: 'Spicy buffalo wings', price: 380 },
    { name: 'Veg Momos', subSubCategory: 'Momos', description: 'Steamed vegetable dumplings', price: 150 },
    { name: 'Chicken Momos', subSubCategory: 'Momos', description: 'Steamed chicken dumplings', price: 180 },
  ],
  'family-restaurants': [
    { name: 'Butter Chicken', subSubCategory: 'North Indian', description: 'Creamy tomato-based chicken curry', price: 380 },
    { name: 'Dal Makhani', subSubCategory: 'North Indian', description: 'Slow-cooked black lentils', price: 280 },
    { name: 'Paneer Tikka', subSubCategory: 'North Indian', description: 'Grilled cottage cheese cubes', price: 320 },
    { name: 'Masala Dosa', subSubCategory: 'South Indian', description: 'Crispy rice crepe with potato filling', price: 180 },
    { name: 'Idli Sambar', subSubCategory: 'South Indian', description: 'Steamed rice cakes with lentil soup', price: 150 },
    { name: 'Medu Vada', subSubCategory: 'South Indian', description: 'Crispy fried lentil donuts', price: 120 },
    { name: 'Chicken Manchurian', subSubCategory: 'Chinese/Asian', description: 'Indo-Chinese fried chicken', price: 320 },
    { name: 'Veg Fried Rice', subSubCategory: 'Chinese/Asian', description: 'Wok-tossed vegetable rice', price: 220 },
    { name: 'Hakka Noodles', subSubCategory: 'Chinese/Asian', description: 'Stir-fried noodles with vegetables', price: 250 },
    { name: 'Thali Meal', subSubCategory: 'Multicuisine', description: 'Complete Indian meal platter', price: 350 },
  ],
  'ice-cream-dessert': [
    { name: 'Vanilla Gelato', subSubCategory: 'Gelato', description: 'Authentic Italian vanilla gelato', price: 180 },
    { name: 'Chocolate Gelato', subSubCategory: 'Gelato', description: 'Rich Belgian chocolate gelato', price: 200 },
    { name: 'Mango Sorbet', subSubCategory: 'Sorbet', description: 'Refreshing mango fruit sorbet', price: 150 },
    { name: 'Hot Fudge Sundae', subSubCategory: 'Sundaes', description: 'Vanilla ice cream with hot fudge', price: 280 },
    { name: 'Banana Split', subSubCategory: 'Sundaes', description: 'Classic banana split dessert', price: 320 },
    { name: 'Chocolate Shake', subSubCategory: 'Shakes', description: 'Thick chocolate milkshake', price: 220 },
    { name: 'Oreo Shake', subSubCategory: 'Shakes', description: 'Cookies and cream shake', price: 250 },
    { name: 'Frozen Yogurt', subSubCategory: 'Frozen Yogurt', description: 'Healthy frozen yogurt cup', price: 180 },
    { name: 'Kulfi', subSubCategory: 'Indian Desserts (Kulfi)', description: 'Traditional Indian ice cream', price: 120 },
    { name: 'Pista Kulfi', subSubCategory: 'Indian Desserts (Kulfi)', description: 'Pistachio flavored kulfi', price: 150 },
  ],
  'bakery-confectionery': [
    { name: 'Chocolate Cake', subSubCategory: 'Cakes & Pastries', description: 'Rich chocolate layer cake', price: 450 },
    { name: 'Red Velvet Cake', subSubCategory: 'Cakes & Pastries', description: 'Classic red velvet with cream cheese', price: 480 },
    { name: 'Croissant', subSubCategory: 'Cakes & Pastries', description: 'Buttery French pastry', price: 120 },
    { name: 'Sourdough Bread', subSubCategory: 'Bread', description: 'Artisan sourdough loaf', price: 180 },
    { name: 'Whole Wheat Bread', subSubCategory: 'Bread', description: 'Healthy whole grain bread', price: 80 },
    { name: 'Chocolate Chip Cookies', subSubCategory: 'Cookies & Brownies', description: 'Classic chocolate chip cookies', price: 150 },
    { name: 'Brownie', subSubCategory: 'Cookies & Brownies', description: 'Fudgy chocolate brownie', price: 120 },
    { name: 'Glazed Donut', subSubCategory: 'Donuts', description: 'Classic glazed ring donut', price: 80 },
    { name: 'Chocolate Donut', subSubCategory: 'Donuts', description: 'Chocolate frosted donut', price: 100 },
    { name: 'Gulab Jamun', subSubCategory: 'Indian Sweets (Mithai)', description: 'Fried milk balls in syrup', price: 80 },
    { name: 'Rasgulla', subSubCategory: 'Indian Sweets (Mithai)', description: 'Soft cheese balls in syrup', price: 80 },
  ],
};

async function fixProductAssignments() {
  try {
    console.log('🚀 Starting product-store assignment fix...');
    console.log(`📡 Connecting to MongoDB...`);

    await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db!;

    // Get all stores with their subcategory
    const stores = await db.collection('stores').find({ subcategorySlug: { $exists: true } }).toArray();
    console.log(`📦 Found ${stores.length} stores with subcategory assigned\n`);

    let totalUpdated = 0;
    let totalCreated = 0;

    for (const store of stores) {
      const subcategorySlug = store.subcategorySlug;
      const validSubSubCategories = SUBCATEGORY_VALID_SUBSUBCATEGORIES[subcategorySlug];
      const productTemplates = SUBCATEGORY_PRODUCTS[subcategorySlug];

      if (!validSubSubCategories) {
        console.log(`⚠️ ${store.name}: No valid subSubCategories defined for '${subcategorySlug}'`);
        continue;
      }

      console.log(`\n📦 Processing: ${store.name} (${subcategorySlug})`);

      // Get current products for this store
      const currentProducts = await db.collection('products').find({ store: store._id }).toArray();
      console.log(`   Current products: ${currentProducts.length}`);

      // Check which products have invalid subSubCategory
      const invalidProducts = currentProducts.filter(p =>
        !validSubSubCategories.some(valid =>
          p.subSubCategory?.toLowerCase().includes(valid.toLowerCase()) ||
          valid.toLowerCase().includes(p.subSubCategory?.toLowerCase() || '')
        )
      );

      console.log(`   Invalid products: ${invalidProducts.length}`);

      // Delete invalid products
      if (invalidProducts.length > 0) {
        const invalidIds = invalidProducts.map(p => p._id);
        await db.collection('products').deleteMany({ _id: { $in: invalidIds } });
        console.log(`   ❌ Deleted ${invalidProducts.length} invalid products`);
      }

      // Check how many valid products remain
      const remainingProducts = await db.collection('products').countDocuments({ store: store._id });
      console.log(`   Remaining valid products: ${remainingProducts}`);

      // If we have product templates and need more products, create them
      if (productTemplates && remainingProducts < 6) {
        const productsToCreate = Math.min(6 - remainingProducts, productTemplates.length);

        for (let i = 0; i < productsToCreate; i++) {
          const template = productTemplates[i];
          // Generate unique slug
          const uniqueId = Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
          const slug = `${template.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${store.slug}-${uniqueId}`;

          const newProduct = {
            name: template.name,
            slug: slug,
            description: template.description,
            subSubCategory: template.subSubCategory,
            store: store._id,
            category: store.category,
            price: {
              current: template.price,
              original: Math.round(template.price * 1.15),
              currency: 'INR',
              discount: 15
            },
            rating: {
              value: (4 + Math.random()).toFixed(1),
              count: Math.floor(Math.random() * 200) + 50
            },
            inventory: {
              stock: Math.floor(Math.random() * 50) + 10,
              isAvailable: true
            },
            images: [`https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 100000000)}?w=400&q=80`],
            tags: [template.subSubCategory.toLowerCase(), subcategorySlug],
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
          };

          await db.collection('products').insertOne(newProduct);
          totalCreated++;
        }
        console.log(`   ✅ Created ${productsToCreate} new products`);
      }

      totalUpdated++;
    }

    console.log('\n========================================');
    console.log('📊 FIX SUMMARY');
    console.log('========================================');
    console.log(`Stores processed: ${totalUpdated}`);
    console.log(`Products created: ${totalCreated}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

fixProductAssignments()
  .then(() => {
    console.log('✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
