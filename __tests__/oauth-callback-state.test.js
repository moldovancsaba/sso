import { buildOAuthCallbackState, parseOAuthCallbackState } from '../lib/oauth/callbackState.mjs'
import {
  clearCsrfCookie,
  setCsrfCookie,
  validateStateCsrfToken,
} from '../lib/middleware/csrf.mjs'

function createMockResponse() {
  return {
    headers: {},
    setHeader(name, value) {
      this.headers[name] = value
    },
  }
}

function createRequestWithCookie(cookieValue) {
  return {
    headers: {
      cookie: cookieValue,
    },
  }
}

describe('oauth callback state contract', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      SESSION_SECRET: 'test-session-secret',
    }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  test('builds and parses the canonical callback state payload', () => {
    const encoded = buildOAuthCallbackState({
      csrfToken: 'csrf-token',
      oauthRequest: 'oauth-request',
      adminLogin: true,
    })

    expect(parseOAuthCallbackState(encoded)).toEqual({
      csrf: 'csrf-token',
      oauth_request: 'oauth-request',
      admin_login: true,
    })
  })

  test('rejects state payloads without csrf token', () => {
    const encoded = Buffer.from(JSON.stringify({ admin_login: true })).toString('base64url')

    expect(() => parseOAuthCallbackState(encoded)).toThrow('State payload is missing csrf token')
  })

  test('validates callback state against the signed csrf cookie', () => {
    const response = createMockResponse()
    setCsrfCookie(response, 'csrf-token')

    const request = createRequestWithCookie(response.headers['Set-Cookie'])

    expect(validateStateCsrfToken(request, 'csrf-token')).toEqual({ valid: true })
  })

  test('rejects callback state when csrf cookie is missing', () => {
    const request = createRequestWithCookie('')

    expect(validateStateCsrfToken(request, 'csrf-token')).toEqual({
      valid: false,
      reason: 'missing_csrf_cookie',
    })
  })

  test('rejects callback state with mismatched csrf token', () => {
    const response = createMockResponse()
    setCsrfCookie(response, 'csrf-token')

    const request = createRequestWithCookie(response.headers['Set-Cookie'])

    expect(validateStateCsrfToken(request, 'other-token')).toEqual({
      valid: false,
      reason: 'csrf_token_mismatch',
    })
  })

  test('clearing the csrf cookie invalidates a replayed callback state', () => {
    const response = createMockResponse()
    setCsrfCookie(response, 'csrf-token')

    const firstRequest = createRequestWithCookie(response.headers['Set-Cookie'])
    expect(validateStateCsrfToken(firstRequest, 'csrf-token')).toEqual({ valid: true })

    clearCsrfCookie(response)
    const replayRequest = createRequestWithCookie(response.headers['Set-Cookie'])

    expect(validateStateCsrfToken(replayRequest, 'csrf-token')).toEqual({
      valid: false,
      reason: 'missing_csrf_cookie',
    })
  })
})
