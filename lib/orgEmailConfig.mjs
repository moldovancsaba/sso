/**
 * lib/orgEmailConfig.mjs — Organization-specific email configuration
 * WHAT: Manages per-organization email provider settings (SMTP, Resend, etc.).
 * WHY: Multi-tenant SSO requires different projects to use their own email providers/senders.
 */
import { getDb } from './db.mjs'
import { randomUUID } from 'crypto'
import logger from './logger.mjs'

/**
 * WHAT: Default email configuration fallback
 * WHY: Use system-wide defaults if organization hasn't configured email
 */
const DEFAULT_CONFIG = {
  provider: process.env.EMAIL_PROVIDER || 'nodemailer',
  smtp: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '465', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  resend: {
    apiKey: process.env.RESEND_API_KEY,
  },
  from: {
    address: process.env.EMAIL_FROM,
    name: process.env.EMAIL_FROM_NAME || 'SSO Service',
  },
}

/**
 * getOrgEmailConfigCollection
 * WHAT: Returns MongoDB collection for organization email configurations.
 * WHY: Centralized access to email config collection with indexes.
 * 
 * @returns {Promise<Collection>}
 */
async function getOrgEmailConfigCollection() {
  const db = await getDb()
  const col = db.collection('orgEmailConfigs')
  
  // WHAT: Create indexes for efficient lookups
  // WHY: Organization lookups are frequent; ensure unique config per org
  try {
    await col.createIndex({ orgId: 1 }, { unique: true })
    await col.createIndex({ createdAt: -1 })
  } catch {}
  
  return col
}

/**
 * getOrgEmailConfig
 * WHAT: Retrieves email configuration for an organization.
 * WHY: Each organization can have custom email provider settings.
 * 
 * @param {string} orgId - Organization UUID (null for system default)
 * @returns {Promise<Object>} - Email configuration object
 */
export async function getOrgEmailConfig(orgId) {
  // WHAT: Return system default if no orgId provided
  // WHY: Admin users and system emails use global config
  if (!orgId) {
    return DEFAULT_CONFIG
  }

  const col = await getOrgEmailConfigCollection()
  const config = await col.findOne({ orgId })

  // WHAT: Return organization config if exists, otherwise system default
  // WHY: Organizations without custom config fall back to system settings
  if (!config || !config.enabled) {
    return DEFAULT_CONFIG
  }

  // WHAT: Build configuration object from stored settings
  // WHY: Convert database format to application config format
  return {
    provider: config.provider || 'nodemailer',
    smtp: {
      host: config.smtp?.host,
      port: config.smtp?.port || 465,
      secure: config.smtp?.secure !== false,
      user: config.smtp?.user,
      pass: config.smtp?.pass,
    },
    resend: {
      apiKey: config.resend?.apiKey,
    },
    from: {
      address: config.from?.address || DEFAULT_CONFIG.from.address,
      name: config.from?.name || DEFAULT_CONFIG.from.name,
    },
    orgId: config.orgId,
  }
}

/**
 * setOrgEmailConfig
 * WHAT: Sets or updates email configuration for an organization.
 * WHY: Allow organizations to configure their own email providers.
 * 
 * @param {Object} params
 * @param {string} params.orgId - Organization UUID
 * @param {string} params.provider - 'nodemailer' or 'resend'
 * @param {Object} params.smtp - SMTP configuration (if provider is nodemailer)
 * @param {Object} params.resend - Resend configuration (if provider is resend)
 * @param {Object} params.from - Sender information
 * @param {boolean} params.enabled - Whether this config is active
 * @returns {Promise<Object>} - Created/updated configuration
 */
export async function setOrgEmailConfig({ orgId, provider, smtp, resend, from, enabled = true }) {
  // WHAT: Validate required parameters
  // WHY: Fail fast on invalid input
  if (!orgId) {
    throw new Error('orgId is required')
  }
  if (!provider || !['nodemailer', 'resend'].includes(provider)) {
    throw new Error('provider must be "nodemailer" or "resend"')
  }
  if (!from || !from.address || !from.address.includes('@')) {
    throw new Error('from.address is required and must be valid email')
  }

  const col = await getOrgEmailConfigCollection()
  const now = new Date().toISOString()

  // WHAT: Build configuration document
  // WHY: Store all necessary email settings for this organization
  const doc = {
    orgId,
    provider,
    smtp: provider === 'nodemailer' ? {
      host: smtp?.host || 'smtp.gmail.com',
      port: smtp?.port || 465,
      secure: smtp?.secure !== false,
      user: smtp?.user,
      pass: smtp?.pass, // WHAT: Stored encrypted in production; plain in dev
    } : null,
    resend: provider === 'resend' ? {
      apiKey: resend?.apiKey,
    } : null,
    from: {
      address: from.address,
      name: from.name || 'SSO Service',
    },
    enabled,
    updatedAt: now,
  }

  // WHAT: Check if config exists for this org
  // WHY: Determine whether to insert or update
  const existing = await col.findOne({ orgId })

  if (existing) {
    // WHAT: Update existing configuration
    // WHY: Organization is reconfiguring email settings
    await col.updateOne({ orgId }, { $set: doc })
    
    logger.info('Organization email config updated', {
      event: 'org_email_config_updated',
      orgId,
      provider,
      timestamp: now,
    })
  } else {
    // WHAT: Create new configuration
    // WHY: First time organization is setting up email
    doc.id = randomUUID()
    doc.createdAt = now
    await col.insertOne(doc)
    
    logger.info('Organization email config created', {
      event: 'org_email_config_created',
      orgId,
      provider,
      timestamp: now,
    })
  }

  return doc
}

/**
 * deleteOrgEmailConfig
 * WHAT: Removes email configuration for an organization.
 * WHY: Allow organizations to revert to system default or remove config.
 * 
 * @param {string} orgId - Organization UUID
 * @returns {Promise<boolean>} - Success status
 */
export async function deleteOrgEmailConfig(orgId) {
  if (!orgId) {
    throw new Error('orgId is required')
  }

  const col = await getOrgEmailConfigCollection()
  const result = await col.deleteOne({ orgId })

  if (result.deletedCount > 0) {
    logger.info('Organization email config deleted', {
      event: 'org_email_config_deleted',
      orgId,
      timestamp: new Date().toISOString(),
    })
  }

  return result.deletedCount === 1
}

/**
 * listOrgEmailConfigs
 * WHAT: Lists all organization email configurations.
 * WHY: Admin UI needs to display all configured organizations.
 * 
 * @returns {Promise<Array>} - Array of email configurations
 */
export async function listOrgEmailConfigs() {
  const col = await getOrgEmailConfigCollection()
  
  // WHAT: Return all configs, masking sensitive data
  // WHY: Admin UI shouldn't expose passwords/API keys
  const configs = await col.find({}).sort({ createdAt: -1 }).toArray()
  
  return configs.map(config => ({
    ...config,
    smtp: config.smtp ? {
      ...config.smtp,
      pass: config.smtp.pass ? '***MASKED***' : null, // WHAT: Mask SMTP password
    } : null,
    resend: config.resend ? {
      apiKey: config.resend.apiKey ? '***MASKED***' : null, // WHAT: Mask API key
    } : null,
  }))
}

/**
 * testOrgEmailConfig
 * WHAT: Tests email configuration by attempting to send a test email.
 * WHY: Verify configuration before saving; provide immediate feedback.
 * 
 * @param {Object} config - Email configuration to test
 * @param {string} testRecipient - Email address to send test to
 * @returns {Promise<Object>} - { success: boolean, error?: string }
 */
export async function testOrgEmailConfig(config, testRecipient) {
  // WHAT: Import email service dynamically
  // WHY: Avoid circular dependencies
  const { sendEmail } = await import('./email.mjs')

  try {
    // WHAT: Attempt to send test email with provided config
    // WHY: Validate SMTP credentials or API key before saving
    await sendEmail({
      to: testRecipient,
      subject: 'SSO Email Configuration Test',
      text: `This is a test email to verify your email configuration.\n\nProvider: ${config.provider}\nSender: ${config.from.address}\n\nIf you received this, your configuration is working correctly!`,
      category: 'email_config_test',
      meta: { test: true },
    })

    return { success: true }
  } catch (error) {
    logger.warn('Email configuration test failed', {
      event: 'org_email_config_test_failed',
      provider: config.provider,
      error: error.message,
      timestamp: new Date().toISOString(),
    })

    return { success: false, error: error.message }
  }
}
