import { jest, afterAll } from '@jest/globals';
import { MongoClient } from 'mongodb';

// Configure Jest timeout
jest.setTimeout(30000);

// Set up mock implementations - avoiding jest.mock() during build
const mockRouter = {
  route: '/',
  pathname: '',
  query: '',
  asPath: '',
  push: jest.fn(),
  events: {
    on: jest.fn(),
    off: jest.fn()
  },
  beforePopState: jest.fn(() => null),
  prefetch: jest.fn(() => null)
};

const mockDatabase = {
  Database: {
    getInstance: () => Promise.resolve({
      createOrUpdateUser: () => Promise.resolve({
        id: 'mock-user-id',
        identifier: 'test-user',
        email: null,
        createdAt: '2025-07-07T14:40:11.000Z',
        lastLoginAt: '2025-07-07T14:40:11.000Z'
      })
    })
  }
};

// Export mocks for use in tests
export { mockRouter, mockDatabase };

// Set test environment variables
process.env.JWT_SECRET = 'test-secret-key'
process.env.SSO_BASE_URL = 'http://localhost:3000'
process.env.NEXTAUTH_URL = 'http://localhost:3000'
process.env.MONGODB_URI = 'mongodb+srv://moldovancsaba:togwa1-xyhcEp-mozceb@mongodb-thanperfect.zf2o0ix.mongodb.net/?retryWrites=true&w=majority&appName=mongodb-thanperfect'
jest.setTimeout(30000)

// Clean up after all tests
afterAll(async () => {
  try {
    const client = await MongoClient.connect(process.env.MONGODB_URI!)
    const db = client.db('sso_test')
    await db.dropDatabase()
    await client.close()
  } catch (error) {
    console.error('Failed to clean up test database:', error)
  }
})

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '',
      query: '',
      asPath: '',
      push: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn()
      },
      beforePopState: jest.fn(() => null),
      prefetch: jest.fn(() => null)
    }
  },
}))

// Set longer timeout for async operations
jest.setTimeout(10000)

// Clean up database after tests
afterAll(async () => {
  const client = await MongoClient.connect(process.env.MONGODB_URI!)
  const db = client.db('sso_test')
  await db.dropDatabase()
  await client.close()
})
