/**
 * scripts/test-email-config.mjs
 * WHAT: Test script to verify email configuration works.
 * WHY: Quick way to validate email setup before using in production.
 * 
 * Usage: node scripts/test-email-config.mjs test@example.com
 */
import 'dotenv/config'
import { sendEmail } from '../lib/email.mjs'

const testEmail = process.argv[2]

if (!testEmail) {
  console.error('❌ Usage: node scripts/test-email-config.mjs test@example.com')
  process.exit(1)
}

console.log('🧪 Testing email configuration...')
console.log(`   Provider: ${process.env.EMAIL_PROVIDER}`)
console.log(`   From: ${process.env.EMAIL_FROM}`)
console.log(`   Test recipient: ${testEmail}`)
console.log('')

try {
  // WHAT: Send a simple test email
  // WHY: Validate that email provider credentials work
  const result = await sendEmail({
    to: testEmail,
    subject: 'SSO Email Configuration Test',
    text: `Hello!

This is a test email from your SSO v5.1.0 email system.

If you received this email, your email configuration is working correctly.

Configuration Details:
- Provider: ${process.env.EMAIL_PROVIDER}
- From: ${process.env.EMAIL_FROM}
- Timestamp: ${new Date().toISOString()}

This email was sent from a test script: scripts/test-email-config.mjs

Best regards,
Your SSO System`,
  })

  if (result.success) {
    console.log('✅ Test email sent successfully!')
    console.log('')
    console.log('📬 Next steps:')
    console.log('   1. Check your inbox at:', testEmail)
    console.log('   2. Check spam folder if not in inbox')
    console.log('   3. If successful, email configuration is ready for use')
    console.log('')
    process.exit(0)
  } else {
    console.error('❌ Test email failed to send')
    console.error('   Error:', result.error)
    console.log('')
    console.log('📝 Troubleshooting:')
    console.log('   1. Check your .env file has correct email credentials')
    console.log('   2. For Google SMTP: Use app password, not regular password')
    console.log('   3. For Resend: Verify domain is verified and API key is valid')
    console.log('   4. Check EMAIL_SETUP_GUIDE.md for detailed setup instructions')
    console.log('')
    process.exit(1)
  }
} catch (error) {
  console.error('❌ Error testing email configuration:', error.message)
  console.error(error.stack)
  process.exit(1)
}
