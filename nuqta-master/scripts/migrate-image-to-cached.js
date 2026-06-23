#!/usr/bin/env node
/**
 * Migration script: react-native Image → CachedImage
 *
 * This script:
 * 1. Finds all .tsx files importing Image from react-native
 * 2. Adds CachedImage import
 * 3. Removes Image from the react-native import
 * 4. Replaces <Image ... /> and <Image ...>...</Image> with <CachedImage ... />
 * 5. Maps props: resizeMode→contentFit, source={{uri:x}}→source={x}
 *
 * Usage: node scripts/migrate-image-to-cached.js [--dry-run]
 */

const fs = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');
const ROOT = path.resolve(__dirname, '..');

// Files/dirs to skip
const SKIP_PATTERNS = [
  'node_modules',
  'scripts/',
  'examples/',
  '.expo/',
  '__tests__/',
  'src/components/', // legacy
  'components/common/FastImage.tsx',
  'components/common/LazyImage.tsx',
  'components/common/OptimizedImage.tsx',
  'components/common/EmptyState.tsx', // uses expo-image directly
  'components/ui/CachedImage.tsx',
  'components/store/ZoomableImage.tsx', // specialized
  'components/store/GalleryImagePreloader.tsx', // specialized
  'components/product/ImageZoomModal.tsx', // uses Animated.Image
];

function shouldSkip(filePath) {
  const rel = path.relative(ROOT, filePath).replace(/\\/g, '/');
  return SKIP_PATTERNS.some(p => rel.includes(p));
}

function findTsxFiles(dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.expo') continue;
      results.push(...findTsxFiles(fullPath));
    } else if (entry.name.endsWith('.tsx')) {
      results.push(fullPath);
    }
  }
  return results;
}

function migrateFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  // Skip if already has CachedImage
  if (content.includes("from '@/components/ui/CachedImage'") || content.includes('from "@/components/ui/CachedImage"')) {
    return { skipped: true, reason: 'already migrated' };
  }

  // Skip if uses expo-image directly
  if (content.includes("from 'expo-image'") || content.includes('from "expo-image"')) {
    return { skipped: true, reason: 'uses expo-image directly' };
  }

  // Check if file imports from react-native and uses <Image
  if (!content.includes("from 'react-native'") && !content.includes('from "react-native"')) {
    return { skipped: true, reason: 'no react-native import' };
  }
  if (!content.includes('<Image')) {
    return { skipped: true, reason: 'no <Image usage' };
  }

  // Check if Image is in the react-native import
  // Match multiline imports like: import {\n  View,\n  Image,\n} from 'react-native';
  const rnImportRegex = /import\s*\{([^}]*)\}\s*from\s*['"]react-native['"]/s;
  const match = content.match(rnImportRegex);
  if (!match) {
    return { skipped: true, reason: 'could not parse react-native import' };
  }

  const importBody = match[1];
  // Check if Image is one of the imported names (not ImageBackground, ImageStyle, etc.)
  if (!/\bImage\b/.test(importBody) || /\bImageBackground\b/.test(importBody) && !/\bImage\b(?!Background)/.test(importBody)) {
    // Image might not be in this import
    if (!/\bImage\b/.test(importBody)) {
      return { skipped: true, reason: 'Image not in react-native import' };
    }
  }

  // Also check for Animated.Image usage — skip those files
  if (content.includes('<Animated.Image') || content.includes('Animated.Image')) {
    return { skipped: true, reason: 'uses Animated.Image' };
  }

  const changes = [];

  // 1. Remove Image from react-native import
  const importNames = importBody.split(',').map(s => s.trim()).filter(Boolean);
  const hasImage = importNames.some(n => n === 'Image');
  if (!hasImage) {
    return { skipped: true, reason: 'Image not individually imported' };
  }

  const filteredNames = importNames.filter(n => n !== 'Image');
  if (filteredNames.length === 0) {
    // Remove entire import — unlikely but handle it
    content = content.replace(rnImportRegex, '');
    changes.push('removed react-native import (was only Image)');
  } else {
    // Reconstruct import
    const newImportBody = filteredNames.length <= 3
      ? ` ${filteredNames.join(', ')} `
      : `\n  ${filteredNames.join(',\n  ')},\n`;
    const newImport = `import {${newImportBody}} from 'react-native'`;
    content = content.replace(rnImportRegex, newImport);
    changes.push('removed Image from react-native import');
  }

  // 2. Add CachedImage import after the react-native import (or at top of imports)
  // Find position after the react-native import line
  const rnImportEnd = content.indexOf("from 'react-native'");
  if (rnImportEnd === -1) {
    // Import was fully removed, add at top after other imports
    const firstImportIdx = content.indexOf('import ');
    if (firstImportIdx !== -1) {
      content = content.slice(0, firstImportIdx) +
        "import CachedImage from '@/components/ui/CachedImage';\n" +
        content.slice(firstImportIdx);
    }
  } else {
    const lineEnd = content.indexOf('\n', rnImportEnd);
    const insertPos = lineEnd + 1;
    content = content.slice(0, insertPos) +
      "import CachedImage from '@/components/ui/CachedImage';\n" +
      content.slice(insertPos);
  }
  changes.push('added CachedImage import');

  // 3. Replace <Image ... /> JSX with <CachedImage ... />
  // Also handle <Image ...>...</Image>

  // Replace source={{ uri: X }} with source={X}
  // Pattern: source={{ uri: someExpression }}
  content = content.replace(/<Image\b/g, '<CachedImage');
  content = content.replace(/<\/Image>/g, '</CachedImage>');
  changes.push('replaced <Image with <CachedImage');

  // Replace resizeMode="X" with contentFit="X"
  // Handle both resizeMode="cover" and resizeMode={'cover'}
  content = content.replace(/(\bresizeMode\s*=\s*)"([^"]+)"/g, 'contentFit="$2"');
  content = content.replace(/(\bresizeMode\s*=\s*)\{'([^']+)'\}/g, "contentFit=\"$2\"");
  content = content.replace(/(\bresizeMode\s*=\s*)\{"([^"]+)"\}/g, 'contentFit="$2"');
  changes.push('replaced resizeMode with contentFit');

  // Replace fadeDuration with transition
  content = content.replace(/\bfadeDuration\s*=\s*\{(\d+)\}/g, 'transition={$1}');
  changes.push('replaced fadeDuration with transition');

  // Simplify source={{ uri: expression }} to source={expression}
  // Handle: source={{ uri: variable }}
  // Handle: source={{ uri: variable || 'fallback' }}
  // Handle: source={{ uri: obj.prop }}
  // Be careful with complex expressions
  content = content.replace(
    /source=\{\{\s*uri:\s*([^}]+?)\s*\}\}/g,
    (match, expr) => {
      const trimmed = expr.trim();
      // If expression is simple enough, unwrap it
      // Avoid unwrapping if it contains nested objects
      if (trimmed.includes('{') || trimmed.includes('}')) {
        return match; // Keep original if too complex
      }
      return `source={${trimmed}}`;
    }
  );
  changes.push('simplified source={{ uri: x }} to source={x}');

  if (content === original) {
    return { skipped: true, reason: 'no changes needed after transforms' };
  }

  return { content, changes };
}

// Main
console.log(`🔍 Scanning for .tsx files in ${ROOT}...`);
const allFiles = findTsxFiles(ROOT);
console.log(`Found ${allFiles.length} .tsx files total`);

let migrated = 0;
let skipped = 0;
let errors = 0;
const migratedFiles = [];
const skippedDetails = {};

for (const file of allFiles) {
  if (shouldSkip(file)) {
    skipped++;
    continue;
  }

  try {
    const result = migrateFile(file);
    const rel = path.relative(ROOT, file).replace(/\\/g, '/');

    if (result.skipped) {
      skipped++;
      skippedDetails[result.reason] = (skippedDetails[result.reason] || 0) + 1;
    } else {
      if (DRY_RUN) {
        console.log(`[DRY RUN] Would migrate: ${rel}`);
        console.log(`  Changes: ${result.changes.join(', ')}`);
      } else {
        fs.writeFileSync(file, result.content, 'utf8');
        console.log(`✅ Migrated: ${rel}`);
      }
      migrated++;
      migratedFiles.push(rel);
    }
  } catch (err) {
    const rel = path.relative(ROOT, file).replace(/\\/g, '/');
    console.error(`❌ Error processing ${rel}: ${err.message}`);
    errors++;
  }
}

console.log(`\n${'='.repeat(60)}`);
console.log(`Migration ${DRY_RUN ? '(DRY RUN) ' : ''}Summary:`);
console.log(`  ✅ Migrated: ${migrated}`);
console.log(`  ⏭️  Skipped:  ${skipped}`);
console.log(`  ❌ Errors:   ${errors}`);
console.log(`\nSkip reasons:`);
for (const [reason, count] of Object.entries(skippedDetails).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${reason}: ${count}`);
}

if (migratedFiles.length > 0 && !DRY_RUN) {
  console.log(`\nMigrated files:`);
  migratedFiles.forEach(f => console.log(`  ${f}`));
}
