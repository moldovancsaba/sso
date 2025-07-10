import { NextApiRequest, NextApiResponse } from 'next';
import { Database } from '../../../lib/db/database';
import { composeMiddleware } from '../../../lib/middleware/compose';
import { rateLimit } from '../../../lib/middleware/rateLimit';
import { requestLogger } from '../../../lib/middleware/requestLogger';
import { validateTenant } from '../../../lib/middleware/tenantAuth';
import { OAuthService } from '../../../lib/oauth/service';
import { getClientCredentials } from '../../../lib/oauth/types';

const handler = composeMiddleware(
  validateTenant,
  rateLimit,
  requestLogger
)(async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token parameter is required' });
    }

    // Get client credentials from Authorization header or body
    let { clientId, clientSecret } = getClientCredentials(req);
    if (!clientId || !clientSecret) {
      clientId = req.body.client_id;
      clientSecret = req.body.client_secret;
    }

    if (!clientId || !clientSecret) {
      return res.status(401).json({ error: 'Client authentication required' });
    }

    const db = await Database.getInstance();
    
    // Validate client credentials
    const client = await db.validateOAuthClient(clientId, clientSecret);
    if (!client) {
      return res.status(401).json({ error: 'Invalid client credentials' });
    }

    const oauth = new OAuthService(db);
    const introspection = await oauth.validateToken(token);

    return res.status(200).json(introspection);
  } catch (error) {
    console.error('Token introspection error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default handler;
