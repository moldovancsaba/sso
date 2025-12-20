#!/usr/bin/env node
/**
 * Investigate app permissions for sso@doneisbetter.com
 * 
 * This script finds all app permissions where the user email is sso@doneisbetter.com
 * and shows how they appear in the admin UI.
 */

import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || 'sso';

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable is required');
  process.exit(1);
}

async function investigateAppPermissions() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db(MONGODB_DB);
    const usersCollection = db.collection('users');
    const appPermissionsCollection = db.collection('appPermissions');
    
    // Find the user with email sso@doneisbetter.com
    const user = await usersCollection.findOne({ email: 'sso@doneisbetter.com' });
    
    if (!user) {
      console.log('❌ No user found with email sso@doneisbetter.com');
      process.exit(1);
    }
    
    console.log(`\n👤 User: ${user.name} (${user.email})`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Role: ${user.role}\n`);
    
    // Find ALL app permissions with this user's ID
    const permissions = await appPermissionsCollection
      .find({ userId: user.id })
      .toArray();
    
    console.log(`📱 App Permissions for this user (${permissions.length}):\n`);
    
    for (const perm of permissions) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`Permission ID: ${perm._id}`);
      console.log(`User ID: ${perm.userId}`);
      console.log(`User Email: ${perm.userEmail}`);
      console.log(`User Name: ${perm.userName || 'N/A'}`);
      console.log(`App: ${perm.appName} (${perm.clientId})`);
      console.log(`Role: ${perm.role}`);
      console.log(`Status: ${perm.status}`);
      console.log(`Requested: ${perm.requestedAt}`);
      console.log(`Approved: ${perm.approvedAt || 'Not approved'}`);
      console.log(`Last Login: ${perm.lastLoginAt || 'Never'}`);
      console.log('');
    }
    
    // Also search by email to find any orphaned permissions
    const permissionsByEmail = await appPermissionsCollection
      .find({ userEmail: 'sso@doneisbetter.com' })
      .toArray();
    
    console.log(`\n🔍 App Permissions by email search (${permissionsByEmail.length}):\n`);
    
    for (const perm of permissionsByEmail) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`Permission ID: ${perm._id}`);
      console.log(`User ID: ${perm.userId}`);
      console.log(`User Email: ${perm.userEmail}`);
      console.log(`User Name: ${perm.userName || 'N/A'}`);
      console.log(`App: ${perm.appName} (${perm.clientId})`);
      console.log(`Role: ${perm.role}`);
      console.log(`Status: ${perm.status}`);
      console.log(`Requested: ${perm.requestedAt}`);
      console.log(`Approved: ${perm.approvedAt || 'Not approved'}`);
      console.log(`Last Login: ${perm.lastLoginAt || 'Never'}`);
      console.log('');
    }
    
    // Check if there are duplicates
    const launchmassPerms = permissionsByEmail.filter(
      p => p.clientId === 'df9bea3a-eb1e-49b4-a8d0-3a8e0b18842f'
    );
    
    if (launchmassPerms.length > 1) {
      console.log(`\n⚠️  FOUND ${launchmassPerms.length} DUPLICATE PERMISSIONS FOR LAUNCHMASS!`);
      console.log('   These are the duplicate entries:\n');
      for (const perm of launchmassPerms) {
        console.log(`   - ${perm._id}: ${perm.userName || 'N/A'} (${perm.role}, ${perm.status})`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

investigateAppPermissions();
