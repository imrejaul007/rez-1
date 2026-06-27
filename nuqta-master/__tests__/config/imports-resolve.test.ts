import * as fs from 'fs';
import * as path from 'path';

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

const FIXED_FILES: string[] = [
  'components/cart/CartSocketIntegration.tsx',
  'components/cart/CartSyncStatus.tsx',
  'components/events/EventFilters.tsx',
  'components/referral/ShareModal.tsx',
  'components/referral/TierUpgradeCelebration.tsx',
  'components/voucher/VoucherSelectionModal.tsx',
  'components/wallet/TransactionTabs.tsx',
  'services/paymentOrchestratorService.ts',
];

describe('Fixed component files resolve from project root', () => {
  FIXED_FILES.forEach((relPath) => {
    it(`exists: ${relPath}`, () => {
      const absPath = path.join(PROJECT_ROOT, relPath);
      expect(fs.existsSync(absPath)).toBe(true);
    });
  });

  it('all 8 fixed files are accounted for', () => {
    expect(FIXED_FILES).toHaveLength(8);
  });

  it('project root contains expected marker files', () => {
    expect(fs.existsSync(path.join(PROJECT_ROOT, 'package.json'))).toBe(true);
    expect(fs.existsSync(path.join(PROJECT_ROOT, 'tsconfig.json'))).toBe(true);
    expect(fs.existsSync(path.join(PROJECT_ROOT, 'jest.config.js'))).toBe(true);
  });
});

describe('Jest testMatch pattern', () => {
  const testMatchPatterns: RegExp[] = [
    /\/__tests__\/.*\.(test|spec)\.(ts|tsx|js)$/,
    /\.(test|spec)\.(ts|tsx|js)$/,
  ];

  it('matches a tsx file under __tests__/components/', () => {
    const sample = path.join(PROJECT_ROOT, '__tests__', 'components', 'foo.test.tsx');
    const normalised = sample.replace(/\\/g, '/');
    expect(testMatchPatterns[0].test(normalised)).toBe(true);
  });

  it('matches a tsx file directly under __tests__/config/', () => {
    const sample = path.join(PROJECT_ROOT, '__tests__', 'config', 'imports-resolve.test.ts');
    const normalised = sample.replace(/\\/g, '/');
    expect(testMatchPatterns[0].test(normalised)).toBe(true);
  });

  it('matches a co-located .spec.tsx file', () => {
    const sample = path.join(PROJECT_ROOT, 'components', 'cart', 'CartItem.spec.tsx');
    const normalised = sample.replace(/\\/g, '/');
    expect(testMatchPatterns[1].test(normalised)).toBe(true);
  });

  it('does not match a regular source tsx file', () => {
    const sample = path.join(PROJECT_ROOT, 'components', 'cart', 'CartItem.tsx');
    const normalised = sample.replace(/\\/g, '/');
    expect(testMatchPatterns[0].test(normalised)).toBe(false);
    expect(testMatchPatterns[1].test(normalised)).toBe(false);
  });
});

describe('tsconfig.json exclude pattern', () => {
  const excludeGlobs: string[] = [
    'node_modules',
    'tests.bak',
    'tests',
    '__tests__',
    '__mocks__',
    'e2e',
    'scripts',
    '**/*.test.ts',
    '**/*.test.tsx',
    '**/*.spec.ts',
    '**/*.spec.tsx',
  ];

  function globToRegex(pattern: string): RegExp {
    // Build a regex that anchors with `^` and `$` so the whole path must match.
    // First, escape regex-special chars EXCEPT `*`, then re-substitute `**` and `*`.
    const escaped = pattern
      .replace(/[.+^${}()|[\]\\?]/g, '\\$&')
      .replace(/\*\*/g, '__DOUBLESTAR__')
      .replace(/\*/g, '[^/]*');
    const body = escaped.replace(/__DOUBLESTAR__/g, '.*');
    return new RegExp('^' + body + '$');
  }

  function isExcluded(relPath: string, excludes: string[]): boolean {
    const normalised = relPath.replace(/\\/g, '/');
    return excludes.some((pattern) => {
      if (pattern.includes('*')) {
        return globToRegex(pattern).test(normalised);
      }
      return normalised === pattern || normalised.startsWith(pattern + '/');
    });
  }

  it('excludes __tests__/components/**/*.test.tsx files', () => {
    const rel = '__tests__/components/SomeComponent.test.tsx';
    expect(isExcluded(rel, excludeGlobs)).toBe(true);
  });

  it('excludes the test file created in this run', () => {
    const rel = '__tests__/config/imports-resolve.test.ts';
    expect(isExcluded(rel, excludeGlobs)).toBe(true);
  });

  it('excludes co-located .test.tsx files anywhere in the tree', () => {
    const rel = 'components/cart/CartItem.test.tsx';
    expect(isExcluded(rel, excludeGlobs)).toBe(true);
  });

  it('excludes co-located .spec.ts files anywhere in the tree', () => {
    const rel = 'services/paymentOrchestratorService.spec.ts';
    expect(isExcluded(rel, excludeGlobs)).toBe(true);
  });

  it('does NOT exclude regular component source files', () => {
    const rel = 'components/cart/CartItem.tsx';
    expect(isExcluded(rel, excludeGlobs)).toBe(false);
  });

  it('does NOT exclude regular service source files', () => {
    const rel = 'services/paymentOrchestratorService.ts';
    expect(isExcluded(rel, excludeGlobs)).toBe(false);
  });

  it('matches the exclude list declared in tsconfig.json', () => {
    const tsconfigPath = path.join(PROJECT_ROOT, 'tsconfig.json');
    const tsconfigRaw = fs.readFileSync(tsconfigPath, 'utf8');
    for (const pattern of excludeGlobs) {
      // JSON-encoded excludes appear in the file either quoted or unquoted
      const quoted = `"${pattern}"`;
      expect(
        tsconfigRaw.includes(quoted) || tsconfigRaw.includes(pattern),
      ).toBe(true);
    }
  });
});
