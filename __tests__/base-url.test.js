import { getBaseUrl } from '../lib/baseUrl.mjs'

const ORIGINAL_ENV = { ...process.env }

describe('getBaseUrl', () => {
  beforeEach(() => {
    delete process.env.SSO_BASE_URL
    delete process.env.VERCEL_ENV
    delete process.env.VERCEL_URL
    delete process.env.NODE_ENV
  })

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV }
  })

  test('explicit SSO_BASE_URL wins over everything', () => {
    process.env.SSO_BASE_URL = 'https://sso.example.com'
    process.env.VERCEL_ENV = 'preview'
    process.env.VERCEL_URL = 'sso-preview-abc.vercel.app'
    process.env.NODE_ENV = 'production'
    expect(getBaseUrl()).toBe('https://sso.example.com')
  })

  test('trailing slashes are stripped from the configured value', () => {
    process.env.SSO_BASE_URL = 'https://sso.example.com//'
    expect(getBaseUrl()).toBe('https://sso.example.com')
  })

  test('a whitespace-only SSO_BASE_URL is treated as unset', () => {
    process.env.SSO_BASE_URL = '   '
    process.env.NODE_ENV = 'production'
    expect(getBaseUrl()).toBe('https://sso.doneisbetter.com')
  })

  test('Vercel preview deployments use their own generated host', () => {
    process.env.VERCEL_ENV = 'preview'
    process.env.VERCEL_URL = 'sso-preview-abc.vercel.app'
    process.env.NODE_ENV = 'production'
    expect(getBaseUrl()).toBe('https://sso-preview-abc.vercel.app')
  })

  // The regression this module exists to prevent: production without SSO_BASE_URL
  // used to emit http://localhost:3000 into every emailed link.
  test('production without any configuration falls back to the production domain', () => {
    process.env.NODE_ENV = 'production'
    expect(getBaseUrl()).toBe('https://sso.doneisbetter.com')
  })

  test('development falls back to the port npm run dev actually uses', () => {
    process.env.NODE_ENV = 'development'
    expect(getBaseUrl()).toBe('http://localhost:5500')
  })
})
