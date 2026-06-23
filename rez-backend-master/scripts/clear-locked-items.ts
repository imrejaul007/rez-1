import mongoose from 'mongoose';
import { Cart } from '../src/models/Cart';

async function clearLockedItems() {
  try {
    // Connect to database
    const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find all carts
    const carts = await Cart.find({});
    console.log(`📦 Found ${carts.length} carts`);

    for (const cart of carts) {
      if (!cart.lockedItems || cart.lockedItems.length === 0) {
        console.log(`\n🛒 Cart ${cart._id}: No locked items`);
        continue;
      }

      console.log(`\n🛒 Cart ${cart._id}:`);
      console.log(`   User: ${cart.user}`);
      console.log(`   Locked items count: ${cart.lockedItems.length}`);

      // Check first locked item
      if (cart.lockedItems.length > 0) {
        const firstItem = (cart.lockedItems[0] as any);
        console.log('   First item product field type:', typeof firstItem.product);

        if (typeof firstItem.product === 'object' && firstItem.product._id) {
          console.log('   Product is populated object with _id:', firstItem.product._id);
        } else if (typeof firstItem.product === 'string') {
          console.log('   Product is string, first 100 chars:', firstItem.product.substring(0, 100));
        }
      }

      // Clear all locked items
      console.log('   🧹 Clearing ALL locked items...');
      cart.lockedItems = [];
      await cart.save();
      console.log('   ✅ All locked items cleared!');
    }

    console.log('\n✅ All locked items have been cleared from all carts');
    console.log('   Users can now lock items fresh without corruption');

    await mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

clearLockedItems();