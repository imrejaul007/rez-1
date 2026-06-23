// Copy new files from rez-backend (source) to rez-backend-master (target),
// preserving relative directory structure. Skips excluded paths.

import { promises as fs } from 'fs';
import path from 'path';

const ROOT = 'C:/Users/user/Downloads/rez-backend-master';
const SRC_PREFIX = path.join(ROOT, 'rez-backend') + path.sep;          // .../rez-backend/
const TGT_PREFIX = path.join(ROOT, 'rez-backend-master') + path.sep;   // .../rez-backend-master/

const json = JSON.parse(await fs.readFile(path.join(ROOT, 'PHASE1_NEW_FILES.json'), 'utf8'));
const files = json.newFiles;

// Build a path on the source side using forward slashes (input uses forward slashes).
const norm = (p) => p.replace(/\\/g, '/');

// Exclusion rules (against the path inside rez-backend/, forward-slash form)
const EXCLUDE_PATTERNS = [
  /(^|\/)node_modules(\/|$)/,
  /(^|\/)dist(\/|$)/,
  /(^|\/)coverage(\/|$)/,
  /(^|\/)\.git(\/|$)/,
  /(^|\/)\.husky(\/|$)/,
  /(^|\/)\.claude-flow(\/|$)/,
  /(^|\/)\.claude(\/|$)/,
];
const EXCLUDE_BASENAMES = [
  /package-lock\.json$/,
];

const ENV_BASENAMES = [
  /^\.env$/,
  /^\.env\.production$/,
  /^\.env\.local$/,
  /^\.env\.development$/,
  /^\.env\.staging$/,
];
const ENV_ALLOWED = [
  /^\.env\.example$/,
  /^\.env\.production\.example$/,
  /^\.env\.test\.example$/,
  /^\.env\.example\.local$/,
];

function isExcluded(rel) {
  for (const r of EXCLUDE_PATTERNS) if (r.test(rel)) return 'pattern';
  const base = path.posix.basename(rel);
  for (const r of EXCLUDE_BASENAMES) if (r.test(base)) return 'lockfile';
  for (const r of ENV_BASENAMES) if (r.test(base)) return 'env';
  return null;
}

const stats = {
  attempted: files.length,
  copied: 0,
  skipped_excluded: 0,
  skipped_existed: 0,
  skipped_env: 0,
  errors: 0,
  excluded_breakdown: { pattern: 0, lockfile: 0, env: 0 },
  existed_paths: [],
  error_paths: [],
  excluded_paths_sample: [],
};

const mkdirSafe = async (dir) => {
  await fs.mkdir(dir, { recursive: true });
};

for (const absSrc of files) {
  const src = norm(absSrc);
  if (!src.startsWith(SRC_PREFIX.replace(/\\/g, '/'))) {
    stats.errors++;
    stats.error_paths.push({ src, reason: 'outside source prefix' });
    continue;
  }
  const rel = src.slice(SRC_PREFIX.length); // path under rez-backend/
  const reason = isExcluded(rel);
  if (reason) {
    stats.skipped_excluded++;
    if (reason === 'env') stats.skipped_env++;
    stats.excluded_breakdown[reason]++;
    if (stats.excluded_paths_sample.length < 40) stats.excluded_paths_sample.push(rel);
    continue;
  }

  // Build target
  const tgt = path.join(TGT_PREFIX, rel);
  const tgtDir = path.dirname(tgt);
  try {
    await mkdirSafe(tgtDir);
    try {
      await fs.access(tgt);
      // Exists already — skip
      stats.skipped_existed++;
      stats.existed_paths.push(rel);
      continue;
    } catch (_) {
      // doesn't exist — proceed
    }
    await fs.copyFile(src, tgt);
    stats.copied++;
  } catch (e) {
    stats.errors++;
    stats.error_paths.push({ src, tgt, reason: e.message });
  }
}

const out = path.join(ROOT, '_copy_new_files_result.json');
await fs.writeFile(out, JSON.stringify(stats, null, 2));
console.log(JSON.stringify({
  attempted: stats.attempted,
  copied: stats.copied,
  skipped_excluded: stats.skipped_excluded,
  skipped_excluded_breakdown: stats.excluded_breakdown,
  skipped_env: stats.skipped_env,
  skipped_existed: stats.skipped_existed,
  errors: stats.errors,
}, null, 2));
console.log('Result written to', out);
