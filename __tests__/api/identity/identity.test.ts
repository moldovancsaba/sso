import { createMocks } from 'node-mocks-http'
import { Database } from '../../../lib/db/database'
import { IdentityManager } from '../../../lib/identity/manager'
import handler from '../../../pages/api/identity/create'

// Mock environment setup
process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'test-secret-key'

// Mock database and identity manager
jest.mock('../../../lib/db/database')
jest.mock('../../../lib/identity/manager')

describe('Identity Management', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  describe('Identity Generation', () => {
    it('generates random gametag in correct format', async () => {
      const identity = new IdentityManager()
      const generatedIdentity = await identity.generate()

      // Gametag format: word + 4 digits (e.g., "Stellar1234")
      expect(generatedIdentity.gametag).toMatch(/^[A-Z][a-z]+\d{4}$/)
    })

    it('uses only approved emojis', async () => {
      const identity = new IdentityManager()
      const generatedIdentity = await identity.generate()
      
      // Get approved emoji list from config
      const approvedEmojis = require('../../../config/approved-emojis.json')
      expect(approvedEmojis).toContain(generatedIdentity.emoji)
    })

    it('uses only approved colors', async () => {
      const identity = new IdentityManager()
      const generatedIdentity = await identity.generate()
      
      // Get approved colors from config
      const approvedColors = require('../../../config/approved-colors.json')
      expect(approvedColors).toContain(generatedIdentity.color)
    })

    it('creates timestamp in ISO 8601 format with milliseconds', async () => {
      const identity = new IdentityManager()
      const generatedIdentity = await identity.generate()
      
      // Format: YYYY-MM-DDTHH:MM:SS.sssZ
      expect(generatedIdentity.createdAt).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      )
    })
  })

  describe('User-Identity Linking', () => {
    it('creates fresh identity for new user', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          userId: 'new-user-123',
        },
      })

      await handler(req, res)
      
      expect(res._getStatusCode()).toBe(200)
      const data = JSON.parse(res._getData())
      expect(data.identity).toBeDefined()
      expect(data.isNewIdentity).toBe(true)
    })

    it('retrieves existing identity for returning user', async () => {
      // Mock existing identity
      const existingIdentity = {
        userId: 'existing-user-123',
        gametag: 'Cosmic1234',
        emoji: '🚀',
        color: '#FF5733',
        createdAt: '2023-12-25T12:34:56.789Z'
      }

      // Mock database to return existing identity
      jest.spyOn(Database.prototype, 'findIdentityByUserId')
        .mockResolvedValueOnce(existingIdentity)

      const { req, res } = createMocks({
        method: 'POST',
        body: {
          userId: 'existing-user-123',
        },
      })

      await handler(req, res)
      
      expect(res._getStatusCode()).toBe(200)
      const data = JSON.parse(res._getData())
      expect(data.identity).toEqual(existingIdentity)
      expect(data.isNewIdentity).toBe(false)
    })

    it('maintains identity persistence across multiple logins', async () => {
      const userId = 'persistence-test-user'
      const identity = new IdentityManager()
      
      // First login
      const firstLogin = await identity.getOrCreate(userId)
      
      // Second login
      const secondLogin = await identity.getOrCreate(userId)
      
      // Third login
      const thirdLogin = await identity.getOrCreate(userId)
      
      // All logins should return the same identity
      expect(secondLogin).toEqual(firstLogin)
      expect(thirdLogin).toEqual(firstLogin)
    })
  })

  describe('Authentication Flow', () => {
    it('returns complete profile data in auth response', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          userId: 'auth-test-user',
        },
      })

      await handler(req, res)
      
      expect(res._getStatusCode()).toBe(200)
      const data = JSON.parse(res._getData())
      
      // Verify all required profile fields are present
      expect(data.profile).toBeDefined()
      expect(data.profile.userId).toBeDefined()
      expect(data.profile.identity).toBeDefined()
      expect(data.profile.identity.gametag).toBeDefined()
      expect(data.profile.identity.emoji).toBeDefined()
      expect(data.profile.identity.color).toBeDefined()
      expect(data.profile.identity.createdAt).toBeDefined()
    })

    it('maintains identity consistency for same user across auth flows', async () => {
      const userId = 'consistency-test-user'
      const authManager = new AuthManager()
      
      // First authentication
      const firstAuth = await authManager.authenticate(userId)
      const firstIdentity = firstAuth.profile.identity
      
      // Second authentication
      const secondAuth = await authManager.authenticate(userId)
      const secondIdentity = secondAuth.profile.identity
      
      // Identities should be identical
      expect(secondIdentity).toEqual(firstIdentity)
      
      // Verify all identity components remain unchanged
      expect(secondIdentity.gametag).toBe(firstIdentity.gametag)
      expect(secondIdentity.emoji).toBe(firstIdentity.emoji)
      expect(secondIdentity.color).toBe(firstIdentity.color)
      expect(secondIdentity.createdAt).toBe(firstIdentity.createdAt)
    })
  })
})
