/**
 * Safely extracts the base URL from incoming requests or environment variables
 * 
 * @param req - Optional request object containing headers
 * @returns The base URL string to use for the current environment
 */
function validateUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function getBaseUrl(req?: any): string {
  if (process.env.NODE_ENV === 'production') {
    const prodUrl = process.env.SSO_BASE_URL;
    if (!prodUrl || !validateUrl(prodUrl)) {
      throw new Error('Invalid SSO_BASE_URL in production environment');
    }
    return prodUrl;
  }

  if (req?.headers?.host) {
    const devUrl = `http://${req.headers.host}`;
    if (!validateUrl(devUrl)) {
      throw new Error('Invalid host detected in request');
    }
    return devUrl;
  }

  throw new Error('Could not determine base URL for authentication');
}
