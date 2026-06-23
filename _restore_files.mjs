// _restore_files.mjs — restore files from the iter 14 broken migration.
// Strategy: for each affected file, find the .find({...}) patterns where
// the script inserted bad casts, and restore them.

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
];

let totalFixed = 0;
for (const f of files) {
  try {
    let c = readFileSync(f, 'utf8');
    const before = c;

    // Pattern 1: ".find({Y})\\n.sort" -> ".find({Y}).sort" (merge broken chain)
    c = c.replace(/\.find(?:One)?\(\{[^}]*\}\)\s*\n\s*\.([a-z])/g,
      (m) => m.replace(/\s*\n\s*\.([a-z])/, '.$1'));

    // Pattern 2: any remaining "as unknown as" inserted by the script
    // in the middle of a chain
    c = c.replace(/\)\s+as unknown as\s+[A-Za-z][A-Za-z0-9_ |.<>\[\]]*;?/g, ')');

    if (c !== before) {
      writeFileSync(f, c, 'utf8');
      totalFixed++;
      console.log('Fixed: ' + f);
    }
  } catch (err) { console.log('Err: ' + f + ': ' + err.message); }
}
console.log('Total: ' + totalFixed);
