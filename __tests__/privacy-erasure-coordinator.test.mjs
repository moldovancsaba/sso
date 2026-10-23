import { jest } from '@jest/globals'

const requestId = '0e5c7a31-166d-4125-9b17-34f5704c2f3a'
const photoId = '507f1f77bcf86cd799439011'
const recordTombstone = jest.fn()
const caseDoc = {
  requestId,
  state: 'deleting',
  decision: { outcome: 'approved' },
  coordinator: {},
}

function setPath(target, path, value) {
  const segments = path.split('.')
  const field = segments.pop()
  const parent = segments.reduce((node, key) => (node[key] ||= {}), target)
  parent[field] = structuredClone(value)
}

function buildDatabase() {
  let stored = structuredClone(caseDoc)
  const collection = {
    createIndex: jest.fn(),
    findOneAndUpdate: jest.fn(async (_filter, update) => {
      for (const [key, value] of Object.entries(update.$set)) setPath(stored, key, value)
      return structuredClone(stored)
    }),
    updateOne: jest.fn(async (_filter, update) => {
      for (const [key, value] of Object.entries(update.$set || {})) setPath(stored, key, value)
      for (const key of Object.keys(update.$unset || {})) {
        const segments = key.split('.')
        const field = segments.pop()
        const parent = segments.reduce((node, part) => node?.[part], stored)
        if (parent) delete parent[field]
      }
      return { modifiedCount: 1 }
    }),
    read: () => stored,
    reset: () => { stored = structuredClone(caseDoc) },
  }
  return { db: { collection: () => collection }, collection }
}

const fakeDb = buildDatabase()
jest.unstable_mockModule('../lib/db.mjs', () => ({ getDb: async () => fakeDb.db }))
jest.unstable_mockModule('../lib/privacy/erasureCases.mjs', () => ({
  decryptSubjectRef: jest.fn((value) => value),
  encryptSubjectRef: jest.fn((value) => value),
  resolveErasureSubjectProof: jest.fn().mockResolvedValue({ version: 1, subject: { kind: 'camera_photo', id: photoId } }),
  recordTargetReceipt: jest.fn(),
}))
jest.unstable_mockModule('../lib/privacy/erasureTombstones.mjs', () => ({
  recordPrivacyErasureTombstone: recordTombstone,
}))
const { processOneErasureStep } = await import('../lib/privacy/erasureCoordinator.mjs')

describe('one-photo privacy coordinator', () => {
  beforeEach(() => {
    fakeDb.collection.reset()
    recordTombstone.mockReset().mockResolvedValue({})
    process.env.SSO_PRIVACY_CAMERA_BASE_URL = 'https://camera.example.test'
    process.env.SSO_PRIVACY_CAMERA_RESOLVER_SECRET = 'camera-secret'
    process.env.SSO_PRIVACY_FANMASS_BASE_URL = 'https://fanmass.example.test'
    process.env.SSO_PRIVACY_FANMASS_API_KEY = 'fanmass-secret'
    process.env.SSO_PRIVACY_MESSMASS_BASE_URL = 'https://messmass.example.test'
    process.env.SSO_PRIVACY_MESSMASS_SECRET = 'messmass-secret'
    global.fetch = jest.fn()
  })

  it('resolves and fences only one photo in a worker invocation, then waits for media proof', async () => {
    global.fetch
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: {
        request_id: requestId,
        status: 'resolved',
        matches: [{ photo_id: photoId, submission_id: 'submission-1', event_ids: ['event-1'], partner_id: 'partner-1' }],
        complete: false,
        next_cursor: 'opaque-next-page',
      } }), { status: 200, headers: { 'content-type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { photos: [{ photo_id: photoId, status: 'fenced' }] } }), { status: 202, headers: { 'content-type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { photos: [{ photo_id: photoId, status: 'media_pending' }] } }), { status: 200, headers: { 'content-type': 'application/json' } }))

    const result = await processOneErasureStep()

    expect(result).toEqual({ status: 'waiting_for_camera_media' })
    expect(global.fetch).toHaveBeenCalledTimes(3)
    const eraseBody = JSON.parse(global.fetch.mock.calls[1][1].body)
    expect(eraseBody.photos).toHaveLength(1)
    expect(eraseBody.photos[0]).toEqual({ photo_id: photoId, submission_id: 'submission-1', event_id: null })
    expect(fakeDb.collection.read().coordinator.currentPhoto.photoId).toBe(photoId)
    expect(fakeDb.collection.read().coordinator.cursor).toBe('opaque-next-page')
  })

  it('writes the independent replay tombstone before advancing past a media-erased photo', async () => {
    global.fetch
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { request_id: requestId, status: 'resolved', matches: [{ photo_id: photoId, submission_id: 'submission-1', event_ids: ['event-1'], partner_id: 'partner-1' }], complete: true, next_cursor: null } }), { status: 200, headers: { 'content-type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { photos: [{ photo_id: photoId, status: 'media_pending' }] } }), { status: 202, headers: { 'content-type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { photos: [{ photo_id: photoId, status: 'media_erased' }] } }), { status: 200, headers: { 'content-type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { status: 'deleted' } }), { status: 200, headers: { 'content-type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { status: 'deleted' } }), { status: 200, headers: { 'content-type': 'application/json' } }))

    recordTombstone.mockImplementation(async (input) => {
      expect(fakeDb.collection.read().coordinator.currentPhoto.cameraDone).toBe(false)
      expect(input).toEqual({ requestId, photoId, submissionId: 'submission-1', eventIds: ['event-1'], partnerId: 'partner-1' })
      return {}
    })
    const result = await processOneErasureStep()

    expect(result).toEqual({ status: 'photo_erased', photoCount: 1 })
    expect(recordTombstone).toHaveBeenCalledTimes(1)
    expect(fakeDb.collection.read().coordinator.currentPhoto).toBeNull()
  })

  it('does not advance or drop the current photo when its replay tombstone cannot be saved', async () => {
    global.fetch
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { request_id: requestId, status: 'resolved', matches: [{ photo_id: photoId, submission_id: 'submission-1', event_ids: ['event-1'], partner_id: 'partner-1' }], complete: true, next_cursor: null } }), { status: 200, headers: { 'content-type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { photos: [{ photo_id: photoId, status: 'media_pending' }] } }), { status: 202, headers: { 'content-type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { photos: [{ photo_id: photoId, status: 'media_erased' }] } }), { status: 200, headers: { 'content-type': 'application/json' } }))
    recordTombstone.mockRejectedValue(new Error('ledger unavailable'))

    const result = await processOneErasureStep()

    expect(result.status).toBe('retrying')
    expect(fakeDb.collection.read().coordinator.currentPhoto.photoId).toBe(photoId)
    expect(fakeDb.collection.read().coordinator.currentPhoto.cameraDone).toBe(false)
    expect(global.fetch).toHaveBeenCalledTimes(3)
  })
})
