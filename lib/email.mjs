/**
 * lib/email.mjs — Unified email service with provider abstraction
 * WHAT: Single entry point for sending emails with automatic provider fallback and audit logging.
 * WHY: Centralizes email logic, ensures consistent logging, and provides reliability through multi-provider support.
 */
import nodemailer from 'nodemailer'
import { Resend } from 'resend'
import logger from './logger.mjs'

/**
 * WHAT: Configuration object for email service
 * WHY: Centralize all environment variable reading and validation in one place
 */
const config = {
  provider: process.env.EMAIL_PROVIDER || 'nodemailer',
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '465', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  resend: {
    apiKey: process.env.RESEND_API_KEY,
  },
  from: {
    address: process.env.EMAIL_FROM || 'noreply@example.com',
    name: process.env.EMAIL_FROM_NAME || 'SSO Service',
  },
}

/**
 * WHAT: Lazy-initialized Nodemailer transporter
 * WHY: Only create SMTP connection when actually needed; reuse connection across requests
 */
let nodemailerTransporter = null

/**
 * getNodemailerTransporter
 * WHAT: Creates or returns existing Nodemailer SMTP transporter.
 * WHY: Lazy initialization pattern; validates config before creating transporter.
 */
function getNodemailerTransporter() {
  if (nodemailerTransporter) return nodemailerTransporter

  const { smtp } = config
  if (!smtp.user || !smtp.pass) {
    throw new Error('SMTP_USER and SMTP_PASS are required for nodemailer provider')
  }

  // WHAT: Create SMTP transport with Google Workspace configuration
  // WHY: Google Workspace requires app-specific passwords and secure connection
  nodemailerTransporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: {
      user: smtp.user,
      pass: smtp.pass,
    },
  })

  return nodemailerTransporter
}

/**
 * WHAT: Lazy-initialized Resend client
 * WHY: Only create client when needed; reuse across requests
 */
let resendClient = null

/**
 * getResendClient
 * WHAT: Creates or returns existing Resend API client.
 * WHY: Lazy initialization; validates API key before creating client.
 */
function getResendClient() {
  if (resendClient) return resendClient

  const { resend } = config
  if (!resend.apiKey) {
    throw new Error('RESEND_API_KEY is required for resend provider')
  }

  resendClient = new Resend(resend.apiKey)
  return resendClient
}

/**
 * sendViaNodemailer
 * WHAT: Sends email using Nodemailer SMTP transport.
 * WHY: Primary provider for Google Workspace SMTP; reliable and widely supported.
 * 
 * @param {Object} params - { to, subject, text, emailConfig }
 * @returns {Promise<Object>} - { id, info }
 */
async function sendViaNodemailer({ to, subject, text, emailConfig }) {
  // WHAT: Use provided config or fall back to global
  // WHY: Support per-organization email configuration
  const cfg = emailConfig || config
  
  // WHAT: Create transporter with org-specific config
  // WHY: Each organization may have different SMTP settings
  if (!cfg.smtp.user || !cfg.smtp.pass) {
    throw new Error('SMTP_USER and SMTP_PASS are required for nodemailer provider')
  }
  
  const transporter = nodemailer.createTransport({
    host: cfg.smtp.host,
    port: cfg.smtp.port,
    secure: cfg.smtp.secure,
    auth: {
      user: cfg.smtp.user,
      pass: cfg.smtp.pass,
    },
  })
  
  // WHAT: Compose email with plain text only (no HTML)
  // WHY: MVP requirement; simpler, more reliable, better spam score
  const mailOptions = {
    from: `"${cfg.from.name}" <${cfg.from.address}>`,
    to,
    subject,
    text,
  }

  // WHAT: Send email and capture response
  // WHY: Nodemailer returns messageId for tracking; info contains SMTP response
  const info = await transporter.sendMail(mailOptions)
  
  return {
    id: info.messageId,
    provider: 'nodemailer',
    info,
  }
}

/**
 * sendViaResend
 * WHAT: Sends email using Resend API.
 * WHY: Fallback provider; modern API, good deliverability, simple integration.
 * 
 * @param {Object} params - { to, subject, text, emailConfig }
 * @returns {Promise<Object>} - { id, result }
 */
async function sendViaResend({ to, subject, text, emailConfig }) {
  // WHAT: Use provided config or fall back to global
  // WHY: Support per-organization email configuration
  const cfg = emailConfig || config
  
  // WHAT: Create Resend client with org-specific config
  // WHY: Each organization may have different API key
  if (!cfg.resend.apiKey) {
    throw new Error('RESEND_API_KEY is required for resend provider')
  }
  
  const client = new Resend(cfg.resend.apiKey)
  
  // WHAT: Send email via Resend API (plain text)
  // WHY: Resend supports plain text emails; simpler than HTML for MVP
  const result = await client.emails.send({
    from: `${config.from.name} <${config.from.address}>`,
    to,
    subject,
    text,
  })

  return {
    id: result.id,
    provider: 'resend',
    result,
  }
}

/**
 * maskEmail
 * WHAT: Masks email address for logging (e.g., t***@example.com).
 * WHY: Privacy protection; avoid logging full email addresses (PII).
 * 
 * @param {string} email - Email address to mask
 * @returns {string} - Masked email
 */
function maskEmail(email) {
  if (!email || typeof email !== 'string') return '[invalid]'
  const [local, domain] = email.split('@')
  if (!local || !domain) return '[invalid]'
  const maskedLocal = local.length > 2 
    ? `${local[0]}***${local[local.length - 1]}`
    : `${local[0]}***`
  return `${maskedLocal}@${domain}`
}

/**
 * sendEmail
 * WHAT: Main entry point for sending emails with automatic provider fallback.
 * WHY: Unified interface; reliability through fallback; comprehensive audit logging.
 * 
 * @param {Object} params
 * @param {string} params.to - Recipient email address
 * @param {string} params.subject - Email subject line
 * @param {string} params.text - Plain text email body
 * @param {string} [params.category] - Event category for logging (e.g., 'password_reset')
 * @param {string} [params.orgId] - Organization ID for per-org email config
 * @param {Object} [params.meta] - Additional metadata for logging
 * @returns {Promise<Object>} - { id, provider, success: true }
 * @throws {Error} - If all providers fail
 */
export async function sendEmail({ to, subject, text, category = 'email_sent', orgId, meta = {} }) {
  // WHAT: Get organization-specific email config if orgId provided
  // WHY: Multi-tenant support; each org can use their own email provider
  let orgConfig = config
  if (orgId) {
    try {
      const { getOrgEmailConfig } = await import('./orgEmailConfig.mjs')
      orgConfig = await getOrgEmailConfig(orgId)
    } catch (error) {
      logger.warn('Failed to load org email config, using default', {
        event: 'org_email_config_load_failed',
        orgId,
        error: error.message,
        timestamp: new Date().toISOString(),
      })
    }
  }
  const timestamp = new Date().toISOString()
  
  // WHAT: Validate email parameters
  // WHY: Fail fast on invalid input; prevent sending malformed emails
  if (!to || typeof to !== 'string' || !to.includes('@')) {
    throw new Error('Invalid recipient email address')
  }
  if (!subject || typeof subject !== 'string') {
    throw new Error('Invalid email subject')
  }
  if (!text || typeof text !== 'string') {
    throw new Error('Invalid email body')
  }

  const maskedTo = maskEmail(to)
  
  // WHAT: Log email send attempt
  // WHY: Audit trail for all email operations; masked email for privacy
  logger.info('Email send attempt', {
    event: category,
    to: maskedTo,
    subject,
    provider: orgConfig.provider,
    orgId: orgId || null,
    timestamp,
    ...meta,
  })

  const providers = orgConfig.provider === 'nodemailer'
    ? ['nodemailer', 'resend']
    : ['resend', 'nodemailer']

  let lastError = null

  // WHAT: Try each provider in order (primary first, then fallback)
  // WHY: Reliability through redundancy; if primary fails, fallback ensures delivery
  for (const provider of providers) {
    try {
      let result
      
      if (provider === 'nodemailer') {
        result = await sendViaNodemailer({ to, subject, text, emailConfig: orgConfig })
      } else {
        result = await sendViaResend({ to, subject, text, emailConfig: orgConfig })
      }

      // WHAT: Log successful send
      // WHY: Audit trail; track which provider succeeded
      logger.info('Email sent successfully', {
        event: `${category}_success`,
        to: maskedTo,
        subject,
        provider: result.provider,
        messageId: result.id,
        timestamp: new Date().toISOString(),
        ...meta,
      })

      return {
        id: result.id,
        provider: result.provider,
        success: true,
      }
    } catch (error) {
      lastError = error
      
      // WHAT: Log provider failure
      // WHY: Debugging; understand why provider failed before trying fallback
      logger.warn('Email provider failed', {
        event: `${category}_provider_failed`,
        to: maskedTo,
        provider,
        error: error.message,
        timestamp: new Date().toISOString(),
        ...meta,
      })
      
      // Continue to next provider
    }
  }

  // WHAT: All providers failed; log and throw error
  // WHY: Caller needs to know email failed; logged for operational alerting
  logger.error('All email providers failed', {
    event: `${category}_failed`,
    to: maskedTo,
    subject,
    error: lastError?.message || 'Unknown error',
    timestamp: new Date().toISOString(),
    ...meta,
  })

  throw new Error(`Failed to send email: ${lastError?.message || 'All providers failed'}`)
}

/**
 * verifyEmailConfig
 * WHAT: Validates email configuration and tests provider connectivity.
 * WHY: Startup validation; fail fast if email is misconfigured.
 * 
 * @returns {Promise<Object>} - { valid: boolean, provider, errors }
 */
export async function verifyEmailConfig() {
  const errors = []
  const warnings = []

  // WHAT: Check basic configuration
  // WHY: Catch missing config before attempting to send emails
  if (!config.from.address || !config.from.address.includes('@')) {
    errors.push('EMAIL_FROM is invalid or missing')
  }

  const provider = config.provider

  if (provider === 'nodemailer') {
    if (!config.smtp.user) warnings.push('SMTP_USER is missing')
    if (!config.smtp.pass) warnings.push('SMTP_PASS is missing')
    
    // WHAT: Test SMTP connection
    // WHY: Verify credentials and connectivity before production use
    if (config.smtp.user && config.smtp.pass) {
      try {
        const transporter = getNodemailerTransporter()
        await transporter.verify()
        logger.info('Nodemailer SMTP connection verified')
      } catch (error) {
        errors.push(`Nodemailer verification failed: ${error.message}`)
      }
    }
  } else if (provider === 'resend') {
    if (!config.resend.apiKey) warnings.push('RESEND_API_KEY is missing')
  } else {
    warnings.push(`Unknown EMAIL_PROVIDER: ${provider}`)
  }

  const valid = errors.length === 0

  if (!valid) {
    logger.error('Email configuration validation failed', { errors, warnings })
  } else if (warnings.length > 0) {
    logger.warn('Email configuration has warnings', { warnings })
  }

  return { valid, provider, errors, warnings }
}
