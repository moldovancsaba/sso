/**
 * @fileoverview Constants used throughout the SSO client library.
 * These are exposed to allow library consumers to reference standard values.
 */

/** Default endpoint paths */
export const DEFAULT_PATHS = {
  /** Default login endpoint path */
  LOGIN: '/api/auth/login',
  /** Default logout endpoint path */
  LOGOUT: '/api/auth/logout',
  /** Default session validation endpoint path */
  VALIDATE: '/api/auth/validate'
} as const;

/** Standard error codes returned by the SSO service */
export const ERROR_CODES = {
  /** Session has expired */
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  /** Session validation failed */
  INVALID_SESSION: 'INVALID_SESSION',
  /** Network or connection error */
  NETWORK_ERROR: 'NETWORK_ERROR',
  /** Server returned an unexpected response */
  SERVER_ERROR: 'SERVER_ERROR',
  /** Configuration error in the client */
  CONFIG_ERROR: 'CONFIG_ERROR'
} as const;

/** Default configuration values */
export const DEFAULTS = {
  /** Default session monitoring interval in milliseconds (1 minute) */
  MONITOR_INTERVAL: 60000,
  /** Default request timeout in milliseconds (10 seconds) */
  REQUEST_TIMEOUT: 10000
} as const;
