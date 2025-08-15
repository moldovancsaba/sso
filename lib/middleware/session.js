/**
 * Session middleware for SSO service
 * Provides session management across all API endpoints
 */

import { config } from '../config.js';

// Simple in-memory session store for development
// In production, use Redis or database-backed sessions
const sessionStore = new Map();

/**
 * Generate a random session ID
 */
function generateSessionId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

/**
 * Parse session cookie from request
 */
function parseSessionCookie(req) {
  const cookies = req.headers.cookie;
  if (!cookies) return null;

  const sessionCookie = cookies
    .split(';')
    .find(cookie => cookie.trim().startsWith('sso_session='));
  
  if (!sessionCookie) return null;

  return sessionCookie.split('=')[1];
}

/**
 * Session middleware
 */
export function sessionMiddleware(req, res, next) {
  // Parse existing session
  const sessionId = parseSessionCookie(req);
  let sessionData = null;

  if (sessionId && sessionStore.has(sessionId)) {
    sessionData = sessionStore.get(sessionId);
    
    // Check if session is expired
    if (sessionData && new Date(sessionData.expiresAt) > new Date()) {
      req.session = sessionData;
      req.sessionId = sessionId;
    } else {
      // Clean up expired session
      sessionStore.delete(sessionId);
    }
  }

  // If no valid session, create session object with methods
  if (!req.session) {
    req.session = {
      // Session data will be added here
      save: function() {
        const newSessionId = generateSessionId();
        const expiresAt = new Date();
        expiresAt.setTime(expiresAt.getTime() + config.session.maxAge);
        
        this.expiresAt = expiresAt.toISOString();
        sessionStore.set(newSessionId, { ...this });
        
        // Set session cookie
        res.setHeader('Set-Cookie', [
          `sso_session=${newSessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(config.session.maxAge / 1000)}`
        ]);
        
        req.sessionId = newSessionId;
      },
      
      destroy: function() {
        if (req.sessionId) {
          sessionStore.delete(req.sessionId);
        }
        // Clear cookie
        res.setHeader('Set-Cookie', [
          'sso_session=; Path=/; HttpOnly; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
        ]);
      }
    };
  } else {
    // Add methods to existing session
    req.session.save = function() {
      if (req.sessionId) {
        sessionStore.set(req.sessionId, { ...this });
      }
    };
    
    req.session.destroy = function() {
      if (req.sessionId) {
        sessionStore.delete(req.sessionId);
      }
      res.setHeader('Set-Cookie', [
        'sso_session=; Path=/; HttpOnly; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
      ]);
    };
  }

  if (next) next();
}

/**
 * Middleware wrapper for Next.js API routes
 */
export function withSession(handler) {
  return (req, res) => {
    sessionMiddleware(req, res, () => {
      return handler(req, res);
    });
  };
}