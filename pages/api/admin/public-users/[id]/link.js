/**
 * Admin API - Manual Account Linking
 * 
 * WHAT: Allows admins to manually link Facebook or Google social providers to any user account
 * WHY: Enable admins to fix account linking issues or manually link users who can't login
 * HOW: POST endpoint with validation, calls linkLoginMethod(), audit logs the operation
 * 
 * Security: Admin-only endpoint with email consistency validation
 */

import { requireUnifiedAdmin } from '../../../../../lib/auth.mjs'
import { linkLoginMethod, getUserLoginMethods } from '../../../../../lib/accountLinking.mjs'
import { getDb } from '../../../../../lib/db.mjs'
import { logAuditEvent, AuditAction } from '../../../../../lib/auditLog.mjs'
import logger from '../../../../../lib/logger.mjs'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // WHAT: Verify admin authentication
    // WHY: Only admins should be able to manually link accounts
    const admin = await getAdminUser(req)
    if (!admin) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const { id: userId } = req.query
    const { provider, providerData } = req.body

    // WHAT: Validate request body
    if (!provider || !providerData) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: 'provider and providerData are required'
      })
    }

    // WHAT: Validate provider type
    // WHY: Only Facebook and Google are currently supported
    if (!['facebook', 'google'].includes(provider)) {
      return res.status(400).json({
        error: 'Invalid provider',
        details: 'Provider must be "facebook" or "google"'
      })
    }

    // WHAT: Validate provider data structure
    // WHY: Ensure all required fields are present
    const requiredFields = ['id', 'email', 'name']
    const missingFields = requiredFields.filter(field => !providerData[field])
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        error: 'Invalid provider data',
        details: `Missing required fields: ${missingFields.join(', ')}`
      })
    }

    const db = await getDb()
    const usersCollection = db.collection('publicUsers')

    // WHAT: Fetch target user
    const user = await usersCollection.findOne({ id: userId })
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // WHAT: Email consistency check - CRITICAL SECURITY
    // WHY: Prevent admins from accidentally linking wrong person's social account
    // Example: Don't link john@gmail.com's Facebook to jane@email.com's SSO account
    const userEmail = user.email.toLowerCase().trim()
    const providerEmail = providerData.email.toLowerCase().trim()
    
    if (userEmail !== providerEmail) {
      logger.warn('Admin manual linking email mismatch prevented', {
        adminId: admin.id,
        userId: user.id,
        userEmail,
        providerEmail,
        provider
      })
      
      return res.status(400).json({
        error: 'Email mismatch',
        details: `User email (${userEmail}) does not match provider email (${providerEmail}). Cannot link accounts with different emails.`
      })
    }

    // WHAT: Check if provider already linked
    // WHY: Prevent overwriting existing social provider data
    const currentMethods = getUserLoginMethods(user)
    if (currentMethods.includes(provider)) {
      return res.status(409).json({
        error: 'Provider already linked',
        details: `${provider} is already linked to this account`
      })
    }

    // WHAT: Prepare provider data with timestamp
    const now = new Date().toISOString()
    const providerDataWithTimestamp = {
      id: providerData.id,
      email: providerData.email,
      name: providerData.name,
      picture: providerData.picture || null,
      linkedAt: now,
      lastLoginAt: now,
    }

    // WHAT: Link social provider to user account
    // WHY: Use existing linkLoginMethod() for consistency
    const updatedUser = await linkLoginMethod(
      userId,
      provider,
      providerDataWithTimestamp
    )

    // WHAT: Audit log the manual linking operation
    // WHY: Track all admin-initiated account changes for security and compliance
    await logAuditEvent({
      action: AuditAction.ACCOUNT_LINK_MANUAL,
      userId: admin.id,
      userEmail: admin.email,
      userRole: admin.role,
      resource: 'public_user',
      resourceId: userId,
      beforeState: { loginMethods: currentMethods },
      afterState: { loginMethods: [...currentMethods, provider], provider: providerData.id },
      metadata: {
        targetUserEmail: user.email,
        provider,
        providerId: providerData.id,
        providerEmail: providerData.email,
        ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        userAgent: req.headers['user-agent']
      }
    })

    logger.info('Admin manually linked social provider', {
      event: 'admin_manual_link',
      adminId: admin.id,
      adminEmail: admin.email,
      userId: user.id,
      userEmail: user.email,
      provider,
      timestamp: now
    })

    // WHAT: Return success with updated login methods
    const updatedMethods = getUserLoginMethods(updatedUser)

    return res.status(200).json({
      success: true,
      message: `${provider} successfully linked to account`,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        loginMethods: updatedMethods
      }
    })

  } catch (error) {
    logger.error('Admin manual linking error', {
      event: 'admin_manual_link_error',
      error: error.message,
      stack: error.stack,
      userId: req.query.id
    })

    // WHAT: Handle specific error cases
    if (error.message.includes('already has')) {
      return res.status(409).json({ error: error.message })
    }

    return res.status(500).json({
      error: 'Failed to link social provider',
      details: error.message
    })
  }
}
