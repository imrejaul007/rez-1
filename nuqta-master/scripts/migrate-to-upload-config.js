#!/usr/bin/env node

/**
 * Automated Migration Script for Upload Config
 *
 * This script helps automate the migration from hardcoded values to centralized config.
 *
 * Features:
 * - Generates migration patches for each file
 * - Shows before/after comparisons
 * - Validates imports
 * - Creates backup files
 *
 * Usage:
 *   node scripts/migrate-to-upload-config.js [options]
 *
 * Options:
 *   --dry-run        Show changes without applying them
 *   --file=<path>    Migrate specific file only
 *   --backup         Create .bak files before migration
 *   --auto           Apply all migrations automatically (use with caution!)
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// ============================================================================
// CONFIGURATION
// ============================================================================

const FRONTEND_DIR = path.join(__dirname, '..');

// Migration patterns - what to replace with what
const MIGRATION_PATTERNS = [
  // File sizes
  {
    pattern: /(\s+)const\s+MAX_FILE_SIZE\s*=\s*5\s*\*\s*1024\s*\*\s*1024/g,
    replacement: '$1const MAX_FILE_SIZE = BILL_UPLOAD_CONFIG.FILE_SIZE_LIMITS.MAX_IMAGE_SIZE',
    description: 'Replace MAX_FILE_SIZE with config',
  },
  {
    pattern: /(\s+)const\s+MIN_FILE_SIZE\s*=\s*50\s*\*\s*1024/g,
    replacement: '$1const MIN_FILE_SIZE = BILL_UPLOAD_CONFIG.FILE_SIZE_LIMITS.MIN_IMAGE_SIZE',
    description: 'Replace MIN_FILE_SIZE with config',
  },
  {
    pattern: /(\s+)const\s+OPTIMAL_SIZE\s*=\s*2\s*\*\s*1024\s*\*\s*1024/g,
    replacement: '$1const OPTIMAL_SIZE = BILL_UPLOAD_CONFIG.FILE_SIZE_LIMITS.OPTIMAL_SIZE',
    description: 'Replace OPTIMAL_SIZE with config',
  },

  // Timeouts
  {
    pattern: /(\s+)const\s+TIMEOUT\s*=\s*60000/g,
    replacement: '$1const TIMEOUT = BILL_UPLOAD_CONFIG.UPLOAD_CONFIG.TIMEOUT_MS',
    description: 'Replace TIMEOUT with config',
  },
  {
    pattern: /(\s+)const\s+UPLOAD_TIMEOUT\s*=\s*60000/g,
    replacement: '$1const UPLOAD_TIMEOUT = BILL_UPLOAD_CONFIG.UPLOAD_CONFIG.TIMEOUT_MS',
    description: 'Replace UPLOAD_TIMEOUT with config',
  },

  // Retry config
  {
    pattern: /(\s+)const\s+MAX_RETRIES\s*=\s*3/g,
    replacement: '$1const MAX_RETRIES = BILL_UPLOAD_CONFIG.UPLOAD_CONFIG.MAX_RETRIES',
    description: 'Replace MAX_RETRIES with config',
  },

  // Queue config
  {
    pattern: /(\s+)const\s+BATCH_SIZE\s*=\s*5/g,
    replacement: '$1const BATCH_SIZE = BILL_UPLOAD_CONFIG.QUEUE_CONFIG.BATCH_SIZE',
    description: 'Replace BATCH_SIZE with config',
  },
  {
    pattern: /(\s+)const\s+MAX_QUEUE_SIZE\s*=\s*50/g,
    replacement: '$1const MAX_QUEUE_SIZE = BILL_UPLOAD_CONFIG.QUEUE_CONFIG.MAX_QUEUE_SIZE',
    description: 'Replace MAX_QUEUE_SIZE with config',
  },

  // File formats arrays
  {
    pattern: /(\s+)const\s+ALLOWED_FORMATS\s*=\s*\[['"]image\/jpeg['"],\s*['"]image\/png['"],\s*['"]image\/heic['"]\]/g,
    replacement: '$1const ALLOWED_FORMATS = BILL_UPLOAD_CONFIG.ALLOWED_FILE_FORMATS.IMAGES',
    description: 'Replace ALLOWED_FORMATS with config',
  },

  // Error arrays
  {
    pattern: /(\s+)const\s+RETRYABLE_ERRORS\s*=\s*\[[^\]]+\]/g,
    replacement: '$1const RETRYABLE_ERRORS = BILL_UPLOAD_CONFIG.RETRYABLE_ERRORS',
    description: 'Replace RETRYABLE_ERRORS array with config',
  },
];

// Files to skip (already using config or not relevant)
const SKIP_FILES = [
  'uploadConfig.ts',
  'verify-upload-config.js',
  'migrate-to-upload-config.js',
  'node_modules',
  '.git',
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function readFileContent(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    return null;
  }
}

function writeFileContent(filePath, content) {
  try {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  } catch (error) {
    log(`❌ Error writing file: ${error.message}`, 'red');
    return false;
  }
}

function createBackup(filePath) {
  const backupPath = `${filePath}.bak`;
  try {
    fs.copyFileSync(filePath, backupPath);
    log(`   📦 Backup created: ${path.basename(backupPath)}`, 'cyan');
    return true;
  } catch (error) {
    log(`   ❌ Failed to create backup: ${error.message}`, 'red');
    return false;
  }
}

function hasImport(content, importName) {
  const importRegex = new RegExp(
    `import\\s+{[^}]*${importName}[^}]*}\\s+from\\s+['"][^'"]*uploadConfig['"]`
  );
  return importRegex.test(content);
}

function addImportIfMissing(content) {
  if (hasImport(content, 'BILL_UPLOAD_CONFIG')) {
    return content;
  }

  // Find the best place to add the import (after other imports)
  const importLines = content.split('\n');
  let lastImportIndex = -1;

  for (let i = 0; i < importLines.length; i++) {
    if (importLines[i].trim().startsWith('import ')) {
      lastImportIndex = i;
    }
  }

  const newImport = "import { BILL_UPLOAD_CONFIG } from '@/config/uploadConfig';";

  if (lastImportIndex >= 0) {
    importLines.splice(lastImportIndex + 1, 0, newImport);
  } else {
    // No imports found, add at the top
    importLines.unshift(newImport, '');
  }

  return importLines.join('\n');
}

async function askQuestion(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

// ============================================================================
// MIGRATION FUNCTIONS
// ============================================================================

function analyzeFile(filePath) {
  const content = readFileContent(filePath);
  if (!content) return null;

  const matches = [];

  MIGRATION_PATTERNS.forEach((pattern) => {
    const regex = new RegExp(pattern.pattern);
    if (regex.test(content)) {
      matches.push({
        pattern: pattern.pattern,
        replacement: pattern.replacement,
        description: pattern.description,
      });
    }
  });

  return {
    filePath,
    content,
    matches,
    needsImport: !hasImport(content, 'BILL_UPLOAD_CONFIG'),
  };
}

function applyMigrations(analysis) {
  let newContent = analysis.content;

  // Add import if needed
  if (analysis.needsImport) {
    newContent = addImportIfMissing(newContent);
  }

  // Apply all pattern replacements
  analysis.matches.forEach((match) => {
    newContent = newContent.replace(match.pattern, match.replacement);
  });

  return newContent;
}

function showDiff(original, modified, filePath) {
  const originalLines = original.split('\n');
  const modifiedLines = modified.split('\n');

  log(`\n${'='.repeat(80)}`, 'bright');
  log(`📄 ${path.relative(FRONTEND_DIR, filePath)}`, 'cyan');
  log('='.repeat(80), 'bright');

  // Show import addition if present
  const hasNewImport = modified.includes("from '@/config/uploadConfig'") &&
                       !original.includes("from '@/config/uploadConfig'");

  if (hasNewImport) {
    log('\n✚ Adding import:', 'green');
    log("  import { BILL_UPLOAD_CONFIG } from '@/config/uploadConfig';", 'bright');
  }

  // Show pattern replacements
  log('\n📝 Changes:', 'yellow');

  for (let i = 0; i < Math.max(originalLines.length, modifiedLines.length); i++) {
    const origLine = originalLines[i] || '';
    const modLine = modifiedLines[i] || '';

    if (origLine !== modLine) {
      if (origLine && !modLine) {
        log(`  - ${origLine}`, 'red');
      } else if (!origLine && modLine) {
        log(`  + ${modLine}`, 'green');
      } else {
        log(`  - ${origLine}`, 'red');
        log(`  + ${modLine}`, 'green');
      }
    }
  }
}

async function migrateFile(filePath, options) {
  const analysis = analyzeFile(filePath);

  if (!analysis || analysis.matches.length === 0) {
    return { skipped: true, reason: 'No migrations needed' };
  }

  const newContent = applyMigrations(analysis);

  // Show diff
  showDiff(analysis.content, newContent, filePath);

  // Dry run - don't apply changes
  if (options.dryRun) {
    log('\n💡 Dry run mode - changes not applied', 'yellow');
    return { modified: false, dryRun: true };
  }

  // Auto mode - apply without asking
  if (options.auto) {
    if (options.backup) {
      createBackup(filePath);
    }

    if (writeFileContent(filePath, newContent)) {
      log('\n✅ Changes applied automatically', 'green');
      return { modified: true };
    }

    return { modified: false, error: 'Failed to write file' };
  }

  // Interactive mode - ask for confirmation
  const answer = await askQuestion('\n❓ Apply these changes? (y/n/skip): ');

  if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
    if (options.backup) {
      createBackup(filePath);
    }

    if (writeFileContent(filePath, newContent)) {
      log('\n✅ Changes applied', 'green');
      return { modified: true };
    }

    return { modified: false, error: 'Failed to write file' };
  }

  if (answer.toLowerCase() === 'skip' || answer.toLowerCase() === 's') {
    log('\n⏭️  Skipped', 'yellow');
    return { skipped: true, reason: 'User skipped' };
  }

  log('\n❌ Changes not applied', 'red');
  return { modified: false };
}

async function migrateDirectory(dirPath, options) {
  const files = fs.readdirSync(dirPath);
  const results = {
    modified: 0,
    skipped: 0,
    errors: 0,
    dryRun: 0,
  };

  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);

    // Skip unwanted files/directories
    if (SKIP_FILES.some((skip) => filePath.includes(skip))) {
      continue;
    }

    if (stat.isDirectory()) {
      // Recursively migrate subdirectories
      const subResults = await migrateDirectory(filePath, options);
      results.modified += subResults.modified;
      results.skipped += subResults.skipped;
      results.errors += subResults.errors;
      results.dryRun += subResults.dryRun;
    } else if (file.match(/\.(ts|tsx|js|jsx)$/)) {
      const result = await migrateFile(filePath, options);

      if (result.modified) {
        results.modified++;
      } else if (result.skipped) {
        results.skipped++;
      } else if (result.dryRun) {
        results.dryRun++;
      } else if (result.error) {
        results.errors++;
      }
    }
  }

  return results;
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  const args = process.argv.slice(2);

  // Parse options
  const options = {
    dryRun: args.includes('--dry-run'),
    auto: args.includes('--auto'),
    backup: args.includes('--backup'),
    file: args.find((arg) => arg.startsWith('--file='))?.split('=')[1],
  };

  log('\n' + '╔' + '═'.repeat(78) + '╗', 'bright');
  log('║' + ' '.repeat(22) + 'UPLOAD CONFIG MIGRATION TOOL' + ' '.repeat(27) + '║', 'bright');
  log('╚' + '═'.repeat(78) + '╝\n', 'bright');

  if (options.dryRun) {
    log('🔍 Running in DRY RUN mode - no changes will be applied\n', 'yellow');
  }

  if (options.auto) {
    log('⚡ Running in AUTO mode - changes will be applied automatically\n', 'magenta');
  }

  if (options.backup) {
    log('📦 Backup mode enabled - .bak files will be created\n', 'cyan');
  }

  let results;

  if (options.file) {
    // Migrate single file
    const filePath = path.resolve(FRONTEND_DIR, options.file);
    log(`📄 Migrating single file: ${options.file}\n`, 'cyan');
    const result = await migrateFile(filePath, options);

    results = {
      modified: result.modified ? 1 : 0,
      skipped: result.skipped ? 1 : 0,
      errors: result.error ? 1 : 0,
      dryRun: result.dryRun ? 1 : 0,
    };
  } else {
    // Migrate entire codebase
    log('🔄 Scanning codebase for migration opportunities...\n', 'cyan');

    const targetDirs = ['services', 'utils', 'hooks', 'components', 'contexts'];

    results = {
      modified: 0,
      skipped: 0,
      errors: 0,
      dryRun: 0,
    };

    for (const dir of targetDirs) {
      const dirPath = path.join(FRONTEND_DIR, dir);
      if (fs.existsSync(dirPath)) {
        const dirResults = await migrateDirectory(dirPath, options);
        results.modified += dirResults.modified;
        results.skipped += dirResults.skipped;
        results.errors += dirResults.errors;
        results.dryRun += dirResults.dryRun;
      }
    }
  }

  // Show summary
  log('\n' + '='.repeat(80), 'bright');
  log('MIGRATION SUMMARY', 'cyan');
  log('='.repeat(80), 'bright');

  log(`\n📊 Results:`, 'bright');

  if (options.dryRun) {
    log(`   🔍 Files analyzed: ${results.dryRun}`, 'yellow');
  } else {
    log(`   ✅ Files modified: ${results.modified}`, 'green');
    log(`   ⏭️  Files skipped: ${results.skipped}`, 'yellow');
    if (results.errors > 0) {
      log(`   ❌ Errors: ${results.errors}`, 'red');
    }
  }

  log('\n💡 Next Steps:', 'bright');

  if (options.dryRun) {
    log('   1. Review the proposed changes', 'yellow');
    log('   2. Run without --dry-run to apply changes', 'yellow');
  } else if (results.modified > 0) {
    log('   1. Test the migrated files', 'yellow');
    log('   2. Run verification: node scripts/verify-upload-config.js', 'yellow');
    log('   3. Run tests to ensure nothing broke', 'yellow');
    if (options.backup) {
      log('   4. Delete .bak files after verification', 'yellow');
    }
  } else {
    log('   ✅ No files needed migration!', 'green');
  }

  log('\n' + '='.repeat(80) + '\n', 'bright');
}

// Run the script
if (require.main === module) {
  main().catch((error) => {
    log(`\n❌ Fatal error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  analyzeFile,
  applyMigrations,
  migrateFile,
};
