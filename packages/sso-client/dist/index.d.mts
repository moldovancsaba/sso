/**
 * Error types that can be thrown by the SSO client
 */
declare enum SSOErrorType {
    NETWORK = "NETWORK_ERROR",
    VALIDATION = "VALIDATION_ERROR",
    AUTHENTICATION = "AUTHENTICATION_ERROR",
    CONFIGURATION = "CONFIGURATION_ERROR"
}
/**
 * Custom error class for SSO-related errors
 */
declare class SSOError extends Error {
    readonly type: SSOErrorType;
    readonly cause?: unknown | undefined;
    constructor(message: string, type: SSOErrorType, cause?: unknown | undefined);
}
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
    /** Timeout for requests in milliseconds. Defaults to 10000 (10 seconds) */
    timeout?: number;
    /** Auto-retry configuration for failed requests */
    retry?: {
        /** Maximum number of retry attempts. Defaults to 3 */
        maxAttempts?: number;
        /** Base delay between retries in milliseconds. Defaults to 1000 (1 second) */
        baseDelay?: number;
    };
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
 * Provides methods for SSO authentication and session management with:
 * - Automatic retry with exponential backoff
 * - Request timeout handling
 * - Detailed error reporting
 * - Session monitoring
 * - Type-safe responses
 */
declare class SSOClient {
    private readonly ssoServerUrl;
    private readonly validateEndpoint;
    private readonly logoutEndpoint;
    private readonly loginPath;
    private readonly headers;
    private readonly timeout;
    private readonly maxRetries;
    private readonly baseRetryDelay;
    private monitoringTimer?;
    private isMonitoring;
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
    /**
     * Makes a request to the SSO server with retry and timeout handling
     * @param url Request URL
     * @param init Request init options
     * @returns Response from the server
     * @throws SSOError if the request fails after retries
     */
    private makeRequest;
    /**
     * Validate the current session
     *
     * @returns Session validation response
     * @throws SSOError if validation fails
     */
    validateSession(): Promise<SessionResponse>;
    /**
     * Sign out the current user
     *
     * @returns True if logout was successful
     * @throws Error if request fails
     */
    /**
     * Sign out the current user
     *
     * @returns True if logout was successful
     * @throws SSOError if logout fails
     */
    signOut(): Promise<boolean>;
    /**
     * Redirect to the login page
     *
     * @param redirectUrl Optional URL to redirect to after login
     */
    /**
     * Redirect to the login page
     *
     * @param redirectUrl Optional URL to redirect to after login
     * @throws SSOError if redirect URL is invalid
     */
    redirectToLogin(redirectUrl?: string): void;
    /**
     * Enable automatic session monitoring
     *
     * @param options Monitoring configuration
     * @returns Cleanup function to stop monitoring
     */
    /**
     * Enable automatic session monitoring
     *
     * @param options Monitoring configuration
     * @returns Cleanup function to stop monitoring
     * @throws SSOError if monitoring is already enabled
     */
    enableSessionMonitoring(options?: {
        /** Interval in milliseconds to check session status. Defaults to 60000 (1 minute) */
        interval?: number;
        /** Callback when session becomes invalid */
        onInvalidSession?: () => void;
        /** Callback for session check errors */
        onError?: (error: SSOError) => void;
    }): () => void;
    /**
     * Stop session monitoring if it's active
     */
    private stopSessionMonitoring;
}

export { SSOClient, SSOClientOptions, SSOError, SSOErrorType, SessionResponse };
