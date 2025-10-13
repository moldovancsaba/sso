#!/usr/bin/env node

/**
 * WHAT: Test the OAuth token exchange to diagnose the failure
 * WHY: Launchmass is getting token_exchange_failed error
 * HOW: Simulate the exact request launchmass is making
 */

import { verifyClient } from '../lib/oauth/clients.mjs'

const clientId = 'df9bea3a-eb1e-49b4-a8d0-3a8e0b18842f'
const clientSecret = '2c5d4134-d014-438d-9273-950828ed1443'

async function main() {
  console.log('🧪 Testing OAuth client verification...\n')
  console.log('Client ID:', clientId)
  console.log('Client Secret:', clientSecret.substring(0, 8) + '...\n')
  
  try {
    const client = await verifyClient(clientId, clientSecret)
    
    if (client) {
      console.log('✅ Client verification SUCCESSFUL')
      console.log('   Client name:', client.name)
      console.log('   Client status:', client.status)
      console.log('   Redirect URIs:', client.redirect_uris)
      console.log('\n✅ Token exchange should work!')
    } else {
      console.log('❌ Client verification FAILED')
      console.log('   This is why token_exchange_failed is happening')
      console.log('\n🔍 Possible reasons:')
      console.log('   1. Client secret mismatch')
      console.log('   2. Client is not active')
      console.log('   3. Client not found')
    }
  } catch (error) {
    console.error('❌ Error during verification:', error.message)
    console.error(error.stack)
  }
}

main()
