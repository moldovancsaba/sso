import { runCors } from '../lib/cors.mjs'

const ORIGINAL_ENV = { ...process.env }

function req(overrides = {}) {
  return {
    method: 'GET',
    headers: {},
    ...overrides,
  }
}

function res() {
  const headers = {}
  return {
    headers,
    statusCode: null,
    ended: false,
    setHeader(key, value) {
      headers[key] = value
    },
    status(code) {
      this.statusCode = code
      return this
    },
    end() {
      this.ended = true
    },
  }
}

describe('runCors origin allow-list', () => {
  beforeEach(() => {
    process.env.SSO_ALLOWED_ORIGINS = 'https://sso.doneisbetter.com,https://doneisbetter.com'
  })

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV }
  })

  test('echoes an allow-listed Origin and grants credentials', () => {
    const r = res()
    runCors(req({ headers: { origin: 'https://doneisbetter.com' } }), r)

    expect(r.headers['Access-Control-Allow-Origin']).toBe('https://doneisbetter.com')
    expect(r.headers['Access-Control-Allow-Credentials']).toBe('true')
  })

  test('sends no Access-Control-Allow-Origin for an Origin that is not allow-listed', () => {
    const r = res()
    runCors(req({ headers: { origin: 'https://attacker.example.com' } }), r)

    expect(r.headers).not.toHaveProperty('Access-Control-Allow-Origin')
    expect(r.headers).not.toHaveProperty('Access-Control-Allow-Credentials')
  })

  // WHAT: The security case this suite exists for.
  // WHY: A literal `*` entry used to short-circuit the allow-list check and reflect whatever
  //      Origin the caller sent, while Access-Control-Allow-Credentials was set
  //      unconditionally. That combination lets any site read authenticated responses from
  //      this service. A wildcard must never widen what is reflected.
  test('a wildcard entry never reflects an arbitrary Origin back with credentials', () => {
    process.env.SSO_ALLOWED_ORIGINS = '*'
    const r = res()
    runCors(req({ headers: { origin: 'https://attacker.example.com' } }), r)

    expect(r.headers['Access-Control-Allow-Origin']).not.toBe('https://attacker.example.com')
    expect(r.headers).not.toHaveProperty('Access-Control-Allow-Origin')
  })

  test('sends no Access-Control-Allow-Origin when the request carries no Origin header', () => {
    const r = res()
    runCors(req(), r)

    expect(r.headers).not.toHaveProperty('Access-Control-Allow-Origin')
  })

  test('never emits a bare wildcard when the allow-list is empty', () => {
    process.env.SSO_ALLOWED_ORIGINS = ''
    const r = res()
    runCors(req({ headers: { origin: 'https://doneisbetter.com' } }), r)

    // An empty value falls back to the built-in default list, which does allow this origin.
    expect(r.headers['Access-Control-Allow-Origin']).toBe('https://doneisbetter.com')

    const r2 = res()
    runCors(req({ headers: { origin: 'https://attacker.example.com' } }), r2)
    expect(r2.headers['Access-Control-Allow-Origin']).toBeUndefined()
  })

  test('answers a preflight with 204 and reports that it handled the request', () => {
    const r = res()
    const handled = runCors(req({ method: 'OPTIONS', headers: { origin: 'https://doneisbetter.com' } }), r)

    expect(handled).toBe(true)
    expect(r.statusCode).toBe(204)
    expect(r.ended).toBe(true)
    expect(r.headers['Access-Control-Allow-Origin']).toBe('https://doneisbetter.com')
  })

  test('lets a non-preflight request continue', () => {
    expect(runCors(req({ headers: { origin: 'https://doneisbetter.com' } }), res())).toBe(false)
  })

  test('always sets Vary: Origin so a denial is not cached for an allowed origin', () => {
    const r = res()
    runCors(req({ headers: { origin: 'https://attacker.example.com' } }), r)
    expect(r.headers.Vary).toBe('Origin')
  })
})
