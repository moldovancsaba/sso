/**
 * lib/users.mjs — MongoDB-backed user storage and helpers for admin authentication
 * WHAT: Provides CRUD helpers for Users collection (email+password admin model)
 * WHY: Reuses MessMass approach; enables DB-backed admin sessions with roles.
 */
import { ObjectId } from 'mongodb'
import { getDb } from './db.mjs'

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
  if (!ObjectId.isValid(id)) return null
  return col.findOne({ _id: new ObjectId(id) })
}

/**
 * createUser
 * Creates a new user with provided email, name, role, password (32-hex token).
 * WHY: We persist plaintext-like random tokens (MD5-style) per project convention.
 */
export async function createUser(user) {
  const col = await getUsersCollection()
  const now = new Date().toISOString() // ISO 8601 with milliseconds (UTC)
  const doc = {
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
 * updateUserPassword
 * Regenerates/sets a user's password and updates updatedAt timestamp.
 */
export async function updateUserPassword(id, password) {
  const col = await getUsersCollection()
  if (!ObjectId.isValid(id)) return null
  const now = new Date().toISOString()
  await col.updateOne({ _id: new ObjectId(id) }, { $set: { password, updatedAt: now } })
  return findUserById(id)
}

/**
 * updateUser
 * Updates name and/or role (role changes require super-admin at route level).
 */
export async function updateUser(id, fields) {
  const col = await getUsersCollection()
  if (!ObjectId.isValid(id)) return null
  const patch = {}
  if (typeof fields.name === 'string') patch.name = fields.name
  if (typeof fields.role === 'string' && USER_ROLES.includes(fields.role)) patch.role = fields.role
  if (!Object.keys(patch).length) return findUserById(id)
  patch.updatedAt = new Date().toISOString()
  await col.updateOne({ _id: new ObjectId(id) }, { $set: patch })
  return findUserById(id)
}

/**
 * deleteUser
 * Deletes a user by id.
 */
export async function deleteUser(id) {
  const col = await getUsersCollection()
  if (!ObjectId.isValid(id)) return false
  const res = await col.deleteOne({ _id: new ObjectId(id) })
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

