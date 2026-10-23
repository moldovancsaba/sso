import { applyRateLimiter } from '../../../../lib/apiHelpers.mjs'
import { metaDeletionRateLimiter } from '../../../../lib/middleware/rateLimit.mjs'
import { ErasureCaseError, getErasureCase } from '../../../../lib/privacy/erasureCases.mjs'
import logger from '../../../../lib/logger.mjs'

function requestIdFromCode(value) {
  if (typeof value !== 'string' || !/^[0-9a-f]{32}$/i.test(value)) return null
  const code = value.toLowerCase()
  return `${code.slice(0, 8)}-${code.slice(8, 12)}-${code.slice(12, 16)}-${code.slice(16, 20)}-${code.slice(20)}`
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'method_not_allowed' })
  }
  try {
    await applyRateLimiter(metaDeletionRateLimiter, req, res)
    if (res.writableEnded) return
  } catch {
    return res.status(503).json({ error: 'deletion_status_unavailable' })
  }
  const code = typeof req.query?.confirmation_code === 'string' ? req.query.confirmation_code : ''
  const requestId = requestIdFromCode(code)
  if (!requestId) return res.status(404).json({ error: 'deletion_status_not_found' })
  try {
    const record = await getErasureCase(requestId)
    if (!record || record.source !== 'facebook') return res.status(404).json({ error: 'deletion_status_not_found' })
    return res.status(200).json({
      confirmation_code: code.toLowerCase(),
      status: record.state,
      received_at: record.receivedAt,
      response_due_at: record.dueAt,
      targets: (record.targets || []).map(({ target, status }) => ({ target, status })),
    })
  } catch (error) {
    if (!(error instanceof ErasureCaseError)) logger.error('Public deletion status lookup failed', { event: 'public_deletion_status_error' })
    return res.status(error instanceof ErasureCaseError ? error.status : 503).json({ error: error instanceof ErasureCaseError ? error.code : 'deletion_status_unavailable' })
  }
}
