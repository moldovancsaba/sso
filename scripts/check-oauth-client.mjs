import dotenv from 'dotenv'
import { getDb } from '../lib/db.mjs'

dotenv.config()

async function checkClient() {
  const db = await getDb()
  const client = await db.collection('oauthClients').findOne({ 
    client_id: 'sso-admin-dashboard' 
  })
  
  if (!client) {
    console.log('❌ sso-admin-dashboard client NOT FOUND in database')
    console.log('Running bootstrap...\n')
    process.exit(1)
  }
  
  console.log('✅ sso-admin-dashboard client EXISTS')
  console.log('   Name:', client.name)
  console.log('   Status:', client.status)
  console.log('   Redirect URIs:', client.redirect_uris)
  process.exit(0)
}

checkClient()
