/**
 * Accessibility Checker Script
 *
 * Scans files for missing accessibility labels and generates reports
 * Usage: node scripts/check-accessibility.js [file-path] [--report] [--fix]
 */

const fs = require('fs');
const path = require('path');

// Interactive elements that need accessibility labels
const INTERACTIVE_PATTERNS = [
  /TouchableOpacity/g,
  /TouchableHighlight/g,
  /TouchableWithoutFeedback/g,
  /Pressable/g,
  /Button/g,
  /TextInput/g,
  /Switch/g,
  /<Image[^>]*source=/g,
  /FlatList/g,
  /ScrollView/g,
];

// Accessibility props to check for
const ACCESSIBILITY_PROPS = [
  'accessibilityLabel',
  'accessibilityRole',
  'accessibilityHint',
  'accessibilityState',
];

/**
 * Check if file has accessibility labels
 */
function checkFileAccessibility(filePath) {
  const fullPath = path.isAbsolute(filePath)
    ? filePath
    : path.join(process.cwd(), filePath);

  if (!fs.existsSync(fullPath)) {
    return null;
  }

  const content = fs.readFileSync(fullPath, 'utf8');
  const fileName = path.basename(filePath);

  // Count interactive elements
  let interactiveCount = 0;
  const interactiveElements = {};

  INTERACTIVE_PATTERNS.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      const elementName = pattern.toString().match(/\/(.*?)\//)[1];
      interactiveElements[elementName] = matches.length;
      interactiveCount += matches.length;
    }
  });

  // Count accessibility props
  let accessibilityPropCount = 0;
  const foundProps = {};

  ACCESSIBILITY_PROPS.forEach(prop => {
    const regex = new RegExp(prop, 'g');
    const matches = content.match(regex);
    if (matches) {
      foundProps[prop] = matches.length;
      accessibilityPropCount += matches.length;
    }
  });

  // Calculate coverage
  const coverage = interactiveCount > 0
    ? Math.round((accessibilityPropCount / interactiveCount) * 100)
    : 100;

  const hasAccessibility = accessibilityPropCount > 0;
  const needsImprovement = coverage < 80;

  return {
    filePath,
    fileName,
    interactiveCount,
    interactiveElements,
    accessibilityPropCount,
    foundProps,
    coverage,
    hasAccessibility,
    needsImprovement,
    status: coverage >= 80 ? '✅' : coverage >= 50 ? '⚠️' : '❌',
  };
}

/**
 * Scan directory recursively
 */
function scanDirectory(dir, results = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Skip node_modules, build directories
      if (!['node_modules', '.git', 'build', 'dist', '.expo'].includes(file)) {
        scanDirectory(filePath, results);
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.jsx')) {
      const result = checkFileAccessibility(filePath);
      if (result && result.interactiveCount > 0) {
        results.push(result);
      }
    }
  });

  return results;
}

/**
 * Generate accessibility report
 */
function generateReport(results) {
  console.log('\n📊 Accessibility Report\n');
  console.log('='.repeat(80));

  // Summary statistics
  const totalFiles = results.length;
  const filesWithAccessibility = results.filter(r => r.hasAccessibility).length;
  const filesNeedingImprovement = results.filter(r => r.needsImprovement).length;
  const totalInteractiveElements = results.reduce((sum, r) => sum + r.interactiveCount, 0);
  const totalAccessibilityProps = results.reduce((sum, r) => sum + r.accessibilityPropCount, 0);
  const overallCoverage = totalInteractiveElements > 0
    ? Math.round((totalAccessibilityProps / totalInteractiveElements) * 100)
    : 0;

  console.log(`\n📈 Overall Statistics:`);
  console.log(`   Total files with interactive elements: ${totalFiles}`);
  console.log(`   Files with accessibility labels: ${filesWithAccessibility} (${Math.round(filesWithAccessibility/totalFiles*100)}%)`);
  console.log(`   Files needing improvement: ${filesNeedingImprovement}`);
  console.log(`   Total interactive elements: ${totalInteractiveElements}`);
  console.log(`   Total accessibility props: ${totalAccessibilityProps}`);
  console.log(`   Overall coverage: ${overallCoverage}%\n`);

  // By status
  const excellent = results.filter(r => r.coverage >= 80).length;
  const good = results.filter(r => r.coverage >= 50 && r.coverage < 80).length;
  const poor = results.filter(r => r.coverage < 50).length;

  console.log(`📊 Files by Coverage:`);
  console.log(`   ✅ Excellent (80%+): ${excellent} files`);
  console.log(`   ⚠️  Good (50-79%): ${good} files`);
  console.log(`   ❌ Poor (<50%): ${poor} files\n`);

  // Top 10 files needing improvement
  const sorted = results
    .filter(r => r.needsImprovement)
    .sort((a, b) => a.coverage - b.coverage)
    .slice(0, 10);

  console.log(`🎯 Top 10 Files Needing Improvement:\n`);
  sorted.forEach((r, i) => {
    console.log(`${i + 1}. ${r.status} ${r.fileName}`);
    console.log(`   Path: ${r.filePath}`);
    console.log(`   Interactive elements: ${r.interactiveCount}`);
    console.log(`   Accessibility props: ${r.accessibilityPropCount}`);
    console.log(`   Coverage: ${r.coverage}%\n`);
  });

  // Save report to file
  const reportPath = path.join(process.cwd(), 'accessibility-report.txt');
  const reportContent = generateTextReport(results);
  fs.writeFileSync(reportPath, reportContent, 'utf8');
  console.log(`📄 Full report saved to: accessibility-report.txt\n`);
}

/**
 * Generate text report
 */
function generateTextReport(results) {
  let report = 'ACCESSIBILITY REPORT\n';
  report += '='.repeat(80) + '\n\n';

  const totalFiles = results.length;
  const filesWithAccessibility = results.filter(r => r.hasAccessibility).length;
  const filesNeedingImprovement = results.filter(r => r.needsImprovement).length;
  const totalInteractiveElements = results.reduce((sum, r) => sum + r.interactiveCount, 0);
  const totalAccessibilityProps = results.reduce((sum, r) => sum + r.accessibilityPropCount, 0);
  const overallCoverage = totalInteractiveElements > 0
    ? Math.round((totalAccessibilityProps / totalInteractiveElements) * 100)
    : 0;

  report += 'SUMMARY:\n';
  report += `Total files: ${totalFiles}\n`;
  report += `Files with accessibility: ${filesWithAccessibility} (${Math.round(filesWithAccessibility/totalFiles*100)}%)\n`;
  report += `Files needing improvement: ${filesNeedingImprovement}\n`;
  report += `Overall coverage: ${overallCoverage}%\n\n`;

  report += 'FILES NEEDING IMPROVEMENT:\n';
  report += '-'.repeat(80) + '\n\n';

  results
    .filter(r => r.needsImprovement)
    .sort((a, b) => a.coverage - b.coverage)
    .forEach(r => {
      report += `File: ${r.filePath}\n`;
      report += `Status: ${r.status}\n`;
      report += `Interactive elements: ${r.interactiveCount}\n`;
      report += `Accessibility props: ${r.accessibilityPropCount}\n`;
      report += `Coverage: ${r.coverage}%\n`;
      report += `Elements: ${JSON.stringify(r.interactiveElements)}\n`;
      report += '\n';
    });

  return report;
}

/**
 * Check single file
 */
function checkSingleFile(filePath) {
  console.log(`\n🔍 Checking: ${filePath}\n`);

  const result = checkFileAccessibility(filePath);

  if (!result) {
    console.log('❌ File not found or not readable\n');
    return;
  }

  console.log(`${result.status} Status: ${result.coverage >= 80 ? 'Excellent' : result.coverage >= 50 ? 'Good' : 'Needs Improvement'}`);
  console.log(`📊 Coverage: ${result.coverage}%`);
  console.log(`🎯 Interactive elements: ${result.interactiveCount}`);
  console.log(`✅ Accessibility props: ${result.accessibilityPropCount}\n`);

  if (result.interactiveCount > 0) {
    console.log(`Interactive Elements Found:`);
    Object.entries(result.interactiveElements).forEach(([element, count]) => {
      console.log(`   ${element}: ${count}`);
    });
    console.log('');
  }

  if (result.accessibilityPropCount > 0) {
    console.log(`Accessibility Props Found:`);
    Object.entries(result.foundProps).forEach(([prop, count]) => {
      console.log(`   ${prop}: ${count}`);
    });
    console.log('');
  }

  if (result.needsImprovement) {
    console.log(`⚠️  Recommendations:`);
    console.log(`   - Add accessibilityLabel to all interactive elements`);
    console.log(`   - Add accessibilityRole to specify element type`);
    console.log(`   - Add accessibilityHint for buttons and actions`);
    console.log(`   - Add accessibilityState for disabled/checked elements\n`);
    console.log(`📖 See ACCESSIBILITY_IMPLEMENTATION_GUIDE.md for examples\n`);
  }
}

/**
 * Main execution
 */
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    // Scan entire project
    console.log('🚀 Scanning entire project for accessibility issues...\n');
    const appDir = path.join(process.cwd(), 'app');
    const componentsDir = path.join(process.cwd(), 'components');

    let results = [];
    if (fs.existsSync(appDir)) {
      results = results.concat(scanDirectory(appDir));
    }
    if (fs.existsSync(componentsDir)) {
      results = results.concat(scanDirectory(componentsDir));
    }

    generateReport(results);
  } else if (args.includes('--report')) {
    // Generate full report
    console.log('🚀 Generating full accessibility report...\n');
    const appDir = path.join(process.cwd(), 'app');
    const componentsDir = path.join(process.cwd(), 'components');

    let results = [];
    if (fs.existsSync(appDir)) {
      results = results.concat(scanDirectory(appDir));
    }
    if (fs.existsSync(componentsDir)) {
      results = results.concat(scanDirectory(componentsDir));
    }

    generateReport(results);
  } else {
    // Check single file
    const filePath = args[0];
    checkSingleFile(filePath);
  }
}

// Run the script
main();
