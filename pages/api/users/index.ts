import { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '../../../lib/db/mongodb';
import { User } from '../../../lib/types/user';
import { WithId, Document } from 'mongodb';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const client = await clientPromise;
    const db = client.db('sso');
    const usersCollection = db.collection('users');

    const users = await usersCollection
      .find<WithId<Document> & {
        identifier: string;
        createdAt: string;
        lastLoginAt: string;
      }>({})
      .sort({ createdAt: -1 })
      .toArray();

    const formattedUsers: User[] = users.map(user => ({
      id: user._id.toString(),
      identifier: user.identifier,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt
    }));

    return res.status(200).json(formattedUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
