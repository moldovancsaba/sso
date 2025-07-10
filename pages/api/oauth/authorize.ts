import { NextApiRequest, NextApiResponse } from 'next';
import { Database } from '../../../lib/db/database';
import { composeMiddleware } from '../../../lib/middleware/compose';
import { rateLimit } from '../../../lib/middleware/rateLimit';
import { requestLogger } from '../../../lib/middleware/requestLogger';
import { validateTenant } from '../../../lib/middleware/tenantAuth';
import { OAuthService } from '../../../lib/oauth/service';
import { AuthorizationRequest, OAuthError } from '../../../lib/oauth/types';
import { OAuthAuthHandler } from '../../../lib/oauth/auth-handler';

const handler = composeMiddleware(
  validateTenant,
  rateLimit,
  requestLogger
)(async (req: NextApiRequest, res: NextApiResponse): Promise<void> => {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!req.headers['x-api-key']) {
    res.status(401).json({ error: 'API key required' });
    return;
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
    res.status(400).json({ error: 'Missing required parameters' });
    return;
  }

  if (response_type !== 'code') {
    res.status(400).json({ error: 'Unsupported response type' });
    return;
  }

  try {
    const db = await Database.getInstance();
    const oauth = new OAuthService(db);
    const authHandler = new OAuthAuthHandler(db);

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
    if (!client || typeof client !== 'object') {
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
        res.redirect(302, errorUrl.toString());
        return;
      }
      res.status(400).json(errorResponse);
      return;
    }

    // Validate the request parameters
    await oauth.validateAuthorizationRequest(request);

    if (req.method === 'GET') {
      // Display login form data
      const loginFormData = await authHandler.getLoginFormData(client.name, redirect_uri as string, state as string);
      res.status(200).json(loginFormData);
      return;
    }

    // Handle POST (login submission)
    if (!identifier || typeof identifier !== 'string') {
      res.status(400).json({ error: 'Identifier required' });
      return;
    }

    // Authenticate the user
    const { isValid, error: validationError } = authHandler.validateAuthRequest(identifier as string, request);
    if (!isValid) {
      res.status(400).json({ error: validationError });
      return;
    }

    const user = await authHandler.authenticateUser(identifier as string);
    if (!user) {
      res.status(401).json({ error: 'Authentication failed' });
      return;
    }

    try {
      // Generate authorization code
      const code = await oauth.createAuthorizationCode(request, user.id, identifier as string);

      // Return redirect URL with code
      const redirectUrl = new URL(redirect_uri as string);
      redirectUrl.searchParams.set('code', code);
      if (state) {
        redirectUrl.searchParams.set('state', state as string);
      }

      // Send the redirect response
      res.setHeader('Cache-Control', 'no-store');
      res.status(302).json({ redirectUrl: redirectUrl.toString() });
      return;
    } catch (authError) {
      console.error('Error generating authorization code:', authError);
      const errorResponse = {
        error: 'server_error',
        error_description: 'Failed to generate authorization code'
      };
      if (redirect_uri) {
        const errorUrl = new URL(redirect_uri as string);
        Object.entries(errorResponse).forEach(([key, value]) => {
          errorUrl.searchParams.set(key, value);
        });
        if (state) {
          errorUrl.searchParams.set('state', state as string);
        }
        res.redirect(302, errorUrl.toString());
        return;
      }
      res.status(500).json(errorResponse);
      return;
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
      res.redirect(302, errorUrl.toString());
      return;
    }
    res.status(error instanceof OAuthError ? 400 : 500).json(errorResponse);
    return;
  }
});

export default handler;
