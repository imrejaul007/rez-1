const fs = require('fs');
const path = require('path');

// List of route files to update
const routeFiles = [
  'src/routes/authRoutes.ts',
  'src/routes/storeRoutes.ts',
  'src/routes/productRoutes.ts',
  'src/routes/categoryRoutes.ts',
  'src/routes/locationRoutes.ts',
  'src/routes/reviewRoutes.ts',
  'src/routes/analyticsRoutes.ts',
  'src/routes/comparisonRoutes.ts',
  'src/routes/favoriteRoutes.ts',
  'src/routes/recommendationRoutes.ts',
  'src/routes/wishlistRoutes.ts',
  'src/routes/notificationRoutes.ts',
  'src/routes/projectRoutes.ts',
  'src/routes/videoRoutes.ts',
  'src/routes/orderRoutes.ts',
  'src/routes/cartRoutes.ts'
];

function enableRateLimitersInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Uncomment import statements
    const importRegex = /\/\/\s*import\s*{[^}]*}\s*from\s*['"]\.\.\/middleware\/rateLimiter['"];\s*\/\/\s*Disabled for development/g;
    if (importRegex.test(content)) {
      content = content.replace(importRegex, (match) => {
        return match.replace(/\/\/\s*/, '').replace(/\s*\/\/\s*Disabled for development/, '');
      });
      modified = true;
    }

    // Uncomment usage in route definitions
    const usageRegex = /\/\/\s*(\w+Limiter),?\s*\/\/\s*Disabled for development/g;
    if (usageRegex.test(content)) {
      content = content.replace(usageRegex, (match, limiterName) => {
        return `  ${limiterName},`;
      });
      modified = true;
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Updated: ${filePath}`);
    } else {
      console.log(`⏭️  No changes needed: ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
  }
}

function enableServerRateLimiter() {
  const serverPath = path.join(__dirname, '..', 'src', 'server.ts');
  try {
    let content = fs.readFileSync(serverPath, 'utf8');
    let modified = false;

    // Uncomment the general limiter import
    const importRegex = /\/\/\s*import\s*{\s*generalLimiter\s*}\s*from\s*['"]\.\/middleware\/rateLimiter['"];\s*\/\/\s*Disabled for development/g;
    if (importRegex.test(content)) {
      content = content.replace(importRegex, (match) => {
        return match.replace(/\/\/\s*/, '').replace(/\s*\/\/\s*Disabled for development/, '');
      });
      modified = true;
    }

    // Uncomment the limiter definition and usage
    const limiterRegex = /\/\/\s*Rate limiter disabled for development[\s\S]*?\/\/\s*app\.use\(limiter\);/g;
    if (limiterRegex.test(content)) {
      content = content.replace(limiterRegex, (match) => {
        return match.replace(/\/\/\s*/g, '');
      });
      modified = true;
    }

    if (modified) {
      fs.writeFileSync(serverPath, content, 'utf8');
      console.log(`✅ Updated: ${serverPath}`);
    } else {
      console.log(`⏭️  No changes needed: ${serverPath}`);
    }
  } catch (error) {
    console.error(`❌ Error updating server.ts:`, error.message);
  }
}

console.log('🚀 Re-enabling rate limiters for production...\n');

// Enable server rate limiter first
enableServerRateLimiter();

// Enable route rate limiters
routeFiles.forEach(file => {
  const fullPath = path.join(__dirname, '..', file);
  if (fs.existsSync(fullPath)) {
    enableRateLimitersInFile(fullPath);
  } else {
    console.log(`⚠️  File not found: ${file}`);
  }
});

console.log('\n✅ Rate limiter re-enabling complete!');
console.log('🔒 Rate limiters are now active for production security.');
