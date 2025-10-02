/**
 * @fileoverview Type definitions for the SSO client library.
 * These types are exposed to library consumers for TypeScript support.
 */

/**
 * Configuration options for initializing the SSO client
 */
export interface SSOConfig {
  /** Base URL of the SSO service */
  serverUrl: string;
  /** Optional custom paths for SSO endpoints */
  paths?: {
    /** Path for login endpoint. Default: '/api/auth/login' */
    login?: string;
    /** Path for logout endpoint. Default: '/api/auth/logout' */
    logout?: string;
    /** Path for session validation. Default: '/api/auth/validate' */
    validate?: string;
  };
  /** Custom headers to include in all requests */
  headers?: Record<string, string>;
}

/**
 * Response from the session validation endpoint
 */
export interface SessionResponse {
  /** Whether the session is valid */
  isValid: boolean;
  /** Session expiration timestamp in ISO format */
  expiresAt: string;
  /** User information if session is valid */
  user?: {
    /** Unique identifier for the user */
    id: string;
    /** Username or email of the user */
    username: string;
    /** User's permission levels */
    permissions: string[];
  };
}

/**
 * Error response from the SSO service
 */
export interface SSOError extends Error {
  /** HTTP status code if applicable */
  status?: number;
  /** Error code for programmatic handling */
  code: string;
  /** Additional error details */
  details?: Record<string, unknown>;
}

/**
 * Session monitoring configuration
 */
export interface MonitorConfig {
  /** Interval in milliseconds between checks. Default: 60000 (1 minute) */
  interval?: number;
  /** Callback when session becomes invalid */
  onInvalidSession?: () => void;
  /** Callback for monitoring errors */
  onError?: (error: SSOError) => void;
}
