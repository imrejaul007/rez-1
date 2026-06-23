const mongoose = require('mongoose');
require('dotenv').config();

async function assignMissingCategories() {
  // Connect to MongoDB
  await mongoose.connect(process.env.MONGODB_URI, {
    dbName: process.env.DB_NAME || 'test'
  });
  console.log('✅ Connected to MongoDB');

  const db = mongoose.connection.db;

  try {
    console.log('\n🔍 Assigning missing categories...\n');

    const storesCollection = db.collection('stores');
    const categoriesCollection = db.collection('categories');

    // Get all categories
    const categories = await categoriesCollection.find({}).toArray();
    console.log(`📂 Found ${categories.length} categories`);

    // Create category lookup by name/keywords
    const categoryMapping = {
      // Fashion stores
      fashion: ['Fashion', 'Men\'s Fashion', 'Women\'s Fashion', 'Kids Fashion'],
      trendy: ['Fashion', 'Men\'s Fashion', 'Women\'s Fashion'],
      style: ['Fashion', 'Men\'s Fashion', 'Women\'s Fashion'],
      urban: ['Fashion', 'Men\'s Fashion'],
      chic: ['Fashion', 'Women\'s Fashion'],
      threads: ['Fashion'],
      avenue: ['Fashion'],

      // Food & Dining
      spice: ['Restaurant', 'Food & Dining'],
      italian: ['Restaurant', 'Food & Dining'],
      corner: ['Restaurant', 'Food & Dining'],
      garden: ['Organic', 'Food & Dining'],

      // Technology
      tech: ['Electronics', 'Technology'],
      gadget: ['Electronics', 'Technology'],
      hub: ['Electronics', 'Technology'],
      zone: ['Electronics', 'Technology'],

      // Groceries & Organic
      organic: ['Organic', 'Food & Dining'],
      nature: ['Organic', 'Food & Dining'],
      fresh: ['Groceries', 'Food & Dining'],
      mart: ['Groceries'],
      grocery: ['Groceries'],
      valley: ['Organic', 'Food & Dining'],

      // Health & Pharmacy
      health: ['Health & Wellness', 'Pharmacy'],
      care: ['Health & Wellness', 'Pharmacy'],
      pharmacy: ['Pharmacy', 'Health & Wellness'],

      // Markets
      market: ['Groceries', 'Food & Dining'],
      basket: ['Groceries', 'Food & Dining'],
      fruits: ['Groceries', 'Food & Dining'],
      veggie: ['Groceries', 'Food & Dining'],
      meat: ['Groceries', 'Food & Dining'],
      express: ['Groceries', 'Food & Dining'],

      // Rentals
      rentals: ['Services', 'Rental Services'],
      bond: ['Rental Services'],
      adventure: ['Rental Services', 'Sports'],

      // Gifts
      gift: ['Gifts & Celebrations'],
      celebration: ['Gifts & Celebrations'],
      galaxy: ['Gifts & Celebrations'],
    };

    // Find a category by name
    function findCategory(names) {
      for (const name of names) {
        const category = categories.find(c =>
          c.name.toLowerCase() === name.toLowerCase() ||
          c.slug?.toLowerCase() === name.toLowerCase().replace(/\s+/g, '-')
        );
        if (category) return category._id;
      }
      return null;
    }

    // Get stores without categories
    const storesWithoutCategories = await storesCollection.find({
      $or: [
        { category: { $exists: false } },
        { category: null }
      ]
    }).toArray();

    console.log(`📦 Found ${storesWithoutCategories.length} stores without categories\n`);

    let assignedCount = 0;
    const defaultCategory = categories.find(c => c.name === 'General') || categories[0];

    for (const store of storesWithoutCategories) {
      const storeName = store.name.toLowerCase();
      let categoryId = null;

      // Try to match by keywords in store name
      for (const [keyword, categoryNames] of Object.entries(categoryMapping)) {
        if (storeName.includes(keyword)) {
          categoryId = findCategory(categoryNames);
          if (categoryId) {
            console.log(`✅ "${store.name}" → ${categoryNames[0]} (matched: ${keyword})`);
            break;
          }
        }
      }

      // If no match found, use default
      if (!categoryId && defaultCategory) {
        categoryId = defaultCategory._id;
        console.log(`⚙️  "${store.name}" → ${defaultCategory.name} (default)`);
      }

      // Update the store
      if (categoryId) {
        await storesCollection.updateOne(
          { _id: store._id },
          { $set: { category: categoryId } }
        );
        assignedCount++;
      }
    }

    console.log('\n✅ Assignment completed!');
    console.log(`📊 Assigned categories to: ${assignedCount} stores`);

  } catch (error) {
    console.error('❌ Error assigning categories:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Database connection closed');
    process.exit(0);
  }
}

assignMissingCategories();
