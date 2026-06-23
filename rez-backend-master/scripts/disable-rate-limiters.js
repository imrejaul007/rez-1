const fs = require('fs');
const path = require('path');

// List of route files to update
const routeFiles = [
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

// Rate limiter names to disable
const rateLimiters = [
  'generalLimiter',
  'searchLimiter',
  'authLimiter',
  'otpLimiter',
  'securityLimiter',
  'uploadLimiter',
  'reviewLimiter',
  'analyticsLimiter',
  'comparisonLimiter',
  'favoriteLimiter',
  'recommendationLimiter',
  'strictLimiter'
];

function disableRateLimitersInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Comment out import statements
    rateLimiters.forEach(limiter => {
      const importRegex = new RegExp(`import\\s*{[^}]*${limiter}[^}]*}\\s*from\\s*['"]\\.\\./middleware/rateLimiter['"];?`, 'g');
      if (importRegex.test(content)) {
        content = content.replace(importRegex, (match) => {
          return `// ${match} // Disabled for development`;
        });
        modified = true;
      }
    });

    // Comment out usage in route definitions
    rateLimiters.forEach(limiter => {
      const usageRegex = new RegExp(`^\\s*${limiter},?\\s*$`, 'gm');
      if (usageRegex.test(content)) {
        content = content.replace(usageRegex, (match) => {
          return `  // ${match.trim()}, // Disabled for development`;
        });
        modified = true;
      }
    });

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

console.log('🚀 Disabling rate limiters for development...\n');

routeFiles.forEach(file => {
  const fullPath = path.join(__dirname, '..', file);
  if (fs.existsSync(fullPath)) {
    disableRateLimitersInFile(fullPath);
  } else {
    console.log(`⚠️  File not found: ${file}`);
  }
});

console.log('\n✅ Rate limiter disabling complete!');
console.log('📝 Note: Remember to re-enable rate limiters before production deployment.');
