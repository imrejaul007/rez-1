const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };

async function updateOldProducts() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const productsCollection = mongoose.connection.db.collection('products');

    // Find products that need updating
    const productsToUpdate = await productsCollection.find({
      $or: [
        { 'price.current': { $exists: false } },
        { 'price.current': 0 },
        { 'price.current': null },
        { image: { $exists: false } },
        { image: null },
        { image: '' }
      ]
    }).toArray();

    console.log(`🔍 Found ${productsToUpdate.length} products that need updating:\n`);

    if (productsToUpdate.length === 0) {
      console.log('✅ All products are already properly formatted!');
      await mongoose.connection.close();
      return;
    }

    let updated = 0;

    for (const product of productsToUpdate) {
      const updates = {};

      console.log(`📦 Updating: ${product.name || product.title || 'Unnamed Product'}`);

      // Fix price structure if missing or invalid
      if (!product.price || product.price.current === 0 || product.price.current == null) {
        // Try to use existing price field if it exists as a number
        const priceValue = typeof product.price === 'number' ? product.price : 299;

        updates.price = {
          current: priceValue,
          original: Math.round(priceValue * 1.3), // 30% markup for original price
          currency: '₹',
          discount: Math.round(((priceValue * 1.3 - priceValue) / (priceValue * 1.3)) * 100)
        };
        console.log(`   ✓ Fixed price: ₹${priceValue}`);
      }

      // Fix image if missing
      if (!product.image || product.image === '') {
        // Use a generic placeholder based on product name/category
        const productName = (product.name || product.title || '').toLowerCase();
        let imageUrl = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500'; // default product

        if (productName.includes('vitamin') || productName.includes('tablet')) {
          imageUrl = 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500';
        } else if (productName.includes('thermometer')) {
          imageUrl = 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=500';
        } else if (productName.includes('vegetable')) {
          imageUrl = 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500';
        } else if (productName.includes('rice')) {
          imageUrl = 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500';
        } else if (productName.includes('pizza')) {
          imageUrl = 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=500';
        } else if (productName.includes('milk')) {
          imageUrl = 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=500';
        }

        updates.image = imageUrl;
        console.log(`   ✓ Added image`);
      }

      // Ensure title exists (use name if title is missing)
      if (!product.title && product.name) {
        updates.title = product.name;
      } else if (!product.name && product.title) {
        updates.name = product.title;
      }

      // Ensure rating structure exists
      if (!product.rating || typeof product.rating.value === 'undefined') {
        updates.rating = {
          value: (Math.random() * 2 + 3).toFixed(1), // 3.0 to 5.0
          count: Math.floor(Math.random() * 200) + 10
        };
        console.log(`   ✓ Added rating: ${updates.rating.value}`);
      }

      // Ensure inventory structure exists
      if (!product.inventory || typeof product.inventory.isAvailable === 'undefined') {
        updates.inventory = {
          isAvailable: true,
          stock: Math.floor(Math.random() * 300) + 50,
          ...(product.inventory || {}) // Keep existing inventory fields
        };
        console.log(`   ✓ Added inventory`);
      }

      // Only update if there are changes
      if (Object.keys(updates).length > 0) {
        await productsCollection.updateOne(
          { _id: product._id },
          { $set: updates }
        );
        updated++;
        console.log(`   ✅ Updated successfully\n`);
      }
    }

    console.log(`\n🎉 Successfully updated ${updated} products!\n`);

    // Verify all products now have valid data
    const stillInvalid = await productsCollection.countDocuments({
      $or: [
        { 'price.current': { $exists: false } },
        { 'price.current': 0 },
        { 'price.current': null },
        { image: { $exists: false } },
        { image: null },
        { image: '' }
      ]
    });

    console.log(`Remaining products with issues: ${stillInvalid}`);

    if (stillInvalid === 0) {
      console.log('✅ All products now have valid data!\n');
    }

    // Show product count per store
    console.log('📊 Products per store:\n');
    const storesCollection = mongoose.connection.db.collection('stores');
    const stores = await storesCollection.find().limit(10).toArray();

    for (const store of stores) {
      const count = await productsCollection.countDocuments({ store: store._id });
      if (count > 0) {
        console.log(`${store.name}: ${count} products`);
      }
    }

    await mongoose.connection.close();
    console.log('\n✅ Update complete!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

updateOldProducts();
