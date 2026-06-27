#!/usr/bin/env node
/**
 * One-shot fixer: converts wrong Ionicons named imports to default+glyphMap.
 *
 * BEFORE:  import { Ionicons } from '@expo/vector-icons/Ionicons';
 * AFTER:   import Ionicons, { glyphMap } from '@expo/vector-icons/Ionicons';
 *
 * Also handles other vector-icon families used in this codebase (default exports).
 * For files that reference `Ionicons.glyphMap` (or any other <Family>.glyphMap),
 * the second form (default + named glyphMap) keeps both usages working.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';

const ROOTS = ['app', 'components', 'hooks', 'services', 'utils', 'lib', 'src'];
const ICON_FAMILIES = [
  'Ionicons',
  'MaterialIcons',
  'MaterialCommunityIcons',
  'FontAwesome',
  'FontAwesome5',
  'FontAwesome6',
  'Feather',
  'AntDesign',
  'Entypo',
  'EvilIcons',
  'Foundation',
  'Octicons',
  'SimpleLineIcons',
  'Zocial',
];

// Match:  import { Ionicons } from '...';
// Also:    import { Ionicons, Other } from '...';
// Also:    import Ionicons, { glyphMap } from '...' (broken — glyphMap is not exported)
// Also:    import Ionicons, { glyphMap, Other } from '...'
// Result:  keep Other named imports, add Ionicons as default.
const SINGLE_RE = /^(\s*)import\s*(?:\{([^}]+)\}|([A-Za-z0-9_]+)(?:\s*,\s*\{\s*([^}]+)\s*\})?)\s*from\s*(['"])(@expo\/vector-icons\/(?:Ionicons|MaterialIcons|MaterialCommunityIcons|FontAwesome|FontAwesome5|FontAwesome6|Feather|AntDesign|Entypo|EvilIcons|Foundation|Octicons|SimpleLineIcons|Zocial))(['"])\s*;?\s*$/;

let changed = 0;
let scanned = 0;
let skipped = 0;
const examples = [];

for (const root of ROOTS) {
  const rootPath = path.resolve(root);
  let entries;
  try {
    entries = await fs.readdir(rootPath, { withFileTypes: true });
  } catch {
    continue; // root doesn't exist in this project
  }

  const stack = [...entries.map((e) => path.join(rootPath, e.name))];
  while (stack.length) {
    const p = stack.pop();
    let stat;
    try {
      stat = await fs.stat(p);
    } catch {
      continue;
    }
    if (stat.isDirectory()) {
      if (p.includes('node_modules') || p.includes('.expo') || p.includes('__tests__')) continue;
      const sub = await fs.readdir(p, { withFileTypes: true });
      for (const e of sub) stack.push(path.join(p, e.name));
      continue;
    }
    if (!/\.(tsx|ts)$/.test(p)) continue;
    scanned++;

    let src;
    try {
      src = await fs.readFile(p, 'utf8');
    } catch {
      continue;
    }

    const lines = src.split('\n');
    let fileChanged = false;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const m = line.match(SINGLE_RE);
      if (!m) continue;
      const [, indent, namedOnly, defaultOnly, namedAfterDefault, q1, modulePath, q2] = m;
      // Collect every imported identifier across default + named slots.
      const defaultNames = defaultOnly
        ? defaultOnly.split(',').map((s) => s.trim()).filter(Boolean)
        : [];
      const namedRaw = namedOnly ?? namedAfterDefault ?? '';
      const namedNames = namedRaw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        // Strip any leftover glyphMap references (it isn't a real named export).
        .filter((n) => n !== 'glyphMap');
      const allImported = [...defaultNames, ...namedNames];

      // Find which icon families are in this import.
      const iconDefaults = allImported.filter((n) => ICON_FAMILIES.includes(n));
      if (iconDefaults.length === 0) continue;
      const otherNamed = namedNames.filter((n) => !ICON_FAMILIES.includes(n));

      // Build new import.
      const defaults = iconDefaults.join(', ');
      let newLine;
      if (otherNamed.length === 0) {
        // Only icon families: `import Icon from '...';`
        newLine = `${indent}import ${defaults} from ${q1}${modulePath}${q2};`;
      } else {
        // Mixed: keep other named imports, add icons as defaults.
        newLine = `${indent}import ${defaults}, { ${otherNamed.join(', ')} } from ${q1}${modulePath}${q2};`;
      }

      lines[i] = newLine;
      fileChanged = true;
      if (examples.length < 5) examples.push({ file: p, before: line, after: newLine });
    }

    if (fileChanged) {
      await fs.writeFile(p, lines.join('\n'), 'utf8');
      changed++;
    } else {
      skipped++;
    }
  }
}

console.log(`Scanned: ${scanned} files`);
console.log(`Changed: ${changed} files`);
console.log(`Skipped (no match): ${skipped} files`);
console.log('Examples:');
for (const ex of examples) {
  console.log(`  ${ex.file}`);
  console.log(`    - ${ex.before.trim()}`);
  console.log(`    + ${ex.after.trim()}`);
}
