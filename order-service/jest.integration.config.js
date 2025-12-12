module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'test',
  testRegex: '.*\\.integration\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    '../src/**/*.(t|j)s',
    '!../src/**/*.module.(t|j)s',
    '!../src/main.(t|j)s',
    '!../src/**/*.interface.(t|j)s',
    '!../src/**/*.dto.(t|j)s',
    '!../src/**/*.entity.(t|j)s',
  ],
  coverageDirectory: '../coverage-integration',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/../src/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@faker-js)/)',
  ],
  setupFilesAfterEnv: ['<rootDir>/setup-integration.ts'],
  testTimeout: 30000, // 30 seconds for database operations
};
