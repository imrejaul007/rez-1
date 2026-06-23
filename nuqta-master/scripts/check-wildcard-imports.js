#!/usr/bin/env node

/**
 * Check for wildcard imports that should be optimized
 * Finds patterns like: import * as Something from 'module'
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

console.log('🔍 Checking for wildcard imports...\n');

// Directories to check
const searchPattern = '{app,components,services,hooks,utils,contexts,types}/**/*.{ts,tsx,js,jsx}';

// Find all matching files
glob(searchPattern, { cwd: path.join(__dirname, '..') }, (err, files) => {
  if (err) {
    console.error('Error finding files:', err);
    process.exit(1);
  }

  const issues = [];
  const wildcardPattern = /import \* as (\w+) from ['"]([^'"]+)['"]/g;

  files.forEach(file => {
    const fullPath = path.join(__dirname, '..', file);
    const content = fs.readFileSync(fullPath, 'utf8');

    let match;
    const fileIssues = [];

    // Reset regex
    wildcardPattern.lastIndex = 0;

    while ((match = wildcardPattern.exec(content)) !== null) {
      const [fullMatch, namespace, module] = match;
      fileIssues.push({
        namespace,
        module,
        line: content.substring(0, match.index).split('\n').length
      });
    }

    if (fileIssues.length > 0) {
      issues.push({
        file,
        imports: fileIssues
      });
    }
  });

  // Report results
  if (issues.length === 0) {
    console.log('✅ No wildcard imports found!\n');
    process.exit(0);
  }

  console.log(`❌ Found wildcard imports in ${issues.length} files:\n`);

  // Group by module for better reporting
  const byModule = {};

  issues.forEach(({ file, imports }) => {
    imports.forEach(({ namespace, module, line }) => {
      if (!byModule[module]) {
        byModule[module] = [];
      }
      byModule[module].push({ file, namespace, line });
    });
  });

  // Print grouped results
  Object.entries(byModule).forEach(([module, occurrences]) => {
    console.log(`📦 Module: ${module}`);
    console.log(`   Found in ${occurrences.length} locations:\n`);

    occurrences.forEach(({ file, namespace, line }) => {
      console.log(`   ${file}:${line}`);
      console.log(`   import * as ${namespace} from '${module}'\n`);
    });

    // Suggest optimization
    const suggestions = {
      'expo-camera': '{ Camera, CameraView, useCameraPermissions }',
      'expo-image-picker': '{ launchImageLibraryAsync, MediaTypeOptions }',
      'expo-clipboard': '{ setStringAsync, getStringAsync }',
      'expo-location': '{ getCurrentPositionAsync, requestForegroundPermissionsAsync }',
      'expo-sharing': '{ shareAsync, isAvailableAsync }',
      'expo-document-picker': '{ getDocumentAsync }',
    };

    if (suggestions[module]) {
      console.log(`   💡 Suggested optimization:`);
      console.log(`   import ${suggestions[module]} from '${module}'\n`);
    }

    console.log('   ' + '-'.repeat(70) + '\n');
  });

  // Summary
  console.log('='.repeat(80));
  console.log('📊 SUMMARY\n');
  console.log(`Total files with wildcard imports: ${issues.length}`);
  console.log(`Total wildcard imports: ${Object.values(byModule).flat().length}`);
  console.log(`Unique modules: ${Object.keys(byModule).length}\n`);

  // Priority modules
  const priorityModules = [
    'expo-camera',
    'expo-image-picker',
    'expo-clipboard',
    'expo-location'
  ];

  const highPriority = Object.keys(byModule).filter(m => priorityModules.includes(m));

  if (highPriority.length > 0) {
    console.log('⚠️  HIGH PRIORITY (Expo modules):');
    highPriority.forEach(module => {
      console.log(`   - ${module} (${byModule[module].length} occurrences)`);
    });
    console.log('');
  }

  // Breakdown by category
  console.log('📁 Breakdown by Category:\n');

  const categories = {
    'Expo Modules': Object.keys(byModule).filter(m => m.startsWith('expo-')),
    'Services': Object.keys(byModule).filter(m => m.includes('services/')),
    'Utils': Object.keys(byModule).filter(m => m.includes('utils/')),
    'Other': Object.keys(byModule).filter(m =>
      !m.startsWith('expo-') && !m.includes('services/') && !m.includes('utils/')
    ),
  };

  Object.entries(categories).forEach(([category, modules]) => {
    if (modules.length > 0) {
      const count = modules.reduce((sum, m) => sum + byModule[m].length, 0);
      console.log(`   ${category}: ${modules.length} modules, ${count} imports`);
    }
  });

  console.log('\n' + '='.repeat(80));

  // Recommendations
  console.log('\n💡 RECOMMENDATIONS\n');
  console.log('1. Fix high-priority Expo module imports first');
  console.log('2. Use the IMPORT_OPTIMIZATION_CHECKLIST.md for guidance');
  console.log('3. Test each file after optimization');
  console.log('4. Run this script again to verify fixes\n');

  console.log('To fix automatically (experimental):');
  console.log('   node scripts/fix-expo-imports.js\n');

  // Exit with error code
  process.exit(1);
});
