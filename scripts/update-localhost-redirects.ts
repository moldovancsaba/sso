import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI || 'mongodb+srv://moldovancsaba:togwa1-xyhcEp-mozceb@mongodb-sso.zf2o0ix.mongodb.net/?retryWrites=true&w=majority&appName=mongodb-sso';

async function updateLocalhostRedirects() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db('sso');
    
    // Update existing development client
    const result = await db.collection('oauth_clients').updateOne(
      { clientId: 'local_development_client' },
      {
        $set: {
          redirectUris: [
            'http://localhost/api/auth/callback/sso',
            'https://localhost/api/auth/callback/sso'
          ]
        }
      }
    );

    if (result.matchedCount === 0) {
      // Create new client if it doesn't exist
      const now = new Date().toISOString();
      await db.collection('oauth_clients').insertOne({
        name: 'Local Development Client',
        clientId: 'local_development_client',
        clientSecret: 'local_development_secret',
        redirectUris: [
          'http://localhost/api/auth/callback/sso',
          'https://localhost/api/auth/callback/sso'
        ],
        createdAt: now,
        updatedAt: now
      });
      console.log('Created new development OAuth client');
    } else {
      console.log('Updated existing development OAuth client');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

updateLocalhostRedirects();
