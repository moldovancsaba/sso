/**
 * Error types that can be thrown by the SSO client
 */
export enum SSOErrorType {
  NETWORK = 'NETWORK_ERROR',
  VALIDATION = 'VALIDATION_ERROR',
  AUTHENTICATION = 'AUTHENTICATION_ERROR',
  CONFIGURATION = 'CONFIGURATION_ERROR'
}

/**
 * Custom error class for SSO-related errors
 */
export class SSOError extends Error {
  constructor(
    message: string,
    public readonly type: SSOErrorType,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'SSOError';
  }
}

/**
 * Options for configuring the SSO client
 */
export interface SSOClientOptions {
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
export interface SessionResponse {
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
/**
 * Utility function to add exponential backoff delay
 * @param attempt Current attempt number
 * @param baseDelay Base delay in milliseconds
 * @returns Promise that resolves after the delay
 */
async function backoffDelay(attempt: number, baseDelay: number): Promise<void> {
  const delay = baseDelay * Math.pow(2, attempt - 1);
  await new Promise(resolve => setTimeout(resolve, delay));
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
export class SSOClient {
  // Base configuration
  private readonly ssoServerUrl: string;
  private readonly validateEndpoint: string;
  private readonly logoutEndpoint: string;
  private readonly loginPath: string;
  private readonly headers: Record<string, string>;

  // Request configuration
  private readonly timeout: number;
  private readonly maxRetries: number;
  private readonly baseRetryDelay: number;

  // Session monitoring state
  private monitoringTimer?: ReturnType<typeof setInterval>;
  private isMonitoring: boolean = false;

  /**
   * Create a new SSO client instance
   * 
   * @param ssoServerUrl Base URL of the SSO server
   * @param options Configuration options
   */
  constructor(ssoServerUrl: string, options: SSOClientOptions = {}) {
    // Validate SSO server URL
    if (!ssoServerUrl) {
      throw new SSOError('SSO server URL is required', SSOErrorType.CONFIGURATION);
    }

    // Initialize base configuration
    this.ssoServerUrl = ssoServerUrl.replace(/\/$/, '');
    this.validateEndpoint = `${this.ssoServerUrl}${options.validatePath || '/api/sso/validate'}`;
    this.logoutEndpoint = `${this.ssoServerUrl}${options.logoutPath || '/api/users/logout'}`;
    this.loginPath = options.loginPath || '/';
    this.headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers,
    };

    // Initialize request configuration
    this.timeout = options.timeout || 10000;
    this.maxRetries = options.retry?.maxAttempts || 3;
    this.baseRetryDelay = options.retry?.baseDelay || 1000;
  }

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
  private async makeRequest(url: string, init: RequestInit): Promise<Response> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(url, {
          ...init,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        return response;
      } catch (error) {
        lastError = error;

        // Don't retry if request was aborted (timeout) or we're at max attempts
        if (error instanceof Error && error.name === 'AbortError') {
          throw new SSOError('Request timed out', SSOErrorType.NETWORK, error);
        }

        if (attempt === this.maxRetries) {
          throw new SSOError(
            'Request failed after max retries',
            SSOErrorType.NETWORK,
            lastError
          );
        }

        // Add exponential backoff delay before retry
        await backoffDelay(attempt, this.baseRetryDelay);
      }
    }

    // This should never happen due to the loop above
    throw new SSOError('Unexpected error', SSOErrorType.NETWORK, lastError);
  }

  /**
   * Validate the current session
   * 
   * @returns Session validation response
   * @throws SSOError if validation fails
   */
  async validateSession(): Promise<SessionResponse> {
    try {
      const response = await this.makeRequest(this.validateEndpoint, {
        method: 'GET',
        credentials: 'include',
        headers: this.headers,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new SSOError(
          data.message || 'Session validation failed',
          SSOErrorType.VALIDATION,
          data
        );
      }

      return data;
    } catch (error) {
      // If it's already an SSOError, rethrow it
      if (error instanceof SSOError) {
        throw error;
      }

      // Otherwise wrap it in an SSOError
      throw new SSOError(
        'Failed to validate SSO session',
        SSOErrorType.VALIDATION,
        error
      );
    }
  }

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
  async signOut(): Promise<boolean> {
    try {
      const response = await this.makeRequest(this.logoutEndpoint, {
        method: 'POST',
        credentials: 'include',
        headers: this.headers,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new SSOError(
          data.message || 'Logout failed',
          SSOErrorType.AUTHENTICATION,
          data
        );
      }

      // Stop session monitoring if active
      this.stopSessionMonitoring();

      return true;
    } catch (error) {
      if (error instanceof SSOError) {
        throw error;
      }

      throw new SSOError(
        'Failed to sign out',
        SSOErrorType.AUTHENTICATION,
        error
      );
    }
  }

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
  redirectToLogin(redirectUrl?: string): void {
    try {
      const currentUrl = redirectUrl || window.location.href;
      // Validate URL to prevent redirect attacks
      new URL(currentUrl);
      
      const encodedUrl = encodeURIComponent(currentUrl);
      window.location.href = `${this.ssoServerUrl}${this.loginPath}?redirect=${encodedUrl}`;
    } catch (error) {
      throw new SSOError(
        'Invalid redirect URL',
        SSOErrorType.CONFIGURATION,
        error
      );
    }
  }

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
  enableSessionMonitoring(options: {
    /** Interval in milliseconds to check session status. Defaults to 60000 (1 minute) */
    interval?: number;
    /** Callback when session becomes invalid */
    onInvalidSession?: () => void;
    /** Callback for session check errors */
    onError?: (error: SSOError) => void;
  } = {}): () => void {
    if (this.isMonitoring) {
      throw new SSOError(
        'Session monitoring is already enabled',
        SSOErrorType.CONFIGURATION
      );
    }

    const interval = Math.max(options.interval || 60000, 10000); // Minimum 10s interval
    
    const checkSession = async () => {
      try {
        const result = await this.validateSession();
        if (!result.isValid && options.onInvalidSession) {
          options.onInvalidSession();
        }
      } catch (error) {
        if (options.onError) {
          options.onError(
            error instanceof SSOError
              ? error
              : new SSOError('Session check failed', SSOErrorType.VALIDATION, error)
          );
        }
      }
    };

    // Initial check
    void checkSession();

    this.monitoringTimer = setInterval(checkSession, interval);
    this.isMonitoring = true;

    return () => this.stopSessionMonitoring();
  }

  /**
   * Stop session monitoring if it's active
   */
  private stopSessionMonitoring(): void {
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = undefined;
      this.isMonitoring = false;
    }
  }
}
