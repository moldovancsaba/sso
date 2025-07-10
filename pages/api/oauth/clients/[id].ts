import { NextApiRequest, NextApiResponse } from 'next';
import { Database } from '../../../../lib/db/database';
import { validateRequest } from '../../../../lib/middleware/requestValidator';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const db = await Database.getInstance();
    const { id } = req.query;
    const { name, redirectUris } = req.body;

    if (!name || !redirectUris || !Array.isArray(redirectUris)) {
      return res.status(400).json({ error: 'Invalid request body' });
    }

    // Update the client
    const updatedClient = await db.updateOAuthClient(id as string, {
      name,
      redirectUris,
      updatedAt: new Date().toISOString()
    });

    if (!updatedClient) {
      return res.status(404).json({ error: 'Client not found' });
    }

    res.status(200).json(updatedClient);
  } catch (error) {
    console.error('Error updating OAuth client:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
