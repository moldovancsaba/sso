/**
 * lib/organizations.mjs — MongoDB helpers for organizations (UUID IDs)
 * WHAT: CRUD and normalization for organizations collection using UUIDs.
 * WHY: Introduce multi-tenant entities with consistent identifier strategy.
 */
import { getDb } from './db.mjs'
import { randomUUID } from 'crypto'

function nowIso() { return new Date().toISOString() }

export async function getOrganizationsCollection() {
  const db = await getDb()
  const col = db.collection('organizations')
  try { await col.createIndex({ id: 1 }, { unique: true }) } catch {}
  try { await col.createIndex({ slug: 1 }, { unique: true }) } catch {}
  try {
    await col.createIndex(
      { domains: 1 },
      { unique: true, name: 'uniq_domains', partialFilterExpression: { domains: { $exists: true, $type: 'array', $ne: [] } } }
    )
  } catch {}
  try { await col.createIndex({ createdAt: -1 }) } catch {}
  return col
}

export function normalizeSlug(input) {
  const s = (input || '').toString().toLowerCase().trim()
  return s
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function normalizeDomains(domains) {
  if (!Array.isArray(domains)) return []
  const seen = new Set()
  const out = []
  for (const dRaw of domains) {
    const d = (dRaw || '').toString().toLowerCase().trim()
    if (!d) continue
    if (seen.has(d)) continue
    // basic domain validation
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(d)) continue
    seen.add(d)
    out.push(d)
  }
  return out
}

export async function createOrganization({ name, slug, domains = [], status = 'active', plan }) {
  const col = await getOrganizationsCollection()
  const id = randomUUID()
  const now = nowIso()
  const doc = {
    id,
    name: (name || '').toString().trim(),
    slug: normalizeSlug(slug || name),
    domains: normalizeDomains(domains),
    status: status === 'suspended' ? 'suspended' : 'active',
    plan: plan || null,
    createdAt: now,
    updatedAt: now,
  }
  const res = await col.insertOne(doc)
  return { _id: res.insertedId, ...doc }
}

export async function listOrganizations() {
  const col = await getOrganizationsCollection()
  return col.find({}).sort({ createdAt: -1 }).toArray()
}

export async function getOrganizationById(id) {
  const col = await getOrganizationsCollection()
  return col.findOne({ id })
}

export async function updateOrganization(id, patchIn) {
  const col = await getOrganizationsCollection()
  const patch = {}
  if (typeof patchIn.name === 'string') patch.name = patchIn.name.trim()
  if (typeof patchIn.slug === 'string') patch.slug = normalizeSlug(patchIn.slug)
  if (Array.isArray(patchIn.domains)) patch.domains = normalizeDomains(patchIn.domains)
  if (typeof patchIn.status === 'string') patch.status = patchIn.status === 'suspended' ? 'suspended' : 'active'
  if (typeof patchIn.plan === 'string') patch.plan = patchIn.plan
  if (!Object.keys(patch).length) return getOrganizationById(id)
  patch.updatedAt = nowIso()
  await col.updateOne({ id }, { $set: patch })
  return getOrganizationById(id)
}

export async function deleteOrganization(id) {
  const col = await getOrganizationsCollection()
  const res = await col.deleteOne({ id })
  return res.deletedCount === 1
}
