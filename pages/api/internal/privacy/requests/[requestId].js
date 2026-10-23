import { ErasureCaseError, getErasureCase, resolveErasureSubjectProof, toPublicCase } from '../../../../../lib/privacy/erasureCases.mjs'
import { requirePrivacyActor, sendPrivacyError } from '../../../../../lib/privacy/http.mjs'
import logger from '../../../../../lib/logger.mjs'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'method_not_allowed' })
  }
  const actor = await requirePrivacyActor(req, res, {
    scope: ['sso:privacy.read', 'sso:privacy.resolve'],
    admin: true,
  })
  if (!actor) return

  try {
    const caseDoc = await getErasureCase(req.query?.requestId)
    if (!caseDoc) return res.status(404).json({ error: 'case_not_found' })
    const wantsSubject = req.query?.includeSubject === 'true'
    const mayResolve = actor.type === 'service' && actor.scopes.includes('sso:privacy.resolve')
    if (wantsSubject && !mayResolve) return res.status(403).json({ error: 'insufficient_scope' })
    if (wantsSubject && (!process.env.SSO_PRIVACY_RESOLVER_CLIENT_ID || actor.clientId !== process.env.SSO_PRIVACY_RESOLVER_CLIENT_ID)) {
      return res.status(403).json({ error: 'privacy_resolver_not_authorized' })
    }
    const dto = toPublicCase(caseDoc)
    if (wantsSubject) {
      dto.subjectProof = await resolveErasureSubjectProof({ requestId: caseDoc.requestId, actor })
    }
    return res.status(200).json({ success: true, case: dto })
  } catch (error) {
    if (!(error instanceof ErasureCaseError)) logger.error('Privacy case read failed', { event: 'privacy_case_read_error', actorType: actor.type })
    return sendPrivacyError(res, error)
  }
}
