import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import clientPromise from '../../../lib/mongodb';
import { validateTenant } from '../../../lib/middleware/tenantAuth';
import { TenantAuthLog } from '../../../lib/types/tenant';

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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { identifier } = req.body;
    const tenant = (req as any).tenant;

    if (!identifier) {
      return res.status(400).json({ error: 'Identifier is required' });
    }

    // Create JWT token with tenant context
    const token = jwt.sign(
      { 
        identifier,
        tenantId: tenant.id,
        iat: Math.floor(Date.now() / 1000),
      },
      JWT_SECRET,
      { expiresIn: `${tenant.settings.tokenExpiryMinutes}m` }
    );

    // Log the auth action with tenant context
    const client = await clientPromise;
    const db = client.db('sso');
    const authLog: TenantAuthLog = {
      tenantId: tenant.id,
      identifier,
      action: 'created',
      timestamp: new Date().toISOString(),
      source: req.headers.origin || 'unknown',
      ip: req.headers['x-forwarded-for'] as string || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'] || 'unknown'
    };

    await db.collection('auth_logs').insertOne(authLog);

    return res.status(200).json({ token });
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default withTenantAuth(handler);
