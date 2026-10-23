import { requireUnifiedAdmin } from '../auth.mjs'
import { hasScope, validateAccessToken } from '../oauth/middleware.mjs'

export function setPrivateResponseHeaders(res) {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('X-Content-Type-Options', 'nosniff')
}

function hasBearerHeader(req) {
  return typeof (req.headers?.authorization || req.headers?.Authorization) === 'string'
}

export async function requirePrivacyActor(req, res, { scope, admin = false, freshAdmin = false } = {}) {
  setPrivateResponseHeaders(res)
  if (hasBearerHeader(req)) {
    const token = await validateAccessToken(req)
    if (!token) {
      res.status(401).json({ error: 'unauthorized', error_description: 'A valid SSO access token is required' })
      return null
    }
    if (token.userId !== null || token.audience !== 'sso') {
      res.status(403).json({ error: 'forbidden', error_description: 'A service token for the SSO resource is required' })
      return null
    }
    const acceptedScopes = Array.isArray(scope) ? scope : [scope]
    if (!acceptedScopes.some((required) => hasScope(token, required))) {
      res.status(403).json({ error: 'insufficient_scope', error_description: `One of these scopes is required: ${acceptedScopes.join(', ')}` })
      return null
    }
    return { type: 'service', id: token.clientId, scopes: token.scope.split(' '), clientId: token.clientId }
  }
  if (!admin) {
    res.status(401).json({ error: 'unauthorized', error_description: 'A scoped service token is required' })
    return null
  }
  const user = await requireUnifiedAdmin(req, res, freshAdmin ? { requireFreshAuth: true, requireBoundSession: true } : {})
  if (!user) return null
  return { type: 'admin', id: user.id, role: user.role }
}

export async function requirePrivacyAdmin(req, res) {
  setPrivateResponseHeaders(res)
  if (hasBearerHeader(req)) {
    res.status(403).json({ error: 'forbidden', error_description: 'An administrator decision is required' })
    return null
  }
  const user = await requireUnifiedAdmin(req, res, { requireFreshAuth: true, requireBoundSession: true })
  return user ? { type: 'admin', id: user.id, role: user.role } : null
}

export function sendPrivacyError(res, error) {
  if (Number.isInteger(error?.status) && typeof error?.code === 'string') {
    return res.status(error.status).json({ error: error.code, error_description: error.message })
  }
  return res.status(500).json({ error: 'internal_error', error_description: 'The privacy request could not be completed' })
}

export function assertTargetClient(actor, target, res) {
  let mapping
  try {
    mapping = JSON.parse(process.env.SSO_PRIVACY_TARGET_CLIENTS || '')
  } catch {
    mapping = null
  }
  if (!mapping || typeof mapping !== 'object' || Array.isArray(mapping)) {
    res.status(503).json({ error: 'privacy_target_auth_unavailable', error_description: 'Target client authorization is not configured' })
    return false
  }
  if (mapping[target] !== actor.clientId) {
    res.status(403).json({ error: 'forbidden', error_description: 'This service is not authorized to report for that product target' })
    return false
  }
  return true
}
