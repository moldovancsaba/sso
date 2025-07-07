import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import { Database } from '../../../lib/db/database';
import { ObjectId } from 'mongodb';
import { User } from '../../../lib/types/user';
import { validateTenant } from '../../../lib/middleware/tenantAuth';
import { rateLimit } from '../../../lib/middleware/rateLimit';
import { requestLogger } from '../../../lib/middleware/requestLogger';
import { composeMiddleware } from '../../../lib/middleware/compose';

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';

// Validate SSO_BASE_URL format
const validateSsoBaseUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

// Validate environment configuration
const validateEnvironment = (): void => {
  const ssoBaseUrl = process.env.SSO_BASE_URL;
  
  if (!ssoBaseUrl) {
    throw new Error('SSO_BASE_URL is not configured');
  }

  if (!validateSsoBaseUrl(ssoBaseUrl)) {
    throw new Error('Invalid SSO_BASE_URL format');
  }
};

// Handler with middleware stack
const handler = composeMiddleware(
  validateTenant,
  rateLimit,
  requestLogger
)(async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Validate environment first
    validateEnvironment();

    const { identifier } = req.body;

    if (!identifier) {
      return res.status(400).json({ error: 'Identifier is required' });
    }

    try {
      const db = await Database.getInstance();
      const user = await db.createOrUpdateUser(identifier);

      const token = jwt.sign(
        { 
          userId: user.id,
          identifier: user.identifier,
          iat: Math.floor(Date.now() / 1000),
          iss: process.env.SSO_BASE_URL,
        },
        JWT_SECRET,
        { 
          expiresIn: '10m', // 10 minutes expiry
          audience: process.env.SSO_BASE_URL,
        }
      );

      return res.status(200).json({ token });
    } catch (dbError) {
      console.error('Database error:', dbError);
      return res.status(500).json({ error: 'Authentication service is unavailable' });
    }
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

export default handler;
