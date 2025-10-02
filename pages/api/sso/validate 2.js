import { MongoClient } from 'mongodb';

const MONGODB_URI = 'mongodb+srv://moldovancsaba:togwa1-xyhcEp-mozceb@mongodb-thanperfect.zf2o0ix.mongodb.net/?retryWrites=true&w=majority&appName=mongodb-thanperfect';
const MONGODB_DB = 'session-spa';

// List of allowed origins
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://your-production-domain.com',
  // Add more allowed domains here
];

export default async function handler(req, res) {
  // Set CORS headers based on the origin
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Credentials', true);
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
    const client = await MongoClient.connect(MONGODB_URI);
    const db = client.db(MONGODB_DB);
    const users = db.collection('users');

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
