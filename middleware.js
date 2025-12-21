/**
 * middleware.js - Next.js Edge Middleware
 * 
 * WHAT: Global middleware that runs on every request
 * WHY: Apply security headers to all routes (pages and API)
 * HOW: Next.js middleware runs at the Edge before request reaches routes
 * 
 * Note: This file must be at the root level (same as pages/) to work
 */

import { NextResponse } from 'next/server'
import { getSecurityHeaders } from './lib/securityHeaders.mjs'

/**
 * middleware
 * 
 * WHAT: Next.js middleware function that runs on every request
 * WHY: Centralized place to apply security headers to all responses
 * HOW: Clone response, add security headers, return modified response
 * 
 * @param {Request} request - Next.js request object
 * @returns {NextResponse} Modified response with security headers
 */
export function middleware(request) {
  // Create response (continue to next middleware/route)
  const response = NextResponse.next()
  
  // Get security headers
  const securityHeaders = getSecurityHeaders()
  
  // Apply each security header to the response
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value)
  })
  
  return response
}

/**
 * config
 * 
 * WHAT: Middleware configuration - defines which paths this middleware applies to
 * WHY: Control where security headers are applied
 * HOW: Use matcher patterns to include/exclude paths
 * 
 * Matcher patterns:
 * - Apply to all routes except static files and images
 * - Exclude _next (Next.js internals), favicon, other static assets
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon)
     * - Static files in /public
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
}
