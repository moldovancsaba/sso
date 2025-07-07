import { createMocks } from 'node-mocks-http'
import handler from '../../../pages/api/auth/create'
import jwt from 'jsonwebtoken'
import { Database } from '../../../lib/db/database'

// Mock environment setup
process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'test-secret-key'
process.env.SSO_BASE_URL = 'http://localhost:3000'

// Mock database and middleware
jest.mock('../../../lib/db/database')
jest.mock('../../../lib/middleware/tenantAuth', () => ({
  validateTenant: (fn) => fn,
}))
jest.mock('../../../lib/middleware/rateLimit', () => ({
  rateLimit: (fn) => fn,
}))
jest.mock('../../../lib/middleware/requestLogger', () => ({
  requestLogger: (fn) => fn,
}))
jest.mock('../../../lib/middleware/compose', () => ({
  composeMiddleware: (...middleware) => (handler) => handler,
}))

describe('/api/auth/create', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Method validation', () => {
    it('returns 405 for non-POST requests', async () => {
      const { req, res } = createMocks({
        method: 'GET',
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(405)
      expect(JSON.parse(res._getData())).toEqual(
        expect.objectContaining({
          error: 'Method not allowed',
        })
      )
    })
  })

  describe('Input validation', () => {
    it('returns 400 for missing identifier', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {},
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(400)
      expect(JSON.parse(res._getData())).toEqual(
        expect.objectContaining({
          error: 'Identifier is required',
        })
      )
    })
  })

  describe('Token generation', () => {
    it('creates a valid JWT token with localhost URL', async () => {
      process.env.SSO_BASE_URL = 'http://localhost:3000';
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          identifier: 'test-user',
        },
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(200)
      const data = JSON.parse(res._getData())
      expect(data).toHaveProperty('token')

      const decoded = jwt.verify(data.token, process.env.JWT_SECRET || 'test-secret-key')
      expect(decoded).toHaveProperty('identifier', 'test-user')
      expect(decoded).toHaveProperty('iss', 'http://localhost:3000')
    })

    it('creates a valid JWT token with production URL', async () => {
      process.env.SSO_BASE_URL = 'https://sso.doneisbetter.com';
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          identifier: 'test-user',
        },
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(200)
      const data = JSON.parse(res._getData())
      expect(data).toHaveProperty('token')

      const decoded = jwt.verify(data.token, process.env.JWT_SECRET || 'test-secret-key')
      expect(decoded).toHaveProperty('identifier', 'test-user')
      expect(decoded).toHaveProperty('iss', 'https://sso.doneisbetter.com')
    })
  })

  describe('Error scenarios', () => {
    it('handles missing SSO_BASE_URL', async () => {
      delete process.env.SSO_BASE_URL;
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          identifier: 'test-user',
        },
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(500)
      expect(JSON.parse(res._getData())).toEqual(
        expect.objectContaining({
          error: 'SSO_BASE_URL is not configured',
        })
      )
    })

    it('handles invalid URL format', async () => {
      process.env.SSO_BASE_URL = 'invalid-url';
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          identifier: 'test-user',
        },
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(500)
      expect(JSON.parse(res._getData())).toEqual(
        expect.objectContaining({
          error: 'Invalid SSO_BASE_URL format',
        })
      )
    })

    it('handles network connectivity issues', async () => {
      // Mock Database.getInstance to throw a network error
      jest.spyOn(Database, 'getInstance').mockImplementationOnce(() => {
        throw new Error('Network error');
      });

      process.env.SSO_BASE_URL = 'http://localhost:3000';
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          identifier: 'test-user',
        },
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(500)
      expect(JSON.parse(res._getData())).toEqual(
        expect.objectContaining({
          error: 'Authentication service is unavailable',
        })
      )
    })
  })
})
