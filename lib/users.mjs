/**
 * lib/users.mjs — MongoDB-backed user storage and helpers for admin authentication
 * WHAT: Provides CRUD helpers for Users collection (email+password admin model)
 * WHY: Reuses MessMass approach; enables DB-backed admin sessions with roles.
 */
import bcrypt from 'bcryptjs'
import { ObjectId } from 'mongodb'
import { getDb } from './db.mjs'
import { randomUUID, timingSafeEqual } from 'crypto'

export const USER_ROLES = ['admin']

const SALT_ROUNDS = 12
const BCRYPT_HASH_PATTERN = /^\$2[aby]\$\d{2}\$/

/**
 * isBcryptHash
 * WHAT: Detects whether a stored password value is already a bcrypt hash.
 * WHY: Admin passwords are mid-migration from plaintext 32-hex tokens to bcrypt — this lets
 *      verifyAdminPassword support both formats during the transition.
 */
export function isBcryptHash(value) {
  return typeof value === 'string' && BCRYPT_HASH_PATTERN.test(value)
}

/**
 * hashAdminPassword
 * WHAT: Hashes an admin password/token for storage.
 */
export async function hashAdminPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS)
}

function constantTimeStringEqual(a, b) {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

/**
 * verifyAdminPassword
 * WHAT: Verifies a provided password against a stored admin password value, which may be
 *       either a bcrypt hash (current format) or a legacy plaintext 32-hex token.
 * WHY: Existing admin users have plaintext-stored passwords from before this migration; they
 *      can't be retroactively hashed without knowing the plaintext (that's the point of
 *      hashing), so both formats are supported here, with needsRehash signaling that a
 *      successful legacy-format match should be upgraded to bcrypt by the caller.
 * @returns {Promise<{valid: boolean, needsRehash: boolean}>}
 */
export async function verifyAdminPassword(storedValue, providedPassword) {
  if (typeof storedValue !== 'string' || typeof providedPassword !== 'string') {
    return { valid: false, needsRehash: false }
  }

  if (isBcryptHash(storedValue)) {
    const valid = await bcrypt.compare(providedPassword, storedValue)
    return { valid, needsRehash: false }
  }

  // Legacy plaintext-token format — constant-time compare, and flag a match for rehashing.
  const valid = constantTimeStringEqual(storedValue, providedPassword)
  return { valid, needsRehash: valid }
}

export function normalizeAdminRole(role) {
  if (typeof role !== 'string') return 'admin'
  const normalized = role.trim().toLowerCase()
  if (normalized === 'super-admin') return 'admin'
  return normalized === 'admin' ? 'admin' : 'admin'
}

/**
 * getUsersCollection
 * Returns the MongoDB collection handle for users, ensuring indexes exist.
 */
export async function getUsersCollection() {
  const db = await getDb()
  const col = db.collection('users')
  try {
    await col.createIndex({ email: 1 }, { unique: true })
  } catch {
    // ignore if exists
  }
  try {
    // Ensure a unique index on application-level UUID 'id'. Sparse to allow legacy docs without 'id'.
    await col.createIndex({ id: 1 }, { unique: true, sparse: true })
  } catch {
    // ignore if exists
  }
  return col
}

/**
 * findUserByEmail
 * Finds a user by lowercased email.
 */
export async function findUserByEmail(email) {
  const col = await getUsersCollection()
  const user = await col.findOne({ email: (email || '').toLowerCase() })
  return user ? { ...user, role: normalizeAdminRole(user.role) } : null
}

/**
 * findUserById
 * Finds a user by ObjectId string.
 */
export async function findUserById(id) {
  const col = await getUsersCollection()
  if (!id) return null
  // Prefer application-level UUID stored as 'id'
  const byUuid = await col.findOne({ id })
  if (byUuid) return { ...byUuid, role: normalizeAdminRole(byUuid.role) }
  // Fallback to legacy ObjectId-based lookup for backward compatibility
  if (ObjectId.isValid(id)) {
    const byObjectId = await col.findOne({ _id: new ObjectId(id) })
    if (byObjectId) return { ...byObjectId, role: normalizeAdminRole(byObjectId.role) }
  }
  return null
}

/**
 * createUser
 * Creates a new user with provided email, name, role, password (32-hex token).
 * WHY: The token itself (user.password, as passed in) is still a random 32-hex value by
 *      convention — this just bcrypt-hashes it before storage, matching lib/publicUsers.mjs
 *      and lib/oauth/clients.mjs. Callers already keep their own copy of the plaintext token
 *      to return to the caller/display once; the DB never stores it in plaintext.
 */
export async function createUser(user) {
  const col = await getUsersCollection()
  const now = new Date().toISOString() // ISO 8601 with milliseconds (UTC)
  const id = randomUUID()
  const doc = {
    id, // Application-level UUID identifier used everywhere externally
    email: (user.email || '').toLowerCase(),
    name: user.name || '',
    role: normalizeAdminRole(user.role),
    password: await hashAdminPassword(user.password),
    createdAt: user.createdAt || now,
    updatedAt: user.updatedAt || now,
  }
  const res = await col.insertOne(doc)
  return { _id: res.insertedId, ...doc }
}

/**
 * ensureUserUuid
 * Adds a UUID 'id' field to an existing user document if missing.
 * WHAT: Guarantees that legacy documents gain a stable UUID without changing Mongo _id.
 * WHY: Enables UUID-based identification everywhere while preserving backward compatibility.
 */
export async function ensureUserUuid(user) {
  if (!user) return null
  if (typeof user.id === 'string' && user.id.length >= 8) return user
  const col = await getUsersCollection()
  const now = new Date().toISOString()
  const id = randomUUID()
  await col.updateOne({ _id: user._id }, { $set: { id, updatedAt: now } })
  return { ...user, id, updatedAt: now }
}

/**
 * updateUserPassword
 * Regenerates/sets a user's password and updates updatedAt timestamp.
 * WHY: password is bcrypt-hashed before storage — see createUser.
 */
export async function updateUserPassword(id, password) {
  const col = await getUsersCollection()
  const now = new Date().toISOString()
  const hashedPassword = await hashAdminPassword(password)
  // Prefer uuid-based update; fallback to legacy ObjectId
  const or = [{ id }]
  if (ObjectId.isValid(id)) or.push({ _id: new ObjectId(id) })
  await col.updateOne({ $or: or }, { $set: { password: hashedPassword, updatedAt: now } })
  return findUserById(id)
}

/**
 * updateUser
 * Updates name and/or role (role changes require admin at route level).
 */
export async function updateUser(id, fields) {
  const col = await getUsersCollection()
  const patch = {}
  if (typeof fields.name === 'string') patch.name = fields.name
  if (typeof fields.role === 'string') patch.role = normalizeAdminRole(fields.role)
  if (!Object.keys(patch).length) return findUserById(id)
  patch.updatedAt = new Date().toISOString()
  const or = [{ id }]
  if (ObjectId.isValid(id)) or.push({ _id: new ObjectId(id) })
  await col.updateOne({ $or: or }, { $set: patch })
  return findUserById(id)
}

/**
 * deleteUser
 * Deletes a user by id.
 */
export async function deleteUser(id) {
  const col = await getUsersCollection()
  const or = [{ id }]
  if (ObjectId.isValid(id)) or.push({ _id: new ObjectId(id) })
  const res = await col.deleteOne({ $or: or })
  return res.deletedCount === 1
}

/**
 * listUsers
 * Lists users for admin UI.
 */
export async function listUsers() {
  const col = await getUsersCollection()
  const docs = await col.find({}).sort({ createdAt: -1 }).toArray()
  return docs.map((doc) => ({ ...doc, role: normalizeAdminRole(doc.role) }))
}
