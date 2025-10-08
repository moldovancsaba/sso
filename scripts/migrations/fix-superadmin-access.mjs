#!/usr/bin/env node

/**
 * WHAT: Set SSO superadmin flags and grant launchmass access
 * WHY: Initial migration may not have run - ensuring superadmins are set up
 * HOW: Updates user records and creates app permissions
 */

import { MongoClient } from 'mongodb';

const MONGODB_URI = 'mongodb+srv://moldovancsaba:togwa1-xyhcEp-mozceb@mongodb-thanperfect.zf2o0ix.mongodb.net/sso_database?retryWrites=true&w=majority';
const LAUNCHMASS_CLIENT_ID = '04dc2cc1-9fd3-4ffa-9813-450dca97af92';

const SUPERADMIN_EMAILS = [
  'moldovancsaba@gmail.com',
  'sso@doneisbetter.com'
];

async function fix() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('sso_database');
    const publicUsers = db.collection('publicUsers');
    const users = db.collection('users');
    const appPermissions = db.collection('appPermissions');
    
    console.log('\n🔍 Looking for users...');
    
    for (const email of SUPERADMIN_EMAILS) {
      console.log(`\n📧 Processing: ${email}`);
      
      // Try publicUsers first
      let user = await publicUsers.findOne({ email });
      let collection = publicUsers;
      
      // Try private users if not found
      if (!user) {
        user = await users.findOne({ email });
        collection = users;
      }
      
      if (!user) {
        console.log(`  ⚠️  User not found - may need to register first`);
        continue;
      }
      
      console.log(`  ✅ Found user: ${user.id}`);
      console.log(`     Current isSsoSuperadmin: ${user.isSsoSuperadmin}`);
      
      // WHAT: Set isSsoSuperadmin flag
      if (!user.isSsoSuperadmin) {
        await collection.updateOne(
          { id: user.id },
          { 
            $set: { 
              isSsoSuperadmin: true,
              updatedAt: new Date().toISOString()
            } 
          }
        );
        console.log(`     ✅ Set isSsoSuperadmin = true`);
      }
      
      // WHAT: Check/create launchmass permission
      const existing = await appPermissions.findOne({
        userId: user.id,
        clientId: LAUNCHMASS_CLIENT_ID,
      });
      
      const now = new Date().toISOString();
      
      if (existing) {
        console.log(`     📋 Permission exists: ${existing.status} / ${existing.role}`);
        
        // Update if not correct
        if (existing.status !== 'active' || existing.role !== 'superadmin' || !existing.hasAccess) {
          await appPermissions.updateOne(
            { _id: existing._id },
            {
              $set: {
                hasAccess: true,
                status: 'active',
                role: 'superadmin',
                grantedAt: existing.grantedAt || now,
                grantedBy: 'fix-superadmin-access',
                updatedAt: now,
              }
            }
          );
          console.log(`     ✅ Updated to active superadmin`);
        } else {
          console.log(`     ✓  Already correct`);
        }
      } else {
        // Create new permission
        const permission = {
          userId: user.id,
          clientId: LAUNCHMASS_CLIENT_ID,
          appName: 'launchmass',
          hasAccess: true,
          status: 'active',
          role: 'superadmin',
          requestedAt: now,
          grantedAt: now,
          grantedBy: 'fix-superadmin-access',
          revokedAt: null,
          revokedBy: null,
          lastAccessedAt: null,
          createdAt: now,
          updatedAt: now,
        };
        
        await appPermissions.insertOne(permission);
        console.log(`     ✅ Created launchmass superadmin permission`);
      }
    }
    
    // WHAT: Verify results
    console.log('\n\n📊 Final Verification:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const allSuperadminsPublic = await publicUsers.find({ isSsoSuperadmin: true }).toArray();
    const allSuperadminsPrivate = await users.find({ isSsoSuperadmin: true }).toArray();
    const allSuperadmins = [...allSuperadminsPublic, ...allSuperadminsPrivate];
    
    console.log(`\n👑 SSO Superadmins: ${allSuperadmins.length}`);
    for (const u of allSuperadmins) {
      console.log(`  - ${u.email} (${u.id})`);
      
      const perms = await appPermissions.find({ userId: u.id }).toArray();
      console.log(`    Apps: ${perms.length}`);
      perms.forEach(p => {
        console.log(`      - ${p.appName}: ${p.role} (${p.status}, hasAccess: ${p.hasAccess})`);
      });
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Fix complete! You should now be able to login.');
    
  } catch (error) {
    console.error('❌ Fix failed:', error);
    throw error;
  } finally {
    await client.close();
    console.log('\n✅ Connection closed');
  }
}

fix().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
