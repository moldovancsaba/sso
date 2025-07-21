/**
 * Options for configuring the SSO client
 */
interface SSOClientOptions {
    /** Custom path for login redirection. Defaults to '/' */
    loginPath?: string;
    /** Custom path for logout endpoint. Defaults to '/api/users/logout' */
    logoutPath?: string;
    /** Custom path for session validation. Defaults to '/api/sso/validate' */
    validatePath?: string;
    /** Additional headers to include in requests */
    headers?: Record<string, string>;
}
/**
 * Session validation response
 */
interface SessionResponse {
    /** Whether the session is valid */
    isValid: boolean;
    /** Error message if session is invalid */
    message?: string;
    /** User information if session is valid */
    user?: {
        id: string;
        username: string;
        permissions: {
            isAdmin: boolean;
            canViewUsers: boolean;
            canManageUsers: boolean;
            [key: string]: boolean;
        };
    };
    /** Session information if valid */
    session?: {
        expiresAt: string;
    };
}
/**
 * DoneIsBetter SSO Client
 *
 * Provides methods for SSO authentication and session management
 */
declare class SSOClient {
    private ssoServerUrl;
    private validateEndpoint;
    private logoutEndpoint;
    private loginPath;
    private headers;
    /**
     * Create a new SSO client instance
     *
     * @param ssoServerUrl Base URL of the SSO server
     * @param options Configuration options
     */
    constructor(ssoServerUrl: string, options?: SSOClientOptions);
    /**
     * Validate the current session
     *
     * @returns Session validation response
     * @throws Error if request fails
     */
    validateSession(): Promise<SessionResponse>;
    /**
     * Sign out the current user
     *
     * @returns True if logout was successful
     * @throws Error if request fails
     */
    signOut(): Promise<boolean>;
    /**
     * Redirect to the login page
     *
     * @param redirectUrl Optional URL to redirect to after login
     */
    redirectToLogin(redirectUrl?: string): void;
    /**
     * Enable automatic session monitoring
     *
     * @param options Monitoring configuration
     * @returns Cleanup function to stop monitoring
     */
    enableSessionMonitoring(options?: {
        /** Interval in milliseconds to check session status. Defaults to 60000 (1 minute) */
        interval?: number;
        /** Callback when session becomes invalid */
        onInvalidSession?: () => void;
        /** Callback for session check errors */
        onError?: (error: Error) => void;
    }): () => void;
}

export { SSOClient, SSOClientOptions, SessionResponse };
