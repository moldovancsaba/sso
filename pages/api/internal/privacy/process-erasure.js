import { createHash, timingSafeEqual } from 'node:crypto'
import { processOneErasureStep } from '../../../../lib/privacy/erasureCoordinator.mjs'
import logger from '../../../../lib/logger.mjs'

function validCronSecret(req) {
  const expected = (process.env.SSO_CRON_SECRET ?? process.env.CRON_SECRET)?.trim() || ''
  const authorization = req.headers.authorization || ''
  const provided = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : ''
  if (!expected || !provided) return false
  return timingSafeEqual(createHash('sha256').update(expected).digest(), createHash('sha256').update(provided).digest())
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ error: 'method_not_allowed' })
  }
  if (!validCronSecret(req)) return res.status(401).json({ error: 'unauthorized' })
  try {
    return res.status(200).json({ success: true, ...(await processOneErasureStep()) })
  } catch {
    logger.error('Privacy erasure coordinator invocation failed', { event: 'privacy_coordinator_invocation_failed' })
    return res.status(503).json({ error: 'privacy_coordinator_unavailable' })
  }
}
