/**
 * lib/appUsers.mjs
 *
 * WHAT: The users of one OAuth client, as SSO knows them - every account that consented to
 *       the client (`userConsents`) or holds a permission record for it (`appPermissions`),
 *       joined with the account itself for the email, the name and the account status.
 * WHY: A client's own admin screen has to show WHO can sign in to it before it can grant
 *      or withhold anything - and an app only learns about a user on that user's first
 *      sign-in, so a user who registered at SSO and consented, but has not returned, was
 *      invisible to the app's rights management. SSO is the one place that already holds
 *      the whole list. Pure over a `db` handle so the join is unit-testable without a
 *      cluster (the route hands it `getDb()`).
 *
 * The listing never returns a password hash, a social provider token or any other secret:
 * every read below is projected to the fields the DTO carries.
 */

import { normalizePermissionRecord } from './appPermissions.mjs'
import logger from './logger.mjs'

export const APP_USERS_DEFAULT_LIMIT = 50
export const APP_USERS_MAX_LIMIT = 200

// WHAT: The user-record fields the DTO carries, and nothing else.
// WHY: `publicUsers` documents hold the bcrypt hash and the social providers' profile
//      payloads; an inclusion projection is the only way a later field on the record
//      cannot leak through this listing by default.
const USER_PROJECTION = {
  _id: 0,
  id: 1,
  email: 1,
  name: 1,
  status: 1,
  emailVerified: 1,
  createdAt: 1,
  lastLoginAt: 1,
  'socialProviders.google.picture': 1,
  'socialProviders.facebook.picture': 1,
}

/**
 * Escape a search term for use inside a case-insensitive substring match.
 * WHY: the term reaches a RegExp; unescaped metacharacters would turn a search into a
 *      pattern (the same reason pages/api/admin/users/list-with-apps.js escapes its own).
 */
export function escapeSearchTerm(term) {
  return String(term).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function clampPage(value) {
  const n = Number.parseInt(value, 10)
  return Number.isFinite(n) && n > 0 ? n : 1
}

function clampLimit(value) {
  const n = Number.parseInt(value, 10)
  if (!Number.isFinite(n) || n <= 0) return APP_USERS_DEFAULT_LIMIT
  return Math.min(n, APP_USERS_MAX_LIMIT)
}

function toMillis(value) {
  const t = value ? new Date(value).getTime() : NaN
  return Number.isFinite(t) ? t : 0
}

export function mapAppUserToDTO(user, consent, permission) {
  return {
    id: user.id,
    email: user.email || null,
    name: user.name || null,
    status: user.status || 'active',
    emailVerified: Boolean(user.emailVerified),
    picture: user.socialProviders?.google?.picture || user.socialProviders?.facebook?.picture || null,
    createdAt: user.createdAt || null,
    lastLoginAt: user.lastLoginAt || null,
    consent: consent
      ? { scope: consent.scope || '', grantedAt: consent.granted_at || null }
      : null,
    permission: permission
      ? {
          role: permission.role,
          status: permission.status,
          hasAccess: Boolean(permission.hasAccess),
          requestedAt: permission.requestedAt || null,
          grantedAt: permission.grantedAt || null,
          lastAccessedAt: permission.lastAccessedAt || null,
        }
      : null,
  }
}

/**
 * List the users of one client.
 *
 * @param {import('mongodb').Db} db
 * @param {string} clientId
 * @param {{ search?: string, page?: number|string, limit?: number|string }} [options]
 * @returns {Promise<{ users: object[], total: number, page: number, pages: number, limit: number }>}
 */
export async function listAppUsers(db, clientId, options = {}) {
  const page = clampPage(options.page)
  const limit = clampLimit(options.limit)
  const search = typeof options.search === 'string' ? options.search.trim() : ''

  // WHAT: Every account SSO relates to this client - a live consent or a permission record.
  // WHY: A consent is written on the consent screen, a permission record by an access
  //      request or an admin grant; a user can hold either without the other, so the list
  //      is their union. A revoked consent no longer relates the user to the client.
  const consents = await db
    .collection('userConsents')
    .find({ client_id: clientId, revoked_at: null })
    .project({ _id: 0, user_id: 1, scope: 1, granted_at: 1 })
    .toArray()
  const permissions = (
    await db
      .collection('appPermissions')
      .find({ clientId })
      .project({ _id: 0, userId: 1, clientId: 1, appName: 1, role: 1, status: 1, hasAccess: 1, requestedAt: 1, grantedAt: 1, lastAccessedAt: 1 })
      .toArray()
  ).map(normalizePermissionRecord)

  const consentByUser = new Map(consents.map((c) => [c.user_id, c]))
  const permissionByUser = new Map(permissions.map((p) => [p.userId, p]))
  const userIds = [...new Set([...consentByUser.keys(), ...permissionByUser.keys()])].filter(Boolean)

  if (userIds.length === 0) {
    return { users: [], total: 0, page, pages: 0, limit }
  }

  // WHAT: The account behind each id - public accounts first, the admin store for the rest.
  // WHY: OAuth sign-ins are public accounts; permission records for an internal client can
  //      name an admin account. An id in neither store (an account deleted after it
  //      consented) is dropped, and counted, rather than shown as a row with no email.
  const publicUsers = await db
    .collection('publicUsers')
    .find({ id: { $in: userIds } })
    .project(USER_PROJECTION)
    .toArray()
  const found = new Set(publicUsers.map((u) => u.id))
  const missing = userIds.filter((id) => !found.has(id))
  const adminUsers = missing.length
    ? await db.collection('users').find({ id: { $in: missing } }).project(USER_PROJECTION).toArray()
    : []
  const accounts = [...publicUsers, ...adminUsers]
  const unresolved = userIds.length - accounts.length

  const pattern = search ? new RegExp(escapeSearchTerm(search), 'i') : null
  const rows = accounts
    .filter((u) => !pattern || pattern.test(u.email || '') || pattern.test(u.name || ''))
    .map((u) => mapAppUserToDTO(u, consentByUser.get(u.id) || null, permissionByUser.get(u.id) || null))
    // WHAT: Most recently signed in first; never signed in, newest account first.
    .sort((a, b) => toMillis(b.lastLoginAt) - toMillis(a.lastLoginAt) || toMillis(b.createdAt) - toMillis(a.createdAt) || String(a.email).localeCompare(String(b.email)))

  const total = rows.length
  const start = (page - 1) * limit
  const users = rows.slice(start, start + limit)

  logger.info('App users listed', {
    clientId,
    total,
    returned: users.length,
    page,
    limit,
    searched: Boolean(search),
    unresolved,
  })

  return { users, total, page, pages: Math.ceil(total / limit), limit }
}
