#!/usr/bin/env node

/**
 * Upload Configuration Verification Script
 *
 * This script:
 * 1. Lists all constants exported from uploadConfig.ts
 * 2. Scans codebase for hardcoded upload values
 * 3. Identifies files that should import from uploadConfig
 * 4. Generates migration recommendations
 *
 * Usage:
 *   node scripts/verify-upload-config.js
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// CONFIGURATION
// ============================================================================

const FRONTEND_DIR = path.join(__dirname, '..');
const CONFIG_FILE = path.join(FRONTEND_DIR, 'config', 'uploadConfig.ts');

// Files and directories to scan
const SCAN_TARGETS = [
  'services',
  'utils',
  'hooks',
  'components/bills',
  'components/common/FileUploader.tsx',
  'contexts',
];

// Patterns to search for (hardcoded values)
const HARDCODED_PATTERNS = [
  // File sizes
  { pattern: /5\s*\*\s*1024\s*\*\s*1024/g, description: '5MB file size', config: 'FILE_SIZE_LIMITS.MAX_IMAGE_SIZE' },
  { pattern: /50\s*\*\s*1024/g, description: '50KB file size', config: 'FILE_SIZE_LIMITS.MIN_IMAGE_SIZE' },
  { pattern: /2\s*\*\s*1024\s*\*\s*1024/g, description: '2MB file size', config: 'FILE_SIZE_LIMITS.OPTIMAL_SIZE' },
  { pattern: /3\s*\*\s*1024\s*\*\s*1024/g, description: '3MB file size', config: 'FILE_SIZE_LIMITS.WARNING_THRESHOLD' },

  // Timeouts
  { pattern: /60000/g, description: '60 second timeout', config: 'UPLOAD_CONFIG.TIMEOUT_MS' },
  { pattern: /120000/g, description: '120 second timeout', config: 'NETWORK_ADAPTIVE_CONFIG.SLOW_NETWORK.TIMEOUT_MS' },

  // Retry config
  { pattern: /MAX_RETRIES.*[=:]\s*3/g, description: 'Max retries = 3', config: 'UPLOAD_CONFIG.MAX_RETRIES' },
  { pattern: /1000.*retry/gi, description: '1 second retry delay', config: 'UPLOAD_CONFIG.INITIAL_RETRY_DELAY' },
  { pattern: /30000.*retry/gi, description: '30 second max retry', config: 'UPLOAD_CONFIG.MAX_RETRY_DELAY' },

  // Queue config
  { pattern: /MAX_QUEUE_SIZE.*[=:]\s*50/g, description: 'Max queue size = 50', config: 'QUEUE_CONFIG.MAX_QUEUE_SIZE' },
  { pattern: /BATCH_SIZE.*[=:]\s*5/g, description: 'Batch size = 5', config: 'QUEUE_CONFIG.BATCH_SIZE' },
  { pattern: /5\s*\*\s*60\s*\*\s*1000/g, description: '5 minute interval', config: 'QUEUE_CONFIG.SYNC_INTERVAL' },

  // Image formats
  { pattern: /'image\/jpeg'/g, description: 'JPEG format', config: 'ALLOWED_FILE_FORMATS.IMAGES' },
  { pattern: /'image\/png'/g, description: 'PNG format', config: 'ALLOWED_FILE_FORMATS.IMAGES' },
  { pattern: /'image\/heic'/g, description: 'HEIC format', config: 'ALLOWED_FILE_FORMATS.IMAGES' },
  { pattern: /\[?'\.jpg',?\s*'\.jpeg',?\s*'\.png'/g, description: 'File extensions', config: 'ALLOWED_FILE_FORMATS.EXTENSIONS' },

  // Quality settings
  { pattern: /MIN_QUALITY_SCORE.*[=:]\s*60/g, description: 'Min quality score = 60', config: 'IMAGE_QUALITY_CONFIG.MIN_QUALITY_SCORE' },
  { pattern: /width:\s*800.*height:\s*600/g, description: 'Min resolution 800x600', config: 'IMAGE_QUALITY_CONFIG.MIN_RESOLUTION' },
  { pattern: /JPEG_QUALITY.*[=:]\s*0\.85/g, description: 'JPEG quality = 0.85', config: 'IMAGE_QUALITY_CONFIG.JPEG_QUALITY' },

  // Error types
  { pattern: /'TIMEOUT'/g, description: 'Timeout error', config: 'RETRYABLE_ERRORS' },
  { pattern: /'NETWORK_ERROR'/g, description: 'Network error', config: 'RETRYABLE_ERRORS' },
  { pattern: /'INVALID_FILE_FORMAT'/g, description: 'Invalid format error', config: 'NON_RETRYABLE_ERRORS' },
  { pattern: /'FILE_TOO_LARGE'/g, description: 'File too large error', config: 'NON_RETRYABLE_ERRORS' },
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

function getAllFiles(dirPath, arrayOfFiles = []) {
  try {
    const files = fs.readdirSync(dirPath);

    files.forEach((file) => {
      const filePath = path.join(dirPath, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        // Skip node_modules and hidden directories
        if (!file.startsWith('.') && file !== 'node_modules') {
          arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
        }
      } else if (file.match(/\.(ts|tsx|js|jsx)$/)) {
        arrayOfFiles.push(filePath);
      }
    });

    return arrayOfFiles;
  } catch (error) {
    return arrayOfFiles;
  }
}

// ============================================================================
// ANALYSIS FUNCTIONS
// ============================================================================

function listConfigConstants() {
  log('\n' + '='.repeat(80), 'bright');
  log('UPLOAD CONFIGURATION CONSTANTS', 'cyan');
  log('='.repeat(80), 'bright');

  const configContent = readFileContent(CONFIG_FILE);
  if (!configContent) {
    log('❌ Could not read uploadConfig.ts', 'red');
    return;
  }

  log('\n📦 Available Configuration Objects:\n', 'green');

  const exports = [
    'FILE_SIZE_LIMITS',
    'ALLOWED_FILE_FORMATS',
    'UPLOAD_CONFIG',
    'QUEUE_CONFIG',
    'IMAGE_QUALITY_CONFIG',
    'RETRYABLE_ERRORS',
    'NON_RETRYABLE_ERRORS',
    'PROGRESS_CONFIG',
    'ANALYTICS_CONFIG',
    'NETWORK_ADAPTIVE_CONFIG',
    'BILL_SPECIFIC_CONFIG',
    'BILL_UPLOAD_CONFIG (consolidated)',
  ];

  exports.forEach((exp, index) => {
    log(`  ${index + 1}. ${exp}`, 'bright');
  });

  log('\n📚 Helper Functions:\n', 'green');
  const helpers = [
    'shouldRetryError(errorCode: string): boolean',
    'isValidFileFormat(mimeType: string): boolean',
    'isValidExtension(extension: string): boolean',
    'isValidFileSize(size: number): boolean',
    'calculateRetryDelay(attemptNumber: number): number',
  ];

  helpers.forEach((helper, index) => {
    log(`  ${index + 1}. ${helper}`, 'bright');
  });

  log('\n💡 Usage Example:', 'yellow');
  log(`
  import { BILL_UPLOAD_CONFIG, isValidFileSize } from '@/config/uploadConfig';

  // Access configuration values
  const maxSize = BILL_UPLOAD_CONFIG.FILE_SIZE_LIMITS.MAX_IMAGE_SIZE;
  const timeout = BILL_UPLOAD_CONFIG.UPLOAD_CONFIG.TIMEOUT_MS;

  // Use helper functions
  if (isValidFileSize(fileSize)) {
    // proceed with upload
  }
  `, 'bright');
}

function scanForHardcodedValues() {
  log('\n' + '='.repeat(80), 'bright');
  log('SCANNING FOR HARDCODED VALUES', 'cyan');
  log('='.repeat(80), 'bright');

  const findings = [];

  SCAN_TARGETS.forEach((target) => {
    const targetPath = path.join(FRONTEND_DIR, target);

    if (!fs.existsSync(targetPath)) {
      log(`⚠️  Target not found: ${target}`, 'yellow');
      return;
    }

    const stat = fs.statSync(targetPath);
    const files = stat.isDirectory()
      ? getAllFiles(targetPath)
      : [targetPath];

    files.forEach((filePath) => {
      const content = readFileContent(filePath);
      if (!content) return;

      // Skip if already importing from uploadConfig
      const alreadyImportsConfig = content.includes("from '@/config/uploadConfig'") ||
                                   content.includes("from '../config/uploadConfig'") ||
                                   content.includes('from "config/uploadConfig"');

      HARDCODED_PATTERNS.forEach((pattern) => {
        const matches = content.match(pattern.pattern);
        if (matches && matches.length > 0) {
          findings.push({
            file: path.relative(FRONTEND_DIR, filePath),
            description: pattern.description,
            config: pattern.config,
            matches: matches.length,
            alreadyImportsConfig,
          });
        }
      });
    });
  });

  if (findings.length === 0) {
    log('\n✅ No hardcoded values found!', 'green');
    return findings;
  }

  log(`\n🔍 Found ${findings.length} potential hardcoded values:\n`, 'yellow');

  // Group by file
  const byFile = {};
  findings.forEach((finding) => {
    if (!byFile[finding.file]) {
      byFile[finding.file] = [];
    }
    byFile[finding.file].push(finding);
  });

  Object.keys(byFile).sort().forEach((file) => {
    const fileFindings = byFile[file];
    const status = fileFindings[0].alreadyImportsConfig ? '✓' : '✗';
    const statusColor = fileFindings[0].alreadyImportsConfig ? 'green' : 'red';

    log(`\n${status} ${file}`, statusColor);
    fileFindings.forEach((finding) => {
      log(`    • ${finding.description} (${finding.matches} occurrence${finding.matches > 1 ? 's' : ''})`, 'bright');
      log(`      → Should use: ${finding.config}`, 'cyan');
    });
  });

  return findings;
}

function generateMigrationReport(findings) {
  log('\n' + '='.repeat(80), 'bright');
  log('MIGRATION RECOMMENDATIONS', 'cyan');
  log('='.repeat(80), 'bright');

  const needsMigration = findings.filter((f) => !f.alreadyImportsConfig);
  const alreadyMigrated = findings.filter((f) => f.alreadyImportsConfig);

  if (needsMigration.length === 0) {
    log('\n✅ All files are already using the config!', 'green');
    return;
  }

  log(`\n📋 Files requiring migration: ${needsMigration.length}`, 'yellow');
  log(`✓ Files already migrated: ${alreadyMigrated.length}`, 'green');

  // Group by file
  const fileGroups = {};
  needsMigration.forEach((finding) => {
    if (!fileGroups[finding.file]) {
      fileGroups[finding.file] = new Set();
    }
    fileGroups[finding.file].add(finding.config);
  });

  log('\n📝 Migration Steps:\n', 'bright');

  Object.keys(fileGroups).sort().forEach((file, index) => {
    const configs = Array.from(fileGroups[file]);

    log(`${index + 1}. ${file}`, 'yellow');
    log('   Add import:', 'cyan');
    log(`   import { BILL_UPLOAD_CONFIG } from '@/config/uploadConfig';`, 'bright');
    log('\n   Replace hardcoded values with:', 'cyan');
    configs.forEach((config) => {
      log(`   • BILL_UPLOAD_CONFIG.${config}`, 'bright');
    });
    log('');
  });

  // Priority files
  log('\n🎯 Priority Migration Files:', 'magenta');
  log('   These files are critical for upload functionality:\n', 'bright');

  const priorityFiles = Object.keys(fileGroups).filter((file) =>
    file.includes('billUpload') ||
    file.includes('fileUpload') ||
    file.includes('imageUpload') ||
    file.includes('upload') ||
    file.includes('Queue')
  );

  if (priorityFiles.length > 0) {
    priorityFiles.forEach((file, index) => {
      log(`   ${index + 1}. ${file}`, 'yellow');
    });
  } else {
    log('   None identified - all uploads may be using hardcoded values', 'yellow');
  }
}

function generateSummary(findings) {
  log('\n' + '='.repeat(80), 'bright');
  log('SUMMARY', 'cyan');
  log('='.repeat(80), 'bright');

  const totalFiles = new Set(findings.map((f) => f.file)).size;
  const migratedFiles = new Set(
    findings.filter((f) => f.alreadyImportsConfig).map((f) => f.file)
  ).size;
  const unmigrated = totalFiles - migratedFiles;

  log('\n📊 Statistics:', 'bright');
  log(`   Total files with upload config: ${totalFiles}`, 'bright');
  log(`   ✓ Already using uploadConfig: ${migratedFiles}`, 'green');
  log(`   ✗ Using hardcoded values: ${unmigrated}`, unmigrated > 0 ? 'red' : 'green');

  const percentage = totalFiles > 0 ? ((migratedFiles / totalFiles) * 100).toFixed(1) : 0;
  log(`\n   Migration Progress: ${percentage}%`, percentage >= 80 ? 'green' : 'yellow');

  log('\n📁 Configuration File:', 'bright');
  log(`   ${path.relative(process.cwd(), CONFIG_FILE)}`, 'cyan');

  log('\n💡 Next Steps:', 'bright');
  if (unmigrated > 0) {
    log(`   1. Migrate ${unmigrated} file${unmigrated > 1 ? 's' : ''} to use uploadConfig.ts`, 'yellow');
    log('   2. Test upload functionality after migration', 'yellow');
    log('   3. Remove hardcoded values and constants', 'yellow');
    log('   4. Run this script again to verify completion', 'yellow');
  } else {
    log('   ✅ All files are using the centralized config!', 'green');
    log('   Consider removing any duplicate constant definitions', 'yellow');
  }
}

function checkConfigIntegrity() {
  log('\n' + '='.repeat(80), 'bright');
  log('CONFIG FILE INTEGRITY CHECK', 'cyan');
  log('='.repeat(80), 'bright');

  const configContent = readFileContent(CONFIG_FILE);
  if (!configContent) {
    log('\n❌ Could not read uploadConfig.ts', 'red');
    return false;
  }

  const checks = [
    { name: 'FILE_SIZE_LIMITS exported', test: /export const FILE_SIZE_LIMITS/ },
    { name: 'ALLOWED_FILE_FORMATS exported', test: /export const ALLOWED_FILE_FORMATS/ },
    { name: 'UPLOAD_CONFIG exported', test: /export const UPLOAD_CONFIG/ },
    { name: 'QUEUE_CONFIG exported', test: /export const QUEUE_CONFIG/ },
    { name: 'IMAGE_QUALITY_CONFIG exported', test: /export const IMAGE_QUALITY_CONFIG/ },
    { name: 'RETRYABLE_ERRORS exported', test: /export const RETRYABLE_ERRORS/ },
    { name: 'NON_RETRYABLE_ERRORS exported', test: /export const NON_RETRYABLE_ERRORS/ },
    { name: 'BILL_UPLOAD_CONFIG exported', test: /export const BILL_UPLOAD_CONFIG/ },
    { name: 'Helper functions present', test: /export const shouldRetryError/ },
    { name: 'TypeScript types exported', test: /export type/ },
  ];

  log('\n✓ Running integrity checks:\n', 'bright');

  let allPassed = true;
  checks.forEach((check) => {
    const passed = check.test.test(configContent);
    const icon = passed ? '✓' : '✗';
    const color = passed ? 'green' : 'red';
    log(`   ${icon} ${check.name}`, color);
    if (!passed) allPassed = false;
  });

  if (allPassed) {
    log('\n✅ All integrity checks passed!', 'green');
  } else {
    log('\n❌ Some integrity checks failed!', 'red');
  }

  return allPassed;
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

function main() {
  log('\n' + '╔' + '═'.repeat(78) + '╗', 'bright');
  log('║' + ' '.repeat(20) + 'UPLOAD CONFIG VERIFICATION TOOL' + ' '.repeat(26) + '║', 'bright');
  log('╚' + '═'.repeat(78) + '╝', 'bright');

  // Check if config file exists
  if (!fs.existsSync(CONFIG_FILE)) {
    log('\n❌ uploadConfig.ts not found!', 'red');
    log(`   Expected location: ${CONFIG_FILE}`, 'yellow');
    log('   Please create the config file first.', 'yellow');
    process.exit(1);
  }

  // Run all checks
  checkConfigIntegrity();
  listConfigConstants();
  const findings = scanForHardcodedValues();
  generateMigrationReport(findings);
  generateSummary(findings);

  log('\n' + '═'.repeat(80) + '\n', 'bright');
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  scanForHardcodedValues,
  checkConfigIntegrity,
  listConfigConstants,
};
