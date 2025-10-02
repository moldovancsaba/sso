/**
 * @fileoverview Implementation of the SSO client.
 * This class handles all interactions with the SSO service.
 */

import { DEFAULT_PATHS, ERROR_CODES, DEFAULTS } from './constants';
import type { SSOConfig, SessionResponse, SSOError, MonitorConfig } from './types';

/**
 * Main SSO client class that handles authentication and session management.
 * This is the primary interface that third-party developers will use.
 */
export class SSOClient {
  private readonly serverUrl: string;
  private readonly paths: Required<NonNullable<SSOConfig['paths']>>;
  private readonly headers: Record<string, string>;
  private monitorInterval?: number;

  /**
   * Creates a new SSO client instance.
   * @param config - Configuration options for the SSO client
   * @throws {SSOError} If configuration is invalid
   */
  constructor(config: SSOConfig) {
    this.validateConfig(config);
    
    this.serverUrl = config.serverUrl.replace(/\/$/, ''); // Remove trailing slash
    this.paths = {
      login: config.paths?.login ?? DEFAULT_PATHS.LOGIN,
      logout: config.paths?.logout ?? DEFAULT_PATHS.LOGOUT,
      validate: config.paths?.validate ?? DEFAULT_PATHS.VALIDATE
    };
    this.headers = {
      'Content-Type': 'application/json',
      ...config.headers
    };
  }

  /**
   * Validates the provided configuration.
   * @param config - Configuration to validate
   * @throws {SSOError} If configuration is invalid
   */
  private validateConfig(config: SSOConfig): void {
    if (!config.serverUrl) {
      throw this.createError(
        'CONFIG_ERROR',
        'Server URL is required'
      );
    }

    try {
      new URL(config.serverUrl);
    } catch {
      throw this.createError(
        'CONFIG_ERROR',
        'Invalid server URL provided'
      );
    }
  }

  /**
   * Creates a standardized error object.
   * @param code - Error code from ERROR_CODES
   * @param message - Human-readable error message
   * @param details - Additional error details
   * @returns Standardized error object
   */
  private createError(
    code: keyof typeof ERROR_CODES,
    message: string,
    details?: Record<string, unknown>
  ): SSOError {
    const error = new Error(message) as SSOError;
    error.code = ERROR_CODES[code];
    if (details) {
      error.details = details;
    }
    return error;
  }

  /**
   * Makes an HTTP request to the SSO service.
   * @param path - Endpoint path
   * @param options - Fetch options
   * @returns Response data
   * @throws {SSOError} If request fails
   */
  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.serverUrl}${path}`;
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      DEFAULTS.REQUEST_TIMEOUT
    );

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.headers,
          ...options.headers
        },
        credentials: 'include',
        signal: controller.signal
      });

      const data = await response.json();

      if (!response.ok) {
        throw this.createError(
          'SERVER_ERROR',
          data.message || 'Server error',
          { status: response.status, ...data }
        );
      }

      return data as T;
    } catch (error) {
      if (error instanceof Error) {
        throw this.createError(
          'NETWORK_ERROR',
          error.message,
          { originalError: error }
        );
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Validates the current session.
   * @returns Session validation response
   * @throws {SSOError} If validation fails
   */
  public async validateSession(): Promise<SessionResponse> {
    return this.request<SessionResponse>(this.paths.validate, {
      method: 'GET'
    });
  }

  /**
   * Redirects to the SSO login page.
   * @param returnUrl - URL to return to after login
   */
  public redirectToLogin(returnUrl?: string): void {
    const loginUrl = new URL(this.serverUrl + this.paths.login);
    if (returnUrl) {
      loginUrl.searchParams.set('returnUrl', returnUrl);
    }
    window.location.href = loginUrl.toString();
  }

  /**
   * Signs out the current user.
   * @throws {SSOError} If logout fails
   */
  public async signOut(): Promise<void> {
    await this.request(this.paths.logout, {
      method: 'POST'
    });
  }

  /**
   * Starts monitoring the session status.
   * @param config - Monitoring configuration
   * @returns Cleanup function to stop monitoring
   */
  public enableSessionMonitoring(config: MonitorConfig = {}): () => void {
    const interval = config.interval ?? DEFAULTS.MONITOR_INTERVAL;

    const checkSession = async () => {
      try {
        const session = await this.validateSession();
        if (!session.isValid && config.onInvalidSession) {
          config.onInvalidSession();
        }
      } catch (error) {
        if (config.onError && error instanceof Error) {
          config.onError(error as SSOError);
        }
      }
    };

    // Start periodic checking
    this.monitorInterval = window.setInterval(checkSession, interval);

    // Return cleanup function
    return () => {
      if (this.monitorInterval) {
        clearInterval(this.monitorInterval);
      }
    };
  }
}
