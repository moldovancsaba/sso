/**
 * lib/oauth/redirectOrigin.mjs — origin-preserving redirect for multi-domain clients.
 *
 * WHAT: One OAuth client can serve the same application on several domains (a rebrand that
 *       keeps the old name alive, a regional alias). Every such domain is registered as its
 *       own redirect URI on the one client, so users stay in a single account pool. This
 *       module lets the authorization endpoint return the user to the domain they actually
 *       started on, rather than to whichever domain the application hardcoded.
 *
 * WHY:  An application that builds `redirect_uri` from a build-time constant sends every
 *       user to that one domain. The browser then arrives at a callback on a domain that
 *       cannot read the state/PKCE cookie the application wrote on the domain the user
 *       started from, so sign-in fails; retrying from the second domain succeeds and strands
 *       the user under the wrong brand. Correct fix is for the application to derive its own
 *       origin per request. This is the safety net for when that application is not yours to
 *       change — opt in per client with `preserve_initiating_origin`.
 *
 * SAFETY: A swap can only ever produce a redirect URI already registered on the same client,
 *       with the same path as the one requested. There is no way to reach an unregistered
 *       destination, so this cannot become an open redirect. Every uncertain case — no
 *       Referer, unparseable Referer, no registered URI at that origin with that path —
 *       falls back to the requested URI untouched.
 */

/**
 * getInitiatingOrigin
 * WHAT: The origin the browser was on when it started this authorization request.
 * WHY:  A top-level cross-site GET navigation carries no `Origin` header, so `Referer` is
 *       the only signal available. Under the modern default referrer policy
 *       (`strict-origin-when-cross-origin`) it is reduced to exactly an origin, which is all
 *       this needs. It is absent under `no-referrer`, hence every caller treating null as
 *       "do nothing".
 *
 * @returns {string|null} Origin such as `https://example.com`, or null.
 */
export function getInitiatingOrigin(req) {
  const referer = req?.headers?.referer || req?.headers?.referrer
  if (!referer || typeof referer !== 'string') return null

  try {
    return new URL(referer).origin
  } catch {
    return null
  }
}

/**
 * resolveRedirectUriForOrigin
 * WHAT: Returns the redirect URI to actually deliver to.
 * WHY:  See module header. Called once, at the first authorization hit, before the request
 *       is carried through login/consent — from that point the swapped value travels with
 *       the request and is what the authorization code is bound to.
 *
 * @returns {string} A registered redirect URI. The requested one unless a swap applies.
 */
export function resolveRedirectUriForOrigin({ client, redirect_uri, initiatingOrigin }) {
  if (!client?.preserve_initiating_origin) return redirect_uri
  if (!initiatingOrigin || !redirect_uri) return redirect_uri

  let requested
  try {
    requested = new URL(redirect_uri)
  } catch {
    return redirect_uri
  }

  // Already where the user started — nothing to do. This is also the path taken when the
  // flow re-enters /authorize after login, where the Referer is this service's own login
  // page rather than the application.
  if (requested.origin === initiatingOrigin) return redirect_uri

  const candidate = `${initiatingOrigin}${requested.pathname}${requested.search}`
  return (client.redirect_uris || []).includes(candidate) ? candidate : redirect_uri
}

/**
 * isOriginAliasOfBoundRedirect
 * WHAT: Whether a redirect URI presented at the token endpoint is the same callback as the
 *       one an authorization code was bound to, on a sibling origin of the same client.
 * WHY:  RFC 6749 s4.1.3 requires the token request to repeat the redirect_uri from the
 *       authorization request, and an application that hardcodes its origin repeats the
 *       value it sent, not the one it was redirected to. Accepting the sibling keeps that
 *       application working. The check is deliberately narrow: same path, both registered on
 *       the same client, and only for clients that opted into origin preservation. The code
 *       is already bound to this client, the client authenticates with its secret, and PKCE
 *       binds it to the browser that started the flow — so the redirect_uri comparison here
 *       is defence in depth against substitution between two of one client's own callbacks,
 *       not the primary control.
 */
export function isOriginAliasOfBoundRedirect({ client, boundRedirectUri, presentedRedirectUri }) {
  if (!client?.preserve_initiating_origin) return false
  if (!boundRedirectUri || !presentedRedirectUri) return false

  const registered = client.redirect_uris || []
  if (!registered.includes(boundRedirectUri) || !registered.includes(presentedRedirectUri)) {
    return false
  }

  try {
    const bound = new URL(boundRedirectUri)
    const presented = new URL(presentedRedirectUri)
    return bound.origin !== presented.origin
      && bound.pathname === presented.pathname
      && bound.search === presented.search
  } catch {
    return false
  }
}
