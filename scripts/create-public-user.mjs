#!/usr/bin/env node

import { MongoClient } from 'mongodb';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const uri = 'mongodb+srv://moldovancsaba:togwa1-xyhcEp-mozceb@mongodb-thanperfect.zf2o0ix.mongodb.net/sso_database?retryWrites=true&w=majority';

const client = new MongoClient(uri);

try {
  await client.connect();
  console.log('✅ Connected to MongoDB');
  
  const db = client.db('sso_database');
  const publicUsers = db.collection('publicUsers');
  
  const email = 'moldovancsaba@gmail.com';
  
  // Check if already exists
  const existing = await publicUsers.findOne({ email });
  
  if (existing) {
    console.log('✅ User already exists in publicUsers');
    console.log('  ID:', existing.id);
    console.log('  Status:', existing.status);
    process.exit(0);
  }
  
  console.log('Creating public user account...');
  
  // Create user with a default password (you can change it later via "forgot password")
  const defaultPassword = 'ChangeMe123!'; // User should change this
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);
  
  const newUser = {
    id: crypto.randomUUID(),
    email: email,
    name: 'Csaba Moldovan',
    password: hashedPassword,
    status: 'active',
    role: 'user',
    isSsoSuperadmin: true, // Important!
    emailVerified: true, // Skip email verification for you
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastLoginAt: null,
  };
  
  await publicUsers.insertOne(newUser);
  
  console.log('✅ Public user created!');
  console.log('  ID:', newUser.id);
  console.log('  Email:', newUser.email);
  console.log('  Password:', defaultPassword);
  console.log('  isSsoSuperadmin:', newUser.isSsoSuperadmin);
  console.log('\n⚠️  IMPORTANT: Login with this password, then change it!');
  
} catch (error) {
  console.error('❌ Error:', error);
  process.exit(1);
} finally {
  await client.close();
}
