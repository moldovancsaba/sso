import { applyRateLimiter } from '../../../lib/apiHelpers.mjs'
import { metaDeletionRateLimiter } from '../../../lib/middleware/rateLimit.mjs'
import { createErasureCase, ErasureCaseError } from '../../../lib/privacy/erasureCases.mjs'
import { MetaSignedRequestError, verifyMetaSignedRequest } from '../../../lib/privacy/metaSignedRequest.mjs'
import logger from '../../../lib/logger.mjs'
import { getBaseUrl } from '../../../lib/baseUrl.mjs'

const MAX_BODY_BYTES = 8_192

export const config = { api: { bodyParser: false } }

function fail(res, status, error) {
  return res.status(status).json({ error })
}

async function readBoundedBody(req) {
  const contentLength = Number(req.headers['content-length'] || 0)
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    const error = new Error('request_too_large')
    error.status = 413
    throw error
  }
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += buffer.length
    if (size > MAX_BODY_BYTES) {
      const error = new Error('request_too_large')
      error.status = 413
      throw error
    }
    chunks.push(buffer)
  }
  return Buffer.concat(chunks, size).toString('utf8')
}

function confirmationCode(requestId) {
  return requestId.replaceAll('-', '').toLowerCase()
}

function statusUrl(code) {
  const baseUrl = new URL(getBaseUrl())
  if (process.env.NODE_ENV === 'production' && baseUrl.protocol !== 'https:') {
    throw new ErasureCaseError(503, 'meta_callback_unavailable', 'The public status URL is not configured securely')
  }
  const url = new URL('/api/public/privacy/deletion-status', baseUrl)
  url.searchParams.set('confirmation_code', code)
  return url.href
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return fail(res, 405, 'method_not_allowed')
  }
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  try {
    await applyRateLimiter(metaDeletionRateLimiter, req, res)
    if (res.writableEnded) return

    const contentType = String(req.headers['content-type'] || '').split(';', 1)[0].trim().toLowerCase()
    if (contentType !== 'application/x-www-form-urlencoded') return fail(res, 415, 'unsupported_media_type')

    const appId = process.env.SSO_FACEBOOK_APP_ID?.trim()
    const appSecret = process.env.SSO_FACEBOOK_APP_SECRET?.trim()
    if (!appId || !appSecret) return fail(res, 503, 'callback_not_configured')

    const body = await readBoundedBody(req)
    const form = new URLSearchParams(body)
    const signedRequests = form.getAll('signed_request')
    if (signedRequests.length !== 1) return fail(res, 400, 'invalid_signed_request')

    const verified = verifyMetaSignedRequest(signedRequests[0], {
      appSecret,
      previousAppSecret: process.env.SSO_FACEBOOK_APP_SECRET_PREVIOUS,
      previousSecretExpiresAt: process.env.SSO_FACEBOOK_APP_SECRET_PREVIOUS_EXPIRES_AT,
    })
    const result = await createErasureCase({
      body: {
        source: 'facebook',
        subjectRef: { kind: 'facebook_subject', id: verified.userId },
      },
      // Meta's signed request does not provide a separate request UUID. The
      // configured app, signed subject and issued_at make provider retries
      // idempotent while allowing a later, new deletion request for the user.
      idempotencyKey: `meta:${appId}:${verified.issuedAt}:${verified.userId}`,
      actor: { type: 'service', id: `meta-data-deletion:${appId}` },
    })
    const code = confirmationCode(result.case.requestId)
    // Provider callback contracts expect a normal successful HTTP response;
    // idempotency is represented by the same durable confirmation code.
    return res.status(200).json({
      url: statusUrl(code),
      confirmation_code: code,
    })
  } catch (error) {
    if (error instanceof MetaSignedRequestError) return fail(res, 400, error.code)
    if (error instanceof ErasureCaseError) return fail(res, error.status, error.code)
    if (error?.status === 413) return fail(res, 413, 'request_too_large')
    logger.error('Meta data deletion callback failed', { event: 'meta_data_deletion_callback_error' })
    return fail(res, 503, 'callback_temporarily_unavailable')
  }
}
