/**
 * lib/users.mjs — MongoDB-backed user storage and helpers for admin authentication
 * WHAT: Provides CRUD helpers for Users collection (email+password admin model)
 * WHY: Reuses MessMass approach; enables DB-backed admin sessions with roles.
 */
import { ObjectId } from 'mongodb'
import { getDb } from './db.mjs'
import { randomUUID } from 'crypto'

export const USER_ROLES = ['admin', 'super-admin']

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
  return col.findOne({ email: (email || '').toLowerCase() })
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
  if (byUuid) return byUuid
  // Fallback to legacy ObjectId-based lookup for backward compatibility
  if (ObjectId.isValid(id)) {
    const byObjectId = await col.findOne({ _id: new ObjectId(id) })
    if (byObjectId) return byObjectId
  }
  return null
}

/**
 * createUser
 * Creates a new user with provided email, name, role, password (32-hex token).
 * WHY: We persist plaintext-like random tokens (MD5-style) per project convention.
 */
export async function createUser(user) {
  const col = await getUsersCollection()
  const now = new Date().toISOString() // ISO 8601 with milliseconds (UTC)
  const id = randomUUID()
  const doc = {
    id, // Application-level UUID identifier used everywhere externally
    email: (user.email || '').toLowerCase(),
    name: user.name || '',
    role: USER_ROLES.includes(user.role) ? user.role : 'admin',
    password: user.password, // 32-hex token
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
 */
export async function updateUserPassword(id, password) {
  const col = await getUsersCollection()
  const now = new Date().toISOString()
  // Prefer uuid-based update; fallback to legacy ObjectId
  const or = [{ id }]
  if (ObjectId.isValid(id)) or.push({ _id: new ObjectId(id) })
  await col.updateOne({ $or: or }, { $set: { password, updatedAt: now } })
  return findUserById(id)
}

/**
 * updateUser
 * Updates name and/or role (role changes require super-admin at route level).
 */
export async function updateUser(id, fields) {
  const col = await getUsersCollection()
  const patch = {}
  if (typeof fields.name === 'string') patch.name = fields.name
  if (typeof fields.role === 'string' && USER_ROLES.includes(fields.role)) patch.role = fields.role
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
  return docs
}

