import { MongoClient } from 'mongodb';
import { config } from '../../../lib/config.js';
import { withSession } from '../../../lib/middleware/session.js';

async function handler(req, res) {
  // Set CORS headers based on the origin
  const origin = req.headers.origin;
  if (config.cors.allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Credentials', config.cors.credentials);
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    // Serve login page or redirect to login UI
    const { returnUrl } = req.query;
    
    // For now, redirect to the main SSO page with return URL
    const redirectTarget = returnUrl 
      ? `/?returnUrl=${encodeURIComponent(returnUrl)}`
      : '/';
    
    return res.redirect(302, redirectTarget);
  }

  if (req.method === 'POST') {
    // Handle login form submission
    const { username, password, returnUrl } = req.body;

    if (!username) {
      return res.status(400).json({ 
        error: 'Username is required',
        code: 'MISSING_USERNAME'
      });
    }

    try {
      // Connect to MongoDB
      const client = await MongoClient.connect(config.database.uri);
      const db = client.db(config.database.name);
      const users = db.collection(config.database.collections.users);

      // Find or create user (simplified for demo)
      let user = await users.findOne({ username });

      if (!user) {
        // Auto-register new users (you may want to change this behavior)
        const isFirstUser = (await users.countDocuments({})) === 0;

        user = {
          username,
          permissions: {
            isAdmin: isFirstUser,
            canViewUsers: isFirstUser,
            canManageUsers: isFirstUser
          },
          createdAt: new Date(),
          lastLogin: new Date()
        };

        const result = await users.insertOne(user);
        user._id = result.insertedId;
      } else {
        // Update last login
        await users.updateOne(
          { _id: user._id },
          { $set: { lastLogin: new Date() } }
        );
      }

      // Create session
      const sessionExpiry = new Date();
      sessionExpiry.setTime(sessionExpiry.getTime() + config.session.maxAge);

      // Set session data
      req.session.userId = user._id;
      req.session.expiresAt = sessionExpiry.toISOString();
      req.session.save(); // Save the session

      await client.close();

      // Return success with user info
      const response = {
        success: true,
        message: 'Login successful',
        user: {
          id: user._id,
          username: user.username,
          permissions: user.permissions
        },
        session: {
          expiresAt: sessionExpiry.toISOString()
        }
      };

      // If returnUrl provided, include it in response
      if (returnUrl) {
        response.returnUrl = returnUrl;
      }

      return res.status(200).json(response);

    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({ 
        error: 'Internal server error',
        code: 'SERVER_ERROR'
      });
    }
  }

  // Method not allowed
  res.setHeader('Allow', ['GET', 'POST', 'OPTIONS']);
  return res.status(405).json({ 
    error: `Method ${req.method} not allowed`,
    code: 'METHOD_NOT_ALLOWED'
  });
}

export default withSession(handler);