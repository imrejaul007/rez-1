#!/usr/bin/env node

/**
 * Bundle Size Analyzer
 *
 * Analyzes the application bundle to identify:
 * - Large dependencies
 * - Duplicate dependencies
 * - Optimization opportunities
 * - Asset sizes
 */

const fs = require('fs');
const path = require('path');

// Colors for console output
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

/**
 * Get directory size recursively
 */
function getDirectorySize(dir) {
  let size = 0;
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stats = fs.statSync(filePath);

    if (stats.isDirectory()) {
      size += getDirectorySize(filePath);
    } else {
      size += stats.size;
    }
  }

  return size;
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Analyze package.json dependencies
 */
function analyzeDependencies() {
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  const dependencies = packageJson.dependencies || {};
  const devDependencies = packageJson.devDependencies || {};

  log(colors.cyan, '\n📦 DEPENDENCY ANALYSIS');
  log(colors.bright, '═'.repeat(50));

  log(colors.blue, `\n✓ Production dependencies: ${Object.keys(dependencies).length}`);
  log(colors.blue, `✓ Dev dependencies: ${Object.keys(devDependencies).length}`);
  log(colors.blue, `✓ Total dependencies: ${Object.keys(dependencies).length + Object.keys(devDependencies).length}`);

  // Find potentially large dependencies
  const heavyDeps = [
    'react-native',
    'expo',
    '@expo/vector-icons',
    'axios',
    'socket.io-client',
    '@stripe/stripe-react-native',
    'react-native-reanimated',
    'react-native-svg',
  ];

  const installedHeavyDeps = Object.keys(dependencies).filter(dep =>
    heavyDeps.includes(dep)
  );

  if (installedHeavyDeps.length > 0) {
    log(colors.yellow, '\n⚠️  Heavy dependencies detected:');
    installedHeavyDeps.forEach(dep => {
      log(colors.yellow, `   - ${dep}`);
    });
  }

  return {
    totalDeps: Object.keys(dependencies).length + Object.keys(devDependencies).length,
    prodDeps: Object.keys(dependencies).length,
    devDeps: Object.keys(devDependencies).length,
    heavyDeps: installedHeavyDeps,
  };
}

/**
 * Analyze assets directory
 */
function analyzeAssets() {
  const assetsDir = path.join(__dirname, '..', 'assets');

  if (!fs.existsSync(assetsDir)) {
    log(colors.yellow, '\n⚠️  Assets directory not found');
    return null;
  }

  log(colors.cyan, '\n🖼️  ASSET ANALYSIS');
  log(colors.bright, '═'.repeat(50));

  const assetsByType = {};
  let totalSize = 0;

  function scanDirectory(dir, prefix = '') {
    const files = fs.readdirSync(dir);

    for (const file of files) {
      const filePath = path.join(dir, file);
      const stats = fs.statSync(filePath);

      if (stats.isDirectory()) {
        scanDirectory(filePath, `${prefix}${file}/`);
      } else {
        const ext = path.extname(file).toLowerCase();
        const size = stats.size;

        if (!assetsByType[ext]) {
          assetsByType[ext] = { count: 0, size: 0, files: [] };
        }

        assetsByType[ext].count++;
        assetsByType[ext].size += size;
        assetsByType[ext].files.push({
          path: `${prefix}${file}`,
          size,
        });

        totalSize += size;
      }
    }
  }

  scanDirectory(assetsDir);

  log(colors.blue, `\n✓ Total asset size: ${formatBytes(totalSize)}`);
  log(colors.blue, `✓ Total files: ${Object.values(assetsByType).reduce((sum, type) => sum + type.count, 0)}`);

  // Group by file type
  log(colors.bright, '\nBy file type:');
  Object.entries(assetsByType)
    .sort((a, b) => b[1].size - a[1].size)
    .forEach(([ext, data]) => {
      const percentage = ((data.size / totalSize) * 100).toFixed(1);
      log(
        colors.blue,
        `  ${ext || 'no extension'}: ${data.count} files, ${formatBytes(data.size)} (${percentage}%)`
      );
    });

  // Find large files
  const allFiles = Object.values(assetsByType)
    .flatMap(type => type.files)
    .sort((a, b) => b.size - a.size);

  const largeFiles = allFiles.filter(file => file.size > 100 * 1024); // > 100KB

  if (largeFiles.length > 0) {
    log(colors.yellow, '\n⚠️  Large assets (> 100KB):');
    largeFiles.slice(0, 10).forEach(file => {
      log(colors.yellow, `   - ${file.path}: ${formatBytes(file.size)}`);
    });
  }

  return {
    totalSize,
    fileCount: Object.values(assetsByType).reduce((sum, type) => sum + type.count, 0),
    byType: assetsByType,
    largeFiles,
  };
}

/**
 * Analyze source code
 */
function analyzeSourceCode() {
  log(colors.cyan, '\n📂 SOURCE CODE ANALYSIS');
  log(colors.bright, '═'.repeat(50));

  const dirs = ['app', 'components', 'services', 'hooks', 'utils'];
  const sizes = {};

  for (const dir of dirs) {
    const dirPath = path.join(__dirname, '..', dir);
    if (fs.existsSync(dirPath)) {
      sizes[dir] = getDirectorySize(dirPath);
    }
  }

  const totalSize = Object.values(sizes).reduce((sum, size) => sum + size, 0);

  log(colors.blue, `\n✓ Total source code size: ${formatBytes(totalSize)}`);
  log(colors.bright, '\nBy directory:');

  Object.entries(sizes)
    .sort((a, b) => b[1] - a[1])
    .forEach(([dir, size]) => {
      const percentage = ((size / totalSize) * 100).toFixed(1);
      log(colors.blue, `  ${dir}/: ${formatBytes(size)} (${percentage}%)`);
    });

  return { totalSize, sizes };
}

/**
 * Find optimization opportunities
 */
function findOptimizations(assetData, dependencyData) {
  log(colors.cyan, '\n💡 OPTIMIZATION OPPORTUNITIES');
  log(colors.bright, '═'.repeat(50));

  const opportunities = [];

  // Check for unoptimized images
  if (assetData) {
    const imageTypes = ['.png', '.jpg', '.jpeg'];
    const totalImageSize = imageTypes.reduce((sum, ext) => {
      const data = assetData.byType[ext];
      return sum + (data ? data.size : 0);
    }, 0);

    if (totalImageSize > 500 * 1024) {
      opportunities.push({
        type: 'images',
        severity: 'high',
        description: `Large image assets detected (${formatBytes(totalImageSize)})`,
        suggestion: 'Convert images to WebP format and compress them',
        potentialSavings: Math.round(totalImageSize * 0.4), // ~40% savings
      });
    }

    // Check for large individual files
    if (assetData.largeFiles.length > 0) {
      opportunities.push({
        type: 'assets',
        severity: 'medium',
        description: `${assetData.largeFiles.length} large asset files detected`,
        suggestion: 'Review and optimize large assets',
        potentialSavings: Math.round(assetData.largeFiles.reduce((sum, f) => sum + f.size, 0) * 0.3),
      });
    }
  }

  // Check for heavy dependencies
  if (dependencyData && dependencyData.heavyDeps.length > 0) {
    opportunities.push({
      type: 'dependencies',
      severity: 'medium',
      description: `${dependencyData.heavyDeps.length} heavy dependencies installed`,
      suggestion: 'Review if all features are needed, consider tree-shaking',
      potentialSavings: null,
    });
  }

  // Display opportunities
  if (opportunities.length > 0) {
    opportunities.forEach((opp, index) => {
      const severityColor = opp.severity === 'high' ? colors.red : colors.yellow;
      log(severityColor, `\n${index + 1}. [${opp.severity.toUpperCase()}] ${opp.type}`);
      log(colors.reset, `   ${opp.description}`);
      log(colors.green, `   ✓ ${opp.suggestion}`);
      if (opp.potentialSavings) {
        log(colors.cyan, `   💾 Potential savings: ${formatBytes(opp.potentialSavings)}`);
      }
    });
  } else {
    log(colors.green, '\n✓ No major optimization opportunities found!');
  }

  return opportunities;
}

/**
 * Generate summary report
 */
function generateSummary(assetData, dependencyData, sourceData, opportunities) {
  log(colors.cyan, '\n📊 SUMMARY REPORT');
  log(colors.bright, '═'.repeat(50));

  const totalSize =
    (assetData ? assetData.totalSize : 0) +
    (sourceData ? sourceData.totalSize : 0);

  const potentialSavings = opportunities.reduce(
    (sum, opp) => sum + (opp.potentialSavings || 0),
    0
  );

  log(colors.blue, `\n✓ Total project size: ${formatBytes(totalSize)}`);
  log(colors.blue, `✓ Assets: ${assetData ? formatBytes(assetData.totalSize) : 'N/A'}`);
  log(colors.blue, `✓ Source code: ${sourceData ? formatBytes(sourceData.totalSize) : 'N/A'}`);
  log(colors.blue, `✓ Dependencies: ${dependencyData ? dependencyData.totalDeps : 'N/A'}`);

  if (potentialSavings > 0) {
    log(colors.yellow, `\n⚠️  Potential savings: ${formatBytes(potentialSavings)}`);
    log(colors.yellow, `   (${((potentialSavings / totalSize) * 100).toFixed(1)}% reduction)`);
  }

  log(colors.green, `\n✓ Optimization opportunities: ${opportunities.length}`);

  // Save to file
  const report = {
    timestamp: new Date().toISOString(),
    totalSize,
    assets: assetData,
    dependencies: dependencyData,
    sourceCode: sourceData,
    opportunities,
    potentialSavings,
  };

  const reportPath = path.join(__dirname, '..', 'bundle-analysis-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  log(colors.cyan, `\n💾 Report saved to: ${reportPath}`);
}

/**
 * Main function
 */
function main() {
  log(colors.bright, '\n🔍 BUNDLE SIZE ANALYZER');
  log(colors.bright, '═'.repeat(50));

  const dependencyData = analyzeDependencies();
  const assetData = analyzeAssets();
  const sourceData = analyzeSourceCode();
  const opportunities = findOptimizations(assetData, dependencyData);

  generateSummary(assetData, dependencyData, sourceData, opportunities);

  log(colors.green, '\n✅ Analysis complete!\n');
}

// Run analyzer
main();
