import {
  getInitiatingOrigin,
  isOriginAliasOfBoundRedirect,
  resolveRedirectUriForOrigin,
} from '../lib/oauth/redirectOrigin.mjs'

// The client this feature was built for: one application, one user pool, two domains.
const multiDomainClient = {
  preserve_initiating_origin: true,
  redirect_uris: [
    'https://getyourfield.com/auth/callback',
    'https://getyourfield.com/api/oauth/callback',
    'https://classscout.ai/auth/callback',
    'https://classscout.ai/api/oauth/callback',
  ],
}

const singleDomainClient = {
  preserve_initiating_origin: false,
  redirect_uris: ['https://classscout.ai/api/oauth/callback'],
}

describe('getInitiatingOrigin', () => {
  test('reduces a Referer to its origin', () => {
    expect(getInitiatingOrigin({ headers: { referer: 'https://getyourfield.com/nyc?q=1' } }))
      .toBe('https://getyourfield.com')
  })

  test('is null when the browser sends no Referer', () => {
    expect(getInitiatingOrigin({ headers: {} })).toBeNull()
  })

  test('is null rather than throwing on a malformed Referer', () => {
    expect(getInitiatingOrigin({ headers: { referer: 'not-a-url' } })).toBeNull()
  })
})

describe('resolveRedirectUriForOrigin', () => {
  const requested = 'https://classscout.ai/api/oauth/callback'

  test('re-points a hardcoded redirect_uri to the domain the user started on', () => {
    expect(resolveRedirectUriForOrigin({
      client: multiDomainClient,
      redirect_uri: requested,
      initiatingOrigin: 'https://getyourfield.com',
    })).toBe('https://getyourfield.com/api/oauth/callback')
  })

  test('leaves the request alone when the user started on that same domain', () => {
    expect(resolveRedirectUriForOrigin({
      client: multiDomainClient,
      redirect_uri: requested,
      initiatingOrigin: 'https://classscout.ai',
    })).toBe(requested)
  })

  test('never swaps to an origin that is not registered on this client', () => {
    expect(resolveRedirectUriForOrigin({
      client: multiDomainClient,
      redirect_uri: requested,
      initiatingOrigin: 'https://evil.example.com',
    })).toBe(requested)
  })

  test('never invents a path that is not registered', () => {
    expect(resolveRedirectUriForOrigin({
      client: { ...multiDomainClient, redirect_uris: ['https://classscout.ai/api/oauth/callback', 'https://getyourfield.com/auth/callback'] },
      redirect_uri: requested,
      initiatingOrigin: 'https://getyourfield.com',
    })).toBe(requested)
  })

  test('does nothing without the opt-in, even across registered origins', () => {
    expect(resolveRedirectUriForOrigin({
      client: { ...multiDomainClient, preserve_initiating_origin: false },
      redirect_uri: requested,
      initiatingOrigin: 'https://getyourfield.com',
    })).toBe(requested)
  })

  test('does nothing when the browser suppressed the Referer', () => {
    expect(resolveRedirectUriForOrigin({
      client: multiDomainClient,
      redirect_uri: requested,
      initiatingOrigin: null,
    })).toBe(requested)
  })

  test('passes through on the second /authorize hit, where the Referer is this service', () => {
    // After login the browser rebuilds the authorize URL from our own login page.
    expect(resolveRedirectUriForOrigin({
      client: multiDomainClient,
      redirect_uri: 'https://getyourfield.com/api/oauth/callback',
      initiatingOrigin: 'https://sso.doneisbetter.com',
    })).toBe('https://getyourfield.com/api/oauth/callback')
  })
})

describe('isOriginAliasOfBoundRedirect', () => {
  test('accepts the sibling origin an app that hardcodes its origin will present', () => {
    expect(isOriginAliasOfBoundRedirect({
      client: multiDomainClient,
      boundRedirectUri: 'https://getyourfield.com/api/oauth/callback',
      presentedRedirectUri: 'https://classscout.ai/api/oauth/callback',
    })).toBe(true)
  })

  test('rejects a different path on a registered origin', () => {
    expect(isOriginAliasOfBoundRedirect({
      client: multiDomainClient,
      boundRedirectUri: 'https://getyourfield.com/api/oauth/callback',
      presentedRedirectUri: 'https://classscout.ai/auth/callback',
    })).toBe(false)
  })

  test('rejects an unregistered origin', () => {
    expect(isOriginAliasOfBoundRedirect({
      client: multiDomainClient,
      boundRedirectUri: 'https://getyourfield.com/api/oauth/callback',
      presentedRedirectUri: 'https://evil.example.com/api/oauth/callback',
    })).toBe(false)
  })

  test('rejects everything for a client without the opt-in', () => {
    expect(isOriginAliasOfBoundRedirect({
      client: singleDomainClient,
      boundRedirectUri: 'https://classscout.ai/api/oauth/callback',
      presentedRedirectUri: 'https://classscout.ai/api/oauth/callback',
    })).toBe(false)
  })

  test('is not a way to make an identical pair "alias-equal"', () => {
    expect(isOriginAliasOfBoundRedirect({
      client: multiDomainClient,
      boundRedirectUri: 'https://getyourfield.com/api/oauth/callback',
      presentedRedirectUri: 'https://getyourfield.com/api/oauth/callback',
    })).toBe(false)
  })
})
