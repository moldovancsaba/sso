/**
 * OAuth User Lookup Utility
 * 
 * WHAT: Provides unified user lookup across both admin and public user collections
 * WHY: OAuth flow needs to support both admin users (users collection) and public users (publicUsers collection)
 * HOW: Searches both collections by UUID and returns standardized user object
 * 
 * CONTEXT: Admin users authenticate via dev-login or token-based auth and are stored in `users` collection.
 * Public users register/login via email+password and are stored in `publicUsers` collection.
 * When OAuth authorization creates tokens, it needs to find users in either collection.
 * 
 * CRITICAL: Without this unified lookup, admin users get "User not found" errors during OAuth token generation
 * because `generateIdToken()` only checked the `publicUsers` collection.
 */

import { getDb } from '../db.mjs'
import logger from '../logger.mjs'

/**
 * Find user by UUID in both admin and public user collections
 * 
 * WHAT: Searches for a user by UUID across both collections
 * WHY: OAuth needs to support both admin and public user authentication
 * HOW: Check users collection first (admin), then publicUsers collection
 * 
 * @param {string} userId - User UUID to search for
 * @returns {Promise<Object|null>} Standardized user object or null if not found
 * 
 * Returned object structure:
 * {
 *   id: string,         // UUID
 *   email: string,
 *   name: string,
 *   role: string,       // 'admin', 'super-admin', or 'user'
 *   type: string,       // 'admin' or 'public'
 *   orgId: string|null, // Organization UUID (only for public users)
 *   updatedAt: string   // ISO 8601 timestamp for OIDC updated_at claim
 * }
 */
export async function findUserByUUID(userId) {
  if (!userId) {
    logger.warn('findUserByUUID: userId is required')
    return null
  }

  try {
    const db = await getDb()

    // WHAT: First check the users collection (admin users)
    // WHY: Admin users need OAuth support for testing and admin tool access
    logger.debug('Searching for user in admin collection', { userId })
    const adminUser = await db.collection('users').findOne({ id: userId })

    if (adminUser) {
      logger.info('User found in admin collection', {
        userId,
        email: adminUser.email,
        role: adminUser.role,
      })

      // WHAT: Return standardized user object with type='admin'
      // WHY: Caller needs to know which collection the user came from
      return {
        id: adminUser.id,
        email: adminUser.email,
        name: adminUser.name,
        role: adminUser.role, // 'admin' or 'super-admin'
        type: 'admin',
        orgId: null, // Admin users don't belong to organizations
        updatedAt: adminUser.updatedAt || adminUser.updated_at || new Date().toISOString(),
      }
    }

    // WHAT: Check publicUsers collection if not found in admin
    // WHY: Most OAuth users will be public users from regular registration
    logger.debug('Searching for user in publicUsers collection', { userId })
    const publicUser = await db.collection('publicUsers').findOne({ id: userId })

    if (publicUser) {
      logger.info('User found in publicUsers collection', {
        userId,
        email: publicUser.email,
        orgId: publicUser.orgId || null,
      })

      // WHAT: Return standardized user object with type='public'
      // WHY: Public users may have different authorization rules
      return {
        id: publicUser.id,
        email: publicUser.email,
        name: publicUser.name,
        role: 'user', // Public users have implicit 'user' role
        type: 'public',
        orgId: publicUser.orgId || null,
        updatedAt: publicUser.updatedAt || publicUser.updated_at || new Date().toISOString(),
      }
    }

    // WHAT: User not found in either collection
    // WHY: UUID might be invalid, user deleted, or data corruption
    logger.warn('User not found in any collection', { userId })
    return null

  } catch (error) {
    logger.error('Failed to find user by UUID', {
      error: error.message,
      userId,
      stack: error.stack,
    })
    throw error
  }
}

/**
 * Check if a user exists by UUID
 * 
 * WHAT: Lightweight check if user exists without fetching full data
 * WHY: Useful for validation without the overhead of fetching all user fields
 * HOW: Uses findUserByUUID but only returns boolean
 * 
 * @param {string} userId - User UUID to check
 * @returns {Promise<boolean>} True if user exists, false otherwise
 */
export async function userExists(userId) {
  try {
    const user = await findUserByUUID(userId)
    return user !== null
  } catch (error) {
    logger.error('Failed to check if user exists', {
      error: error.message,
      userId,
    })
    return false
  }
}

/**
 * Get user type by UUID
 * 
 * WHAT: Determine if a user is admin or public without full lookup
 * WHY: Some operations need to know user type for authorization
 * HOW: Check which collection contains the UUID
 * 
 * @param {string} userId - User UUID to check
 * @returns {Promise<'admin'|'public'|null>} User type or null if not found
 */
export async function getUserType(userId) {
  if (!userId) {
    return null
  }

  try {
    const db = await getDb()

    // Check admin users first
    const adminUser = await db.collection('users').findOne({ id: userId }, { projection: { _id: 1 } })
    if (adminUser) {
      return 'admin'
    }

    // Check public users
    const publicUser = await db.collection('publicUsers').findOne({ id: userId }, { projection: { _id: 1 } })
    if (publicUser) {
      return 'public'
    }

    return null
  } catch (error) {
    logger.error('Failed to get user type', {
      error: error.message,
      userId,
    })
    return null
  }
}
