/**
 * @doneisbetter/sso-client v5.1.0
 * Cookie-based SSO authentication for *.doneisbetter.com subdomains
 * 
 * IMPORTANT: Use this for server-side validation only (Next.js getServerSideProps)
 * For client-side, users are redirected to sso.doneisbetter.com/login
 */

export interface SSOUser {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
}

export interface SSOValidationResponse {
  isValid: boolean;
  user?: SSOUser;
  message?: string;
}

export interface SSOValidationOptions {
  ssoServerUrl?: string;
  cookieHeader?: string;
  userAgent?: string;
}

/**
 * Validate SSO session by forwarding cookies to SSO service
 * 
 * @param req - Next.js request object with headers.cookie
 * @param options - Optional configuration
 * @returns Promise<SSOValidationResponse>
 * 
 * @example
 * ```ts
 * // In Next.js getServerSideProps
 * import { validateSsoSession } from '@doneisbetter/sso-client';
 * 
 * export async function getServerSideProps(context) {
 *   const { isValid, user } = await validateSsoSession(context.req);
 *   
 *   if (!isValid) {
 *     return {
 *       redirect: {
 *         destination: '/login',
 *         permanent: false,
 *       },
 *     };
 *   }
 *   
 *   return { props: { user } };
 * }
 * ```
 */
export async function validateSsoSession(
  req: any,
  options: SSOValidationOptions = {}
): Promise<SSOValidationResponse> {
  try {
    // Get SSO server URL from options or environment
    const ssoServerUrl = options.ssoServerUrl || process.env.SSO_SERVER_URL;
    
    if (!ssoServerUrl) {
      console.error('[sso-client] SSO_SERVER_URL not configured');
      return { isValid: false, message: 'SSO_SERVER_URL not configured' };
    }
    
    // Extract cookie header
    const cookieHeader = options.cookieHeader || req?.headers?.cookie || '';
    
    // Try public user validation first
    const publicUrl = `${ssoServerUrl}/api/public/validate`;
    let resp: Response;
    
    try {
      resp = await fetch(publicUrl, {
        method: 'GET',
        headers: {
          cookie: cookieHeader,
          accept: 'application/json',
          'user-agent': options.userAgent || req?.headers?.['user-agent'] || 'sso-client',
        },
        // @ts-ignore - cache option is valid but TS doesn't recognize it in all environments
        cache: 'no-store',
      });
    } catch (fetchErr: any) {
      console.error('[sso-client] Failed to fetch from SSO:', fetchErr.message);
      return { isValid: false, message: 'Failed to connect to SSO service' };
    }
    
    let data: any;
    try {
      data = await resp.json();
    } catch (jsonErr: any) {
      console.error('[sso-client] Failed to parse SSO response:', jsonErr.message);
      return { isValid: false, message: 'Invalid SSO response' };
    }
    
    // If public validation fails, try admin validation
    if (!data?.isValid) {
      const adminUrl = `${ssoServerUrl}/api/sso/validate`;
      try {
        resp = await fetch(adminUrl, {
          method: 'GET',
          headers: {
            cookie: cookieHeader,
            accept: 'application/json',
            'user-agent': options.userAgent || req?.headers?.['user-agent'] || 'sso-client',
          },
          // @ts-ignore - cache option is valid but TS doesn't recognize it in all environments
          cache: 'no-store',
        });
        data = await resp.json();
      } catch (adminErr: any) {
        console.error('[sso-client] Failed to fetch from admin SSO:', adminErr.message);
        return { isValid: false, message: 'Failed to validate admin session' };
      }
    }
    
    if (data?.isValid && data?.user?.id) {
      return {
        isValid: true,
        user: {
          id: data.user.id,
          email: data.user.email,
          name: data.user.name,
          role: data.user.role || 'user',
          status: data.user.status || 'active',
        },
      };
    }
    
    return {
      isValid: false,
      message: data?.message || 'Invalid or expired session',
    };
  } catch (err: any) {
    console.error('[sso-client] SSO validation error:', err.message);
    return {
      isValid: false,
      message: 'Unexpected error during validation',
    };
  }
}

/**
 * Get SSO login URL with redirect parameter
 * 
 * @param returnUrl - URL to redirect back to after login
 * @param ssoServerUrl - Optional SSO server URL (defaults to env var)
 * @returns string - Full login URL
 * 
 * @example
 * ```ts
 * const loginUrl = getSsoLoginUrl('https://myapp.doneisbetter.com/admin');
 * // Returns: https://sso.doneisbetter.com/login?redirect=https%3A%2F%2Fmyapp.doneisbetter.com%2Fadmin
 * ```
 */
export function getSsoLoginUrl(returnUrl: string, ssoServerUrl?: string): string {
  const ssoUrl = ssoServerUrl || process.env.SSO_SERVER_URL || 'https://sso.doneisbetter.com';
  return `${ssoUrl}/login?redirect=${encodeURIComponent(returnUrl)}`;
}

/**
 * Get SSO logout URL
 * 
 * @param ssoServerUrl - Optional SSO server URL (defaults to env var)
 * @returns string - Full logout URL
 */
export function getSsoLogoutUrl(ssoServerUrl?: string): string {
  const ssoUrl = ssoServerUrl || process.env.SSO_SERVER_URL || 'https://sso.doneisbetter.com';
  return `${ssoUrl}/api/public/logout`;
}

// Re-export types (already exported above)
