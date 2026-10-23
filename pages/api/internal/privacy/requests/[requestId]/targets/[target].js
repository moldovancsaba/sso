import { ErasureCaseError, recordTargetReceipt } from '../../../../../../../lib/privacy/erasureCases.mjs'
import { assertTargetClient, requirePrivacyActor, sendPrivacyError } from '../../../../../../../lib/privacy/http.mjs'
import logger from '../../../../../../../lib/logger.mjs'

export default async function handler(req, res) {
  if (req.method !== 'PATCH') {
    res.setHeader('Allow', 'PATCH')
    return res.status(405).json({ error: 'method_not_allowed' })
  }
  const actor = await requirePrivacyActor(req, res, { scope: 'sso:privacy.write' })
  if (!actor) return
  const target = req.query?.target
  if (typeof target !== 'string') return res.status(404).json({ error: 'target_not_found' })
  if (!assertTargetClient(actor, target, res)) return
  try {
    const result = await recordTargetReceipt({
      requestId: req.query?.requestId,
      target,
      body: req.body,
      idempotencyKey: req.headers['idempotency-key'],
      actor,
    })
    return res.status(200).json({ success: true, case: result })
  } catch (error) {
    if (!(error instanceof ErasureCaseError)) logger.error('Privacy target receipt failed', { event: 'privacy_target_receipt_error', actorId: actor.id, target })
    return sendPrivacyError(res, error)
  }
}
