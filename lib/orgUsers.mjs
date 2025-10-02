/**
 * lib/orgUsers.mjs — MongoDB helpers for organization-scoped users (UUID IDs)
 * WHAT: CRUD operations for orgUsers with UUIDs and compound uniqueness.
 * WHY: Support tenant users separate from global admin users.
 */
import { getDb } from './db.mjs'
import { randomUUID } from 'crypto'
import { generateMD5StylePassword } from './resourcePasswords.mjs'

function nowIso() { return new Date().toISOString() }

export async function getOrgUsersCollection() {
  const db = await getDb()
  const col = db.collection('orgUsers')
  try { await col.createIndex({ id: 1 }, { unique: true }) } catch {}
  try { await col.createIndex({ orgId: 1, email: 1 }, { unique: true, name: 'uniq_org_email' }) } catch {}
  try { await col.createIndex({ orgId: 1, createdAt: -1 }) } catch {}
  return col
}

export function normalizeEmail(email) {
  return (email || '').toString().toLowerCase().trim()
}

export async function createOrgUser(orgId, { email, name, role = 'member', password, status = 'active' }) {
  const col = await getOrgUsersCollection()
  const id = randomUUID()
  const now = nowIso()
  const doc = {
    id,
    orgId, // UUID of organization
    email: normalizeEmail(email),
    name: (name || '').toString(),
    role: role === 'org-admin' ? 'org-admin' : 'member',
    password: password || generateMD5StylePassword(),
    status: ['active','invited','disabled'].includes(status) ? status : 'active',
    createdAt: now,
    updatedAt: now,
  }
  const res = await col.insertOne(doc)
  return { _id: res.insertedId, ...doc }
}

export async function listOrgUsers(orgId) {
  const col = await getOrgUsersCollection()
  return col.find({ orgId }).sort({ createdAt: -1 }).toArray()
}

export async function getOrgUser(orgId, id) {
  const col = await getOrgUsersCollection()
  return col.findOne({ orgId, id })
}

export async function updateOrgUser(orgId, id, patchIn) {
  const col = await getOrgUsersCollection()
  const patch = {}
  if (typeof patchIn.name === 'string') patch.name = patchIn.name
  if (typeof patchIn.role === 'string') patch.role = patchIn.role === 'org-admin' ? 'org-admin' : 'member'
  if (typeof patchIn.status === 'string') patch.status = ['active','invited','disabled'].includes(patchIn.status) ? patchIn.status : 'active'
  let newPassword = null
  if (Object.prototype.hasOwnProperty.call(patchIn, 'password')) {
    newPassword = patchIn.password || generateMD5StylePassword()
    patch.password = newPassword
  }
  if (!Object.keys(patch).length) return getOrgUser(orgId, id)
  patch.updatedAt = nowIso()
  await col.updateOne({ orgId, id }, { $set: patch })
  const updated = await getOrgUser(orgId, id)
  return { user: updated, password: newPassword }
}

export async function deleteOrgUser(orgId, id) {
  const col = await getOrgUsersCollection()
  const res = await col.deleteOne({ orgId, id })
  return res.deletedCount === 1
}
