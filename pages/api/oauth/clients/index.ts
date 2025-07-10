import { NextApiRequest, NextApiResponse } from 'next';
import { Database } from '../../../../lib/db/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const db = await Database.getInstance();

    switch (req.method) {
      case 'GET':
        const clients = await db.listOAuthClients();
        return res.status(200).json(clients);

      case 'POST':
        const { name, redirectUris } = req.body;
        
        if (!name || !redirectUris || !Array.isArray(redirectUris)) {
          return res.status(400).json({ error: 'Invalid request body' });
        }

        const client = await db.createOAuthClient(name, redirectUris);
        return res.status(201).json(client);

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error handling OAuth clients:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
