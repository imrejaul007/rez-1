#!/usr/bin/env node

/**
 * Bulk Navigation Fix Script
 * Automatically fixes navigation issues in all files
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Configuration
const appDir = path.join(__dirname, '..', 'app');
const patterns = [
  '**/*.tsx',
  '!node_modules/**',
  '!**/*.test.tsx',
  '!**/*.spec.tsx',
];

// Patterns to detect navigation issues
const issuePatterns = {
  handleGoBack: /const handleGoBack.*?=.*?\(\).*?=>.*?\{[\s\S]*?\};/g,
  tryNavigationOld: /try\s*\{[\s\S]*?navigation\.goBack\(\)[\s\S]*?\}\s*catch[\s\S]*?\{[\s\S]*?\}/g,
  canGoBackCheck: /if\s*\(\s*(?:navigation|router)\.canGoBack\(\)\s*\)/g,
  backButton: /<TouchableOpacity[^>]*onPress={handleGoBack}[^>]*>[\s\S]*?<Ionicons[^>]*name="arrow-back"[\s\S]*?<\/TouchableOpacity>/g,
};

// Replacement templates
const replacements = {
  addImports: (content) => {
    if (content.includes('useSafeNavigation')) return content;

    const importLine = content.indexOf('import {');
    if (importLine === -1) return content;

    const expoRouterImport = content.match(/import.*from ['"]expo-router['"]/);
    if (!expoRouterImport) return content;

    const insertAfter = content.indexOf(expoRouterImport[0]) + expoRouterImport[0].length;
    const imports = `\nimport { useSafeNavigation } from '@/hooks/useSafeNavigation';\nimport { HeaderBackButton } from '@/components/navigation';`;

    return content.slice(0, insertAfter) + imports + content.slice(insertAfter);
  },

  replaceHandleGoBack: (content) => {
    return content.replace(
      issuePatterns.handleGoBack,
      `const { goBack } = useSafeNavigation();\n\n  const handleGoBack = () => {\n    goBack('/' as any);\n  };`
    );
  },

  replaceBackButton: (content) => {
    return content.replace(
      issuePatterns.backButton,
      `<HeaderBackButton onPress={handleGoBack} iconColor="#FFFFFF" />`
    );
  },
};

// Find files with navigation issues
function findFilesWithIssues(dir, patterns) {
  const files = [];
  patterns.forEach(pattern => {
    const matches = glob.sync(pattern, { cwd: dir, absolute: true });
    files.push(...matches);
  });
  return files;
}

// Check if file has navigation issues
function hasNavigationIssues(content) {
  return Object.values(issuePatterns).some(pattern => pattern.test(content));
}

// Fix file
function fixFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const original = content;

    if (!hasNavigationIssues(content)) {
      return { fixed: false, reason: 'No issues found' };
    }

    // Apply fixes
    content = replacements.addImports(content);
    content = replacements.replaceHandleGoBack(content);
    content = replacements.replaceBackButton(content);

    if (content !== original) {
      // Create backup
      fs.writeFileSync(filePath + '.backup', original);

      // Write fixed file
      fs.writeFileSync(filePath, content);

      return { fixed: true, changes: content !== original };
    }

    return { fixed: false, reason: 'No changes needed' };
  } catch (error) {
    return { fixed: false, error: error.message };
  }
}

// Main execution
function main() {
  console.log('🔍 Finding files with navigation issues...\n');

  const files = findFilesWithIssues(appDir, patterns);
  console.log(`Found ${files.length} TypeScript files to check\n`);

  let fixed = 0;
  let skipped = 0;
  let errors = 0;

  files.forEach(file => {
    const relativePath = path.relative(appDir, file);
    const result = fixFile(file);

    if (result.fixed) {
      console.log(`✅ Fixed: ${relativePath}`);
      fixed++;
    } else if (result.error) {
      console.log(`❌ Error: ${relativePath} - ${result.error}`);
      errors++;
    } else {
      skipped++;
    }
  });

  console.log('\n📊 Summary:');
  console.log(`  ✅ Fixed: ${fixed}`);
  console.log(`  ⏭️  Skipped: ${skipped}`);
  console.log(`  ❌ Errors: ${errors}`);
  console.log(`  📁 Total: ${files.length}`);

  if (fixed > 0) {
    console.log('\n💡 Backup files created with .backup extension');
    console.log('💡 Review changes and remove backups if satisfied');
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { fixFile, hasNavigationIssues };
