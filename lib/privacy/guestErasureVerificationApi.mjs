import { sendEmail } from '../email.mjs'
import { applyRateLimiter } from '../apiHelpers.mjs'
import { strictRateLimiter } from '../middleware/rateLimit.mjs'
import { issueGuestErasureVerification, normalizeGuestErasureEmail, verifyGuestErasureEmailAndCreateCase } from './guestErasureVerification.mjs'
import logger from '../logger.mjs'

const GENERIC_SENT = 'If you can access that inbox, a confirmation link will be sent.'

function privateHeaders(res) {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('X-Content-Type-Options', 'nosniff')
}

function siteBaseUrl() {
  const value = (process.env.SSO_PRIVACY_GUEST_VERIFY_BASE_URL ?? process.env.SSO_BASE_URL ?? '').trim()
  const url = new URL(value)
  if (url.username || url.password || url.search || url.hash || url.pathname !== '/' || (process.env.NODE_ENV === 'production' && url.protocol !== 'https:')) {
    throw new Error('privacy_guest_base_url_invalid')
  }
  return url.origin
}

export default async function sendGuestErasureVerification(req, res) {
  privateHeaders(res)
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'method_not_allowed' })
  }
  try {
    await applyRateLimiter(strictRateLimiter, req, res)
    if (res.writableEnded) return
  } catch {
    return res.status(503).json({ error: 'privacy_request_unavailable' })
  }

  const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {}
  const email = normalizeGuestErasureEmail(body.email)
  if (email) {
    try {
      const { token } = await issueGuestErasureVerification(email)
      const link = `${siteBaseUrl()}/data-deletion/verify#token=${encodeURIComponent(token)}`
      await sendEmail({
        to: email,
        subject: 'Confirm your data deletion request',
        text: `We received a request to find and delete photos associated with this email address. Confirm control of this inbox within 30 minutes: ${link}\n\nIf you did not request this, ignore this email. No photos are deleted until the request is reviewed and approved.`,
        category: 'privacy_erasure_email_verification',
        meta: { operation: 'guest_erasure_verification' },
      })
    } catch (error) {
      logger.warn('Guest privacy verification could not be sent', { event: 'guest_privacy_verification_send_failed', code: error?.code || 'delivery_failed' })
    }
  }
  return res.status(202).json({ success: true, message: GENERIC_SENT })
}

export async function verifyGuestErasureHandler(req, res) {
  privateHeaders(res)
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'method_not_allowed' })
  }
  try {
    await applyRateLimiter(strictRateLimiter, req, res)
    if (res.writableEnded) return
  } catch {
    return res.status(503).json({ error: 'privacy_request_unavailable' })
  }
  const token = typeof req.body?.token === 'string' ? req.body.token : ''
  try {
    const result = await verifyGuestErasureEmailAndCreateCase(token)
    await sendEmail({
      to: result.email,
      subject: 'Your data deletion request is recorded',
      text: `Your request has been verified and is awaiting review. Confirmation code: ${result.case.requestId.replaceAll('-', '')}. No photo or account data has been deleted yet. You can check progress at ${siteBaseUrl()}/api/public/privacy/deletion-status?confirmation_code=${result.case.requestId.replaceAll('-', '')}.`,
      category: 'privacy_erasure_request_received',
      meta: { operation: 'guest_erasure_request_received' },
    })
    return res.status(200).json({
      success: true,
      confirmation_code: result.case.requestId.replaceAll('-', ''),
      status: result.case.state,
    })
  } catch (error) {
    if (error?.code === 'verification_invalid') return res.status(400).json({ error: 'verification_invalid' })
    logger.error('Guest erasure case could not be created', { event: 'guest_erasure_case_create_failed', code: error?.code || 'internal_error' })
    return res.status(503).json({ error: 'privacy_request_unavailable' })
  }
}
