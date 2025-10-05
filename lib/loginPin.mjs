/**
 * lib/loginPin.mjs - Random PIN verification for login security
 * WHAT: Generates and validates PINs sent to users randomly between 5th-10th login
 * WHY: Additional security layer without constant friction
 */

import { getDb } from './db.mjs'
import crypto from 'crypto'
import logger from './logger.mjs'

const COLLECTION = 'loginPins'
const PIN_TTL_SECONDS = 300 // 5 minutes
const MIN_LOGIN_TRIGGER = 5
const MAX_LOGIN_TRIGGER = 10

/**
 * generatePin
 * WHAT: Generates a random 6-digit PIN
 * WHY: Easy to type, memorable, secure enough for short TTL
 */
function generatePin() {
  return crypto.randomInt(100000, 999999).toString()
}

/**
 * shouldTriggerPin
 * WHAT: Determines if PIN should be requested based on login count
 * WHY: Random between 5-10 logins to be unpredictable but not annoying
 */
export function shouldTriggerPin(loginCount) {
  if (loginCount < MIN_LOGIN_TRIGGER) return false
  if (loginCount >= MAX_LOGIN_TRIGGER) {
    // Reset trigger on 10th login
    return loginCount % MAX_LOGIN_TRIGGER === 0
  }
  // Random chance between 5-9 logins
  return Math.random() < 0.3 // 30% chance per login
}

/**
 * issuePin
 * WHAT: Creates a PIN for a user and stores it with TTL
 * WHY: User must verify via email to complete login
 */
export async function issuePin({ userId, email, userType = 'admin' }) {
  const db = await getDb()
  const pin = generatePin()
  const now = new Date()
  const expiresAt = new Date(now.getTime() + PIN_TTL_SECONDS * 1000)

  const pinDoc = {
    pin,
    userId,
    email: email.toLowerCase(),
    userType,
    verified: false,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    attempts: 0,
  }

  await db.collection(COLLECTION).insertOne(pinDoc)

  logger.info('Login PIN issued', {
    event: 'login_pin_issued',
    userId,
    email,
    userType,
    expiresAt: expiresAt.toISOString(),
  })

  return { pin, expiresAt }
}

/**
 * verifyPin
 * WHAT: Validates user-submitted PIN
 * WHY: Confirms email ownership and identity
 */
export async function verifyPin({ userId, pin, userType = 'admin' }) {
  const db = await getDb()
  const now = new Date()

  // Find PIN document
  const pinDoc = await db.collection(COLLECTION).findOne({
    userId,
    userType,
    verified: false,
    expiresAt: { $gt: now.toISOString() },
  })

  if (!pinDoc) {
    logger.warn('PIN verification failed: not found or expired', {
      event: 'login_pin_invalid',
      userId,
      userType,
    })
    return { valid: false, error: 'PIN expired or not found' }
  }

  // Check attempts
  if (pinDoc.attempts >= 3) {
    logger.warn('PIN verification failed: too many attempts', {
      event: 'login_pin_too_many_attempts',
      userId,
      userType,
    })
    return { valid: false, error: 'Too many attempts' }
  }

  // Verify PIN
  if (pinDoc.pin !== pin) {
    // Increment attempts
    await db.collection(COLLECTION).updateOne(
      { _id: pinDoc._id },
      { $inc: { attempts: 1 } }
    )

    logger.warn('PIN verification failed: incorrect PIN', {
      event: 'login_pin_incorrect',
      userId,
      userType,
      attempts: pinDoc.attempts + 1,
    })

    return { valid: false, error: 'Incorrect PIN' }
  }

  // Mark as verified
  await db.collection(COLLECTION).updateOne(
    { _id: pinDoc._id },
    { 
      $set: { 
        verified: true,
        verifiedAt: now.toISOString(),
      } 
    }
  )

  logger.info('PIN verified successfully', {
    event: 'login_pin_verified',
    userId,
    userType,
  })

  return { valid: true }
}

/**
 * cleanupExpiredPins
 * WHAT: Removes expired PIN documents
 * WHY: Keep collection clean, TTL index does this automatically
 */
export async function ensurePinIndexes() {
  const db = await getDb()
  const collection = db.collection(COLLECTION)

  // Create TTL index on expiresAt
  await collection.createIndex(
    { expiresAt: 1 },
    { expireAfterSeconds: 0, name: 'pin_ttl' }
  )

  // Create index for lookups
  await collection.createIndex(
    { userId: 1, userType: 1, verified: 1 },
    { name: 'pin_lookup' }
  )

  logger.info('Login PIN indexes ensured')
}
