/** @type {import('jest').Config} */
module.exports = {
  // Use jest-expo preset for React Native + Expo
  preset: 'jest-expo',

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  // Transform files with babel (covers js, jsx, ts, tsx via babel-preset-expo
  // which supports the automatic JSX runtime — required because some
  // .tsx files in the project do not import React explicitly).
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },

  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  // Transform ignore patterns - critical for React Native + Expo
  transformIgnorePatterns: [
    'node_modules/(?!(' +
      '@react-native|' +
      '@react-native/.*|' +
      '@react-native-community/.*|' +
      'react-native|' +
      '@expo|' +
      'expo|' +
      'expo-.*|' +
      '@expo/.*|' +
      '@react-navigation|' +
      'react-native-.*|' +
      '@stripe/.*|' +
      'socket.io-client|' +
      'use-debounce|' +
      '@testing-library|' +
      '@sentry/.*|' +
      '@shopify/.*' +
    ')/)',
  ],

  // Path aliases matching tsconfig.json
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },

  // Coverage configuration
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    'services/**/*.{ts,tsx}',
    'hooks/**/*.{ts,tsx}',
    'contexts/**/*.{ts,tsx}',
    'utils/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/__tests__/**',
    '!**/__mocks__/**',
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      statements: 50,
      branches: 40,
      functions: 40,
      lines: 50,
    },
  },

  // Coverage reporters
  coverageReporters: ['text', 'lcov', 'html'],

  // Test match patterns
  testMatch: [
    '**/__tests__/**/*.(test|spec).(ts|tsx|js)',
    '**/*.(test|spec).(ts|tsx|js)',
  ],

  // Test environment
  testEnvironment: 'node',

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/android/',
    '/ios/',
    '/e2e/',
    '/tests\\.bak/',
  ],

  // Clear mocks between tests
  clearMocks: true,

  // Restore mocks between tests
  restoreMocks: true,

  // Verbose output
  verbose: true,

  // Test timeout
  testTimeout: 10000,

  // Run tests serially to avoid heap OOM with large test suites
  // (jest-expo's transformer + AsyncStorage mocks can push past 4GB on parallel)
  maxWorkers: 1,

  // Log heap usage to help diagnose future OOM issues
  logHeapUsage: true,
};
