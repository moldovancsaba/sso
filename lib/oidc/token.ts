import { KeyManager } from './keys';
import { User } from '../types/user';

interface TokenPayload {
  iss: string;
  sub: string;
  aud: string | string[];
  exp: number;
  iat: number;
  nonce?: string;
  auth_time?: number;
  acr?: string;
  amr?: string[];
  azp?: string;
  // User claims
  name?: string;
  given_name?: string;
  family_name?: string;
  middle_name?: string;
  nickname?: string;
  preferred_username?: string;
  profile?: string;
  picture?: string;
  website?: string;
  gender?: string;
  birthdate?: string;
  zoneinfo?: string;
  locale?: string;
  updated_at?: number;
  email?: string;
  email_verified?: boolean;
  phone_number?: string;
  phone_number_verified?: boolean;
  address?: {
    formatted?: string;
    street_address?: string;
    locality?: string;
    region?: string;
    postal_code?: string;
    country?: string;
  };
}

interface TokenOptions {
  audience: string;
  nonce?: string;
  authTime: number;
  acr?: string;
  amr?: string[];
  azp?: string;
}

export class TokenService {
  private keyManager: KeyManager;

  constructor() {
    this.keyManager = KeyManager.getInstance();
  }

  async createIdToken(user: User, options: TokenOptions): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      // Required claims
      iss: process.env.OIDC_ISSUER || 'https://auth.yourdomain.com',
      sub: user.id,
      aud: options.audience,
      exp: now + 3600, // 1 hour
      iat: now,
      
      // Authentication claims
      auth_time: options.authTime,
      nonce: options.nonce,
      
      // Optional authentication context claims
      acr: options.acr,
      amr: options.amr,
      azp: options.azp,
      
      // User claims
      name: user.profile?.name,
      given_name: user.profile?.givenName,
      family_name: user.profile?.familyName,
      middle_name: user.profile?.middleName,
      nickname: user.profile?.nickname,
      preferred_username: user.profile?.preferredUsername,
      profile: user.profile?.website,
      picture: user.profile?.picture,
      website: user.profile?.website,
      gender: user.profile?.gender,
      birthdate: user.profile?.birthdate,
      zoneinfo: user.profile?.zoneinfo,
      locale: user.profile?.locale,
      updated_at: Math.floor(new Date(user.updatedAt).getTime() / 1000),
      
      // Email claims
      email: user.email,
      email_verified: user.emailVerified,
      
      // Phone claims
      phone_number: user.profile?.phoneNumber,
      phone_number_verified: user.profile?.phoneNumberVerified,
      
      // Address claims
      address: user.profile?.address ? {
        formatted: user.profile.address.formatted,
        street_address: user.profile.address.streetAddress,
        locality: user.profile.address.locality,
        region: user.profile.address.region,
        postal_code: user.profile.address.postalCode,
        country: user.profile.address.country,
      } : undefined,
    };

    return this.keyManager.sign(payload, { expiresIn: 3600 });
  }

  async verifyIdToken(token: string, options: { 
    audience: string;
    nonce?: string;
  }): Promise<object> {
    const payload = await this.keyManager.verify(token) as TokenPayload;

    // Verify required claims
    if (
      typeof payload !== 'object' ||
      !payload.iss ||
      !payload.sub ||
      !payload.aud ||
      !payload.exp ||
      !payload.iat
    ) {
      throw new Error('Missing required claims');
    }

    // Verify issuer
    if (payload.iss !== (process.env.OIDC_ISSUER || 'https://auth.yourdomain.com')) {
      throw new Error('Invalid issuer');
    }

    // Verify audience
    if (
      typeof payload.aud === 'string' 
        ? payload.aud !== options.audience
        : !payload.aud.includes(options.audience)
    ) {
      throw new Error('Invalid audience');
    }

    // Verify nonce if provided
    if (options.nonce && payload.nonce !== options.nonce) {
      throw new Error('Invalid nonce');
    }

    return payload;
  }
}
