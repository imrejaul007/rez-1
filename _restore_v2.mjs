// _restore_v2.mjs — restore files from the iter 14 broken migration.
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

    // Remove all 'as unknown as X' that the script inserted
    // Pattern: ') as unknown as TYPE;' or ' as unknown as TYPE;'
    c = c.replace(/\)\s+as unknown as\s+[A-Za-z][A-Za-z0-9_ |.<>\[\]]*;?/g, ')');
    c = c.replace(/\s+as unknown as\s+[A-Za-z][A-Za-z0-9_ |.<>\[\]]*;?/g, '');

    // Fix the dedent issues: '  .sort' should not be at column 0
    // Look for lines that start with '.X' (no indent) and the previous line
    // has a function-call pattern
    const lines = c.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (i > 0) {
        const prev = lines[i - 1];
        const curr = lines[i].trim();
        // If current is '.method(' or '.method()' at column 0, indent it
        if (curr.match(/^\.[a-z]/)) {
          // Get indentation from prev line
          const m = prev.match(/^(\s+)/);
          if (m) {
            const indent = m[1] + '  ';
            lines[i] = indent + curr;
          }
        }
      }
    }
    c = lines.join('\n');

    if (c !== before) {
      writeFileSync(f, c, 'utf8');
      totalFixed++;
      console.log('Fixed: ' + f);
    }
  } catch (err) { console.log('Err: ' + f); }
}
console.log('Total fixed: ' + totalFixed);
