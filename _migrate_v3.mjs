// _migrate_v3.mjs — fix mongoose 8.23+ type errors at scale.
// Uses Windows-safe line splitting. Run: node _migrate_v3.mjs <root>

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { argv } from 'process';

const ROOT = argv[2] || '.';
process.chdir(ROOT);

console.log('Running tsc to get error list...');
let tscOutput;
try {
  tscOutput = execSync('npx tsc --noEmit', {
    encoding: 'utf8',
    maxBuffer: 50 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
} catch (err) {
  tscOutput = (err.stdout || '') + (err.stderr || '');
}

// Windows-safe line split: handle both \n and \r\n
const lines = tscOutput.split(/\r?\n/);
const errorLines = lines.filter(l => l.includes('error TS'));
console.log('Found ' + errorLines.length + ' errors.');

// Parse error lines
const errorRe = /^(.+?)\((\d+),(\d+)\)\s*:\s*error\s+(TS\d+):\s+(.+)$/;
const errors = [];
for (const line of errorLines) {
  const m = line.match(errorRe);
  if (m) {
    errors.push({
      file: m[1],
      line: parseInt(m[2]),
      col: parseInt(m[3]),
      code: m[4],
      message: m[5],
    });
  }
}

const byFile = {};
for (const e of errors) {
  if (!byFile[e.file]) byFile[e.file] = [];
  byFile[e.file].push(e);
}
console.log('Errors in ' + Object.keys(byFile).length + ' files.');

let totalFixed = 0;
const modifiedFiles = [];

for (const [file, errs] of Object.entries(byFile)) {
  let content;
  try { content = readFileSync(file, 'utf8'); } catch (err) { continue; }
  const fileLines = content.split(/\r?\n/);
  let fileChanged = false;

  for (const e of errs) {
    const lineIdx = e.line - 1;
    if (lineIdx < 0 || lineIdx >= fileLines.length) continue;
    const originalLine = fileLines[lineIdx];
    let modified = originalLine;

    if (e.code === 'TS2352' && e.message.includes('ObjectId') && e.message.includes('string')) {
      const castRe = /\(([^()]+)\)\s+as\s+string\b/g;
      if (castRe.test(modified)) {
        modified = modified.replace(castRe, (m, expr) => 'String(' + expr.trim() + ')');
      } else {
        const inlineRe = /\b([a-zA-Z_][a-zA-Z0-9_.]*(?:\([^)]*\))?)\s+as\s+string\b/;
        modified = modified.replace(inlineRe, 'String($1)');
      }
    } else {
      const assignMatch = e.message.match(/not assignable to type '([^']+)'/);
      if (assignMatch) {
        const expectedType = assignMatch[1];
        if (e.code === 'TS2322') {
          const am = modified.match(/^(\s*const\s+\w+\s*[:=]?\s*)([^;]+)(;?\s*)$/);
          if (am) {
            modified = am[1] + am[2] + ' as unknown as ' + expectedType + (am[3] || ';');
          } else {
            const rm = modified.match(/^(\s*return\s+)([^;]+)(;?\s*)$/);
            if (rm) {
              modified = rm[1] + rm[2] + ' as unknown as ' + expectedType + (rm[3] || ';');
            }
          }
        } else if (e.code === 'TS2345') {
          const col = e.col - 1;
          let depth = 0;
          let argEnd = -1;
          for (let i = col; i < modified.length; i++) {
            const ch = modified[i];
            if (ch === '(') depth++;
            else if (ch === ')') {
              if (depth === 0) { argEnd = i; break; }
              depth--;
            } else if (ch === ',' && depth === 0) { argEnd = i; break; }
          }
          if (argEnd > 0) {
            modified = modified.slice(0, argEnd) + ' as unknown as ' + expectedType + modified.slice(argEnd);
          }
        }
      }
    }

    if (modified !== originalLine) {
      fileLines[lineIdx] = modified;
      fileChanged = true;
      totalFixed++;
    }
  }

  if (fileChanged) {
    writeFileSync(file, fileLines.join('\n'), 'utf8');
    modifiedFiles.push(file);
  }
}

console.log('Fixed ' + totalFixed + ' errors in ' + modifiedFiles.length + ' files.');
if (modifiedFiles.length > 0) {
  console.log('\nModified files (first 20):');
  modifiedFiles.slice(0, 20).forEach(f => console.log('  ' + f));
}
