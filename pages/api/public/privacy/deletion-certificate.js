import { applyRateLimiter } from '../../../../lib/apiHelpers.mjs'
import { metaDeletionRateLimiter } from '../../../../lib/middleware/rateLimit.mjs'
import { ErasureCaseError, getErasureCase } from '../../../../lib/privacy/erasureCases.mjs'
import { generateErasureCertificate } from '../../../../lib/privacy/erasureCertificate.mjs'
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
    return res.status(503).json({ error: 'deletion_certificate_unavailable' })
  }
  const code = typeof req.query?.confirmation_code === 'string' ? req.query.confirmation_code : ''
  const requestId = requestIdFromCode(code)
  if (!requestId) return res.status(404).json({ error: 'deletion_certificate_not_found' })
  try {
    const record = await getErasureCase(requestId)
    if (!record || !['facebook', 'participant'].includes(record.source)) {
      return res.status(404).json({ error: 'deletion_certificate_not_found' })
    }
    const pdf = generateErasureCertificate(record)
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Length', String(pdf.byteLength))
    res.setHeader('Content-Disposition', `attachment; filename="erasure-record-${code.toLowerCase()}.pdf"`)
    return res.status(200).send(pdf)
  } catch (error) {
    if (error?.code === 'erasure_case_not_terminal') return res.status(409).json({ error: error.code })
    if (!(error instanceof ErasureCaseError)) logger.error('Public deletion certificate could not be issued', { event: 'public_deletion_certificate_error' })
    return res.status(error instanceof ErasureCaseError ? error.status : 503).json({ error: error instanceof ErasureCaseError ? error.code : 'deletion_certificate_unavailable' })
  }
}
