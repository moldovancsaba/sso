import logger from './logger.mjs'

function getAllowedOrigins() {
  const configuredOrigins = process.env.SSO_ALLOWED_ORIGINS?.split(',') || []
  const baseOrigins = [
    process.env.SSO_BASE_URL,
    process.env.NEXT_PUBLIC_SSO_BASE_URL,
  ].filter(Boolean)

  return [...new Set([...configuredOrigins, ...baseOrigins])]
    .map((origin) => origin.trim())
    .filter(Boolean)
}

export function isSafeRedirectTarget(target, options = {}) {
  const {
    allowRelative = true,
  } = options

  if (!target || typeof target !== 'string') {
    return false
  }

  const normalizedTarget = target.trim()
  if (!normalizedTarget) {
    return false
  }

  if (allowRelative && normalizedTarget.startsWith('/')) {
    return true
  }

  try {
    const url = new URL(normalizedTarget)

    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      return false
    }

    if (url.hostname === 'localhost' || url.hostname.endsWith('.localhost')) {
      return true
    }

    const allowedOrigins = getAllowedOrigins()
    return allowedOrigins.some((origin) => {
      try {
        return new URL(origin).origin === url.origin
      } catch {
        return false
      }
    })
  } catch (error) {
    logger.warn('Invalid redirect target format', {
      target: normalizedTarget,
      error: error.message,
    })
    return false
  }
}

export function resolveSafeRedirect(candidates, fallback = '/') {
  for (const candidate of candidates) {
    if (isSafeRedirectTarget(candidate)) {
      return candidate
    }
  }

  return fallback
}
