import '@testing-library/jest-dom';

// Reset environment variables before each test
beforeEach(() => {
  process.env = {
    ...process.env,
    NODE_ENV: 'test',
    SSO_BASE_URL: undefined,
  };
});
