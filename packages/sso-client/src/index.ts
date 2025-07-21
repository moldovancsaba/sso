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
export class SSOClient {
  private ssoServerUrl: string;
  private validateEndpoint: string;
  private logoutEndpoint: string;
  private loginPath: string;
  private headers: Record<string, string>;

  /**
   * Create a new SSO client instance
   * 
   * @param ssoServerUrl Base URL of the SSO server
   * @param options Configuration options
   */
  constructor(ssoServerUrl: string, options: SSOClientOptions = {}) {
    this.ssoServerUrl = ssoServerUrl.replace(/\/$/, '');
    this.validateEndpoint = `${this.ssoServerUrl}${options.validatePath || '/api/sso/validate'}`;
    this.logoutEndpoint = `${this.ssoServerUrl}${options.logoutPath || '/api/users/logout'}`;
    this.loginPath = options.loginPath || '/';
    this.headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
  }

  /**
   * Validate the current session
   * 
   * @returns Session validation response
   * @throws Error if request fails
   */
  async validateSession(): Promise<SessionResponse> {
    try {
      const response = await fetch(this.validateEndpoint, {
        method: 'GET',
        credentials: 'include',
        headers: this.headers,
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          isValid: false,
          message: error.message || 'Session validation failed',
        };
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('SSO validation error:', error);
      return {
        isValid: false,
        message: error instanceof Error ? error.message : 'Failed to validate SSO session',
      };
    }
  }

  /**
   * Sign out the current user
   * 
   * @returns True if logout was successful
   * @throws Error if request fails
   */
  async signOut(): Promise<boolean> {
    try {
      const response = await fetch(this.logoutEndpoint, {
        method: 'POST',
        credentials: 'include',
        headers: this.headers,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Logout failed');
      }

      return true;
    } catch (error) {
      console.error('SSO logout error:', error);
      throw error;
    }
  }

  /**
   * Redirect to the login page
   * 
   * @param redirectUrl Optional URL to redirect to after login
   */
  redirectToLogin(redirectUrl?: string): void {
    const currentUrl = redirectUrl || window.location.href;
    const encodedUrl = encodeURIComponent(currentUrl);
    window.location.href = `${this.ssoServerUrl}${this.loginPath}?redirect=${encodedUrl}`;
  }

  /**
   * Enable automatic session monitoring
   * 
   * @param options Monitoring configuration
   * @returns Cleanup function to stop monitoring
   */
  enableSessionMonitoring(options: {
    /** Interval in milliseconds to check session status. Defaults to 60000 (1 minute) */
    interval?: number;
    /** Callback when session becomes invalid */
    onInvalidSession?: () => void;
    /** Callback for session check errors */
    onError?: (error: Error) => void;
  } = {}): () => void {
    const interval = options.interval || 60000;
    
    const checkSession = async () => {
      try {
        const result = await this.validateSession();
        if (!result.isValid && options.onInvalidSession) {
          options.onInvalidSession();
        }
      } catch (error) {
        if (options.onError) {
          options.onError(error instanceof Error ? error : new Error('Session check failed'));
        }
      }
    };

    const timer = setInterval(checkSession, interval);
    return () => clearInterval(timer);
  }
}
