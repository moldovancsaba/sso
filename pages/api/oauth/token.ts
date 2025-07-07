import { NextApiRequest, NextApiResponse } from 'next';
import { Database } from '../../../lib/db/database';
import { composeMiddleware } from '../../../lib/middleware/compose';
import { rateLimit } from '../../../lib/middleware/rateLimit';
import { requestLogger } from '../../../lib/middleware/requestLogger';
import jwt from 'jsonwebtoken';
import { authCodes } from './authorize';
import { TokenResponse } from '../../../lib/types/oauth';
import { validateTenant } from '../../../lib/middleware/tenantAuth';

const JWT_SECRET = process.env.JWT_SECRET!;
const TOKEN_EXPIRY = 10 * 60; // 10 minutes in seconds

const handler = composeMiddleware(
  validateTenant,
  rateLimit,
  requestLogger
)(async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    grant_type,
    code,
    client_id,
    client_secret,
    redirect_uri
  } = req.body;

  if (!grant_type || !client_id || !client_secret) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    const db = await Database.getInstance();
    const client = await db.validateOAuthClient(client_id, client_secret);

    if (!client) {
      return res.status(401).json({ error: 'Invalid client credentials' });
    }

    let tokenResponse: TokenResponse;

    switch (grant_type) {
      case 'authorization_code': {
        if (!code || !redirect_uri) {
          return res.status(400).json({ error: 'Missing code or redirect_uri' });
        }

        const storedCode = authCodes.get(code);
        if (!storedCode) {
          return res.status(400).json({ error: 'Invalid or expired code' });
        }

        if (storedCode.clientId !== client_id || storedCode.redirectUri !== redirect_uri) {
          return res.status(400).json({ error: 'Code was not issued to this client' });
        }

        // Delete the used code
        authCodes.delete(code);

        // Create user if not exists
        const user = await db.createOrUpdateUser(storedCode.identifier);

        // Generate access token
        const access_token = jwt.sign(
          {
            sub: user.id,
            identifier: user.identifier,
            client_id: client_id,
            type: 'Bearer'
          },
          JWT_SECRET,
          { expiresIn: TOKEN_EXPIRY }
        );

        tokenResponse = {
          access_token,
          token_type: 'Bearer',
          expires_in: TOKEN_EXPIRY
        };
        break;
      }

      default:
        return res.status(400).json({ error: 'Unsupported grant type' });
    }

    return res.status(200).json(tokenResponse);
  } catch (error) {
    console.error('OAuth token error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default handler;
