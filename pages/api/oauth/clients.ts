import { NextApiRequest, NextApiResponse } from 'next';
import { Database } from '../../../lib/db/database';
import { composeMiddleware } from '../../../lib/middleware/compose';
import { validateTenant } from '../../../lib/middleware/tenantAuth';
import { rateLimit } from '../../../lib/middleware/rateLimit';
import { requestLogger } from '../../../lib/middleware/requestLogger';

const handler = composeMiddleware(
  validateTenant,
  rateLimit,
  requestLogger
)(async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const db = await Database.getInstance();

    if (req.method === 'GET') {
      const clients = await db.listOAuthClients();
      return res.status(200).json(clients);
    }

    // Handle POST - create new client
    const { name, redirectUris } = req.body;

    if (!name || !redirectUris || !Array.isArray(redirectUris)) {
      return res.status(400).json({ error: 'Invalid request body' });
    }

    const client = await db.createOAuthClient(name, redirectUris);
    return res.status(201).json(client);
  } catch (error) {
    console.error('OAuth clients error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default handler;
