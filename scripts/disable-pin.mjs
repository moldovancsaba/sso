#!/usr/bin/env node
/**
 * scripts/disable-pin.mjs
 * WHAT: Disables PIN verification in database settings
 * WHY: Allow disabling PIN without redeploying or changing environment variables
 */
import dotenv from 'dotenv'
import { getDb } from '../lib/db.mjs'

dotenv.config({ path: '.env.local' })

async function main() {
  const db = await getDb()
  
  await db.collection('systemSettings').updateOne(
    { _id: 'system' },
    {
      $set: {
        pin_verification_enabled: false,
        updatedAt: new Date().toISOString()
      }
    },
    { upsert: true }
  )
  
  console.log('✓ PIN verification disabled in database')
  process.exit(0)
}

main().catch((err) => {
  console.error('Error:', err.message)
  process.exit(1)
})
