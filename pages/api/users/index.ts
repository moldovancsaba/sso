import { NextApiRequest, NextApiResponse } from 'next';
import { Database } from '../../../lib/db/database';
import { User } from '../../../lib/types/user';
import { WithId, Document } from 'mongodb';
import { validateTenant } from '../../../lib/middleware/tenantAuth';
import { rateLimit } from '../../../lib/middleware/rateLimit';
import { requestLogger } from '../../../lib/middleware/requestLogger';
import { composeMiddleware } from '../../../lib/middleware/compose';

// Handler with middleware stack
const handler = composeMiddleware(
  validateTenant,
  rateLimit,
  requestLogger
)(async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const db = await Database.getInstance();
    const users = await db.listUsers();
    return res.status(200).json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
return res.status(500).json({ error: 'Internal server error' });
  }
});

export default handler;
