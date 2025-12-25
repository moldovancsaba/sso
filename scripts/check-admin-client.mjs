import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { getDb } from '../lib/db.mjs'

const db = await getDb()
const client = await db.collection('oauthClients').findOne({ 
  client_id: 'sso-admin-dashboard' 
})

console.log('Client exists?', !!client)

if (client) {
  console.log('Client details:', JSON.stringify({
    name: client.name,
    internal: client.internal,
    status: client.status,
    require_pkce: client.require_pkce,
    redirect_uris: client.redirect_uris
  }, null, 2))
} else {
  console.log('sso-admin-dashboard client not found!')
}

process.exit(0)
