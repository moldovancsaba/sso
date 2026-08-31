const config = {
  testEnvironment: 'node',
  transform: {},
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  // Both .js and .mjs: with .js alone, an .mjs test file would silently never run
  // and the suite would still report green.
  testMatch: ['**/?(*.)+(spec|test).js', '**/?(*.)+(spec|test).mjs'],
  testPathIgnorePatterns: ['/node_modules/', '/tests/'],
};

export default config;
