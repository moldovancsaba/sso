#!/usr/bin/env node
/**
 * Fix duplicate sso@doneisbetter.com user issue
 * 
 * Problem: Same email exists as both admin user and public user
 * Solution: Delete the public user (keep admin user only)
 */

import { MongoClient } from 'mongodb';
import readline from 'readline';

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || 'sso';

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable is required');
  process.exit(1);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function fixDuplicateUser() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const db = client.db(MONGODB_DB);
    
    const adminUser = await db.collection('users').findOne({ email: 'sso@doneisbetter.com' });
    const publicUser = await db.collection('publicUsers').findOne({ email: 'sso@doneisbetter.com' });
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('CURRENT STATE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('Admin User (users collection):');
    if (adminUser) {
      console.log(`  ✅ EXISTS`);
      console.log(`  ID: ${adminUser.id}`);
      console.log(`  Name: ${adminUser.name}`);
      console.log(`  Role: ${adminUser.role}`);
    } else {
      console.log(`  ❌ NOT FOUND`);
    }
    
    console.log('\nPublic User (publicUsers collection):');
    if (publicUser) {
      console.log(`  ✅ EXISTS (THIS IS THE PROBLEM)`);
      console.log(`  ID: ${publicUser.id}`);
      console.log(`  Name: ${publicUser.name}`);
    } else {
      console.log(`  ❌ NOT FOUND`);
    }
    
    if (!publicUser) {
      console.log('\n✅ No duplicate found. The issue may already be fixed.');
      rl.close();
      return;
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('PROPOSED FIX');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('This script will:');
    console.log('  1. Delete the public user from SSO publicUsers collection');
    console.log('  2. Check for app permissions linked to this public user');
    console.log('  3. Optionally migrate permissions to the admin user\n');
    
    const answer = await question('Do you want to proceed? (yes/no): ');
    
    if (answer.toLowerCase() !== 'yes') {
      console.log('\n❌ Operation cancelled');
      rl.close();
      return;
    }
    
    // Check for app permissions
    const appPermissions = await db.collection('appPermissions')
      .find({ userId: publicUser.id })
      .toArray();
    
    console.log(`\n📱 Found ${appPermissions.length} app permission(s) for public user`);
    
    if (appPermissions.length > 0) {
      console.log('\nApp permissions:');
      for (const perm of appPermissions) {
        console.log(`  - ${perm.appName}: ${perm.role} (${perm.status})`);
      }
      
      const migrate = await question('\nMigrate these permissions to admin user? (yes/no): ');
      
      if (migrate.toLowerCase() === 'yes') {
        console.log('\n⏳ Migrating permissions...');
        for (const perm of appPermissions) {
          await db.collection('appPermissions').updateOne(
            { _id: perm._id },
            { 
              $set: { 
                userId: adminUser.id,
                userEmail: adminUser.email,
                userName: adminUser.name
              } 
            }
          );
        }
        console.log('✅ Permissions migrated');
      } else {
        console.log('\n⏳ Deleting permissions...');
        await db.collection('appPermissions').deleteMany({ userId: publicUser.id });
        console.log('✅ Permissions deleted');
      }
    }
    
    // Delete public user
    console.log('\n⏳ Deleting public user from SSO...');
    const result = await db.collection('publicUsers').deleteOne({ id: publicUser.id });
    
    if (result.deletedCount === 1) {
      console.log('✅ Public user deleted successfully');
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('NEXT STEPS');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log(`1. Delete duplicate user from Launchmass database`);
      console.log(`   MongoDB ID: 6910cbbe1e1171ee670e6f30`);
      console.log(`   SSO User ID: ${publicUser.id}`);
      console.log('\n2. Verify the admin user can log in to Launchmass');
      console.log('3. Check that the role is correctly shown as superadmin\n');
    } else {
      console.log('❌ Failed to delete public user');
    }
    
    rl.close();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    rl.close();
    process.exit(1);
  } finally {
    await client.close();
  }
}

fixDuplicateUser();
