import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import { Database } from '../../../lib/db/database';
import { ObjectId } from 'mongodb';
import { User } from '../../../lib/types/user';
import { validateTenant } from '../../../lib/middleware/tenantAuth';
import { rateLimit } from '../../../lib/middleware/rateLimit';
import { requestLogger } from '../../../lib/middleware/requestLogger';
import { composeMiddleware } from '../../../lib/middleware/compose';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Handler with middleware stack
const handler = composeMiddleware(
  validateTenant,
  rateLimit,
  requestLogger,
async function (req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { identifier } = req.body;

    if (!identifier) {
      return res.status(400).json({ error: 'Identifier is required' });
    }

    const db = await Database.getInstance();
    const user = await db.createOrUpdateUser(identifier);

    const token = jwt.sign(
      { 
        userId: user.id,
        identifier: user.identifier,
        iat: Math.floor(Date.now() / 1000),
      },
      JWT_SECRET,
      { expiresIn: '10m' } // 10 minutes expiry
    );

    return res.status(200).json({ token });
  } catch (error) {
    console.error('Auth error:', error);
return res.status(500).json({ error: 'Internal server error' });
  }
);

export default handler;
