// scripts/generate-magic-link.mjs
// WHAT: Generates a one-time, time-limited magic link for admin login.
// HOW: Reads MONGODB_URI and ADMIN_MAGIC_SECRET from env/.env.local;
//      prints a full URL pointing to /api/admin/magic-link?t=...
// SECURITY: Does not print secrets; token is single-use and expires quickly.

import dotenv from 'dotenv'
import { createMagicToken } from '../lib/magic.mjs'

// Load local env for convenience
dotenv.config({ path: '.env.local' })

async function main() {
  const email = (process.env.NEW_MAGIC_EMAIL || '').trim().toLowerCase()
  const baseUrl = (process.env.SSO_BASE_URL || '').trim() || 'http://localhost:3000'
  const ttl = Number(process.env.MAGIC_TTL_SECONDS || 900)

  if (!email || !email.includes('@')) {
    console.error('ERR: Set NEW_MAGIC_EMAIL to the admin email (e.g., nimdasuper@doneisbetter.com)')
    process.exit(2)
  }

  try {
    const { token, expiresAt } = await createMagicToken(email, ttl)
    const url = `${baseUrl.replace(/\/$/, '')}/api/admin/magic-link?t=${encodeURIComponent(token)}`
    // Print only the URL and expiry; no secrets or internals
    console.log(JSON.stringify({ url, expiresAt }, null, 2))
    process.exit(0)
  } catch (err) {
    console.error('ERR: Failed to create magic link:', err?.message || err)
    process.exit(1)
  }
}

main()