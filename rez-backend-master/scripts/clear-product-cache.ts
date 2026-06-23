/**
 * Script to clear product cache from Redis
 * Run this after adding new fields to Product model
 */

import redisService from '../src/services/redisService';

async function clearProductCache() {
  try {
    console.log('🔄 Connecting to Redis...');

    // Clear all product-related cache keys
    const patterns = [
      'product:*',
      'products:*',
      'category:*'
    ];

    for (const pattern of patterns) {
      console.log(`🗑️  Clearing cache pattern: ${pattern}`);

      // Get all keys matching the pattern
      const keys = await redisService.keys(pattern);

      if (keys.length > 0) {
        console.log(`   Found ${keys.length} keys to delete`);

        // Delete all matching keys
        for (const key of keys) {
          await redisService.delete(key);
        }

        console.log(`   ✅ Deleted ${keys.length} cache entries`);
      } else {
        console.log(`   No keys found for pattern: ${pattern}`);
      }
    }

    console.log('\n🎉 Product cache cleared successfully!');
    console.log('💡 Backend will now fetch fresh data with productType field\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing cache:', error);
    process.exit(1);
  }
}

clearProductCache();
