const DEFAULT_ADMIN_REDIRECT_PATH = '/admin/dashboard'

function isServerRuntime() {
  return typeof window === 'undefined'
}

function bytesToBase64(bytes) {
  let binary = ''

  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary)
}

function base64ToBytes(value) {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }

  return bytes
}

function base64UrlEncode(value) {
  if (isServerRuntime()) {
    return Buffer.from(value, 'utf8').toString('base64url')
  }

  return bytesToBase64(new TextEncoder().encode(value))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function base64UrlDecode(value) {
  if (isServerRuntime()) {
    return Buffer.from(value, 'base64url').toString('utf8')
  }

  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padding = '='.repeat((4 - (normalized.length % 4)) % 4)
  return new TextDecoder().decode(base64ToBytes(`${normalized}${padding}`))
}

export function sanitizeAdminRedirectPath(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) {
    return DEFAULT_ADMIN_REDIRECT_PATH
  }

  try {
    const url = new URL(value, 'http://localhost')
    const redirectPath = `${url.pathname}${url.search}${url.hash}`

    if (!redirectPath.startsWith('/admin') || redirectPath.startsWith('/admin/callback') || redirectPath === '/admin') {
      return DEFAULT_ADMIN_REDIRECT_PATH
    }

    return redirectPath
  } catch {
    return DEFAULT_ADMIN_REDIRECT_PATH
  }
}

export function encodeAdminLoginState({ nonce, redirectPath } = {}) {
  return base64UrlEncode(JSON.stringify({
    nonce: nonce || Math.random().toString(36).slice(2),
    redirectPath: sanitizeAdminRedirectPath(redirectPath),
  }))
}

export function decodeAdminLoginState(value) {
  if (typeof value !== 'string' || !value) {
    return null
  }

  try {
    const decoded = JSON.parse(base64UrlDecode(value))
    return {
      nonce: decoded?.nonce || null,
      redirectPath: sanitizeAdminRedirectPath(decoded?.redirectPath),
    }
  } catch {
    return null
  }
}

export function buildAdminLoginUrl(redirectPath, { reauth = false } = {}) {
  const params = new URLSearchParams({
    redirect: sanitizeAdminRedirectPath(redirectPath),
  })

  if (reauth) {
    params.set('reauth', '1')
  }

  return `/admin?${params.toString()}`
}

export function getCurrentAdminPath() {
  if (typeof window === 'undefined') {
    return DEFAULT_ADMIN_REDIRECT_PATH
  }

  return sanitizeAdminRedirectPath(
    `${window.location.pathname}${window.location.search}${window.location.hash}`
  )
}

export function redirectToAdminLogin(redirectPath, { reauth = false } = {}) {
  if (typeof window !== 'undefined') {
    window.location.assign(buildAdminLoginUrl(redirectPath, { reauth }))
  }
}

// WHAT: Placeholder strings that carry no information about what actually went wrong.
// WHY: Several API routes return {error: '<generic placeholder>', message: '<real detail>'} —
//      the real detail was going unread because a string `error` field was always preferred
//      outright. Treating these specific strings as "no better than absent" lets a genuine
//      detail elsewhere in the payload take priority instead.
const GENERIC_ERROR_MESSAGES = new Set([
  'Internal server error',
  'An unexpected error occurred',
  'An error occurred',
  'An error occurred. Please try again later.',
])

function getErrorMessage(response, data, fallback) {
  const errorField = typeof data?.error === 'string' ? data.error : null
  const nestedErrorMessage = typeof data?.error?.message === 'string' ? data.error.message : null
  const messageField = typeof data?.message === 'string' ? data.message : null
  const descriptionField = typeof data?.error_description === 'string' ? data.error_description : null

  if (errorField && !GENERIC_ERROR_MESSAGES.has(errorField)) {
    return errorField
  }

  if (nestedErrorMessage) {
    return nestedErrorMessage
  }

  if (messageField && messageField !== errorField) {
    return messageField
  }

  if (descriptionField) {
    return descriptionField
  }

  if (errorField) {
    return errorField
  }

  return fallback || `Request failed: ${response.status}`
}

export async function fetchAdminJson(input, init = {}, options = {}) {
  const response = await fetch(input, {
    credentials: 'include',
    ...init,
  })

  const data = await response.json().catch(() => null)
  const errorCode = data?.error?.code || data?.code || null

  if (response.status === 401 || (response.status === 403 && errorCode === 'REAUTH_REQUIRED')) {
    const error = new Error(getErrorMessage(response, data, 'Authentication required'))
    error.code = errorCode || 'UNAUTHORIZED'
    error.data = data
    error.redirected = options.redirectOnAuthFailure !== false

    if (error.redirected) {
      redirectToAdminLogin(getCurrentAdminPath(), { reauth: errorCode === 'REAUTH_REQUIRED' })
    }

    throw error
  }

  if (!response.ok) {
    const error = new Error(getErrorMessage(response, data))
    error.code = errorCode || 'REQUEST_FAILED'
    error.data = data
    error.redirected = false
    throw error
  }

  return data
}

export function isAuthRedirectError(error) {
  return Boolean(error?.redirected)
}
