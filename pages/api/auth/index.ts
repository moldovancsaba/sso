import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import clientPromise from '../../../lib/mongodb';
import { validateTenant } from '../../../lib/middleware/tenantAuth';
import { TenantAuthLog, TenantConfig } from '../../../lib/types/tenant';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware wrapper for Next.js API routes
const withTenantAuth = (handler: Function) => async (req: NextApiRequest, res: NextApiResponse) => {
  return new Promise((resolve) => {
    validateTenant(req, res, () => resolve(handler(req, res)));
  });
};

async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { token, redirect } = req.query;
    const tenant = (req as any).tenant as TenantConfig;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    // Verify redirect domain against tenant's allowed domains
    if (redirect) {
      try {
        const redirectUrl = new URL(redirect as string);
        if (!tenant.settings.allowedRedirectDomains.includes(redirectUrl.hostname)) {
          return res.status(403).json({ error: 'Redirect domain not allowed' });
        }
      } catch (error) {
        return res.status(400).json({ error: 'Invalid redirect URL' });
      }
    }

    // If no redirect specified, go to home page
    const redirectUrl = redirect ? (redirect as string).replace('undefined', '') : '/';

    // Verify token
    try {
      const decoded = jwt.verify(token as string, JWT_SECRET) as jwt.JwtPayload;
      
      // Verify token belongs to the correct tenant
      if (decoded.tenantId !== tenant.id) {
        return res.status(401).json({ error: 'Token does not belong to this tenant' });
      }

      // Log the auth action with tenant context
      const client = await clientPromise;
      const db = client.db('sso');
      const authLog: TenantAuthLog = {
        tenantId: tenant.id,
        identifier: decoded.identifier,
        action: 'used',
        timestamp: new Date().toISOString(),
        source: req.headers.origin || 'unknown',
        ip: req.headers['x-forwarded-for'] as string || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'] || 'unknown'
      };

      await db.collection('auth_logs').insertOne(authLog);

      // Redirect to the specified URL
      res.redirect(302, redirectUrl);
    } catch (error) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default withTenantAuth(handler);
