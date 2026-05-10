/**
 * OAuth callback state helpers
 *
 * WHAT: Build and parse the state payload used by social-login callbacks.
 * WHY: Keep one canonical contract for provider callback state instead of
 *      encoding/decoding ad hoc in each route.
 */

/**
 * Build the social-login callback state payload.
 *
 * @param {Object} params
 * @param {string} params.csrfToken
 * @param {string|null} [params.oauthRequest]
 * @param {boolean} [params.adminLogin]
 * @returns {string}
 */
export function buildOAuthCallbackState({
  csrfToken,
  oauthRequest = null,
  adminLogin = false,
}) {
  const stateData = {
    csrf: csrfToken,
  }

  if (oauthRequest) {
    stateData.oauth_request = oauthRequest
  }

  if (adminLogin) {
    stateData.admin_login = true
  }

  return Buffer.from(JSON.stringify(stateData)).toString('base64url')
}

/**
 * Parse and validate the encoded callback state payload shape.
 *
 * @param {string} encodedState
 * @returns {{ csrf: string, oauth_request: string|null, admin_login: boolean }}
 */
export function parseOAuthCallbackState(encodedState) {
  const stateJson = Buffer.from(encodedState, 'base64url').toString('utf-8')
  const parsed = JSON.parse(stateJson)

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('State payload must be an object')
  }

  if (typeof parsed.csrf !== 'string' || !parsed.csrf.trim()) {
    throw new Error('State payload is missing csrf token')
  }

  if (
    parsed.oauth_request != null &&
    typeof parsed.oauth_request !== 'string'
  ) {
    throw new Error('State payload oauth_request must be a string')
  }

  return {
    csrf: parsed.csrf,
    oauth_request: parsed.oauth_request || null,
    admin_login: parsed.admin_login === true,
  }
}
