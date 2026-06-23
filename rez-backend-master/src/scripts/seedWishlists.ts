import mongoose from 'mongoose';
import { connectDatabase } from '../config/database';
import { Wishlist } from '../models/Wishlist';
import { User } from '../models/User';
import { Product } from '../models/Product';

async function seedWishlists() {
  try {
    console.log('🚀 Starting Wishlist seeding...');
    
    // Connect to database
    await connectDatabase();
    console.log('✅ Connected to database');
    
    // Get existing data to create relationships
    const users = await User.find({}).limit(10);
    const products = await Product.find({}).limit(10);
    
    if (users.length === 0 || products.length === 0) {
      console.log('❌ Please run basic seeding first (users, products)');
      process.exit(1);
    }
    
    console.log(`Found ${users.length} users, ${products.length} products`);
    
    // Clear existing wishlists
    await Wishlist.deleteMany({});
    console.log('🗑️  Cleared existing wishlists');
    
    // Create sample wishlists
    const wishlists = [];
    
    // Create wishlist for each user with different products
    for (let i = 0; i < Math.min(users.length, 4); i++) {
      const user = users[i];
      const userProducts = products.slice(i, i + 3); // Each user gets 2-3 different products
      
      if (userProducts.length > 0) {
        const wishlistItems = userProducts.map((product, index) => ({
          itemType: 'Product',
          itemId: product._id,
          addedAt: new Date(Date.now() - (index + 1) * 86400000 * (i + 1)),
          priceWhenAdded: product.pricing?.selling || 1999,
          notes: [
            'Waiting for sale',
            'Birthday gift idea',
            'Next month purchase',
            'Checking reviews first',
            'Comparing with alternatives'
          ][Math.floor(Math.random() * 5)],
          notifyOnPriceChange: Math.random() > 0.5,
          notifyOnAvailability: Math.random() > 0.7,
          priority: ['high', 'medium', 'low'][Math.floor(Math.random() * 3)],
          tags: ['wishlist', 'wanted']
        }));
        
        wishlists.push({
          user: user._id,
          items: wishlistItems,
          name: [
            'My Favorites',
            'Want to Buy',
            'Gift Ideas', 
            'Future Purchases',
            'Birthday Wishlist'
          ][i % 5],
          description: [
            'Items I really want to buy soon',
            'Things on my shopping list',
            'Perfect gifts for special occasions',
            'Products I\'m considering',
            'My dream purchases'
          ][i % 5],
          isPublic: Math.random() > 0.6, // 40% chance of being public
          tags: [
            ['electronics', 'gadgets'],
            ['fashion', 'style'],
            ['home', 'decor'],
            ['fitness', 'health'],
            ['books', 'education']
          ][i % 5],
          sharing: {
            isPublic: Math.random() > 0.6,
            shareCode: 'WL' + Math.random().toString(36).substr(2, 8).toUpperCase(),
            sharedWith: [],
            allowCopying: Math.random() > 0.5,
            allowComments: Math.random() > 0.5,
            sharedAt: Math.random() > 0.3 ? new Date(Date.now() - Math.floor(Math.random() * 86400000)) : undefined
          },
          analytics: {
            viewCount: Math.floor(Math.random() * 50),
            shareCount: Math.floor(Math.random() * 10),
            itemsAddedCount: wishlistItems.length,
            itemsPurchasedCount: Math.floor(Math.random() * 2),
            avgTimeToPurchase: Math.floor(Math.random() * 30) + 1 // days
          }
        });
      }
    }
    
    // Add a collaborative wishlist
    if (users.length >= 2) {
      wishlists.push({
        user: users[0]._id,
        items: products.slice(0, 2).map(product => ({
          itemType: 'Product',
          itemId: product._id,
          addedAt: new Date(Date.now() - 172800000),
          priceWhenAdded: product.pricing?.selling || 1999,
          notes: 'Added by family member',
          notifyOnPriceChange: true,
          notifyOnAvailability: false,
          priority: 'high',
          tags: ['family', 'shared']
        })),
        name: 'Family Wishlist',
        description: 'Shared wishlist for family purchases and gifts',
        isPublic: false,
        tags: ['family', 'shared', 'gifts'],
        sharing: {
          isPublic: false,
          shareCode: 'FAMILY' + Math.random().toString(36).substr(2, 6).toUpperCase(),
          sharedWith: [users[1]._id],
          allowCopying: true,
          allowComments: true,
          sharedAt: new Date(Date.now() - 259200000)
        },
        analytics: {
          viewCount: 15,
          shareCount: 1,
          itemsAddedCount: 2,
          itemsPurchasedCount: 0,
          avgTimeToSearch: 5
        }
      });
    }
    
    const createdWishlists = await Wishlist.insertMany(wishlists);
    console.log(`✅ Created ${createdWishlists.length} wishlists`);
    
    // Display summary
    console.log('\n📊 Wishlist Summary:');
    for (let i = 0; i < createdWishlists.length; i++) {
      const wishlist = createdWishlists[i];
      const user = users.find(u => u._id?.toString() === wishlist.user?.toString());
      const userName = user?.profile?.firstName || 'Unknown';
      const isPublic = wishlist.isPublic ? '🌍 Public' : '🔒 Private';
      
      console.log(`  ${i + 1}. "${wishlist.name}" by ${userName} - ${wishlist.items.length} items ${isPublic}`);
      
      // Show first few items
      for (let j = 0; j < Math.min(wishlist.items.length, 2); j++) {
        const item = wishlist.items[j];
        const product = products.find(p => p._id?.toString() === item.itemId?.toString());
        const productName = product?.name || 'Unknown Product';
        console.log(`     - ${productName} (₹${item.priceWhenAdded}) - ${item.priority} priority`);
      }
    }
    
    console.log('\n🎉 Wishlist seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding wishlists:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from database');
    process.exit(0);
  }
}

if (require.main === module) {
  seedWishlists();
}

export { seedWishlists };