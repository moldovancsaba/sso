import { clearPublicSessionCookie, setPublicSessionCookie } from '../lib/publicSessions.mjs'

function createMockResponse() {
  return {
    headers: {},
    setHeader(name, value) {
      this.headers[name] = value
    },
  }
}

describe('public session cookie contract', () => {
  const originalEnv = process.env

  afterEach(() => {
    process.env = originalEnv
  })

  test('uses lax cookies locally when no shared domain is configured', () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'development',
    }

    const response = createMockResponse()
    setPublicSessionCookie(response, 'session-token')

    expect(response.headers['Set-Cookie']).toContain('SameSite=Lax')
    expect(response.headers['Set-Cookie']).not.toContain('Secure')
    expect(response.headers['Set-Cookie']).not.toContain('Domain=')
  })

  test('uses none + secure + shared domain in production', () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'production',
      SSO_COOKIE_DOMAIN: '.doneisbetter.com',
      PUBLIC_SESSION_COOKIE: 'public-session',
    }

    const response = createMockResponse()
    setPublicSessionCookie(response, 'session-token')

    expect(response.headers['Set-Cookie']).toContain('SameSite=None')
    expect(response.headers['Set-Cookie']).toContain('Secure')
    expect(response.headers['Set-Cookie']).toContain('Domain=.doneisbetter.com')
  })

  test('clears production cookie with the same shared-site attributes', () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'production',
      SSO_COOKIE_DOMAIN: '.doneisbetter.com',
      PUBLIC_SESSION_COOKIE: 'public-session',
    }

    const response = createMockResponse()
    clearPublicSessionCookie(response)

    expect(response.headers['Set-Cookie']).toContain('SameSite=None')
    expect(response.headers['Set-Cookie']).toContain('Secure')
    expect(response.headers['Set-Cookie']).toContain('Domain=.doneisbetter.com')
    expect(response.headers['Set-Cookie']).toContain('Max-Age=0')
  })
})
