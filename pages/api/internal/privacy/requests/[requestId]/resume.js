import { ErasureCaseError, resumeErasureCoordinator } from '../../../../../../lib/privacy/erasureCases.mjs'
import { requirePrivacyAdmin, sendPrivacyError } from '../../../../../../lib/privacy/http.mjs'
import logger from '../../../../../../lib/logger.mjs'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'method_not_allowed' })
  }
  const actor = await requirePrivacyAdmin(req, res)
  if (!actor) return
  try {
    const updated = await resumeErasureCoordinator({
      requestId: req.query?.requestId,
      reasonCode: req.body?.reasonCode,
      actor,
    })
    return res.status(200).json({ success: true, case: updated })
  } catch (error) {
    if (!(error instanceof ErasureCaseError)) logger.error('Privacy coordinator resume failed', { event: 'privacy_coordinator_resume_error', actorId: actor.id })
    return sendPrivacyError(res, error)
  }
}
