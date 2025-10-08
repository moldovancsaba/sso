#!/usr/bin/env node

import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';

const uri = 'REDACTED_ROTATED_2026-08-14';
const client = new MongoClient(uri);

await client.connect();
console.log('✅ Connected');

const db = client.db('sso_database');
const user = await db.collection('publicUsers').findOne({ email: 'moldovancsaba@gmail.com' });

if (!user) {
  console.log('❌ User not found');
  process.exit(1);
}

// Test current password
const testPassword = 'ChangeMe123!';
const isValid = await bcrypt.compare(testPassword, user.passwordHash);
console.log('Current password test:', isValid ? '✅ VALID' : '❌ INVALID');

if (!isValid) {
  console.log('\n🔧 Resetting password to:', testPassword);
  const newHash = await bcrypt.hash(testPassword, 10);
  
  await db.collection('publicUsers').updateOne(
    { email: 'moldovancsaba@gmail.com' },
    { $set: { passwordHash: newHash, updatedAt: new Date().toISOString() } }
  );
  
  // Verify
  const user2 = await db.collection('publicUsers').findOne({ email: 'moldovancsaba@gmail.com' });
  const isValidNow = await bcrypt.compare(testPassword, user2.passwordHash);
  console.log('✅ Password reset complete');
  console.log('Verification:', isValidNow ? '✅ NOW WORKS' : '❌ STILL BROKEN');
} else {
  console.log('✅ Password is already correct - no reset needed');
}

await client.close();
