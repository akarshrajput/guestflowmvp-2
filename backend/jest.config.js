module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['./test/setup.js'],
  testMatch: ['**/test/**/*.test.js'],
  collectCoverage: false,
  coverageDirectory: 'coverage',
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/test/'
  ],
  testPathIgnorePatterns: ['/node_modules/'],
  verbose: true,
  detectOpenHandles: true,
  forceExit: true,
  testTimeout: 30000
};
