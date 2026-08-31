/**
 * scripts/test-connection.js — Verify the MongoDB connection the app actually uses.
 * WHAT: Connects with MONGODB_URI / MONGODB_DB (loaded from .env.local like the
 *       other scripts), pings, and lists collections.
 * WHY: Quick standalone diagnostic. Reads the same env vars as lib/db.mjs rather
 *      than the deleted lib/config.js, which documented variables nothing used.
 */
import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

dotenv.config({ path: '.env.local' });

async function testConnection() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB || 'sso';

  if (!uri) {
    console.error('ERR: MONGODB_URI is not set (env or .env.local)');
    process.exit(2);
  }

  try {
    console.log(`Connecting to: ${uri.replace(/\/\/.*@/, '//***:***@')}`);
    console.log(`Database: ${dbName}`);

    const client = await MongoClient.connect(uri);
    const db = client.db(dbName);

    await db.admin().ping();
    console.log('Connected successfully.');

    const collections = await db.listCollections().toArray();
    console.log(`Collections (${collections.length}): ${collections.map((c) => c.name).join(', ') || '(none)'}`);

    await client.close();
    process.exit(0);
  } catch (error) {
    console.error('Connection failed:', error.message);
    process.exit(1);
  }
}

testConnection();
