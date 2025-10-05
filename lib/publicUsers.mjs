// WHAT: Public user management for SSO service
// WHY: Enable public user registration and authentication (separate from admin users)
// Strategic: Public users are regular users who register/login to use SSO-protected applications

import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'
import { getDb } from './db.mjs'
import logger from './logger.mjs'

const SALT_ROUNDS = 12

/**
 * WHAT: Create a new public user account
 * WHY: Enable public user registration with email/password
 * 
 * @param {Object} userData - { email, password, name }
 * @returns {Promise<Object>} Created user (without password)
 */
export async function createPublicUser({ email, password, name }) {
  const db = await getDb()
  const usersCollection = db.collection('publicUsers')
  
  // WHAT: Normalize email to lowercase for case-insensitive matching
  const normalizedEmail = String(email || '').trim().toLowerCase()
  
  if (!normalizedEmail || !password || !name) {
    throw new Error('Email, password, and name are required')
  }
  
  // WHAT: Check if user already exists
  const existing = await usersCollection.findOne({ email: normalizedEmail })
  if (existing) {
    throw new Error('User with this email already exists')
  }
  
  // WHAT: Hash password with bcrypt (salt rounds: 12)
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)
  
  const now = new Date().toISOString()
  const user = {
    id: randomUUID(),
    email: normalizedEmail,
    name: String(name).trim(),
    passwordHash,
    role: 'user', // Regular user (not admin)
    status: 'active',
    createdAt: now,
    updatedAt: now,
    lastLoginAt: null,
  }
  
  const result = await usersCollection.insertOne(user)
  
  logger.info('Public user created', {
    userId: user.id,
    email: user.email,
    name: user.name,
  })
  
  // WHAT: Return user without password hash
  const { passwordHash: _, ...userWithoutPassword } = user
  return userWithoutPassword
}

/**
 * WHAT: Validate user credentials and return user if valid
 * WHY: Enable public user login
 * 
 * @param {string} email - User email
 * @param {string} password - User password (plain text)
 * @returns {Promise<Object|null>} User object if valid, null otherwise
 */
export async function validateUserCredentials(email, password) {
  const db = await getDb()
  const usersCollection = db.collection('publicUsers')
  
  const normalizedEmail = String(email || '').trim().toLowerCase()
  
  // WHAT: Find user by email
  const user = await usersCollection.findOne({ email: normalizedEmail })
  if (!user) {
    logger.warn('Login attempt - user not found', { email: normalizedEmail })
    return null
  }
  
  // WHAT: Verify password with bcrypt
  const isValid = await bcrypt.compare(password, user.passwordHash)
  if (!isValid) {
    logger.warn('Login attempt - invalid password', { email: normalizedEmail, userId: user.id })
    return null
  }
  
  // WHAT: Update last login timestamp
  const now = new Date().toISOString()
  await usersCollection.updateOne(
    { _id: user._id },
    { 
      $set: { 
        lastLoginAt: now,
        updatedAt: now,
      } 
    }
  )
  
  logger.info('User login successful', {
    userId: user.id,
    email: user.email,
  })
  
  // WHAT: Return user without password hash
  const { passwordHash: _, ...userWithoutPassword } = user
  return userWithoutPassword
}

/**
 * WHAT: Find public user by ID
 * WHY: Used for session validation
 * 
 * @param {string} userId - User UUID
 * @returns {Promise<Object|null>} User object (without password) or null
 */
export async function findPublicUserById(userId) {
  const db = await getDb()
  const usersCollection = db.collection('publicUsers')
  
  const user = await usersCollection.findOne({ id: userId })
  if (!user) return null
  
  // WHAT: Return user without password hash
  const { passwordHash: _, ...userWithoutPassword } = user
  return userWithoutPassword
}

/**
 * WHAT: Find public user by email
 * WHY: Used for checking if user exists during registration
 * 
 * @param {string} email - User email
 * @returns {Promise<Object|null>} User object (without password) or null
 */
export async function findPublicUserByEmail(email) {
  const db = await getDb()
  const usersCollection = db.collection('publicUsers')
  
  const normalizedEmail = String(email || '').trim().toLowerCase()
  const user = await usersCollection.findOne({ email: normalizedEmail })
  if (!user) return null
  
  // WHAT: Return user without password hash
  const { passwordHash: _, ...userWithoutPassword } = user
  return userWithoutPassword
}

/**
 * WHAT: Update public user profile
 * WHY: Enable users to update their name or email
 * 
 * @param {string} userId - User UUID
 * @param {Object} updates - { name?, email? }
 * @returns {Promise<Object>} Updated user
 */
export async function updatePublicUser(userId, updates) {
  const db = await getDb()
  const usersCollection = db.collection('publicUsers')
  
  const updateFields = {}
  
  if (updates.name) {
    updateFields.name = String(updates.name).trim()
  }
  
  if (updates.email) {
    const normalizedEmail = String(updates.email).trim().toLowerCase()
    // Check if email is already taken
    const existing = await usersCollection.findOne({ 
      email: normalizedEmail,
      id: { $ne: userId }
    })
    if (existing) {
      throw new Error('Email already in use')
    }
    updateFields.email = normalizedEmail
  }
  
  if (Object.keys(updateFields).length === 0) {
    throw new Error('No updates provided')
  }
  
  updateFields.updatedAt = new Date().toISOString()
  
  const result = await usersCollection.findOneAndUpdate(
    { id: userId },
    { $set: updateFields },
    { returnDocument: 'after' }
  )
  
  if (!result) {
    throw new Error('User not found')
  }
  
  logger.info('Public user updated', {
    userId,
    updates: Object.keys(updateFields),
  })
  
  // WHAT: Return user without password hash
  const { passwordHash: _, ...userWithoutPassword } = result
  return userWithoutPassword
}

/**
 * WHAT: Change user password
 * WHY: Enable users to update their password
 * 
 * @param {string} userId - User UUID
 * @param {string} currentPassword - Current password (for verification)
 * @param {string} newPassword - New password
 * @returns {Promise<boolean>} Success
 */
export async function changeUserPassword(userId, currentPassword, newPassword) {
  const db = await getDb()
  const usersCollection = db.collection('publicUsers')
  
  // WHAT: Verify current password
  const user = await usersCollection.findOne({ id: userId })
  if (!user) {
    throw new Error('User not found')
  }
  
  const isValid = await bcrypt.compare(currentPassword, user.passwordHash)
  if (!isValid) {
    throw new Error('Current password is incorrect')
  }
  
  // WHAT: Hash new password
  const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS)
  
  await usersCollection.updateOne(
    { id: userId },
    { 
      $set: { 
        passwordHash: newPasswordHash,
        updatedAt: new Date().toISOString(),
      } 
    }
  )
  
  logger.info('User password changed', { userId })
  
  return true
}

/**
 * resetPassword
 * WHAT: Resets public user password without requiring current password.
 * WHY: Used by password reset flow where user proves identity via email token.
 * 
 * @param {Object} params
 * @param {string} params.userId - User's UUID
 * @param {string} params.newPlainPassword - New password in plain text
 * @returns {Promise<boolean>} - Success
 * @throws {Error} - If user not found or password invalid
 */
export async function resetPassword({ userId, newPlainPassword }) {
  const db = await getDb()
  const usersCollection = db.collection('publicUsers')
  
  // WHAT: Validate new password
  // WHY: Ensure minimum password strength requirements
  if (!newPlainPassword || typeof newPlainPassword !== 'string' || newPlainPassword.length < 8) {
    throw new Error('Password must be at least 8 characters')
  }
  
  // WHAT: Verify user exists
  // WHY: Fail fast if user ID is invalid
  const user = await usersCollection.findOne({ id: userId })
  if (!user) {
    throw new Error('User not found')
  }
  
  // WHAT: Hash new password with bcrypt (reuse existing SALT_ROUNDS)
  // WHY: Consistent with existing password storage; secure hashing
  const newPasswordHash = await bcrypt.hash(newPlainPassword, SALT_ROUNDS)
  
  // WHAT: Update password and timestamp
  // WHY: Password reset is security-critical; requires audit trail
  await usersCollection.updateOne(
    { id: userId },
    { 
      $set: { 
        passwordHash: newPasswordHash,
        updatedAt: new Date().toISOString(),
      } 
    }
  )
  
  logger.info('Public user password reset', { userId })
  
  return true
}

/**
 * setEmailVerified
 * WHAT: Marks public user's email as verified with timestamp.
 * WHY: Email verification enables password reset and confirms account ownership.
 * 
 * @param {Object} params
 * @param {string} params.userId - User's UUID
 * @param {boolean} [params.value=true] - Verification status (default: true)
 * @param {string} [params.at] - Verification timestamp (default: now)
 * @returns {Promise<Object>} - Updated user document (without password)
 * @throws {Error} - If user not found
 */
export async function setEmailVerified({ userId, value = true, at }) {
  const db = await getDb()
  const usersCollection = db.collection('publicUsers')
  const now = new Date().toISOString()
  const verifiedAt = value ? (at || now) : null
  
  // WHAT: Update email verification status and timestamp
  // WHY: Track when email was verified for security and audit purposes
  const result = await usersCollection.findOneAndUpdate(
    { id: userId },
    { 
      $set: { 
        emailVerified: value,
        emailVerifiedAt: verifiedAt,
        updatedAt: now
      } 
    },
    { returnDocument: 'after' }
  )
  
  if (!result) {
    throw new Error('User not found')
  }
  
  logger.info('Public user email verification status updated', {
    userId,
    emailVerified: value,
    verifiedAt,
  })
  
  // WHAT: Return user without password hash
  // WHY: Security; never expose password hashes
  const { passwordHash: _, ...userWithoutPassword } = result
  return userWithoutPassword
}
