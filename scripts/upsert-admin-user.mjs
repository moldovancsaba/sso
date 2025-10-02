// scripts/upsert-admin-user.mjs
// WHAT: Upserts an admin user with provided email, name, role, and password.
// HOW: Reads configuration from environment (and .env.local). Idempotent via upsert.
// SECURITY: Does not print secrets; requires password via env. Avoids storing plaintext in repo.

import dotenv from 'dotenv'
import { randomUUID } from 'crypto'
import { getUsersCollection, findUserByEmail, createUser, ensureUserUuid, updateUserPassword, updateUser } from '../lib/users.mjs'

// Load local env (ignored by git)
dotenv.config({ path: '.env.local' })

async function main() {
  try {
    const email = (process.env.UPSERT_EMAIL || 'nimdasuper@doneisbetter.com').trim().toLowerCase()
    const name = (process.env.UPSERT_NAME || 'Nimda Super').toString().trim()
    const role = (process.env.UPSERT_ROLE || 'super-admin').toString().trim()
    const password = (process.env.UPSERT_PASSWORD || '').toString().trim()

    if (!email || !email.includes('@')) {
      console.error('ERR: UPSERT_EMAIL must be a valid email (default nimdasuper@doneisbetter.com)')
      process.exit(2)
    }
    if (!password) {
      console.error('ERR: Set UPSERT_PASSWORD in your environment (will not be printed).')
      process.exit(3)
    }

    // Ensure collection and indexes exist
    await getUsersCollection()

    let user = await findUserByEmail(email)
    if (!user) {
      // Create new user
      user = await createUser({ email, name, role, password })
      user = await ensureUserUuid(user)
      // Do not print secrets
      console.log(JSON.stringify({ status: 'CREATED', email: user.email, id: user.id, role: user.role }, null, 2))
      process.exit(0)
    }

    // Ensure UUID id exists
    user = await ensureUserUuid(user)

    // Apply updates
    await updateUserPassword(user.id || user._id?.toString(), password)
    const updated = await updateUser(user.id || user._id?.toString(), { name, role })

    console.log(JSON.stringify({ status: 'UPDATED', email: updated.email, id: updated.id || updated._id?.toString(), role: updated.role }, null, 2))
    process.exit(0)
  } catch (err) {
    console.error('ERR: Upsert admin user failed:', err?.message || err)
    process.exit(1)
  }
}

main()