export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^firebase-admin$': '<rootDir>/tests/helpers/firebase-admin-mock.ts',
    '^firebase-admin/.*$': '<rootDir>/tests/helpers/firebase-admin-mock.ts',
    '.*lib/firebase-admin\\.ts$': '<rootDir>/tests/helpers/firebase-admin-mock.ts',
    '.*lib/storage\\.ts$': '<rootDir>/tests/helpers/storage-mock.ts',
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^(\\.{1,2}/.*)\\.ts$': '$1'
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
  setupFilesAfterEnv: ['<rootDir>/tests/helpers/setup.ts'],
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/tests/',
    '/dist/',
    'jest.config.js',
    'drizzle.config.ts'
  ],
  maxWorkers: 1
};
