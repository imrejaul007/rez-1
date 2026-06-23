// SECURITY: hard-coded MongoDB credentials replaced with env-var reference.
// Set MONGODB_URI in your environment before running this script.

const mongoose = require('mongoose');

// Additional subcategories for categories that don't have any
const additionalSubcategories = [
  // Fashion & Beauty subcategories
  { name: 'Makeup & Cosmetics', slug: 'makeup-cosmetics', parentSlug: 'fashion-beauty', type: 'going_out' },
  { name: 'Skincare Products', slug: 'skincare-products', parentSlug: 'fashion-beauty', type: 'going_out' },
  { name: 'Hair Products', slug: 'hair-products', parentSlug: 'fashion-beauty', type: 'going_out' },
  { name: 'Perfumes', slug: 'perfumes', parentSlug: 'fashion-beauty', type: 'going_out' },
  { name: 'Nail Care', slug: 'nail-care', parentSlug: 'fashion-beauty', type: 'going_out' },

  // Food & Dining subcategories
  { name: 'Indian Cuisine', slug: 'indian-cuisine', parentSlug: 'food-dining', type: 'going_out' },
  { name: 'Chinese Cuisine', slug: 'chinese-cuisine', parentSlug: 'food-dining', type: 'going_out' },
  { name: 'Italian Cuisine', slug: 'italian-cuisine', parentSlug: 'food-dining', type: 'going_out' },
  { name: 'Continental', slug: 'continental', parentSlug: 'food-dining', type: 'going_out' },
  { name: 'Desserts & Sweets', slug: 'desserts-sweets', parentSlug: 'food-dining', type: 'going_out' },

  // Entertainment subcategories
  { name: 'Movies & Cinema', slug: 'movies-cinema', parentSlug: 'entertainment', type: 'going_out' },
  { name: 'Gaming Zones', slug: 'gaming-zones', parentSlug: 'entertainment', type: 'going_out' },
  { name: 'Amusement Parks', slug: 'amusement-parks', parentSlug: 'entertainment', type: 'going_out' },
  { name: 'Sports Events', slug: 'sports-events', parentSlug: 'entertainment', type: 'going_out' },
  { name: 'Live Shows', slug: 'live-shows', parentSlug: 'entertainment', type: 'going_out' },

  // Grocery & Essentials subcategories
  { name: 'Daily Essentials', slug: 'daily-essentials', parentSlug: 'grocery-essentials', type: 'home_delivery' },
  { name: 'Packaged Foods', slug: 'packaged-foods', parentSlug: 'grocery-essentials', type: 'home_delivery' },
  { name: 'Cleaning Supplies', slug: 'cleaning-supplies', parentSlug: 'grocery-essentials', type: 'home_delivery' },
  { name: 'Personal Hygiene', slug: 'personal-hygiene', parentSlug: 'grocery-essentials', type: 'home_delivery' },
  { name: 'Baby Care', slug: 'baby-care', parentSlug: 'grocery-essentials', type: 'home_delivery' },

  // Home & Living subcategories
  { name: 'Living Room', slug: 'living-room', parentSlug: 'home-living', type: 'home_delivery' },
  { name: 'Bedroom', slug: 'bedroom', parentSlug: 'home-living', type: 'home_delivery' },
  { name: 'Kitchen Items', slug: 'kitchen-items', parentSlug: 'home-living', type: 'home_delivery' },
  { name: 'Bathroom Accessories', slug: 'bathroom-accessories', parentSlug: 'home-living', type: 'home_delivery' },
  { name: 'Storage & Organization', slug: 'storage-organization', parentSlug: 'home-living', type: 'home_delivery' },

  // Health & Wellness subcategories
  { name: 'Vitamins & Supplements', slug: 'vitamins-supplements', parentSlug: 'health-wellness', type: 'home_delivery' },
  { name: 'Fitness Equipment', slug: 'fitness-equipment-hw', parentSlug: 'health-wellness', type: 'home_delivery' },
  { name: 'Medical Devices', slug: 'medical-devices', parentSlug: 'health-wellness', type: 'home_delivery' },
  { name: 'Ayurvedic Products', slug: 'ayurvedic-products', parentSlug: 'health-wellness', type: 'home_delivery' },
  { name: 'First Aid', slug: 'first-aid', parentSlug: 'health-wellness', type: 'home_delivery' },

  // Fresh Produce subcategories
  { name: 'Fresh Vegetables', slug: 'fresh-vegetables', parentSlug: 'fresh-produce', type: 'home_delivery' },
  { name: 'Fresh Fruits', slug: 'fresh-fruits', parentSlug: 'fresh-produce', type: 'home_delivery' },
  { name: 'Herbs & Greens', slug: 'herbs-greens', parentSlug: 'fresh-produce', type: 'home_delivery' },
  { name: 'Exotic Fruits', slug: 'exotic-fruits', parentSlug: 'fresh-produce', type: 'home_delivery' },
  { name: 'Organic Produce', slug: 'organic-produce', parentSlug: 'fresh-produce', type: 'home_delivery' },

  // Sports & Fitness subcategories
  { name: 'Gym Equipment', slug: 'gym-equipment', parentSlug: 'sports-fitness', type: 'home_delivery' },
  { name: 'Sports Gear', slug: 'sports-gear', parentSlug: 'sports-fitness', type: 'home_delivery' },
  { name: 'Yoga & Meditation', slug: 'yoga-meditation', parentSlug: 'sports-fitness', type: 'home_delivery' },
  { name: 'Running & Jogging', slug: 'running-jogging', parentSlug: 'sports-fitness', type: 'home_delivery' },
  { name: 'Swimming', slug: 'swimming', parentSlug: 'sports-fitness', type: 'home_delivery' },

  // Men's Fashion subcategories
  { name: 'Men Shirts', slug: 'men-shirts', parentSlug: 'mens-fashion', type: 'going_out' },
  { name: 'Men Trousers', slug: 'men-trousers', parentSlug: 'mens-fashion', type: 'going_out' },
  { name: 'Men Ethnic', slug: 'men-ethnic', parentSlug: 'mens-fashion', type: 'going_out' },
  { name: 'Men Suits', slug: 'men-suits', parentSlug: 'mens-fashion', type: 'going_out' },
  { name: 'Men Accessories', slug: 'men-accessories', parentSlug: 'mens-fashion', type: 'going_out' },

  // Women's Fashion subcategories
  { name: 'Women Dresses', slug: 'women-dresses', parentSlug: 'womens-fashion', type: 'going_out' },
  { name: 'Women Sarees', slug: 'women-sarees', parentSlug: 'womens-fashion', type: 'going_out' },
  { name: 'Women Kurtis', slug: 'women-kurtis', parentSlug: 'womens-fashion', type: 'going_out' },
  { name: 'Women Western', slug: 'women-western', parentSlug: 'womens-fashion', type: 'going_out' },
  { name: 'Women Accessories', slug: 'women-accessories', parentSlug: 'womens-fashion', type: 'going_out' },

  // Kids Fashion subcategories
  { name: 'Boys Clothing', slug: 'boys-clothing', parentSlug: 'kids-fashion', type: 'going_out' },
  { name: 'Girls Clothing', slug: 'girls-clothing', parentSlug: 'kids-fashion', type: 'going_out' },
  { name: 'Kids Footwear', slug: 'kids-footwear', parentSlug: 'kids-fashion', type: 'going_out' },
  { name: 'Kids Accessories', slug: 'kids-accessories', parentSlug: 'kids-fashion', type: 'going_out' },
  { name: 'School Uniforms', slug: 'school-uniforms', parentSlug: 'kids-fashion', type: 'going_out' },

  // Footwear subcategories
  { name: 'Sports Shoes', slug: 'sports-shoes', parentSlug: 'footwear', type: 'going_out' },
  { name: 'Casual Shoes', slug: 'casual-shoes', parentSlug: 'footwear', type: 'going_out' },
  { name: 'Formal Shoes', slug: 'formal-shoes', parentSlug: 'footwear', type: 'going_out' },
  { name: 'Sandals & Slippers', slug: 'sandals-slippers', parentSlug: 'footwear', type: 'going_out' },
  { name: 'Heels & Wedges', slug: 'heels-wedges', parentSlug: 'footwear', type: 'going_out' },

  // Accessories subcategories
  { name: 'Bags & Wallets', slug: 'bags-wallets', parentSlug: 'accessories', type: 'going_out' },
  { name: 'Belts', slug: 'belts', parentSlug: 'accessories', type: 'going_out' },
  { name: 'Sunglasses', slug: 'sunglasses', parentSlug: 'accessories', type: 'going_out' },
  { name: 'Hats & Caps', slug: 'hats-caps', parentSlug: 'accessories', type: 'going_out' },
  { name: 'Scarves & Stoles', slug: 'scarves-stoles', parentSlug: 'accessories', type: 'going_out' },

  // Beauty & Cosmetics subcategories
  { name: 'Face Makeup', slug: 'face-makeup', parentSlug: 'beauty-cosmetics', type: 'going_out' },
  { name: 'Eye Makeup', slug: 'eye-makeup', parentSlug: 'beauty-cosmetics', type: 'going_out' },
  { name: 'Lip Care', slug: 'lip-care', parentSlug: 'beauty-cosmetics', type: 'going_out' },
  { name: 'Skin Care', slug: 'skin-care', parentSlug: 'beauty-cosmetics', type: 'going_out' },
  { name: 'Makeup Tools', slug: 'makeup-tools', parentSlug: 'beauty-cosmetics', type: 'going_out' },

  // Fleet Market subcategories (fleet)
  { name: 'New Cars', slug: 'new-cars', parentSlug: 'fleet', type: 'going_out' },
  { name: 'Used Cars', slug: 'used-cars', parentSlug: 'fleet', type: 'going_out' },
  { name: 'Motorcycles', slug: 'motorcycles', parentSlug: 'fleet', type: 'going_out' },
  { name: 'Commercial Vehicles', slug: 'commercial-vehicles', parentSlug: 'fleet', type: 'going_out' },
  { name: 'Auto Services', slug: 'auto-services', parentSlug: 'fleet', type: 'going_out' },

  // Organic subcategories
  { name: 'Organic Vegetables', slug: 'organic-vegetables', parentSlug: 'organic', type: 'home_delivery' },
  { name: 'Organic Fruits', slug: 'organic-fruits', parentSlug: 'organic', type: 'home_delivery' },
  { name: 'Organic Grains', slug: 'organic-grains', parentSlug: 'organic', type: 'home_delivery' },
  { name: 'Organic Dairy', slug: 'organic-dairy', parentSlug: 'organic', type: 'home_delivery' },
  { name: 'Organic Snacks', slug: 'organic-snacks', parentSlug: 'organic', type: 'home_delivery' },

  // Medicine subcategories
  { name: 'Prescription Medicines', slug: 'prescription-medicines', parentSlug: 'medicine', type: 'home_delivery' },
  { name: 'OTC Medicines', slug: 'otc-medicines', parentSlug: 'medicine', type: 'home_delivery' },
  { name: 'Ayurvedic Medicines', slug: 'ayurvedic-medicines', parentSlug: 'medicine', type: 'home_delivery' },
  { name: 'Homeopathy', slug: 'homeopathy', parentSlug: 'medicine', type: 'home_delivery' },
  { name: 'Health Devices', slug: 'health-devices', parentSlug: 'medicine', type: 'home_delivery' },

  // Fruit subcategories
  { name: 'Seasonal Fruits', slug: 'seasonal-fruits', parentSlug: 'fruit', type: 'home_delivery' },
  { name: 'Imported Fruits', slug: 'imported-fruits', parentSlug: 'fruit', type: 'home_delivery' },
  { name: 'Dry Fruits', slug: 'dry-fruits', parentSlug: 'fruit', type: 'home_delivery' },
  { name: 'Fresh Juices', slug: 'fresh-juices', parentSlug: 'fruit', type: 'home_delivery' },
  { name: 'Fruit Combos', slug: 'fruit-combos', parentSlug: 'fruit', type: 'home_delivery' },

  // Meat subcategories
  { name: 'Chicken', slug: 'chicken', parentSlug: 'meat', type: 'home_delivery' },
  { name: 'Mutton', slug: 'mutton', parentSlug: 'meat', type: 'home_delivery' },
  { name: 'Fish & Seafood', slug: 'fish-seafood', parentSlug: 'meat', type: 'home_delivery' },
  { name: 'Eggs', slug: 'eggs', parentSlug: 'meat', type: 'home_delivery' },
  { name: 'Ready to Cook', slug: 'ready-to-cook', parentSlug: 'meat', type: 'home_delivery' },

  // Fleet Market (fleet-market) subcategories
  { name: 'Two Wheelers', slug: 'two-wheelers', parentSlug: 'fleet-market', type: 'going_out' },
  { name: 'Four Wheelers', slug: 'four-wheelers', parentSlug: 'fleet-market', type: 'going_out' },
  { name: 'Electric Vehicles', slug: 'electric-vehicles', parentSlug: 'fleet-market', type: 'going_out' },
  { name: 'Vehicle Insurance', slug: 'vehicle-insurance', parentSlug: 'fleet-market', type: 'going_out' },
  { name: 'Vehicle Loans', slug: 'vehicle-loans', parentSlug: 'fleet-market', type: 'going_out' },
];

async function addMoreSubcategories() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect('process.env.MONGODB_URI');
    console.log('✅ Connected!\n');

    const db = mongoose.connection.db;
    const collection = db.collection('categories');

    // Get all parent categories
    const parents = await collection.find({ parentCategory: null }).toArray();
    const parentMap = new Map(parents.map(p => [p.slug, p._id]));

    console.log('📋 Found', parents.length, 'parent categories\n');

    // Get existing subcategory slugs
    const existingSubs = await collection.find({ parentCategory: { $ne: null } }).project({ slug: 1 }).toArray();
    const existingSlugs = new Set(existingSubs.map(s => s.slug));

    let createdCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    console.log('🌱 Creating subcategories...\n');

    for (const sub of additionalSubcategories) {
      // Skip if already exists
      if (existingSlugs.has(sub.slug)) {
        console.log('   ⚠️  Skipped:', sub.name, '- already exists');
        skippedCount++;
        continue;
      }

      // Find parent
      const parentId = parentMap.get(sub.parentSlug);
      if (!parentId) {
        console.log('   ❌ Parent not found for:', sub.name, '- parent slug:', sub.parentSlug);
        errorCount++;
        continue;
      }

      try {
        await collection.insertOne({
          name: sub.name,
          slug: sub.slug,
          description: sub.name + ' products',
          type: sub.type,
          parentCategory: parentId,
          isActive: true,
          metadata: {
            featured: false,
            tags: [sub.slug.replace(/-/g, ' ')]
          },
          createdAt: new Date(),
          updatedAt: new Date()
        });
        console.log('   ✅ Created:', sub.name, '→', sub.parentSlug);
        createdCount++;
      } catch (err) {
        if (err.code === 11000) {
          console.log('   ⚠️  Skipped:', sub.name, '- duplicate');
          skippedCount++;
        } else {
          console.log('   ❌ Error:', sub.name, '-', err.message);
          errorCount++;
        }
      }
    }

    console.log('\n📈 Summary:');
    console.log('   ✅ Created:', createdCount);
    console.log('   ⚠️  Skipped:', skippedCount);
    console.log('   ❌ Errors:', errorCount);

    // Final count
    const totalParents = await collection.countDocuments({ parentCategory: null });
    const totalSubs = await collection.countDocuments({ parentCategory: { $ne: null } });
    const total = await collection.countDocuments();

    console.log('\n📊 Final Count:');
    console.log('   📁 Parent Categories:', totalParents);
    console.log('   📂 Subcategories:', totalSubs);
    console.log('   📦 Total:', total);

    await mongoose.disconnect();
    console.log('\n✅ Done!');
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

addMoreSubcategories();
