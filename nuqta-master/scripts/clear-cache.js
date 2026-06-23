#!/usr/bin/env node

/**
 * Clear all Metro bundler and Expo caches
 * Run this script when experiencing bundling issues or stuck builds
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '..');
const pathsToClean = [
  // Metro cache
  path.join(projectRoot, 'node_modules/.cache'),
  path.join(projectRoot, '.metro'),
  
  // Expo cache
  path.join(projectRoot, '.expo'),
  path.join(projectRoot, '.expo-shared'),
  
  // Web cache
  path.join(projectRoot, '.expo/web'),
  
  // Watchman cache (if exists)
  path.join(projectRoot, '.watchmanconfig'),
  
  // Build artifacts
  path.join(projectRoot, 'dist'),
  path.join(projectRoot, 'build'),
];

console.log('🧹 Clearing all caches...\n');

let cleanedCount = 0;
let errorCount = 0;

pathsToClean.forEach((cleanPath) => {
  try {
    if (fs.existsSync(cleanPath)) {
      console.log(`  Removing: ${path.relative(projectRoot, cleanPath)}`);
      fs.rmSync(cleanPath, { recursive: true, force: true });
      cleanedCount++;
    }
  } catch (error) {
    console.error(`  ❌ Error removing ${cleanPath}:`, error.message);
    errorCount++;
  }
});

// Clear npm cache (optional, but can help)
try {
  console.log('\n  Clearing npm cache...');
  execSync('npm cache clean --force', { stdio: 'inherit', cwd: projectRoot });
  console.log('  ✅ npm cache cleared');
} catch (error) {
  console.log('  ⚠️  Could not clear npm cache (this is optional)');
}

// Clear watchman (if installed)
try {
  console.log('\n  Clearing watchman...');
  execSync('watchman watch-del-all', { stdio: 'inherit', cwd: projectRoot });
  console.log('  ✅ watchman cleared');
} catch (error) {
  console.log('  ℹ️  Watchman not installed or not running (this is optional)');
}

// Windows-specific: Clear temp Metro files
if (process.platform === 'win32') {
  try {
    const tempMetro = path.join(require('os').tmpdir(), 'metro-*');
    console.log('\n  Clearing Windows temp Metro files...');
    // Note: This might fail if files are locked, which is okay
    console.log('  ℹ️  Windows temp files will be cleared on next restart');
  } catch (error) {
    // Ignore errors for temp cleanup
  }
}

console.log(`\n✅ Cache clearing complete!`);
console.log(`   Cleaned: ${cleanedCount} directories`);
if (errorCount > 0) {
  console.log(`   Errors: ${errorCount}`);
}
console.log('\n💡 Next steps:');
console.log('   1. Run: npm install');
console.log('   2. Run: npm start -- --clear');
console.log('   3. If still stuck, try: npm run start:clear');

