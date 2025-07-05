import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import clientPromise from '../../../lib/db/mongodb';
import { ObjectId } from 'mongodb';
import { User } from '../../../lib/types/user';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

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

    // Create a simple JWT token
    // Store or update user in MongoDB
    const client = await clientPromise;
    const db = client.db('sso');
    const usersCollection = db.collection('users');

    const now = new Date().toISOString();
    
    // Try to find existing user
    let user = await usersCollection.findOne({ identifier });
    
    if (!user) {
      // Create new user
      const result = await usersCollection.insertOne({
        identifier,
        createdAt: now,
        lastLoginAt: now
      });
      const newUser = await usersCollection.findOne({ _id: result.insertedId });
      user = newUser;
    } else {
      // Update last login time
      await usersCollection.updateOne(
        { _id: new ObjectId(user._id) },
        { $set: { lastLoginAt: now } }
      );
    }

    const token = jwt.sign(
      { 
        userId: user._id.toString(),
        identifier: user.identifier,
        iat: Math.floor(Date.now() / 1000),
      },
      JWT_SECRET,
      { expiresIn: '10m' } // 10 minutes expiry
    );

    return res.status(200).json({ token });
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
