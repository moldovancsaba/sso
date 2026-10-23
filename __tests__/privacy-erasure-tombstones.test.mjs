import { jest } from '@jest/globals'

const collectionName = 'privacyErasureTombstones'
const requestId = '0e5c7a31-166d-4125-9b17-34f5704c2f3a'

function compareKey(left, right) {
  return left.createdAt.getTime() - right.createdAt.getTime() || left.requestId.localeCompare(right.requestId) || left.photoId.localeCompare(right.photoId)
}

function compareCursor(row, cursor) {
  const date = row.createdAt.getTime() - cursor.createdAt.getTime()
  if (date) return date
  const request = row.requestId.localeCompare(cursor.requestId)
  if (request) return request
  return row.photoId.localeCompare(cursor.photoId)
}

function buildDb() {
  const rows = []
  const projections = []
  const collection = {
    createIndex: jest.fn(async () => 'index'),
    updateOne: jest.fn(async (filter, update) => {
      const existing = rows.find((row) => row.requestId === filter.requestId && row.photoId === filter.photoId)
      if (!existing) rows.push(structuredClone(update.$setOnInsert))
      return { upsertedCount: existing ? 0 : 1 }
    }),
    findOne: jest.fn(async (filter) => structuredClone(rows.find((row) => row.requestId === filter.requestId && row.photoId === filter.photoId) || null)),
    find: jest.fn((filter, options) => {
      projections.push(options.projection)
      const expired = (row) => !row.expiresAt || row.expiresAt > filter.$or[1].expiresAt.$gt
      const cursorCondition = filter.$and?.[0]?.$or
      const selected = rows.filter((row) => expired(row) && (!cursorCondition || cursorCondition.some((clause) => {
        if (clause.createdAt?.$gt) return row.createdAt > clause.createdAt.$gt
        if (clause.createdAt instanceof Date && clause.requestId?.$gt) return row.createdAt.getTime() === clause.createdAt.getTime() && row.requestId > clause.requestId.$gt
        if (clause.createdAt instanceof Date && clause.photoId?.$gt) return row.createdAt.getTime() === clause.createdAt.getTime() && row.requestId === clause.requestId && row.photoId > clause.photoId.$gt
        return false
      }))).sort(compareKey)
      return {
        sort: () => ({
          limit: (count) => ({ toArray: async () => structuredClone(selected.slice(0, count)) }),
        }),
      }
    }),
  }
  return { db: { collection: (name) => { if (name !== collectionName) throw new Error('unexpected collection'); return collection } }, rows, collection, projections }
}

const { backupRetentionDays, recordPrivacyErasureTombstone, listPrivacyErasureTombstones } = await import('../lib/privacy/erasureTombstones.mjs')

describe('identity-minimized backup erasure tombstones', () => {
  it('accepts only finite bounded retention values', () => {
    expect(backupRetentionDays('90')).toBe(90)
    expect(backupRetentionDays('1')).toBe(1)
    expect(backupRetentionDays('0')).toBeNull()
    expect(backupRetentionDays('3651')).toBeNull()
    expect(backupRetentionDays('90days')).toBeNull()
    expect(backupRetentionDays(undefined)).toBeNull()
  })

  it('records one exact photo ref idempotently with a finite expiry and no identity or media data', async () => {
    const fixture = buildDb()
    const now = () => new Date('2026-10-23T12:00:00.000Z')
    const target = {
      requestId,
      photoId: '507f1f77bcf86cd799439011',
      submissionId: 'submission-opaque-1',
      eventIds: ['event-b', 'event-a', 'event-a'],
      partnerId: 'partner-1',
    }
    const first = await recordPrivacyErasureTombstone(target, { db: fixture.db, now, retentionDays: 90 })
    const repeat = await recordPrivacyErasureTombstone(target, { db: fixture.db, now, retentionDays: 90 })

    expect(fixture.rows).toHaveLength(1)
    expect(first).toEqual(repeat)
    expect(first.eventIds).toEqual(['event-a', 'event-b'])
    expect(first.expiresAt.toISOString()).toBe('2027-01-21T12:00:00.000Z')
    expect(Object.keys(first).sort()).toEqual(['contractVersion', 'createdAt', 'eventIds', 'expiresAt', 'partnerId', 'photoId', 'requestId', 'retentionDays', 'submissionId'].sort())
    expect(JSON.stringify(first)).not.toMatch(/email|subject|imageUrl|deleteUrl|ciphertext/i)
    expect(fixture.collection.createIndex).toHaveBeenCalledTimes(6)
  })

  it('fails closed on a conflicting target for the same request and photo', async () => {
    const fixture = buildDb()
    const base = { requestId, photoId: '507f1f77bcf86cd799439011', submissionId: 'submission-a', eventIds: ['event-1'], partnerId: 'partner-1' }
    await recordPrivacyErasureTombstone(base, { db: fixture.db, now: () => new Date('2026-10-23T12:00:00.000Z'), retentionDays: 90 })
    await expect(recordPrivacyErasureTombstone({ ...base, submissionId: 'submission-b' }, { db: fixture.db, retentionDays: 90 })).rejects.toMatchObject({ code: 'privacy_erasure_tombstone_conflict' })
  })

  it('leaves expiry absent when policy is not configured so the backup release gate can block safely', async () => {
    const fixture = buildDb()
    const row = await recordPrivacyErasureTombstone({ requestId, photoId: '507f1f77bcf86cd799439011', submissionId: 'submission-1', eventIds: [], partnerId: null }, {
      db: fixture.db,
      now: () => new Date('2026-10-23T12:00:00.000Z'),
      retentionDays: null,
    })
    expect(row.retentionDays).toBeNull()
    expect(row.expiresAt).toBeUndefined()
  })

  it('exports deterministic pages without subject identity and rejects a malformed cursor', async () => {
    const fixture = buildDb()
    const target = (photoId) => ({ requestId, photoId, submissionId: `s-${photoId}`, eventIds: ['event-1'], partnerId: 'partner-1' })
    const now = () => new Date('2026-10-23T12:00:00.000Z')
    await recordPrivacyErasureTombstone(target('507f1f77bcf86cd799439011'), { db: fixture.db, now, retentionDays: 90 })
    await recordPrivacyErasureTombstone(target('507f1f77bcf86cd799439012'), { db: fixture.db, now, retentionDays: 90 })

    const first = await listPrivacyErasureTombstones({ db: fixture.db, now: now(), limit: 1 })
    const second = await listPrivacyErasureTombstones({ db: fixture.db, now: now(), limit: 1, cursor: first.nextCursor })
    expect(first.tombstones.map((row) => row.photoId)).toEqual(['507f1f77bcf86cd799439011'])
    expect(first.complete).toBe(false)
    expect(second.tombstones.map((row) => row.photoId)).toEqual(['507f1f77bcf86cd799439012'])
    expect(second.complete).toBe(true)
    expect(first.retentionPolicy).toEqual({ configured: false, days: null })
    expect(fixture.projections[0]).not.toHaveProperty('subjectRefEncrypted')
    await expect(listPrivacyErasureTombstones({ db: fixture.db, cursor: 'bad' })).rejects.toMatchObject({ code: 'privacy_tombstone_cursor_invalid' })
  })
})
