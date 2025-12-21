/**
 * lib/securityHeaders.mjs - Security headers configuration
 * 
 * WHAT: Comprehensive security headers to protect against common web vulnerabilities
 * WHY: Defense-in-depth security layer (XSS, clickjacking, MIME sniffing, etc.)
 * HOW: Apply headers to all responses via Next.js middleware
 */

/**
 * getSecurityHeaders
 * 
 * WHAT: Returns object of security headers to apply to all responses
 * WHY: Centralized configuration for security headers
 * HOW: Based on OWASP recommendations and best practices
 * 
 * @returns {Object} Headers object
 */
export function getSecurityHeaders() {
  return {
    // Prevent clickjacking attacks by disallowing iframe embedding
    'X-Frame-Options': 'DENY',
    
    // Prevent MIME type sniffing (forces browser to respect Content-Type)
    'X-Content-Type-Options': 'nosniff',
    
    // Enable XSS filter in older browsers (modern browsers use CSP)
    'X-XSS-Protection': '1; mode=block',
    
    // Force HTTPS for 1 year including subdomains
    // WHAT: Strict-Transport-Security (HSTS)
    // WHY: Prevents man-in-the-middle attacks by enforcing HTTPS
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    
    // Control how much referrer information is sent
    // WHAT: Referrer-Policy
    // WHY: Balance privacy with functionality
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    
    // Content Security Policy (CSP)
    // WHAT: Restrict sources of content (scripts, styles, images, etc.)
    // WHY: Primary defense against XSS and data injection attacks
    'Content-Security-Policy': getContentSecurityPolicy(),
    
    // Permissions Policy (formerly Feature-Policy)
    // WHAT: Disable unnecessary browser features
    // WHY: Reduce attack surface by disabling unused features
    'Permissions-Policy': getPermissionsPolicy(),
    
    // Cross-Origin Policies
    'Cross-Origin-Embedder-Policy': 'require-corp',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
  }
}

/**
 * getContentSecurityPolicy
 * 
 * WHAT: Generates Content-Security-Policy header value
 * WHY: CSP is the most important security header for preventing XSS
 * HOW: Define allowed sources for each content type
 * 
 * @returns {string} CSP header value
 */
function getContentSecurityPolicy() {
  const isDevelopment = process.env.NODE_ENV === 'development'
  
  // Base policy (applies to production and development)
  const policy = {
    // Default fallback for any resource type not explicitly defined
    'default-src': ["'self'"],
    
    // Scripts: self + inline scripts (needed for Next.js)
    // WHAT: Allow scripts from same origin and inline scripts (for Next.js hydration)
    // WHY: Next.js requires inline scripts for client-side functionality
    'script-src': [
      "'self'",
      "'unsafe-inline'", // Needed for Next.js inline scripts
      isDevelopment && "'unsafe-eval'", // Needed for Next.js dev hot reload
    ].filter(Boolean),
    
    // Styles: self + inline styles (needed for styled-components, emotion, etc.)
    'style-src': [
      "'self'",
      "'unsafe-inline'", // Needed for inline styles
      'https://fonts.googleapis.com', // Google Fonts
    ],
    
    // Images: self + data URIs + external image hosts
    'img-src': [
      "'self'",
      'data:', // Allow data: URIs for inline images
      'https:', // Allow HTTPS images (for user avatars, OAuth provider logos)
    ],
    
    // Fonts: self + external font providers
    'font-src': [
      "'self'",
      'data:', // Allow data: URIs for embedded fonts
      'https://fonts.gstatic.com', // Google Fonts
    ],
    
    // AJAX requests, WebSockets, EventSource
    'connect-src': [
      "'self'",
      process.env.SSO_BASE_URL || 'https://sso.doneisbetter.com',
      isDevelopment && 'ws://localhost:*', // WebSocket for Next.js dev server
      isDevelopment && 'http://localhost:*', // HTTP for Next.js dev server
    ].filter(Boolean),
    
    // Frames: disallow all (prevent clickjacking)
    'frame-src': ["'none'"],
    
    // Objects (Flash, Java applets, etc.): disallow all
    'object-src': ["'none'"],
    
    // Base URL for relative URLs: restrict to self
    'base-uri': ["'self'"],
    
    // Form submission targets: restrict to self
    'form-action': ["'self'"],
    
    // Parent frames: disallow embedding (redundant with X-Frame-Options but more robust)
    'frame-ancestors': ["'none'"],
    
    // Upgrade insecure requests to HTTPS (only in production)
    ...(isDevelopment ? {} : { 'upgrade-insecure-requests': [] }),
  }
  
  // Convert policy object to CSP string
  return Object.entries(policy)
    .map(([key, values]) => {
      if (values.length === 0) {
        return key // Directives with no value (e.g., upgrade-insecure-requests)
      }
      return `${key} ${values.join(' ')}`
    })
    .join('; ')
}

/**
 * getPermissionsPolicy
 * 
 * WHAT: Generates Permissions-Policy header value
 * WHY: Disable browser features that SSO doesn't need (reduces attack surface)
 * HOW: Explicitly disable unnecessary features
 * 
 * @returns {string} Permissions-Policy header value
 */
function getPermissionsPolicy() {
  const disabledFeatures = [
    'accelerometer',      // Device motion sensors
    'ambient-light-sensor', // Light sensor
    'autoplay',           // Auto-playing media
    'battery',            // Battery status API
    'camera',             // Camera access
    'display-capture',    // Screen capture
    'document-domain',    // document.domain modification
    'encrypted-media',    // DRM
    'fullscreen',         // Fullscreen API
    'geolocation',        // Location access
    'gyroscope',          // Gyroscope sensor
    'magnetometer',       // Magnetometer
    'microphone',         // Microphone access
    'midi',               // MIDI devices
    'payment',            // Payment Request API
    'picture-in-picture', // PiP mode
    'publickey-credentials-get', // WebAuthn (may enable later if needed)
    'sync-xhr',           // Synchronous XHR
    'usb',                // USB devices
    'wake-lock',          // Screen wake lock
    'xr-spatial-tracking', // VR/AR
  ]
  
  // Format: feature=(none) for disabled features
  return disabledFeatures.map(feature => `${feature}=()`).join(', ')
}

/**
 * applySecurityHeaders
 * 
 * WHAT: Applies security headers to a Next.js response object
 * WHY: Convenient helper for applying all security headers at once
 * HOW: Iterate through headers and set each one
 * 
 * @param {Object} res - Next.js response object
 */
export function applySecurityHeaders(res) {
  const headers = getSecurityHeaders()
  
  Object.entries(headers).forEach(([key, value]) => {
    res.setHeader(key, value)
  })
}

/**
 * createSecurityHeadersMiddleware
 * 
 * WHAT: Creates Express-style middleware for security headers
 * WHY: Compatible with API routes that use middleware pattern
 * HOW: Returns middleware function that applies headers and calls next()
 * 
 * @returns {Function} Middleware function
 */
export function createSecurityHeadersMiddleware() {
  return (req, res, next) => {
    applySecurityHeaders(res)
    next()
  }
}
