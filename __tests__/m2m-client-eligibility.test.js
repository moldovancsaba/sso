/**
 * Eligibility rules for machine-to-machine access (scripts/enable-m2m-clients.mjs).
 *
 * WHAT: Verifies which OAuth clients may hold the client_credentials grant.
 * WHY:  These rules decide who gets a standing machine credential capable of writing
 *       permission records for every user of a client. Two of them are load-bearing:
 *       public clients must never qualify, and a revoked client must stay revoked
 *       across later runs of the enablement script.
 */

import { classify } from '../scripts/enable-m2m-clients.mjs'

function confidentialClient(overrides = {}) {
  return {
    name: 'example',
    status: 'active',
    token_endpoint_auth_method: 'client_secret_post',
    client_secret: '$2a$12$hashedvalueplaceholder',
    ...overrides,
  }
}

describe('machine-to-machine eligibility', () => {
  test('an active confidential client with a secret is eligible', () => {
    expect(classify(confidentialClient()).eligible).toBe(true)
  })

  test('a public client is never eligible', () => {
    // WHAT: token_endpoint_auth_method 'none' marks a browser or mobile client.
    // WHY: client_credentials authenticates with a secret. A public client ships its
    //      code to the user, so any secret it holds is readable by anyone.
    const result = classify(confidentialClient({ token_endpoint_auth_method: 'none' }))

    expect(result.eligible).toBe(false)
    expect(result.reason).toMatch(/public client/)
  })

  test('a client with no stored secret is not eligible', () => {
    const result = classify(confidentialClient({ client_secret: null }))

    expect(result.eligible).toBe(false)
    expect(result.reason).toMatch(/no client_secret/)
  })

  test('a suspended client is not eligible', () => {
    const result = classify(confidentialClient({ status: 'suspended' }))

    expect(result.eligible).toBe(false)
    expect(result.reason).toMatch(/not active/)
  })

  test('a previously revoked client stays excluded', () => {
    // WHAT: m2m_excluded is written when an operator revokes machine access.
    // WHY: Revocation used to leave no record, so the next ordinary run of the
    //      enablement script silently re-granted the credential that had been
    //      deliberately removed. The flag has to outrank every other eligibility rule.
    const result = classify(confidentialClient({ m2m_excluded: true }))

    expect(result.eligible).toBe(false)
    expect(result.reason).toMatch(/previous revocation/)
  })

  test('exclusion outranks an otherwise perfectly eligible record', () => {
    const eligible = confidentialClient()
    const excluded = confidentialClient({ m2m_excluded: true })

    expect(classify(eligible).eligible).toBe(true)
    expect(classify(excluded).eligible).toBe(false)
  })
})
