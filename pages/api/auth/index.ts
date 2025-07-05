import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import clientPromise from '../../../lib/mongodb';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { token, redirect } = req.query;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    // If no redirect specified, go to home page
    const redirectUrl = redirect ? (redirect as string).replace('undefined', '') : '/';
    }

    // Verify token
    try {
      const decoded = jwt.verify(token as string, JWT_SECRET);
      
      // Log the auth action
      const client = await clientPromise;
      const db = client.db('thanperfect');
      await db.collection('auth_logs').insertOne({
        identifier: (decoded as any).identifier,
        action: 'used',
        timestamp: new Date().toISOString(),
        source: req.headers.origin || 'unknown'
      });

      // Redirect to the specified URL
      res.redirect(302, redirectUrl);
    } catch (error) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
