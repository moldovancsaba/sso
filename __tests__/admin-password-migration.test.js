import { isBcryptHash, hashAdminPassword, verifyAdminPassword } from '../lib/users.mjs'

describe('admin password hashing migration', () => {
  test('hashAdminPassword produces a value isBcryptHash recognizes', async () => {
    const hashed = await hashAdminPassword('a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4')
    expect(isBcryptHash(hashed)).toBe(true)
  })

  test('isBcryptHash rejects a legacy 32-hex plaintext token', () => {
    expect(isBcryptHash('a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4')).toBe(false)
  })

  test('verifies correctly against a bcrypt-hashed password and does not flag it for rehash', async () => {
    const plaintext = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4'
    const hashed = await hashAdminPassword(plaintext)

    const correct = await verifyAdminPassword(hashed, plaintext)
    expect(correct.valid).toBe(true)
    expect(correct.needsRehash).toBe(false)

    const wrong = await verifyAdminPassword(hashed, 'wrong-password')
    expect(wrong.valid).toBe(false)
    expect(wrong.needsRehash).toBe(false)
  })

  // The migration case: an existing admin whose password was never hashed yet.
  test('verifies correctly against a legacy plaintext token and flags it for rehash', async () => {
    const legacyToken = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4'

    const correct = await verifyAdminPassword(legacyToken, legacyToken)
    expect(correct.valid).toBe(true)
    expect(correct.needsRehash).toBe(true)

    const wrong = await verifyAdminPassword(legacyToken, 'different-token-aaaaaaaaaaaaaaaaa')
    expect(wrong.valid).toBe(false)
    expect(wrong.needsRehash).toBe(false)
  })

  test('rejects non-string inputs without throwing', async () => {
    const result = await verifyAdminPassword(undefined, 'anything')
    expect(result.valid).toBe(false)
    expect(result.needsRehash).toBe(false)
  })
})
