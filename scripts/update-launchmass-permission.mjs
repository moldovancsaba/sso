#!/usr/bin/env node
/**
 * Update sso@doneisbetter.com permission for Launchmass from superadmin to admin
 */

import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || 'sso';

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable is required');
  process.exit(1);
}

async function updatePermission() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const db = client.db(MONGODB_DB);
    const appPermissions = db.collection('appPermissions');
    
    const launchmassClientId = 'df9bea3a-eb1e-49b4-a8d0-3a8e0b18842f';
    const adminUserId = 'eea56c57-d8c0-431a-8cff-181817646777';
    
    // Find current permission
    const currentPerm = await appPermissions.findOne({
      userId: adminUserId,
      clientId: launchmassClientId
    });
    
    console.log('Current Permission:');
    if (currentPerm) {
      console.log(`  User: ${currentPerm.userId}`);
      console.log(`  App: ${currentPerm.appName}`);
      console.log(`  Role: ${currentPerm.role}`);
      console.log(`  Status: ${currentPerm.status}\n`);
    } else {
      console.log('  ❌ No permission found\n');
      process.exit(1);
    }
    
    if (currentPerm.role === 'admin' && currentPerm.status === 'active') {
      console.log('✅ Permission is already set correctly!\n');
      process.exit(0);
    }
    
    console.log('Updating to:');
    console.log('  Role: admin');
    console.log('  Status: active\n');
    
    const result = await appPermissions.updateOne(
      {
        userId: adminUserId,
        clientId: launchmassClientId
      },
      {
        $set: {
          role: 'admin',
          status: 'active',
          updatedAt: new Date().toISOString()
        }
      }
    );
    
    if (result.modifiedCount > 0) {
      console.log('✅ Permission updated successfully!\n');
      console.log('Next steps:');
      console.log('  1. Clear browser cookies');
      console.log('  2. Log out and log back in');
      console.log('  3. Verify role shows as "admin" in Launchmass\n');
    } else {
      console.log('⚠️  No changes made\n');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

updatePermission();
