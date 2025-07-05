import { NextApiRequest, NextApiResponse } from 'next';
import { randomUUID } from 'crypto';
import clientPromise from '../../../../lib/mongodb';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;
  const client = await clientPromise;
  const db = client.db('sso');
  const tenantsCollection = db.collection('tenants');

  switch (req.method) {
    case 'POST':
      try {
        const { name } = req.body;

        if (!name) {
          return res.status(400).json({ error: 'API key name is required' });
        }

        const newApiKey = {
          key: `sso_${randomUUID().replace(/-/g, '')}`,
          name,
          createdAt: new Date().toISOString(),
          lastUsed: new Date().toISOString()
        };

        const result = await tenantsCollection.findOneAndUpdate(
          { id },
          { 
            $push: { apiKeys: newApiKey },
            $set: { updatedAt: new Date().toISOString() }
          },
          { returnDocument: 'after' }
        );

        if (!result.value) {
          return res.status(404).json({ error: 'Tenant not found' });
        }

        return res.status(201).json(newApiKey);
      } catch (error) {
        console.error('Error creating API key:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }

    case 'DELETE':
      try {
        const { key } = req.query;

        if (!key) {
          return res.status(400).json({ error: 'API key is required' });
        }

        const result = await tenantsCollection.findOneAndUpdate(
          { id },
          { 
            $pull: { apiKeys: { key } },
            $set: { updatedAt: new Date().toISOString() }
          },
          { returnDocument: 'after' }
        );

        if (!result.value) {
          return res.status(404).json({ error: 'Tenant or API key not found' });
        }

        return res.status(204).end();
      } catch (error) {
        console.error('Error deleting API key:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }

    default:
      res.setHeader('Allow', ['POST', 'DELETE']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
