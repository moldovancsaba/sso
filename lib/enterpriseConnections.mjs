import { randomUUID } from 'crypto'
import { getDb } from './db.mjs'

function nowIso() {
  return new Date().toISOString()
}

function normalizeSlug(input) {
  return (input || '')
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
}

function normalizeDomains(domains) {
  if (!Array.isArray(domains)) return []

  const seen = new Set()
  const normalized = []
  for (const value of domains) {
    const domain = (value || '').toString().toLowerCase().trim()
    if (!domain || seen.has(domain)) continue
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) continue
    seen.add(domain)
    normalized.push(domain)
  }

  return normalized
}

function normalizeType(type) {
  return type === 'saml' ? 'saml' : 'oidc'
}

function normalizeStatus(status) {
  return ['draft', 'active', 'disabled'].includes(status) ? status : 'draft'
}

function sanitizeOptionalString(value) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed || null
}

function normalizeClaimMapping(mapping) {
  if (!mapping || typeof mapping !== 'object' || Array.isArray(mapping)) return {}

  const normalized = {}
  for (const [key, value] of Object.entries(mapping)) {
    if (typeof value === 'string' && value.trim()) {
      normalized[key] = value.trim()
    }
  }

  return normalized
}

function normalizeScim(scim = {}) {
  if (!scim || typeof scim !== 'object' || Array.isArray(scim)) {
    return {
      enabled: false,
      baseUrl: null,
      mode: 'manual',
      bearerTokenLastRotatedAt: null,
    }
  }

  return {
    enabled: scim.enabled === true,
    baseUrl: sanitizeOptionalString(scim.baseUrl),
    mode: scim.mode === 'push' ? 'push' : 'manual',
    bearerTokenLastRotatedAt: sanitizeOptionalString(scim.bearerTokenLastRotatedAt),
  }
}

function buildConnectionDocument(orgId, input = {}, previous = null) {
  const now = nowIso()
  const base = previous || {
    id: randomUUID(),
    orgId,
    createdAt: now,
  }

  return {
    ...base,
    orgId,
    name: sanitizeOptionalString(input.name) || previous?.name || null,
    slug: normalizeSlug(input.slug || input.name || previous?.slug || previous?.name),
    type: normalizeType(input.type || previous?.type),
    status: normalizeStatus(input.status || previous?.status),
    domains: Array.isArray(input.domains) ? normalizeDomains(input.domains) : (previous?.domains || []),
    discoveryUrl: sanitizeOptionalString(input.discoveryUrl) ?? previous?.discoveryUrl ?? null,
    issuer: sanitizeOptionalString(input.issuer) ?? previous?.issuer ?? null,
    authorizationEndpoint: sanitizeOptionalString(input.authorizationEndpoint) ?? previous?.authorizationEndpoint ?? null,
    tokenEndpoint: sanitizeOptionalString(input.tokenEndpoint) ?? previous?.tokenEndpoint ?? null,
    userInfoEndpoint: sanitizeOptionalString(input.userInfoEndpoint) ?? previous?.userInfoEndpoint ?? null,
    jwksUri: sanitizeOptionalString(input.jwksUri) ?? previous?.jwksUri ?? null,
    entityId: sanitizeOptionalString(input.entityId) ?? previous?.entityId ?? null,
    ssoUrl: sanitizeOptionalString(input.ssoUrl) ?? previous?.ssoUrl ?? null,
    certificate: sanitizeOptionalString(input.certificate) ?? previous?.certificate ?? null,
    claimMapping: Object.prototype.hasOwnProperty.call(input, 'claimMapping')
      ? normalizeClaimMapping(input.claimMapping)
      : (previous?.claimMapping || {}),
    scim: Object.prototype.hasOwnProperty.call(input, 'scim')
      ? normalizeScim(input.scim)
      : normalizeScim(previous?.scim),
    secretsConfigured: previous?.secretsConfigured === true ? true : false,
    updatedAt: now,
  }
}

export async function getEnterpriseConnectionsCollection() {
  const db = await getDb()
  const col = db.collection('enterpriseConnections')

  try { await col.createIndex({ id: 1 }, { unique: true }) } catch {}
  try { await col.createIndex({ orgId: 1, slug: 1 }, { unique: true, name: 'uniq_enterprise_connection_slug' }) } catch {}
  try { await col.createIndex({ orgId: 1, createdAt: -1 }) } catch {}

  return col
}

export async function listEnterpriseConnections(orgId) {
  const col = await getEnterpriseConnectionsCollection()
  return col.find({ orgId }).sort({ createdAt: -1 }).toArray()
}

export async function getEnterpriseConnection(orgId, id) {
  const col = await getEnterpriseConnectionsCollection()
  return col.findOne({ orgId, id })
}

export async function createEnterpriseConnection(orgId, input) {
  const col = await getEnterpriseConnectionsCollection()
  const doc = buildConnectionDocument(orgId, input)

  if (!doc.name) {
    throw new Error('Connection name is required')
  }

  await col.insertOne(doc)
  return doc
}

export async function updateEnterpriseConnection(orgId, id, patch) {
  const col = await getEnterpriseConnectionsCollection()
  const existing = await getEnterpriseConnection(orgId, id)
  if (!existing) return null

  const updated = buildConnectionDocument(orgId, patch, existing)
  await col.updateOne({ orgId, id }, { $set: updated })
  return getEnterpriseConnection(orgId, id)
}

export async function deleteEnterpriseConnection(orgId, id) {
  const col = await getEnterpriseConnectionsCollection()
  const result = await col.deleteOne({ orgId, id })
  return result.deletedCount === 1
}
