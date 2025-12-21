/**
 * Unified Account Linking Library
 * 
 * WHAT: Centralized account linking logic for all authentication methods
 * WHY: Enable seamless account merging across Email+Password, Facebook, Google, Magic Link
 * HOW: Email address is the primary key - all accounts with same email should merge
 * 
 * Strategy: One person, one email = one account, regardless of login method
 */

import bcrypt from 'bcryptjs'
import { getDb } from './db.mjs'
import logger from './logger.mjs'

const SALT_ROUNDS = 12

/**
 * findUserByEmail
 * 
 * WHAT: Find user account by email, regardless of login method
 * WHY: Central lookup for all authentication flows
 * HOW: Case-insensitive email search in publicUsers collection
 * 
 * @param {string} email - User email address
 * @returns {Promise<Object|null>} User object with full data (including passwordHash if exists)
 */
export async function findUserByEmail(email) {
  if (!email) return null
  
  const db = await getDb()
  const normalizedEmail = String(email).trim().toLowerCase()
  
  const user = await db.collection('publicUsers').findOne({ 
    email: normalizedEmail 
  })
  
  return user || null
}

/**
 * getUserLoginMethods
 * 
 * WHAT: Get list of all linked login methods for a user
 * WHY: Display to user what login options they have
 * HOW: Check for passwordHash and socialProviders fields
 * 
 * @param {Object} user - User object from database
 * @returns {Array<string>} Array of login method names: ['password', 'facebook', 'google']
 */
export function getUserLoginMethods(user) {
  if (!user) return []
  
  const methods = []
  
  // WHAT: Check if user has email+password login
  if (user.passwordHash) {
    methods.push('password')
  }
  
  // WHAT: Check for Facebook login
  if (user.socialProviders?.facebook) {
    methods.push('facebook')
  }
  
  // WHAT: Check for Google login
  if (user.socialProviders?.google) {
    methods.push('google')
  }
  
  return methods
}

/**
 * canLoginWithPassword
 * 
 * WHAT: Check if user can login with email+password
 * WHY: Provide helpful error messages if they try to login with password but only have social login
 * HOW: Check for passwordHash field
 * 
 * @param {Object} user - User object from database
 * @returns {boolean} True if user has password set
 */
export function canLoginWithPassword(user) {
  return Boolean(user?.passwordHash)
}

/**
 * addPasswordToAccount
 * 
 * WHAT: Add email+password login capability to existing account (usually social-only)
 * WHY: Allow users who registered with Facebook/Google to add password for alternate login
 * HOW: Hash password with bcrypt and add to existing user document
 * 
 * Security: Requires strong password (min 8 chars)
 * 
 * @param {string} userId - User UUID
 * @param {string} password - Plain text password (will be hashed)
 * @returns {Promise<Object>} Updated user object
 */
export async function addPasswordToAccount(userId, password) {
  const db = await getDb()
  const usersCollection = db.collection('publicUsers')
  
  // WHAT: Validate password strength
  if (!password || typeof password !== 'string' || password.length < 8) {
    throw new Error('Password must be at least 8 characters long')
  }
  
  // WHAT: Verify user exists
  const user = await usersCollection.findOne({ id: userId })
  if (!user) {
    throw new Error('User not found')
  }
  
  // WHAT: Check if user already has password
  if (user.passwordHash) {
    throw new Error('User already has a password set')
  }
  
  // WHAT: Hash password with bcrypt
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)
  
  const now = new Date().toISOString()
  
  // WHAT: Add password to user account
  const result = await usersCollection.findOneAndUpdate(
    { id: userId },
    {
      $set: {
        passwordHash,
        updatedAt: now,
      }
    },
    { returnDocument: 'after' }
  )
  
  logger.info('Password added to social account', {
    userId,
    email: user.email,
    previousMethods: getUserLoginMethods(user),
    timestamp: now,
  })
  
  return result
}

/**
 * linkLoginMethod
 * 
 * WHAT: Link a new social login method to existing account
 * WHY: Enable multiple login methods for same user
 * HOW: Add social provider data to socialProviders field
 * 
 * Note: This is a generic function for future extensibility
 * Currently, Facebook and Google linking is handled in their respective modules
 * 
 * @param {string} userId - User UUID
 * @param {string} provider - Provider name ('facebook', 'google', etc.)
 * @param {Object} providerData - Provider-specific data
 * @returns {Promise<Object>} Updated user object
 */
export async function linkLoginMethod(userId, provider, providerData) {
  const db = await getDb()
  const usersCollection = db.collection('publicUsers')
  
  // WHAT: Verify user exists
  const user = await usersCollection.findOne({ id: userId })
  if (!user) {
    throw new Error('User not found')
  }
  
  const now = new Date().toISOString()
  
  // WHAT: Prepare social provider data with timestamp
  const providerDataWithTimestamp = {
    ...providerData,
    linkedAt: providerData.linkedAt || now,
    lastLoginAt: now,
  }
  
  // WHAT: Add provider to socialProviders
  const updatePath = `socialProviders.${provider}`
  const result = await usersCollection.findOneAndUpdate(
    { id: userId },
    {
      $set: {
        [updatePath]: providerDataWithTimestamp,
        updatedAt: now,
        lastLoginAt: now,
      }
    },
    { returnDocument: 'after' }
  )
  
  logger.info('Social login method linked to account', {
    userId,
    email: user.email,
    provider,
    timestamp: now,
  })
  
  return result
}

/**
 * getSocialLoginMethodsDisplay
 * 
 * WHAT: Get user-friendly display names for login methods
 * WHY: Show in UI what login options user has
 * HOW: Map internal names to display names
 * 
 * @param {Array<string>} methods - Array of login method names from getUserLoginMethods
 * @returns {Array<Object>} Array of {name, displayName, icon} objects
 */
export function getSocialLoginMethodsDisplay(methods) {
  const displayMap = {
    password: { name: 'password', displayName: 'Email & Password', icon: '✉️' },
    facebook: { name: 'facebook', displayName: 'Facebook', icon: '📘' },
    google: { name: 'google', displayName: 'Google', icon: '🔍' },
  }
  
  return methods.map(method => displayMap[method] || { name: method, displayName: method, icon: '🔐' })
}

/**
 * validateAccountLinking
 * 
 * WHAT: Validate that account linking operation is safe
 * WHY: Prevent edge cases like orphaning users without any login method
 * HOW: Check various safety conditions
 * 
 * @param {Object} user - User object
 * @param {string} operation - Operation type ('add-password', 'remove-password', etc.)
 * @returns {Object} {valid: boolean, error: string}
 */
export function validateAccountLinking(user, operation) {
  const methods = getUserLoginMethods(user)
  
  if (operation === 'add-password') {
    // WHAT: Check if user already has password
    if (methods.includes('password')) {
      return { valid: false, error: 'User already has password' }
    }
    return { valid: true }
  }
  
  if (operation === 'remove-password') {
    // WHAT: Ensure user has at least one other login method
    if (methods.length <= 1) {
      return { valid: false, error: 'Cannot remove password - no other login methods available' }
    }
    return { valid: true }
  }
  
  return { valid: true }
}

/**
 * getAccountLinkingSummary
 * 
 * WHAT: Get comprehensive summary of user's account linking status
 * WHY: Single function to get all account linking info for display
 * HOW: Combine multiple checks into single object
 * 
 * @param {Object} user - User object from database
 * @returns {Object} Summary object with methods, capabilities, timestamps
 */
export function getAccountLinkingSummary(user) {
  if (!user) {
    return {
      methods: [],
      canLoginWithPassword: false,
      canAddPassword: false,
      hasSocialLogins: false,
      socialProviders: {},
    }
  }
  
  const methods = getUserLoginMethods(user)
  const hasSocialLogins = Boolean(user.socialProviders?.facebook || user.socialProviders?.google)
  
  return {
    methods,
    canLoginWithPassword: methods.includes('password'),
    canAddPassword: !methods.includes('password') && hasSocialLogins,
    hasSocialLogins,
    socialProviders: user.socialProviders || {},
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
  }
}

/**
 * validateUnlinking
 * 
 * WHAT: Validate that unlinking a login method is safe
 * WHY: Prevent account lockout by ensuring user always has at least one login method
 * HOW: Count remaining methods after hypothetical removal
 * 
 * CRITICAL: This is a safety function - NEVER allow user to have 0 login methods
 * 
 * @param {Object} user - User object from database
 * @param {string} provider - Provider to unlink ('facebook', 'google', 'password')
 * @returns {Object} {valid: boolean, error: string|null, remainingMethods: number}
 */
export function validateUnlinking(user, provider) {
  if (!user) {
    return { valid: false, error: 'User not found', remainingMethods: 0 }
  }
  
  const currentMethods = getUserLoginMethods(user)
  const remainingMethods = currentMethods.filter(m => m !== provider).length
  
  // WHAT: Safety check - user must have at least 1 method remaining
  // WHY: Prevent account lockout
  if (remainingMethods === 0) {
    return {
      valid: false,
      error: 'Cannot unlink - you must have at least one login method',
      remainingMethods: 0
    }
  }
  
  // WHAT: Check if provider is actually linked
  // WHY: Can't unlink what isn't linked
  if (!currentMethods.includes(provider)) {
    return {
      valid: false,
      error: `${provider} is not linked to this account`,
      remainingMethods: currentMethods.length
    }
  }
  
  return {
    valid: true,
    error: null,
    remainingMethods
  }
}

/**
 * unlinkLoginMethod
 * 
 * WHAT: Remove a social login method (Facebook or Google) from user account
 * WHY: Allow users/admins to unlink social providers they no longer want to use
 * HOW: Use MongoDB $unset to remove socialProviders.facebook or socialProviders.google
 * 
 * SAFETY: Always validates that user has at least 1 other login method remaining
 * 
 * @param {string} userId - User UUID
 * @param {string} provider - Provider to unlink ('facebook' or 'google')
 * @param {string} initiatedBy - Who initiated the unlink ('user' or admin UUID)
 * @returns {Promise<Object>} Updated user object
 * @throws {Error} If validation fails or user would have 0 login methods
 */
export async function unlinkLoginMethod(userId, provider, initiatedBy = 'user') {
  const db = await getDb()
  const usersCollection = db.collection('publicUsers')
  
  // WHAT: Validate provider is supported
  if (!['facebook', 'google'].includes(provider)) {
    throw new Error(`Invalid provider: ${provider}. Must be 'facebook' or 'google'`)
  }
  
  // WHAT: Fetch user to validate unlinking is safe
  const user = await usersCollection.findOne({ id: userId })
  if (!user) {
    throw new Error('User not found')
  }
  
  // WHAT: Safety validation - prevent account lockout
  // WHY: User must always have at least one way to login
  const validation = validateUnlinking(user, provider)
  if (!validation.valid) {
    throw new Error(validation.error)
  }
  
  const now = new Date().toISOString()
  const unsetPath = `socialProviders.${provider}`
  
  // WHAT: Remove social provider from user account
  const result = await usersCollection.findOneAndUpdate(
    { id: userId },
    {
      $unset: { [unsetPath]: '' },
      $set: { updatedAt: now }
    },
    { returnDocument: 'after' }
  )
  
  if (!result) {
    throw new Error('Failed to unlink login method')
  }
  
  logger.info('Social login method unlinked', {
    userId,
    email: user.email,
    provider,
    initiatedBy,
    remainingMethods: validation.remainingMethods,
    timestamp: now,
  })
  
  return result
}

/**
 * removePassword
 * 
 * WHAT: Remove email+password login capability from user account
 * WHY: Allow users/admins to remove password if user prefers social-only login
 * HOW: Use MongoDB $unset to remove passwordHash field
 * 
 * SAFETY: Always validates that user has at least one social login remaining
 * 
 * @param {string} userId - User UUID
 * @param {string} initiatedBy - Who initiated the removal ('user' or admin UUID)
 * @returns {Promise<Object>} Updated user object
 * @throws {Error} If user has no social logins or would have 0 login methods
 */
export async function removePassword(userId, initiatedBy = 'user') {
  const db = await getDb()
  const usersCollection = db.collection('publicUsers')
  
  // WHAT: Fetch user to validate removal is safe
  const user = await usersCollection.findOne({ id: userId })
  if (!user) {
    throw new Error('User not found')
  }
  
  // WHAT: Safety validation - prevent account lockout
  const validation = validateUnlinking(user, 'password')
  if (!validation.valid) {
    throw new Error(validation.error)
  }
  
  const now = new Date().toISOString()
  
  // WHAT: Remove password hash from user account
  const result = await usersCollection.findOneAndUpdate(
    { id: userId },
    {
      $unset: { passwordHash: '' },
      $set: { updatedAt: now }
    },
    { returnDocument: 'after' }
  )
  
  if (!result) {
    throw new Error('Failed to remove password')
  }
  
  logger.info('Password removed from account', {
    userId,
    email: user.email,
    initiatedBy,
    remainingMethods: validation.remainingMethods,
    timestamp: now,
  })
  
  return result
}
