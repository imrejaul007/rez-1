/**
 * Clear Frontend Cache
 *
 * This script clears all cached data in AsyncStorage to ensure
 * the app fetches fresh data from the backend.
 *
 * Run this if you're seeing old/stale data after backend changes.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

async function clearAllCache() {
  console.log('🧹 Starting cache clear operation...\n');

  try {
    // Get all keys
    const keys = await AsyncStorage.getAllKeys();
    console.log(`📋 Found ${keys.length} cached items:\n`);

    // Show what will be cleared
    keys.forEach((key, index) => {
      console.log(`   ${index + 1}. ${key}`);
    });

    console.log('\n🗑️  Clearing all cached data...');

    // Clear all
    await AsyncStorage.clear();

    console.log('✅ Cache cleared successfully!\n');
    console.log('💡 Next steps:');
    console.log('   1. Restart your app (shake device and reload)');
    console.log('   2. Or restart the dev server (npm start)');
    console.log('   3. Check console logs for "REAL ObjectId ✅" message');

  } catch (error) {
    console.error('❌ Failed to clear cache:', error);
  }
}

async function clearSpecificCache(pattern: string) {
  console.log(`🧹 Clearing cache items matching pattern: "${pattern}"\n`);

  try {
    const keys = await AsyncStorage.getAllKeys();
    const matchingKeys = keys.filter(key => key.includes(pattern));

    if (matchingKeys.length === 0) {
      console.log(`ℹ️  No cache items found matching "${pattern}"`);
      return;
    }

    console.log(`📋 Found ${matchingKeys.length} matching items:\n`);
    matchingKeys.forEach((key, index) => {
      console.log(`   ${index + 1}. ${key}`);
    });

    console.log('\n🗑️  Clearing matched items...');
    await AsyncStorage.multiRemove(matchingKeys);

    console.log('✅ Cache cleared successfully!');

  } catch (error) {
    console.error('❌ Failed to clear cache:', error);
  }
}

// Main execution
const args = process.argv.slice(2);

if (args.length > 0) {
  clearSpecificCache(args[0]);
} else {
  clearAllCache();
}

// Export for use in app
export { clearAllCache, clearSpecificCache };
