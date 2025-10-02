/**
 * lib/magic.mjs — Signed, single-use magic links for admin access
 * WHAT: Generates and verifies time-limited, HMAC-signed tokens stored with one-time usage semantics.
 * WHY: Provide a secure, auditable way to create a "master URL" without permanently weakening authentication.
 */
import crypto from 'crypto'
import { randomUUID } from 'crypto'
import { getDb } from './db.mjs'

// Utilities for base64url encoding/decoding without padding
function b64urlEncode(input) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input)
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}
function b64urlDecode(input) {
  const pad = input.length % 4 === 2 ? '==' : input.length % 4 === 3 ? '=' : ''
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/') + pad
  return Buffer.from(base64, 'base64')
}

function sign(payload, secret) {
  const h = crypto.createHmac('sha256', secret)
  h.update(payload)
  return h.digest()
}

export async function createMagicToken(email, ttlSeconds = 900) {
  // Validate secret present
  const secret = process.env.ADMIN_MAGIC_SECRET
  if (!secret) throw new Error('ADMIN_MAGIC_SECRET is required to generate magic links')

  const now = new Date()
  const exp = new Date(now.getTime() + ttlSeconds * 1000)
  const jti = randomUUID()

  const payload = {
    typ: 'admin-magic',
    email: (email || '').toLowerCase().trim(),
    iat: now.toISOString(),
    exp: exp.toISOString(),
    jti,
  }

  const json = JSON.stringify(payload)
  const payloadPart = b64urlEncode(json)
  const sigPart = b64urlEncode(sign(payloadPart, secret))
  const token = `${payloadPart}.${sigPart}`

  // Persist one-time token state for consumption checks
  const db = await getDb()
  const col = db.collection('adminMagicTokens')
  try {
    await col.createIndex({ jti: 1 }, { unique: true })
  } catch {}
  await col.insertOne({
    jti,
    email: payload.email,
    createdAt: now.toISOString(),
    exp: exp.toISOString(),
    usedAt: null,
  })

  return { token, jti, expiresAt: exp.toISOString() }
}

export async function consumeMagicToken(token) {
  const secret = process.env.ADMIN_MAGIC_SECRET
  if (!secret) throw new Error('ADMIN_MAGIC_SECRET is required to verify magic links')

  if (!token || typeof token !== 'string' || !token.includes('.')) return { ok: false, error: 'invalid_token' }
  const [payloadPart, sigPart] = token.split('.')
  const expectedSig = b64urlEncode(sign(payloadPart, secret))
  if (sigPart !== expectedSig) return { ok: false, error: 'bad_signature' }

  let payload
  try {
    payload = JSON.parse(b64urlDecode(payloadPart).toString('utf8'))
  } catch {
    return { ok: false, error: 'bad_payload' }
  }

  // Time checks
  const now = new Date()
  const exp = new Date(payload.exp)
  if (now > exp) return { ok: false, error: 'expired' }

  const db = await getDb()
  const col = db.collection('adminMagicTokens')
  const rec = await col.findOne({ jti: payload.jti })
  if (!rec) return { ok: false, error: 'unknown_token' }
  if (rec.usedAt) return { ok: false, error: 'already_used' }

  // Mark as used (one-time)
  await col.updateOne({ jti: payload.jti }, { $set: { usedAt: now.toISOString() } })

  return { ok: true, payload }
}