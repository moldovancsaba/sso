import { IncomingMessage } from 'http';

/**
 * Validates and returns the base URL for the SSO service
 * @param req - The incoming HTTP request
 * @returns The base URL for the SSO service
 * @throws Error if the configuration is invalid
 */
export function getBaseUrl(req: IncomingMessage): string {
  // In production, use the request's protocol and host
  if (process.env.NODE_ENV === 'production') {
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers.host;
    
    if (!host) {
      throw new Error('Invalid host configuration');
    }
    
    return `${protocol}://${host}`;
  }

  // Development environment
  const host = req.headers.host;
  if (!host) {
    throw new Error('Invalid host configuration');
  }

  // Ensure we use the port from the request or default to 3000
  const [hostname, port] = host.split(':');
  const developmentPort = port || '3000';
  return `http://${hostname}:${developmentPort}`;
}

/**
 * Generates the OAuth callback URL
 * @param req - The incoming HTTP request
 * @returns The callback URL for OAuth authentication
 * @throws Error if the configuration is invalid
 */
export function getCallbackUrl(req: IncomingMessage): string {
  const baseUrl = getBaseUrl(req);
  return `${baseUrl}/api/auth/callback/sso`;
}
