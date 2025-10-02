/**
 * lib/logger.mjs — Structured security event logging
 * WHAT: Winston-based logger for authentication, authorization, and security events.
 * WHY: Audit trail for compliance, debugging, and security monitoring; replaces console.error.
 */
import winston from 'winston'

const { combine, timestamp, json, printf, colorize } = winston.format

/**
 * Custom format for development (human-readable with colors)
 * WHAT: Formats log entries as readable text with timestamps and colors.
 * WHY: Makes local development debugging easier while maintaining structure.
 */
const devFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}] ${message}`
  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`
  }
  return msg
})

/**
 * createLogger
 * WHAT: Factory function to create configured Winston logger instance.
 * WHY: Centralized logger configuration; different formats for dev vs. production.
 */
function createLogger() {
  const isDev = process.env.NODE_ENV !== 'production'
  const logLevel = process.env.LOG_LEVEL || (isDev ? 'debug' : 'info')

  const transports = []

  // Console transport (always active)
  transports.push(
    new winston.transports.Console({
      format: isDev
        ? combine(
            colorize(),
            timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
            devFormat
          )
        : combine(
            timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
            json()
          ),
    })
  )

  // File transports for production (optional)
  if (!isDev && process.env.LOG_FILE_PATH) {
    transports.push(
      new winston.transports.File({
        filename: process.env.LOG_FILE_PATH,
        format: combine(
          timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
          json()
        ),
      })
    )
  }

  return winston.createLogger({
    level: logLevel,
    format: combine(
      timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
      json()
    ),
    transports,
    // Prevent unhandled exceptions from crashing the process
    exitOnError: false,
  })
}

// Singleton logger instance
const logger = createLogger()

/**
 * Security event logging helpers
 * WHAT: Convenience functions for logging specific security events.
 * WHY: Standardize log format and ensure all critical events are captured.
 */

export function logLoginAttempt(email, success, metadata = {}) {
  const level = success ? 'info' : 'warn'
  logger.log(level, 'Login attempt', {
    event: 'login_attempt',
    email,
    success,
    timestamp: new Date().toISOString(),
    ...metadata,
  })
}

export function logLoginSuccess(userId, email, role, metadata = {}) {
  logger.info('Login successful', {
    event: 'login_success',
    userId,
    email,
    role,
    timestamp: new Date().toISOString(),
    ...metadata,
  })
}

export function logLoginFailure(email, reason, metadata = {}) {
  logger.warn('Login failed', {
    event: 'login_failure',
    email,
    reason,
    timestamp: new Date().toISOString(),
    ...metadata,
  })
}

export function logLogout(userId, email, metadata = {}) {
  logger.info('User logged out', {
    event: 'logout',
    userId,
    email,
    timestamp: new Date().toISOString(),
    ...metadata,
  })
}

export function logSessionCreated(userId, sessionId, expiresAt, metadata = {}) {
  logger.info('Session created', {
    event: 'session_created',
    userId,
    sessionId,
    expiresAt,
    timestamp: new Date().toISOString(),
    ...metadata,
  })
}

export function logSessionRevoked(userId, sessionId, reason, metadata = {}) {
  logger.info('Session revoked', {
    event: 'session_revoked',
    userId,
    sessionId,
    reason,
    timestamp: new Date().toISOString(),
    ...metadata,
  })
}

export function logRateLimitExceeded(identifier, endpoint, metadata = {}) {
  logger.warn('Rate limit exceeded', {
    event: 'rate_limit_exceeded',
    identifier,
    endpoint,
    timestamp: new Date().toISOString(),
    ...metadata,
  })
}

export function logSecurityEvent(eventType, details, metadata = {}) {
  logger.warn('Security event', {
    event: eventType,
    details,
    timestamp: new Date().toISOString(),
    ...metadata,
  })
}

// Export raw logger for custom logging
export default logger
