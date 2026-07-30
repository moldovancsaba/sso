import { jest } from '@jest/globals'
import { createHash } from 'crypto'

const sessions = []
const users = []

jest.unstable_mockModule('../lib/db.mjs', () => ({
  getDb: async () => ({
    collection(name) {
      if (name === 'adminSessions') {
        return {
          async createIndex() {},
          async findOne(query) {
            return sessions.find((s) => s.tokenHash === query.tokenHash) || null
          },
          updateOne() {
            return Promise.resolve()
          },
        }
      }
      if (name === 'users') {
        return {
          async createIndex() {},
          async findOne(query) {
            if (query.id) return users.find((u) => u.id === query.id) || null
            return null
          },
        }
      }
      throw new Error(`Unexpected collection: ${name}`)
    },
  }),
}))

const { getAdminUser } = await import('../lib/auth.mjs')

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex')
}

function futureIso(ms = 60_000) {
  return new Date(Date.now() + ms).toISOString()
}

describe('getAdminUser session identity binding', () => {
  beforeEach(() => {
    sessions.length = 0
    users.length = 0
  })

  test('resolves identity from the DB-verified session owner, not a client-supplied cookie userId', async () => {
    const attackerToken = 'attacker-session-token'
    sessions.push({
      tokenHash: hashToken(attackerToken),
      userId: 'attacker-id',
      revokedAt: null,
      expiresAt: futureIso(),
    })
    users.push({ id: 'attacker-id', email: 'attacker@example.com', role: 'user' })
    users.push({ id: 'victim-admin-id', email: 'victim@example.com', role: 'admin' })

    // Attacker holds a real session for their own low-privilege account, but edits the
    // unsigned cookie envelope's userId field to point at a victim admin before sending it.
    const forgedCookieValue = Buffer.from(
      JSON.stringify({
        token: attackerToken,
        expiresAt: futureIso(),
        userId: 'victim-admin-id',
        role: 'admin',
      })
    ).toString('base64')

    const req = { headers: { cookie: `admin-session=${encodeURIComponent(forgedCookieValue)}` } }
    const result = await getAdminUser(req)

    expect(result).not.toBeNull()
    expect(result.id).toBe('attacker-id')
    expect(result.email).toBe('attacker@example.com')
  })

  test('still resolves the correct user for a legitimate, unmodified session cookie', async () => {
    const token = 'legit-session-token'
    sessions.push({
      tokenHash: hashToken(token),
      userId: 'real-admin-id',
      revokedAt: null,
      expiresAt: futureIso(),
    })
    users.push({ id: 'real-admin-id', email: 'admin@example.com', role: 'admin' })

    const cookieValue = Buffer.from(
      JSON.stringify({
        token,
        expiresAt: futureIso(),
        userId: 'real-admin-id',
        role: 'admin',
      })
    ).toString('base64')

    const req = { headers: { cookie: `admin-session=${encodeURIComponent(cookieValue)}` } }
    const result = await getAdminUser(req)

    expect(result).not.toBeNull()
    expect(result.id).toBe('real-admin-id')
    expect(result.email).toBe('admin@example.com')
    expect(result.role).toBe('admin')
  })

  test('returns null when the session token itself is not valid, regardless of cookie userId', async () => {
    const cookieValue = Buffer.from(
      JSON.stringify({
        token: 'never-issued-token',
        expiresAt: futureIso(),
        userId: 'victim-admin-id',
        role: 'admin',
      })
    ).toString('base64')

    const req = { headers: { cookie: `admin-session=${encodeURIComponent(cookieValue)}` } }
    const result = await getAdminUser(req)

    expect(result).toBeNull()
  })
})
