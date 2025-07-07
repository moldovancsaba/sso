import { getCallbackUrl, getBaseUrl } from '../src/utils/url-config';
import { createMocks } from 'node-mocks-http';

describe('URL Configuration Tests', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Development Environment', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    test('handles different development ports', async () => {
      const ports = [3000, 3001, 3002];
      
      for (const port of ports) {
        const { req } = createMocks({
          method: 'GET',
          headers: {
            host: `localhost:${port}`,
          },
        });
        
        const baseUrl = getBaseUrl(req);
        expect(baseUrl).toBe(`http://localhost:${port}`);
        
        const callbackUrl = getCallbackUrl(req);
        expect(callbackUrl).toBe(`http://localhost:${port}/api/auth/callback`);
      }
    });

    test('handles invalid hosts', async () => {
      const { req } = createMocks({
        method: 'GET',
        headers: {
          host: undefined,
        },
      });

      expect(() => getBaseUrl(req)).toThrow('Invalid host configuration');
      expect(() => getCallbackUrl(req)).toThrow('Invalid host configuration');
    });
  });

  describe('Production Environment', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    test('respects SSO_BASE_URL in production', async () => {
      process.env.SSO_BASE_URL = 'https://sso.example.com';
      
      const { req } = createMocks({
        method: 'GET',
        headers: {
          host: 'sso.example.com',
        },
      });

      const baseUrl = getBaseUrl(req);
      expect(baseUrl).toBe('https://sso.example.com');
      
      const callbackUrl = getCallbackUrl(req);
      expect(callbackUrl).toBe('https://sso.example.com/api/auth/callback');
    });

    test('handles missing SSO_BASE_URL in production', async () => {
      delete process.env.SSO_BASE_URL;
      
      const { req } = createMocks({
        method: 'GET',
        headers: {
          host: 'sso.example.com',
        },
      });

      expect(() => getBaseUrl(req)).toThrow('SSO_BASE_URL is required in production');
      expect(() => getCallbackUrl(req)).toThrow('SSO_BASE_URL is required in production');
    });

    test('handles invalid SSO_BASE_URL in production', async () => {
      process.env.SSO_BASE_URL = 'invalid-url';
      
      const { req } = createMocks({
        method: 'GET',
        headers: {
          host: 'sso.example.com',
        },
      });

      expect(() => getBaseUrl(req)).toThrow('Invalid SSO_BASE_URL format');
      expect(() => getCallbackUrl(req)).toThrow('Invalid SSO_BASE_URL format');
    });
  });

  describe('Integration Tests', () => {
    test('OAuth flow with valid configuration', async () => {
      process.env.NODE_ENV = 'development';
      const { req } = createMocks({
        method: 'GET',
        headers: {
          host: 'localhost:3000',
        },
      });

      const baseUrl = getBaseUrl(req);
      const callbackUrl = getCallbackUrl(req);

      expect(baseUrl).toBe('http://localhost:3000');
      expect(callbackUrl).toBe('http://localhost:3000/api/auth/callback');
    });

    test('Session management with URL configuration', async () => {
      process.env.NODE_ENV = 'production';
      process.env.SSO_BASE_URL = 'https://sso.example.com';

      const { req } = createMocks({
        method: 'GET',
        headers: {
          host: 'sso.example.com',
        },
      });

      const baseUrl = getBaseUrl(req);
      const callbackUrl = getCallbackUrl(req);

      expect(baseUrl).toBe('https://sso.example.com');
      expect(callbackUrl).toBe('https://sso.example.com/api/auth/callback');
    });
  });
});
