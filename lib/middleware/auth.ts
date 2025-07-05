import { NextApiRequest, NextApiResponse } from 'next';
import type { NextHandler } from 'next-connect';
import { getApiKeyFromDb } from '../db/apiKeys';

export interface AuthenticatedRequest extends NextApiRequest {
  tenant?: {
    id: string;
    name: string;
  };
  apiKey?: {
    id: string;
    key: string;
    tenantId: string;
  };
}

export async function authMiddleware(
  req: AuthenticatedRequest,
  res: NextApiResponse,
  next: NextHandler
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: 'API key required' });
    }

    const apiKey = authHeader.replace('Bearer ', '').trim();
    
    if (!apiKey) {
      return res.status(401).json({ error: 'Invalid API key format' });
    }

    const keyData = await getApiKeyFromDb(apiKey);
    
    if (!keyData) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    // Attach the authenticated tenant and API key info to the request
    req.tenant = {
      id: keyData.tenantId,
      name: keyData.tenantName
    };

    req.apiKey = {
      id: keyData.id,
      key: apiKey,
      tenantId: keyData.tenantId
    };

    return next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
