import { IncomingMessage } from 'http';

/**
 * Validates and returns the base URL for the SSO service
 * @param req - The incoming HTTP request
 * @returns The base URL for the SSO service
 * @throws Error if the configuration is invalid
 */
export function getBaseUrl(req: IncomingMessage): string {
  if (process.env.NODE_ENV === 'production') {
    const ssoBaseUrl = process.env.SSO_BASE_URL;
    
    if (!ssoBaseUrl) {
      throw new Error('SSO_BASE_URL is required in production');
    }

    try {
      new URL(ssoBaseUrl);
    } catch {
      throw new Error('Invalid SSO_BASE_URL format');
    }

    return ssoBaseUrl;
  }

  // Development environment
  const host = req.headers.host;
  if (!host) {
    throw new Error('Invalid host configuration');
  }

  return `http://${host}`;
}

/**
 * Generates the OAuth callback URL
 * @param req - The incoming HTTP request
 * @returns The callback URL for OAuth authentication
 * @throws Error if the configuration is invalid
 */
export function getCallbackUrl(req: IncomingMessage): string {
  const baseUrl = getBaseUrl(req);
  return `${baseUrl}/api/auth/callback`;
}
