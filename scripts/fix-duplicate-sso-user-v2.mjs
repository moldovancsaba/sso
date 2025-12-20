#!/usr/bin/env node
/**
 * Fix duplicate sso@doneisbetter.com user issue (V2)
 * 
 * Improvements:
 * - Handles existing app permissions intelligently
 * - Merges permissions by keeping the best one
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
      console.log(`  ✅ ID: ${adminUser.id}`);
      console.log(`  Name: ${adminUser.name}`);
      console.log(`  Role: ${adminUser.role}`);
    } else {
      console.log(`  ❌ NOT FOUND`);
      rl.close();
      return;
    }
    
    console.log('\nPublic User (publicUsers collection):');
    if (publicUser) {
      console.log(`  ✅ ID: ${publicUser.id} (DUPLICATE)`);
      console.log(`  Name: ${publicUser.name}`);
    } else {
      console.log(`  ✅ NOT FOUND - Already fixed!`);
      rl.close();
      return;
    }
    
    // Get permissions for both users
    const adminPermissions = await db.collection('appPermissions')
      .find({ userId: adminUser.id })
      .toArray();
    
    const publicPermissions = await db.collection('appPermissions')
      .find({ userId: publicUser.id })
      .toArray();
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('APP PERMISSIONS ANALYSIS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log(`Admin User has ${adminPermissions.length} permission(s):`);
    for (const perm of adminPermissions) {
      console.log(`  - ${perm.appName || perm.clientId}: ${perm.role} (${perm.status})`);
    }
    
    console.log(`\nPublic User has ${publicPermissions.length} permission(s):`);
    for (const perm of publicPermissions) {
      console.log(`  - ${perm.appName || perm.clientId}: ${perm.role} (${perm.status})`);
    }
    
    // Find conflicts
    const adminAppIds = new Set(adminPermissions.map(p => p.clientId));
    const conflicts = publicPermissions.filter(p => adminAppIds.has(p.clientId));
    const nonConflicts = publicPermissions.filter(p => !adminAppIds.has(p.clientId));
    
    if (conflicts.length > 0) {
      console.log(`\n⚠️  Found ${conflicts.length} conflicting permission(s):`);
      for (const perm of conflicts) {
        const adminPerm = adminPermissions.find(p => p.clientId === perm.clientId);
        console.log(`  - ${perm.appName || perm.clientId}:`);
        console.log(`    Admin: ${adminPerm.role} (${adminPerm.status})`);
        console.log(`    Public: ${perm.role} (${perm.status})`);
      }
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('PROPOSED FIX');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('This script will:');
    console.log(`  1. Delete all ${conflicts.length} conflicting public user permissions`);
    if (nonConflicts.length > 0) {
      console.log(`  2. Migrate ${nonConflicts.length} non-conflicting permission(s) to admin user`);
    }
    console.log(`  3. Delete the public user from SSO\n`);
    
    const answer = await question('Do you want to proceed? (yes/no): ');
    
    if (answer.toLowerCase() !== 'yes') {
      console.log('\n❌ Operation cancelled');
      rl.close();
      return;
    }
    
    // Delete conflicting permissions
    if (conflicts.length > 0) {
      console.log('\n⏳ Deleting conflicting permissions...');
      for (const perm of conflicts) {
        await db.collection('appPermissions').deleteOne({ _id: perm._id });
      }
      console.log(`✅ Deleted ${conflicts.length} conflicting permission(s)`);
    }
    
    // Migrate non-conflicting permissions
    if (nonConflicts.length > 0) {
      console.log('\n⏳ Migrating non-conflicting permissions...');
      for (const perm of nonConflicts) {
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
      console.log(`✅ Migrated ${nonConflicts.length} permission(s)`);
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
      console.log(`   Run: node scripts/delete-launchmass-duplicate.mjs`);
      console.log('\n2. Verify the admin user can log in to Launchmass');
      console.log('3. Check that the role is correctly shown as superadmin\n');
    } else {
      console.log('❌ Failed to delete public user');
    }
    
    rl.close();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    rl.close();
    process.exit(1);
  } finally {
    await client.close();
  }
}

fixDuplicateUser();
