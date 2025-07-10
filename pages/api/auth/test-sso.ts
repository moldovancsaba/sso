import { NextApiRequest, NextApiResponse } from 'next';
import { signIn } from 'next-auth/react';

export default async function test(req: NextApiRequest, res: NextApiResponse) {
  const { clientId, redirectUri, identifier } = req.body;

  try {
    // Use NextAuth's signIn method to trigger SSO authentication
    const result = await signIn('sso', {
      clientId,
      redirectUri,
      identifier,
      session: false,
      redirect: false,
    });

    if (result?.error) {
      throw new Error(result.error);
    }

    res.status(200).json({ message: 'Authentication succeeded!' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
}

