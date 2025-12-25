#!/usr/bin/env node
import { MongoClient } from 'mongodb'
import dotenv from 'dotenv'

dotenv.config()

const client = new MongoClient(process.env.MONGODB_URI)
await client.connect()
const db = client.db('sso')

const sessions = await db.collection('publicSessions').find({
  expiresAt: { $gt: new Date() }
}).sort({ createdAt: -1 }).limit(10).toArray()

console.log(`Active sessions: ${sessions.length}\n`)
sessions.forEach((s, i) => {
  console.log(`${i + 1}. User: ${s.userId}`)
  console.log(`   Email: ${s.email}`)
  console.log(`   Token: ${s.token.substring(0, 20)}...`)
  console.log(`   Created: ${s.createdAt}`)
  console.log(`   Expires: ${s.expiresAt}`)
  console.log(`   User-Agent: ${s.userAgent?.substring(0, 60)}...`)
  console.log()
})

await client.close()
