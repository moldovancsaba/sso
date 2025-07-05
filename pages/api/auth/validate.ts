import { NextApiRequest, NextApiResponse } from 'next';
import { getApiKeyFromDb } from '../../../lib/db/apiKeys';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'API key required' });
  }

  const apiKey = authHeader.replace('Bearer ', '').trim();
  if (!apiKey) {
    return res.status(401).json({ error: 'Invalid API key format' });
  }

  try {
    const keyData = await getApiKeyFromDb(apiKey);
    
    if (!keyData) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    // API key is valid, return tenant information
    return res.status(200).json({
      tenant: {
        id: keyData.tenantId,
        name: keyData.tenantName
      }
    });
  } catch (error) {
    console.error('API key validation error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
