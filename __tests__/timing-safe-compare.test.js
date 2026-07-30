import { timingSafeStringEqual } from '../lib/timingSafeCompare.mjs'

describe('timingSafeStringEqual', () => {
  test('returns true for identical strings', () => {
    expect(timingSafeStringEqual('abc123', 'abc123')).toBe(true)
  })

  test('returns false for different strings of the same length', () => {
    expect(timingSafeStringEqual('abc123', 'abc124')).toBe(false)
  })

  test('returns false for strings of different lengths without throwing', () => {
    expect(timingSafeStringEqual('short', 'a-much-longer-string')).toBe(false)
  })

  test('returns false for empty vs non-empty', () => {
    expect(timingSafeStringEqual('', 'a')).toBe(false)
  })

  test('returns true for two empty strings', () => {
    expect(timingSafeStringEqual('', '')).toBe(true)
  })

  test('returns false for non-string inputs without throwing', () => {
    expect(timingSafeStringEqual(undefined, 'a')).toBe(false)
    expect(timingSafeStringEqual('a', undefined)).toBe(false)
    expect(timingSafeStringEqual(null, null)).toBe(false)
    expect(timingSafeStringEqual(123, 123)).toBe(false)
  })
})
