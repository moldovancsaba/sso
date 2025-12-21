/**
 * OAuth2 Client Management Module
 * 
 * Handles CRUD operations for OAuth2 client registrations.
 * Clients represent external applications (like narimato.com) that want to authenticate users via our SSO.
 * 
 * Security:
 * - Client secrets are hashed with bcrypt before storage
 * - Client secrets are only shown once at creation time
 * - Redirect URIs are validated strictly (exact match, no wildcards)
 */

import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'
import { getDb } from '../db.mjs'
import logger from '../logger.mjs'

const BCRYPT_ROUNDS = 12

/**
 * Register a new OAuth2 client
 * 
 * @param {Object} clientData
 * @param {string} clientData.name - Display name of the app (e.g., "Narimato")
 * @param {string} clientData.description - Brief description of the app
 * @param {string[]} clientData.redirect_uris - Allowed redirect URIs (must be exact matches)
 * @param {string[]} clientData.allowed_scopes - Scopes this client can request (e.g., ['openid', 'profile', 'email'])
 * @param {string[]} clientData.grant_types - OAuth2 grant types (default: ['authorization_code', 'refresh_token'])
 * @param {string} clientData.token_endpoint_auth_method - Authentication method (default: 'client_secret_post')
 * @param {string} clientData.owner_user_id - UUID of admin user who created this client
 * @param {boolean} [clientData.require_pkce] - Whether PKCE is required (default: false for confidential clients)
 * @param {string} [clientData.logo_uri] - Optional logo URL
 * @param {string} [clientData.homepage_uri] - Optional homepage URL
 * @returns {Promise<{client: Object, client_secret: string}>} - Returns client object and plaintext secret (only time it's shown)
 */
export async function registerClient(clientData) {
  const {
    name,
    description,
    redirect_uris = [],
    allowed_scopes = ['openid', 'profile', 'email'],
    grant_types = ['authorization_code', 'refresh_token'],
    token_endpoint_auth_method = 'client_secret_post',
    owner_user_id,
    require_pkce = false, // WHAT: PKCE optional for confidential clients (server-side with client_secret)
    logo_uri = null,
    homepage_uri = null,
  } = clientData

  // Validation
  if (!name || !name.trim()) {
    throw new Error('Client name is required')
  }
  if (!owner_user_id) {
    throw new Error('Owner user ID is required')
  }
  if (!redirect_uris || redirect_uris.length === 0) {
    throw new Error('At least one redirect URI is required')
  }
  if (!allowed_scopes || allowed_scopes.length === 0) {
    throw new Error('At least one scope is required')
  }

  // Validate redirect URIs (must be HTTPS in production)
  for (const uri of redirect_uris) {
    try {
      const url = new URL(uri)
      if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') {
        throw new Error(`Redirect URI must use HTTPS in production: ${uri}`)
      }
      // No localhost in production
      if (process.env.NODE_ENV === 'production' && url.hostname === 'localhost') {
        throw new Error(`Localhost redirect URIs not allowed in production: ${uri}`)
      }
    } catch (err) {
      throw new Error(`Invalid redirect URI: ${uri} - ${err.message}`)
    }
  }

  // Generate client_id and client_secret
  const client_id = randomUUID()
  const client_secret = randomUUID() // Plain UUID as secret (will be hashed)
  const client_secret_hash = await bcrypt.hash(client_secret, BCRYPT_ROUNDS)

  const now = new Date().toISOString()

  const client = {
    client_id,
    client_secret: client_secret_hash, // Store hashed version
    name: name.trim(),
    description: description?.trim() || '',
    redirect_uris,
    allowed_scopes,
    grant_types,
    token_endpoint_auth_method,
    require_pkce, // WHAT: Controls whether PKCE is mandatory for this client
    status: 'active',
    owner_user_id,
    logo_uri,
    homepage_uri,
    created_at: now,
    updated_at: now,
  }

  try {
    const db = await getDb()
    const result = await db.collection('oauthClients').insertOne(client)

    logger.info('OAuth client registered', {
      client_id,
      name: client.name,
      owner_user_id,
      redirect_uris,
      allowed_scopes,
    })

    // Return client data WITHOUT the hashed secret, but WITH the plaintext secret (only time it's exposed)
    const { client_secret: _secret, ...clientWithoutSecret } = client
    return {
      client: { ...clientWithoutSecret, _id: result.insertedId },
      client_secret, // Return plaintext secret ONCE
    }
  } catch (error) {
    logger.error('Failed to register OAuth client', { error: error.message, name })
    throw error
  }
}

/**
 * Get OAuth2 client by client_id
 * 
 * @param {string} clientId - Client ID (UUID)
 * @param {boolean} includeSecret - Whether to include the hashed secret (default: false)
 * @returns {Promise<Object|null>} - Client object or null if not found
 */
export async function getClient(clientId, includeSecret = false) {
  if (!clientId) {
    throw new Error('Client ID is required')
  }

  try {
    const db = await getDb()
    const client = await db.collection('oauthClients').findOne({ client_id: clientId })

    if (!client) {
      return null
    }

    // Remove sensitive data unless explicitly requested
    if (!includeSecret) {
      const { client_secret, ...safeClient } = client
      return safeClient
    }

    return client
  } catch (error) {
    logger.error('Failed to get OAuth client', { error: error.message, clientId })
    throw error
  }
}

/**
 * Verify client credentials (for token endpoint authentication)
 * 
 * @param {string} clientId - Client ID
 * @param {string} clientSecret - Plaintext client secret
 * @returns {Promise<Object|null>} - Client object if credentials valid, null otherwise
 */
export async function verifyClient(clientId, clientSecret) {
  if (!clientId || !clientSecret) {
    return null
  }

  try {
    const client = await getClient(clientId, true) // Include hashed secret

    if (!client || client.status !== 'active') {
      logger.warn('Client verification failed: client not found or inactive', { clientId })
      return null
    }

    // Compare plaintext secret with hashed version
    const isValid = await bcrypt.compare(clientSecret, client.client_secret)

    if (!isValid) {
      logger.warn('Client verification failed: invalid secret', { clientId })
      return null
    }

    logger.info('Client verified successfully', { clientId, name: client.name })

    // Return client without secret
    const { client_secret, ...safeClient } = client
    return safeClient
  } catch (error) {
    logger.error('Failed to verify client', { error: error.message, clientId })
    return null
  }
}

/**
 * List all OAuth2 clients (admin only)
 * 
 * @param {Object} filters
 * @param {string} [filters.status] - Filter by status ('active', 'suspended')
 * @param {string} [filters.owner_user_id] - Filter by owner
 * @returns {Promise<Object[]>} - Array of client objects (without secrets)
 */
export async function listClients(filters = {}) {
  const { status, owner_user_id } = filters

  try {
    const db = await getDb()
    const query = {}

    if (status) {
      query.status = status
    }
    if (owner_user_id) {
      query.owner_user_id = owner_user_id
    }

    const clients = await db
      .collection('oauthClients')
      .find(query)
      .project({ client_secret: 0 }) // Exclude secret from results
      .sort({ created_at: -1 })
      .toArray()

    return clients
  } catch (error) {
    logger.error('Failed to list OAuth clients', { error: error.message, filters })
    throw error
  }
}

/**
 * Update OAuth2 client
 * 
 * @param {string} clientId - Client ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} - Updated client object
 */
export async function updateClient(clientId, updates) {
  if (!clientId) {
    throw new Error('Client ID is required')
  }

  // Only allow updating specific fields
  const allowedFields = [
    'name',
    'description',
    'redirect_uris',
    'allowed_scopes',
    'grant_types',
    'token_endpoint_auth_method',
    'require_pkce',
    'status',
    'logo_uri',
    'homepage_uri',
  ]

  const updateData = {}
  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key)) {
      updateData[key] = value
    }
  }

  if (Object.keys(updateData).length === 0) {
    throw new Error('No valid fields to update')
  }

  // Validate redirect_uris if being updated
  if (updateData.redirect_uris) {
    for (const uri of updateData.redirect_uris) {
      try {
        const url = new URL(uri)
        if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') {
          throw new Error(`Redirect URI must use HTTPS in production: ${uri}`)
        }
      } catch (err) {
        throw new Error(`Invalid redirect URI: ${uri} - ${err.message}`)
      }
    }
  }

  updateData.updated_at = new Date().toISOString()

  try {
    const db = await getDb()
    
    // First, verify client exists
    const existingClient = await db.collection('oauthClients').findOne({ client_id: clientId })
    if (!existingClient) {
      throw new Error('Client not found')
    }
    
    // Update the client
    const updateResult = await db
      .collection('oauthClients')
      .updateOne(
        { client_id: clientId },
        { $set: updateData }
      )
    
    if (updateResult.matchedCount === 0) {
      throw new Error('Client not found')
    }
    
    // Fetch and return the updated client
    const updatedClient = await db
      .collection('oauthClients')
      .findOne(
        { client_id: clientId },
        { projection: { client_secret: 0 } }
      )

    logger.info('OAuth client updated', { clientId, updates: Object.keys(updateData) })
    return updatedClient
  } catch (error) {
    logger.error('Failed to update OAuth client', { error: error.message, clientId })
    throw error
  }
}

/**
 * Regenerate client secret
 * 
 * WHAT: Generates a new client secret and replaces the old one
 * WHY: Required when secret is compromised or lost
 * HOW: Generates new UUID secret, hashes it, updates database, returns plaintext ONCE
 * 
 * WARNING: This will invalidate the old secret immediately.
 * All existing refresh tokens remain valid, but new token requests will need the new secret.
 * 
 * @param {string} clientId - Client ID
 * @returns {Promise<{client: Object, client_secret: string}>} - Updated client and new plaintext secret
 */
export async function regenerateClientSecret(clientId) {
  if (!clientId) {
    throw new Error('Client ID is required')
  }

  try {
    // WHAT: Generate new secret and hash it
    const client_secret = randomUUID() // Plain UUID as secret
    const client_secret_hash = await bcrypt.hash(client_secret, BCRYPT_ROUNDS)
    const now = new Date().toISOString()

    const db = await getDb()
    
    // WHAT: Update client with new hashed secret
    const result = await db
      .collection('oauthClients')
      .findOneAndUpdate(
        { client_id: clientId },
        { 
          $set: { 
            client_secret: client_secret_hash,
            updated_at: now,
          } 
        },
        { returnDocument: 'after', projection: { client_secret: 0 } }
      )

    // FIXED: MongoDB driver compatibility - handle both result structures
    const updatedClient = result?.value || result
    
    if (!updatedClient) {
      throw new Error('Client not found')
    }

    logger.warn('OAuth client secret regenerated', { 
      clientId, 
      name: updatedClient.name,
      message: 'Old secret is now invalid' 
    })

    // WHAT: Return client without hashed secret, but with plaintext secret (only time it's shown)
    return {
      client: updatedClient,
      client_secret, // Return plaintext secret ONCE
    }
  } catch (error) {
    logger.error('Failed to regenerate client secret', { error: error.message, clientId })
    throw error
  }
}

/**
 * Delete OAuth2 client
 * 
 * WARNING: This will invalidate all tokens issued to this client.
 * Consider setting status to 'suspended' instead for soft deletion.
 * 
 * @param {string} clientId - Client ID
 * @returns {Promise<boolean>} - True if deleted, false if not found
 */
export async function deleteClient(clientId) {
  if (!clientId) {
    throw new Error('Client ID is required')
  }

  try {
    const db = await getDb()
    const result = await db.collection('oauthClients').deleteOne({ client_id: clientId })

    if (result.deletedCount === 0) {
      return false
    }

    logger.warn('OAuth client deleted', { clientId })
    return true
  } catch (error) {
    logger.error('Failed to delete OAuth client', { error: error.message, clientId })
    throw error
  }
}

/**
 * Validate redirect URI against client's registered URIs
 * 
 * @param {string} clientId - Client ID
 * @param {string} redirectUri - Redirect URI to validate
 * @returns {Promise<boolean>} - True if valid, false otherwise
 */
export async function validateRedirectUri(clientId, redirectUri) {
  if (!clientId || !redirectUri) {
    return false
  }

  try {
    const client = await getClient(clientId)

    if (!client || client.status !== 'active') {
      return false
    }

    // Exact match required (no wildcards or partial matches for security)
    return client.redirect_uris.includes(redirectUri)
  } catch (error) {
    logger.error('Failed to validate redirect URI', { error: error.message, clientId, redirectUri })
    return false
  }
}

/**
 * Check if client supports a specific scope
 * 
 * @param {string} clientId - Client ID
 * @param {string} scope - Scope to check (space-separated string or single scope)
 * @returns {Promise<boolean>} - True if all scopes are allowed, false otherwise
 */
export async function validateClientScopes(clientId, scope) {
  if (!clientId || !scope) {
    return false
  }

  try {
    const client = await getClient(clientId)

    if (!client || client.status !== 'active') {
      return false
    }

    // Parse requested scopes
    const requestedScopes = scope.split(' ').filter(Boolean)

    // Check if all requested scopes are in the client's allowed_scopes
    return requestedScopes.every(s => client.allowed_scopes.includes(s))
  } catch (error) {
    logger.error('Failed to validate client scopes', { error: error.message, clientId, scope })
    return false
  }
}

/**
 * Get all OAuth clients (admin UI helper)
 * WHAT: Returns all active OAuth clients with minimal fields needed for admin UI
 * WHY: Admin UI needs to show all apps when managing user permissions
 * 
 * @returns {Promise<Object[]>} Array of client objects with essential fields only
 */
export async function getAllClients() {
  try {
    const db = await getDb()
    
    // WHAT: Query for active clients only with limited projection
    // WHY: Admin UI only needs basic info (name, ID) to display app list
    const clients = await db
      .collection('oauthClients')
      .find({ status: 'active' })
      .project({
        client_id: 1,
        name: 1,
        description: 1,
        logo_uri: 1,
        homepage_uri: 1,
      })
      .sort({ name: 1 }) // WHAT: Sort alphabetically by name for UI consistency
      .toArray()
    
    // WHAT: Map to clean DTO format
    // WHY: Consistent field naming (clientId vs client_id) for client code
    return clients.map(c => ({
      clientId: c.client_id,
      name: c.name,
      description: c.description || '',
      logoUrl: c.logo_uri || null,
      homepageUrl: c.homepage_uri || null,
    }))
  } catch (error) {
    logger.error('Failed to get all OAuth clients', { error: error.message })
    throw error
  }
}
