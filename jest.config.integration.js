module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/integration/**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/cli.ts'
  ],
  maxWorkers: 1,  // Run tests sequentially
  testTimeout: 30000  // Integration tests may need more time
};