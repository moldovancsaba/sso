#!/usr/bin/env node
/**
 * Check publicUsers collection for duplicates
 * 
 * This script looks for duplicate entries in the publicUsers collection
 * especially for sso@doneisbetter.com
 */

import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || 'sso';

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable is required');
  process.exit(1);
}

async function checkPublicUsers() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db(MONGODB_DB);
    const publicUsersCollection = db.collection('publicUsers');
    
    // Find all users with email sso@doneisbetter.com
    const publicUsers = await publicUsersCollection
      .find({ email: 'sso@doneisbetter.com' })
      .toArray();
    
    console.log(`\n📊 Found ${publicUsers.length} entries in publicUsers collection for sso@doneisbetter.com\n`);
    
    for (const user of publicUsers) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`User ID: ${user.id}`);
      console.log(`MongoDB _id: ${user._id}`);
      console.log(`Name: ${user.name}`);
      console.log(`Email: ${user.email}`);
      console.log(`Status: ${user.status || 'active'}`);
      console.log(`Created: ${user.createdAt}`);
      console.log(`Updated: ${user.updatedAt}`);
      console.log(`Last Login: ${user.lastLoginAt || 'Never'}`);
      console.log(`Has Password: ${user.password || user.passwordHash ? 'Yes' : 'No'}`);
      console.log(`Email Verified: ${user.emailVerified !== false ? 'Yes' : 'No'}`);
      console.log(`Login Count: ${user.loginCount || 0}`);
      console.log('');
    }
    
    // Also check if there are duplicate email addresses in general
    const duplicateEmails = await publicUsersCollection.aggregate([
      { $group: { _id: '$email', count: { $sum: 1 }, ids: { $push: '$id' } } },
      { $match: { count: { $gt: 1 } } }
    ]).toArray();
    
    if (duplicateEmails.length > 0) {
      console.log('\n⚠️  FOUND DUPLICATE EMAILS IN PUBLIC USERS:\n');
      for (const dup of duplicateEmails) {
        console.log(`  Email: ${dup._id}`);
        console.log(`  Count: ${dup.count}`);
        console.log(`  IDs: ${dup.ids.join(', ')}`);
        console.log('');
      }
    } else {
      console.log('\n✅ No duplicate emails found in publicUsers collection\n');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

checkPublicUsers();
