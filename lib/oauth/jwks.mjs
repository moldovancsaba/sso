/**
 * JWKS (JSON Web Key Set) Helper
 * 
 * Converts RSA public key from PEM format to JWK format.
 * This is needed for the JWKS endpoint so clients can verify JWT signatures.
 */

import { createPublicKey } from 'crypto'
import { getPublicKey } from './tokens.mjs'

const JWT_KEY_ID = process.env.JWT_KEY_ID || 'sso-2025'

/**
 * Convert RSA public key to JWK format
 * 
 * @returns {Object} JWK representation of the public key
 */
export function getPublicKeyAsJwk() {
  try {
    // Get PEM public key
    const pemPublicKey = getPublicKey()

    // Create public key object
    const keyObject = createPublicKey({
      key: pemPublicKey,
      format: 'pem',
    })

    // Export as JWK
    const jwk = keyObject.export({ format: 'jwk' })

    // Add standard JWK fields
    return {
      kty: jwk.kty,       // Key type (RSA)
      use: 'sig',         // Key usage (signature)
      kid: JWT_KEY_ID,    // Key ID
      alg: 'RS256',       // Algorithm
      n: jwk.n,           // Modulus
      e: jwk.e,           // Exponent
    }
  } catch (error) {
    throw new Error(`Failed to convert public key to JWK: ${error.message}`)
  }
}

/**
 * Get JWKS (JSON Web Key Set)
 * 
 * Returns an array of JWKs (we only have one key currently)
 * 
 * @returns {Object} JWKS object with keys array
 */
export function getJwks() {
  return {
    keys: [getPublicKeyAsJwk()],
  }
}
