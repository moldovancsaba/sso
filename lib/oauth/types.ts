import { IncomingMessage } from 'http';

export interface OAuthClient {
  id: string;
  name: string;
  clientId: string;
  clientSecret: string;
  redirectUris: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface OAuthToken {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  refreshToken?: string;
  scope?: string;
}

export interface TokenIntrospectionResponse {
  active: boolean;
  scope?: string;
  clientId?: string;
  username?: string;
  exp?: number;
  iat?: number;
  sub?: string;
  aud?: string;
  iss?: string;
}

export interface PKCEParams {
  codeChallenge: string;
  codeChallengeMethod: 'S256' | 'plain';
}

export interface AuthorizationRequest {
  clientId: string;
  redirectUri: string;
  responseType: 'code';
  state?: string;
  scope?: string;
  codeChallenge?: string;
  codeChallengeMethod?: 'S256' | 'plain';
}

export interface TokenRequest {
  grantType: 'authorization_code' | 'client_credentials' | 'password' | 'refresh_token';
  code?: string;
  redirectUri?: string;
  clientId: string;
  clientSecret: string;
  scope?: string;
  username?: string;
  password?: string;
  refreshToken?: string;
  codeVerifier?: string;
}

export class OAuthError extends Error {
  constructor(
    public readonly error: string,
    public readonly errorDescription?: string,
    public readonly errorUri?: string
  ) {
    super(errorDescription || error);
    this.name = 'OAuthError';
  }
}

export function isValidScope(scope: string): boolean {
  // Validate scope format (space-separated list of case-sensitive strings)
  return scope.split(' ').every(s => /^[^\s]+$/.test(s));
}

export function validateRedirectUri(allowedUris: string[], redirectUri: string): boolean {
  try {
    const redirect = new URL(redirectUri);
    return allowedUris.some(allowed => {
      const allowedUrl = new URL(allowed);
      // In development, ignore port differences for localhost
      const isLocalhost = redirect.hostname === 'localhost' || redirect.hostname === '127.0.0.1';
      const hostMatches = isLocalhost
        ? redirect.hostname === allowedUrl.hostname // Only match hostname for localhost
        : redirect.host === allowedUrl.host; // Match full host (including port) for non-localhost

      return (
        redirect.protocol === allowedUrl.protocol &&
        hostMatches &&
        redirect.pathname.startsWith(allowedUrl.pathname)
      );
    });
  } catch {
    return false;
  }
}

export function generateState(): string {
  return require('crypto').randomBytes(32).toString('hex');
}

export function verifyPKCE(codeVerifier: string, storedChallenge: string, method: 'S256' | 'plain'): boolean {
  if (method === 'S256') {
    const hash = require('crypto')
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');
    return hash === storedChallenge;
  }
  return codeVerifier === storedChallenge;
}

export function generateAuthCode(): string {
  return require('crypto').randomBytes(32).toString('hex');
}

export function getClientCredentials(req: IncomingMessage): { clientId?: string; clientSecret?: string } {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Basic ')) {
    const decoded = Buffer.from(authHeader.slice(6), 'base64').toString();
    const [clientId, clientSecret] = decoded.split(':');
    return { clientId, clientSecret };
  }
  return {};
}
