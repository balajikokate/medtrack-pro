module.exports = {
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  setupFiles: ['<rootDir>/tests/setupEnv.js'],
  globalSetup: '<rootDir>/tests/globalSetup.js',
  globalTeardown: '<rootDir>/tests/globalTeardown.js',
  // All test files share one isolated Postgres schema over the network (Neon) —
  // run serially so they don't race each other's resetDb() calls.
  maxWorkers: 1,
  testTimeout: 20000,
  verbose: true,
};
