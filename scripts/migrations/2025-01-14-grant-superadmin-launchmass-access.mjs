#!/usr/bin/env node

/**
 * WHAT: Migration to grant SSO superadmins automatic access to launchmass
 * WHY: Superadmins need access to manage other users' permissions
 * HOW: Creates appPermission records with superadmin role for existing SSO superadmins
 * 
 * Run: node scripts/migrations/2025-01-14-grant-superadmin-launchmass-access.mjs
 */

import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://moldovancsaba:togwa1-xyhcEp-mozceb@mongodb-thanperfect.zf2o0ix.mongodb.net/sso?retryWrites=true&w=majority&appName=mongodb-thanperfect';
const LAUNCHMASS_CLIENT_ID = '6e85956d-5d80-4dcc-afe0-6f53e5c58316';

async function migrate() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('sso');
    const publicUsers = db.collection('publicUsers');
    const users = db.collection('users');
    const appPermissions = db.collection('appPermissions');
    
    // WHAT: Find all SSO superadmins
    // WHY: They need automatic access to all apps
    const superadminsPublic = await publicUsers.find({ isSsoSuperadmin: true }).toArray();
    const superadminsPrivate = await users.find({ isSsoSuperadmin: true }).toArray();
    
    const allSuperadmins = [...superadminsPublic, ...superadminsPrivate];
    
    console.log(`\n📋 Found ${allSuperadmins.length} SSO superadmins:`);
    allSuperadmins.forEach(u => {
      console.log(`  - ${u.email} (${u.id})`);
    });
    
    // WHAT: Grant each superadmin access to launchmass with superadmin role
    // WHY: Superadmins need to manage other users
    const now = new Date().toISOString();
    let created = 0;
    let skipped = 0;
    
    for (const superadmin of allSuperadmins) {
      // Check if permission already exists
      const existing = await appPermissions.findOne({
        userId: superadmin.id,
        clientId: LAUNCHMASS_CLIENT_ID,
      });
      
      if (existing) {
        console.log(`  ⏭️  ${superadmin.email} - already has permission (${existing.status})`);
        
        // Update to ensure correct status if needed
        if (existing.status !== 'active' || existing.role !== 'superadmin' || !existing.hasAccess) {
          await appPermissions.updateOne(
            { _id: existing._id },
            {
              $set: {
                hasAccess: true,
                status: 'active',
                role: 'superadmin',
                grantedAt: existing.grantedAt || now,
                grantedBy: 'migration-2025-01-14',
                updatedAt: now,
              }
            }
          );
          console.log(`    ✅ Updated to active superadmin`);
          created++;
        } else {
          skipped++;
        }
        continue;
      }
      
      // WHAT: Create new permission record
      const permission = {
        userId: superadmin.id,
        clientId: LAUNCHMASS_CLIENT_ID,
        appName: 'launchmass',
        hasAccess: true,
        status: 'active',
        role: 'superadmin',
        requestedAt: now,
        grantedAt: now,
        grantedBy: 'migration-2025-01-14',
        revokedAt: null,
        revokedBy: null,
        lastAccessedAt: null,
        createdAt: now,
        updatedAt: now,
      };
      
      await appPermissions.insertOne(permission);
      console.log(`  ✅ ${superadmin.email} - granted launchmass superadmin access`);
      created++;
    }
    
    console.log(`\n✅ Migration complete:`);
    console.log(`  - ${created} permissions created/updated`);
    console.log(`  - ${skipped} already correct`);
    
    // WHAT: Verify the results
    console.log('\n📊 Verification:');
    const allPermissions = await appPermissions.find({
      clientId: LAUNCHMASS_CLIENT_ID,
      status: 'active'
    }).toArray();
    
    console.log(`  Total active launchmass permissions: ${allPermissions.length}`);
    for (const p of allPermissions) {
      const u = await publicUsers.findOne({ id: p.userId }) || await users.findOne({ id: p.userId });
      console.log(`  - ${u?.email || p.userId}: ${p.role} (${p.status})`);
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await client.close();
    console.log('\n✅ Connection closed');
  }
}

migrate().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
