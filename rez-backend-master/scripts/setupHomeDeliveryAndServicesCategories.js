/**
 * Setup Home Delivery and Services Categories
 * Creates/verifies categories and assigns stores based on name/tags
 */

const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };
const DB_NAME = 'test';

// Home Delivery subcategories
const HOME_DELIVERY_CATEGORIES = [
  {
    name: 'Cloud Kitchens',
    slug: 'cloud-kitchens',
    type: 'home_delivery',
    description: 'Virtual restaurants and cloud kitchen food delivery',
    icon: 'cloud-outline',
    keywords: ['cloud kitchen', 'virtual kitchen', 'ghost kitchen', 'box8', 'mojo pizza', 'behrouz', 'faasos', 'oven story', 'lunchbox', 'firangi bake', 'the bowl company', 'biryani by kilo', 'rebel foods']
  },
  {
    name: 'Supermarkets',
    slug: 'supermarkets',
    type: 'home_delivery',
    description: 'Grocery stores and supermarkets for home delivery',
    icon: 'cart-outline',
    keywords: ['supermarket', 'grocery', 'mart', 'hypermarket', 'bigbasket', 'grofers', 'blinkit', 'zepto', 'instamart', 'dmart', 'd mart', 'reliance smart', 'spar', 'more megastore', 'star bazaar', 'ratnadeep', 'food world']
  },
  {
    name: 'Pharmacy',
    slug: 'pharmacy',
    type: 'home_delivery',
    description: 'Medicine and healthcare product delivery',
    icon: 'medkit-outline',
    keywords: ['pharmacy', 'pharma', 'medical store', 'medicine', 'apollo pharmacy', 'medplus', 'netmeds', 'pharmeasy', '1mg', 'wellness forever', 'frank ross', 'guardian pharmacy']
  },
  {
    name: 'Fresh Vegetables',
    slug: 'fresh-vegetables',
    type: 'home_delivery',
    description: 'Fresh produce and vegetable delivery',
    icon: 'leaf-outline',
    keywords: ['vegetable', 'veggie', 'fresh produce', 'organic farm', 'fruits and vegetables', 'sabzi', 'mandi', 'namdharis', 'fresh catch', 'farm fresh', 'nature basket']
  }
];

// Services subcategories - More specific keywords
const SERVICES_CATEGORIES = [
  {
    name: 'AC Repair',
    slug: 'ac-repair',
    type: 'services',
    description: 'Air conditioning repair and maintenance services',
    icon: 'snow-outline',
    // Much more specific - only match AC-related businesses
    keywords: ['ac repair', 'ac service', 'air conditioner', 'air conditioning', 'hvac', 'ac installation', 'ac maintenance', 'cooling service', 'split ac', 'window ac']
  },
  {
    name: 'Salons',
    slug: 'salons',
    type: 'services',
    description: 'Hair salons and beauty parlours',
    icon: 'cut-outline',
    keywords: ['salon', 'hair cut', 'haircut', 'beauty parlour', 'beauty parlor', 'barber', 'hairdresser', 'naturals salon', 'green trends', 'lakme salon', 'ylg', 'jawed habib', 'bounce salon', 'style studio', 'gentlemen grooming']
  },
  {
    name: 'Cleaning',
    slug: 'cleaning',
    type: 'services',
    description: 'Home and office cleaning services',
    icon: 'sparkles-outline',
    keywords: ['cleaning service', 'home cleaning', 'deep cleaning', 'housekeeping', 'maid service', 'sanitization', 'carpet cleaning', 'sofa cleaning', 'pest control', 'hicare', 'urban clap clean', 'sparkle clean']
  },
  {
    name: 'Spa & Massage',
    slug: 'spa-massage',
    type: 'services',
    description: 'Spa treatments and massage services',
    icon: 'leaf-outline',
    keywords: ['spa', 'massage', 'wellness spa', 'body massage', 'thai massage', 'ayurvedic massage', 'relaxation therapy', 'vriddhi wellness', 'o2 spa', 'tattva spa', 'yoga wellness']
  }
];

async function setupCategories() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db(DB_NAME);
    const categoriesCollection = db.collection('categories');
    const storesCollection = db.collection('stores');

    // First, clear incorrect assignments from previous run
    console.log('🧹 Clearing previous Home Delivery & Services subcategory assignments...');

    // Get all category IDs for home_delivery and services types
    const categoriesToClear = await categoriesCollection.find({
      slug: {
        $in: [
          'cloud-kitchens', 'supermarkets', 'pharmacy', 'fresh-vegetables',
          'ac-repair', 'salons', 'cleaning', 'spa-massage'
        ]
      }
    }).toArray();

    const categoryIdsToClear = categoriesToClear.map(c => c._id);

    // Remove these categories from all stores' subCategories
    if (categoryIdsToClear.length > 0) {
      const clearResult = await storesCollection.updateMany(
        { subCategories: { $in: categoryIdsToClear } },
        { $pull: { subCategories: { $in: categoryIdsToClear } } }
      );
      console.log(`  Cleared ${clearResult.modifiedCount} stores\n`);
    }

    // Get or create parent categories
    let homeDeliveryParent = await categoriesCollection.findOne({ slug: 'home-delivery' });
    if (!homeDeliveryParent) {
      const result = await categoriesCollection.insertOne({
        name: 'Home Delivery',
        slug: 'home-delivery',
        type: 'home_delivery',
        description: 'Home delivery services and stores',
        icon: 'home-outline',
        isActive: true,
        storeCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      homeDeliveryParent = { _id: result.insertedId };
      console.log('📁 Created Home Delivery parent category');
    }

    let servicesParent = await categoriesCollection.findOne({ slug: 'services' });
    if (!servicesParent) {
      const result = await categoriesCollection.insertOne({
        name: 'Services',
        slug: 'services',
        type: 'services',
        description: 'Professional services',
        icon: 'construct-outline',
        isActive: true,
        storeCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      servicesParent = { _id: result.insertedId };
      console.log('📁 Created Services parent category');
    }

    // Create/verify Home Delivery subcategories
    console.log('\n📦 Setting up Home Delivery subcategories...');
    const homeDeliveryCategoryMap = {};

    for (const cat of HOME_DELIVERY_CATEGORIES) {
      let category = await categoriesCollection.findOne({ slug: cat.slug });

      if (!category) {
        const result = await categoriesCollection.insertOne({
          name: cat.name,
          slug: cat.slug,
          type: cat.type,
          description: cat.description,
          icon: cat.icon,
          parent: homeDeliveryParent._id,
          isActive: true,
          storeCount: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        homeDeliveryCategoryMap[cat.slug] = { id: result.insertedId, keywords: cat.keywords };
        console.log(`  ✅ Created: ${cat.name} (${cat.slug})`);
      } else {
        await categoriesCollection.updateOne(
          { _id: category._id },
          { $set: { type: cat.type, parent: homeDeliveryParent._id } }
        );
        homeDeliveryCategoryMap[cat.slug] = { id: category._id, keywords: cat.keywords };
        console.log(`  ✓ Exists: ${cat.name} (${cat.slug})`);
      }
    }

    // Create/verify Services subcategories
    console.log('\n🔧 Setting up Services subcategories...');
    const servicesCategoryMap = {};

    for (const cat of SERVICES_CATEGORIES) {
      let category = await categoriesCollection.findOne({ slug: cat.slug });

      if (!category) {
        const result = await categoriesCollection.insertOne({
          name: cat.name,
          slug: cat.slug,
          type: cat.type,
          description: cat.description,
          icon: cat.icon,
          parent: servicesParent._id,
          isActive: true,
          storeCount: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        servicesCategoryMap[cat.slug] = { id: result.insertedId, keywords: cat.keywords };
        console.log(`  ✅ Created: ${cat.name} (${cat.slug})`);
      } else {
        await categoriesCollection.updateOne(
          { _id: category._id },
          { $set: { type: cat.type, parent: servicesParent._id } }
        );
        servicesCategoryMap[cat.slug] = { id: category._id, keywords: cat.keywords };
        console.log(`  ✓ Exists: ${cat.name} (${cat.slug})`);
      }
    }

    // Get all active stores
    const allStores = await storesCollection.find({ isActive: true }).toArray();
    console.log(`\n📊 Processing ${allStores.length} active stores...`);

    let homeDeliveryAssigned = 0;
    let servicesAssigned = 0;

    // Assign stores to Home Delivery categories
    console.log('\n📦 Assigning stores to Home Delivery categories...');

    for (const store of allStores) {
      const storeName = store.name.toLowerCase();
      const storeTags = (store.tags || []).map(t => t.toLowerCase());
      const storeDescription = (store.description || '').toLowerCase();
      const combinedText = `${storeName} ${storeTags.join(' ')} ${storeDescription}`;

      // Check Home Delivery categories
      for (const [slug, { id, keywords }] of Object.entries(homeDeliveryCategoryMap)) {
        const matches = keywords.some(keyword => combinedText.includes(keyword.toLowerCase()));

        if (matches) {
          await storesCollection.updateOne(
            { _id: store._id },
            {
              $addToSet: { subCategories: id },
              $set: { updatedAt: new Date() }
            }
          );
          console.log(`  ✅ ${store.name} → ${slug}`);
          homeDeliveryAssigned++;
          break; // First match wins for home delivery
        }
      }
    }

    // Assign stores to Services categories
    console.log('\n🔧 Assigning stores to Services categories...');

    for (const store of allStores) {
      const storeName = store.name.toLowerCase();
      const storeTags = (store.tags || []).map(t => t.toLowerCase());
      const storeDescription = (store.description || '').toLowerCase();
      const combinedText = `${storeName} ${storeTags.join(' ')} ${storeDescription}`;

      // Check Services categories
      for (const [slug, { id, keywords }] of Object.entries(servicesCategoryMap)) {
        const matches = keywords.some(keyword => combinedText.includes(keyword.toLowerCase()));

        if (matches) {
          await storesCollection.updateOne(
            { _id: store._id },
            {
              $addToSet: { subCategories: id },
              $set: { updatedAt: new Date() }
            }
          );
          console.log(`  ✅ ${store.name} → ${slug}`);
          servicesAssigned++;
          break; // First match wins for services
        }
      }
    }

    // Update store counts
    console.log('\n📊 Updating store counts...');

    for (const [slug, { id }] of Object.entries({ ...homeDeliveryCategoryMap, ...servicesCategoryMap })) {
      const count = await storesCollection.countDocuments({
        $or: [
          { category: id },
          { subCategories: id }
        ],
        isActive: true
      });

      await categoriesCollection.updateOne(
        { _id: id },
        { $set: { storeCount: count } }
      );
      console.log(`  - ${slug}: ${count} stores`);
    }

    console.log('\n📊 Summary:');
    console.log(`  - Home Delivery stores assigned: ${homeDeliveryAssigned}`);
    console.log(`  - Services stores assigned: ${servicesAssigned}`);
    console.log('\n✅ Category setup complete!');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await client.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the script
setupCategories().catch(console.error);
