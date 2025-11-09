/**
 * OAuth2/OIDC UserInfo Endpoint
 * 
 * GET /api/oauth/userinfo
 * Authorization: Bearer <access_token>
 * 
 * Returns user profile information for the authenticated user.
 * This is a standard OIDC endpoint that clients use to fetch user details.
 * 
 * WHAT: Returns user information based on valid access token
 * WHY: OIDC standard endpoint for retrieving user profile
 * HOW: Validates Bearer token, returns user claims based on granted scopes
 * 
 * Spec: https://openid.net/specs/openid-connect-core-1_0.html#UserInfo
 */

import { runCors } from '../../../lib/cors.mjs';
import { verifyAccessToken } from '../../../lib/oauth/tokens.mjs';
import { getDb } from '../../../lib/db.mjs';

export default async function handler(req, res) {
  // Apply CORS
  if (runCors(req, res)) return;

  // Only GET method allowed
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  try {
    // Extract Bearer token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'invalid_token',
        error_description: 'Missing or invalid Authorization header'
      });
    }

    const accessToken = authHeader.substring(7); // Remove "Bearer " prefix

    // Verify access token
    let payload;
    try {
      payload = await verifyAccessToken(accessToken);
    } catch (err) {
      console.error('[userinfo] Token verification failed:', err.message);
      return res.status(401).json({
        error: 'invalid_token',
        error_description: 'Access token is invalid or expired'
      });
    }

    // Extract user ID from token
    const userId = payload.sub;
    if (!userId) {
      return res.status(401).json({
        error: 'invalid_token',
        error_description: 'Token does not contain user ID'
      });
    }

    // Fetch user from database
    const db = await getDb();
    const user = await db.collection('publicUsers').findOne({ id: userId });

    if (!user) {
      return res.status(404).json({
        error: 'user_not_found',
        error_description: 'User not found'
      });
    }

    // Build response based on granted scopes
    // OIDC spec: Only return claims that were authorized by scopes
    const scope = payload.scope || '';
    const scopes = scope.split(' ');

    const userInfo = {
      sub: user.id, // Always include subject (user ID)
    };

    // Profile scope - name, picture, updated_at
    if (scopes.includes('profile')) {
      userInfo.name = user.name || null;
      userInfo.picture = user.socialProviders?.facebook?.picture || 
                         user.socialProviders?.google?.picture || 
                         null;
      userInfo.updated_at = user.updatedAt || user.createdAt;
    }

    // Email scope - email, email_verified
    if (scopes.includes('email')) {
      userInfo.email = user.email;
      userInfo.email_verified = user.emailVerified || false;
    }

    // Return user info
    return res.status(200).json(userInfo);

  } catch (error) {
    console.error('[userinfo] Error:', error);
    return res.status(500).json({
      error: 'server_error',
      error_description: 'Internal server error'
    });
  }
}
