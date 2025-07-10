import { NextApiRequest, NextApiResponse } from 'next';
import { Database } from '../../../lib/db/database';
import { KeyManager } from '../../../lib/oidc/keys';

interface LogoutToken {
  iss: string;
  sub?: string;
  aud: string;
  iat: number;
  jti: string;
  events: {
    'http://schemas.openid.net/event/backchannel-logout': {};
  };
  sid?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const logoutToken = req.body.logout_token;
  if (!logoutToken) {
    return res.status(400).json({ error: 'logout_token is required' });
  }

  try {
    // Verify the logout token
    const keyManager = KeyManager.getInstance();
    const payload = await keyManager.verify(logoutToken) as LogoutToken;

    // Verify required claims
    if (
      !payload.iss ||
      !payload.aud ||
      !payload.iat ||
      !payload.jti ||
      !payload.events ||
      !payload.events['http://schemas.openid.net/event/backchannel-logout']
    ) {
      return res.status(400).json({ error: 'Invalid logout token claims' });
    }

    // Verify issuer
    const expectedIssuer = process.env.OIDC_ISSUER || 'https://auth.yourdomain.com';
    if (payload.iss !== expectedIssuer) {
      return res.status(400).json({ error: 'Invalid issuer' });
    }

    // Get database instance
    const db = await Database.getInstance();

    // Verify client
    const client = await db.validateOAuthClient(payload.aud);
    if (!client) {
      return res.status(400).json({ error: 'Invalid client' });
    }

    if (payload.sub) {
      // If subject is present, revoke all tokens for this user and client
      const user = await db.findUser(payload.sub);
      if (user) {
        // Revoke OAuth tokens
        await db.revokeConsent(user.id, client.id);
        
        // Clear user's session if session ID matches
        if (payload.sid) {
          // In a real implementation, you would clear the specific session
          console.log(`Clearing session ${payload.sid} for user ${user.id}`);
        }
      }
    } else if (payload.sid) {
      // If only session ID is present, revoke that specific session
      // In a real implementation, you would clear the specific session
      console.log(`Clearing session ${payload.sid}`);
    }

    // Acknowledge the logout
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error in backchannel logout:', error);
    res.status(400).json({ error: 'Invalid logout token' });
  }
}
