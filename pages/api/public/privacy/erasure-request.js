import { getPublicUserFromRequest } from '../../../../lib/publicSessions.mjs'
import { applyRateLimiter } from '../../../../lib/apiHelpers.mjs'
import { strictRateLimiter } from '../../../../lib/middleware/rateLimit.mjs'
import { validateRequestOrigin } from '../../../../lib/middleware/csrf.mjs'
import { createErasureCase, ErasureCaseError } from '../../../../lib/privacy/erasureCases.mjs'
import logger from '../../../../lib/logger.mjs'

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'method_not_allowed' })
  }
  const origin = validateRequestOrigin(req)
  if (!origin.valid) return res.status(403).json({ error: 'request_origin_not_allowed' })
  try {
    await applyRateLimiter(strictRateLimiter, req, res)
    if (res.writableEnded) return
  } catch {
    return res.status(503).json({ error: 'privacy_request_unavailable' })
  }

  try {
    const user = await getPublicUserFromRequest(req)
    if (!user || typeof user.id !== 'string' || !user.id.trim()) {
      return res.status(401).json({ error: 'authentication_required' })
    }
    const result = await createErasureCase({
      body: { source: 'participant', subjectRef: { kind: 'sso_user', id: user.id } },
      idempotencyKey: req.headers['idempotency-key'],
      actor: { type: 'participant', id: 'authenticated_user' },
      verifiedSessionAt: new Date(),
    })
    return res.status(result.created ? 201 : 200).json({
      success: true,
      confirmation_code: result.case.requestId.replaceAll('-', ''),
      status: result.case.state,
    })
  } catch (error) {
    if (!(error instanceof ErasureCaseError)) {
      logger.error('Authenticated privacy request could not be recorded', { event: 'authenticated_privacy_request_failed' })
    }
    if (error instanceof ErasureCaseError) return res.status(error.status).json({ error: error.code })
    return res.status(503).json({ error: 'privacy_request_unavailable' })
  }
}
