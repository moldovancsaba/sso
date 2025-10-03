// WHAT: Public user login API endpoint
// WHY: Enable users to authenticate with email and password
// Strategic: Main authentication endpoint for public users

import { validateUserCredentials } from '../../../lib/publicUsers.mjs'
import { createPublicSession, setPublicSessionCookie } from '../../../lib/publicSessions.mjs'
import { runCors } from '../../../lib/cors.mjs'
import logger from '../../../lib/logger.mjs'

export default async function handler(req, res) {
  // WHAT: Enable CORS for cross-domain requests
  if (runCors(req, res)) return
  
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS')
    return res.status(405).json({ error: 'Method not allowed' })
  }
  
  try {
    const { email, password } = req.body
    
    // WHAT: Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        error: 'Missing credentials',
        message: 'Email and password are required',
      })
    }
    
    // WHAT: Validate credentials
    const user = await validateUserCredentials(email, password)
    
    if (!user) {
      // WHAT: Don't reveal whether email exists or password is wrong
      // WHY: Security best practice to prevent user enumeration
      logger.warn('Login failed - invalid credentials', {
        email,
        ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      })
      
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password is incorrect',
      })
    }
    
    // WHAT: Check if user account is active
    if (user.status !== 'active') {
      logger.warn('Login attempt on inactive account', {
        userId: user.id,
        status: user.status,
      })
      
      return res.status(403).json({
        error: 'Account disabled',
        message: 'Your account has been disabled. Please contact support.',
      })
    }
    
    // WHAT: Create session and set cookie
    const token = await createPublicSession(user.id, {
      ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
    })
    
    setPublicSessionCookie(res, token)
    
    logger.info('User login successful', {
      userId: user.id,
      email: user.email,
      ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
    })
    
    // WHAT: Return success with user data
    return res.status(200).json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        lastLoginAt: user.lastLoginAt,
      },
    })
  } catch (err) {
    logger.error('Login error', { error: err.message })
    
    return res.status(500).json({
      error: 'Login failed',
      message: 'An error occurred during login. Please try again.',
    })
  }
}
