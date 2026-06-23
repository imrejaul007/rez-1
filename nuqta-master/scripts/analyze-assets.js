#!/usr/bin/env node

/**
 * Asset Inventory Analyzer
 *
 * Creates a detailed inventory of all assets:
 * - Images (PNG, JPG, WebP, etc.)
 * - Fonts
 * - Icons
 * - Videos
 * - Other assets
 *
 * Provides recommendations for optimization
 */

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(color, ...args) {
  console.log(color, ...args, colors.reset);
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Scan directory and categorize assets
 */
function scanAssets(dir, baseDir = dir) {
  const inventory = {
    images: [],
    fonts: [],
    icons: [],
    videos: [],
    others: [],
  };

  function scan(directory) {
    const files = fs.readdirSync(directory);

    for (const file of files) {
      const filePath = path.join(directory, file);
      const stats = fs.statSync(filePath);
      const relativePath = path.relative(baseDir, filePath);

      if (stats.isDirectory()) {
        scan(filePath);
      } else {
        const ext = path.extname(file).toLowerCase();
        const fileInfo = {
          path: relativePath,
          name: file,
          size: stats.size,
          extension: ext,
          modified: stats.mtime,
        };

        // Categorize by extension
        if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg'].includes(ext)) {
          inventory.images.push(fileInfo);
        } else if (['.ttf', '.otf', '.woff', '.woff2', '.eot'].includes(ext)) {
          inventory.fonts.push(fileInfo);
        } else if (file.includes('icon') || file.includes('logo')) {
          inventory.icons.push(fileInfo);
        } else if (['.mp4', '.mov', '.avi', '.webm'].includes(ext)) {
          inventory.videos.push(fileInfo);
        } else {
          inventory.others.push(fileInfo);
        }
      }
    }
  }

  scan(dir);
  return inventory;
}

/**
 * Analyze image assets
 */
function analyzeImages(images) {
  log(colors.cyan, '\n🖼️  IMAGE ANALYSIS');
  log(colors.bright, '═'.repeat(60));

  const byExtension = {};
  let totalSize = 0;

  images.forEach(img => {
    if (!byExtension[img.extension]) {
      byExtension[img.extension] = { count: 0, size: 0, files: [] };
    }
    byExtension[img.extension].count++;
    byExtension[img.extension].size += img.size;
    byExtension[img.extension].files.push(img);
    totalSize += img.size;
  });

  log(colors.blue, `\n✓ Total images: ${images.length}`);
  log(colors.blue, `✓ Total size: ${formatBytes(totalSize)}`);

  log(colors.bright, '\nBy format:');
  Object.entries(byExtension)
    .sort((a, b) => b[1].size - a[1].size)
    .forEach(([ext, data]) => {
      const percentage = ((data.size / totalSize) * 100).toFixed(1);
      log(colors.blue, `  ${ext}: ${data.count} files, ${formatBytes(data.size)} (${percentage}%)`);
    });

  // Find large images
  const largeImages = images.filter(img => img.size > 100 * 1024).sort((a, b) => b.size - a.size);

  if (largeImages.length > 0) {
    log(colors.yellow, '\n⚠️  Large images (> 100KB):');
    largeImages.slice(0, 10).forEach(img => {
      log(colors.yellow, `   - ${img.path}: ${formatBytes(img.size)}`);
    });
  }

  // Check for WebP usage
  const webpCount = images.filter(img => img.extension === '.webp').length;
  const webpPercentage = ((webpCount / images.length) * 100).toFixed(1);

  log(colors.cyan, `\n📊 WebP adoption: ${webpCount}/${images.length} (${webpPercentage}%)`);

  if (webpPercentage < 50) {
    log(colors.yellow, '⚠️  Low WebP adoption - consider converting more images');
  } else {
    log(colors.green, '✓ Good WebP adoption');
  }

  // Check for duplicate image names (potential duplicates)
  const nameCount = {};
  images.forEach(img => {
    const baseName = path.basename(img.name, img.extension);
    nameCount[baseName] = (nameCount[baseName] || 0) + 1;
  });

  const duplicates = Object.entries(nameCount).filter(([name, count]) => count > 1);

  if (duplicates.length > 0) {
    log(colors.yellow, '\n⚠️  Potential duplicate images (same name, different extension):');
    duplicates.slice(0, 5).forEach(([name, count]) => {
      log(colors.yellow, `   - ${name}: ${count} versions`);
    });
  }

  return {
    total: images.length,
    totalSize,
    byExtension,
    largeImages,
    webpAdoption: webpPercentage,
    duplicates: duplicates.length,
  };
}

/**
 * Analyze font assets
 */
function analyzeFonts(fonts) {
  log(colors.cyan, '\n🔤 FONT ANALYSIS');
  log(colors.bright, '═'.repeat(60));

  const totalSize = fonts.reduce((sum, font) => sum + font.size, 0);

  log(colors.blue, `\n✓ Total fonts: ${fonts.length}`);
  log(colors.blue, `✓ Total size: ${formatBytes(totalSize)}`);

  if (fonts.length > 0) {
    log(colors.bright, '\nFont files:');
    fonts.forEach(font => {
      log(colors.blue, `  - ${font.name}: ${formatBytes(font.size)}`);
    });
  }

  // Check for subsetting opportunities
  const largeFonts = fonts.filter(font => font.size > 200 * 1024);

  if (largeFonts.length > 0) {
    log(colors.yellow, '\n⚠️  Large font files detected - consider subsetting');
    largeFonts.forEach(font => {
      log(colors.yellow, `   - ${font.name}: ${formatBytes(font.size)}`);
    });
  }

  return {
    total: fonts.length,
    totalSize,
    largeFonts: largeFonts.length,
  };
}

/**
 * Generate optimization recommendations
 */
function generateRecommendations(imageAnalysis, fontAnalysis, inventory) {
  log(colors.cyan, '\n💡 OPTIMIZATION RECOMMENDATIONS');
  log(colors.bright, '═'.repeat(60));

  const recommendations = [];

  // Image recommendations
  if (imageAnalysis.webpAdoption < 80) {
    const pngJpgImages = inventory.images.filter(img =>
      ['.png', '.jpg', '.jpeg'].includes(img.extension)
    );
    const potentialSavings = pngJpgImages.reduce((sum, img) => sum + img.size, 0) * 0.4;

    recommendations.push({
      priority: 'HIGH',
      category: 'Images',
      issue: `Only ${imageAnalysis.webpAdoption}% of images are WebP format`,
      action: 'Convert PNG/JPG images to WebP format',
      potentialSavings,
      impact: '~40% size reduction',
    });
  }

  if (imageAnalysis.largeImages.length > 0) {
    const largeSavings = imageAnalysis.largeImages.reduce((sum, img) => sum + img.size, 0) * 0.3;

    recommendations.push({
      priority: 'HIGH',
      category: 'Images',
      issue: `${imageAnalysis.largeImages.length} images over 100KB`,
      action: 'Compress and resize large images',
      potentialSavings: largeSavings,
      impact: '~30% size reduction',
    });
  }

  if (imageAnalysis.duplicates > 0) {
    recommendations.push({
      priority: 'MEDIUM',
      category: 'Images',
      issue: `${imageAnalysis.duplicates} potential duplicate images`,
      action: 'Review and remove duplicate images',
      potentialSavings: null,
      impact: 'Cleaner asset structure',
    });
  }

  // Font recommendations
  if (fontAnalysis.largeFonts > 0) {
    recommendations.push({
      priority: 'MEDIUM',
      category: 'Fonts',
      issue: `${fontAnalysis.largeFonts} large font files`,
      action: 'Subset fonts to include only needed characters',
      potentialSavings: fontAnalysis.totalSize * 0.5,
      impact: '~50% size reduction',
    });
  }

  // Check for unused assets
  const oldAssets = inventory.images.filter(img => {
    const age = Date.now() - img.modified.getTime();
    const daysOld = age / (1000 * 60 * 60 * 24);
    return daysOld > 180; // 6 months
  });

  if (oldAssets.length > 0) {
    recommendations.push({
      priority: 'LOW',
      category: 'Maintenance',
      issue: `${oldAssets.length} assets not modified in 6+ months`,
      action: 'Review and remove unused assets',
      potentialSavings: oldAssets.reduce((sum, asset) => sum + asset.size, 0),
      impact: 'Cleaner project',
    });
  }

  // Display recommendations
  recommendations.forEach((rec, index) => {
    const priorityColor =
      rec.priority === 'HIGH' ? colors.red :
      rec.priority === 'MEDIUM' ? colors.yellow : colors.blue;

    log(priorityColor, `\n${index + 1}. [${rec.priority}] ${rec.category}`);
    log(colors.reset, `   Issue: ${rec.issue}`);
    log(colors.green, `   Action: ${rec.action}`);
    log(colors.cyan, `   Impact: ${rec.impact}`);
    if (rec.potentialSavings) {
      log(colors.cyan, `   Potential savings: ${formatBytes(rec.potentialSavings)}`);
    }
  });

  return recommendations;
}

/**
 * Generate asset inventory report
 */
function generateReport(inventory, imageAnalysis, fontAnalysis, recommendations) {
  const totalSize =
    imageAnalysis.totalSize +
    fontAnalysis.totalSize +
    inventory.videos.reduce((sum, v) => sum + v.size, 0) +
    inventory.others.reduce((sum, o) => sum + o.size, 0);

  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalAssets: inventory.images.length + inventory.fonts.length + inventory.videos.length + inventory.others.length,
      totalSize,
      images: imageAnalysis,
      fonts: fontAnalysis,
      videos: {
        count: inventory.videos.length,
        totalSize: inventory.videos.reduce((sum, v) => sum + v.size, 0),
      },
      others: {
        count: inventory.others.length,
        totalSize: inventory.others.reduce((sum, o) => sum + o.size, 0),
      },
    },
    inventory: {
      images: inventory.images,
      fonts: inventory.fonts,
      videos: inventory.videos,
      others: inventory.others,
    },
    recommendations,
    potentialSavings: recommendations.reduce((sum, rec) => sum + (rec.potentialSavings || 0), 0),
  };

  const reportPath = path.join(__dirname, '..', 'asset-inventory-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  log(colors.cyan, '\n💾 Report saved to: asset-inventory-report.json');

  return report;
}

/**
 * Main function
 */
function main() {
  log(colors.bright, '\n📦 ASSET INVENTORY ANALYZER');
  log(colors.bright, '═'.repeat(60));

  const assetsDir = path.join(__dirname, '..', 'assets');

  if (!fs.existsSync(assetsDir)) {
    log(colors.red, '\n❌ Assets directory not found');
    process.exit(1);
  }

  const inventory = scanAssets(assetsDir);
  const imageAnalysis = analyzeImages(inventory.images);
  const fontAnalysis = analyzeFonts(inventory.fonts);
  const recommendations = generateRecommendations(imageAnalysis, fontAnalysis, inventory);

  log(colors.cyan, '\n📊 SUMMARY');
  log(colors.bright, '═'.repeat(60));

  const totalSize =
    imageAnalysis.totalSize +
    fontAnalysis.totalSize +
    inventory.videos.reduce((sum, v) => sum + v.size, 0) +
    inventory.others.reduce((sum, o) => sum + o.size, 0);

  const potentialSavings = recommendations.reduce(
    (sum, rec) => sum + (rec.potentialSavings || 0),
    0
  );

  log(colors.blue, `\n✓ Total assets: ${inventory.images.length + inventory.fonts.length + inventory.videos.length + inventory.others.length}`);
  log(colors.blue, `✓ Total size: ${formatBytes(totalSize)}`);
  log(colors.blue, `✓ Images: ${inventory.images.length} (${formatBytes(imageAnalysis.totalSize)})`);
  log(colors.blue, `✓ Fonts: ${inventory.fonts.length} (${formatBytes(fontAnalysis.totalSize)})`);
  log(colors.blue, `✓ Videos: ${inventory.videos.length}`);
  log(colors.blue, `✓ Others: ${inventory.others.length}`);

  if (potentialSavings > 0) {
    const savingsPercentage = ((potentialSavings / totalSize) * 100).toFixed(1);
    log(colors.yellow, `\n💾 Potential savings: ${formatBytes(potentialSavings)} (${savingsPercentage}%)`);
  }

  log(colors.green, `\n✓ Recommendations: ${recommendations.length}`);

  generateReport(inventory, imageAnalysis, fontAnalysis, recommendations);

  log(colors.green, '\n✅ Analysis complete!\n');
}

// Run analyzer
main();
