import { MongoClient } from 'mongodb';
import { config } from '../../../lib/config.js';
import { withSession } from '../../../lib/middleware/session.js';

// Also expose this endpoint as /api/auth/validate for consistency
async function handler(req, res) {
  // Set CORS headers based on the origin
  const origin = req.headers.origin;
  if (config.cors.allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Credentials', config.cors.credentials);
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check if session exists and is valid
    const session = req.session;
    if (!session || !session.userId) {
      return res.status(401).json({
        isValid: false,
        message: 'No active session found'
      });
    }

    // Connect to MongoDB
    const client = await MongoClient.connect(config.database.uri);
    const db = client.db(config.database.name);
    const users = db.collection(config.database.collections.users);

    // Find user by session ID
    const user = await users.findOne(
      { _id: session.userId },
      { projection: { username: 1, permissions: 1 } }
    );

    if (!user) {
      return res.status(401).json({
        isValid: false,
        message: 'User not found'
      });
    }

    // Check session expiry
    const now = new Date();
    const sessionExpiry = new Date(session.expiresAt);
    
    if (now > sessionExpiry) {
      return res.status(401).json({
        isValid: false,
        message: 'Session expired'
      });
    }

    // Return successful validation with user info
    return res.status(200).json({
      isValid: true,
      user: {
        id: user._id,
        username: user.username,
        permissions: user.permissions
      },
      session: {
        expiresAt: session.expiresAt
      }
    });

  } catch (error) {
    console.error('SSO validation error:', error);
    return res.status(500).json({
      isValid: false,
      message: 'Internal server error'
    });
  }
}

export default withSession(handler);
