import { randomUUID } from 'node:crypto'
import { getDb } from '../db.mjs'
import { decryptSubjectRef, encryptSubjectRef, resolveErasureSubjectProof, recordTargetReceipt } from './erasureCases.mjs'
import { recordPrivacyErasureTombstone } from './erasureTombstones.mjs'

const CASES = 'privacyErasureCases'
const LEASE_MS = 50_000
const MAX_BACKOFF_MS = 15 * 60_000
const PHOTO_ID = /^[0-9a-f]{24}$/i
const sleepForAttempt = (attempt) => Math.min(30_000 * (2 ** Math.min(attempt, 5)), MAX_BACKOFF_MS)

class IntegrationError extends Error {
  constructor(code, retryable = true) { super(code); this.code = code; this.retryable = retryable }
}

function requiredEnv(key) {
  const value = process.env[key]?.trim()
  if (!value) throw new IntegrationError('integration_not_configured', false)
  return value
}

function baseUrl(key) { return requiredEnv(key).replace(/\/$/, '') }

async function requestJson(url, { headers = {}, body, method = 'POST' } = {}) {
  let response
  try {
    response = await fetch(url, {
      method,
      headers: { accept: 'application/json', ...(body ? { 'content-type': 'application/json' } : {}), ...headers },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(15_000),
    })
  } catch {
    throw new IntegrationError('integration_unavailable')
  }
  const payload = await response.json().catch(() => ({}))
  const data = payload?.data && typeof payload.data === 'object' ? payload.data : payload
  if (!response.ok && response.status !== 202) {
    const code = typeof data?.error === 'string' ? data.error : `integration_http_${response.status}`
    throw new IntegrationError(code, response.status >= 500 || response.status === 429)
  }
  return { status: response.status, data }
}

function safeMatch(match) {
  if (!match || typeof match !== 'object' || !PHOTO_ID.test(match.photo_id || '') ||
    typeof match.submission_id !== 'string' || !match.submission_id.trim() || match.submission_id.length > 128 ||
    !Array.isArray(match.event_ids) || match.event_ids.some((id) => typeof id !== 'string' || !id.trim() || id.length > 128)) {
    throw new IntegrationError('camera_resolver_contract_invalid', false)
  }
  return {
    photoId: match.photo_id.toLowerCase(),
    submissionId: match.submission_id,
    eventIds: [...new Set(match.event_ids)],
    partnerId: typeof match.partner_id === 'string' && match.partner_id.trim() ? match.partner_id.trim() : null,
    cameraDone: false,
    fanmassIndex: 0,
    messmassIndex: 0,
    fanmassDone: match.event_ids.length === 0,
    messmassDone: match.event_ids.length === 0,
  }
}

async function cameraResolve(requestId, cursor) {
  const { data } = await requestJson(`${baseUrl('SSO_PRIVACY_CAMERA_BASE_URL')}/api/internal/privacy/resolve-subject`, {
    headers: { 'x-camera-privacy-resolver-secret': requiredEnv('SSO_PRIVACY_CAMERA_RESOLVER_SECRET') },
    body: { request_id: requestId, limit: 1, ...(cursor ? { cursor } : {}) },
  })
  if (data?.request_id !== requestId || !['resolved', 'no_match', 'ambiguous', 'invalid_proof', 'temporarily_unavailable'].includes(data?.status)) {
    throw new IntegrationError('camera_resolver_contract_invalid', false)
  }
  return data
}

async function cameraErase(requestId, photo) {
  const { data } = await requestJson(`${baseUrl('SSO_PRIVACY_CAMERA_BASE_URL')}/api/internal/privacy/erase`, {
    headers: { 'x-camera-privacy-resolver-secret': requiredEnv('SSO_PRIVACY_CAMERA_RESOLVER_SECRET') },
    body: { request_id: requestId, photos: [{ photo_id: photo.photoId, submission_id: photo.submissionId, event_id: null }] },
  })
  const item = data?.photos?.[0]
  if (!item || item.photo_id !== photo.photoId) throw new IntegrationError('camera_erase_contract_invalid', false)
  return item.status
}

async function cameraStatus(requestId, photoId) {
  const { data } = await requestJson(`${baseUrl('SSO_PRIVACY_CAMERA_BASE_URL')}/api/internal/privacy/erasure-status`, {
    headers: { 'x-camera-privacy-resolver-secret': requiredEnv('SSO_PRIVACY_CAMERA_RESOLVER_SECRET') },
    body: { request_id: requestId, photo_ids: [photoId] },
  })
  const item = data?.photos?.[0]
  if (!item || item.photo_id !== photoId) throw new IntegrationError('camera_status_contract_invalid', false)
  return item.status
}

async function eraseFanmass(requestId, eventId, photoId) {
  const base = baseUrl('SSO_PRIVACY_FANMASS_BASE_URL')
  const key = requiredEnv('SSO_PRIVACY_FANMASS_API_KEY')
  const path = `/api/integrations/camera/events/${encodeURIComponent(eventId)}/photos/${encodeURIComponent(photoId)}/erasure`
  const headers = { 'X-API-Key': key }
  const { status, data } = await requestJson(`${base}${path}`, { method: 'DELETE', headers, body: { request_id: requestId } })
  if (status === 202 || data.status === 'pending' || data.status === 'in_progress') return false
  if (!['complete', 'deleted'].includes(data.status)) throw new IntegrationError('fanmass_erasure_unconfirmed', data.status !== 'route_review_required')
  return true
}

async function readFanmassErasure(requestId, eventId, photoId) {
  const base = baseUrl('SSO_PRIVACY_FANMASS_BASE_URL')
  const key = requiredEnv('SSO_PRIVACY_FANMASS_API_KEY')
  const path = `/api/integrations/camera/events/${encodeURIComponent(eventId)}/photos/${encodeURIComponent(photoId)}/erasure?request_id=${encodeURIComponent(requestId)}`
  const { status, data } = await requestJson(`${base}${path}`, { method: 'GET', headers: { 'X-API-Key': key } })
  if (status === 202 || ['pending', 'in_progress'].includes(data.status)) return false
  if (!['complete', 'deleted'].includes(data.status)) throw new IntegrationError('fanmass_erasure_unconfirmed', data.status !== 'route_review_required')
  return true
}

async function eraseMessmass(requestId, eventId, photo) {
  const { data } = await requestJson(`${baseUrl('SSO_PRIVACY_MESSMASS_BASE_URL')}/api/integrations/privacy/erase-camera-photo`, {
    method: 'DELETE',
    headers: { 'x-sso-privacy-secret': requiredEnv('SSO_PRIVACY_MESSMASS_SECRET') },
    body: {
      request_id: requestId,
      camera_partner_id: photo.partnerId,
      camera_event_id: eventId,
      camera_photo_id: photo.photoId,
    },
  })
  if (data.status !== 'deleted') throw new IntegrationError('messmass_erasure_unconfirmed')
  return true
}

async function deleteSsoSubject(subjectProof) {
  if (subjectProof?.subject?.kind !== 'sso_user' || typeof subjectProof.subject.id !== 'string') return 'not_found'
  const db = await getDb()
  const userId = subjectProof.subject.id
  const result = await db.collection('publicUsers').deleteOne({ id: userId })
  // These records are exact stable-account references. Delete idempotently as
  // one SSO target; the case ledger is separate and retains no plaintext ID.
  const related = await Promise.all([
    db.collection('publicSessions').deleteMany({ userId }),
    db.collection('authorizationCodes').deleteMany({ userId }),
    db.collection('accessTokens').deleteMany({ userId }),
    db.collection('refreshTokens').deleteMany({ userId }),
    db.collection('loginPins').deleteMany({ userId }),
    db.collection('appPermissions').deleteMany({ userId }),
    ...(subjectProof.verifiedEmail?.proof === 'sso_account_email_verified'
      ? [db.collection('publicMagicTokens').deleteMany({ email: subjectProof.verifiedEmail.value })]
      : []),
  ])
  return result.deletedCount || related.some((item) => item.deletedCount > 0) ? 'deleted' : 'not_found'
}

async function saveProgress(cases, caseDoc, token, patch) {
  const result = await cases.updateOne(
    { requestId: caseDoc.requestId, 'coordinator.leaseToken': token, state: { $in: ['deleting', 'partially_failed'] } },
    { $set: Object.fromEntries(Object.entries(patch).map(([key, value]) => [`coordinator.${key}`, value])) },
  )
  if (result.modifiedCount !== 1) throw new IntegrationError('coordinator_lease_lost', true)
}

async function writeTerminalReceipt(requestId, target, status, operationKey) {
  return recordTargetReceipt({
    requestId,
    target,
    body: { status, ...(status === 'retryable_failure' || status === 'permanent_failure' ? { reasonCode: 'technical_failure' } : {}) },
    idempotencyKey: operationKey,
    actor: { type: 'service', id: 'privacy_coordinator' },
  })
}

/** Process at most one exact Camera photo and one event-photo record per invocation. */
export async function processOneErasureStep({ now = () => new Date(), dbProvider = getDb } = {}) {
  const db = await dbProvider()
  const cases = db.collection(CASES)
  const nowDate = now()
  const leaseToken = randomUUID()
  await cases.createIndex({ state: 1, 'coordinator.nextAttemptAt': 1, updatedAt: 1 }, { name: 'privacy_coordinator_due' })
  const found = await cases.findOneAndUpdate(
    {
      state: { $in: ['deleting', 'partially_failed'] },
      'decision.outcome': 'approved',
      'coordinator.blocked': { $ne: true },
      'coordinator.status': { $ne: 'awaiting_backup_receipt' },
      $and: [
        { $or: [{ 'coordinator.leaseUntil': { $exists: false } }, { 'coordinator.leaseUntil': { $lte: nowDate } }] },
        { $or: [{ 'coordinator.nextAttemptAt': { $exists: false } }, { 'coordinator.nextAttemptAt': { $lte: nowDate } }] },
      ],
    },
    { $set: { 'coordinator.leaseToken': leaseToken, 'coordinator.leaseUntil': new Date(nowDate.getTime() + LEASE_MS), 'coordinator.lastAttemptAt': nowDate } },
    { sort: { updatedAt: 1 }, returnDocument: 'after' },
  )
  const caseDoc = found?.value || found
  if (!caseDoc?.requestId) return { status: 'idle' }

  try {
    let coordinator = caseDoc.coordinator || {}
    let subjectProof
    try {
      subjectProof = await resolveErasureSubjectProof({ requestId: caseDoc.requestId, actor: { type: 'service', id: 'privacy_coordinator' } })
      if (subjectProof.subject?.kind === 'sso_user' && !coordinator.ssoSubjectProofEncrypted) {
        coordinator.ssoSubjectProofEncrypted = encryptSubjectRef(subjectProof)
        await saveProgress(cases, caseDoc, leaseToken, coordinator)
      }
    } catch (proofError) {
      if (!coordinator.ssoSubjectProofEncrypted) throw proofError
      subjectProof = decryptSubjectRef(coordinator.ssoSubjectProofEncrypted)
      if (subjectProof?.kind === 'sso_user') subjectProof = { version: 1, subject: subjectProof, ...(subjectProof.verifiedEmail ? { verifiedEmail: subjectProof.verifiedEmail } : {}) }
      else if (!subjectProof?.subject?.kind) throw new IntegrationError('coordinator_subject_recovery_invalid', false)
    }
    if (!coordinator.currentPhoto && coordinator.snapshotComplete !== true) {
      const page = await cameraResolve(caseDoc.requestId, coordinator.cursor || null)
      if (page.status === 'ambiguous' || page.status === 'invalid_proof') {
        await saveProgress(cases, caseDoc, leaseToken, { blocked: true, status: 'needs_review', lastErrorCode: page.reason_code || 'camera_identity_ambiguous', leaseUntil: nowDate, nextAttemptAt: nowDate })
        return { status: 'needs_review', reason: page.reason_code || 'camera_identity_ambiguous' }
      }
      if (page.status === 'temporarily_unavailable') throw new IntegrationError('camera_resolver_unavailable')
      const matches = Array.isArray(page.matches) ? page.matches : []
      if (matches.length > 1) throw new IntegrationError('camera_resolver_returned_multiple_photos', false)
      if (matches.length === 1) {
        const photo = safeMatch(matches[0])
        coordinator = { ...coordinator, currentPhoto: photo, cursor: page.next_cursor || null, snapshotComplete: page.complete === true, photoCount: (coordinator.photoCount || 0) + 1 }
        await saveProgress(cases, caseDoc, leaseToken, coordinator)
      } else if (page.complete === true) {
        coordinator = { ...coordinator, snapshotComplete: true, cursor: null }
        await saveProgress(cases, caseDoc, leaseToken, coordinator)
      } else if (page.next_cursor) {
        coordinator = { ...coordinator, cursor: page.next_cursor }
        await saveProgress(cases, caseDoc, leaseToken, coordinator)
        return { status: 'snapshot_advanced' }
      } else {
        throw new IntegrationError('camera_resolver_page_incomplete', false)
      }
      if (!coordinator.currentPhoto) return { status: 'snapshot_complete', photoCount: coordinator.photoCount || 0 }
    }

    const photo = coordinator.currentPhoto
    if (photo) {
      // Upgrade/recovery path: older coordinator versions could have persisted
      // cameraDone before this independent journal existed. Backfill it before
      // any downstream stage can discard currentPhoto.
      if (photo.cameraDone && photo.cameraResult === 'media_erased' && photo.backupTombstoneSaved !== true) {
        await recordPrivacyErasureTombstone({
          requestId: caseDoc.requestId,
          photoId: photo.photoId,
          submissionId: photo.submissionId,
          eventIds: photo.eventIds,
          partnerId: photo.partnerId,
        }, { db, now })
        photo.backupTombstoneSaved = true
        coordinator = { ...coordinator, currentPhoto: photo }
        await saveProgress(cases, caseDoc, leaseToken, coordinator)
      }
      if (!photo.cameraDone) {
        const requested = await cameraErase(caseDoc.requestId, photo)
        const cameraState = ['not_found', 'media_erased', 'media_failed', 'media_review_required', 'failed'].includes(requested)
          ? requested
          : await cameraStatus(caseDoc.requestId, photo.photoId)
        if (['media_review_required', 'media_failed', 'failed', 'retryable_failure', 'permanent_failure'].includes(cameraState)) {
          await saveProgress(cases, caseDoc, leaseToken, { ...coordinator, blocked: cameraState === 'media_review_required', status: cameraState === 'media_review_required' ? 'needs_review' : 'retrying', lastErrorCode: `camera_${cameraState}`, nextAttemptAt: new Date(nowDate.getTime() + sleepForAttempt((coordinator.retryCount || 0) + 1)), retryCount: (coordinator.retryCount || 0) + 1 })
          return { status: cameraState }
        }
        if (cameraState !== 'media_erased' && cameraState !== 'not_found') {
          await saveProgress(cases, caseDoc, leaseToken, { ...coordinator, status: 'waiting_for_camera_media', nextAttemptAt: new Date(nowDate.getTime() + 30_000) })
          return { status: 'waiting_for_camera_media' }
        }
        // Persist the independent replay fence before advancing past this photo.
        // If this write fails, the coordinator retries the idempotent Camera call
        // and does not drop currentPhoto from its durable work state.
        if (cameraState === 'media_erased') {
          await recordPrivacyErasureTombstone({
            requestId: caseDoc.requestId,
            photoId: photo.photoId,
            submissionId: photo.submissionId,
            eventIds: photo.eventIds,
            partnerId: photo.partnerId,
          }, { db, now })
          photo.backupTombstoneSaved = true
        }
        photo.cameraDone = true
        photo.cameraResult = cameraState
        coordinator.cameraDeletedCount = (coordinator.cameraDeletedCount || 0) + (cameraState === 'media_erased' ? 1 : 0)
        coordinator = { ...coordinator, currentPhoto: photo }
        await saveProgress(cases, caseDoc, leaseToken, coordinator)
      }

      if (!photo.fanmassDone) {
        if (photo.fanmassIndex >= photo.eventIds.length) photo.fanmassDone = true
        else {
          const eventId = photo.eventIds[photo.fanmassIndex]
          const done = photo.fanmassPending
            ? await readFanmassErasure(caseDoc.requestId, eventId, photo.photoId).catch(async (error) => {
              if (error instanceof IntegrationError && error.code === 'integration_http_404') {
                return eraseFanmass(caseDoc.requestId, eventId, photo.photoId)
              }
              throw error
            })
            : await eraseFanmass(caseDoc.requestId, eventId, photo.photoId)
          if (done) {
            photo.fanmassIndex += 1
            photo.fanmassPending = false
            coordinator.fanmassDeletedCount = (coordinator.fanmassDeletedCount || 0) + 1
          } else photo.fanmassPending = true
          photo.fanmassDone = photo.fanmassIndex >= photo.eventIds.length
          coordinator = { ...coordinator, currentPhoto: photo }
          await saveProgress(cases, caseDoc, leaseToken, { ...coordinator, status: photo.fanmassDone ? 'processing_photo' : 'waiting_for_fanmass' })
          if (!photo.fanmassDone) return { status: 'waiting_for_fanmass' }
        }
      }

      if (!photo.messmassDone) {
        if (!photo.partnerId) throw new IntegrationError('camera_partner_reference_missing', false)
        const eventId = photo.eventIds[photo.messmassIndex]
        if (!eventId) photo.messmassDone = true
        else {
          await eraseMessmass(caseDoc.requestId, eventId, photo)
          photo.messmassIndex += 1
          coordinator.messmassDeletedCount = (coordinator.messmassDeletedCount || 0) + 1
          photo.messmassDone = photo.messmassIndex >= photo.eventIds.length
          coordinator = { ...coordinator, currentPhoto: photo }
          await saveProgress(cases, caseDoc, leaseToken, { ...coordinator, status: photo.messmassDone ? 'processing_photo' : 'waiting_for_messmass' })
          if (!photo.messmassDone) return { status: 'waiting_for_messmass' }
        }
      }

      if (photo.cameraDone && photo.fanmassDone && photo.messmassDone) {
        coordinator.completedPhotoCount = (coordinator.completedPhotoCount || 0) + 1
        coordinator.currentPhoto = null
        await saveProgress(cases, caseDoc, leaseToken, { ...coordinator, status: coordinator.snapshotComplete ? 'finalizing' : 'resolving_next_photo' })
        return { status: 'photo_erased', photoCount: coordinator.completedPhotoCount }
      }
    }

    if (coordinator.snapshotComplete && !coordinator.currentPhoto) {
      const noMatches = (coordinator.photoCount || 0) === 0
      const cameraReceipt = noMatches ? 'not_found' : 'deleted'
      const fanmassReceipt = (coordinator.fanmassDeletedCount || 0) === 0 ? 'not_found' : 'deleted'
      const messmassReceipt = (coordinator.messmassDeletedCount || 0) === 0 ? 'not_found' : 'deleted'
      const ssoReceipt = await deleteSsoSubject(subjectProof)
      const keyBase = `${caseDoc.requestId}-privacy-coordinator-v1`
      await writeTerminalReceipt(caseDoc.requestId, 'camera', cameraReceipt, `${keyBase}-camera`)
      await writeTerminalReceipt(caseDoc.requestId, 'fanmass', fanmassReceipt, `${keyBase}-fanmass`)
      await writeTerminalReceipt(caseDoc.requestId, 'messmass', messmassReceipt, `${keyBase}-messmass`)
      await writeTerminalReceipt(caseDoc.requestId, 'sso', ssoReceipt, `${keyBase}-sso`)
      await cases.updateOne(
        { requestId: caseDoc.requestId, 'coordinator.leaseToken': leaseToken },
        { $unset: { subjectRefEncrypted: '', 'coordinator.ssoSubjectProofEncrypted': '' } },
      )
      delete coordinator.ssoSubjectProofEncrypted
      await saveProgress(cases, caseDoc, leaseToken, { ...coordinator, status: 'awaiting_backup_receipt', completedAt: nowDate, lastErrorCode: null, nextAttemptAt: null })
      return { status: 'awaiting_backup_receipt', photoCount: coordinator.completedPhotoCount || 0 }
    }
    return { status: coordinator.status || 'in_progress' }
  } catch (error) {
    const attempt = (caseDoc.coordinator?.retryCount || 0) + 1
    const permanent = error instanceof IntegrationError && !error.retryable
    await saveProgress(cases, caseDoc, leaseToken, {
      ...(caseDoc.coordinator || {}),
      blocked: permanent,
      status: permanent ? 'needs_review' : 'retrying',
      lastErrorCode: error instanceof IntegrationError ? error.code : 'coordinator_internal_error',
      retryCount: attempt,
      nextAttemptAt: permanent ? null : new Date(nowDate.getTime() + sleepForAttempt(attempt)),
    })
    return { status: permanent ? 'needs_review' : 'retrying', reason: error instanceof IntegrationError ? error.code : 'coordinator_internal_error' }
  } finally {
    await cases.updateOne(
      { requestId: caseDoc.requestId, 'coordinator.leaseToken': leaseToken },
      { $unset: { 'coordinator.leaseToken': '', 'coordinator.leaseUntil': '' } },
    )
  }
}
