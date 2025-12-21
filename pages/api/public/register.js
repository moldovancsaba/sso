// WHAT: Public user registration API endpoint
// WHY: Enable users to create accounts on the SSO service
// Strategic: This is the entry point for new users to join the SSO system
// Enhanced: Supports adding password to existing social accounts (account linking)

import { createPublicUser } from '../../../lib/publicUsers.mjs'
import { createPublicSession, setPublicSessionCookie } from '../../../lib/publicSessions.mjs'
import { runCors } from '../../../lib/cors.mjs'
import logger from '../../../lib/logger.mjs'
import { findUserByEmail, addPasswordToAccount, getUserLoginMethods } from '../../../lib/accountLinking.mjs'

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
    
    // WHAT: Check if user already exists (account linking flow)
    // WHY: Allow adding password to existing social accounts instead of rejecting
    const existingUser = await findUserByEmail(email)
    
    let user
    let isAccountLinking = false
    
    if (existingUser) {
      // WHAT: User exists - check if they have password or only social login
      const loginMethods = getUserLoginMethods(existingUser)
      
      if (loginMethods.includes('password')) {
        // WHAT: User already has password - they should login instead
        // WHY: Prevent duplicate accounts and guide user to correct action
        logger.warn('Registration attempted for existing email+password account', {
          email: email.toLowerCase(),
          existingMethods: loginMethods,
        })
        
        return res.status(409).json({
          error: 'Account already exists',
          message: 'An account with this email already exists. Please login instead.',
          loginMethods: loginMethods,
        })
      }
      
      // WHAT: User has social login only - add password to existing account
      // WHY: Enable account linking - same person can use multiple login methods
      logger.info('Adding password to existing social account', {
        userId: existingUser.id,
        email: existingUser.email,
        existingMethods: loginMethods,
      })
      
      // WHAT: Add password to existing social account
      await addPasswordToAccount(existingUser.id, password)
      
      // WHAT: Fetch updated user
      user = await findUserByEmail(email)
      isAccountLinking = true
      
      logger.info('Password successfully added to social account', {
        userId: user.id,
        email: user.email,
        newMethods: getUserLoginMethods(user),
      })
    } else {
      // WHAT: New user - create account normally
      user = await createPublicUser({ email, password, name })
    }
    
    // WHAT: Create session and set cookie
    const token = await createPublicSession(user.id, {
      ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
    })
    
    setPublicSessionCookie(res, token)
    
    logger.info(isAccountLinking ? 'Account linking successful' : 'User registration successful', {
      userId: user.id,
      email: user.email,
      isAccountLinking,
      loginMethods: getUserLoginMethods(user),
      ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
    })
    
    // WHAT: Return success with user data (no password)
    return res.status(isAccountLinking ? 200 : 201).json({
      success: true,
      message: isAccountLinking 
        ? 'Password added to your account successfully. You can now login with email+password or your social account.'
        : 'Registration successful',
      isAccountLinking,
      loginMethods: getUserLoginMethods(user),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
      },
    })
  } catch (err) {
    logger.error('Registration error', { error: err.message, stack: err.stack })
    
    // WHAT: Handle duplicate email error
    if (err.message.includes('already exists')) {
      return res.status(409).json({
        error: 'Email already registered',
        message: 'An account with this email already exists. Please login instead.',
      })
    }
    
    // WHAT: Handle password strength error
    if (err.message.includes('Password must be at least')) {
      return res.status(400).json({
        error: 'Weak password',
        message: err.message,
      })
    }
    
    // WHAT: Generic error response
    return res.status(500).json({
      error: 'Registration failed',
      message: 'An error occurred during registration. Please try again.',
    })
  }
}
