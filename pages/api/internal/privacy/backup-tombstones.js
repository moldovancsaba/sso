import { getDb } from '../../../../lib/db.mjs'
import { listPrivacyErasureTombstones } from '../../../../lib/privacy/erasureTombstones.mjs'
import { requirePrivacyActor, setPrivateResponseHeaders } from '../../../../lib/privacy/http.mjs'
import logger from '../../../../lib/logger.mjs'

const DEFAULT_LIMIT = 250

export default async function handler(req, res) {
  setPrivateResponseHeaders(res)
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  const actor = await requirePrivacyActor(req, res, { scope: 'sso:privacy.resolve', admin: true, freshAdmin: true })
  if (!actor) return
  if (actor.type === 'service' && actor.clientId !== process.env.SSO_PRIVACY_RESOLVER_CLIENT_ID) {
    return res.status(403).json({ error: 'privacy_resolver_not_authorized' })
  }

  const rawLimit = req.query?.limit
  if (rawLimit !== undefined && (typeof rawLimit !== 'string' || !/^\d{1,3}$/.test(rawLimit))) {
    return res.status(400).json({ error: 'invalid_limit' })
  }
  const limit = rawLimit === undefined ? DEFAULT_LIMIT : Number(rawLimit)
  if (limit < 1 || limit > 500) return res.status(400).json({ error: 'invalid_limit' })
  const cursor = req.query?.cursor
  if (cursor !== undefined && (typeof cursor !== 'string' || !cursor || cursor.length > 1024)) {
    return res.status(400).json({ error: 'invalid_cursor' })
  }

  try {
    const result = await listPrivacyErasureTombstones({ db: await getDb(), cursor, limit })
    return res.status(200).json({ success: true, ...result })
  } catch (error) {
    logger.error('Privacy backup tombstone export failed', { event: 'privacy_backup_tombstone_export_failed', actorType: actor.type })
    return res.status(error?.code === 'privacy_tombstone_cursor_invalid' ? 400 : 503).json({
      error: error?.code === 'privacy_tombstone_cursor_invalid' ? error.code : 'privacy_backup_tombstone_export_unavailable',
    })
  }
}
