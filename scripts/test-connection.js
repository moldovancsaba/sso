/**
 * Test script to verify MongoDB Atlas connection
 */
import { MongoClient } from 'mongodb';
import { config } from '../lib/config.js';

async function testConnection() {
  try {
    console.log('🔄 Testing MongoDB Atlas connection...');
    console.log(`📍 Connecting to: ${config.database.uri.replace(/\/\/.*@/, '//***:***@')}`);
    console.log(`🗄️  Database: ${config.database.name}`);
    
    const client = await MongoClient.connect(config.database.uri);
    const db = client.db(config.database.name);
    
    // Test basic operations
    await db.admin().ping();
    console.log('✅ Successfully connected to MongoDB Atlas!');
    
    // List collections
    const collections = await db.listCollections().toArray();
    console.log(`📂 Collections found: ${collections.length}`);
    collections.forEach(col => console.log(`   - ${col.name}`));
    
    // Test user collection access
    const usersCollection = db.collection(config.database.collections.users);
    const userCount = await usersCollection.countDocuments();
    console.log(`👥 Users in database: ${userCount}`);
    
    await client.close();
    console.log('✅ Connection test completed successfully!');
    
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    process.exit(1);
  }
}

testConnection();