// _restore_v3.mjs — restore files from the iter 14 broken migration.
// The iter 14 scripts made these patterns of damage:
// 1. Inserted ') as unknown as X;' on a line where it shouldn't go
//    (e.g., 'return await X.find({query})' became 'return await X.find({query}) as unknown as X;'
//    even though the .find has a chain)
// 2. Removed indentation on subsequent chain lines
// 3. Removed the closing '})' on multi-line .find() queries
//
// The fix: revert all 'as unknown as X' inserts that break chains, restore
// indentation, and re-add missing '})' on multi-line find() queries.

import { readFileSync, writeFileSync } from 'fs';

const files = [
  'src/services/ActivityTimelineService.ts',
  'src/services/AuditService.ts',
  'src/services/challengeService.ts',
  'src/services/deviceFingerprintService.ts',
  'src/services/gameService.ts',
  'src/services/programService.ts',
  'src/services/quickActionService.ts',
  'src/services/reputationService.ts',
  'src/services/valueCardService.ts',
  'src/services/weeklyChallengeService.ts',
  'src/services/whatsNewService.ts',
];

let totalFixed = 0;
for (const f of files) {
  try {
    let c = readFileSync(f, 'utf8');
    const before = c;

    // Step 1: Remove any ' as unknown as X;' or ' as unknown as X' that
    // appeared in the middle of .find() chains.
    // Pattern: '}) as unknown as X;' or '}) as unknown as X' or '}) as unknown as X<>'
    c = c.replace(/\)\s+as unknown as\s+[A-Za-z][A-Za-z0-9_ |.<>\[\]]*;?/g, ')');

    // Step 2: Find multi-line .find({...}) queries that are missing the
    // closing '})' and have a chain starting with '.sort' or '.limit' etc.
    // on the next line.
    const lines = c.split('\n');
    const newLines = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // If line is 'find({query' or 'findOne({query' or 'find(query' (multi-line),
      // and the next non-empty line starts with '.method' (a chain),
      // we need to find where the query object closes and add ')'.
      if (line.match(/\.find(?:One)?\(\{?[^}]*$/)) {
        // The find is open. Find where the matching '}' is.
        let depth = 0;
        let queryEnd = -1;
        for (let j = i; j < lines.length; j++) {
          for (const ch of lines[j]) {
            if (ch === '{') depth++;
            else if (ch === '}') {
              depth--;
              if (depth === 0) { queryEnd = j; break; }
            }
          }
          if (queryEnd >= 0) break;
        }
        if (queryEnd > i) {
          // Check if the '}' line is alone (just '})' expected)
          // or if there's content after '}'
          // We want to merge the '}' into the find line by adding ')' after
          // For simplicity: keep the lines as-is but check next line
          // If next line after queryEnd starts with '.method', append ')' to queryEnd line
          if (queryEnd + 1 < lines.length && lines[queryEnd + 1].trim().match(/^\.[a-z]/)) {
            // Add ')' to end of queryEnd line if not already there
            if (!lines[queryEnd].includes(')')) {
              // Replace trailing '}' with '})'
              lines[queryEnd] = lines[queryEnd].replace(/\}\s*$/, '})');
            }
          }
        }
      }
    }

    // Step 3: Re-indent lines starting with '.' at column 0 (the dedent issue)
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].match(/^\s*\.[a-z]/)) {
        // Find the previous function body's indentation
        let indent = '    ';
        for (let j = i - 1; j >= 0; j--) {
          const m = lines[j].match(/^(\s+)\S/);
          if (m && lines[j].trim().length > 0) {
            indent = m[1] + '  ';
            break;
          }
        }
        const trimmed = lines[i].trim();
        if (trimmed.startsWith('.') && !lines[i].startsWith(indent + '.')) {
          lines[i] = indent + trimmed;
        }
      }
    }
    c = lines.join('\n');

    if (c !== before) {
      writeFileSync(f, c, 'utf8');
      totalFixed++;
      console.log('Fixed: ' + f);
    }
  } catch (err) { console.log('Err: ' + f + ': ' + err.message); }
}
console.log('Total fixed: ' + totalFixed);