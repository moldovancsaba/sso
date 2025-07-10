import { NextApiRequest, NextApiResponse } from 'next';
import { Database } from '../../../lib/db/database';
import { composeMiddleware } from '../../../lib/middleware/compose';
import { rateLimit } from '../../../lib/middleware/rateLimit';
import { requestLogger } from '../../../lib/middleware/requestLogger';
import { validateTenant } from '../../../lib/middleware/tenantAuth';
import { OAuthService } from '../../../lib/oauth/service';
import { OAuthError, TokenRequest, getClientCredentials } from '../../../lib/oauth/types';

const handler = composeMiddleware(
  validateTenant,
  rateLimit,
  requestLogger
)(async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      grant_type,
      code,
      redirect_uri,
      scope,
      username,
      password,
      refresh_token,
      code_verifier
    } = req.body;

    // Get client credentials from Authorization header or body
    let { clientId: client_id, clientSecret: client_secret } = getClientCredentials(req);
    if (!client_id || !client_secret) {
      client_id = req.body.client_id;
      client_secret = req.body.client_secret;
    }

    if (!grant_type || !client_id || !client_secret) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const db = await Database.getInstance();
    const oauth = new OAuthService(db);

    const request: TokenRequest = {
      grantType: grant_type,
      code,
      redirectUri: redirect_uri,
      clientId: client_id,
      clientSecret: client_secret,
      scope,
      username,
      password,
      refreshToken: refresh_token,
      codeVerifier: code_verifier
    };

    let token;
    switch (grant_type) {
      case 'authorization_code':
        token = await oauth.handleAuthorizationCodeGrant(request);
        break;
      case 'client_credentials':
        token = await oauth.handleClientCredentialsGrant(request);
        break;
      case 'password':
        token = await oauth.handlePasswordGrant(request);
        break;
      case 'refresh_token':
        token = await oauth.handleRefreshTokenGrant(request);
        break;
      default:
        return res.status(400).json({ error: 'Unsupported grant type' });
    }

    return res.status(200).json({
      access_token: token.accessToken,
      token_type: token.tokenType,
      expires_in: token.expiresIn,
      refresh_token: token.refreshToken,
      scope: token.scope
    });
  } catch (error) {
    console.error('OAuth token error:', error);
    if (error instanceof OAuthError) {
      return res.status(400).json({
        error: error.error,
        error_description: error.errorDescription
      });
    }
    return res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default handler;
