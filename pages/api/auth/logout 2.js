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
    res.setHeader('Access-Control-Allow-Methods', 'POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST', 'OPTIONS']);
    return res.status(405).json({ 
      error: `Method ${req.method} not allowed`,
      code: 'METHOD_NOT_ALLOWED'
    });
  }

  try {
    const { returnUrl } = req.body;

    // Clear session using our session middleware
    req.session.destroy();

    const response = {
      success: true,
      message: 'Logged out successfully'
    };

    // Include return URL if provided
    if (returnUrl) {
      response.returnUrl = returnUrl;
    }

    return res.status(200).json(response);

  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ 
      error: 'Failed to logout',
      code: 'SERVER_ERROR'
    });
  }
}

export default withSession(handler);