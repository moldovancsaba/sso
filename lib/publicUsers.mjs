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
