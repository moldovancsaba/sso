import {
  ErasureCaseError,
  recordRetainedException,
  transitionErasureCase,
} from '../../../../../../lib/privacy/erasureCases.mjs'
import { requirePrivacyAdmin, sendPrivacyError } from '../../../../../../lib/privacy/http.mjs'
import logger from '../../../../../../lib/logger.mjs'

export default async function handler(req, res) {
  if (req.method !== 'PATCH') {
    res.setHeader('Allow', 'PATCH')
    return res.status(405).json({ error: 'method_not_allowed' })
  }
  const actor = await requirePrivacyAdmin(req, res)
  if (!actor) return
  try {
    const requestId = req.query?.requestId
    if (req.body?.action === 'retain_exception') {
      const result = await recordRetainedException({
        requestId,
        target: req.body.target,
        reasonCode: req.body.reasonCode,
        actor,
      })
      return res.status(200).json({ success: true, case: result })
    }
    const result = await transitionErasureCase({ requestId, body: req.body, actor })
    return res.status(200).json({ success: true, case: result })
  } catch (error) {
    if (!(error instanceof ErasureCaseError)) logger.error('Privacy case decision failed', { event: 'privacy_case_decision_error', actorId: actor.id })
    return sendPrivacyError(res, error)
  }
}
