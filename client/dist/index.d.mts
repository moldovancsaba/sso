/**
 * @doneisbetter/sso-client v5.1.0
 * Cookie-based SSO authentication for *.doneisbetter.com subdomains
 *
 * IMPORTANT: Use this for server-side validation only (Next.js getServerSideProps)
 * For client-side, users are redirected to sso.doneisbetter.com/login
 */
interface SSOUser {
    id: string;
    email: string;
    name: string;
    role: string;
    status: string;
}
interface SSOValidationResponse {
    isValid: boolean;
    user?: SSOUser;
    message?: string;
}
interface SSOValidationOptions {
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
declare function validateSsoSession(req: any, options?: SSOValidationOptions): Promise<SSOValidationResponse>;
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
declare function getSsoLoginUrl(returnUrl: string, ssoServerUrl?: string): string;
/**
 * Get SSO logout URL
 *
 * @param ssoServerUrl - Optional SSO server URL (defaults to env var)
 * @returns string - Full logout URL
 */
declare function getSsoLogoutUrl(ssoServerUrl?: string): string;

export { type SSOUser, type SSOValidationOptions, type SSOValidationResponse, getSsoLoginUrl, getSsoLogoutUrl, validateSsoSession };
