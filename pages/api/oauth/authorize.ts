import { NextApiRequest, NextApiResponse } from 'next';
import { Database } from '../../../lib/db/database';
import { composeMiddleware } from '../../../lib/middleware/compose';
import { rateLimit } from '../../../lib/middleware/rateLimit';
import { requestLogger } from '../../../lib/middleware/requestLogger';
import { validateTenant } from '../../../lib/middleware/tenantAuth';
import { OAuthService } from '../../../lib/oauth/service';
import { AuthorizationRequest, OAuthError } from '../../../lib/oauth/types';

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
    scope,
    code_challenge,
    code_challenge_method,
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
    const oauth = new OAuthService(db);

    const request: AuthorizationRequest = {
      clientId: client_id as string,
      redirectUri: redirect_uri as string,
      responseType: 'code',
      state: state as string,
      scope: scope as string,
      codeChallenge: code_challenge as string,
      codeChallengeMethod: code_challenge_method as 'S256' | 'plain' | undefined
    };

    // Always validate the client first
    const client = await db.validateOAuthClient(client_id as string);
    if (!client) {
      const errorResponse = {
        error: 'invalid_client',
        error_description: 'Invalid client'
      };
      if (redirect_uri) {
        const errorUrl = new URL(redirect_uri as string);
        Object.entries(errorResponse).forEach(([key, value]) => {
          errorUrl.searchParams.set(key, value);
        });
        if (state) {
          errorUrl.searchParams.set('state', state as string);
        }
        return res.status(302).json({ redirect: errorUrl.toString() });
      }
      return res.status(400).json(errorResponse);
    }

    // Validate the request parameters
    await oauth.validateAuthorizationRequest(request);

    if (req.method === 'GET') {
      // Show login form with identifier
      return res.status(200).json({
        client_name: client!.name,
        redirect_uri,
        state,
        scope,
        code_challenge,
        code_challenge_method,
        message: 'Please provide identifier to continue'
      });
    }

    // Handle POST (login submission)
    if (!identifier) {
      return res.status(400).json({ error: 'Identifier required' });
    }

    try {
      // Generate authorization code
      const code = await oauth.createAuthorizationCode(request, undefined, identifier as string);

      // Return redirect URL with code
      const redirectUrl = new URL(redirect_uri as string);
      redirectUrl.searchParams.set('code', code);
      if (state) {
        redirectUrl.searchParams.set('state', state as string);
      }

      // Send the redirect response
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({ redirect: redirectUrl.toString() });
    } catch (authError) {
      console.error('Error generating authorization code:', authError);
      // Redirect back to client with error
      const errorUrl = new URL(redirect_uri as string);
      errorUrl.searchParams.set('error', 'server_error');
      errorUrl.searchParams.set('error_description', 'Failed to generate authorization code');
      if (state) {
        errorUrl.searchParams.set('state', state as string);
      }
      return res.status(302).json({ redirect: errorUrl.toString() });
    }
  } catch (error) {
    console.error('OAuth authorization error:', error);
    const errorResponse = error instanceof OAuthError
      ? {
          error: error.error,
          error_description: error.errorDescription
        }
      : {
          error: 'server_error',
          error_description: 'Internal server error'
        };

    if (redirect_uri) {
      const errorUrl = new URL(redirect_uri as string);
      Object.entries(errorResponse).forEach(([key, value]) => {
        errorUrl.searchParams.set(key, value);
      });
      if (state) {
        errorUrl.searchParams.set('state', state as string);
      }
      return res.status(302).json({ redirect: errorUrl.toString() });
    }
    return res.status(error instanceof OAuthError ? 400 : 500).json(errorResponse);
  }
});

export default handler;
