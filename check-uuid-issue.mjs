#!/usr/bin/env node
import 'dotenv/config'
import { getDb } from './lib/db.mjs'

const PROBLEMATIC_UUID = 'eea56c57-d8c0-431a-8cff-181817646777'

async function investigate() {
  const db = await getDb()
  
  console.log(`\n=== Searching for UUID: ${PROBLEMATIC_UUID} ===\n`)
  
  // Check admin users
  const adminUser = await db.collection('users').findOne({ id: PROBLEMATIC_UUID })
  console.log('Admin user (users collection):')
  console.log(adminUser ? JSON.stringify(adminUser, null, 2) : '❌ Not found')
  
  // Check org users
  const orgUser = await db.collection('orgUsers').findOne({ id: PROBLEMATIC_UUID })
  console.log('\nOrg user (orgUsers collection):')
  console.log(orgUser ? JSON.stringify(orgUser, null, 2) : '❌ Not found')
  
  // Check public users (if that collection exists)
  const publicUser = await db.collection('publicUsers').findOne({ id: PROBLEMATIC_UUID })
  console.log('\nPublic user (publicUsers collection):')
  console.log(publicUser ? JSON.stringify(publicUser, null, 2) : '❌ Not found')
  
  // List all collections
  console.log('\n=== Available collections ===')
  const collections = await db.listCollections().toArray()
  console.log(collections.map(c => c.name).join(', '))
  
  // Show sample orgUsers to understand structure
  console.log('\n=== Sample orgUsers (first 3) ===')
  const samples = await db.collection('orgUsers').find({}).limit(3).toArray()
  console.log(JSON.stringify(samples, null, 2))
}

investigate().catch(console.error)
