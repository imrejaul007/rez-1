#!/usr/bin/env node
/**
 * refactor-icons.mjs — Replace umbrella `@expo/vector-icons` imports with
 * direct per-family imports (e.g., `@expo/vector-icons/Ionicons`).
 *
 * The umbrella package exports all 30+ icon families (66 modules total).
 * Switching to direct imports reduces the bundle to just the families used.
 *
 * Strategy:
 *   1. Find files importing from `@expo/vector-icons` (umbrella)
 *   2. Parse the import to extract which icon families are used
 *   3. Replace with direct imports
 *
 * Usage:
 *   node scripts/refactor-icons.mjs --dry-run
 *   node scripts/refactor-icons.mjs
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

const ROOT = process.cwd();
const dryRun = process.argv.includes('--dry-run');

// Find all files importing from @expo/vector-icons
const consumers = [];
function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
      const content = readFileSync(full, 'utf8');
      if (/from\s+['"]@expo\/vector-icons['"]/m.test(content)) {
        consumers.push(full);
      }
    }
  }
}

for (const d of ['app', 'components', 'contexts', 'hooks', 'utils']) {
  const full = join(ROOT, d);
  if (existsSync(full)) walk(full);
}

console.log(`Found ${consumers.length} files importing from @expo/vector-icons umbrella\n`);

let totalChanged = 0;
let totalSkipped = 0;

for (const file of consumers) {
  let content = readFileSync(file, 'utf8');
  const rel = relative(ROOT, file).replace(/\\/g, '/');

  // Match: import { Foo, Bar } from '@expo/vector-icons';
  // Or: import Foo from '@expo/vector-icons'; (default import — keep as-is)
  const importRegex = /import\s*\{([^}]+)\}\s*from\s*['"]@expo\/vector-icons['"];?/g;

  let m;
  const newImports = [];
  const skipped = [];

  while ((m = importRegex.exec(content)) !== null) {
    const symbols = m[1].split(',').map(s => s.trim()).filter(Boolean);
    if (symbols.length === 0) continue;

    // Map each symbol to its icon family
    // Ionicons → Ionicons family, MaterialIcons → MaterialIcons family, etc.
    const familyImports = new Map(); // family → [symbol, ...]

    for (const sym of symbols) {
      // Handle "Foo as Bar" rename
      const parts = sym.split(/\s+as\s+/);
      const name = parts[0].trim();

      // Determine icon family. Common conventions:
      // - Ionicons, MaterialIcons, MaterialCommunityIcons, Feather, etc.
      // - If name matches a known icon family, route to that family.
      // - Otherwise assume Ionicons (the most common default).

      // Known icon families in @expo/vector-icons
      const knownFamilies = [
        'Ionicons', 'MaterialIcons', 'MaterialCommunityIcons',
        'Feather', 'FontAwesome', 'FontAwesome5', 'FontAwesome6',
        'Fontisto', 'Foundation', 'Octicons', 'Zocial',
        'SimpleLineIcons', 'AntDesign', 'Entypo', 'EvilIcons',
        'FontAwesome5_Brands', 'FontAwesome5_Regular', 'FontAwesome5_Solid',
        'FontAwesome6_Brands', 'FontAwesome6_Regular', 'FontAwesome6_Solid',
        'Foundation', 'Ionicons', 'MaterialIcons', 'MaterialCommunityIcons',
        'Octicons', 'SimpleLineIcons', 'Zocial',
      ];

      let family = knownFamilies.includes(name) ? name : 'Ionicons';

      if (!familyImports.has(family)) familyImports.set(family, []);
      familyImports.get(family).push(sym);
    }

    const before = m[0];
    const after = [...familyImports.entries()].map(([family, syms]) =>
      `import { ${syms.join(', ')} } from '@expo/vector-icons/${family}';`
    ).join('\n');

    if (after === before) {
      skipped.push(rel);
      continue;
    }

    newImports.push({ from: m.index, len: m[0].length, replacement: after });
  }

  if (newImports.length > 0) {
    if (!dryRun) {
      newImports.sort((a, b) => b.from - a.from);
      for (const { from, len, replacement } of newImports) {
        content = content.substring(0, from) + replacement + content.substring(from + len);
      }
      writeFileSync(file, content);
    }
    totalChanged++;
    if (totalChanged <= 5) {
      console.log(`${dryRun ? '[DRY] ' : ''}✓ ${rel}`);
      for (const { from, len, replacement } of newImports) {
        console.log(`  - ${content.substring(from, Math.min(from + 60, from + len))}...`);
        console.log(`  + ${replacement.substring(0, 80)}...`);
      }
    }
  } else {
    totalSkipped++;
  }
}

console.log(`\n${dryRun ? 'Would change' : 'Changed'}: ${totalChanged} files`);
console.log(`Skipped (already specific or no change): ${totalSkipped}`);