#!/usr/bin/env node
/**
 * scripts/approve-launchmass-access.mjs
 * WHAT: Approves user access to Launchmass by updating appPermissions
 * WHY: Grant superadmin access to specific user without using API
 */
import dotenv from 'dotenv'
import { getDb } from '../lib/db.mjs'

dotenv.config({ path: '.env.local' })

const USER_ID = 'eea56c57-d8c0-431a-8cff-181817646777' // sso@doneisbetter.com
const CLIENT_ID = 'df9bea3a-eb1e-49b4-a8d0-3a8e0b18842f' // launchmass

async function main() {
  const db = await getDb()
  const col = db.collection('appPermissions')
  
  const now = new Date().toISOString()
  
  // Find existing permission request
  const existing = await col.findOne({ userId: USER_ID, clientId: CLIENT_ID })
  
  if (!existing) {
    console.log('No pending request found. Creating new permission...')
    await col.insertOne({
      userId: USER_ID,
      clientId: CLIENT_ID,
      hasAccess: true,  // CRITICAL: Required for OAuth callback to grant access
      role: 'superadmin',
      status: 'active',
      grantedAt: now,
      grantedBy: USER_ID, // Self-approved
      requestedAt: now,
      updatedAt: now,
    })
    console.log('✓ Created and granted superadmin access to Launchmass')
  } else {
    console.log('Found existing request. Updating to active superadmin...')
    await col.updateOne(
      { userId: USER_ID, clientId: CLIENT_ID },
      {
        $set: {
          hasAccess: true,  // CRITICAL: Required for OAuth callback to grant access
          status: 'active',
          role: 'superadmin',
          grantedAt: now,
          grantedBy: USER_ID, // Self-approved
          updatedAt: now,
        }
      }
    )
    console.log('✓ Updated to active superadmin access for Launchmass')
  }
  
  // Verify the update
  const updated = await col.findOne({ userId: USER_ID, clientId: CLIENT_ID })
  console.log('\nCurrent permission:')
  console.log(JSON.stringify({
    hasAccess: updated.hasAccess,
    role: updated.role,
    status: updated.status,
    grantedAt: updated.grantedAt,
  }, null, 2))
  
  process.exit(0)
}

main().catch((err) => {
  console.error('Error:', err.message)
  process.exit(1)
})
