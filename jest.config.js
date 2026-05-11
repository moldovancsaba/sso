export default {
  testEnvironment: 'node',
  transform: {},
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  testMatch: ['**/?(*.)+(spec|test).js'],
  testPathIgnorePatterns: ['/node_modules/', '/tests/'],
};
