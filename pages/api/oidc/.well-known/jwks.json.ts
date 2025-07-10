import { NextApiRequest, NextApiResponse } from 'next';
import { KeyManager } from '../../../../lib/oidc/keys';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const keyManager = KeyManager.getInstance();
  const jwks = await keyManager.getJWKS();

  res.json(jwks);
}
