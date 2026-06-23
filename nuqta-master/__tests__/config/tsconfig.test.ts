import * as fs from 'fs';
import * as path from 'path';

const tsconfigPath = path.resolve(__dirname, '..', '..', 'tsconfig.json');

describe('tsconfig.json structure', () => {
  let tsconfig: any;
  let raw: string;
  let exists: boolean;

  beforeAll(() => {
    exists = fs.existsSync(tsconfigPath);
    if (exists) {
      raw = fs.readFileSync(tsconfigPath, 'utf-8');
      tsconfig = JSON.parse(raw);
    }
  });

  test('1. File exists and parses as JSON', () => {
    expect(exists).toBe(true);
    expect(() => JSON.parse(raw)).not.toThrow();
    expect(tsconfig).toBeDefined();
    expect(typeof tsconfig).toBe('object');
  });

  test('2. extends is "expo/tsconfig.base.json" (NOT "expo/tsconfig.base")', () => {
    expect(tsconfig.extends).toBe('expo/tsconfig.base.json');
    expect(tsconfig.extends).not.toBe('expo/tsconfig.base');
  });

  test('3. compilerOptions.strict is true', () => {
    expect(tsconfig.compilerOptions).toBeDefined();
    expect(tsconfig.compilerOptions.strict).toBe(true);
  });

  test('4. compilerOptions.noEmit is true', () => {
    expect(tsconfig.compilerOptions.noEmit).toBe(true);
  });

  test('5. paths["@/*"] includes "./*"', () => {
    expect(tsconfig.compilerOptions.paths).toBeDefined();
    expect(tsconfig.compilerOptions.paths['@/*']).toBeDefined();
    expect(tsconfig.compilerOptions.paths['@/*']).toContain('./*');
  });

  test('6. exclude includes "__tests__" and "**/*.test.tsx"', () => {
    expect(Array.isArray(tsconfig.exclude)).toBe(true);
    expect(tsconfig.exclude).toContain('__tests__');
    expect(tsconfig.exclude).toContain('**/*.test.tsx');
  });

  test('7. include covers "components" and "app"', () => {
    expect(Array.isArray(tsconfig.include)).toBe(true);
    expect(tsconfig.include).toContain('components');
    expect(tsconfig.include).toContain('app');
  });
});