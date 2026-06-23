// Standalone jest config for middleware unit tests that don't need
// MongoMemoryServer / Redis / BullMQ. Skips the heavy global setup.
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['<rootDir>/src/__tests__/sharedTypesValidator.test.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { isolatedModules: true }],
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  testTimeout: 10000,
  forceExit: true,
  maxWorkers: 1,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
};
