/**
 * Social OAuth redirect URI helpers.
 *
 * WHAT: Builds the callback URI that should be used for provider round-trips.
 * WHY: Local development runs on port 5500 in this repo, while production uses
 *      the configured public callback URL. Providers must see the exact same
 *      callback URI in both the authorization request and token exchange.
 */

function normalizeHost(req) {
  return (
    req.headers['x-forwarded-host']
    || req.headers.host
    || ''
  ).trim()
}

function isLocalHost(host) {
  const bareHost = host.replace(/^\[|\]$/g, '').split(':')[0]
  return bareHost === 'localhost' || bareHost === '127.0.0.1' || bareHost === '::1'
}

export function getSocialCallbackRedirectUri(req, envRedirectUri, callbackPath) {
  const host = normalizeHost(req)

  if (host && isLocalHost(host)) {
    return `http://${host}${callbackPath}`
  }

  return envRedirectUri
}
