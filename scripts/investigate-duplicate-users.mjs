#!/usr/bin/env node
/**
 * Investigate duplicate sso@doneisbetter.com users
 * 
 * This script finds all users with the email sso@doneisbetter.com
 * and displays their complete information including app permissions.
 */

import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || 'sso';

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable is required');
  process.exit(1);
}

async function investigateDuplicates() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db(MONGODB_DB);
    const usersCollection = db.collection('users');
    const appPermissionsCollection = db.collection('appPermissions');
    
    // Find all users with email sso@doneisbetter.com
    const duplicateUsers = await usersCollection
      .find({ email: 'sso@doneisbetter.com' })
      .toArray();
    
    console.log(`\n📊 Found ${duplicateUsers.length} users with email sso@doneisbetter.com\n`);
    
    for (const user of duplicateUsers) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`User ID: ${user.id}`);
      console.log(`MongoDB _id: ${user._id}`);
      console.log(`Name: ${user.name}`);
      console.log(`Email: ${user.email}`);
      console.log(`Role: ${user.role}`);
      console.log(`Status: ${user.status}`);
      console.log(`Created: ${user.createdAt}`);
      console.log(`Updated: ${user.updatedAt}`);
      console.log(`Last Login: ${user.lastLoginAt || 'Never'}`);
      console.log(`Has Password: ${user.password ? 'Yes' : 'No'}`);
      
      // Find all app permissions for this user
      const permissions = await appPermissionsCollection
        .find({ userId: user.id })
        .toArray();
      
      console.log(`\n📱 App Permissions (${permissions.length}):`);
      for (const perm of permissions) {
        console.log(`  - ${perm.appName} (${perm.clientId})`);
        console.log(`    Role: ${perm.role}`);
        console.log(`    Status: ${perm.status}`);
        console.log(`    Requested: ${perm.requestedAt}`);
        console.log(`    Last Login: ${perm.lastLoginAt || 'Never'}`);
      }
      console.log('');
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // Suggest merge strategy
    if (duplicateUsers.length > 1) {
      console.log('💡 MERGE STRATEGY RECOMMENDATION:');
      console.log('   1. Identify the user with the most complete data');
      console.log('   2. Merge all app permissions to the primary user');
      console.log('   3. Delete the duplicate user(s)');
      console.log('   4. Ensure the primary user has superadmin role\n');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

investigateDuplicates();
