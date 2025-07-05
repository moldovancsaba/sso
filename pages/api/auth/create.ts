import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import clientPromise from '../../../lib/mongodb';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const TOKEN_TTL = '10m'; // 10 minutes

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { identifier } = req.body;

    if (!identifier) {
      return res.status(400).json({ error: 'Identifier is required' });
    }

    // Create JWT token
    const token = jwt.sign(
      { 
        identifier,
        iat: Math.floor(Date.now() / 1000),
      },
      JWT_SECRET,
      { expiresIn: TOKEN_TTL }
    );

    // Log the auth action
    const client = await clientPromise;
    const db = client.db('sso');
    await db.collection('auth_logs').insertOne({
      identifier,
      action: 'created',
      timestamp: new Date().toISOString(),
      source: req.headers.origin || 'unknown'
    });

    return res.status(200).json({ token });
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
