#!/usr/bin/env node
/**
 * Find ALL users with sso@doneisbetter.com across all SSO collections
 */

import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || 'sso';

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable is required');
  process.exit(1);
}

async function findAllSsoUsers() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db(MONGODB_DB);
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('SEARCHING IN USERS COLLECTION (Admin Users)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const adminUsers = await db.collection('users')
      .find({ email: 'sso@doneisbetter.com' })
      .toArray();
    
    console.log(`Found ${adminUsers.length} admin user(s):\n`);
    for (const user of adminUsers) {
      console.log(`  - ID: ${user.id}`);
      console.log(`    Name: ${user.name}`);
      console.log(`    Email: ${user.email}`);
      console.log(`    Role: ${user.role}`);
      console.log(`    Status: ${user.status || 'N/A'}`);
      console.log(`    Created: ${user.createdAt}`);
      console.log('');
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('SEARCHING IN PUBLIC USERS COLLECTION');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const publicUsers = await db.collection('publicUsers')
      .find({ email: 'sso@doneisbetter.com' })
      .toArray();
    
    console.log(`Found ${publicUsers.length} public user(s):\n`);
    for (const user of publicUsers) {
      console.log(`  - ID: ${user.id}`);
      console.log(`    Name: ${user.name}`);
      console.log(`    Email: ${user.email}`);
      console.log(`    Status: ${user.status || 'active'}`);
      console.log(`    Created: ${user.createdAt}`);
      console.log(`    Last Login: ${user.lastLoginAt || 'Never'}`);
      console.log('');
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('SEARCHING FOR SPECIFIC USER IDs IN ALL COLLECTIONS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const userId1 = 'eea56c57-d8c0-431a-8cff-181817646777';
    const userId2 = '0c6f6cb3-a13a-49b5-a372-bce7881b84c8';
    
    console.log(`Looking for user ID: ${userId1}`);
    const user1Admin = await db.collection('users').findOne({ id: userId1 });
    const user1Public = await db.collection('publicUsers').findOne({ id: userId1 });
    console.log(`  - In users collection: ${user1Admin ? 'YES' : 'NO'}`);
    if (user1Admin) console.log(`    Name: ${user1Admin.name}, Email: ${user1Admin.email}, Role: ${user1Admin.role}`);
    console.log(`  - In publicUsers collection: ${user1Public ? 'YES' : 'NO'}`);
    if (user1Public) console.log(`    Name: ${user1Public.name}, Email: ${user1Public.email}`);
    
    console.log(`\nLooking for user ID: ${userId2}`);
    const user2Admin = await db.collection('users').findOne({ id: userId2 });
    const user2Public = await db.collection('publicUsers').findOne({ id: userId2 });
    console.log(`  - In users collection: ${user2Admin ? 'YES' : 'NO'}`);
    if (user2Admin) console.log(`    Name: ${user2Admin.name}, Email: ${user2Admin.email}, Role: ${user2Admin.role}`);
    console.log(`  - In publicUsers collection: ${user2Public ? 'YES' : 'NO'}`);
    if (user2Public) console.log(`    Name: ${user2Public.name}, Email: ${user2Public.email}`);
    
    console.log('\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

findAllSsoUsers();
