#!/usr/bin/env node
/**
 * Quick fix: Update cardmass OAuth client redirect URIs
 * Run: node scripts/fix-cardmass-redirects.mjs
 */

import { getDb } from '../lib/db.mjs'

const NEW_REDIRECT_URIS = [
  'https://cardmass.doneisbetter.com/api/auth/sso/callback',
  'https://cardmass.doneisbetter.com/api/auth/callback',
  'http://localhost:6000/api/auth/callback',
  'http://localhost:6000/api/auth/sso/callback',
]

async function updateCardmassClient() {
  try {
    const db = await getDb()
    const result = await db.collection('oauthClients').updateOne(
      { name: 'cardmass' }, // Find by name
      {
        $set: {
          redirect_uris: NEW_REDIRECT_URIS,
          updated_at: new Date().toISOString(),
        },
      }
    )

    if (result.matchedCount === 0) {
      console.error('❌ Client "cardmass" not found')
      console.log('\nSearching for similar clients...')
      const clients = await db.collection('oauthClients').find({}).project({ name: 1, client_id: 1 }).toArray()
      console.log('Available clients:')
      clients.forEach(c => console.log(`  - ${c.name} (${c.client_id})`))
      process.exit(1)
    }

    console.log('✅ Updated cardmass redirect URIs successfully')
    console.log(`   - ${result.modifiedCount} document(s) modified`)
    console.log('\nNew redirect URIs:')
    NEW_REDIRECT_URIS.forEach(uri => console.log(`  ✓ ${uri}`))

    // Verify the update
    const updated = await db.collection('oauthClients').findOne({ name: 'cardmass' })
    console.log('\nVerified redirect URIs in database:')
    updated.redirect_uris.forEach(uri => console.log(`  ✓ ${uri}`))

    process.exit(0)
  } catch (error) {
    console.error('Error:', error.message)
    process.exit(1)
  }
}

updateCardmassClient()
