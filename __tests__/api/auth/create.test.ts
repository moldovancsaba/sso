import { createMocks } from 'node-mocks-http'
import handler from '../../../pages/api/auth/create'
import jwt from 'jsonwebtoken'

describe('/api/auth/create', () => {
  it('returns 405 for non-POST requests', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(405)
    expect(JSON.parse(res._getData())).toEqual(
      expect.objectContaining({
        error: 'Method not allowed',
      })
    )
  })

  it('returns 400 for missing identifier', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {},
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(400)
    expect(JSON.parse(res._getData())).toEqual(
      expect.objectContaining({
        error: 'Identifier is required',
      })
    )
  })

  it('creates a valid JWT token', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        identifier: 'test-user',
      },
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)
    const data = JSON.parse(res._getData())
    expect(data).toHaveProperty('token')

    // Verify the token
    const decoded = jwt.verify(data.token, process.env.JWT_SECRET || 'your-secret-key')
    expect(decoded).toHaveProperty('identifier', 'test-user')
  })
})
