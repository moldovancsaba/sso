#!/usr/bin/env node
/**
 * scripts/test-magic-link.mjs - Test magic link generation and email sending
 * WHAT: Diagnostic script to test public user magic link flow
 * WHY: Debug why magic links aren't being sent in production
 * 
 * Usage: NEW_MAGIC_EMAIL=user@example.com node scripts/test-magic-link.mjs
 */

// Load environment variables from .env.local
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const envPath = resolve(__dirname, '../.env.local')
config({ path: envPath })

import { getDb } from '../lib/db.mjs'
import { findPublicUserByEmail } from '../lib/publicUsers.mjs'
import { sendEmail } from '../lib/email.mjs'
import { buildMagicLinkEmail } from '../lib/emailTemplates.mjs'
import crypto from 'crypto'

const EMAIL = process.env.NEW_MAGIC_EMAIL

if (!EMAIL) {
  console.error('❌ Error: NEW_MAGIC_EMAIL environment variable is required')
  console.log('Usage: NEW_MAGIC_EMAIL=user@example.com node scripts/test-magic-link.mjs')
  process.exit(1)
}

console.log('🔍 Testing magic link generation for:', EMAIL)
console.log('')

// Test environment variables
console.log('📋 Environment Variables:')
console.log('  MONGODB_URI:', process.env.MONGODB_URI ? '✅ Set' : '❌ Missing')
console.log('  PUBLIC_MAGIC_SECRET:', process.env.PUBLIC_MAGIC_SECRET ? '✅ Set' : '❌ Missing')
console.log('  JWT_SECRET:', process.env.JWT_SECRET ? '✅ Set' : '❌ Missing')
console.log('  SSO_BASE_URL:', process.env.SSO_BASE_URL || 'http://localhost:3000')
console.log('  SMTP_HOST:', process.env.SMTP_HOST ? '✅ Set' : '❌ Missing')
console.log('  SMTP_USER:', process.env.SMTP_USER ? '✅ Set' : '❌ Missing')
console.log('  SMTP_PASS:', process.env.SMTP_PASS ? '✅ Set' : '❌ Missing')
console.log('')

try {
  // Find user
  console.log('🔍 Finding user...')
  const user = await findPublicUserByEmail(EMAIL.toLowerCase().trim())
  
  if (!user) {
    console.error('❌ User not found:', EMAIL)
    process.exit(1)
  }
  
  console.log('✅ User found:')
  console.log('  ID:', user._id.toString())
  console.log('  Email:', user.email)
  console.log('  Email Verified:', user.emailVerified !== false ? 'Yes' : 'No')
  console.log('')
  
  if (user.emailVerified === false) {
    console.error('❌ Email not verified. Magic links only work for verified emails.')
    process.exit(1)
  }
  
  // Check secret
  const SECRET = process.env.PUBLIC_MAGIC_SECRET || process.env.JWT_SECRET
  if (!SECRET) {
    console.error('❌ PUBLIC_MAGIC_SECRET or JWT_SECRET must be set')
    process.exit(1)
  }
  console.log('✅ Magic link secret found')
  console.log('')
  
  // Generate token
  console.log('🔐 Generating magic link token...')
  const now = Math.floor(Date.now() / 1000)
  const exp = now + 900 // 15 minutes
  const jti = crypto.randomBytes(16).toString('hex')
  
  const payload = {
    typ: 'public-magic',
    email: user.email,
    iat: now,
    exp,
    jti,
  }
  
  const payloadJson = JSON.stringify(payload)
  const payloadB64 = Buffer.from(payloadJson, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
  
  const signature = crypto
    .createHmac('sha256', SECRET)
    .update(payloadB64)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
  
  const token = `${payloadB64}.${signature}`
  
  console.log('✅ Token generated')
  console.log('  JTI:', jti)
  console.log('  Expires:', new Date(exp * 1000).toISOString())
  console.log('  Token (first 50 chars):', token.substring(0, 50) + '...')
  console.log('')
  
  // Store in database
  console.log('💾 Storing token in database...')
  const db = await getDb()
  await db.collection('publicMagicTokens').insertOne({
    jti,
    email: user.email,
    createdAt: new Date(),
    exp: new Date(exp * 1000),
    usedAt: null,
  })
  console.log('✅ Token stored')
  console.log('')
  
  // Build magic link
  const SSO_BASE_URL = process.env.SSO_BASE_URL || 'http://localhost:3000'
  const magicLink = `${SSO_BASE_URL}/api/public/magic-login?token=${encodeURIComponent(token)}`
  
  console.log('🔗 Magic link:')
  console.log('  ', magicLink)
  console.log('')
  
  // Build email
  console.log('📧 Building email...')
  const emailContent = buildMagicLinkEmail({
    userType: 'public',
    email: user.email,
    magicLink,
  })
  
  console.log('✅ Email content:')
  console.log('  Subject:', emailContent.subject)
  console.log('  Text preview:', emailContent.text.substring(0, 100) + '...')
  console.log('')
  
  // Send email
  console.log('📬 Sending email...')
  try {
    await sendEmail({
      to: user.email,
      subject: emailContent.subject,
      text: emailContent.text,
    })
    console.log('✅ Email sent successfully!')
    console.log('')
    console.log('🎉 Test completed successfully!')
    console.log('Check your inbox at:', user.email)
  } catch (emailError) {
    console.error('❌ Email sending failed:')
    console.error('  Error:', emailError.message)
    console.error('  Stack:', emailError.stack)
    console.log('')
    console.log('🔗 But the magic link was generated successfully. You can use it directly:')
    console.log('  ', magicLink)
    process.exit(1)
  }
  
} catch (error) {
  console.error('❌ Test failed:')
  console.error('  Error:', error.message)
  console.error('  Stack:', error.stack)
  process.exit(1)
}

process.exit(0)
