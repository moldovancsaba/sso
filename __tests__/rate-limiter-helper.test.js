import { EventEmitter } from 'events'
import { applyRateLimiter } from '../lib/apiHelpers.mjs'

// Minimal fake of a Next.js/Node response sufficient to exercise applyRateLimiter's
// finish/close listeners and writableEnded flag, without needing a real HTTP server.
function fakeResponse() {
  const res = new EventEmitter()
  res.writableEnded = false
  res.status = function status() {
    return this
  }
  res.json = function json() {
    this.writableEnded = true
    this.emit('finish')
    return this
  }
  return res
}

describe('applyRateLimiter', () => {
  test('resolves normally when the limiter calls next() (request under the limit)', async () => {
    const req = {}
    const res = fakeResponse()

    // Mimics express-rate-limit under the limit: calls next() with no error, no response sent.
    const underLimitLimiter = (r, s, next) => next()

    await expect(applyRateLimiter(underLimitLimiter, req, res)).resolves.toBeUndefined()
    expect(res.writableEnded).toBe(false)
  })

  // This is the exact bug: express-rate-limit's exceeded-limit handler sends a response
  // directly and never calls next(). Before the fix, this awaited forever even though the
  // client had already received a 429.
  test('resolves (does not hang) when the limiter sends a 429 response instead of calling next()', async () => {
    const req = {}
    const res = fakeResponse()

    const exceededLimiter = (r, s) => {
      // Real handler shape: (req, res) => res.status(429).json({...}) — next is never invoked.
      s.status(429).json({ error: 'Too many requests' })
    }

    await expect(applyRateLimiter(exceededLimiter, req, res)).resolves.toBeUndefined()
    expect(res.writableEnded).toBe(true)
  })

  test('rejects when the limiter calls next(err)', async () => {
    const req = {}
    const res = fakeResponse()
    const erroringLimiter = (r, s, next) => next(new Error('store failure'))

    await expect(applyRateLimiter(erroringLimiter, req, res)).rejects.toThrow('store failure')
  })
})
