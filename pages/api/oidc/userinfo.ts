import { NextApiRequest, NextApiResponse } from 'next';
import { Database } from '../../../lib/db/database';
import { KeyManager } from '../../../lib/oidc/keys';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get the access token from the Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No bearer token provided' });
  }

  const token = authHeader.substring(7);

  try {
    // Verify the access token
    const keyManager = KeyManager.getInstance();
    const payload = await keyManager.verify(token) as { sub: string };

    // Get user data
    const db = await Database.getInstance();
    const user = await db.findUser(payload.sub);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Return userinfo claims
    res.json({
      sub: user.id,
      name: user.profile?.name,
      given_name: user.profile?.givenName,
      family_name: user.profile?.familyName,
      middle_name: user.profile?.middleName,
      nickname: user.profile?.nickname,
      preferred_username: user.profile?.preferredUsername,
      profile: user.profile?.website,
      picture: user.profile?.picture,
      website: user.profile?.website,
      email: user.email,
      email_verified: user.emailVerified,
      gender: user.profile?.gender,
      birthdate: user.profile?.birthdate,
      zoneinfo: user.profile?.zoneinfo,
      locale: user.profile?.locale,
      phone_number: user.profile?.phoneNumber,
      phone_number_verified: user.profile?.phoneNumberVerified,
      address: user.profile?.address ? {
        formatted: user.profile.address.formatted,
        street_address: user.profile.address.streetAddress,
        locality: user.profile.address.locality,
        region: user.profile.address.region,
        postal_code: user.profile.address.postalCode,
        country: user.profile.address.country,
      } : undefined,
      updated_at: Math.floor(new Date(user.updatedAt).getTime() / 1000)
    });
  } catch (error) {
    console.error('Error in userinfo endpoint:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
}
