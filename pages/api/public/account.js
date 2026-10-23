import { getPublicUserFromRequest } from '../../../lib/publicSessions.mjs'
import { applyRateLimiter } from '../../../lib/apiHelpers.mjs'
import { strictRateLimiter } from '../../../lib/middleware/rateLimit.mjs'
import { validateRequestOrigin } from '../../../lib/middleware/csrf.mjs'
import { createErasureCase, ErasureCaseError } from '../../../lib/privacy/erasureCases.mjs'
import logger from '../../../lib/logger.mjs'

/** Legacy account-delete entry point: submit a verified case instead of bypassing cross-product erasure. */
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0')
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', 'DELETE')
    return res.status(405).json({ error: 'method_not_allowed' })
  }
  if (!validateRequestOrigin(req).valid) return res.status(403).json({ error: 'request_origin_not_allowed' })
  try {
    await applyRateLimiter(strictRateLimiter, req, res)
    if (res.writableEnded) return
    const user = await getPublicUserFromRequest(req)
    if (!user || typeof user.id !== 'string' || !user.id.trim()) return res.status(401).json({ error: 'authentication_required' })
    const result = await createErasureCase({
      body: { source: 'participant', subjectRef: { kind: 'sso_user', id: user.id } },
      idempotencyKey: req.headers['idempotency-key'],
      actor: { type: 'participant', id: 'authenticated_user' },
      verifiedSessionAt: new Date(),
    })
    return res.status(200).json({
      success: true,
      requestRecorded: true,
      confirmation_code: result.case.requestId.replaceAll('-', ''),
      status: result.case.state,
      message: 'Your deletion request was recorded. It will be reviewed before account data is removed.',
    })
  } catch (error) {
    if (!(error instanceof ErasureCaseError)) logger.error('Account deletion request could not be recorded', { event: 'account_erasure_request_failed' })
    if (error instanceof ErasureCaseError) return res.status(error.status).json({ error: error.code })
    return res.status(503).json({ error: 'privacy_request_unavailable' })
  }
}
