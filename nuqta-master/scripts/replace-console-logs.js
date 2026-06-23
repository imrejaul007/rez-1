/**
 * Script to replace console.log statements with logger
 *
 * Usage: node scripts/replace-console-logs.js [file-path]
 * Or: npm run replace-console-logs
 */

const fs = require('fs');
const path = require('path');

// Priority files with most console statements
const priorityFiles = [
  'app/bill-upload.tsx',
  'app/challenges/index.tsx',
  'app/challenges/[id].tsx',
  'app/my-vouchers.tsx',
  'components/playPage/VideoCard.tsx',
  'components/product/DeliveryInformation.tsx',
  'components/gamification/SpinWheelGame.tsx',
  'app/(tabs)/earn.tsx',
  'app/(tabs)/play.tsx',
  'components/navigation/BottomNavigation.tsx',
];

/**
 * Check if file already imports logger
 */
function hasLoggerImport(content) {
  return content.includes("from '@/utils/logger'") ||
         content.includes('from "../utils/logger"') ||
         content.includes('from "../../utils/logger"') ||
         content.includes('from "../../../utils/logger"');
}

/**
 * Add logger import at the top of the file
 */
function addLoggerImport(content) {
  if (hasLoggerImport(content)) {
    return content;
  }

  // Find the last import statement
  const lines = content.split('\n');
  let lastImportIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('import ')) {
      lastImportIndex = i;
    }
  }

  // Add logger import after last import
  if (lastImportIndex >= 0) {
    lines.splice(lastImportIndex + 1, 0, "import logger from '@/utils/logger';");
    return lines.join('\n');
  }

  // If no imports found, add at the beginning
  return "import logger from '@/utils/logger';\n\n" + content;
}

/**
 * Replace console statements with logger
 */
function replaceConsoleLogs(content) {
  let modified = content;
  let replacements = 0;

  // Replace console.log -> logger.debug
  modified = modified.replace(/console\.log\(/g, (match, offset) => {
    replacements++;
    return 'logger.debug(';
  });

  // Replace console.info -> logger.info
  modified = modified.replace(/console\.info\(/g, (match) => {
    replacements++;
    return 'logger.info(';
  });

  // Replace console.warn -> logger.warn
  modified = modified.replace(/console\.warn\(/g, (match) => {
    replacements++;
    return 'logger.warn(';
  });

  // Replace console.error -> logger.error
  modified = modified.replace(/console\.error\(/g, (match) => {
    replacements++;
    return 'logger.error(';
  });

  // Replace console.debug -> logger.debug
  modified = modified.replace(/console\.debug\(/g, (match) => {
    replacements++;
    return 'logger.debug(';
  });

  return { modified, replacements };
}

/**
 * Process a single file
 */
function processFile(filePath) {
  const fullPath = path.join(process.cwd(), filePath);

  // Check if file exists
  if (!fs.existsSync(fullPath)) {
    console.log(`❌ File not found: ${filePath}`);
    return { success: false, replacements: 0 };
  }

  // Read file content
  let content = fs.readFileSync(fullPath, 'utf8');

  // Check if file has console statements
  if (!content.includes('console.')) {
    console.log(`✅ ${filePath} - No console statements found`);
    return { success: true, replacements: 0 };
  }

  // Replace console statements
  const { modified, replacements } = replaceConsoleLogs(content);

  if (replacements === 0) {
    console.log(`✅ ${filePath} - No console statements found`);
    return { success: true, replacements: 0 };
  }

  // Add logger import
  const final = addLoggerImport(modified);

  // Write back to file
  fs.writeFileSync(fullPath, final, 'utf8');

  console.log(`✅ ${filePath} - ${replacements} replacements made`);
  return { success: true, replacements };
}

/**
 * Process all priority files
 */
function processAllFiles() {
  console.log('🚀 Starting console.log replacement...\n');

  let totalReplacements = 0;
  let filesProcessed = 0;
  let filesWithReplacements = 0;

  for (const file of priorityFiles) {
    const result = processFile(file);
    if (result.success) {
      filesProcessed++;
      if (result.replacements > 0) {
        filesWithReplacements++;
        totalReplacements += result.replacements;
      }
    }
  }

  console.log('\n📊 Summary:');
  console.log(`   Files processed: ${filesProcessed}/${priorityFiles.length}`);
  console.log(`   Files modified: ${filesWithReplacements}`);
  console.log(`   Total replacements: ${totalReplacements}`);
  console.log('\n✅ Done!');
}

/**
 * Main execution
 */
function main() {
  const args = process.argv.slice(2);

  if (args.length > 0) {
    // Process single file
    const filePath = args[0];
    processFile(filePath);
  } else {
    // Process all priority files
    processAllFiles();
  }
}

// Run the script
main();
