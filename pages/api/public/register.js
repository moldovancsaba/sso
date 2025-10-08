// WHAT: Public user registration API endpoint
// WHY: Enable users to create accounts on the SSO service
// Strategic: This is the entry point for new users to join the SSO system

import { createPublicUser } from '../../../lib/publicUsers.mjs'
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
    const { email, password, name } = req.body
    
    // WHAT: Validate required fields
    if (!email || !password || !name) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Email, password, and name are required',
      })
    }
    
    // WHAT: Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Invalid email',
        message: 'Please provide a valid email address',
      })
    }
    
    // WHAT: Validate password strength (minimum 8 characters)
    if (password.length < 8) {
      return res.status(400).json({
        error: 'Password too weak',
        message: 'Password must be at least 8 characters long',
      })
    }
    
    // WHAT: Validate name length
    if (name.trim().length < 2) {
      return res.status(400).json({
        error: 'Invalid name',
        message: 'Name must be at least 2 characters long',
      })
    }
    
    // WHAT: Create new user
    const user = await createPublicUser({ email, password, name })
    
    // WHAT: Create session and set cookie
    const token = await createPublicSession(user.id, {
      ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
    })
    
    setPublicSessionCookie(res, token)
    
    logger.info('User registration successful', {
      userId: user.id,
      email: user.email,
      ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
    })
    
    // WHAT: Return success with user data (no password)
    return res.status(201).json({
      success: true,
      message: 'Registration successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
      },
    })
  } catch (err) {
    logger.error('Registration error', { error: err.message })
    
    // WHAT: Handle duplicate email error
    if (err.message.includes('already exists')) {
      return res.status(409).json({
        error: 'Email already registered',
        message: 'An account with this email already exists. Please login instead.',
      })
    }
    
    // WHAT: Generic error response
    return res.status(500).json({
      error: 'Registration failed',
      message: 'An error occurred during registration. Please try again.',
    })
  }
}
