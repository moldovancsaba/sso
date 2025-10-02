/**
 * @fileoverview Configuration management for the SSO service.
 * This module loads and validates environment variables and provides
 * a centralized configuration object for the entire application.
 */

// Load environment variables from .env file
import dotenv from 'dotenv';
dotenv.config();

/**
 * Validates that a required environment variable is present.
 * @param {string} name - The name of the environment variable
 * @param {string} value - The value of the environment variable
 * @throws {Error} If the required variable is missing
 */
function requireEnv(name, value) {
  if (!value) {
    throw new Error(`Required environment variable ${name} is not set`);
  }
  return value;
}

/**
 * Parses a comma-separated list of origins into an array.
 * @param {string} originsStr - Comma-separated string of origins
 * @returns {string[]} Array of origin URLs
 */
function parseAllowedOrigins(originsStr) {
  if (!originsStr) {
    return ['http://localhost:3000']; // Default for development
  }
  return originsStr.split(',').map(origin => origin.trim());
}

/**
 * Application configuration object.
 * All values are loaded from environment variables with sensible defaults.
 */
export const config = {
  // Database configuration
  database: {
    uri: requireEnv('MONGODB_URI', process.env.MONGODB_URI),
    name: process.env.MONGODB_DB || 'sso_database',
    collections: {
      users: process.env.USERS_COLLECTION || 'users',
      sessions: process.env.SESSIONS_COLLECTION || 'sessions'
    }
  },

  // CORS configuration
  cors: {
    allowedOrigins: parseAllowedOrigins(process.env.ALLOWED_ORIGINS),
    credentials: process.env.CORS_CREDENTIALS !== 'false' // Default to true
  },

  // Session configuration
  session: {
    secret: requireEnv('SESSION_SECRET', process.env.SESSION_SECRET),
    maxAge: parseInt(process.env.SESSION_MAX_AGE || '86400000'), // 24 hours default
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: process.env.SESSION_SAME_SITE || 'lax'
  },

  // JWT configuration (if using JWTs instead of sessions)
  jwt: {
    secret: process.env.JWT_SECRET || process.env.SESSION_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    issuer: process.env.JWT_ISSUER || 'sso-service',
    audience: process.env.JWT_AUDIENCE || 'sso-clients'
  },

  // Server configuration
  server: {
    port: parseInt(process.env.PORT || '3000'),
    host: process.env.HOST || 'localhost',
    basePath: process.env.BASE_PATH || '',
    trustedProxies: process.env.TRUSTED_PROXIES ? 
      process.env.TRUSTED_PROXIES.split(',').map(proxy => proxy.trim()) : 
      []
  },

  // API endpoints configuration
  endpoints: {
    login: process.env.LOGIN_ENDPOINT || '/api/auth/login',
    logout: process.env.LOGOUT_ENDPOINT || '/api/auth/logout',
    validate: process.env.VALIDATE_ENDPOINT || '/api/auth/validate',
    register: process.env.REGISTER_ENDPOINT || '/api/auth/register'
  },

  // Security settings
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12'),
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100'),
    rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '900000'), // 15 minutes
    csrfProtection: process.env.CSRF_PROTECTION !== 'false'
  },

  // Development and debugging
  development: {
    debug: process.env.NODE_ENV === 'development',
    logLevel: process.env.LOG_LEVEL || 'info'
  }
};

// Export individual values for backwards compatibility
export const MONGODB_URI = config.database.uri;
export const MONGODB_DB = config.database.name;
export const SESSION_SECRET = config.session.secret;
export const ALLOWED_ORIGINS = config.cors.allowedOrigins;

/**
 * Validates the entire configuration.
 * Should be called at application startup.
 * @throws {Error} If any configuration is invalid
 */
export function validateConfig() {
  // Validate MongoDB URI format
  try {
    new URL(config.database.uri);
  } catch (error) {
    throw new Error('Invalid MONGODB_URI format');
  }

  // Validate allowed origins
  config.cors.allowedOrigins.forEach(origin => {
    try {
      new URL(origin);
    } catch (error) {
      throw new Error(`Invalid origin URL: ${origin}`);
    }
  });

  // Validate session max age
  if (config.session.maxAge < 60000) { // Minimum 1 minute
    throw new Error('SESSION_MAX_AGE must be at least 60000ms (1 minute)');
  }

  console.log('✅ Configuration validated successfully');
}