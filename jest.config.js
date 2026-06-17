module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^uuid$': '<rootDir>/tests/__mocks__/uuid.js',
  },
  // Allow transforming some ESM packages (e.g., uuid v13) by excluding them from transformIgnorePatterns
  transformIgnorePatterns: ['node_modules/(?!(uuid)/)'],
};
