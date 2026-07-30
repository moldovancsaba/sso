/**
 * lib/timingSafeCompare.mjs
 * WHAT: Constant-time string equality check.
 * WHY: A naive === comparison on a secret value (HMAC signature, token, password) short-
 *      circuits on the first differing byte, letting an attacker infer how many leading
 *      characters they guessed correctly from response-time differences. Centralized here so
 *      every comparison site shares one implementation instead of drifting independently.
 */
import { timingSafeEqual } from 'crypto'

export function timingSafeStringEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}
