import { createErasureCase, ErasureCaseError, listErasureCases } from '../../../../../lib/privacy/erasureCases.mjs'
import { requirePrivacyActor, sendPrivacyError } from '../../../../../lib/privacy/http.mjs'
import logger from '../../../../../lib/logger.mjs'

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const actor = await requirePrivacyActor(req, res, { scope: 'sso:privacy.write', admin: true, freshAdmin: true })
    if (!actor) return
    try {
      const result = await createErasureCase({
        body: req.body,
        idempotencyKey: req.headers['idempotency-key'],
        actor,
      })
      return res.status(result.created ? 201 : 200).json({ success: true, ...result })
    } catch (error) {
      if (!(error instanceof ErasureCaseError)) logger.error('Privacy case create failed', { event: 'privacy_case_create_error', actorType: actor.type })
      return sendPrivacyError(res, error)
    }
  }

  if (req.method === 'GET') {
    const actor = await requirePrivacyActor(req, res, { scope: 'sso:privacy.read', admin: true })
    if (!actor) return
    try {
      const result = await listErasureCases({
        state: typeof req.query?.state === 'string' ? req.query.state : undefined,
        dueBefore: typeof req.query?.dueBefore === 'string' ? req.query.dueBefore : undefined,
        limit: Number.parseInt(req.query?.limit, 10),
        skip: Number.parseInt(req.query?.skip, 10),
      })
      return res.status(200).json({ success: true, ...result })
    } catch (error) {
      if (!(error instanceof ErasureCaseError)) logger.error('Privacy case list failed', { event: 'privacy_case_list_error', actorType: actor.type })
      return sendPrivacyError(res, error)
    }
  }

  res.setHeader('Allow', 'GET, POST')
  return res.status(405).json({ error: 'method_not_allowed' })
}
