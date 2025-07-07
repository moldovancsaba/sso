import { NextApiRequest, NextApiResponse } from 'next';
import { Database } from '../../../lib/db/database';
import { composeMiddleware } from '../../../lib/middleware/compose';
import { rateLimit } from '../../../lib/middleware/rateLimit';
import { requestLogger } from '../../../lib/middleware/requestLogger';
import crypto from 'crypto';
import { validateTenant } from '../../../lib/middleware/tenantAuth';

// Store authorization codes temporarily (should use Redis in production)
const authCodes = new Map<string, { clientId: string, redirectUri: string, identifier: string }>();

const handler = composeMiddleware(
  validateTenant,
  rateLimit,
  requestLogger
)(async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!req.headers['x-api-key']) {
    return res.status(401).json({ error: 'API key required' });
  }

  const {
    client_id,
    redirect_uri,
    response_type,
    state,
    identifier
  } = req.method === 'GET' ? req.query : req.body;

  if (!client_id || !redirect_uri || !response_type) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  if (response_type !== 'code') {
    return res.status(400).json({ error: 'Unsupported response type' });
  }

  try {
    const db = await Database.getInstance();
    const client = await db.validateOAuthClient(client_id as string);

    if (!client) {
      return res.status(401).json({ error: 'Invalid client' });
    }

    if (!client.redirectUris.includes(redirect_uri as string)) {
      return res.status(400).json({ error: 'Invalid redirect URI' });
    }

    if (req.method === 'GET') {
      // Show login form
      return res.status(200).json({
        client_name: client.name,
        redirect_uri,
        state
      });
    }

    // Handle POST (login submission)
    if (!identifier) {
      return res.status(400).json({ error: 'Identifier required' });
    }

    // Generate authorization code
    const code = crypto.randomBytes(32).toString('hex');
    authCodes.set(code, {
      clientId: client_id as string,
      redirectUri: redirect_uri as string,
      identifier: identifier as string
    });

    // Set expiry for auth code (10 minutes)
    setTimeout(() => {
      authCodes.delete(code);
    }, 10 * 60 * 1000);

    // Redirect with code
    const redirectUrl = new URL(redirect_uri as string);
    redirectUrl.searchParams.set('code', code);
    if (state) {
      redirectUrl.searchParams.set('state', state as string);
    }

    return res.status(200).json({ redirect: redirectUrl.toString() });
  } catch (error) {
    console.error('OAuth authorization error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default handler;
export { authCodes };
